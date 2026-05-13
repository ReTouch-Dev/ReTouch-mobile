"""
Analytics routes — exposes the analytics engine as HTTP endpoints.

All routes are under /analytics so the frontend can point
EXPO_PUBLIC_ANALYTICS_BASE_URL=http://localhost:5000/analytics
and hit the same server as the main API.

Currency handling:
  Every endpoint accepts an optional ?display_currency=XXX query parameter.
  If omitted, the user's home_currency preference is used.
  All monetary amounts in the response are converted to the display currency.
"""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

import analytics
from database import db
from models import User

analytics_bp = Blueprint("analytics", __name__, url_prefix="/analytics")


def _display_currency(user_id: int) -> str:
    """Resolve the display currency: ?display_currency param → user preference → 'HKD'."""
    param = (request.args.get("display_currency") or "").strip().upper()
    if param:
        return param
    user = User.query.get(user_id)
    return user.home_currency if user else "HKD"


@analytics_bp.get("/user/spending/summary")
@jwt_required()
def spending_summary():
    user_id  = int(get_jwt_identity())
    days     = int(request.args.get("days", 30))
    currency = _display_currency(user_id)
    result   = analytics.spending_summary(db.session, user_id, days, display_currency=currency)
    return jsonify(result)


@analytics_bp.get("/user/spending/trends")
@jwt_required()
def spending_trends():
    user_id  = int(get_jwt_identity())
    interval = request.args.get("interval", "daily")
    periods  = int(request.args.get("periods", 30))
    currency = _display_currency(user_id)
    result   = analytics.spending_trends(db.session, user_id, interval, periods, display_currency=currency)
    return jsonify(result)


@analytics_bp.get("/user/merchants/top")
@jwt_required()
def top_merchants():
    user_id  = int(get_jwt_identity())
    days     = int(request.args.get("days", 30))
    limit    = int(request.args.get("limit", 10))
    currency = _display_currency(user_id)
    result   = analytics.top_merchants(db.session, user_id, days, limit, display_currency=currency)
    return jsonify(result)


@analytics_bp.get("/user/categories/breakdown")
@jwt_required()
def category_breakdown():
    user_id  = int(get_jwt_identity())
    days     = int(request.args.get("days", 30))
    currency = _display_currency(user_id)
    result   = analytics.category_breakdown(db.session, user_id, days, display_currency=currency)
    return jsonify(result)


@analytics_bp.get("/user/insights")
@jwt_required()
def ai_insights():
    user_id  = int(get_jwt_identity())
    days     = int(request.args.get("days", 30))
    currency = _display_currency(user_id)
    result   = analytics.ai_insights(db.session, user_id, days, display_currency=currency)
    return jsonify(result)
