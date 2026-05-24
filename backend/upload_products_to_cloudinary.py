import os
import time
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import psycopg2
import logging

# -----------------------------
# STEP 0: Setup logging
# -----------------------------
logging.basicConfig(
    filename='upload_log.txt',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

# -----------------------------
# STEP 1: Load environment variables
# -----------------------------
load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# -----------------------------
# STEP 2: Connect to PostgreSQL
# -----------------------------
conn = psycopg2.connect(
    dbname="fyp_clothing_db",
    user="postgres",       
    password="my126403", 
    host="localhost",
    port="5432"
)
cur = conn.cursor()

# -----------------------------
# STEP 3: Fetch products to upload
# -----------------------------
cur.execute("SELECT product_id, image_path FROM products WHERE cloudinary_url IS NULL;")
rows = cur.fetchall()
logging.info(f"Total products to upload: {len(rows)}")

# -----------------------------
# STEP 4: Recursive search function
# -----------------------------
def find_image_path(image_name, base_folder):
    for root, dirs, files in os.walk(base_folder):
        if image_name in files:
            return os.path.join(root, image_name)
    return None

BASE_IMAGE_FOLDER = r"C:\Users\Khalid-Mehmood\Documents\realize_me_fyp\backend\database\product_images"

# -----------------------------
# STEP 5: Bulk upload with batch handling
# -----------------------------
BATCH_SIZE = 1000  # Adjust for free-tier safety
RETRY_FAILED = []  # List of product_ids failed

count_uploaded = 0
count_skipped = 0

for product_id, image_path in rows[:BATCH_SIZE]:
    try:
        # Determine local path
        if not os.path.exists(image_path):
            local_path = find_image_path(image_path, BASE_IMAGE_FOLDER)
            if not local_path:
                logging.warning(f"[SKIP] Image not found for product {product_id}: {image_path}")
                count_skipped += 1
                continue
        else:
            local_path = image_path

        # Upload to Cloudinary
        response = cloudinary.uploader.upload(
            local_path,
            folder="realize_me/products",  # organizes images
            public_id=str(product_id),      # product_id as name
            overwrite=True
        )

        cloud_url = response["secure_url"]

        # Update DB
        cur.execute(
            "UPDATE products SET cloudinary_url = %s WHERE product_id = %s",
            (cloud_url, product_id)
        )
        conn.commit()

        count_uploaded += 1
        logging.info(f"[UPLOAD] Product {product_id} → {cloud_url}")
        print(f"[UPLOAD] Product {product_id}")

        # Optional: small delay to avoid Cloudinary rate-limit
        time.sleep(0.1)

    except Exception as e:
        logging.error(f"[ERROR] Product {product_id}: {e}")
        RETRY_FAILED.append(product_id)
        continue

# -----------------------------
# STEP 6: Summary
# -----------------------------
logging.info(f"Batch finished. Uploaded: {count_uploaded}, Skipped: {count_skipped}, Failed: {len(RETRY_FAILED)}")
print(f"Done! Uploaded: {count_uploaded}, Skipped: {count_skipped}, Failed: {len(RETRY_FAILED)}")
if RETRY_FAILED:
    logging.info(f"Failed uploads saved for retry: {RETRY_FAILED}")
    # Optional: save failed IDs to file
    with open('failed_uploads.txt', 'w') as f:
        for pid in RETRY_FAILED:
            f.write(f"{pid}\n")

cur.close()
conn.close()