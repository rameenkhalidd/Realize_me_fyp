"""
image_generation_controlnet.py
================================
Realize Me – ControlNet + SAM + img2img Pipeline
v6-merged: Best realism from v1 + best color pipeline from v5-alt

MERGE STRATEGY:
  FROM v1 (original):
    - CONTROLNET_SCALE = 0.65   ← primary driver of photorealism / sharp structure
    - NUM_INFERENCE_STEPS = 25
    - GUIDANCE_SCALE = 7.5
    - IMG2IMG_STRENGTH = 0.50
    - Original realistic prompts (studio product photo, plain beige/white bg)
    - Single-center SAM outer mask (matches original notebooks exactly)

  FROM v5-alt (kept because color quality is better):
    - HSV-based hint detection (_parse_color_hints) — JPEG-robust, no cv2 dep
    - LAB-space median color assignment — perceptually accurate region colours
    - Sketch-derived region splitting (_extract_sketch_regions) — bodice vs skirt
    - 5-point cross SAM prompt → binary_fill_holes/closing → sketch_hull fallback
    - Two-pass color assignment (sketch regions first, then SAM sub-masks)
    - binary_erosion 2px before bg enforcement — eliminates boundary artifacts
    - _enforce_white_background() Step 4

  NOT kept from v5-alt:
    - CONTROLNET_SCALE = 0.40   ← caused flat/cartoon look, reverted to 0.65
    - NUM_INFERENCE_STEPS = 30  ← unnecessary with 0.65 scale, reverted to 25
    - GUIDANCE_SCALE = 9.0      ← caused over-sharpening artifacts, reverted to 7.5
    - IMG2IMG_STRENGTH = 0.68   ← colour drift risk, reverted to 0.50
    - "DSLR photo, 85mm lens, hyperrealistic" tokens — over-triggered illustration
    - Outline-suppression negative tokens — redundant at 0.65 scale

Pipeline:
  Step 1 – ControlNet generation (sketch → structured white garment)
  Step 2 – SAM + colour assignment + blend (colour hints applied)
  Step 3 – ControlNet img2img (refine texture/realism)
  Step 4 – Background cleanup (enforce white)
"""

from __future__ import annotations

import os
import logging
from typing import Optional

import numpy as np
from PIL import Image
from scipy.ndimage import (
    gaussian_filter,
    binary_closing,
    binary_fill_holes,
    binary_dilation,
    binary_erosion,
    label as nd_label,
)
from skimage.color import rgb2lab, lab2rgb

import torch
from diffusers import (
    ControlNetModel,
    StableDiffusionControlNetPipeline,
    StableDiffusionControlNetImg2ImgPipeline,
    UniPCMultistepScheduler,
)
from segment_anything import (
    SamAutomaticMaskGenerator,
    SamPredictor,
    sam_model_registry,
)

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

IS_COLAB  = os.environ.get("RUNNING_ENV", "local") == "colab"
_HERE     = os.path.dirname(__file__)
MODEL_DIR = (
    "/content/model"
    if IS_COLAB
    else os.path.join(_HERE, "..", "model")
)

SD_BASE_MODEL         = os.environ.get("SD_BASE_MODEL",         "runwayml/stable-diffusion-v1-5")
CONTROLNET_BASE_MODEL = os.environ.get("CONTROLNET_BASE_MODEL", "lllyasviel/control_v11p_sd15_lineart")
CONTROLNET_STATE_DICT = os.environ.get("CONTROLNET_STATE_DICT", os.path.join(MODEL_DIR, "controlnet_state_dict.pt"))
SAM_CHECKPOINT        = os.environ.get("SAM_CHECKPOINT",        os.path.join(MODEL_DIR, "sam_vit_b_01ec64.pth"))
SAM_MODEL_TYPE        = os.environ.get("SAM_MODEL_TYPE",        "vit_b")
LORA_DIR              = os.environ.get("LORA_DIR",              os.path.join(MODEL_DIR, "lora"))
APPLY_LORA            = os.environ.get("APPLY_LORA",            "false").lower() == "true"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DTYPE  = torch.float16 if DEVICE.type == "cuda" else torch.float32

