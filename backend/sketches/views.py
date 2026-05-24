from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os

@csrf_exempt
def upload_sketch(request):
    if request.method == 'POST':
        image = request.FILES.get('image')
        if not image:
            return JsonResponse({'error': 'No image uploaded'}, status=400)
        
        # Save file inside media/sketches/
        file_path = default_storage.save(os.path.join('sketches', image.name), ContentFile(image.read()))
        return JsonResponse({'message': 'Image uploaded successfully', 'path': file_path})
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)
