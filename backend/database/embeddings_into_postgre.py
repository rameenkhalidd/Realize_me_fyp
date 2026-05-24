import numpy as np
import psycopg2
from psycopg2.extras import execute_values

# Paths to your .npy files
embeddings_path = "embeddings.npy"
product_ids_path = "product_ids.npy"

# Load data
embeddings = np.load(embeddings_path)  # shape: (9785, 512)
product_ids = np.load(product_ids_path)  # shape: (9785,)
print(f"Loaded {embeddings.shape[0]} embeddings of dimension {embeddings.shape[1]}")

# Connect to Docker PostgreSQL
conn = psycopg2.connect(
    host="localhost",          # TCP connection to Docker
    port=5432,
    dbname="fyp_clothing_db",
    user="postgres",
    password="my126403"
)
cur = conn.cursor()

# --- Print connected database info ---
cur.execute("SELECT current_database(), inet_server_addr(), inet_server_port();")
db_info = cur.fetchone()
print("Connected to DB:", db_info)

# --- List all tables in current schema (like \dt) ---
cur.execute("""
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public';
""")
tables = cur.fetchall()
print("\nTables in 'public' schema:")
for schema, table in tables:
    print(f"{schema}.{table}")

# Prepare data for bulk insert (convert numpy arrays to Python lists)
records = [
    (int(pid), embedding.tolist()) for pid, embedding in zip(product_ids, embeddings)
]

# Use execute_values for optimized bulk insert
execute_values(
    cur,
    """
    INSERT INTO product_embeddings (product_id, embedding)
    VALUES %s
    ON CONFLICT (product_id) DO NOTHING
    """,
    records,
    template=None,
    page_size=1000  # adjust batch size for very large datasets
)

conn.commit()
cur.close()
conn.close()
print("All embeddings inserted successfully!")
