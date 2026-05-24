import os
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader

# Load .env manually
load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

response = cloudinary.uploader.upload("test.png")
print(response["secure_url"])