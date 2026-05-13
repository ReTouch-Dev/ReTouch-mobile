"""
Exchange rate service for ReTouch mobile.

Fetches EUR-based rates from the Frankfurter API (free, no API key, ECB data).
All rates are cached in-memory with a 1-hour TTL so the app never hammers
the external API — a fresh rate is fetched at most once per hour.

Cross-rate calculation:
  EUR → A  and  EUR → B  are known from the API.
  A → B  =  (EUR→B rate) / (EUR→A rate)

If the API is unavailable or a currency is unknown, functions return 1.0
(no conversion) rather than raising — the app degrades gracefully.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from typing import Optional
from urllib import error as urlerr
from urllib import request as urlreq

logger = logging.getLogger(__name__)

_FRANKFURTER_URL = "https://api.frankfurter.app/latest?base=EUR"
_CACHE_TTL       = 3600  # seconds

# Thread-safe in-memory store: { "USD": (rate_vs_eur, fetched_at), ... }
_rates: dict[str, tuple[float, float]] = {}
_lock  = threading.Lock()

# Supported ISO 4217 codes the UI allows users to choose from
SUPPORTED_CURRENCIES: frozenset[str] = frozenset({
    "HKD", "USD", "EUR", "GBP", "CNY", "JPY", "KRW", "SGD", "TWD",
    "AUD", "CAD", "CHF", "SEK", "NOK", "DKK", "NZD", "MYR", "THB",
    "PHP", "IDR", "INR", "AED", "SAR", "ZAR", "BRL", "MXN",
})


def _fetch_and_cache() -> None:
    """Fetch latest rates from Frankfurter and populate the cache."""
    try:
        req = urlreq.Request(
            _FRANKFURTER_URL,
            headers={"User-Agent": "ReTouch-Mobile/1.0"},
        )
        with urlreq.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        now = time.monotonic()
        rates = data.get("rates", {})
        rates["EUR"] = 1.0  # base

        with _lock:
            for code, rate in rates.items():
                _rates[code.upper()] = (float(rate), now)

        logger.debug("Exchange rates refreshed; %d currencies cached", len(rates))
    except Exception as exc:
        logger.warning("Exchange rate fetch failed: %s", exc)


def _ensure_fresh() -> None:
    """Refresh the cache if it's empty or older than TTL."""
    with _lock:
        if _rates:
            # Pick any entry to check staleness
            _, cached_at = next(iter(_rates.values()))
            if time.monotonic() - cached_at < _CACHE_TTL:
                return
    _fetch_and_cache()


def get_rate(from_currency: str, to_currency: str) -> float:
    """
    Return the exchange rate from_currency → to_currency.

    Falls back to 1.0 (no conversion) for:
    - Same currency
    - Unknown currency codes
    - API unavailability
    """
    from_c = from_currency.upper() if from_currency else ""
    to_c   = to_currency.upper()   if to_currency   else ""

    if from_c == to_c:
        return 1.0

    _ensure_fresh()

    with _lock:
        from_entry = _rates.get(from_c)
        to_entry   = _rates.get(to_c)

    if from_entry is None or to_entry is None:
        logger.warning("Rate unavailable for %s/%s — using 1.0 fallback", from_c, to_c)
        return 1.0

    # Cross rate via EUR: from→EUR→to
    from_vs_eur, _ = from_entry
    to_vs_eur,   _ = to_entry
    return to_vs_eur / from_vs_eur


def convert(amount: float, from_currency: str, to_currency: str) -> float:
    """Apply exchange rate to an amount. Returns the original on any error."""
    if not amount:
        return amount
    return round(amount * get_rate(from_currency, to_currency), 2)
