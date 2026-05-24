import requests
import json
from dotenv import load_dotenv
import os

load_dotenv()

RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')

print("=" * 70)
print("TESTING RAPIDAPI CONNECTION")
print("=" * 70)
print(f"API Key: {RAPIDAPI_KEY[:20]}..." if RAPIDAPI_KEY else "NO API KEY FOUND!")
print("=" * 70)

# Test 1: Check if key exists
if not RAPIDAPI_KEY:
    print("\n❌ ERROR: RAPIDAPI_KEY not found in .env file!")
    print("Make sure your .env file has: RAPIDAPI_KEY=your_key_here")
    exit(1)

print("\n✓ API Key found")

# Test 2: Try fetching products
print("\n" + "=" * 70)
print("TEST: Fetching products from category 11057")
print("=" * 70)

url = "https://asos2.p.rapidapi.com/products/v2/list"

querystring = {
    "store": "US",
    "offset": "0",
    "categoryId": "11057",
    "limit": "5",  # Just 5 products for testing
    "country": "US",
    "sort": "freshness",
    "currency": "USD",
    "lang": "en-US"
}

headers = {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": "asos2.p.rapidapi.com"
}

try:
    print("\nSending request...")
    response = requests.get(url, headers=headers, params=querystring, timeout=30)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("✓ SUCCESS! API is working")
        data = response.json()
        
        products = data.get('products', [])
        print(f"\nReceived {len(products)} products")
        
        if products:
            print("\nFirst product sample:")
            print(json.dumps(products[0], indent=2))
            
            # Check for image URL in response
            print("\n" + "=" * 70)
            print("CHECKING IMAGE DATA:")
            print("=" * 70)
            first_product = products[0]
            product_id = first_product.get('id')
            print(f"Product ID: {product_id}")
            print(f"Product Name: {first_product.get('name', 'N/A')}")
            print(f"Has 'imageUrl' field: {'imageUrl' in first_product}")
            print(f"Has 'url' field: {'url' in first_product}")
            
            # Try constructing image URL
            if product_id:
                constructed_url = f"https://images.asos-media.com/products/{product_id}/prd/{product_id}_1.jpg"
                print(f"\nConstructed image URL: {constructed_url}")
                
                print("\nTesting image download...")
                img_response = requests.get(constructed_url, timeout=10)
                print(f"Image response code: {img_response.status_code}")
                if img_response.status_code == 200:
                    print("✓ Image accessible!")
                else:
                    print("❌ Image not accessible")
        
    elif response.status_code == 403:
        print("\n❌ 403 FORBIDDEN")
        print("Your API key might be invalid or expired")
        print("Or you might have exceeded your API quota")
        print(f"\nResponse: {response.text[:200]}")
        
    elif response.status_code == 429:
        print("\n❌ 429 TOO MANY REQUESTS")
        print("You've hit the rate limit")
        print(f"\nResponse: {response.text[:200]}")
        
    else:
        print(f"\n❌ ERROR: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
except requests.exceptions.Timeout:
    print("\n❌ REQUEST TIMED OUT")
    print("The API is not responding")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")

print("\n" + "=" * 70)
print("TEST COMPLETE")
print("=" * 70)