# ── Inference hyperparameters — FROM v1 (produce photorealistic output) ──────
#
# CONTROLNET_SCALE = 0.65: this is THE critical number.
#   At 0.65 the finetuned lineart ControlNet strongly guides structure/silhouette
#   while leaving the UNet enough freedom to synthesise fabric texture & lighting.
#   v5-alt dropped this to 0.40 to avoid hard outlines on bad seeds — that also
#   dropped structure fidelity and pushed the model into its flat-illustration
#   prior. 0.65 is correct; hard outlines on bad seeds are handled by seed
#   selection or minor prompt tuning, not by gutting the conditioning scale.
#
NUM_INFERENCE_STEPS: int   = int(  os.environ.get("NUM_INFERENCE_STEPS",           "25"))
GUIDANCE_SCALE:      float = float(os.environ.get("GUIDANCE_SCALE",                "7.5"))
CONTROLNET_SCALE:    float = float(os.environ.get("CONTROLNET_CONDITIONING_SCALE", "0.65"))
IMG2IMG_STRENGTH:    float = float(os.environ.get("IMG2IMG_STRENGTH",              "0.50"))
IMAGE_SIZE:          int   = 512

# ── SAM hyperparameters — slightly relaxed from v5-alt for better coverage ───
SAM_POINTS_PER_SIDE:  int   = 32
SAM_IOU_THRESH:       float = 0.86
SAM_STABILITY_THRESH: float = 0.90
SAM_MIN_MASK_AREA:    int   = 100
SAM_OVERLAP_THRESH:   float = float(os.environ.get("SAM_OVERLAP_THRESH", "0.35"))

# ── Color-hint detection (FROM v5-alt — HSV-based, JPEG-robust) ──────────────
HINT_MAX_LIGHTNESS  = float(os.environ.get("HINT_MAX_LIGHTNESS",  "0.92"))
HINT_MIN_SATURATION = float(os.environ.get("HINT_MIN_SATURATION", "0.08"))

# ── Sketch region splitting (FROM v5-alt) ─────────────────────────────────────
SKETCH_LINE_DARKNESS  = float(os.environ.get("SKETCH_LINE_DARKNESS",  "0.45"))
SKETCH_MIN_LINE_WIDTH = int(  os.environ.get("SKETCH_MIN_LINE_WIDTH",  "3"))

DEFAULT_CATEGORY: str = os.environ.get("DEFAULT_CATEGORY", "clothing item")


# ──────────────────────────────────────────────────────────────────────────────
# Prompts — FROM v1 (realistic studio-product style that produced blue shirt)
# ──────────────────────────────────────────────────────────────────────────────

GENERATION_NEGATIVE_PROMPT = (
    "person, model, mannequin, hanger, rack, colored background, dark background, "
    "gradient background, shadow, low contrast, blurry edges, multiple items, "
    "text, logo, watermark, clutter"
)

IMG2IMG_NEGATIVE_PROMPT = (
    "person, human, model, mannequin, hanger, rack, colored background, dark background, "
    "gradient background, shadow, low contrast, blurry edges, multiple items, "
    "text, logo, watermark, clutter"
)


def _build_generation_prompt(category: str) -> str:
    # FROM v1 — the prompt that produced the realistic blue shirt result
    return (
        f"a pure white {category}, plain beige background, centered, "
        f"studio product photo, high quality, high contrast between garment and background"
    )


