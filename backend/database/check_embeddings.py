import numpy as np

# Load embeddings and product_ids
embeddings = np.load("embeddings.npy")   # shape: (9785, 512)
product_ids = np.load("product_ids.npy") # shape: (9785,)

print(embeddings.shape, product_ids.shape)
print(embeddings[0])      # 512-d vector of the first product
print(product_ids[0])     # corresponding product_id
