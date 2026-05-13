"""
Analytics engine for the ReTouch mobile backend.

All queries are scoped to a single user_id.
Every public function accepts a display_currency parameter and converts
all monetary amounts from the receipt's original currency before returning.

Currency conversion:
  - receipt.currency = "HKD", display_currency = "USD"  →  total * rate(HKD→USD)
  - receipt.currency = NULL   →  treated as user's home_currency (no conversion)
  - Unknown currency pair     →  rate defaults to 1.0 (amounts unchanged)
"""
from __future__ import annotations

import json
import logging
import os
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from typing import Any, Optional
from urllib import error as urlerror
from urllib import request as urlrequest

from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from database import db
from exchange_rates import convert, get_rate
from models import Receipt, ReceiptData, UploadStatus

logger = logging.getLogger(__name__)

# Read lazily so load_dotenv() has already run before these are needed.
def _gemini_key()   -> str: return os.getenv("GEMINI_API_KEY", "")
def _gemini_model() -> str: return os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
def _gemini_base()  -> str: return os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")

COMPLETED = ("completed",)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _date_expr(session: Session):
    """Return a SQLAlchemy expression for the effective transaction date."""
    dialect = db.engine.dialect.name
    if dialect == "sqlite":
        return func.coalesce(ReceiptData.transaction_date, func.date(Receipt.created_at))
    return func.coalesce(ReceiptData.transaction_date, cast(Receipt.created_at, Date))


def _base_q(session: Session, user_id: int, days: Optional[int] = None):
    """Base query: completed OCR rows for the given user, optionally within a date window.

    The window uses the effective transaction date (receipt date if present, upload date otherwise)
    so ranges reflect when transactions actually happened.
    """
    q = (
        session.query(Receipt, ReceiptData)
        .join(ReceiptData, ReceiptData.receipt_id == Receipt.id)
        .filter(
            Receipt.user_id == user_id,
            ReceiptData.extraction_status.in_(COMPLETED),
        )
    )
    if days:
        cutoff = date.today() - timedelta(days=days)
        q = q.filter(_date_expr(session) >= cutoff)
    return q


def _to_display(
    amount: Optional[float],
    receipt_currency: Optional[str],
    display_currency: str,
    home_currency: str,
) -> float:
    """
    Convert a monetary amount to the display currency.

    receipt_currency=NULL means the receipt didn't have a detected currency,
    so we treat it as denominated in the user's home currency — no conversion.
    """
    if amount is None:
        return 0.0
    src = receipt_currency or home_currency
    return convert(float(amount), src, display_currency)


# ---------------------------------------------------------------------------
# Spending summary
# ---------------------------------------------------------------------------

def spending_summary(
    session: Session,
    user_id: int,
    days: int = 30,
    display_currency: str = "HKD",
) -> dict:
    rows = _base_q(session, user_id, days).with_entities(Receipt, ReceiptData).all()

    # Pull home_currency once for NULL-currency fallback
    from models import User
    user = session.get(User, user_id)
    home = user.home_currency if user else "HKD"

    total_spent = 0.0
    totals: list[float] = []
    dates: list[date] = []

    for receipt, ocr in rows:
        amt = _to_display(float(ocr.total or 0), ocr.currency, display_currency, home)
        total_spent += amt
        totals.append(amt)
        if ocr.transaction_date:
            dates.append(ocr.transaction_date)

    n = len(totals)
    return {
        "user_id":             user_id,
        "display_currency":    display_currency,
        "total_receipts":      n,
        "total_spent":         round(total_spent, 2),
        "average_transaction": round(total_spent / n, 2) if n else 0.0,
        "first_receipt_date":  str(min(dates)) if dates else None,
        "last_receipt_date":   str(max(dates)) if dates else None,
        "generated_at":        datetime.now(UTC).isoformat(),
    }


# ---------------------------------------------------------------------------
# Spending trends
# ---------------------------------------------------------------------------

