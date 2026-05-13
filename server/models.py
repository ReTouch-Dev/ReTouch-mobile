"""
Mobile server domain models.

Simpler than ReTouch-server: receipts belong directly to users (no Device/Org
indirection, no claims table). One user → many receipts.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, Float,
    ForeignKey, Index, Integer, Numeric, String, Text, Time,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.types import TypeDecorator, CHAR
from werkzeug.security import check_password_hash, generate_password_hash

from database import db


# ---------------------------------------------------------------------------
# UUID column — works with both SQLite (CHAR 36) and PostgreSQL (native UUID)
# ---------------------------------------------------------------------------

class GUID(TypeDecorator):
    """Platform-independent GUID/UUID column."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID())
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        if not isinstance(value, uuid.UUID):
            return str(uuid.UUID(str(value)))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(str(value))


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (Index("idx_user_email", "email"),)

    id             = Column(Integer, primary_key=True)
    email          = Column(String(255), unique=True, nullable=False)
    password_hash  = Column(String(255), nullable=False)
    full_name      = Column(String(255))
    is_active      = Column(Boolean, nullable=False, default=True)
    home_currency  = Column(String(3), nullable=False, default="HKD")
    created_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_login_at  = Column(DateTime)

    receipts = db.relationship("Receipt", back_populates="user", lazy="dynamic")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def update_last_login(self) -> None:
        self.last_login_at = datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        return {
            "id":            self.id,
            "email":         self.email,
            "full_name":     self.full_name,
            "home_currency": self.home_currency,
        }


# ---------------------------------------------------------------------------
# Receipt
# ---------------------------------------------------------------------------

class UploadStatus(enum.Enum):
    PROCESSING = "processing"
    COMPLETED  = "completed"
    FAILED     = "failed"


class Receipt(db.Model):
    __tablename__ = "receipts"
    __table_args__ = (Index("idx_receipts_user_id", "user_id"),)

    id            = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mime_type     = Column(String(50))
    upload_status = Column(Enum(UploadStatus), nullable=False, default=UploadStatus.PROCESSING)
    storage_key   = Column(String(512))
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user     = db.relationship("User", back_populates="receipts")
    ocr_data = db.relationship("ReceiptData", back_populates="receipt", uselist=False)


# ---------------------------------------------------------------------------
# ReceiptData (OCR output)
# ---------------------------------------------------------------------------

class ReceiptData(db.Model):
    __tablename__ = "receipt_data"

    id                = Column(Integer, primary_key=True)
    receipt_id        = Column(GUID(), ForeignKey("receipts.id", ondelete="CASCADE"), unique=True, nullable=False)
    extraction_status = Column(String(20), nullable=False, default="processing")
    merchant_name     = Column(String(255))
    merchant_address  = Column(String)
    merchant_phone    = Column(String(50))
    transaction_date  = Column(Date)
    transaction_time  = Column(Time)
    subtotal          = Column(Numeric(10, 2))
    tax               = Column(Numeric(10, 2))
    total             = Column(Numeric(10, 2))
    payment_method    = Column(String(50))
    currency          = Column(String(3))   # ISO 4217; NULL means unknown/use user's home currency
    category          = Column(String(50))
    ocr_confidence    = Column(Float)
    created_at        = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    receipt    = db.relationship("Receipt", back_populates="ocr_data")
    line_items = db.relationship("ReceiptLineItem", back_populates="receipt_data",
                                  cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# ReceiptLineItem
# ---------------------------------------------------------------------------

class ReceiptLineItem(db.Model):
    __tablename__ = "receipt_line_items"

    id             = Column(Integer, primary_key=True)
    receipt_data_id = Column(Integer, ForeignKey("receipt_data.id", ondelete="CASCADE"), nullable=False)
    line_number    = Column(Integer)
    item_name      = Column(String(255))
    quantity       = Column(Numeric(10, 2))
    unit_price     = Column(Numeric(10, 2))
    total_price    = Column(Numeric(10, 2))

    receipt_data = db.relationship("ReceiptData", back_populates="line_items")
