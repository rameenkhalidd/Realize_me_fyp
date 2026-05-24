import numpy as np
import psycopg2
from psycopg2.extras import execute_values

def import_shopify_embeddings():
    """
    Import Shopify embeddings to database (same format as ASOS)
    """
    # Paths to downloaded .npy files from Kaggle
    embeddings_path = "shopify_embeddings.npy"
    product_ids_path = "shopify_product_ids.npy"
    
    # Load data
    print("Loading embeddings...")
    embeddings = np.load(embeddings_path)
    product_ids = np.load(product_ids_path)
    
    print(f"✓ Loaded {embeddings.shape[0]} embeddings of dimension {embeddings.shape[1]}")
    print(f"✓ Product IDs: {len(product_ids)}")
    print(f"  ID range: {product_ids.min()} to {product_ids.max()}")
    
    # Connect to PostgreSQL
    print("\nConnecting to database...")
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        dbname="fyp_clothing_db",
        user="postgres",
        password="my126403"
    )
    cur = conn.cursor()
    
    # Print connection info
    cur.execute("SELECT current_database(), version();")
    db_info = cur.fetchone()
    print(f"✓ Connected to: {db_info[0]}")
    
    # CRITICAL: Verify product_id column type
    print("\nVerifying table schema...")
    cur.execute("""
        SELECT 
            column_name, 
            data_type,
            character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'product_embeddings';
    """)
    
    columns = cur.fetchall()
    print("\nTable structure:")
    for col in columns:
        print(f"  {col[0]}: {col[1]}")
    
    # Check if product_id is BIGINT
    cur.execute("""
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'product_embeddings' 
        AND column_name = 'product_id'
    """)
    
    id_type = cur.fetchone()[0]
    
    if id_type != 'bigint':
        print(f"\n❌ ERROR: product_id is {id_type}, but Shopify IDs need BIGINT!")
        print("\nRun this SQL to fix:")
        print("ALTER TABLE product_embeddings ALTER COLUMN product_id TYPE BIGINT;")
        cur.close()
        conn.close()
        return
    
    print("✓ Table schema is correct (product_id is BIGINT)")
    
    # Check existing embeddings
    print("\nChecking existing embeddings...")
    cur.execute("SELECT COUNT(*) FROM product_embeddings WHERE product_id < 1000000000000")
    asos_count = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM product_embeddings WHERE product_id >= 1000000000000")
    shopify_existing = cur.fetchone()[0]
    
    print(f"  ASOS embeddings: {asos_count}")
    print(f"  Shopify embeddings (existing): {shopify_existing}")
    
    # Prepare data for bulk insert
    print(f"\nPreparing {len(product_ids)} records for insertion...")
    records = [
        (int(pid), embedding.tolist()) 
        for pid, embedding in zip(product_ids, embeddings)
    ]
    
    # Insert using execute_values (same as ASOS method)
    print("Inserting embeddings...")
    try:
        execute_values(
            cur,
            """
            INSERT INTO product_embeddings (product_id, embedding)
            VALUES %s
            ON CONFLICT (product_id) DO UPDATE
            SET embedding = EXCLUDED.embedding,
                created_at = NOW()
            """,
            records,
            template=None,
            page_size=1000
        )
        
        conn.commit()
        print("✓ Bulk insert complete")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during insert: {e}")
        cur.close()
        conn.close()
        return
    
    # Verify insertion
    print("\nVerifying insertion...")
    cur.execute("SELECT COUNT(*) FROM product_embeddings WHERE product_id >= 1000000000000")
    shopify_new = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM product_embeddings")
    total = cur.fetchone()[0]
    
    print(f"\n{'='*60}")
    print(f"✓ EMBEDDINGS IMPORT COMPLETE")
    print(f"{'='*60}")
    print(f"Shopify embeddings: {shopify_existing} → {shopify_new} (+{shopify_new - shopify_existing})")
    print(f"ASOS embeddings: {asos_count}")
    print(f"Total embeddings: {total}")
    print(f"{'='*60}")
    
    # Check for products still missing embeddings
    cur.execute("""
        SELECT COUNT(*)
        FROM products p
        LEFT JOIN product_embeddings pe ON p.product_id = pe.product_id
        WHERE p.product_id >= 1000000000000 
        AND pe.product_id IS NULL
    """)
    missing = cur.fetchone()[0]
    
    if missing > 0:
        print(f"\n⚠️  {missing} Shopify products still don't have embeddings")
        print("   (likely failed image downloads or missing images)")
    else:
        print(f"\n✓ All Shopify products have embeddings!")
    
    # Sample check: Show a few Shopify embeddings
    cur.execute("""
        SELECT pe.product_id, p.product_name, p.brand
        FROM product_embeddings pe
        JOIN products p ON pe.product_id = p.product_id
        WHERE pe.product_id >= 1000000000000
        LIMIT 5
    """)
    
    samples = cur.fetchall()
    print(f"\nSample Shopify embeddings:")
    for pid, name, brand in samples:
        print(f"  {pid}: {brand} - {name[:50]}...")
    
    cur.close()
    conn.close()
    print("\n✓ Database connection closed")

if __name__ == "__main__":
    import_shopify_embeddings()