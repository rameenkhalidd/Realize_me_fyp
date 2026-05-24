import pandas as pd
import os
import psycopg2

# ----------------------------
# PostgreSQL connection setup
# ----------------------------
conn = psycopg2.connect(
    host="localhost",       # your Docker host
    port=5432,
    dbname="fyp_clothing_db",
    user="postgres",
    password="my126403"
)
cur = conn.cursor()

# ----------------------------
# Query products table
# ----------------------------
cur.execute("SELECT product_id, image_path FROM products;")
rows = cur.fetchall()

# Convert to DataFrame
df = pd.DataFrame(rows, columns=["product_id", "image_path"])

# ----------------------------
# Extract filename only
# ----------------------------
df['image_filename'] = df['image_path'].apply(lambda x: os.path.basename(x))

# Keep only needed columns for Kaggle
df_kaggle = df[['product_id', 'image_filename']]

# ----------------------------
# Save Kaggle-ready CSV
# ----------------------------
df_kaggle.to_csv("products_kaggle.csv", index=False)

print(f"Kaggle-ready CSV created: products_kaggle.csv with {len(df_kaggle)} products.")

# Close connection
cur.close()
conn.close()
