"""
Currency conversion tests — TDD style.

These tests define the expected behaviour BEFORE the implementation exists.
Run:  cd server && .venv/bin/pytest tests/test_currency.py -v
Expected initial result: many failures (ImportError / 404 / missing columns).
After implementation all tests must pass.
"""
from __future__ import annotations

import pytest


# ---------------------------------------------------------------------------
# Exchange rate service
# ---------------------------------------------------------------------------

class TestExchangeRates:
    """Unit tests for server/exchange_rates.py."""

    def test_same_currency_returns_1(self):
        from exchange_rates import get_rate
        assert get_rate("USD", "USD") == 1.0
        assert get_rate("HKD", "HKD") == 1.0
        assert get_rate("EUR", "EUR") == 1.0

    def test_usd_to_hkd_is_in_expected_range(self):
        """USD/HKD is pegged near 7.78 — allow ±1.5 for test robustness."""
        from exchange_rates import get_rate
        rate = get_rate("USD", "HKD")
        assert 6.0 < rate < 9.5, f"USD→HKD rate {rate:.4f} outside expected range"

    def test_inverse_rates_are_reciprocal(self):
        from exchange_rates import get_rate
        usd_hkd = get_rate("USD", "HKD")
        hkd_usd = get_rate("HKD", "USD")
        assert abs(usd_hkd * hkd_usd - 1.0) < 0.005, "Rates are not self-consistent"

    def test_unknown_currency_falls_back_to_1(self):
        """Never crash on an unsupported currency — just return 1.0."""
        from exchange_rates import get_rate
        assert get_rate("FAKECUR", "USD") == 1.0
        assert get_rate("USD", "FAKECUR") == 1.0

    def test_known_eur_to_usd_is_reasonable(self):
        from exchange_rates import get_rate
        rate = get_rate("EUR", "USD")
        assert 0.8 < rate < 1.4, f"EUR→USD rate {rate:.4f} outside expected range"

    def test_convert_amount_helper(self):
        from exchange_rates import convert
        # Same currency: no change
        assert convert(100.0, "HKD", "HKD") == 100.0
        # Cross-currency: sanity check that result is not zero or negative
        result = convert(100.0, "USD", "HKD")
        assert result > 0, "Converted amount must be positive"


# ---------------------------------------------------------------------------
# Model: User.home_currency and ReceiptData.currency
# ---------------------------------------------------------------------------

class TestModelCurrencyFields:

    def test_user_has_home_currency_field(self, client, auth_headers):
        """User must expose home_currency via the preferences endpoint."""
        r = client.get("/api/auth/preferences", headers=auth_headers)
        assert r.status_code == 200, f"Preferences endpoint missing: {r.status_code}"
        body = r.get_json()
        assert "home_currency" in body, "home_currency field missing from preferences"

    def test_default_home_currency_is_hkd(self, client, auth_headers):
        r = client.get("/api/auth/preferences", headers=auth_headers)
        assert r.get_json()["home_currency"] == "HKD"

    def test_receipt_detail_includes_currency_field(self, client, auth_headers):
        """Receipt detail response must include a 'currency' key (may be null)."""
        # Upload a tiny valid-looking multipart payload; OCR disabled in tests
        import io
        data = {"mime_type": "image/jpeg"}
        fake_image = (io.BytesIO(b"\xff\xd8\xff" + b"\x00" * 100), "receipt.jpg")
        r = client.post(
            "/api/mobile/receipts",
            data={**data, "receipt": fake_image},
            headers=auth_headers,
            content_type="multipart/form-data",
        )
        assert r.status_code == 201
        receipt_id = r.get_json()["receipt_id"]

        r2 = client.get(f"/api/mobile/receipts/{receipt_id}", headers=auth_headers)
        assert r2.status_code == 200
        assert "currency" in r2.get_json(), "'currency' key missing from receipt detail"


# ---------------------------------------------------------------------------
# User preferences endpoint
# ---------------------------------------------------------------------------

