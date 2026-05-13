import csv
import io
import json
import mimetypes
import threading
import uuid
from datetime import timezone, datetime
from flask import Blueprint, Response, jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity, jwt_required

from database import db
from models import Receipt, ReceiptData, ReceiptLineItem, UploadStatus
from storage import get_storage
import ocr

receipts_bp = Blueprint("receipts", __name__, url_prefix="/api/mobile")

MAX_FILE_SIZE    = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIMES    = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


def _err(msg: str, status: int):
    return jsonify({"message": msg}), status


def _receipt_key(user_id: int, receipt_id) -> str:
    return f"user-{user_id}/receipt-{receipt_id}"


def _delete_receipt_sql(rid: str) -> None:
    """Hard-delete a receipt and all its OCR data using raw SQL (avoids ORM session conflicts)."""
    db.session.execute(
        db.text("DELETE FROM receipt_line_items WHERE receipt_data_id IN (SELECT id FROM receipt_data WHERE receipt_id = :rid)"),
        {"rid": rid},
    )
    db.session.execute(db.text("DELETE FROM receipt_data WHERE receipt_id = :rid"), {"rid": rid})
    db.session.execute(db.text("DELETE FROM receipts WHERE id = :rid"), {"rid": rid})
    db.session.commit()


def _run_ocr(receipt_id: str, file_path: str, app) -> None:
    """Process OCR in a background thread."""
    import logging as _logging
    _log = _logging.getLogger(__name__)

    def _worker():
        with app.app_context():
            try:
                result = ocr.extract_from_file(file_path)

                # OCR failed or image is not a valid receipt — silently remove the
                # record so it never appears as a blank entry in the user's list.
                if not result or result.get("extraction_status") == "invalid_image":
                    _log.info("OCR failed/invalid for %s — deleting receipt", receipt_id)
                    _delete_receipt_sql(receipt_id)
                    return

                receipt_data = db.session.query(ReceiptData).filter_by(
                    receipt_id=uuid.UUID(receipt_id)
                ).first()

                if receipt_data is None:
                    receipt_data = ReceiptData(receipt_id=uuid.UUID(receipt_id))
                    db.session.add(receipt_data)

                receipt_data.extraction_status = result.get("extraction_status", "completed")
                receipt_data.merchant_name     = result.get("merchant_name")
                receipt_data.merchant_address  = result.get("merchant_address")
                receipt_data.merchant_phone    = result.get("merchant_phone")
                receipt_data.transaction_date  = result.get("transaction_date")
                receipt_data.transaction_time  = result.get("transaction_time")
                receipt_data.subtotal          = result.get("subtotal")
                receipt_data.tax               = result.get("tax")
                receipt_data.total             = result.get("total")
                receipt_data.payment_method    = result.get("payment_method")
                receipt_data.currency          = result.get("currency")
                receipt_data.category          = result.get("category")
                receipt_data.ocr_confidence    = result.get("ocr_confidence")
                db.session.flush()

                db.session.execute(
                    db.text("DELETE FROM receipt_line_items WHERE receipt_data_id = :rdid"),
                    {"rdid": receipt_data.id},
                )
                for item in result.get("line_items") or []:
                    li = ReceiptLineItem(
                        receipt_data_id=receipt_data.id,
                        line_number=item.get("line_number"),
                        item_name=item.get("item_name"),
                        quantity=item.get("quantity"),
                        unit_price=item.get("unit_price"),
                        total_price=item.get("total_price"),
                    )
                    db.session.add(li)

                receipt = db.session.query(Receipt).filter_by(
                    id=uuid.UUID(receipt_id)
                ).first()
                if receipt:
                    receipt.upload_status = UploadStatus.COMPLETED

                db.session.commit()
                _log.info("OCR completed for receipt %s: %s", receipt_id, result.get("merchant_name"))

            except Exception:
                _log.exception("OCR worker crashed for receipt %s — deleting", receipt_id)
                try:
                    db.session.rollback()
                    _delete_receipt_sql(receipt_id)
                except Exception:
                    _log.exception("Cleanup also failed for receipt %s", receipt_id)

    threading.Thread(target=_worker, daemon=True).start()


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@receipts_bp.post("/receipts")
@jwt_required()
def upload_receipt():
    user_id   = int(get_jwt_identity())
    mime_type = request.form.get("mime_type", "").strip()

    if mime_type not in ALLOWED_MIMES:
        return _err(f"Unsupported mime type. Allowed: {', '.join(ALLOWED_MIMES)}", 400)

    uploaded = request.files.get("receipt")
    if not uploaded:
        return _err("No file uploaded (field name: 'receipt')", 400)

    # Size check
    uploaded.seek(0, 2)
    size = uploaded.tell()
    uploaded.seek(0)
    if size > MAX_FILE_SIZE:
        return _err("File too large (max 10 MB)", 413)

    receipt = Receipt(user_id=user_id, mime_type=mime_type, upload_status=UploadStatus.PROCESSING)
    db.session.add(receipt)
    db.session.flush()

    key = _receipt_key(user_id, receipt.id)
    receipt.storage_key = key
    get_storage().save(uploaded, key)

    ocr_data = ReceiptData(receipt_id=receipt.id, extraction_status="processing")
    db.session.add(ocr_data)
    db.session.commit()

    file_path = get_storage().abs_path(key)
    if not current_app.testing:
        _run_ocr(str(receipt.id), file_path, current_app._get_current_object())

    return jsonify({
        "receipt_id":    str(receipt.id),
        "upload_status": receipt.upload_status.value,
        "created_at":    receipt.created_at.isoformat(),
        "mime_type":     receipt.mime_type,
        "image_url":     get_storage().url(key),
    }), 201


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@receipts_bp.get("/receipts")
@jwt_required()
def list_receipts():
    user_id = int(get_jwt_identity())
    page    = max(1, int(request.args.get("page", 1)))
    limit   = min(200, max(1, int(request.args.get("limit", 50))))
    search  = request.args.get("search", "").strip()
    offset  = (page - 1) * limit

    q = (
        db.session.query(Receipt)
        .filter(Receipt.user_id == user_id)
    )
    if search:
        q = q.join(ReceiptData, ReceiptData.receipt_id == Receipt.id, isouter=True).filter(
            ReceiptData.merchant_name.ilike(f"%{search}%")
        )

    total = q.count()
    rows  = q.order_by(Receipt.created_at.desc()).offset(offset).limit(limit).all()

    storage = get_storage()
    results = []
    for r in rows:
        ocr = r.ocr_data
        results.append({
            "receipt_id":    str(r.id),
            "created_at":    r.created_at.isoformat(),
            "mime_type":     r.mime_type,
            "upload_status": r.upload_status.value,
            "image_url":     storage.url(r.storage_key) if r.storage_key else None,
            "ocr": {
                "status":     ocr.extraction_status if ocr else None,
                "merchant":   ocr.merchant_name if ocr else None,
                "date":       ocr.transaction_date.isoformat() if ocr and ocr.transaction_date else None,
                "total":      float(ocr.total) if ocr and ocr.total is not None else None,
                "currency":   ocr.currency if ocr else None,
                "confidence": float(ocr.ocr_confidence) if ocr and ocr.ocr_confidence is not None else None,
            } if ocr else None,
        })

    return jsonify({
        "results":  results,
        "total":    total,
        "page":     page,
        "limit":    limit,
        "has_next": offset + len(results) < total,
    })


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@receipts_bp.get("/receipts/export")
@jwt_required()
def export_receipts():
    user_id = int(get_jwt_identity())
    fmt     = request.args.get("format", "json").lower()
    if fmt not in ("json", "csv"):
        return _err("format must be 'json' or 'csv'", 400)

    rows = (
        db.session.query(Receipt)
        .filter(Receipt.user_id == user_id)
        .order_by(Receipt.created_at.desc())
        .all()
    )

    def _ocr_dict(r):
        o = r.ocr_data
        if not o:
            return None
        return {
            "ocr_status":       o.extraction_status,
            "merchant_name":    o.merchant_name,
            "merchant_address": o.merchant_address,
            "merchant_phone":   o.merchant_phone,
            "transaction_date": o.transaction_date.isoformat() if o.transaction_date else None,
            "transaction_time": str(o.transaction_time) if o.transaction_time else None,
            "subtotal":         float(o.subtotal) if o.subtotal is not None else None,
            "tax":              float(o.tax) if o.tax is not None else None,
            "total":            float(o.total) if o.total is not None else None,
            "payment_method":   o.payment_method,
            "category":         o.category,
            "ocr_confidence":   float(o.ocr_confidence) if o.ocr_confidence is not None else None,
            "line_items": [
                {
                    "line_number": li.line_number,
                    "item_name":   li.item_name,
                    "quantity":    float(li.quantity) if li.quantity is not None else None,
                    "unit_price":  float(li.unit_price) if li.unit_price is not None else None,
                    "total_price": float(li.total_price) if li.total_price is not None else None,
                }
                for li in sorted(o.line_items, key=lambda x: x.line_number or 0)
            ],
        }

    storage = get_storage()

    if fmt == "json":
        payload = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "total":       len(rows),
            "receipts": [
                {
                    "receipt_id":    str(r.id),
                    "created_at":    r.created_at.isoformat(),
                    "mime_type":     r.mime_type,
                    "upload_status": r.upload_status.value,
                    "image_url":     storage.url(r.storage_key) if r.storage_key else None,
                    **(ocr_d if (ocr_d := _ocr_dict(r)) else {}),
                }
                for r in rows
            ],
        }
        return Response(
            json.dumps(payload, ensure_ascii=False, default=str),
            mimetype="application/json",
            headers={"Content-Disposition": "attachment; filename=receipts.json"},
        )

    # CSV — one row per receipt (line items as a count column)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "receipt_id", "created_at", "upload_status",
        "merchant_name", "merchant_address", "merchant_phone",
        "transaction_date", "transaction_time",
        "subtotal", "tax", "total", "payment_method", "category",
        "ocr_confidence", "line_items_count", "image_url",
    ])
    for r in rows:
        o = r.ocr_data
        writer.writerow([
            str(r.id),
            r.created_at.isoformat(),
            r.upload_status.value,
            o.merchant_name    if o else "",
            o.merchant_address if o else "",
            o.merchant_phone   if o else "",
            o.transaction_date.isoformat() if o and o.transaction_date else "",
            str(o.transaction_time)        if o and o.transaction_time else "",
            float(o.subtotal)  if o and o.subtotal  is not None else "",
            float(o.tax)       if o and o.tax       is not None else "",
            float(o.total)     if o and o.total      is not None else "",
            o.payment_method   if o else "",
            o.category         if o else "",
            float(o.ocr_confidence) if o and o.ocr_confidence is not None else "",
            len(o.line_items)  if o else 0,
            storage.url(r.storage_key) if r.storage_key else "",
        ])

    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=receipts.csv"},
    )


