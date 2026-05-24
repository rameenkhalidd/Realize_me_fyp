"""
STEP 1 UPDATED: Export ALL Products with Cloudinary URLs
=========================================================
Exports products with cloudinary_url instead of local image_path.
Since images are stored in Cloudinary, we use those URLs directly.

Run this FIRST on your local machine.
"""

import pandas as pd
import os
import psycopg2

print("=" * 80)
print("STEP 1: EXPORT ALL PRODUCTS WITH CLOUDINARY URLS")
print("=" * 80)

# ----------------------------
# PostgreSQL connection
# ----------------------------
try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        dbname="fyp_clothing_db",
        user="postgres",
        password="my126403"
    )
    cur = conn.cursor()
    print("\n✓ Connected to database")
except Exception as e:
    print(f"\n❌ Connection failed: {e}")
    exit(1)

# ----------------------------
# Query ALL products with Cloudinary URLs
# ----------------------------
print("\n⏳ Fetching ALL products with Cloudinary URLs...")

try:
    # Query WITHOUT LIMIT to get every single product
    # Using cloudinary_url instead of image_path (since images are in cloud)
    cur.execute("""
        SELECT product_id, cloudinary_url 
        FROM products 
        WHERE cloudinary_url IS NOT NULL 
        AND cloudinary_url != ''
        ORDER BY product_id
    """)
    rows = cur.fetchall()
    total_products = len(rows)
    print(f"✓ Fetched {total_products} products with Cloudinary URLs")
except Exception as e:
    print(f"❌ Query failed: {e}")
    cur.close()
    conn.close()
    exit(1)

# ----------------------------
# Convert to DataFrame
# ----------------------------
df = pd.DataFrame(rows, columns=["product_id", "cloudinary_url"])
print(f"\nDataFrame shape: {df.shape}")

# ----------------------------
# Verify we have URLs
# ----------------------------
print("\n⏳ Verifying Cloudinary URLs...")

# Check for valid URLs
valid_urls = df['cloudinary_url'].str.startswith(
    ('http://', 'https://', 'cloudinary://')
).sum()

invalid_urls = len(df) - valid_urls

if valid_urls > 0:
    print(f"✓ Found {valid_urls} valid Cloudinary URLs")
else:
    print(f"⚠️  Warning: No valid Cloudinary URLs found!")

if invalid_urls > 0:
    print(f"⚠️  Found {invalid_urls} invalid URLs (will be excluded)")

# Remove rows with invalid URLs
df_clean = df[
    df['cloudinary_url'].str.startswith(('http://', 'https://'), na=False)
].copy()

print(f"\n✓ After filtering: {len(df_clean)} products with valid URLs")

# ----------------------------
# Prepare for Kaggle
# ----------------------------
print("\n⏳ Preparing for Kaggle...")

# For Kaggle, we just need product_id and cloudinary_url
df_kaggle = df_clean[['product_id', 'cloudinary_url']].copy()

print(f"\n✓ Final product count: {len(df_kaggle)}")
print(f"\nFirst 10 products:")
print(df_kaggle.head(10))

# Sample URLs
print(f"\nSample Cloudinary URLs:")
for i, url in enumerate(df_kaggle['cloudinary_url'].head(3)):
    print(f"  {i+1}. {url}")

# ----------------------------
# Save CSV
# ----------------------------
csv_filename = "products_kaggle.csv"
df_kaggle.to_csv(csv_filename, index=False)
print(f"\n{'='*80}")
print(f"✅ CSV CREATED: {csv_filename}")
print(f"{'='*80}")

# ----------------------------
# Statistics
# ----------------------------
print(f"\nStatistics:")
print(f"  Total products in database: {len(df)}")
print(f"  Products with valid Cloudinary URLs: {len(df_kaggle)}")
print(f"  CSV file size: {os.path.getsize(csv_filename) / 1024:.2f} KB")


# Close connection
cur.close()
conn.close()

print(f"✓ Step 1 complete! CSV ready for Kaggle.")
print(f"✓ Images will be downloaded from Cloudinary during Kaggle processing.")
print("=" * 80)