def _build_img2img_prompt(category: str) -> str:
    # FROM v1 — keeps img2img in the same photorealistic distribution as Step 1
    return (
        f"a {category}, studio product photo, pure white background, centered, "
        f"high quality, photorealistic fabric texture"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Lazy model singletons
# ──────────────────────────────────────────────────────────────────────────────

_controlnet:     Optional[ControlNetModel]                          = None
_cn_gen_pipe:    Optional[StableDiffusionControlNetPipeline]        = None
_cn_i2i_pipe:    Optional[StableDiffusionControlNetImg2ImgPipeline] = None
_mask_generator: Optional[SamAutomaticMaskGenerator]               = None
_predictor:      Optional[SamPredictor]                            = None


def _load_controlnet() -> ControlNetModel:
    global _controlnet
    if _controlnet is not None:
        return _controlnet
    logger.info("⏳  Initialising ControlNet from base architecture …")
    cn = ControlNetModel.from_pretrained(CONTROLNET_BASE_MODEL, torch_dtype=DTYPE)
    if not os.path.exists(CONTROLNET_STATE_DICT):
        raise FileNotFoundError(
            f"controlnet_state_dict.pt not found at: {CONTROLNET_STATE_DICT}\n"
            f"Set the CONTROLNET_STATE_DICT env var to its correct path."
        )
    state_dict = torch.load(CONTROLNET_STATE_DICT, map_location="cpu")
    cn.load_state_dict(state_dict)
    del state_dict
    _controlnet = cn.to(DTYPE).to(DEVICE)
    logger.info("✓  ControlNet ready")
    return _controlnet


def _load_cn_gen_pipe() -> StableDiffusionControlNetPipeline:
    global _cn_gen_pipe
    if _cn_gen_pipe is not None:
        return _cn_gen_pipe
    controlnet = _load_controlnet()
    logger.info("⏳  Building ControlNet generation pipeline …")
    pipe = StableDiffusionControlNetPipeline.from_pretrained(
        SD_BASE_MODEL,
        controlnet=controlnet,
        torch_dtype=DTYPE,
        safety_checker=None,
        requires_safety_checker=False,
    )
    pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config)
    if APPLY_LORA:
        lora_weights = os.path.join(LORA_DIR, "adapter_model.safetensors")
        if os.path.exists(lora_weights):
            logger.info(f"⏳  Loading UNet LoRA from {LORA_DIR} …")
            pipe.unet.load_attn_procs(LORA_DIR)
            logger.info("✓  UNet LoRA loaded")
        else:
            logger.warning(f"  APPLY_LORA=true but no adapter_model.safetensors at {LORA_DIR}")
    pipe.to(DEVICE)
    if DEVICE.type == "cuda":
        pipe.enable_xformers_memory_efficient_attention()
    _cn_gen_pipe = pipe
    logger.info("✓  ControlNet generation pipeline ready")
    return pipe


def _load_cn_i2i_pipe() -> StableDiffusionControlNetImg2ImgPipeline:
    global _cn_i2i_pipe
    if _cn_i2i_pipe is not None:
        return _cn_i2i_pipe
    base = _load_cn_gen_pipe()
    logger.info("⏳  Building ControlNet img2img pipeline …")
    pipe = StableDiffusionControlNetImg2ImgPipeline(
        vae            = base.vae,
        text_encoder   = base.text_encoder,
        tokenizer      = base.tokenizer,
        unet           = base.unet,
        controlnet     = base.controlnet,
        scheduler      = base.scheduler,
        safety_checker           = None,
        feature_extractor        = None,
        requires_safety_checker  = False,
    )
    pipe.to(DEVICE)
    if DEVICE.type == "cuda":
        pipe.enable_xformers_memory_efficient_attention()
    _cn_i2i_pipe = pipe
    logger.info("✓  ControlNet img2img pipeline ready")
    return pipe


def _load_sam() -> tuple[SamAutomaticMaskGenerator, SamPredictor]:
    global _mask_generator, _predictor
    if _mask_generator is not None:
        return _mask_generator, _predictor
    if not os.path.exists(SAM_CHECKPOINT):
        raise FileNotFoundError(
            f"SAM checkpoint not found at: {SAM_CHECKPOINT}\n"
            f"Download sam_vit_b_01ec64.pth from "
            f"https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth\n"
            f"or set the SAM_CHECKPOINT env var."
        )
    sam = sam_model_registry[SAM_MODEL_TYPE](checkpoint=SAM_CHECKPOINT)
    sam.to(DEVICE)
    sam.eval()
    _mask_generator = SamAutomaticMaskGenerator(
        sam,
        points_per_side        = SAM_POINTS_PER_SIDE,
        pred_iou_thresh        = SAM_IOU_THRESH,
        stability_score_thresh = SAM_STABILITY_THRESH,
        min_mask_region_area   = SAM_MIN_MASK_AREA,
    )
    _predictor = SamPredictor(sam)
    logger.info("✓  SAM ready")
    return _mask_generator, _predictor


# ──────────────────────────────────────────────────────────────────────────────
# Preprocessing
# ──────────────────────────────────────────────────────────────────────────────

def _preprocess_sketch(sketch: Image.Image) -> tuple[Image.Image, np.ndarray]:
    sketch_pil  = sketch.convert("RGB").resize((IMAGE_SIZE, IMAGE_SIZE), Image.LANCZOS)
    sketch_gray = np.array(sketch_pil.convert("L"), dtype=np.float32) / 255.0
    return sketch_pil, sketch_gray


