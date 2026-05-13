"""Flask application entry point for the ReTouch mobile backend.

Serves both the main API (auth + receipts) and analytics on a single port.
Run:  python app.py   (development)
      gunicorn app:app  (production)
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from database import init_db
from routes.analytics import analytics_bp
from routes.auth import auth_bp
from routes.receipts import receipts_bp


def create_app() -> Flask:
    load_dotenv()
    application = Flask(__name__)

    application.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
    application.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    application.config["JWT_ACCESS_TOKEN_EXPIRES"] = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))
    application.config["JWT_REFRESH_TOKEN_EXPIRES"] = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 2592000))

    CORS(
        application,
        origins="*",
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Disposition"],
        methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        supports_credentials=False,
    )
    JWTManager(application)
    init_db(application)

    application.register_blueprint(auth_bp)
    application.register_blueprint(receipts_bp)
    application.register_blueprint(analytics_bp)

    upload_dir = os.path.abspath(os.getenv("LOCAL_UPLOAD_DIR", "./uploads"))

    @application.get("/uploads/<path:key>")
    def serve_upload(key: str):
        return send_from_directory(upload_dir, key)

    @application.get("/health")
    def health():
        from storage import get_storage
        return {"status": "ok", "storage": "ok" if get_storage().health() else "degraded"}

    return application


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    # use_reloader=False: the reloader forks a child process which kills background OCR threads
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "true").lower() == "true", use_reloader=False)
