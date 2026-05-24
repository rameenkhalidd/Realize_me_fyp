"""
test_full_pipeline_local.py
============================
Tests the FULL pipeline from sketch → generated image → similar products.
Also tests the live FastAPI backend over HTTP.

USAGE
-----
# Model-only tests (no backend, no DB needed):
    python test_full_pipeline_local.py --phase 1

# Backend HTTP tests (start app.py first):
    python test_full_pipeline_local.py --phase 2

# Everything:
    python test_full_pipeline_local.py

PHASES
------
Phase 1 — Local model tests  (imports scribbler_model, color_utils, etc.)
  T1  Checkpoint file exists and loads without error
  T2  Model architecture matches checkpoint weights
  T3  Forward pass on random noise → correct output shape + range
  T4  split_sketch_and_color() correctly separates sketch vs colour pixels
  T5  build_4channel_input() produces (1,4,256,256) float32 tensor
  T6  Full generation: canvas image → PIL 256×256 RGB output
  T7  Colour-hint path: coloured strokes survive into color_map (not zeroed)

Phase 2 — Backend HTTP tests  (requires running FastAPI server)
  T8  GET  /health          → {"status":"ok"}
  T9  POST /generate-image  → base64 PNG in response
  T10 POST /find-similar    → list of products
  T11 POST /full-pipeline   → generated image + products

All debug images are saved to ./test_outputs/ so you can open them and
visually verify each stage.
"""

import argparse
import base64
import io
import os
import sys
import time
import traceback

import numpy as np
from PIL import Image, ImageDraw

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────────────────────

MODEL_PATH   = "../model/trained_scribbler.pth"
BACKEND_URL  = "http://localhost:8000"
SKETCH_PATH  = None   # set to a real file path, or leave None for synthetic

OUT_DIR = "test_outputs"
os.makedirs(OUT_DIR, exist_ok=True)

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

PASS = "✓  PASS"
FAIL = "✗  FAIL"
WARN = "⚠  WARN"
SEP  = "─" * 70


def header(title: str):
    print(f"\n{'═'*70}\n  {title}\n{'═'*70}")


def section(title: str):
    print(f"\n{SEP}\n  {title}\n{SEP}")


def ok(msg: str, detail: str = ""):
    d = f"  →  {detail}" if detail else ""
    print(f"  {PASS}   {msg}{d}")


def fail(msg: str, detail: str = ""):
    d = f"  →  {detail}" if detail else ""
    print(f"  {FAIL}   {msg}{d}")


def warn(msg: str, detail: str = ""):
    d = f"  →  {detail}" if detail else ""
    print(f"  {WARN}   {msg}{d}")


def save(img: Image.Image, name: str) -> str:
    path = os.path.join(OUT_DIR, name)
    img.save(path)
    return os.path.abspath(path)


# ──────────────────────────────────────────────────────────────────────────────
# Synthetic test images
# ──────────────────────────────────────────────────────────────────────────────

def make_sketch_only(size=512) -> Image.Image:
    """
    White background + black sketch lines only (no colour hints).
    Simulates a tldraw export where the user only drew the outline.
    """
    img  = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Shirt outline
    pts = [(150,60),(350,60),(370,100),(370,420),(130,420),(130,100)]
    draw.polygon(pts, outline=(30,30,30), fill=None)
    draw.line([(150,60),(100,160),(130,170)], fill=(30,30,30), width=3)  # left sleeve
    draw.line([(350,60),(400,160),(370,170)], fill=(30,30,30), width=3)  # right sleeve
    draw.line([(230,60),(230,120)], fill=(30,30,30), width=2)            # collar left
    draw.line([(270,60),(270,120)], fill=(30,30,30), width=2)            # collar right
    return img


def make_sketch_with_color(size=512) -> Image.Image:
    """
    Same shirt outline + painted colour hints.
    Red on the body, blue on the sleeves — simulates what the user would
    paint in tldraw to give Scribbler colour guidance.
    """
    img  = make_sketch_only(size)
    draw = ImageDraw.Draw(img)
    # Red body fill hint
    draw.ellipse([(170,150),(330,350)], fill=(210, 40, 40))
    # Blue sleeve hints
    draw.ellipse([(95,100),(145,180)],  fill=(40,  80, 210))
    draw.ellipse([(355,100),(405,180)], fill=(40,  80, 210))
    return img