# ──────────────────────────────────────────────────────────────────────────────
# Sketch-derived region splitting — FROM v5-alt
# Splits the garment mask along internal structural sketch lines
# (waist seam, yoke, panel dividers). This is what enables bodice/skirt
# two-colour assignment from v5-alt to work correctly.
# ──────────────────────────────────────────────────────────────────────────────

def _extract_sketch_regions(
    sketch_gray: np.ndarray,
    outer_mask: np.ndarray,
) -> list[np.ndarray]:
    H, W = sketch_gray.shape

    lines    = sketch_gray < SKETCH_LINE_DARKNESS
    barriers = binary_dilation(lines, iterations=SKETCH_MIN_LINE_WIDTH)
    interior = outer_mask & ~barriers

    labeled, n_components = nd_label(interior)

    if n_components == 0:
        logger.info("  [regions] No interior after barrier removal — using outer mask")
        return [outer_mask]

    min_area = int(0.01 * H * W)
    regions  = []
    for i in range(1, n_components + 1):
        comp = labeled == i
        if comp.sum() >= min_area:
            regions.append(comp.astype(bool))

    if not regions:
        logger.info("  [regions] All components too small — using outer mask")
        return [outer_mask]

    def _centroid_row(mask):
        ys = np.where(mask)[0]
        return float(ys.mean()) if len(ys) else 0.0

    regions = sorted(regions, key=_centroid_row)
    logger.info("  [regions] %d sketch-derived region(s) found", len(regions))
    return regions


# ──────────────────────────────────────────────────────────────────────────────
# SAM outer mask — FROM v5-alt (5-point cross + hull fallback)
# Better garment coverage than single-center point from v1,
# especially for asymmetric or wide garments like dresses.
# ──────────────────────────────────────────────────────────────────────────────

def _get_outer_mask(
    image_np: np.ndarray,
    sketch_gray: np.ndarray,
    predictor: SamPredictor,
) -> np.ndarray:
    H, W   = image_np.shape[:2]
    cx, cy = W // 2, H // 2
    spread = min(W, H) // 6

    predictor.set_image(image_np)

    fg_points = np.array([
        [cx,          cy         ],
        [cx,          cy - spread],
        [cx,          cy + spread],
        [cx - spread, cy         ],
        [cx + spread, cy         ],
    ])

    masks, scores, _ = predictor.predict(
        point_coords=fg_points,
        point_labels=np.ones(len(fg_points), dtype=int),
        multimask_output=True,
    )

    outer = masks[np.argmax(scores)].astype(bool)
    outer = binary_fill_holes(binary_closing(outer, iterations=3))

    if outer.sum() < 0.05 * H * W:
        logger.warning("  [SAM] Mask too small — falling back to sketch hull")
        outer = _sketch_hull_mask(sketch_gray)

    logger.info(
        "  [SAM] Outer mask: %d px (%.1f%% of image)",
        outer.sum(), 100 * outer.sum() / outer.size,
    )
    return outer


def _sketch_hull_mask(sketch_gray: np.ndarray) -> np.ndarray:
    """Fallback mask: dilate sketch lines → fill holes → erode slightly."""
    lines   = sketch_gray < SKETCH_LINE_DARKNESS
    dilated = binary_dilation(lines, iterations=4)
    filled  = binary_fill_holes(dilated)
    return binary_erosion(filled, iterations=1)


def _filter_masks_to_outer(
    all_masks: list[dict],
    outer_mask: np.ndarray,
) -> list[dict]:
    filtered = []
    for m in all_masks:
        seg  = m["segmentation"].astype(bool)
        area = seg.sum()
        if area == 0:
            continue
        if (seg & outer_mask).sum() / area >= SAM_OVERLAP_THRESH:
            m = dict(m)
            m["segmentation"] = seg & outer_mask
            m["area"] = int(m["segmentation"].sum())
            if m["area"] >= SAM_MIN_MASK_AREA:
                filtered.append(m)
    return sorted(filtered, key=lambda x: x["area"])


# ──────────────────────────────────────────────────────────────────────────────
# Color hint parsing — FROM v5-alt (HSV-based, no cv2 dependency)
# More robust than original cv2.COLOR_RGB2HSV approach for JPEG-compressed
# hint images. Catches both saturated colours AND dark strokes.
# ──────────────────────────────────────────────────────────────────────────────