def spending_trends(
    session: Session,
    user_id: int,
    interval: str = "daily",
    periods: int = 30,
    display_currency: str = "HKD",
) -> dict:
    interval = interval if interval in {"daily", "weekly", "monthly"} else "daily"
    # days covered by this trends request — used to apply the same created_at window as _base_q
    window_days = periods * (1 if interval == "daily" else 7 if interval == "weekly" else 30)

    from models import User
    user = session.get(User, user_id)
    home = user.home_currency if user else "HKD"

    dialect = db.engine.dialect.name
    # Group bars by the effective display date (transaction_date or upload date)
    d = _date_expr(session)

    if dialect == "sqlite":
        fmt_map    = {"daily": "%Y-%m-%d", "weekly": "%Y-W%W", "monthly": "%Y-%m"}
        period_expr = func.strftime(fmt_map[interval], d)
    else:
        fmt_map = {"daily": "YYYY-MM-DD", "weekly": None, "monthly": "YYYY-MM"}
        if interval == "weekly":
            period_expr = func.to_char(func.date_trunc("week", d), 'IYYY-"W"IW')
        else:
            period_expr = func.to_char(d, fmt_map[interval])

    # Use the same created_at window as _base_q so all endpoints agree on row count
    rows = (
        _base_q(session, user_id, days=window_days)
        .with_entities(Receipt, ReceiptData, period_expr.label("period"))
        .order_by(period_expr.asc())
        .all()
    )

    # Bucket by period and convert each row individually
    buckets: dict[str, dict[str, Any]] = defaultdict(lambda: {"total_spent": 0.0, "count": 0, "amounts": []})
    for receipt, ocr, period in rows:
        amt = _to_display(float(ocr.total or 0), ocr.currency, display_currency, home)
        buckets[period]["total_spent"] += amt
        buckets[period]["count"] += 1
        buckets[period]["amounts"].append(amt)

    trends = [
        {
            "period":              p,
            "total_spent":         round(v["total_spent"], 2),
            "receipt_count":       v["count"],
            "average_transaction": round(v["total_spent"] / v["count"], 2) if v["count"] else 0.0,
        }
        for p, v in sorted(buckets.items())
    ]

    return {
        "user_id":          user_id,
        "display_currency": display_currency,
        "interval":         interval,
        "periods":          periods,
        "trends":           trends,
    }


# ---------------------------------------------------------------------------
# Top merchants
# ---------------------------------------------------------------------------

def top_merchants(
    session: Session,
    user_id: int,
    days: int = 30,
    limit: int = 10,
    display_currency: str = "HKD",
) -> dict:
    from models import User
    user = session.get(User, user_id)
    home = user.home_currency if user else "HKD"

    rows = (
        _base_q(session, user_id, days)
        .filter(ReceiptData.merchant_name.isnot(None))
        .with_entities(Receipt, ReceiptData)
        .all()
    )

    merchant_totals: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"total_spent": 0.0, "visits": 0}
    )
    for receipt, ocr in rows:
        amt = _to_display(float(ocr.total or 0), ocr.currency, display_currency, home)
        name = ocr.merchant_name
        merchant_totals[name]["total_spent"] += amt
        merchant_totals[name]["visits"] += 1

    sorted_merchants = sorted(merchant_totals.items(), key=lambda x: x[1]["total_spent"], reverse=True)[:limit]
    merchants = [
        {
            "merchant":            name,
            "visits":              v["visits"],
            "total_spent":         round(v["total_spent"], 2),
            "average_transaction": round(v["total_spent"] / v["visits"], 2),
        }
        for name, v in sorted_merchants
    ]

    return {
        "user_id":          user_id,
        "display_currency": display_currency,
        "count":            len(merchants),
        "merchants":        merchants,
    }


# ---------------------------------------------------------------------------
# Category breakdown
# ---------------------------------------------------------------------------

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Groceries":     ["supermarket", "market", "wellcome", "parknshop", "taste", "city'super", "fusion"],
    "Dining":        ["restaurant", "cafe", "coffee", "bakery", "starbucks", "mcdonald", "kfc", "subway", "pacific coffee"],
    "Transport":     ["mtr", "bus", "taxi", "uber", "lyft", "petrol", "fuel", "parking"],
    "Healthcare":    ["pharmacy", "mannings", "watson", "hospital", "clinic", "dental"],
    "Entertainment": ["cinema", "netflix", "spotify", "game", "theatre", "arcade"],
    "Shopping":      ["h&m", "zara", "uniqlo", "apple", "ikea", "decathlon"],
    "Bills":         ["electric", "broadband", "insurance", "rent", "utility"],
}


def _infer_category(merchant: Optional[str]) -> str:
    if not merchant:
        return "Other"
    m = merchant.lower()
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in m for kw in keywords):
            return cat
    return "Other"


def category_breakdown(
    session: Session,
    user_id: int,
    days: int = 30,
    display_currency: str = "HKD",
) -> dict:
    from models import User
    user = session.get(User, user_id)
    home = user.home_currency if user else "HKD"

    rows = _base_q(session, user_id, days).with_entities(Receipt, ReceiptData).all()

    bucket: dict[str, dict] = defaultdict(lambda: {"total_spent": 0.0, "receipt_count": 0})
    total_display = 0.0

    for receipt, ocr in rows:
        cat = ocr.category or _infer_category(ocr.merchant_name)
        amt = _to_display(float(ocr.total or 0), ocr.currency, display_currency, home)
        bucket[cat]["total_spent"] += amt
        bucket[cat]["receipt_count"] += 1
        total_display += amt

    results = sorted(
        [
            {
                "category":      cat,
                "total_spent":   round(v["total_spent"], 2),
                "percentage":    round(v["total_spent"] / total_display * 100, 1) if total_display else 0,
                "receipt_count": v["receipt_count"],
                "top_merchants": [],
            }
            for cat, v in bucket.items()
        ],
        key=lambda x: x["total_spent"],
        reverse=True,
    )

    return {
        "user_id":          user_id,
        "display_currency": display_currency,
        "count":            len(results),
        "categories":       results,
    }


