import os
import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from pathlib import Path
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('PG_HOST', 'localhost'),
    'database': os.getenv('PG_DB'),
    'user': os.getenv('PG_USER'),
    'password': os.getenv('PG_PASS'),
    'port': os.getenv('PG_PORT', '5432')
}

# Image directory
IMAGE_DIR = os.getenv('IMAGES_DIR', r"C:\Users\Khalid-Mehmood\Documents\realize_me_fyp\backend\database\product_images")

# RapidAPI Configuration
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
RAPIDAPI_HOST = "asos2.p.rapidapi.com"

# ASOS Category IDs to fetch - STARTING FROM CATEGORY 4
CATEGORY_IDS = [15200, 4616, 4208, 3602, 7616]  # Categories 4, 5, 6, 7, 8

# Maximum products per category
MAX_PRODUCTS_PER_CATEGORY = 1000

def setup_image_directory():
    """Create image directory if it doesn't exist"""
    Path(IMAGE_DIR).mkdir(parents=True, exist_ok=True)
    print(f"Image directory ready: {IMAGE_DIR}")

def get_db_connection():
    """Establish database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("Database connection established")
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise

def fetch_asos_products_rapidapi(category_id, limit=48, offset=0):
    """Fetch products from ASOS via RapidAPI"""
    url = "https://asos2.p.rapidapi.com/products/v2/list"
    
    querystring = {
        "store": "US",
        "offset": str(offset),
        "categoryId": str(category_id),
        "limit": str(limit),
        "country": "US",
        "sort": "freshness",
        "currency": "USD",
        "sizeSchema": "US",
        "lang": "en-US"
    }
    
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
    }
    
    try:
        response = requests.get(url, headers=headers, params=querystring, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        products = data.get('products', [])
        total_items = data.get('itemCount', 0)
        
        print(f"  ✓ Fetched {len(products)} products (Total available: {total_items})")
        return products, total_items
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            print(f"  ⚠ Rate limit! Waiting 60s...")
            time.sleep(60)
            return fetch_asos_products_rapidapi(category_id, limit, offset)
        else:
            print(f"  ✗ HTTP Error: {e}")
            return [], 0
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return [], 0

def download_image(image_url, product_id):
    """Download product image"""
    try:
        # Add https:// if missing
        if not image_url.startswith('http'):
            image_url = f"https://{image_url}"
        
        # Add ASOS image parameters
        if '?' not in image_url:
            image_url = f"{image_url}?$n_640w$&wid=513&fit=constrain"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*',
            'Referer': 'https://www.asos.com/'
        }
        
        response = requests.get(image_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        filename = f"{product_id}.jpg"
        filepath = os.path.join(IMAGE_DIR, filename)
        
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        return filepath
    except Exception as e:
        return None

def process_single_product(product, category_id):
    """Process one product including image download"""
    try:
        product_id = product.get('id')
        if not product_id:
            return None
        
        product_name = product.get('name', '').strip()
        if not product_name:
            return None
        
        # Get image URL from API
        image_url = product.get('imageUrl', '')
        if not image_url:
            additional = product.get('additionalImageUrls', [])
            if additional:
                image_url = additional[0]
        
        if not image_url:
            return None
        
        # Download image - MUST succeed
        image_path = download_image(image_url, product_id)
        if not image_path:
            return None
        
        # Extract metadata
        product_type = product.get('productType', '')
        category_name = product_type if product_type else f'Category_{category_id}'
        brand = product.get('brandName', '').strip()
        
        # Get price
        price_data = product.get('price', {})
        current_price = 0.0
        if isinstance(price_data, dict):
            current = price_data.get('current', {})
            if isinstance(current, dict):
                current_price = current.get('value', 0)
        
        # Product URL
        url_path = product.get('url', '')
        if url_path:
            product_url = f"https://www.asos.com/us/{url_path}"
        else:
            product_url = f"https://www.asos.com/us/prd/{product_id}"
        
        colour = product.get('colour', '').strip()
        
        return (
            product_id,
            product_name,
            category_name,
            brand,
            float(current_price) if current_price else 0.0,
            image_path,
            product_url,
            colour
        )
    except Exception as e:
        return None

def process_products_parallel(products, category_id):
    """Process products with parallel image downloads"""
    processed_data = []
    
    print(f"  Processing {len(products)} products...")
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_single_product, product, category_id): product 
                   for product in products}
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            result = future.result()
            if result:
                processed_data.append(result)
            
            if completed % 10 == 0:
                print(f"    {len(processed_data)} saved / {completed} checked")
    
    print(f"  ✓ {len(processed_data)} products with images")
    return processed_data

def insert_products_to_db(conn, products_data):
    """Insert products into database"""
    if not products_data:
        return
    
    cursor = conn.cursor()
    
    insert_query = """
        INSERT INTO products (product_id, product_name, category, brand, price, 
                             image_path, product_url, description)
        VALUES %s
        ON CONFLICT (product_id) DO UPDATE SET
            product_name = EXCLUDED.product_name,
            category = EXCLUDED.category,
            brand = EXCLUDED.brand,
            price = EXCLUDED.price,
            image_path = EXCLUDED.image_path,
            product_url = EXCLUDED.product_url,
            description = EXCLUDED.description,
            fetched_at = NOW()
    """
    
    try:
        execute_values(cursor, insert_query, products_data)
        conn.commit()
        print(f"  ✓ Inserted {len(products_data)} into database")
    except Exception as e:
        conn.rollback()
        print(f"  ✗ DB error: {e}")
    finally:
        cursor.close()

def fetch_all_from_category(conn, category_id):
    """Fetch products from a category (max 1000 products)"""
    print(f"\n{'='*70}")
    print(f"CATEGORY: {category_id} (Fetching up to {MAX_PRODUCTS_PER_CATEGORY} products)")
    print(f"{'='*70}")
    
    batch_size = 48
    offset = 0
    total = 0
    
    while total < MAX_PRODUCTS_PER_CATEGORY:
        print(f"\n[Offset {offset}] - Progress: {total}/{MAX_PRODUCTS_PER_CATEGORY}")
        
        products, total_items = fetch_asos_products_rapidapi(
            category_id, batch_size, offset
        )
        
        if not products:
            print(f"  No more products available")
            break
        
        processed = process_products_parallel(products, category_id)
        
        if processed:
            insert_products_to_db(conn, processed)
            total += len(processed)
        
        print(f"  Category total so far: {total}")
        
        # Stop if we've reached the limit
        if total >= MAX_PRODUCTS_PER_CATEGORY:
            print(f"  ✓ Reached limit of {MAX_PRODUCTS_PER_CATEGORY} products for this category")
            break
        
        # Stop if no more products available
        if offset + batch_size >= total_items or len(products) < batch_size:
            print(f"  ✓ Fetched all available products ({total} total)")
            break
        
        offset += batch_size
        time.sleep(2)
    
    return total

def main():
    """Main function"""
    print("=" * 70)
    print("ASOS SCRAPER - CONTINUING FROM CATEGORY 4")
    print("=" * 70)
    print(f"Categories to fetch: {CATEGORY_IDS}")
    print(f"Max products per category: {MAX_PRODUCTS_PER_CATEGORY}")
    print("=" * 70)
    
    if not RAPIDAPI_KEY:
        print("ERROR: No RAPIDAPI_KEY found!")
        return
    
    setup_image_directory()
    conn = get_db_connection()
    
    try:
        results = {}
        start = time.time()
        
        for i, cat_id in enumerate(CATEGORY_IDS, 1):
            print(f"\n{'#'*70}")
            print(f"# CATEGORY {i+3}/{8}: {cat_id}")  # +3 because we're starting from category 4
            print(f"{'#'*70}")
            
            try:
                count = fetch_all_from_category(conn, cat_id)
                results[cat_id] = count
                
                print(f"\n✓ Category {cat_id} complete: {count} products saved")
                
                if i < len(CATEGORY_IDS):
                    print(f"\nWaiting 5 seconds before next category...")
                    time.sleep(5)
                    
            except KeyboardInterrupt:
                print(f"\n\n{'='*70}")
                print("⚠ STOPPED BY USER")
                print(f"{'='*70}")
                print(f"Completed so far: {list(results.keys())}")
                break
            except Exception as e:
                print(f"Error: {e}")
                results[cat_id] = 0
        
        elapsed = time.time() - start
        
        print("\n" + "=" * 70)
        print("FINAL RESULTS")
        print("=" * 70)
        for cid, count in results.items():
            print(f"  Category {cid}: {count} products")
        print("-" * 70)
        print(f"TOTAL NEW PRODUCTS: {sum(results.values())}")
        print(f"Time taken: {elapsed/60:.1f} minutes")
        print("=" * 70)
        
    finally:
        conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    main()