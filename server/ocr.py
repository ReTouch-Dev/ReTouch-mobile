"""
Gemini Vision OCR for receipt images.

Two-step logic in a single API call:
  1. Validate: confirm the image is an actual business receipt (not a photo,
     selfie, irrelevant doc, or inappropriate content).
  2. Extract: if valid, parse all structured receipt fields.

If validation fails the caller receives a dict with {"extraction_status": "invalid_image"}
and a reason, so the upload endpoint can return a 422 to the mobile client immediately
rather than silently saving garbage data.
"""
from __future__ import annotations

import base64
import json
import logging
import mimetypes
import os
from datetime import date, time
from typing import Any, Optional
from urllib import error as urlerror
from urllib import request as urlrequest

logger = logging.getLogger(__name__)

# --- Config (read lazily inside functions so load_dotenv() runs first) ---
def _cfg(key: str, default: str = "") -> str:
    return os.getenv(key, default)

MAX_LINE_ITEMS = 30

# ISO 4217 codes Gemini commonly returns; extended to cover major Asian markets
KNOWN_CURRENCY_CODES = {
    "HKD", "USD", "EUR", "GBP", "CNY", "JPY", "KRW", "SGD", "TWD",
    "AUD", "CAD", "CHF", "SEK", "NOK", "DKK", "NZD", "MYR", "THB",
    "PHP", "IDR", "INR", "AED", "SAR", "ZAR", "BRL", "MXN",
}

# Common currency symbol → ISO code mappings seen on printed receipts
_SYMBOL_MAP: dict[str, str] = {
    "HK$": "HKD", "US$": "USD", "£": "GBP", "€": "EUR",
    "¥": "JPY", "元": "CNY", "₩": "KRW", "S$": "SGD",
    "NT$": "TWD", "A$": "AUD", "C$": "CAD", "₹": "INR",
    "$": "USD",  # ambiguous default; overridden if context makes it clear
}

