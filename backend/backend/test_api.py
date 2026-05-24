# test_api_interactive.py - Interactive file picker for testing

import requests
from PIL import Image
import os

def pick_file():
    """Open file picker dialog"""
    try:
        from tkinter import Tk, filedialog
        
        # Create hidden root window
        root = Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        
        # Open file picker
        file_path = filedialog.askopenfilename(
            title="Select an image file",
            filetypes=[
                ("Image files", "*.jpg *.jpeg *.png *.gif *.bmp"),
                ("All files", "*.*")
            ]
        )
        
        root.destroy()
        return file_path
    
    except ImportError:
        print("❌ tkinter not available. Using manual input instead.")
        return None

def manual_file_input():
    """Manually enter file path"""
    print("\nAvailable files in current directory:")
    files = [f for f in os.listdir(".") if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp'))]
    
    if files:
        for i, f in enumerate(files, 1):
            print(f"  {i}. {f}")
    else:
        print("  (No image files found)")
    
    file_path = input("\nEnter file path or name: ").strip()
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return None
    
    return file_path

def test_similarity_search(file_path):
    """Test the similarity search API"""
    
    # Verify file exists and is valid
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return
    
    try:
        # Verify it's a valid image
        with Image.open(file_path) as img:
            print(f"✓ Image loaded: {img.size} ({img.format})")
    except Exception as e:
        print(f"❌ Not a valid image: {e}")
        return
    
    # Test health check
    print("\n" + "="*70)
    print("Testing /health endpoint...")
    print("="*70)
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✓ Server is running")
            print(f"  Response: {response.json()}")
        else:
            print(f"❌ Server error: {response.status_code}")
            return
    except requests.ConnectionError:
        print("❌ Cannot connect to server at http://localhost:8000")
        print("   Make sure to run: uvicorn app:app --reload")
        return
    
    # Test similarity search
    print("\n" + "="*70)
    print("Testing /find-similar endpoint...")
    print("="*70)
    print(f"Uploading: {file_path}")
    
    try:
        with open(file_path, "rb") as f:
            files = {"file": f}
            response = requests.post("http://localhost:8000/find-similar", files=files)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get("success"):
                products = result.get("products", [])
                
                print("\n" + "="*70)
                print(f"✓ FOUND {len(products)} SIMILAR PRODUCTS".center(70))
                print("="*70)
                
                for i, product in enumerate(products, 1):
                    similarity = product.get("similarity", 0) * 100
                    name = product.get("name", "Unknown")
                    brand = product.get("brand", "Unknown")
                    category = product.get("category", "Unknown")
                    price = product.get("price", "N/A")
                    product_url = product.get("product_url", None)
                    image_url = product.get("image_url", None)
                    product_id = product.get("product_id", "N/A")
                    
                    print(f"\n#{i} - {similarity:.1f}% Match")
                    print(f"    ID:       {product_id}")
                    print(f"    Name:     {name}")
                    print(f"    Brand:    {brand}")
                    print(f"    Category: {category}")
                    print(f"    Price:    ${price}")
                    
                    # Show image URL
                    if image_url:
                        print(f"    Image:    {image_url}")
                    else:
                        print(f"    Image:    (Not available)")
                    
                    # Show product URL
                    if product_url:
                        print(f"    Buy Link: {product_url}")
                    else:
                        print(f"    Buy Link: (Not available)")
                
                print("\n" + "="*70)
            else:
                print(f"❌ API returned error: {result}")
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"   Response: {response.json()}")
    
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    """Main function"""
    print("\n" + "="*70)
    print("REALIZE ME - SIMILARITY SEARCH TESTER".center(70))
    print("="*70)
    
    # Try file picker first
    file_path = pick_file()
    
    # Fall back to manual input if picker failed or was cancelled
    if not file_path:
        file_path = manual_file_input()
    
    if not file_path:
        print("\n❌ No file selected. Exiting.")
        return
    
    print(f"\n✓ Selected: {file_path}")
    
    # Test the API
    test_similarity_search(file_path)

if __name__ == "__main__":
    main()