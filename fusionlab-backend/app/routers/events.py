"""
Events API - Provides a list of events (based on the RoomBooking table)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from ..Certification.deps import get_db
from app.data_models.models import RoomBooking, Room as RoomModel
from ..routers.schemas import EventOut

router = APIRouter(tags=["events"])

# Type Classification Mapping
TYPE_CATEGORY_MAP = {
    # ACADEMIC
    "PRESENTATION": "ACADEMIC",
    "MEETING": "ACADEMIC",
    # CULTURE
    "WORKSHOP": "CULTURE",
    "EXHIBITION": "CULTURE",
    "SCREENING": "CULTURE",
    # SOCIAL
    "PARTY": "SOCIAL",
    "CLUB_EVENT": "SOCIAL",
    "MOVEMENT": "SOCIAL",
}


def get_event_category(event_type: str | None) -> str | None:
    """Return the category (ACADEMIC/CULTURE/SOCIAL) based on the specific type."""
    if not event_type:
        return None
    return TYPE_CATEGORY_MAP.get(event_type.strip().upper())


@router.get("/events", response_model=list[EventOut])
def list_events(
    event_type: str | None = Query(default=None, description="Filter by Activity Category (ACADEMIC, CULTURE, SOCIAL)"),
    db: DBSession = Depends(get_db),
):
    """
    Retrieve all events with posters - for the event list page
    
    Parameters:
        event_type: Optional, filter by category (ACADEMIC, CULTURE, SOCIAL)
    
    Returns:
        Event list sorted in ascending order by start time (frontend will group by month)）
    """
    query = (
        select(RoomBooking)
        .where(RoomBooking.poster_url.is_not(None))
        .order_by(RoomBooking.start_time_utc.asc())  
    )
    
    events = db.scalars(query).all()
    
    result = []
    for event in events:
        category = get_event_category(event.type)
        
        if event_type and category != event_type.strip().upper():
            continue
        
        room = db.get(RoomModel, event.room_id)
        
        result.append(EventOut(
            id=event.id,
            room_id=event.room_id,
            ifcroom_id=room.ifcroom_id if room else None,
            activity_title=event.activity_title,
            lead_organizer=event.lead_organizer,
            attendee_count=event.attendee_count,
            slogan=event.slogan,
            type=event.type,
            category=category,
            start_time_utc=event.start_time_utc,
            end_time_utc=event.end_time_utc,
            poster_url=event.poster_url,
            created_at_utc=event.created_at_utc,
        ))
    
    return result


