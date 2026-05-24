"""
app.py
======
Realize Me – AI Fashion System  

All endpoints accept a SINGLE image file — the tldraw canvas export that
contains BOTH the sketch lines AND colour-hint strokes painted by the user.
No separate colour channel or JSON strokes needed.

Endpoints
---------
GET  /health              Health check
POST /generate-image      tldraw canvas → generated clothing image (base64)
POST /find-similar        Clothing image → top-5 similar products
POST /full-pipeline       tldraw canvas → generated image + similar products
POST /confirm-and-search  Alias for /find-similar  (backward compat)
"""

from __future__ import annotations

import base64
import io
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()


from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

from similarity_search_fashion_clip    import find_similar_products
from image_generation_local import generate_image_pix2pix
from session_routes import router as session_router

SIMILAR_TOP_K_DEFAULT = int(os.environ.get("SIMILAR_TOP_K", "5"))

# ──────────────────────────────────────────────────────────────────────────────
# App setup
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Realize Me – AI Fashion System",
    description=(
        "tldraw canvas (sketch + colour hints) "
        "→ Pix2pix image generation "
        "→ CLIP similarity search"
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session_router)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _read_pil(upload: UploadFile) -> Image.Image:
    """Read an UploadFile into a PIL Image."""
    raw = upload.file.read()
    return Image.open(io.BytesIO(raw))


async def _read_pil_async(upload: UploadFile) -> Image.Image:
    """Read upload bytes without blocking the event loop (Starlette async read)."""
    raw = await upload.read()
    return Image.open(io.BytesIO(raw))


def _pil_to_b64(img: Image.Image) -> str:
    """Encode a PIL Image as a base64 PNG string."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# ──────────────────────────────────────────────────────────────────────────────
# Startup
# ──────────────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    print("\n" + "=" * 70)
    print("🚀  Realize Me – AI Fashion System  (Pix2pix)".center(70))
    print("=" * 70)
    print("✓  Server running")
    print("✓  Pix2pix model will load on first /generate-image request")
    print("✓  CLIP model will load on first /find-similar request")
    print("=" * 70 + "\n")


# ──────────────────────────────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "Realize Me backend is running",
        "version": "2.0.0",
    }


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT 1 – Generate image from tldraw canvas
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/generate-image")
async def generate_image(
    file: UploadFile = File(
        ...,
        description=(
            "PNG/JPG exported from tldraw. "
            "Must contain the sketch lines AND any colour-hint strokes "
            "the user has painted on the same canvas."
        ),
    )
):
    """
    Convert a tldraw canvas image into a realistic clothing image.

    The backend automatically separates:
      - The greyscale sketch (all lines regardless of colour)
      - The colour hints    (only pixels with noticeable saturation)

    Both are fed as a 4-channel input to the Scribbler Generator.
    """
    try:
        print(f"\n📎 /generate-image  ←  {file.filename}")

        canvas = _read_pil(file)
        print(f"   Canvas size  : {canvas.size}  mode: {canvas.mode}")

        generated = generate_image_pix2pix(canvas)
        print(f"   Output size  : {generated.size}")

        return {
            "success":     True,
            "message":     "Image generated successfully",
            "image_base64": _pil_to_b64(generated),
            "framework":   "PyTorch Scribbler",
            "image_size":  f"{generated.size[0]}x{generated.size[1]}",
        }

    except Exception as exc:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT 2 – Find similar products
# ──────────────────────────────────────────────────────────────────────────────

async def _run_find_similar_core(file: UploadFile, top_k: int) -> dict:
    """FashionCLIP embedding + pgvector top-k retrieval (shared by /find-similar and aliases)."""
    print(f"\n🔍 /find-similar  ←  {file.filename}  (top_k={top_k})")

    image = (await _read_pil_async(file)).convert("RGB")
    results = find_similar_products(image, top_k=top_k)

    print(f"✓ Found {len(results)} products")

    return {
        "success": True,
        "message": f"Found {len(results)} similar products",
        "count": len(results),
        "products": results,
        "framework": "FashionCLIP + pgvector",
    }


@app.post("/find-similar")
async def find_similar(
    file: UploadFile = File(
        ...,
        description="Generated clothing image to search against the product database.",
    ),
    top_k: int = Query(
        SIMILAR_TOP_K_DEFAULT,
        ge=1,
        le=50,
        description="Number of nearest neighbours to return (FashionCLIP + pgvector).",
    ),
):
    """
    Find the top-k visually similar products for a given clothing image.
    Uses FashionCLIP embeddings + pgvector cosine distance on product_embeddings_fashion_clip.
    """
    try:
        return await _run_find_similar_core(file, top_k)
    except Exception as exc:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT 3 – Full pipeline
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/full-pipeline")
async def full_pipeline(
    file: UploadFile = File(
        ...,
        description=(
            "tldraw canvas export (sketch + colour hints). "
            "The full pipeline generates the clothing image then searches "
            "for similar products automatically."
        ),
    )
):
    """
    End-to-end pipeline:
      tldraw canvas → Scribbler image → CLIP similarity search → products
    """
    try:
        print("\n" + "=" * 70)
        print("🎨  FULL PIPELINE".center(70))
        print("=" * 70)

        # Read canvas once (UploadFile stream can only be read once)
        raw    = await file.read()
        canvas = Image.open(io.BytesIO(raw))
        print(f"\n📎 Canvas: {file.filename}  size={canvas.size}  mode={canvas.mode}")

        # Step 1 – generate
        print("\n── Step 1: Scribbler generation ────────────────────────────────")
        generated = generate_image_scribbler(canvas)
        img_b64   = _pil_to_b64(generated)
        print(f"✓ Generated  {generated.size}")

        # Step 2 – similarity search
        print("\n── Step 2: Similarity search ───────────────────────────────────")
        products = find_similar_products(generated)
        print(f"✓ Found {len(products)} similar products")

        print("\n" + "=" * 70)
        print("✓  PIPELINE COMPLETE".center(70))
        print("=" * 70 + "\n")

        return {
            "success":               True,
            "message":               "Pipeline completed successfully",
            "generated_image_base64": img_b64,
            "similar_products":      products,
            "frameworks_used":       [
                "PyTorch Scribbler",
                "PyTorch CLIP",
                "PostgreSQL pgvector",
            ],
            "total_products_found":  len(products),
        }

    except Exception as exc:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# Backward-compatibility alias
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/confirm-and-search")
async def confirm_and_search(file: UploadFile = File(...)):
    """Alias for /find-similar."""
    try:
        return await _run_find_similar_core(file, SIMILAR_TOP_K_DEFAULT)
    except Exception as exc:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# Global error handler
# ──────────────────────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    if isinstance(exc, HTTPException):
        detail = exc.detail
        if not isinstance(detail, str):
            detail = str(detail)
        return JSONResponse(status_code=exc.status_code, content={"detail": detail})
    print(f"❌ Unhandled: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc)},
    )


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")