# ---------------------------------------------------------------------------
# Detail
# ---------------------------------------------------------------------------

@receipts_bp.get("/receipts/<receipt_id>")
@jwt_required()
def get_receipt(receipt_id: str):
    user_id = int(get_jwt_identity())

    try:
        rid = uuid.UUID(receipt_id)
    except ValueError:
        return _err("Invalid receipt ID", 400)

    receipt = Receipt.query.filter_by(id=rid, user_id=user_id).first()
    if not receipt:
        return _err("Receipt not found", 404)

    ocr = receipt.ocr_data
    line_items = []
    if ocr:
        line_items = [
            {
                "line_number": li.line_number,
                "item_name":   li.item_name,
                "quantity":    float(li.quantity) if li.quantity is not None else None,
                "unit_price":  float(li.unit_price) if li.unit_price is not None else None,
                "total_price": float(li.total_price) if li.total_price is not None else None,
            }
            for li in sorted(ocr.line_items, key=lambda x: x.line_number or 0)
        ]

    return jsonify({
        "receipt_id":       str(receipt.id),
        "created_at":       receipt.created_at.isoformat(),
        "mime_type":        receipt.mime_type,
        "upload_status":    receipt.upload_status.value,
        "image_url":        get_storage().url(receipt.storage_key) if receipt.storage_key else None,
        "ocr_status":       ocr.extraction_status if ocr else None,
        "merchant_name":    ocr.merchant_name if ocr else None,
        "merchant_address": ocr.merchant_address if ocr else None,
        "merchant_phone":   ocr.merchant_phone if ocr else None,
        "transaction_date": ocr.transaction_date.isoformat() if ocr and ocr.transaction_date else None,
        "transaction_time": str(ocr.transaction_time) if ocr and ocr.transaction_time else None,
        "subtotal":         float(ocr.subtotal) if ocr and ocr.subtotal is not None else None,
        "tax":              float(ocr.tax) if ocr and ocr.tax is not None else None,
        "total":            float(ocr.total) if ocr and ocr.total is not None else None,
        "payment_method":   ocr.payment_method if ocr else None,
        "currency":         ocr.currency if ocr else None,
        "category":         ocr.category if ocr else None,
        "ocr_confidence":   float(ocr.ocr_confidence) if ocr and ocr.ocr_confidence is not None else None,
        "line_items":       line_items,
    })
