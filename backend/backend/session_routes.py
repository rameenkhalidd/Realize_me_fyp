"""
Session API — drafts auto-save, generation history, persisted CLIP search results.

All routes require Authorization: Bearer <Firebase ID token>.
Every query filters by firebase_uid from the verified token.
"""

from __future__ import annotations

import base64
import io
import json
import os
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from PIL import Image
from pydantic import BaseModel, Field

from firebase_auth_dep import require_firebase_uid
from firebase_storage_upload import upload_generated_png
from image_generation_local import generate_image_pix2pix
from realize_db import get_connection, json_param

router = APIRouter(prefix="/api", tags=["session"])

PIX2PIX_MODEL_VERSION = os.environ.get("PIX2PIX_MODEL_VERSION", "scribbler-v2")
ENABLE_FIREBASE_STORAGE_UPLOAD = os.environ.get("ENABLE_FIREBASE_STORAGE_UPLOAD", "false").lower() == "true"


class DraftSaveBody(BaseModel):
    sketch_json: dict[str, Any] = Field(default_factory=dict)


class DraftArchiveBody(BaseModel):
    draft_id: int


class SearchProductItem(BaseModel):
    product_id: str | int
    similarity: float


class SearchResultsBody(BaseModel):
    history_id: int
    session_id: str | None = None
    category: str | None = None
    products: list[SearchProductItem]


def _sketch_dict_from_form(sketch_json: str | None) -> dict[str, Any]:
    if not sketch_json:
        return {}
    try:
        parsed = json.loads(sketch_json)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def persist_generation_history(
    uid: str,
    png_bytes: bytes,
    sketch_obj: dict[str, Any],
    *,
    session_id: str | None = None,
) -> tuple[int, Any, str, str]:
    """
    Insert a history row, try Firebase Storage (non-fatal if it fails), upsert draft.
    Always commits so My work / history lists stay in sync even without Storage.
    """
    sid = session_id or str(uuid.uuid4())
    with get_connection(autocommit=False) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO history (
                firebase_uid, sketch_json, generated_image_url, generation_timestamp,
                session_id, pix2pix_model_version
            ) VALUES (%s, %s, %s, NOW(), %s, %s)
            RETURNING id, generation_timestamp;
            """,
            (uid, json_param(sketch_obj), "", sid, PIX2PIX_MODEL_VERSION),
        )
        history_id, gen_ts = cur.fetchone()

        # DB-first success path: always keep a local data URL so history thumbnails/details always work.
        image_url = f"data:image/png;base64,{base64.b64encode(png_bytes).decode()}" if png_bytes else ""
        if png_bytes and ENABLE_FIREBASE_STORAGE_UPLOAD:
            try:
                storage_url = upload_generated_png(uid, history_id, png_bytes)
                if storage_url:
                    image_url = storage_url
            except Exception as upload_exc:  # noqa: BLE001
                print(
                    f"⚠️ Firebase Storage upload failed (history id={history_id}); "
                    f"kept PostgreSQL data URL fallback: {upload_exc}"
                )

        cur.execute(
            "UPDATE history SET generated_image_url = %s WHERE id = %s AND firebase_uid = %s",
            (image_url, history_id, uid),
        )

        cur.execute(
            """
            INSERT INTO drafts (firebase_uid, sketch_json, generated_image_url, pix2pix_model_version, created_at, updated_at, is_saved)
            VALUES (%s, %s, %s, %s, NOW(), NOW(), FALSE)
            ON CONFLICT (firebase_uid) DO UPDATE SET
                generated_image_url = EXCLUDED.generated_image_url,
                sketch_json = EXCLUDED.sketch_json,
                updated_at = NOW();
            """,
            (uid, json_param(sketch_obj), image_url, PIX2PIX_MODEL_VERSION),
        )
        conn.commit()

    return history_id, gen_ts, image_url, sid


@router.post("/drafts/save")
async def drafts_save(
    body: DraftSaveBody,
    uid: Annotated[str, Depends(require_firebase_uid)],
):
    """Upsert the signed-in user's draft (one row per uid)."""
    sketch = body.sketch_json
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO drafts (firebase_uid, sketch_json, pix2pix_model_version, created_at, updated_at, is_saved)
            VALUES (%s, %s, %s, NOW(), NOW(), FALSE)
            ON CONFLICT (firebase_uid) DO UPDATE SET
                sketch_json = EXCLUDED.sketch_json,
                updated_at = NOW()
            RETURNING id;
            """,
            (uid, json_param(sketch), PIX2PIX_MODEL_VERSION),
        )
        draft_id = cur.fetchone()[0]

    return {"success": True, "draft_id": draft_id, "message": "Draft saved"}


@router.get("/drafts/latest")
async def drafts_latest(uid: Annotated[str, Depends(require_firebase_uid)]):
    """Latest draft for recovery on /designer load."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, sketch_json, generated_image_url, pix2pix_model_version, updated_at, is_saved
            FROM drafts
            WHERE firebase_uid = %s
            """,
            (uid,),
        )
        row = cur.fetchone()

    if not row:
        return {"success": True, "draft": None}

    draft = {
        "id": row[0],
        "sketch_json": row[1],
        "generated_image_url": row[2],
        "pix2pix_model_version": row[3],
        "updated_at": row[4].isoformat() if row[4] else None,
        "is_saved": row[5],
    }
    return {"success": True, "draft": draft}


@router.post("/drafts/archive")
async def drafts_archive(
    body: DraftArchiveBody,
    uid: Annotated[str, Depends(require_firebase_uid)],
):
    """Mark draft as explicitly saved by the user."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE drafts SET is_saved = TRUE, updated_at = NOW() WHERE id = %s AND firebase_uid = %s RETURNING id",
            (body.draft_id, uid),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Draft not found")

    return {"success": True, "message": "Draft archived"}


