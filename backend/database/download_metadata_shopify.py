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
IMAGE_DIR = os.path.join(
    os.getenv('IMAGES_DIR', r"C:\Users\Khalid-Mehmood\Documents\realize_me_fyp\backend\database\product_images"),
    'shopify'
)

# ========================================
# CATEGORY FILTERS - CUSTOMIZE HERE!
# ========================================
ALLOWED_CATEGORIES = {
    # Tops
    'shirt', 'shirts', 't-shirt', 't-shirts', 'tee', 'tees',
    'blouse', 'blouses', 'top', 'tops', 'tank', 'tanks',
    'polo', 'polos', 'henley', 'henleys',
    'sweater', 'sweaters', 'sweatshirt', 'sweatshirts',
    'hoodie', 'hoodies', 'cardigan', 'cardigans',
    
    # Bottoms
    'pants', 'pant', 'trouser', 'trousers',
    'jeans', 'denim', 'chinos', 'khakis',
    'shorts', 'short',
    'skirt', 'skirts',
    'leggings', 'legging',
    
    # Dresses & One-pieces
    'dress', 'dresses',
    'jumpsuit', 'jumpsuits',
    'romper', 'rompers',
    'overall', 'overalls',
    
    # Outerwear
    'jacket', 'jackets',
    'coat', 'coats',
    'blazer', 'blazers',
    'vest', 'vests',
    
    # Activewear (optional - remove if not wanted)
    'activewear', 'sportswear',
    'jogger', 'joggers',
    'tracksuit', 'tracksuits',
}

EXCLUDED_CATEGORIES = {
    # Exclude these
    'swimwear', 'swim', 'bikini', 'bikinis', 'swimsuit', 'swimsuits',
    'lingerie', 'underwear', 'bra', 'bras', 'panties',
    'sleepwear', 'pajamas', 'pyjamas', 'nightwear',
    'accessories', 'accessory', 'bag', 'bags', 'jewelry',
    'shoes', 'shoe', 'sneaker', 'sneakers', 'boot', 'boots',
    'hat', 'hats', 'cap', 'caps', 'scarf', 'scarves',
    'belt', 'belts', 'socks', 'sock',
    'watch', 'watches', 'sunglasses',
}

# Shopify Fashion Stores
SHOPIFY_STORES = [
    {'name': 'Princess Polly', 'url': 'https://us.princesspolly.com'},
    {'name': 'Everlane', 'url': 'https://www.everlane.com'},
    {'name': 'Sabo Skirt', 'url': 'https://saboskirt.com'},
    {'name': 'Beginning Boutique', 'url': 'https://www.beginningboutique.com'},
    {'name': 'Tiger Mist', 'url': 'https://us.tigermist.com'},
    {'name': 'Peppermayo', 'url': 'https://us.peppermayo.com'},
    {'name': 'REPRESENT', 'url': 'https://representclo.com'}
]

MAX_PRODUCTS_PER_STORE = 2000

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

def is_category_allowed(product):
    """Check if product category is allowed"""
    # Get product type/category
    product_type = product.get('product_type', '') or product.get('type', '')
    product_title = product.get('title', '')
    tags = product.get('tags', [])
    
    # Combine all text to check
    text_to_check = ' '.join([
        product_type.lower(),
        product_title.lower(),
        ' '.join(tags).lower() if isinstance(tags, list) else str(tags).lower()
    ])
    
    # First check if it's explicitly excluded
    for excluded in EXCLUDED_CATEGORIES:
        if excluded in text_to_check:
            return False
    
    # Then check if it matches allowed categories
    for allowed in ALLOWED_CATEGORIES:
        if allowed in text_to_check:
            return True
    
    # If no match found, exclude it (conservative approach)
    return False

