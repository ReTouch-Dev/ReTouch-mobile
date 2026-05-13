from __future__ import annotations

import os
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()


def _run_migrations(db: SQLAlchemy) -> None:
    """Apply any missing columns to existing databases (safe to re-run)."""
    engine = db.engine
    with engine.connect() as conn:
        from sqlalchemy import text, inspect
        inspector = inspect(engine)

        user_cols = {c["name"] for c in inspector.get_columns("users")}
        if "home_currency" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN home_currency VARCHAR(3) NOT NULL DEFAULT 'HKD'"))

        rd_cols = {c["name"] for c in inspector.get_columns("receipt_data")}
        if "currency" not in rd_cols:
            conn.execute(text("ALTER TABLE receipt_data ADD COLUMN currency VARCHAR(3)"))

        conn.commit()


def init_db(app) -> None:
    url = os.getenv("DATABASE_URL", "sqlite:///retouch_mobile.db")
    # SQLAlchemy 2.x dropped the postgres:// scheme
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}

    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        db.create_all()
        _run_migrations(db)
        _cleanup_stuck_receipts(db)


def _cleanup_stuck_receipts(db: SQLAlchemy) -> None:
    """Delete receipts stuck in 'processing' from a previous server run."""
    from sqlalchemy import text
    with db.engine.connect() as conn:
        conn.execute(text(
            "DELETE FROM receipt_line_items WHERE receipt_data_id IN "
            "(SELECT id FROM receipt_data WHERE extraction_status = 'processing')"
        ))
        conn.execute(text("DELETE FROM receipt_data WHERE extraction_status = 'processing'"))
        conn.execute(text("DELETE FROM receipts WHERE upload_status = 'PROCESSING'"))
        conn.execute(text(
            "DELETE FROM receipts WHERE id NOT IN (SELECT receipt_id FROM receipt_data)"
        ))
        conn.commit()