# ---------------------------------------------------------------------------
# AI Insights (Gemini)
# ---------------------------------------------------------------------------

def _fallback_insights(summary: dict, merchants: list, categories: list) -> list[dict]:
    cards = []
    currency = summary.get("display_currency", "")
    if summary.get("total_spent", 0) > 0:
        cards.append({
            "headline": f"You've spent {summary['total_spent']:.0f} {currency} this period",
            "detail": (
                f"Across {summary['total_receipts']} receipts, "
                f"your average transaction is {summary['average_transaction']:.0f} {currency}."
            ),
        })
    if merchants:
        top = merchants[0]
        cards.append({
            "headline": f"Top merchant: {top['merchant']}",
            "detail": (
                f"You've visited {top['merchant']} {top['visits']} time(s), "
                f"spending {top['total_spent']:.0f} {currency} total."
            ),
        })
    if categories:
        top_cat = categories[0]
        cards.append({
            "headline": f"Biggest category: {top_cat['category']}",
            "detail": f"{top_cat['percentage']:.0f}% of your spending goes to {top_cat['category']}.",
        })
    return cards or [{"headline": "Add more receipts", "detail": "Upload receipts to unlock spending insights."}]


def ai_insights(
    session: Session,
    user_id: int,
    days: int = 30,
    display_currency: str = "HKD",
) -> dict:
    summary    = spending_summary(session, user_id, days, display_currency=display_currency)
    merchants  = top_merchants(session, user_id, days, limit=5, display_currency=display_currency)["merchants"]
    categories = category_breakdown(session, user_id, days, display_currency=display_currency)["categories"]

    api_key = _gemini_key()
    model   = _gemini_model()
    base    = _gemini_base()

    MIN_RECEIPTS = 10
    n = summary["total_receipts"]
    if not api_key or n < MIN_RECEIPTS:
        reason = "No Gemini key" if not api_key else f"Need {MIN_RECEIPTS}+ receipts ({n} so far)"
        return {
            "user_id":          user_id,
            "display_currency": display_currency,
            "insights":         _fallback_insights(summary, merchants, categories),
            "model":            "fallback",
            "tokens_used":      0,
            "pending":          False,
            "fallback_reason":  reason,
            "generated_at":     datetime.now(UTC).isoformat(),
        }

    prompt_data = {
        "task": "Generate concise, actionable spending insights from this user's receipt data.",
        "display_currency": display_currency,
        "summary": summary,
        "top_merchants": merchants,
        "categories": categories,
        "instructions": [
            "Return a JSON object with an 'insights' array.",
            "Each insight must have 'headline' (short, punchy) and 'detail' (1-2 sentences, specific).",
            "Produce 3-5 insights. Be specific with amounts and percentages.",
            f"All amounts are in {display_currency}.",
        ],
    }

    payload = {
        "contents": [{"parts": [{"text": json.dumps(prompt_data)}]}],
        "generationConfig": {"temperature": 0.4, "responseMimeType": "application/json"},
    }

    try:
        req = urlrequest.Request(
            f"{base}/models/{model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "X-goog-api-key": api_key},
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=30) as resp:
            raw   = json.loads(resp.read().decode("utf-8", errors="ignore"))
        text   = raw["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text) if isinstance(text, str) else text
        cards  = [
            {"headline": str(i["headline"]), "detail": str(i["detail"])}
            for i in (parsed.get("insights") or [])
            if isinstance(i, dict) and "headline" in i
        ][:8]
        tokens = int(raw.get("usageMetadata", {}).get("totalTokenCount", 0) or 0)

        return {
            "user_id":          user_id,
            "display_currency": display_currency,
            "insights":         cards or _fallback_insights(summary, merchants, categories),
            "model":            model,
            "tokens_used":      tokens,
            "pending":          False,
            "fallback_reason":  None,
            "generated_at":     datetime.now(UTC).isoformat(),
        }

    except Exception as exc:
        logger.error("Insights generation failed: %s", exc)
        return {
            "user_id":          user_id,
            "display_currency": display_currency,
            "insights":         _fallback_insights(summary, merchants, categories),
            "model":            "fallback",
            "tokens_used":      0,
            "pending":          False,
            "fallback_reason":  str(exc),
            "generated_at":     datetime.now(UTC).isoformat(),
        }
