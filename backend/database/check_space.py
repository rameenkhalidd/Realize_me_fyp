import os
from pathlib import Path
from dotenv import load_dotenv
import psycopg2

load_dotenv()

IMAGE_DIR = os.getenv('IMAGES_DIR')
DB_CONFIG = {
    'host': os.getenv('PG_HOST'),
    'database': os.getenv('PG_DB'),
    'user': os.getenv('PG_USER'),
    'password': os.getenv('PG_PASS'),
    'port': os.getenv('PG_PORT')
}

def get_directory_size(path):
    """Calculate total size of directory"""
    total = 0
    try:
        for entry in os.scandir(path):
            if entry.is_file():
                total += entry.stat().st_size
            elif entry.is_dir():
                total += get_directory_size(entry.path)
    except Exception as e:
        print(f"Error: {e}")
    return total

def format_bytes(bytes):
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes < 1024.0:
            return f"{bytes:.2f} {unit}"
        bytes /= 1024.0

print("=" * 70)
print("STORAGE CHECK")
print("=" * 70)

# Check image directory
if IMAGE_DIR and os.path.exists(IMAGE_DIR):
    image_files = list(Path(IMAGE_DIR).glob("*.jpg"))
    total_size = get_directory_size(IMAGE_DIR)
    
    print(f"\nImage Directory: {IMAGE_DIR}")
    print(f"  Total images: {len(image_files)}")
    print(f"  Total size: {format_bytes(total_size)}")
    print(f"  Average per image: {format_bytes(total_size/len(image_files)) if image_files else '0 B'}")
    
    # Estimate remaining categories
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM products")
        db_count = cursor.fetchone()[0]
        
        print(f"\nDatabase Records: {db_count}")
        
        # Calculate which categories are done
        cursor.execute("SELECT DISTINCT category FROM products")
        categories = cursor.fetchall()
        print(f"Categories completed: {len(categories)}")
        for cat in categories:
            cursor.execute("SELECT COUNT(*) FROM products WHERE category = %s", (cat[0],))
            count = cursor.fetchone()[0]
            print(f"  {cat[0]}: {count} products")
        
        conn.close()
        
        # Estimate total if we continue
        if db_count > 0:
            avg_per_product = total_size / db_count
            # Assuming 8 categories total, estimate remaining
            remaining_categories = 8 - len(categories)
            estimated_remaining_products = db_count * (remaining_categories / len(categories)) if len(categories) > 0 else 0
            estimated_total_size = total_size + (avg_per_product * estimated_remaining_products)
            
            print(f"\n{'='*70}")
            print("PROJECTIONS:")
            print(f"{'='*70}")
            print(f"  Current: {format_bytes(total_size)}")
            print(f"  Estimated total for all 8 categories: {format_bytes(estimated_total_size)}")
            print(f"  Remaining space needed: {format_bytes(estimated_total_size - total_size)}")
        
    except Exception as e:
        print(f"\nCouldn't check database: {e}")
else:
    print(f"\n⚠ Image directory not found: {IMAGE_DIR}")

# Check disk space
if os.name == 'nt':  # Windows
    import shutil
    try:
        drive = Path(IMAGE_DIR).drive if IMAGE_DIR else "C:"
        total, used, free = shutil.disk_usage(drive)
        print(f"\n{'='*70}")
        print(f"DISK SPACE ({drive})")
        print(f"{'='*70}")
        print(f"  Total: {format_bytes(total)}")
        print(f"  Used: {format_bytes(used)}")
        print(f"  Free: {format_bytes(free)}")
        
        if free < 5 * 1024 * 1024 * 1024:  # Less than 5GB
            print(f"\n  ⚠ WARNING: Low disk space!")
    except Exception as e:
        print(f"\nCouldn't check disk space: {e}")

print(f"\n{'='*70}")