VALID_CATEGORIES = {
    "Groceries", "Dining", "Transport", "Entertainment",
    "Shopping", "Bills", "Healthcare", "Other",
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_number(value: Any) -> Optional[float]:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    if isinstance(value, str):
        raw = value.strip().replace(",", "").replace("$", "").replace("HK$", "")
        try:
            return round(float(raw), 2)
        except ValueError:
            return None
    return None


def _normalise_currency(raw: Any) -> Optional[str]:
    """Convert whatever Gemini returns for currency into a clean ISO-4217 code."""
    if not raw or not isinstance(raw, str):
        return None
    code = raw.strip()
    # Try direct symbol map first
    if code in _SYMBOL_MAP:
        return _SYMBOL_MAP[code]
    code_upper = code.upper()
    if code_upper in KNOWN_CURRENCY_CODES:
        return code_upper
    # Unknown — store None so analytics falls back to user's home currency
    logger.warning("Unrecognised currency code from OCR: %r", code)
    return None


def _extract_json(text: str) -> Optional[dict]:
    text = text.strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    # Trim to the outermost { … } if present
    start = text.find("{")
    if start == -1:
        return None
    end = text.rfind("}")
    chunk = text[start:end + 1] if end > start else text[start:]
    try:
        parsed = json.loads(chunk)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    # Gemini sometimes emits malformed/truncated JSON (missing closing braces, etc.).
    # json_repair reconstructs the valid structure before we give up.
    try:
        from json_repair import repair_json
        repaired = repair_json(chunk)
        parsed = json.loads(repaired)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


def _build_prompt() -> str:
    """
    Single prompt that both validates and extracts.

    Gemini is instructed to reject non-receipts immediately (saves processing,
    prevents abuse) before attempting structured extraction.
    """
    schema = {
        "task": (
            "Step 1 — Validate: Is this image a legitimate business receipt, "
            "invoice, or bill? If not (e.g. selfie, food photo, random document, "
            "offensive/inappropriate content, blank image), respond ONLY with: "
            '{"valid": false, "reason": "<brief reason>"}. '
            "Step 2 — Extract: If it IS a valid receipt, respond ONLY with the JSON below. "
            "No markdown, no prose."
        ),
        "rules": [
            "Return only valid JSON, no markdown fences.",
            "Use null for fields not visible on the receipt.",
            "Use YYYY-MM-DD for dates.",
            "'total' is the final amount paid — required.",
            "Do not include subtotal/tax/total/tip as line items.",
            "Use ISO 4217 currency codes (e.g. HKD, USD, EUR).",
        ],
        "schema": {
            "valid": True,
            "merchant": {"name": "string|null", "address": "string|null", "phone": "string|null"},
            "date": "string|null (YYYY-MM-DD)",
            "time": "string|null (HH:MM)",
            "items": [{"description": "string", "quantity": "number|null", "unitPrice": "number|null", "price": "number"}],
            "subtotal": "number|null",
            "tax": "number|null",
            "total": "number (REQUIRED)",
            "paymentMethod": "string|null",
            "currency": "string (ISO 4217, e.g. HKD)",
            "category": f"one of: {', '.join(sorted(VALID_CATEGORIES))}",
        },
    }
    return json.dumps(schema)


def _parse_response(body: str) -> Optional[dict]:
    try:
        raw = json.loads(body)
    except json.JSONDecodeError as e:
        logger.error("Gemini returned non-JSON body: %s | body[:300]=%s", e, body[:300])
        return None

    try:
        candidate = raw["candidates"][0]
        # Check for blocked/safety-filtered response
        finish_reason = candidate.get("finishReason", "")
        if finish_reason not in ("STOP", ""):
            logger.error("Gemini finish reason: %s", finish_reason)
            return None
        part = candidate["content"]["parts"][0]
        if "text" in part:
            text = part["text"]
            logger.debug("Gemini text (first 200): %s", text[:200])
            result = _extract_json(text)
            if result is None:
                logger.error("_extract_json returned None for text: %r", text[:300])
            return result
        for key in ("structuredData", "data", "json"):
            if key in part and isinstance(part[key], dict):
                return part[key]
        logger.error("Unrecognised part shape from Gemini: %s", list(part.keys()))
        return None
    except (KeyError, IndexError) as e:
        logger.error("Unexpected Gemini response shape: %s | keys=%s", e, list(raw.keys()) if isinstance(raw, dict) else "?")
        return None


def _normalise_receipt(data: dict) -> dict:
    """Map raw Gemini output into the canonical shape stored in ReceiptData."""
    merchant = data.get("merchant") or {}
    if isinstance(merchant, str):
        merchant = {"name": merchant}

    raw_items = data.get("items") or []
    line_items = []
    for idx, item in enumerate(raw_items[:MAX_LINE_ITEMS], start=1):
        if not isinstance(item, dict):
            continue
        name = str(item.get("description") or item.get("name") or "").strip()
        if not name:
            continue
        line_items.append({
            "line_number": idx,
            "item_name":   name,
            "quantity":    _to_number(item.get("quantity")) or 1,
            "unit_price":  _to_number(item.get("unitPrice") or item.get("unit_price")),
            "total_price": _to_number(item.get("price") or item.get("total")),
        })

    txn_date = None
    raw_date = data.get("date")
    if isinstance(raw_date, str) and raw_date.strip():
        try:
            txn_date = date.fromisoformat(raw_date.strip())
        except ValueError:
            pass

    txn_time = None
    raw_time = data.get("time")
    if isinstance(raw_time, str) and raw_time.strip():
        try:
            parts = raw_time.strip().split(":")
            txn_time = time(int(parts[0]), int(parts[1]))
        except (ValueError, IndexError):
            pass

    category = data.get("category") if data.get("category") in VALID_CATEGORIES else None

    return {
        "extraction_status": "completed",
        "merchant_name":     merchant.get("name"),
        "merchant_address":  merchant.get("address"),
        "merchant_phone":    merchant.get("phone"),
        "transaction_date":  txn_date,
        "transaction_time":  txn_time,
        "subtotal":          _to_number(data.get("subtotal")),
        "tax":               _to_number(data.get("tax")),
        "total":             _to_number(data.get("total")),
        "payment_method":    data.get("paymentMethod") or data.get("payment_method"),
        "currency":          _normalise_currency(data.get("currency")),
        "category":          category,
        "ocr_confidence":    0.92,
        "line_items":        line_items,
    }


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def extract_from_file(file_path: str) -> Optional[dict]:
    """
    Validate and extract structured data from a receipt image.

    Returns:
        dict with extraction_status="completed"          on success
        dict with extraction_status="invalid_image"      if Gemini rejects the image
        None                                             on API/IO error
    """
    api_key  = os.getenv("GEMINI_API_KEY", "")
    base_url = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    model    = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    timeout  = int(os.getenv("GEMINI_TIMEOUT", "45"))

    if not api_key:
        logger.error("GEMINI_API_KEY not set — add it to server/.env to enable OCR")
        return None

    mime_type = mimetypes.guess_type(file_path)[0] or "image/jpeg"
    try:
        with open(file_path, "rb") as fh:
            image_b64 = base64.b64encode(fh.read()).decode("ascii")
    except OSError as exc:
        logger.error("Cannot read receipt file %s: %s", file_path, exc)
        return None

    payload = {
        "contents": [{"parts": [
            {"text": _build_prompt()},
            {"inline_data": {"mime_type": mime_type, "data": image_b64}},
        ]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }

    req = urlrequest.Request(
        f"{base_url}/models/{model}:generateContent",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
    except urlerror.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.error("Gemini API error %s: %s", exc.code, detail)
        return None
    except (urlerror.URLError, TimeoutError) as exc:
        logger.error("Gemini request failed: %s", exc)
        return None

    data = _parse_response(body)
    if data is None:
        logger.error("Could not parse Gemini response")
        return None

    # Gemini rejected the image as non-receipt / inappropriate
    if data.get("valid") is False:
        reason = data.get("reason", "Not a valid receipt image")
        logger.info("Image rejected by OCR validation: %s", reason)
        return {"extraction_status": "invalid_image", "rejection_reason": reason}

    return _normalise_receipt(data)