def _parse_color_hints(
    color_hints_img: Image.Image,
) -> tuple[np.ndarray, np.ndarray]:
    img    = color_hints_img.resize((IMAGE_SIZE, IMAGE_SIZE), Image.LANCZOS).convert("RGB")
    img_np = np.array(img, dtype=np.float32) / 255.0

    # Pure-Python HSV: V = max(R,G,B), S = (V - min) / V
    V       = np.max(img_np, axis=-1)
    S_denom = np.where(V > 0, V, 1.0)
    S       = (V - np.min(img_np, axis=-1)) / S_denom

    # A pixel is a "hint" if it is sufficiently saturated OR dark enough
    painted = (S > HINT_MIN_SATURATION) | (V < HINT_MAX_LIGHTNESS)

    color_map             = np.zeros((IMAGE_SIZE, IMAGE_SIZE, 3), dtype=np.float32)
    color_map[painted]    = img_np[painted]
    hint_mask             = np.zeros((IMAGE_SIZE, IMAGE_SIZE, 1), dtype=np.float32)
    hint_mask[painted, 0] = 1.0

    logger.info(
        "  [hints] %d hint pixels (%.1f%% of canvas)",
        painted.sum(), 100 * painted.sum() / painted.size,
    )
    return color_map, hint_mask


# ──────────────────────────────────────────────────────────────────────────────
# Color assignment — FROM v5-alt (LAB-median, two-pass)
# Pass 1: sketch-derived regions (bodice, skirt, etc.) — coarse colour zones
# Pass 2: SAM sub-masks for fine structure within zones
# Both use LAB-space median for perceptually accurate colour averaging.
# ──────────────────────────────────────────────────────────────────────────────

