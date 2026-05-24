import psycopg2
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('PG_HOST', 'localhost'),
    'database': os.getenv('PG_DB'),
    'user': os.getenv('PG_USER'),
    'password': os.getenv('PG_PASS'),
    'port': os.getenv('PG_PORT', '5432')
}

def export_shopify_products_to_csv():
    """
    Export Shopify products (without embeddings) to CSV for Kaggle
    """
    print("Connecting to database...")
    conn = psycopg2.connect(**DB_CONFIG)
    
    # Query: Get Shopify products that don't have embeddings yet
    query = """
    SELECT 
        p.product_id,
        p.image_path
    FROM products p
    LEFT JOIN product_embeddings pe ON p.product_id = pe.product_id
    WHERE p.product_id >= 1000000000000  -- Shopify IDs
      AND pe.product_id IS NULL           -- No embedding yet
      AND p.image_path IS NOT NULL
    ORDER BY p.product_id;
    """
    
    print("Fetching Shopify products without embeddings...")
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    if len(df) == 0:
        print("No products to process!")
        return
    
    print(f"Found {len(df)} products without embeddings")
    
    # Extract just the filename from full path
    # e.g., "C:\...\shopify\7676189900884.jpg" -> "7676189900884.jpg"
    df['image_filename'] = df['image_path'].apply(lambda x: os.path.basename(x))
    
    # Keep only needed columns
    df_export = df[['product_id', 'image_filename']]
    
    # Save to CSV
    output_csv = "shopify_products_kaggle.csv"
    df_export.to_csv(output_csv, index=False)
    
    print(f"\n{'='*60}")
    print(f"✓ Exported {len(df_export)} products to {output_csv}")
    print(f"{'='*60}")
    print(f"\nNext steps:")
    print(f"1. Upload {output_csv} to Kaggle as dataset")
    print(f"2. Upload shopify images folder to Kaggle")
    print(f"3. Run the Kaggle notebook (see STEP 2 below)")
    print(f"4. Download embeddings.npy and product_ids.npy")
    print(f"5. Run STEP 3 to import embeddings to database")
    
    return output_csv

if __name__ == "__main__":
    export_shopify_products_to_csv()