def fetch_shopify_products(store_url, page=1, limit=250):
    """Fetch products from Shopify store"""
    url = f"{store_url}/products.json"
    
    params = {
        'limit': limit,
        'page': page
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        products = data.get('products', [])
        
        print(f"  ✓ Fetched {len(products)} products from page {page}")
        return products
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            print(f"  ⚠ Rate limit! Waiting 60s...")
            time.sleep(60)
            return fetch_shopify_products(store_url, page, limit)
        else:
            print(f"  ✗ HTTP Error: {e}")
            return []
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return []

def download_image(image_url, product_id):
    """Download product image"""
    try:
        if not image_url.startswith('http'):
            image_url = f"https:{image_url}"
        
        if '?' in image_url:
            image_url = image_url.split('?')[0]
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*'
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

def process_single_product(product, store_info):
    """Process one Shopify product"""
    try:
        # CATEGORY FILTER - Check first before processing
        if not is_category_allowed(product):
            return None
        
        product_id = product.get('id')
        if not product_id:
            return None
        
        numeric_product_id = int(product_id)
        
        product_name = product.get('title', '').strip()
        if not product_name:
            return None
        
        # Get first image
        images = product.get('images', [])
        image_url = None
        
        if images and len(images) > 0:
            image_url = images[0].get('src')
        
        if not image_url and 'image' in product:
            img = product.get('image')
            if isinstance(img, dict):
                image_url = img.get('src')
            elif isinstance(img, str):
                image_url = img
        
        if not image_url:
            return None
        
        # Download image
        image_path = download_image(image_url, numeric_product_id)
        if not image_path:
            return None
        
        # Get category
        product_type = product.get('product_type', '') or product.get('type', '')
        category = product_type if product_type else 'Clothing'
        
        # Brand
        store_name = store_info['name']
        brand = product.get('vendor', store_name)
        
        # Price
        price_value = 0.0
        variants = product.get('variants', [])
        if variants and len(variants) > 0:
            first_variant = variants[0]
            price = first_variant.get('price', '0')
            try:
                price_value = float(price)
            except:
                price_value = 0.0
        
        # Product URL
        handle = product.get('handle', '')
        store_url = store_info['url']
        product_url = f"{store_url}/products/{handle}" if handle else ""
        
        # Description
        tags = product.get('tags', [])
        if isinstance(tags, list):
            description = ', '.join(tags[:5])
        else:
            description = str(tags)
        
        return (
            numeric_product_id,
            product_name,
            category,
            brand,
            price_value,
            image_path,
            product_url,
            description
        )
    except Exception as e:
        return None

def process_products_parallel(products, store_info):
    """Process products with parallel downloads and category filtering"""
    processed_data = []
    filtered_count = 0
    
    print(f"  Processing {len(products)} products (with category filter)...")
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_single_product, product, store_info): product 
                   for product in products}
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            result = future.result()
            if result:
                processed_data.append(result)
            else:
                filtered_count += 1
            
            if completed % 25 == 0:
                print(f"    {len(processed_data)} saved / {filtered_count} filtered / {completed} checked")
    
    print(f"  ✓ {len(processed_data)} products kept, {filtered_count} filtered out")
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

def fetch_all_from_store(conn, store):
    """Fetch products from a Shopify store with category filtering"""
    print(f"\n{'='*70}")
    print(f"STORE: {store['name']} ({store['url']})")
    print(f"{'='*70}")
    
    page = 1
    total = 0
    total_filtered = 0
    
    while total < MAX_PRODUCTS_PER_STORE:
        print(f"\n[Page {page}] - Progress: {total}/{MAX_PRODUCTS_PER_STORE}")
        
        products = fetch_shopify_products(store['url'], page, limit=250)
        
        if not products:
            print(f"  No more products available")
            break
        
        processed = process_products_parallel(products, store)
        
        if processed:
            insert_products_to_db(conn, processed)
            total += len(processed)
        
        print(f"  Store total so far: {total}")
        
        if total >= MAX_PRODUCTS_PER_STORE:
            print(f"  ✓ Reached limit of {MAX_PRODUCTS_PER_STORE} products")
            break
        
        if len(products) < 250:
            print(f"  ✓ Fetched all available products")
            break
        
        page += 1
        time.sleep(2)
    
    return total

def main():
    """Main function"""
    print("=" * 70)
    print("SHOPIFY MULTI-STORE FASHION SCRAPER (WITH CATEGORY FILTER)")
    print("=" * 70)
    print(f"Stores to scrape: {len(SHOPIFY_STORES)}")
    print(f"Max products per store: {MAX_PRODUCTS_PER_STORE}")
    print(f"\nALLOWED CATEGORIES:")
    print(f"  {', '.join(sorted(list(ALLOWED_CATEGORIES)[:20]))}...")
    print(f"\nEXCLUDED CATEGORIES:")
    print(f"  {', '.join(sorted(list(EXCLUDED_CATEGORIES)[:15]))}...")
    print("=" * 70)
    
    setup_image_directory()
    conn = get_db_connection()
    
    try:
        results = {}
        start = time.time()
        
        for i, store in enumerate(SHOPIFY_STORES, 1):
            print(f"\n{'#'*70}")
            print(f"# STORE {i}/{len(SHOPIFY_STORES)}: {store['name']}")
            print(f"{'#'*70}")
            
            try:
                count = fetch_all_from_store(conn, store)
                results[store['name']] = count
                
                print(f"\n✓ {store['name']} complete: {count} products saved")
                
                if i < len(SHOPIFY_STORES):
                    print(f"\nWaiting 5 seconds before next store...")
                    time.sleep(5)
                    
            except KeyboardInterrupt:
                print(f"\n\n{'='*70}")
                print("⚠ STOPPED BY USER")
                print(f"{'='*70}")
                break
            except Exception as e:
                print(f"Error in {store['name']}: {e}")
                results[store['name']] = 0
        
        elapsed = time.time() - start
        
        print("\n" + "=" * 70)
        print("FINAL RESULTS - SHOPIFY STORES (FILTERED)")
        print("=" * 70)
        for store_name, count in results.items():
            print(f"  {store_name:20} {count:,} products")
        print("-" * 70)
        print(f"TOTAL PRODUCTS: {sum(results.values()):,}")
        print(f"Time taken: {elapsed/60:.1f} minutes")
        print("=" * 70)
        
    finally:
        conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    main()