def _assign_colors(
    sketch_regions: list[np.ndarray],
    sam_masks: list[dict],
    color_map: np.ndarray,
    hint_mask: np.ndarray,
    image_np: np.ndarray,
    outer_mask: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    img_float   = image_np.astype(float) / 255.0
    colored_np  = img_float.copy()
    filled_mask = np.zeros((IMAGE_SIZE, IMAGE_SIZE), dtype=bool)

    hint_active = hint_mask[:, :, 0] > 0.05
    has_hints   = hint_active.any()

    if not has_hints:
        logger.info("  [color] No hint pixels found — keeping ControlNet colors")
        return colored_np, filled_mask[..., None].astype(np.float32)

    # ── Pass 1: sketch-derived regions ───────────────────────────────────────
    for region in sketch_regions:
        region_hints = region & hint_active
        if not region_hints.any():
            continue
        hints_rgb    = color_map[region_hints]
        hints_lab    = rgb2lab(hints_rgb.reshape(1, -1, 3)).reshape(-1, 3)
        median_lab   = np.median(hints_lab, axis=0)
        region_color = lab2rgb(median_lab.reshape(1, 1, 3)).reshape(3,)
        colored_np[region]  = region_color
        filled_mask[region] = True
        logger.info(
            "  [color] Sketch region centroid y=%.0f → RGB (%.2f, %.2f, %.2f)",
            np.where(region)[0].mean() if region.any() else 0,
            region_color[0], region_color[1], region_color[2],
        )

    # ── Pass 2: SAM sub-masks for fine structure ──────────────────────────────
    for m in sam_masks:
        seg = m["segmentation"].astype(bool) & outer_mask
        if seg.sum() == 0:
            continue
        seg_hints = seg & hint_active
        if not seg_hints.any():
            continue
        # Skip if already well-covered by sketch-region pass
        already_filled_frac = filled_mask[seg].sum() / seg.sum()
        if already_filled_frac > 0.80:
            continue
        hints_rgb    = color_map[seg_hints]
        hints_lab    = rgb2lab(hints_rgb.reshape(1, -1, 3)).reshape(-1, 3)
        median_lab   = np.median(hints_lab, axis=0)
        region_color = lab2rgb(median_lab.reshape(1, 1, 3)).reshape(3,)
        colored_np[seg]  = region_color
        filled_mask[seg] = True

    # ── Fallback: no region hit → median hint over full outer mask ───────────
    if not filled_mask.any() and outer_mask.any():
        logger.info("  [color] No region hit — applying median hint to outer mask")
        hints_rgb    = color_map[hint_active]
        hints_lab    = rgb2lab(hints_rgb.reshape(1, -1, 3)).reshape(-1, 3)
        median_lab   = np.median(hints_lab, axis=0)
        median_color = lab2rgb(median_lab.reshape(1, 1, 3)).reshape(3,)
        colored_np[outer_mask]  = median_color
        filled_mask[outer_mask] = True

    return colored_np, filled_mask[..., None].astype(np.float32)


# ──────────────────────────────────────────────────────────────────────────────
# Blending — FROM v1 (unchanged, both codes use identical blend logic)
# ──────────────────────────────────────────────────────────────────────────────

def _rgb_strong_blend(
    structured_np: np.ndarray,
    colored_np: np.ndarray,
    region_mask: np.ndarray,
    alpha: float = 0.85,
) -> np.ndarray:
    mask    = gaussian_filter(region_mask[:, :, 0].astype(np.float32), sigma=1.5)
    mask    = np.clip(mask, 0, 1)[:, :, None]
    blended = (1.0 - alpha) * structured_np + alpha * colored_np
    out     = (1.0 - mask) * structured_np + mask * blended
    return np.clip(out, 0, 1)


def _lab_blend(
    structured_np: np.ndarray,
    colored_np: np.ndarray,
    region_mask: np.ndarray,
    blend_sigma: float = 2.0,
) -> np.ndarray:
    struct_lab = rgb2lab(structured_np.clip(0, 1))
    color_lab  = rgb2lab(colored_np.clip(0, 1))
    weight     = region_mask[:, :, 0].astype(float)
    if blend_sigma > 0:
        weight = gaussian_filter(weight, sigma=blend_sigma)
    weight = np.clip(weight, 0, 1)
    blended_lab          = struct_lab.copy()
    blended_lab[:, :, 1] = weight * color_lab[:, :, 1] + (1 - weight) * struct_lab[:, :, 1]
    blended_lab[:, :, 2] = weight * color_lab[:, :, 2] + (1 - weight) * struct_lab[:, :, 2]
    return np.clip(lab2rgb(blended_lab).astype(np.float32), 0, 1)


# ──────────────────────────────────────────────────────────────────────────────
# Background cleanup — FROM v5-alt (Step 4, not present in v1)
# Uses the sketch hull to zero-out any non-garment pixels the img2img pass
# may have coloured. Safe: uses binary_erosion 2px to avoid boundary artifacts.
# ──────────────────────────────────────────────────────────────────────────────

def _enforce_white_background(
    image: Image.Image,
    sketch_gray: np.ndarray,
) -> Image.Image:
    img_np       = np.array(image.convert("RGB"))
    garment_mask = _sketch_hull_mask(sketch_gray)

    if garment_mask.sum() < 0.03 * garment_mask.size:
        logger.warning("  [bg] Sketch mask too small — skipping bg enforcement")
        return image

    result = img_np.copy()
    result[~garment_mask] = 255
    return Image.fromarray(result.astype(np.uint8))


# ──────────────────────────────────────────────────────────────────────────────
# Full colour pipeline — Step 2
# ──────────────────────────────────────────────────────────────────────────────

def _apply_color_pipeline(
    controlnet_output: Image.Image,
    color_hints: Image.Image,
    sketch_gray: np.ndarray,
) -> Image.Image:
    mask_gen, predictor = _load_sam()

    cn_np    = np.array(controlnet_output.convert("RGB"))
    cn_float = cn_np.astype(np.float32) / 255.0

    color_map, hint_mask = _parse_color_hints(color_hints)

    logger.info("  [SAM] Computing outer mask …")
    outer_mask = _get_outer_mask(cn_np, sketch_gray, predictor)

    logger.info("  [regions] Splitting garment via sketch lines …")
    sketch_regions = _extract_sketch_regions(sketch_gray, outer_mask)

    logger.info("  [SAM] Computing internal masks …")
    all_masks      = mask_gen.generate(cn_np)
    internal_masks = _filter_masks_to_outer(all_masks, outer_mask)
    logger.info("  [SAM] %d SAM internal region(s)", len(internal_masks))

    logger.info("  Assigning colors …")
    colored_np, filled_mask = _assign_colors(
        sketch_regions, internal_masks, color_map, hint_mask, cn_np, outer_mask
    )

    logger.info("  RGB strong blend (α=0.85) …")
    rgb_blended = _rgb_strong_blend(cn_float, colored_np, filled_mask, alpha=0.85)

    logger.info("  LAB blend (σ=2.0) …")
    blended = _lab_blend(rgb_blended, colored_np, filled_mask, blend_sigma=2.0)

    # binary_erosion 2px before bg enforcement — eliminates boundary artifacts
    safe_outer           = binary_erosion(outer_mask, iterations=2)
    blended[~safe_outer] = 1.0

    return Image.fromarray((blended * 255).clip(0, 255).astype(np.uint8))


# ──────────────────────────────────────────────────────────────────────────────
# Step 1 — ControlNet generation
# ──────────────────────────────────────────────────────────────────────────────

@torch.no_grad()
def _run_controlnet(
    sketch_pil: Image.Image,
    seed: Optional[int],
    category: str = DEFAULT_CATEGORY,
) -> Image.Image:
    pipe      = _load_cn_gen_pipe()
    generator = torch.Generator(device=DEVICE).manual_seed(seed) if seed is not None else None

    result = pipe(
        prompt                        = _build_generation_prompt(category),
        negative_prompt               = GENERATION_NEGATIVE_PROMPT,
        image                         = sketch_pil,
        num_inference_steps           = NUM_INFERENCE_STEPS,
        guidance_scale                = GUIDANCE_SCALE,
        controlnet_conditioning_scale = CONTROLNET_SCALE,
        generator                     = generator,
        height                        = IMAGE_SIZE,
        width                         = IMAGE_SIZE,
    )
    return result.images[0]


# ──────────────────────────────────────────────────────────────────────────────
# Step 3 — ControlNet img2img
# ──────────────────────────────────────────────────────────────────────────────

@torch.no_grad()
def _run_controlnet_img2img(
    blended_pil: Image.Image,
    sketch_pil: Image.Image,
    seed: Optional[int],
    strength: float,
    category: str = DEFAULT_CATEGORY,
) -> Image.Image:
    pipe      = _load_cn_i2i_pipe()
    generator = torch.Generator(device=DEVICE).manual_seed(seed) if seed is not None else None

    result = pipe(
        prompt                        = _build_img2img_prompt(category),
        negative_prompt               = IMG2IMG_NEGATIVE_PROMPT,
        image                         = blended_pil,
        control_image                 = sketch_pil.convert("RGB"),
        strength                      = strength,
        guidance_scale                = GUIDANCE_SCALE,
        controlnet_conditioning_scale = CONTROLNET_SCALE,
        num_inference_steps           = NUM_INFERENCE_STEPS,
        generator                     = generator,
    )
    return result.images[0]


# ──────────────────────────────────────────────────────────────────────────────
# Public API — called by app.py
# ──────────────────────────────────────────────────────────────────────────────

def generate_image_controlnet(
    sketch:           Image.Image,
    color_hints:      Image.Image,
    seed:             Optional[int] = None,
    img2img_strength: float         = IMG2IMG_STRENGTH,
    category:         str           = DEFAULT_CATEGORY,
) -> Image.Image:
    """
    Full pipeline: sketch + colour hints → final realistic coloured garment.

    Parameters
    ----------
    sketch           PIL Image — outline drawing from tldraw (outline mode).
                     Black strokes on white background.
    color_hints      PIL Image — colour strokes from tldraw (colour mode).
                     Spatially aligned with sketch. PNG strongly preferred.
    seed             Optional int for reproducibility.
    img2img_strength float [0,1]. Default 0.50.
    category         Garment category string (e.g. "dress", "shirt", "jeans").

    Returns
    -------
    PIL Image — 512×512 final image with white background.

    Key env vars:
      CONTROLNET_CONDITIONING_SCALE  default 0.65  (primary realism driver — do not lower)
      IMG2IMG_STRENGTH               default 0.50
      GUIDANCE_SCALE                 default 7.5
      NUM_INFERENCE_STEPS            default 25
    """
    sketch_pil, sketch_gray = _preprocess_sketch(sketch)

    logger.info("── Step 1: ControlNet generation ──────────────────────────")
    cn_output = _run_controlnet(sketch_pil, seed, category=category)
    logger.info("  ControlNet output: %s", cn_output.size)

    logger.info("── Step 2: SAM + sketch regions + colour + blend ─────────")
    blended_pil = _apply_color_pipeline(cn_output, color_hints, sketch_gray)
    logger.info("  Blended: %s", blended_pil.size)

    logger.info("── Step 3: ControlNet img2img ───────────────────────────")
    final = _run_controlnet_img2img(
        blended_pil, sketch_pil, seed, img2img_strength, category=category
    )

    logger.info("── Step 4: Background cleanup ───────────────────────────")
    final = _enforce_white_background(final, sketch_gray)
    logger.info("  Final: %s", final.size)

    return final