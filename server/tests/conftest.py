"""
Shared pytest fixtures for the ReTouch mobile backend test suite.

All tests run against an isolated in-memory SQLite database — nothing
touches the real server/.env database.
"""
from __future__ import annotations

import os
import pytest

# Point to a fresh in-memory DB before any app import touches the env
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")
os.environ.setdefault("GEMINI_API_KEY", "")  # OCR disabled in tests


@pytest.fixture()
def app():
    from app import create_app
    application = create_app()
    application.config["TESTING"] = True
    application.config["DATABASE_URL"] = "sqlite:///:memory:"
    return application


@pytest.fixture()
def client(app):
    with app.test_client() as c:
        yield c


@pytest.fixture()
def auth_headers(client):
    """Register a fresh test user and return JWT auth headers."""
    r = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"},
    )
    assert r.status_code == 201, f"Registration failed: {r.get_json()}"
    token = r.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def user_id(client, auth_headers):
    """Return the numeric ID of the test user."""
    r = client.get("/api/auth/me", headers=auth_headers)
    return r.get_json()["id"]
