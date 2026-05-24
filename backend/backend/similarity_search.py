# similarity_search.py 

import psycopg2
import torch
from sentence_transformers import SentenceTransformer
from PIL import Image
import numpy as np
import os
import gc

# --------------------------
# Lazy load CLIP model
# --------------------------
_model = None

def load_clip_model():
    """Load CLIP model only when needed"""
    global _model
    
    if _model is not None:
        return _model
    
    print("⏳ Loading CLIP model...")
    gc.collect()
    torch.cuda.empty_cache()
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    _model = SentenceTransformer('clip-ViT-B-32', device=device)
    print("✓ CLIP model loaded!")
    
    return _model


# --------------------------
# Generate embedding (accepts PIL Image)
# --------------------------
def get_image_embedding(image):
    """
    Generate embedding from PIL Image
    
    Args:
        image: PIL Image object (or file path string for backward compatibility)
    
    Returns:
        Embedding vector
    """
    # Handle both PIL Image and file path
    if isinstance(image, str):
        # File path
        if not os.path.exists(image):
            raise FileNotFoundError(f"Image not found: {image}")
        image = Image.open(image).convert("RGB")
    
    # Load model (lazy)
    model = load_clip_model()
    
    # Generate embedding
    embedding = model.encode(image, convert_to_numpy=True)
    
    # Normalize for cosine similarity
    embedding = embedding / np.linalg.norm(embedding)
    
    return embedding



# --------------------------
# PostgreSQL connection with error handling
# --------------------------
def connect_db():
    """Connect to PostgreSQL"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            dbname="fyp_clothing_db",
            user="postgres",
            password="my126403"
        )
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection error: {e}")
        return None


# --------------------------
# Similarity Search with error handling
# --------------------------
def search_similar_products(embedding, top_k=5):
    """Search database for similar products"""
    
    conn = connect_db()
    if conn is None:
        return []  # Return empty list if DB connection failed
    
    try:
        cur = conn.cursor()
        embedding_list = embedding.tolist()
        
        # Enable ivfflat probes
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
                p.cloudinary_url,
                1 - (e.embedding <=> %s::vector) AS similarity
            FROM product_embeddings e
            JOIN products p ON e.product_id = p.product_id
            ORDER BY e.embedding <=> %s::vector
            LIMIT %s;
        """, (embedding_list, embedding_list, top_k))
        
        results = cur.fetchall()
        
    except psycopg2.Error as e:
        print(f"❌ Database query error: {e}")
        results = []
    
    finally:
        try:
            cur.close()
        except:
            pass
        conn.close()
    
    return results


# --------------------------
# Main API function
# --------------------------
def find_similar_products(image):
    """
    Find similar products for an image
    
    Args:
        image: PIL Image object (or file path string)
    
    Returns:
        List of product dictionaries
    """
    embedding = get_image_embedding(image)
    results = search_similar_products(embedding, top_k=5)
    
    products = []
    for r in results:
        pid, name, brand, category, desc, price, url, image_url, sim = r
        products.append({
            "product_id": pid,
            "name": name,
            "brand": brand,
            "category": category,
            "description": desc,
            "price": float(price),
            "similarity": float(sim),
            "image_url": image_url,
            "product_url": url
        })
    
    return products


# --------------------------
# Testing (optional - run directly)
# --------------------------
if __name__ == "__main__":
    IMAGE_NAME = "test4.jpg"
    IMAGE_PATH = os.path.join(
        r"C:\Users\Khalid-Mehmood\Documents\realize_me_fyp\backend\backend",
        IMAGE_NAME
    )
    
    if not os.path.exists(IMAGE_PATH):
        print("ERROR: Image not found")
        exit()
    
    print("\nGenerating embedding...")
    embedding = get_image_embedding(IMAGE_PATH)
    print("Embedding generated:", embedding.shape)
    
    gc.collect()
    
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