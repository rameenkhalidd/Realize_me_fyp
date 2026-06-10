"""Upload generated PNG bytes to Firebase Storage; return HTTPS download URL."""

from __future__ import annotations

import os
import uuid
from datetime import timedelta

from firebase_admin import storage

from firebase_app_init import ensure_firebase_app


def _upload_png_and_get_url(path: str, png_bytes: bytes) -> str:
    ensure_firebase_app()
    bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET") or os.environ.get(
        "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    )
    if not bucket_name:
        raise RuntimeError("FIREBASE_STORAGE_BUCKET is not set; cannot upload image")

    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(path)
    blob.upload_from_string(png_bytes, content_type="image/png")

    try:
        return blob.generate_signed_url(
            expiration=timedelta(days=7),
            method="GET",
            version="v4",
        )
    except Exception:
        try:
            blob.make_public()
            return blob.public_url
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Could not create download URL for {path}: {exc}") from exc


def upload_generated_png(firebase_uid: str, history_id: int, png_bytes: bytes) -> str:
    """Upload to generated/{uid}/{history_id}_*.png and return a signed URL."""
    path = f"generated/{firebase_uid}/{history_id}_{uuid.uuid4().hex[:8]}.png"
    return _upload_png_and_get_url(path, png_bytes)


def upload_sketch_preview_png(firebase_uid: str, history_id: int, png_bytes: bytes) -> str:
    """Upload combined sketch preview to sketches/{uid}/{history_id}_preview.png."""
    path = f"sketches/{firebase_uid}/{history_id}_preview_{uuid.uuid4().hex[:8]}.png"
    return _upload_png_and_get_url(path, png_bytes)
