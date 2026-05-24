"""Upload generated PNG bytes to Firebase Storage; return HTTPS download URL."""

from __future__ import annotations

import os
import uuid
from datetime import timedelta

from firebase_admin import storage

from firebase_app_init import ensure_firebase_app


def upload_generated_png(firebase_uid: str, history_id: int, png_bytes: bytes) -> str:
    """
    Upload to generated/{uid}/{history_id}.png and return a long-lived signed URL.
    Requires FIREBASE_STORAGE_BUCKET (or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) in env.
    """
    ensure_firebase_app()
    bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET") or os.environ.get(
        "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    )
    if not bucket_name:
        raise RuntimeError("FIREBASE_STORAGE_BUCKET is not set; cannot upload generated image")

    bucket = storage.bucket(bucket_name)
    path = f"generated/{firebase_uid}/{history_id}_{uuid.uuid4().hex[:8]}.png"
    blob = bucket.blob(path)
    blob.upload_from_string(png_bytes, content_type="image/png")

    # Signed URL (works with private buckets; adjust expiry as needed)
    try:
        return blob.generate_signed_url(
            expiration=timedelta(days=7),
            method="GET",
            version="v4",
        )
    except Exception:
        # Fallback: public URL if bucket/object ACL allows
        try:
            blob.make_public()
            return blob.public_url
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Could not create download URL for {path}: {exc}") from exc