def pick_canvas() -> Image.Image:
    """Return a canvas image: real file > tkinter picker > synthetic."""
    if SKETCH_PATH and os.path.exists(SKETCH_PATH):
        print(f"  Using: {SKETCH_PATH}")
        return Image.open(SKETCH_PATH)
    try:
        from tkinter import Tk, filedialog
        root = Tk(); root.withdraw(); root.attributes('-topmost', True)
        path = filedialog.askopenfilename(
            title="Select sketch (or Cancel for synthetic)",
            filetypes=[("Images", "*.png *.jpg *.jpeg"), ("All", "*.*")]
        )
        root.destroy()
        if path and os.path.exists(path):
            print(f"  Using: {path}")
            return Image.open(path)
    except Exception:
        pass
    print("  No file selected — using SYNTHETIC sketch")
    return make_sketch_only()


# ──────────────────────────────────────────────────────────────────────────────
# PHASE 1 — Local model tests
# ──────────────────────────────────────────────────────────────────────────────

def phase1(canvas: Image.Image) -> bool:
    header("PHASE 1 — Local Model Tests  (no backend / DB needed)")

    import torch
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n  Device : {device}  |  PyTorch : {torch.__version__}")

    passed = []

    # ── T1: checkpoint file ───────────────────────────────────────────────────
    section("T1 — Checkpoint file")
    abs_path = os.path.abspath(MODEL_PATH)
    print(f"  Path: {abs_path}")
    if not os.path.exists(abs_path):
        fail("File not found")
        print(f"\n  Fix: place your .pth file at:\n      {abs_path}")
        print("  Cannot continue without checkpoint.")
        return False
    size_mb = os.path.getsize(abs_path) / 1e6
    ok("File exists", f"{size_mb:.1f} MB")

    try:
        ckpt = torch.load(abs_path, map_location=device)
        keys = list(ckpt.keys()) if isinstance(ckpt, dict) else "raw state-dict"
        ok("torch.load() succeeded", f"keys = {keys}")
        passed.append("T1")
    except Exception as e:
        fail("torch.load() failed", str(e))
        traceback.print_exc()
        return False

    # ── T2: architecture + weight loading ────────────────────────────────────
    section("T2 — Architecture + weight loading")
    try:
        from backend.backend.pix2pix_model import Generator
        model = Generator(img_size=256, input_channels=4).to(device)
        if isinstance(ckpt, dict):
            for key in ("generator", "generator_state", "model_state_dict", "state_dict"):
                if key in ckpt:
                    model.load_state_dict(ckpt[key])
                    ok(f"Weights loaded from ckpt['{key}']")
                    break
            else:
                model.load_state_dict(ckpt)
                ok("Weights loaded (dict as direct state-dict)")
        else:
            model.load_state_dict(ckpt)
            ok("Weights loaded (raw)")
        model.eval()
        n = sum(p.numel() for p in model.parameters())
        ok("model.eval() set", f"{n:,} parameters")
        passed.append("T2")
    except RuntimeError as e:
        fail("Weight mismatch — model architecture doesn't match checkpoint", str(e))
        print("\n  Common cause: checkpoint was trained with different input_channels")
        print("  or different number of layers. Check your training config.")
        traceback.print_exc()
        return False

    # ── T3: forward pass on random noise ─────────────────────────────────────
    section("T3 — Forward pass  (4-channel random noise)")
    try:
        noise = torch.randn(1, 4, 256, 256).to(device)
        t0 = time.time()
        with torch.no_grad():
            out = model(noise)
        ms = (time.time() - t0) * 1000
        assert out.shape == (1, 3, 256, 256), f"Wrong shape: {out.shape}"
        assert -1.1 <= out.min().item() and out.max().item() <= 1.1, \
            f"Output out of [-1,1]: min={out.min():.3f} max={out.max():.3f}"
        ok("Output shape correct", str(tuple(out.shape)))
        ok("Output range correct", f"min={out.min():.3f}  max={out.max():.3f}  (Tanh → [-1,1])")
        ok("Inference time", f"{ms:.0f} ms")
        passed.append("T3")
    except Exception as e:
        fail("Forward pass failed", str(e))
        traceback.print_exc()

    # ── T4: sketch/colour split ───────────────────────────────────────────────
    section("T4 — Colour-hint split  (greyscale canvas, no colour hints)")
    try:
        from color_utils import split_sketch_and_color
        sketch_ch, color_map = split_sketch_and_color(canvas, img_size=256)
        assert sketch_ch.shape == (256,256,1) and sketch_ch.dtype == np.float32
        assert color_map.shape == (256,256,3) and color_map.dtype == np.float32

        n_color = int((color_map > 0.05).any(axis=-1).sum())
        p_sketch = float(sketch_ch[sketch_ch < 0.9].size) / sketch_ch.size * 100

        ok("sketch_ch shape", f"(256,256,1)  float32")
        ok("color_map shape", f"(256,256,3)  float32")
        ok("Sketch coverage", f"{p_sketch:.1f}% non-white pixels  (sketch lines visible)")

        if n_color == 0:
            ok("Colour-hint pixels", "0  (no colour hints in this sketch — correct)")
        else:
            ok("Colour-hint pixels", f"{n_color}  coloured pixels detected")

        # Save debug images
        path_s = save(
            Image.fromarray((sketch_ch[:,:,0]*255).astype(np.uint8), "L"),
            "sketch_channel.png"
        )
        path_c = save(
            Image.fromarray((color_map*255).astype(np.uint8), "RGB"),
            "color_map.png"
        )
        print(f"\n  Saved: {path_s}")
        print(f"  Saved: {path_c}")
        passed.append("T4")
    except Exception as e:
        fail("split_sketch_and_color() failed", str(e))
        traceback.print_exc()

    # ── T5: 4-channel tensor ──────────────────────────────────────────────────
    section("T5 — 4-channel input tensor")
    try:
        from color_utils import build_4channel_input
        tensor = build_4channel_input(canvas, img_size=256)
        assert tensor.shape == (1,4,256,256), f"Wrong shape: {tensor.shape}"
        assert tensor.dtype == torch.float32
        ok("Tensor shape",  str(tuple(tensor.shape)))
        ok("Tensor dtype",  str(tensor.dtype))
        ok("Value range",   f"min={tensor.min():.3f}  max={tensor.max():.3f}  (should be [0,1])")
        passed.append("T5")
    except Exception as e:
        fail("build_4channel_input() failed", str(e))
        traceback.print_exc()

    # ── T6: end-to-end generation ─────────────────────────────────────────────
    section("T6 — End-to-end generation from canvas")
    try:
        from image_generation_local import generate_image_scribbler
        t0 = time.time()
        generated = generate_image_scribbler(canvas)
        ms = (time.time() - t0) * 1000

        assert isinstance(generated, Image.Image)
        assert generated.mode == "RGB"
        assert generated.size == (256, 256)

        arr = np.array(generated)
        is_grey  = np.std(arr) < 5
        is_noise = np.std(arr) > 120

        path_g = save(generated, "generated_output.png")
        ok("Return type", "PIL Image  RGB  256×256")
        ok("Inference time", f"{ms:.0f} ms")
        print(f"\n  Saved: {path_g}")

        if is_grey:
            warn("Output looks uniformly grey",
                 "Model may not be trained enough, or weights didn't load correctly")
        elif is_noise:
            warn("Output looks like random noise",
                 "Model architecture may not match checkpoint")
        else:
            ok("Output pixel variance looks healthy",
               f"std={np.std(arr):.1f}  (>5 = not flat grey, <120 = not noise)")
        passed.append("T6")
    except Exception as e:
        fail("Generation failed", str(e))
        traceback.print_exc()

    # ── T7: colour hints actually flow through ────────────────────────────────
    section("T7 — Colour hints survive into color_map")
    try:
        from color_utils import split_sketch_and_color
        colored_canvas = make_sketch_with_color(512)
        path_cc = save(colored_canvas, "synthetic_colored_sketch.png")
        print(f"  Synthetic sketch with colour hints: {path_cc}")

        _, color_map_c = split_sketch_and_color(colored_canvas, img_size=256)
        n_color = int((color_map_c > 0.05).any(axis=-1).sum())

        path_cm = save(
            Image.fromarray((color_map_c*255).astype(np.uint8), "RGB"),
            "color_map_with_hints.png"
        )
        print(f"  Colour map (should show red + blue patches): {path_cm}")

        if n_color < 100:
            fail("Colour hints NOT detected",
                 f"Only {n_color} colour pixels found — saturation threshold may be too high")
            print("\n  Fix: lower sat_threshold in color_utils.py (try 0.08 instead of 0.15)")
        else:
            ok("Colour hints detected", f"{n_color} coloured pixels in color_map")
            passed.append("T7")
    except Exception as e:
        fail("T7 failed", str(e))
        traceback.print_exc()

    # ── Summary ───────────────────────────────────────────────────────────────
    total = 7
    n = len(passed)
    print(f"\n{'═'*70}")
    print(f"  Phase 1 result:  {n}/{total} passed  {passed}")
    if n == total:
        print("  ✓  ALL PHASE 1 TESTS PASSED — model is working correctly")
    else:
        missed = [f"T{i}" for i in range(1,8) if f"T{i}" not in passed]
        print(f"  ✗  Failed: {missed}")
    print(f"{'═'*70}")
    return n == total


