# FusionLab Backend

Backend service for room and seat booking, poster upload, and event listing.
Built with FastAPI + SQLAlchemy, with SQLite for local development.

## Tech Stack

- FastAPI
- SQLAlchemy
- Alembic
- SQLite
- Pydantic
- Pytest, Ruff

## Project Structure

```text
fusionlab-backend/
├── app/
│   ├── main.py                    # FastAPI application entry point
│   ├── certification/             # Authentication & authorization
│   │   ├── auth.py               # Authentication logic
│   │   └── deps.py               # Dependency injection
│   ├── database/                  # Database configuration
│   │   ├── db.py                 # Database connection setup
│   │   └── init_db.py            # Database initialization
│   ├── data_models/               # SQLAlchemy models
│   │   └── models.py             # Database table models
│   ├── routers/                   # API route handlers
│   │   ├── session.py            # Session management
│   │   ├── rooms.py              # Room search endpoints
│   │   ├── room_bookings.py      # Room booking endpoints
│   │   ├── seat_bookings.py      # Seat booking endpoints
│   │   ├── events.py             # Event listing endpoints
│   │   ├── profile.py            # User profile endpoints
│   │   ├── upload.py             # File upload endpoints
│   │   └── schemas.py            # Pydantic request/response models
│   └── ifc_tools/                 # Data seeding utilities
│       ├── load_seed_rooms.py    # Room data loader
│       └── load_seed_seats.py    # Seat data loader
├── data/                          # Seed data and database
│   ├── spaces.csv                # Room seed data
│   ├── seats.csv                 # Seat seed data
│   └── fusionlab.db              # SQLite database (generated)
├── uploads/                       # User uploaded files
│   └── posters/                  # Event poster uploads
├── alembic/                       # Database migrations
│   ├── versions/                 # Migration scripts
│   ├── env.py                    # Alembic environment
│   └── script.py.mako            # Migration template
├── tests/                         # Test files
├── requirements.txt               # Python dependencies
├── alembic.ini                   # Alembic configuration
└── readme.md                     # This file
```

## Quick Start

1. Create and activate virtual env:

```bash
python -m venv .venv
.venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. (Optional but recommended) Run migrations:

```bash
alembic upgrade head
```

4. Start server:

```bash
uvicorn app.main:app --reload
```

Server default: `http://127.0.0.1:8000`

OpenAPI docs:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`

## Database Initialization

On app startup, `init_database()` runs automatically:

- creates missing tables
- loads room seed data from `data/spaces.csv`
- loads seat seed data from `data/seats.csv`

SQLite file path: `data/fusionlab.db`

## API Overview

All business routes are under `/api`.

Public health:

- `GET /`
- `GET /health`

Session:

- `POST /api/session`
- `GET /api/me` (requires `X-Session-id`)
- `GET /api/session/{session_id}` (requires `X-Session-id`)

Room search and booking:

- `POST /api/rooms/search` (requires `X-Session-id`)
- `POST /api/room_bookings` (requires `X-Session-id`)

Seat search and booking:

- `POST /api/seats/search` (requires `X-Session-id`)
- `POST /api/seat_bookings` (requires `X-Session-id`)

Events:

- `GET /api/events`
- Optional query: `event_type=ACADEMIC|CULTURE|SOCIAL`
- Returns bookings with non-null `poster_url`

Profile:

- `GET /api/profile/seat-bookings` (requires `X-Session-id`)
- `GET /api/profile/room-bookings` (requires `X-Session-id`)

Upload:

- `POST /api/upload/poster`
- Accepts `jpg/jpeg/png/webp`, max 10MB
- Saved under `uploads/posters/`
- Static URL path: `/uploads/posters/{filename}`

## Minimal Flow (cURL)

1. Create session:

```bash
curl -X POST http://127.0.0.1:8000/api/session \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"alice\"}"
```

2. Use returned session id:

```bash
curl http://127.0.0.1:8000/api/me \
  -H "X-Session-id: <session_id>"
```

3. Search rooms:

```bash
curl -X POST http://127.0.0.1:8000/api/rooms/search \
  -H "Content-Type: application/json" \
  -H "X-Session-id: <session_id>" \
  -d "{\"start_time_utc\":\"2026-03-10T09:00:00Z\",\"end_time_utc\":\"2026-03-10T11:00:00Z\",\"attendee_count\":8}"
```

## Development Notes

- CORS is currently open (`allow_origins=["*"]`) for development.
- Poster upload images are converted/optimized to JPEG.
- `RoomBooking` and `SeatBooking` overlap rule:
  `existing.start < new.end AND existing.end > new.start`.