async def _read_sketch_upload(
    file: UploadFile,
    sketch_file: UploadFile | None,
) -> bytes:
    """Prefer explicit sketch_file; fall back to legacy `file` field."""
    upload = sketch_file if sketch_file is not None else file
    raw = await upload.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Sketch file is empty")
    return raw


@router.post("/generate")
async def session_generate(
    uid: Annotated[str, Depends(require_firebase_uid)],
    file: UploadFile = File(..., description="Legacy sketch PNG (same as sketch_file)"),
    sketch_file: UploadFile | None = File(None, description="Outline/structure PNG for ControlNet"),
    color_hints_file: UploadFile | None = File(
        None, description="Color-hint PNG for SAM/LAB (optional until pipeline wired)"
    ),
    sketch_json: str | None = Form(None),
    session_id: str | None = Form(None),
):
    """
    Run generation on sketch PNG, persist history (always), upload to Storage when possible.
    color_hints_file is accepted for the ControlNet+SAM+LAB pipeline (Aimen); Pix2Pix uses sketch only.
    Returns image_base64 for immediate UI plus storage URL and history_id.
    """
    sketch_raw = await _read_sketch_upload(file, sketch_file)
    if color_hints_file is not None:
        await color_hints_file.read()

    try:
        canvas = Image.open(io.BytesIO(sketch_raw))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid sketch image file: {exc}") from exc

    generated = generate_image_pix2pix(canvas)
    buf = io.BytesIO()
    generated.save(buf, format="PNG")
    png_bytes = buf.getvalue()
    image_b64 = base64.b64encode(png_bytes).decode()

    sketch_obj = _sketch_dict_from_form(sketch_json)
    history_id, gen_ts, image_url, sid = persist_generation_history(
        uid, png_bytes, sketch_obj, session_id=session_id
    )

    return {
        "success": True,
        "history_id": history_id,
        "session_id": sid,
        "generated_image_url": image_url,
        "image_base64": image_b64,
        "generation_timestamp": gen_ts.isoformat() if hasattr(gen_ts, "isoformat") else str(gen_ts),
        "pix2pix_model_version": PIX2PIX_MODEL_VERSION,
    }


@router.post("/history/record")
async def history_record(
    uid: Annotated[str, Depends(require_firebase_uid)],
    generated_image: UploadFile = File(
        ...,
        description="Rendered PNG (e.g. output of /generate-image) to attach to a new history row.",
    ),
    sketch_json: str | None = Form(None),
):
    """
    When the app used /generate-image only (no full /api/generate), call this to insert history.
    Same Storage + DB rules as /api/generate: history is always saved; upload may be empty.
    """
    raw = await generated_image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="generated_image is empty")

    sketch_obj = _sketch_dict_from_form(sketch_json)
    history_id, gen_ts, image_url, sid = persist_generation_history(uid, raw, sketch_obj)
    image_b64 = base64.b64encode(raw).decode()

    return {
        "success": True,
        "history_id": history_id,
        "session_id": sid,
        "generated_image_url": image_url,
        "image_base64": image_b64,
        "generation_timestamp": gen_ts.isoformat() if hasattr(gen_ts, "isoformat") else str(gen_ts),
        "pix2pix_model_version": PIX2PIX_MODEL_VERSION,
    }


