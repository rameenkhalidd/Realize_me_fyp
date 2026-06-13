"""
app.py
======
Realize Me – AI Fashion System  (ControlNet Edition)

All generation endpoints accept TWO image files:
  sketch       – outline drawing exported from tldraw (outline mode)
  color_hints  – colour-hint strokes from tldraw (colour mode),
                 spatially aligned with the sketch

The two images appear as a single layered canvas to the user but are kept
separate server-side so the ControlNet + SAM + img2img pipeline can use
each signal in the optimal way.

Endpoints
---------
GET  /health              Health check
POST /generate-image      sketch + color_hints → generated clothing image (base64)
POST /find-similar        Clothing image → top-N similar products
POST /full-pipeline       sketch + color_hints → generated image + similar products
POST /confirm-and-search  Alias for /find-similar  (backward compat)
"""

from __future__ import annotations

import base64
import io
import os
from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

from similarity_search_fashion_clip import find_similar_products
from image_generation_controlnet import generate_image_controlnet
from session_routes import router as session_router

SIMILAR_TOP_K_DEFAULT = int(os.environ.get("SIMILAR_TOP_K", "5"))

# ──────────────────────────────────────────────────────────────────────────────
# App setup
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Realize Me – AI Fashion System",
    description=(
        "tldraw sketch (outline) + colour hints "
        "→ ControlNet image generation "
        "→ SAM + LAB colour blending "
        "→ img2img realism pass "
        "→ CLIP similarity search"
    ),
    version="3.0.0",
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
    """Read an UploadFile into a PIL Image (sync)."""
    raw = upload.file.read()
    return Image.open(io.BytesIO(raw))


async def _read_pil_async(upload: UploadFile) -> Image.Image:
    """Read an UploadFile into a PIL Image (async)."""
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
    print("🚀  Realize Me – AI Fashion System  (ControlNet)".center(70))
    print("=" * 70)
    print("✓  Server running")
    print("✓  ControlNet model loads on first /generate-image request")
    print("✓  SAM model loads on first /generate-image request")
    print("✓  CLIP model loads on first /find-similar request")
    print("=" * 70 + "\n")


# ──────────────────────────────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "Realize Me backend is running",
        "version": "3.0.0",
    }


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT 1 – Generate image from sketch + colour hints
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/generate-image")
async def generate_image(
    sketch: UploadFile = File(
        ...,
        description=(
            "PNG/JPG outline sketch exported from tldraw (outline mode). "
            "Black/grey lines on white background, 512×512 recommended."
        ),
    ),
    color_hints: UploadFile = File(
        ...,
        description=(
            "PNG/JPG colour-hint strokes from tldraw (colour mode). "
            "Must be spatially aligned with sketch, same canvas dimensions. "
            "RGBA (transparent background) is handled automatically."
        ),
    ),
    seed: int = Query(-1, description="RNG seed for reproducibility. -1 = random."),
):
    """
    Convert a tldraw outline sketch + colour hints into a realistic clothing image.

    Pipeline:
      1. Sketch      → ControlNet (finetuned) → structured white/grey garment
      2. Color hints → SAM segmentation → RGB blend + LAB blend with ControlNet output
      3. LAB-blended image → ControlNet img2img (strength=0.50) → final realistic image
    """
    try:
        print(f"\n📎 /generate-image  ←  sketch={sketch.filename}  hints={color_hints.filename}")

        sketch_img      = _read_pil(sketch)
        color_hints_img = _read_pil(color_hints)

        print(f"   Sketch size   : {sketch_img.size}  mode: {sketch_img.mode}")
        print(f"   Hints size    : {color_hints_img.size}  mode: {color_hints_img.mode}")

        effective_seed = None if seed < 0 else seed

        generated = generate_image_controlnet(
            sketch=sketch_img,
            color_hints=color_hints_img,
            seed=effective_seed,
        )
        print(f"   Output size   : {generated.size}")

        return {
            "success":      True,
            "message":      "Image generated successfully",
            "image_base64": _pil_to_b64(generated),
            "framework":    "ControlNet + SAM + img2img",
            "image_size":   f"{generated.size[0]}x{generated.size[1]}",
        }

    except Exception as exc:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT 2 – Find similar products
# ──────────────────────────────────────────────────────────────────────────────

async def _run_find_similar_core(file: UploadFile, top_k: int) -> dict:
    """FashionCLIP embedding + pgvector top-k retrieval."""
    print(f"\n🔍 /find-similar  ←  {file.filename}  (top_k={top_k})")

    image   = (await _read_pil_async(file)).convert("RGB")
    results = find_similar_products(image, top_k=top_k)

    print(f"✓ Found {len(results)} products")

    return {
        "success":   True,
        "message":   f"Found {len(results)} similar products",
        "count":     len(results),
        "products":  results,
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
        description="Number of nearest neighbours to return.",
    ),
):
    """
    Find top-k visually similar products for a given clothing image.
    Uses FashionCLIP embeddings + pgvector cosine distance.
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
    sketch: UploadFile = File(
        ...,
        description="Outline sketch from tldraw (outline mode).",
    ),
    color_hints: UploadFile = File(
        ...,
        description=(
            "Colour-hint strokes from tldraw (colour mode), spatially aligned with sketch. "
            "RGBA (transparent background) is handled automatically."
        ),
    ),
    seed: int = Query(-1, description="RNG seed. -1 = random."),
):
    """
    End-to-end pipeline:
      sketch + colour hints → ControlNet + SAM + img2img → CLIP similarity search → products
    """
    try:
        print("\n" + "=" * 70)
        print("🎨  FULL PIPELINE".center(70))
        print("=" * 70)

        sketch_img      = Image.open(io.BytesIO(await sketch.read()))
        color_hints_img = Image.open(io.BytesIO(await color_hints.read()))

        print(f"\n📎 Sketch : {sketch.filename}  size={sketch_img.size}  mode={sketch_img.mode}")
        print(f"📎 Hints  : {color_hints.filename}  size={color_hints_img.size}  mode={color_hints_img.mode}")

        effective_seed = None if seed < 0 else seed

        # Step 1 – generate
        print("\n── Step 1: ControlNet + SAM + img2img ──────────────────────────")
        generated = generate_image_controlnet(
            sketch=sketch_img,
            color_hints=color_hints_img,
            seed=effective_seed,
        )
        img_b64 = _pil_to_b64(generated)
        print(f"✓ Generated  {generated.size}")

        # Step 2 – similarity search
        print("\n── Step 2: Similarity search ───────────────────────────────────")
        products = find_similar_products(generated)
        print(f"✓ Found {len(products)} similar products")

        print("\n" + "=" * 70)
        print("✓  PIPELINE COMPLETE".center(70))
        print("=" * 70 + "\n")

        return {
            "success":                True,
            "message":                "Pipeline completed successfully",
            "generated_image_base64": img_b64,
            "similar_products":       products,
            "frameworks_used": [
                "ControlNet (finetuned)",
                "SAM (Meta AI)",
                "Stable Diffusion ControlNet img2img",
                "FashionCLIP + pgvector",
            ],
            "total_products_found": len(products),
        }

    except Exception as exc:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# Backward-compatibility alias
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/confirm-and-search")
async def confirm_and_search(file: UploadFile = File(...)):
    """Alias for /find-similar (single generated image → similar products)."""
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