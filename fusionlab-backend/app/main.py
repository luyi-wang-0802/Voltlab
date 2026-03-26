from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.database.init_db import init_database

from .routers.session import router as sessions_router
from .routers.rooms import router as rooms_router
from .routers.room_bookings import router as room_bookings_router
from .routers.seat_bookings import router as seat_bookings_router
from .routers.events import router as events_router
from .routers.profile import router as profile_router
from .routers.upload import router as upload_router

UPLOAD_DIR = Path("uploads/posters")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application Lifecycle Management - Initialize Database at Startup"""
    print("=" * 60)
    print("Application starting up...")
    print("=" * 60)
    
    # Use init_database() to safely initialize
    # This function checks existing data to prevent duplicate inserts.
    init_database()
    
    print("=" * 60)
    print("Application ready!")
    print("=" * 60)
    
    yield
    
    print("Application shutting down...")


app = FastAPI(title="FusionLab Backend API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Development environment allows all sources
    allow_credentials=True,
    allow_methods=["*"],  # Change to allow all methods (including OPTIONS)）
    allow_headers=["*"],
)

# Static File Service (Poster Upload) - Changed to /uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Registered Routes
app.include_router(sessions_router, prefix="/api")
app.include_router(rooms_router, prefix="/api")
app.include_router(room_bookings_router, prefix="/api")
app.include_router(seat_bookings_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(upload_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "FusionLab Backend API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}