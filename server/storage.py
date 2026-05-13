"""
Receipt image storage.

Selects backend based on environment:
  - S3_BUCKET set  →  S3Storage  (AWS S3 or Cloudflare R2)
  - otherwise      →  LocalStorage (dev / single-server)
"""
from __future__ import annotations

import os
import pathlib
import tempfile
from typing import Optional


# ---------------------------------------------------------------------------
# Local filesystem (dev default)
# ---------------------------------------------------------------------------

class LocalStorage:
    def __init__(self, upload_dir: Optional[str] = None) -> None:
        self.root = pathlib.Path(
            upload_dir or os.getenv("LOCAL_UPLOAD_DIR", "./uploads")
        ).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> pathlib.Path:
        target = (self.root / key).resolve()
        if not str(target).startswith(str(self.root)):
            raise ValueError(f"Invalid key: {key!r}")
        target.parent.mkdir(parents=True, exist_ok=True)
        return target

    def save(self, file_obj, key: str) -> None:
        dest = self._path(key)
        with open(dest, "wb") as fh:
            chunk = file_obj.read(65536)
            while chunk:
                fh.write(chunk)
                chunk = file_obj.read(65536)

    def url(self, key: str) -> str:
        return f"/uploads/{key}"

    def abs_path(self, key: str) -> str:
        return str(self._path(key))

    def health(self) -> bool:
        try:
            probe = self.root / ".health"
            probe.write_text("ok")
            probe.unlink()
            return True
        except OSError:
            return False


# ---------------------------------------------------------------------------
# S3-compatible object storage (AWS S3 or Cloudflare R2)
# ---------------------------------------------------------------------------

class S3Storage:
    """
    Works with any S3-compatible endpoint (AWS, Cloudflare R2, MinIO, etc.).

    Required env vars:
        S3_BUCKET           bucket name
        S3_ACCESS_KEY_ID    access key
        S3_SECRET_ACCESS_KEY  secret key

    Optional:
        S3_ENDPOINT_URL     custom endpoint for R2/MinIO (omit for AWS)
        S3_REGION           AWS region (default: us-east-1)
        S3_PUBLIC_URL       base URL for public access
                            e.g. https://<account>.r2.cloudflarestorage.com/<bucket>
                            If omitted, presigned URLs are used (private bucket).
    """

    def __init__(self) -> None:
        import boto3
        self.bucket    = os.environ["S3_BUCKET"]
        self.public_url = os.getenv("S3_PUBLIC_URL", "").rstrip("/")
        self.client = boto3.client(
            "s3",
            region_name          = os.getenv("S3_REGION", "us-east-1"),
            endpoint_url         = os.getenv("S3_ENDPOINT_URL") or None,
            aws_access_key_id    = os.environ["S3_ACCESS_KEY_ID"],
            aws_secret_access_key= os.environ["S3_SECRET_ACCESS_KEY"],
        )

    def save(self, file_obj, key: str) -> None:
        self.client.upload_fileobj(file_obj, self.bucket, key)

    def url(self, key: str) -> str:
        if self.public_url:
            return f"{self.public_url}/{key}"
        # Fall back to a 7-day presigned URL (private bucket)
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=604800,
        )

    def abs_path(self, key: str) -> str:
        """Download to a temp file so OCR can read it as a local path."""
        suffix = pathlib.Path(key).suffix or ".jpg"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        self.client.download_fileobj(self.bucket, key, tmp)
        tmp.flush()
        tmp.close()
        return tmp.name

    def health(self) -> bool:
        try:
            self.client.head_bucket(Bucket=self.bucket)
            return True
        except Exception:
            return False


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_storage = None


def get_storage() -> LocalStorage | S3Storage:
    global _storage
    if _storage is None:
        if os.getenv("S3_BUCKET"):
            _storage = S3Storage()
        else:
            _storage = LocalStorage()
    return _storage