class TestUserPreferences:

    def test_get_preferences_returns_200(self, client, auth_headers):
        r = client.get("/api/auth/preferences", headers=auth_headers)
        assert r.status_code == 200

    def test_set_valid_currency(self, client, auth_headers):
        r = client.patch(
            "/api/auth/preferences",
            json={"home_currency": "USD"},
            headers=auth_headers,
        )
        assert r.status_code == 200

        r2 = client.get("/api/auth/preferences", headers=auth_headers)
        assert r2.get_json()["home_currency"] == "USD"

    def test_setting_persists_across_requests(self, client, auth_headers):
        client.patch("/api/auth/preferences", json={"home_currency": "GBP"}, headers=auth_headers)
        r = client.get("/api/auth/preferences", headers=auth_headers)
        assert r.get_json()["home_currency"] == "GBP"

    def test_invalid_currency_code_rejected(self, client, auth_headers):
        r = client.patch(
            "/api/auth/preferences",
            json={"home_currency": "NOTACURRENCY"},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_lowercase_currency_normalised(self, client, auth_headers):
        """Accepting 'usd' and normalising to 'USD' is a nice UX touch."""
        r = client.patch(
            "/api/auth/preferences",
            json={"home_currency": "usd"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        r2 = client.get("/api/auth/preferences", headers=auth_headers)
        assert r2.get_json()["home_currency"] == "USD"

    def test_preferences_require_auth(self, client):
        r = client.get("/api/auth/preferences")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Analytics currency conversion
# ---------------------------------------------------------------------------

class TestAnalyticsCurrencyConversion:
    """
    Verify that analytics endpoints accept a ?display_currency= parameter
    and return amounts converted to the requested currency.
    """

    def _seed_receipt_with_currency(self, client, auth_headers, total: float, currency):
        """Insert a completed receipt+OCR row directly via the DB (no HTTP calls inside)."""
        import uuid
        from database import db
        from models import Receipt, ReceiptData, UploadStatus

        # Fetch user_id via a normal request BEFORE opening the DB context
        r = client.get("/api/auth/me", headers=auth_headers)
        user_id = r.get_json()["id"]

        with client.application.app_context():
            rid = uuid.uuid4()
            receipt = Receipt(
                id=rid,
                user_id=user_id,
                mime_type="image/jpeg",
                upload_status=UploadStatus.COMPLETED,
                storage_key=f"user-{user_id}/receipt-{rid}",
            )
            db.session.add(receipt)
            db.session.flush()

            ocr_data = ReceiptData(
                receipt_id=rid,
                extraction_status="completed",
                merchant_name="Test Merchant",
                total=total,
                currency=currency,
            )
            db.session.add(ocr_data)
            db.session.commit()

    def test_summary_without_currency_param_uses_home_currency(self, client, auth_headers):
        self._seed_receipt_with_currency(client, auth_headers, 100.0, "HKD")
        r = client.get("/analytics/user/spending/summary", headers=auth_headers)
        assert r.status_code == 200
        body = r.get_json()
        assert "display_currency" in body, "Response must include display_currency"

    def test_summary_with_explicit_currency_param(self, client, auth_headers):
        self._seed_receipt_with_currency(client, auth_headers, 100.0, "HKD")
        r = client.get(
            "/analytics/user/spending/summary?display_currency=USD",
            headers=auth_headers,
        )
        assert r.status_code == 200
        body = r.get_json()
        assert body.get("display_currency") == "USD"
        # 100 HKD ≈ 12–14 USD; just verify it's in a sane range
        total = body.get("total_spent", 0)
        assert 8 < total < 20, f"100 HKD converted to USD should be ~12-14, got {total}"

    def test_same_currency_no_conversion(self, client, auth_headers):
        """If receipt currency == display currency, total should be unchanged."""
        self._seed_receipt_with_currency(client, auth_headers, 200.0, "USD")
        r = client.get(
            "/analytics/user/spending/summary?display_currency=USD",
            headers=auth_headers,
        )
        total = r.get_json().get("total_spent", 0)
        assert abs(total - 200.0) < 0.01, f"Same-currency conversion changed the value: {total}"

    def test_null_currency_treated_as_home_currency(self, client, auth_headers):
        """
        A receipt with currency=NULL should be treated as the user's home currency.
        If home_currency=HKD and receipt.currency=NULL, the total is treated as HKD.
        """
        self._seed_receipt_with_currency(client, auth_headers, 50.0, None)
        r = client.get(
            "/analytics/user/spending/summary?display_currency=HKD",
            headers=auth_headers,
        )
        total = r.get_json().get("total_spent", 0)
        assert abs(total - 50.0) < 0.01, f"NULL currency should not be converted: {total}"
