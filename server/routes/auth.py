from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    get_jwt_identity, jwt_required,
)
from database import db
from exchange_rates import SUPPORTED_CURRENCIES
from models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _err(msg: str, status: int):
    return jsonify({"message": msg}), status


def _token_response(user: User):
    return jsonify({
        "access_token":  create_access_token(identity=str(user.id)),
        "refresh_token": create_refresh_token(identity=str(user.id)),
        "user": user.to_dict(),
    })


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").lower().strip()
    password = data.get("password", "")
    name     = (data.get("full_name") or "").strip()

    if not email or not password:
        return _err("email and password are required", 400)
    if len(password) < 8:
        return _err("password must be at least 8 characters", 400)

    existing = User.query.filter_by(email=email).first()
    if existing:
        if existing.check_password(password):
            return _token_response(existing), 201
        return _err("User with this email already exists", 400)

    user = User(email=email, full_name=name or None)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return _token_response(user), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").lower().strip()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password) or not user.is_active:
        return _err("Invalid email or password", 401)

    user.update_last_login()
    db.session.commit()
    return _token_response(user)


@auth_bp.post("/email-availability")
def email_availability():
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").lower().strip()
    taken = User.query.filter_by(email=email).first() is not None
    return jsonify({"available": not taken})


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user or not user.is_active:
        return _err("User not found", 401)
    return jsonify({"access_token": create_access_token(identity=str(user_id))})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return _err("User not found", 401)
    return jsonify(user.to_dict())


@auth_bp.post("/logout")
@jwt_required()
def logout():
    return jsonify({"message": "Logged out"})


@auth_bp.get("/preferences")
@jwt_required()
def get_preferences():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return _err("User not found", 401)
    return jsonify({"home_currency": user.home_currency})


@auth_bp.patch("/preferences")
@jwt_required()
def update_preferences():
    data     = request.get_json(silent=True) or {}
    raw_code = (data.get("home_currency") or "").strip().upper()

    if not raw_code:
        return _err("home_currency is required", 400)
    if raw_code not in SUPPORTED_CURRENCIES:
        return _err(
            f"Unsupported currency. Supported: {', '.join(sorted(SUPPORTED_CURRENCIES))}",
            400,
        )

    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return _err("User not found", 401)

    user.home_currency = raw_code
    db.session.commit()
    return jsonify({"home_currency": user.home_currency})


@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    data         = request.get_json(silent=True) or {}
    current_pw   = data.get("current_password", "")
    new_pw       = data.get("new_password", "")

    if len(new_pw) < 8:
        return _err("New password must be at least 8 characters", 400)

    user = User.query.get(int(get_jwt_identity()))
    if not user or not user.check_password(current_pw):
        return _err("Current password is incorrect", 401)

    user.set_password(new_pw)
    db.session.commit()
    return jsonify({"message": "Password updated"})
