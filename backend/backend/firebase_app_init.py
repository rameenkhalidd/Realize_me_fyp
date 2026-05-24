"""Initialize Firebase Admin (auth + optional storage) once per process."""

from __future__ import annotations

import os

import firebase_admin
from firebase_admin import credentials


def ensure_firebase_app() -> None:
    if firebase_admin._apps:
        return

    project_id = os.environ.get("FIREBASE_ADMIN_PROJECT_ID")
    client_email = os.environ.get("FIREBASE_ADMIN_CLIENT_EMAIL")
    raw_key = os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY", "")
    private_key = raw_key.replace("\\n", "\n")

    if not project_id or not client_email or not private_key:
        raise RuntimeError(
            "Firebase Admin env missing: FIREBASE_ADMIN_PROJECT_ID, "
            "FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY"
        )

    bucket = os.environ.get("FIREBASE_STORAGE_BUCKET") or os.environ.get(
        "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    )

    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": project_id,
            "private_key": private_key,
            "client_email": client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )

    if bucket:
        firebase_admin.initialize_app(cred, {"storageBucket": bucket})
    else:
        firebase_admin.initialize_app(cred)