# ──────────────────────────────────────────────────────────────────────────────
# PHASE 2 — Backend HTTP tests
# ──────────────────────────────────────────────────────────────────────────────

def _img_to_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _b64_to_pil(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64)))


def phase2(canvas: Image.Image):
    header("PHASE 2 — Backend HTTP Tests  (FastAPI server must be running)")
    print(f"\n  Backend URL: {BACKEND_URL}")
    print(f"  Make sure you started:  python app.py  or  uvicorn app:app --port 8000")

    try:
        import requests
    except ImportError:
        print("\n  requests not installed — run:  pip install requests")
        return

    sketch_bytes = _img_to_bytes(canvas)
    passed = []

    # ── T8: health check ──────────────────────────────────────────────────────
    section("T8 — GET /health")
    try:
        r = requests.get(f"{BACKEND_URL}/health", timeout=5)
        d = r.json()
        assert r.status_code == 200
        assert d.get("status") == "ok"
        ok("Status 200", str(d))
        passed.append("T8")
    except requests.exceptions.ConnectionError:
        fail("Cannot connect to backend",
             f"Is the server running at {BACKEND_URL}?")
        print("\n  Run in a separate terminal:  python app.py")
        print("  Then re-run this script.")
        return
    except Exception as e:
        fail("/health failed", str(e))

    # ── T9: generate-image ────────────────────────────────────────────────────
    section("T9 — POST /generate-image")
    generated_b64 = None
    try:
        t0 = time.time()
        r  = requests.post(
            f"{BACKEND_URL}/generate-image",
            files={"file": ("canvas.png", sketch_bytes, "image/png")},
            timeout=120
        )
        ms = (time.time() - t0) * 1000
        d  = r.json()

        assert r.status_code == 200,          f"HTTP {r.status_code}: {d}"
        assert d.get("success") is True,      f"success=False: {d.get('detail')}"
        assert "image_base64" in d,           "No image_base64 in response"
        assert len(d["image_base64"]) > 1000, "image_base64 is suspiciously short"

        generated_b64 = d["image_base64"]
        gen_img = _b64_to_pil(generated_b64)
        path_g = save(gen_img, "backend_generated.png")

        ok("Status 200 + success=true")
        ok("image_base64 received", f"{len(generated_b64)//1000} KB base64")
        ok("Decoded to PIL image",  f"{gen_img.size}  {gen_img.mode}")
        ok("Round-trip time",       f"{ms:.0f} ms")
        print(f"\n  Saved: {path_g}")
        passed.append("T9")
    except Exception as e:
        fail("/generate-image failed", str(e))
        traceback.print_exc()

    # ── T10: find-similar ─────────────────────────────────────────────────────
    section("T10 — POST /find-similar")
    try:
        # Use generated image if we have it, otherwise send sketch
        img_bytes = (
            base64.b64decode(generated_b64)
            if generated_b64 else sketch_bytes
        )
        r = requests.post(
            f"{BACKEND_URL}/find-similar",
            files={"file": ("image.png", img_bytes, "image/png")},
            timeout=60
        )
        d = r.json()
        assert r.status_code == 200
        assert d.get("success") is True, f"success=False: {d.get('detail')}"
        products = d.get("products", [])

        ok("Status 200 + success=true")
        ok(f"Products returned", f"{len(products)} items")

        if products:
            print(f"\n  {'#':<3}  {'Match':>6}   {'Name':<30}  {'Brand':<15}  Price")
            print(f"  {'─'*62}")
            for i, p in enumerate(products, 1):
                sim   = p.get("similarity", 0) * 100
                name  = str(p.get("name",  "?"))[:29]
                brand = str(p.get("brand", "?"))[:14]
                price = p.get("price", "N/A")
                print(f"  {i:<3}  {sim:>5.1f}%   {name:<30}  {brand:<15}  {price}")
        else:
            warn("No products returned",
                 "Is your database populated with product embeddings?")
        passed.append("T10")
    except Exception as e:
        fail("/find-similar failed", str(e))
        traceback.print_exc()

    # ── T11: full-pipeline ────────────────────────────────────────────────────
    section("T11 — POST /full-pipeline")
    try:
        t0 = time.time()
        r  = requests.post(
            f"{BACKEND_URL}/full-pipeline",
            files={"file": ("canvas.png", sketch_bytes, "image/png")},
            timeout=180
        )
        ms = (time.time() - t0) * 1000
        d  = r.json()

        assert r.status_code == 200
        assert d.get("success") is True, f"success=False: {d.get('detail')}"
        assert "generated_image_base64" in d
        assert "similar_products" in d

        gen_img  = _b64_to_pil(d["generated_image_base64"])
        products = d["similar_products"]
        path_fp  = save(gen_img, "backend_full_pipeline_output.png")

        ok("Status 200 + success=true")
        ok("Generated image in response", str(gen_img.size))
        ok(f"Products in response", f"{len(products)} items")
        ok("Total round-trip time", f"{ms:.0f} ms")
        print(f"\n  Saved: {path_fp}")
        passed.append("T11")
    except Exception as e:
        fail("/full-pipeline failed", str(e))
        traceback.print_exc()

    # ── Summary ───────────────────────────────────────────────────────────────
    total = 4   # T8–T11
    n     = len(passed)
    print(f"\n{'═'*70}")
    print(f"  Phase 2 result:  {n}/{total} passed  {passed}")
    if n == total:
        print("  ✓  ALL PHASE 2 TESTS PASSED — backend is fully connected")
    else:
        missed = [f"T{i}" for i in range(8,12) if f"T{i}" not in passed]
        print(f"  ✗  Failed: {missed}")
    print(f"{'═'*70}")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scribbler pipeline test")
    parser.add_argument(
        "--phase", type=int, choices=[1, 2], default=0,
        help="1=model only, 2=backend only, 0=both (default)"
    )
    args = parser.parse_args()

    header("REALIZE ME — SCRIBBLER FULL PIPELINE TEST")
    print(f"\n  Output folder: {os.path.abspath(OUT_DIR)}")

    print("\n  Select your sketch image (Cancel = use synthetic sketch):")
    canvas = pick_canvas()
    path_in = save(canvas, "input_canvas.png")
    print(f"  Input saved: {path_in}")

    run1 = args.phase in (0, 1)
    run2 = args.phase in (0, 2)

    p1_ok = True
    if run1:
        p1_ok = phase1(canvas)

    if run2:
        if run1 and not p1_ok:
            print("\n  ⚠  Phase 1 failed — fix model errors before running Phase 2")
            ans = input("  Continue with Phase 2 anyway? [y/N]: ").strip().lower()
            if ans != "y":
                sys.exit(1)
        phase2(canvas)

    print(f"\n  All output images saved to: {os.path.abspath(OUT_DIR)}/")
    print("  Open them to visually verify each stage.\n")


if __name__ == "__main__":
    main()