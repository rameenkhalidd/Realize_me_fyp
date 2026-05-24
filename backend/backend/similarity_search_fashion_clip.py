# similarity_search.py 

import psycopg2
import torch
from PIL import Image
import numpy as np
import os
import gc
from transformers import CLIPProcessor, CLIPModel

# --------------------------
# Lazy load FashionCLIP model
# --------------------------
_model = None
_processor = None

def load_clip_model():
    """Load FashionCLIP model only when needed"""
    global _model, _processor
    
    if _model is not None and _processor is not None:
        return _model, _processor
    
    print("⏳ Loading FashionCLIP model...")
    gc.collect()
    torch.cuda.empty_cache()
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    _model = CLIPModel.from_pretrained("patrickjohncyh/fashion-clip").to(device)
    _processor = CLIPProcessor.from_pretrained("patrickjohncyh/fashion-clip")
    
    _model.eval()
    
    print("✓ FashionCLIP model loaded!")
    
    return _model, _processor


# --------------------------
# Generate embedding (accepts PIL Image)
# --------------------------
def get_image_embedding(image):
    """
    Generate embedding from PIL Image
    
    Args:
        image: PIL Image object (or file path string)
    
    Returns:
        Embedding vector
    """
    # Handle both PIL Image and file path
    if isinstance(image, str):
        if not os.path.exists(image):
            raise FileNotFoundError(f"Image not found: {image}")
        image = Image.open(image).convert("RGB")
    
    model, processor = load_clip_model()
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    inputs = processor(images=image, return_tensors="pt").to(device)
    
    with torch.no_grad():
        outputs = model.get_image_features(**inputs)
        
        # Safe extraction (important fix)
        if hasattr(outputs, "image_embeds"):
            emb = outputs.image_embeds
        elif hasattr(outputs, "pooler_output"):
            emb = outputs.pooler_output
        else:
            emb = outputs
        
        emb = emb / emb.norm(dim=-1, keepdim=True)
    
    embedding = emb.cpu().numpy()[0]
    
    return embedding


# --------------------------
# PostgreSQL connection
# --------------------------
def connect_db():
    try:
        conn = psycopg2.connect(
            host=os.environ.get("PGHOST", "localhost"),
            port=int(os.environ.get("PGPORT", "5432")),
            dbname=os.environ.get("PGDATABASE", "fyp_clothing_db"),
            user=os.environ.get("PGUSER", "postgres"),
            password=os.environ.get("PGPASSWORD", "my126403"),
        )
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection error: {e}")
        return None


# --------------------------
# Similarity Search
# --------------------------
def search_similar_products(embedding, top_k=5):
    
    conn = connect_db()
    if conn is None:
        return []

    cur = None
    try:
        cur = conn.cursor()
        embedding_list = embedding.tolist()
        
        cur.execute("SET ivfflat.probes = 20;")
        
        cur.execute("""
            SELECT
                p.product_id,
                p.product_name,
                p.brand,
                p.category,
                p.description,
                p.price,
                p.product_url,
                COALESCE(NULLIF(TRIM(p.cloudinary_url), ''), p.image_path) AS product_image_url,
                1 - (e.embedding <=> %s::vector) AS similarity
            FROM product_embeddings_fashion_clip e
            JOIN products p ON e.product_id = p.product_id
            ORDER BY e.embedding <=> %s::vector
            LIMIT %s;
        """, (embedding_list, embedding_list, top_k))
        
        results = cur.fetchall()
        
    except psycopg2.Error as e:
        print(f"❌ Database query error: {e}")
        results = []
    
    finally:
        if cur is not None:
            try:
                cur.close()
            except psycopg2.Error:
                pass
        try:
            conn.close()
        except psycopg2.Error:
            pass
    
    return results


# --------------------------
# Main API function
# --------------------------
def find_similar_products(image, top_k: int | None = None):
    if top_k is None:
        top_k = int(os.environ.get("SIMILAR_TOP_K", "5"))
    top_k = max(1, min(int(top_k), 50))

    embedding = get_image_embedding(image)
    results = search_similar_products(embedding, top_k=top_k)

    products = []
    for r in results:
        pid, name, brand, category, desc, price, url, image_url, sim = r
        products.append({
            "product_id": str(pid),
            "name": name,
            "brand": brand or "",
            "category": category,
            "description": desc,
            "price": float(price) if price is not None else 0.0,
            "similarity": float(sim),
            "image_url": (image_url or "").strip(),
            "product_url": (url or "").strip(),
        })

    return products


# --------------------------
# Testing
# --------------------------
if __name__ == "__main__":
    IMAGE_PATH = "test4.jpg"
    
    if not os.path.exists(IMAGE_PATH):
        print("ERROR: Image not found")
        exit()
    
    print("\nGenerating embedding...")
    embedding = get_image_embedding(IMAGE_PATH)
    print("Embedding shape:", embedding.shape)
    
    print("\nSearching similar products...")
    results = search_similar_products(embedding, top_k=5)
    
    print("\n" + "="*70)
    print("TOP SIMILAR PRODUCTS".center(70))
    print("="*70)
    
    if not results:
        print("No results found")
    
    for i, result in enumerate(results, 1):
        pid, name, brand, category, desc, price, url, image_url, sim = result
        print("\n" + "-"*70)
        print(f"Match #{i}")
        print("-"*70)
        print("Product ID:", pid)
        print("Name:", name)
        print("Brand:", brand)
        print("Category:", category)
        print("Price:", price)
        print("Similarity:", f"{sim*100:.2f}%")
        print("Image:", image_url)
        print("Buy Link:", url)
    
    print("\n" + "="*70)