@router.post("/search-results")
async def save_search_results(
    body: SearchResultsBody,
    uid: Annotated[str, Depends(require_firebase_uid)],
):
    """Replace prior stored results for this history_id and save the new ranked list."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM history WHERE id = %s AND firebase_uid = %s",
            (body.history_id, uid),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="History not found for this user")

        cur.execute(
            "DELETE FROM search_results WHERE history_id = %s AND firebase_uid = %s",
            (body.history_id, uid),
        )

        for rank, p in enumerate(body.products, start=1):
            cur.execute(
                """
                INSERT INTO search_results (
                    firebase_uid, history_id, product_id, similarity_score, rank_position, searched_at, category
                ) VALUES (%s, %s, %s, %s, %s, NOW(), %s)
                """,
                (
                    uid,
                    body.history_id,
                    int(p.product_id),
                    float(p.similarity),
                    rank,
                    body.category,
                ),
            )

    return {"success": True, "message": f"Stored {len(body.products)} search results"}


@router.get("/history")
async def list_history(
    uid: Annotated[str, Depends(require_firebase_uid)],
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, generated_image_url, generation_timestamp, session_id, pix2pix_model_version
            FROM history
            WHERE firebase_uid = %s
            ORDER BY generation_timestamp DESC
            LIMIT %s OFFSET %s
            """,
            (uid, limit, offset),
        )
        rows = cur.fetchall()
        cur.execute("SELECT COUNT(*) FROM history WHERE firebase_uid = %s", (uid,))
        total = cur.fetchone()[0]

    items = []
    for r in rows:
        items.append(
            {
                "id": r[0],
                "generated_image_url": r[1],
                "generation_timestamp": r[2].isoformat() if r[2] else None,
                "session_id": r[3],
                "pix2pix_model_version": r[4],
            }
        )

    return {"success": True, "items": items, "total": total, "limit": limit, "offset": offset}


def _fetch_history_bundle(conn, history_id: int, uid: str) -> tuple[Any, list[Any]]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, firebase_uid, sketch_json, generated_image_url, generation_timestamp,
               session_id, pix2pix_model_version
        FROM history WHERE id = %s AND firebase_uid = %s
        """,
        (history_id, uid),
    )
    row = cur.fetchone()
    if not row:
        return None, []

    cur.execute(
        """
        SELECT sr.id, sr.product_id, sr.similarity_score, sr.rank_position, sr.searched_at, sr.category,
               p.product_name, p.brand, p.price,
               COALESCE(NULLIF(TRIM(p.cloudinary_url), ''), p.image_path) AS image_url,
               p.product_url
        FROM search_results sr
        JOIN products p ON p.product_id = sr.product_id
        WHERE sr.history_id = %s AND sr.firebase_uid = %s
        ORDER BY sr.rank_position
        """,
        (history_id, uid),
    )
    srows = cur.fetchall()
    return row, srows


@router.get("/history/{history_id}")
async def get_history_detail(
    history_id: int,
    uid: Annotated[str, Depends(require_firebase_uid)],
):
    with get_connection() as conn:
        row, srows = _fetch_history_bundle(conn, history_id, uid)

    if not row:
        raise HTTPException(status_code=403, detail="History not found")

    history = {
        "id": row[0],
        "firebase_uid": row[1],
        "sketch_json": row[2],
        "generated_image_url": row[3],
        "generation_timestamp": row[4].isoformat() if row[4] else None,
        "session_id": row[5],
        "pix2pix_model_version": row[6],
    }
    search_results = _serialize_search_rows(srows)
    return {"success": True, "history": history, "search_results": search_results}


def _serialize_search_rows(srows: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for s in srows:
        price = s[8]
        out.append(
            {
                "id": s[0],
                "product_id": str(s[1]),
                "similarity_score": float(s[2]),
                "rank_position": s[3],
                "searched_at": s[4].isoformat() if s[4] else None,
                "category": s[5],
                "product_name": s[6],
                "brand": s[7],
                "price": float(price) if price is not None else None,
                "image_url": (s[9] or "").strip() if s[9] else "",
                "product_url": (s[10] or "").strip() if s[10] else "",
            }
        )
    return out


@router.get("/history/{history_id}/results")
async def get_history_results_only(
    history_id: int,
    uid: Annotated[str, Depends(require_firebase_uid)],
):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM history WHERE id = %s AND firebase_uid = %s",
            (history_id, uid),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="History not found")

        cur.execute(
            """
            SELECT sr.id, sr.product_id, sr.similarity_score, sr.rank_position, sr.searched_at, sr.category,
                   p.product_name, p.brand, p.price,
                   COALESCE(NULLIF(TRIM(p.cloudinary_url), ''), p.image_path) AS image_url,
                   p.product_url
            FROM search_results sr
            JOIN products p ON p.product_id = sr.product_id
            WHERE sr.history_id = %s AND sr.firebase_uid = %s
            ORDER BY sr.rank_position
            """,
            (history_id, uid),
        )
        srows = cur.fetchall()

    return {"success": True, "history_id": history_id, "results": _serialize_search_rows(srows)}


@router.get("/user/stats")
async def user_stats(uid: Annotated[str, Depends(require_firebase_uid)]):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM history WHERE firebase_uid = %s", (uid,))
        total_gen = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM search_results WHERE firebase_uid = %s", (uid,))
        total_sr = cur.fetchone()[0]
        cur.execute(
            "SELECT MAX(generation_timestamp) FROM history WHERE firebase_uid = %s",
            (uid,),
        )
        last_at = cur.fetchone()[0]

    return {
        "success": True,
        "total_generations": total_gen,
        "total_search_results_saved": total_sr,
        "last_generation_at": last_at.isoformat() if last_at else None,
    }
