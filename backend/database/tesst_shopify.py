import requests
import json
import time

print("=" * 70)
print("TESTING MODEST FASHION SHOPIFY STORES")
print("(Shirts, Pants, Dresses, Jackets, Modest Wear)")
print("=" * 70)

# Shopify stores with modest, everyday fashion
MODEST_FASHION_STORES = [
    # Already tested
    {'name': 'Princess Polly', 'url': 'https://us.princesspolly.com'},
    
    # Women's Modest Fashion
    {'name': 'Modanisa', 'url': 'https://www.modanisa.com'},
    {'name': 'East Essence', 'url': 'https://www.eastessence.com'},
    {'name': 'Haute Hijab', 'url': 'https://www.hautehijab.com'},
    {'name': 'Verona Collection', 'url': 'https://www.veronacollection.com'},
    {'name': 'Aab', 'url': 'https://www.aabcollection.com'},
    {'name': 'Inayah', 'url': 'https://www.inayah.co'},
    
    # Contemporary Modest Brands
    {'name': 'Uniqlo', 'url': 'https://www.uniqlo.com'},
    {'name': 'COS', 'url': 'https://www.cosstores.com'},
    {'name': 'Everlane', 'url': 'https://www.everlane.com'},
    {'name': 'Reformation', 'url': 'https://www.thereformation.com'},
    {'name': 'Ganni', 'url': 'https://www.ganni.com'},
    
    # Everyday Casual
    {'name': 'Lulus', 'url': 'https://www.lulus.com'},
    {'name': 'Showpo', 'url': 'https://www.showpo.com'},
    {'name': 'Hello Molly', 'url': 'https://www.hellomolly.com'},
    {'name': 'Sabo Skirt', 'url': 'https://saboskirt.com'},
    {'name': 'Beginning Boutique', 'url': 'https://www.beginningboutique.com'},
    {'name': 'Tiger Mist', 'url': 'https://us.tigermist.com'},
    {'name': 'Peppermayo', 'url': 'https://us.peppermayo.com'},
    
    # Men's Modest Fashion
    {'name': 'Shukr', 'url': 'https://www.shukr.com'},
    {'name': 'REPRESENT', 'url': 'https://representclo.com'},
    {'name': 'MNML', 'url': 'https://mnml.la'},
    {'name': 'John Elliott', 'url': 'https://www.johnelliott.com'},
    {'name': 'Publish Brand', 'url': 'https://www.publishbrand.com'},
    
    # Streetwear (Modest)
    {'name': 'The Hundreds', 'url': 'https://thehundreds.com'},
    {'name': 'Obey', 'url': 'https://obeyclothing.com'},
    {'name': 'Stussy', 'url': 'https://www.stussy.com'},
    {'name': 'Carhartt', 'url': 'https://www.carhartt-wip.com'},
    
    # Workwear/Business Casual
    {'name': 'MM LaFleur', 'url': 'https://mmlafleur.com'},
    {'name': 'Ministry of Supply', 'url': 'https://ministryofsupply.com'},
    {'name': 'Betabrand', 'url': 'https://www.betabrand.com'},
    
    # Sustainable/Ethical
    {'name': 'Pact', 'url': 'https://wearpact.com'},
    {'name': 'Thought Clothing', 'url': 'https://www.thoughtclothing.com'},
    {'name': 'People Tree', 'url': 'https://www.peopletree.co.uk'},
    {'name': 'Kotn', 'url': 'https://kotn.com'},
    {'name': 'Nisolo', 'url': 'https://nisolo.com'},
    
    # Classic Brands
    {'name': 'Gap', 'url': 'https://www.gap.com'},
    {'name': 'Banana Republic', 'url': 'https://www.bananarepublic.com'},
    {'name': 'J.Crew', 'url': 'https://www.jcrew.com'},
    {'name': 'Madewell', 'url': 'https://www.madewell.com'},
    
    # Plus Size Modest
    {'name': 'Universal Standard', 'url': 'https://www.universalstandard.com'},
    {'name': 'Eloquii', 'url': 'https://www.eloquii.com'},
    
    # Indie/Boutique
    {'name': 'Olivia Rose', 'url': 'https://www.shoplivrose.com'},
    {'name': 'Altar\'d State', 'url': 'https://www.altardstate.com'},
    {'name': 'Red Dress', 'url': 'https://www.reddressboutique.com'},
    {'name': 'Shop Priceless', 'url': 'https://www.shoppriceless.com'},
    
    # Minimalist
    {'name': 'Oak + Fort', 'url': 'https://www.oakandfort.com'},
    {'name': 'Aritzia', 'url': 'https://www.aritzia.com'},
    {'name': 'Wilfred', 'url': 'https://www.aritzia.com/en/wilfred'},
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
}

print(f"\nTesting {len(MODEST_FASHION_STORES)} stores...\n")

working_stores = []
failed_stores = []

for i, store in enumerate(MODEST_FASHION_STORES, 1):
    print(f"[{i}/{len(MODEST_FASHION_STORES)}] {store['name']:30}", end=" ")
    
    url = f"{store['url']}/products.json"
    params = {'limit': 5}
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            try:
                data = response.json()
                products = data.get('products', [])
                
                if products and len(products) > 0:
                    print(f"✅ {len(products)} products")
                    working_stores.append(store)
                else:
                    print("⚠️  Empty")
                    failed_stores.append(store['name'])
            except:
                print("❌ Invalid JSON")
                failed_stores.append(store['name'])
        else:
            print(f"❌ {response.status_code}")
            failed_stores.append(store['name'])
            
    except Exception as e:
        print(f"❌ Error")
        failed_stores.append(store['name'])
    
    time.sleep(0.3)

# Summary
print("\n" + "="*70)
print(f"RESULTS: {len(working_stores)} WORKING / {len(failed_stores)} FAILED")
print("="*70)

if len(working_stores) >= 5:
    print(f"\n✅ FOUND {len(working_stores)} WORKING MODEST FASHION STORES:\n")
    for i, store in enumerate(working_stores, 1):
        print(f"  {i:2}. {store['name']:30} - {store['url']}")
    
    # Save to file
    with open('working_modest_fashion_stores.json', 'w') as f:
        json.dump(working_stores, f, indent=2)
    
    print(f"\n✓ Saved to working_modest_fashion_stores.json")
    
    # Generate scraper config
    print("\n" + "="*70)
    print("COPY THIS INTO YOUR SCRAPER:")
    print("="*70)
    
    print("\nSHOPIFY_STORES = [")
    for store in working_stores[:10]:
        print(f"    {{'name': '{store['name']}', 'url': '{store['url']}'}},")
    print("]")
    
    # Category breakdown
    print("\n" + "="*70)
    print("STORE CATEGORIES:")
    print("="*70)
    print("\nYou'll get products in categories like:")
    print("  • Shirts & Blouses")
    print("  • Pants & Trousers")
    print("  • Dresses (modest length)")
    print("  • Jackets & Coats")
    print("  • Cardigans & Sweaters")
    print("  • Skirts (modest length)")
    print("  • Jeans & Denim")
    print("  • Business/Workwear")
    print("  • Casual everyday wear")
    
else:
    print(f"\n⚠️  Only found {len(working_stores)} working stores:")
    for store in working_stores:
        print(f"  • {store['name']} - {store['url']}")

print("\n" + "="*70)