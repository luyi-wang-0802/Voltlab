from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Annotated
from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

router = APIRouter(tags=["upload"])

# Determine the upload directory based on the environment.
if os.getenv("ENVIRONMENT") == "production":
    UPLOAD_DIR = Path("/app/uploads/posters")  
else:
    UPLOAD_DIR = Path("uploads/posters") 

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/webp"
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def save_and_optimize_image(content: bytes, file_path: Path):
    """Save and optimize images - uniformly convert to JPEG format"""
    try:
       
        img = Image.open(BytesIO(content))
        
        
        if img.mode in ('RGBA', 'LA', 'P'):
            
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                
                background.paste(img, mask=img.split()[3])
            else:
                background.paste(img)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Maximum Size Limit (Keep Proportions)
        max_size = (1920, 1920)
        if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Save uniformly as JPEG format, quality=85, optimize=True
        img.save(file_path, format="JPEG", quality=85, optimize=True)
        
    except Exception as e:
        raise Exception(f"Image processing failed: {str(e)}")


@router.post("/upload/poster")
async def upload_poster(
    file: Annotated[UploadFile, File(description="Poster image file")],
):
    """Upload activity poster"""
    
    # Validate file type
    if not file.content_type or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file type. Allowed: JPG, PNG, WebP"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must not exceed 10MB"
        )
    
    # Generate unique filenames (using the .jpg extension uniformly)
    unique_filename = f"{uuid.uuid4()}.jpg"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        # Save and optimize images
        await save_and_optimize_image(content, file_path)
        
        # Generate access URL
        if os.getenv("ENVIRONMENT") == "production":
            root_path = os.getenv("ROOT_PATH", "")
            poster_url = f"{root_path}/uploads/posters/{unique_filename}"
        else:
            poster_url = f"/uploads/posters/{unique_filename}"
        
        return {
            "poster_url": poster_url,
            "filename": unique_filename,
            "message": "File uploaded successfully"
        }
        
    except Exception as e:
        # If saving fails, delete the file.
        if file_path.exists():
            file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to save file: {str(e)}"
        )