import numpy as np
import psycopg2
from psycopg2.extras import execute_values

# ============================================
# Paths to NEW FashionCLIP .npy files
# ============================================
embeddings_path = "all_embeddings.npy"
product_ids_path = "all_product_ids.npy"

# ============================================
# Load data (same logic as your working code)
# ============================================
embeddings = np.load(embeddings_path)   # (N, 512)
product_ids = np.load(product_ids_path) # (N,)

print(f"Loaded {embeddings.shape[0]} embeddings of dimension {embeddings.shape[1]}")

# ============================================
# Connect to Docker PostgreSQL (UNCHANGED)
# ============================================
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="fyp_clothing_db",
    user="postgres",
    password="my126403"
)

cur = conn.cursor()

# ============================================
# DB Info (same debug checks as your version)
# ============================================
cur.execute("SELECT current_database(), inet_server_addr(), inet_server_port();")
db_info = cur.fetchone()
print("Connected to DB:", db_info)

cur.execute("""
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public';
""")

tables = cur.fetchall()
print("\nTables in 'public' schema:")
for schema, table in tables:
    print(f"{schema}.{table}")

# ============================================
# PREPARE RECORDS (EXACT SAME LOGIC)
# ============================================
records = [
    (int(pid), embedding.tolist())
    for pid, embedding in zip(product_ids, embeddings)
]

print(f"\nPrepared {len(records)} records for insertion")

# ============================================
# INSERT (UNCHANGED LOGIC)
# ============================================
execute_values(
    cur,
    """
    INSERT INTO product_embeddings_fashion_clip (product_id, embedding)
    VALUES %s
    ON CONFLICT (product_id) DO NOTHING
    """,
    records,
    page_size=1000
)

conn.commit()
cur.close()
conn.close()

print("\nAll FashionCLIP embeddings inserted successfully!")