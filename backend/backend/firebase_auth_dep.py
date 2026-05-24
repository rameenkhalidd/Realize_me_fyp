"""FastAPI dependency: verify Firebase ID token → authenticated UID."""

from __future__ import annotations

from typing import Annotated

import firebase_admin.auth as firebase_auth
from fastapi import Depends, Header, HTTPException

from firebase_app_init import ensure_firebase_app


async def require_firebase_uid(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    id_token = authorization[7:].strip()
    if not id_token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        ensure_firebase_app()
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {exc}") from exc

    uid = decoded.get("uid")
    if not uid or not isinstance(uid, str):
        raise HTTPException(status_code=401, detail="Token missing uid")

    return uid
