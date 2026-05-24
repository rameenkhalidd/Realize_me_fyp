import os
import torch
import numpy as np
from PIL import Image
import torchvision.transforms as T

from pix2pix_model import Generator

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "model", "clean_model.pth"
)

_model = None


# ─────────────────────────────────────────────
# Load Model (SAFE + ROBUST)
# ─────────────────────────────────────────────

def load_model():
    global _model
    if _model is not None:
        return _model

    print("⏳ Loading Pix2Pix model...")

    model = Generator().to(DEVICE)
    ckpt = torch.load(MODEL_PATH, map_location=DEVICE)

    # Handle multiple checkpoint formats
    if isinstance(ckpt, dict):
        if "generator" in ckpt:
            state_dict = ckpt["generator"]
        elif "state_dict" in ckpt:
            state_dict = ckpt["state_dict"]
        else:
            state_dict = ckpt
    else:
        state_dict = ckpt

    # Remove "module." prefix (if trained with DataParallel)
    clean_dict = {}
    for k, v in state_dict.items():
        clean_dict[k.replace("module.", "")] = v

    model.load_state_dict(clean_dict, strict=True)
    model.eval()

    _model = model
    print("✓ Model loaded successfully")

    return model


# ─────────────────────────────────────────────
# Preprocessing (MATCH TRAINING)
# ─────────────────────────────────────────────

transform = T.Compose([
    T.Resize((256, 256)),
    T.ToTensor(),
    T.Normalize([0.5]*3, [0.5]*3)
])


# ─────────────────────────────────────────────
# Inference
# ─────────────────────────────────────────────

def generate_image_pix2pix(input_image: Image.Image) -> Image.Image:
    model = load_model()

    # IMPORTANT: match training input (sketch only)
    input_image = input_image.convert("L").convert("RGB")

    tensor = transform(input_image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        output = model(tensor)

    # Convert tensor → image
    output = output[0].cpu().numpy()
    output = np.transpose(output, (1, 2, 0))
    output = ((output + 1) / 2 * 255).clip(0, 255).astype(np.uint8)

    return Image.fromarray(output)