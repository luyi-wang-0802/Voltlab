# app/routers/room_bookings.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session as DBSession

from ..Certification.deps import get_db
from ..Certification.auth import require_session
from app.data_models.models import Room as RoomModel, RoomBooking
from ..routers.schemas import RoomBookingCreate, RoomBookingOut

router = APIRouter(tags=["room_bookings"])


def _parse_semicolon_list(s: str | None) -> list[str]:
    if not s:
        return []
    return [x.strip() for x in s.split(";") if x.strip()]


def _norm(s: str) -> str:
    return s.strip().upper()


def ensure_time_valid(start, end):
    if start is None or end is None:
        raise HTTPException(status_code=400, detail="start_time_utc and end_time_utc are required")
    if start >= end:
        raise HTTPException(status_code=400, detail="Invalid time range: start_time_utc must be < end_time_utc")


def ensure_capacity_ok(room: RoomModel, attendee_count: int):
    cap = room.spacebooking_max_occupancy
    # Conservative Strategy: If cap is empty, creation is not permitted (to prevent "infinite capacity").
    if cap is None:
        raise HTTPException(status_code=400, detail="Room capacity is not configured")
    if attendee_count > cap:
        raise HTTPException(status_code=400, detail=f"Capacity exceeded: max={cap}, requested={attendee_count}")


def has_conflict(db: DBSession, room_id: int, start, end) -> bool:
    # overlap: existing.start < new.end AND existing.end > new.start
    stmt = (
        select(RoomBooking.id)
        .where(RoomBooking.room_id == room_id)
        .where(RoomBooking.start_time_utc < end)
        .where(RoomBooking.end_time_utc > start)
        .limit(1)
    )
    return db.scalar(stmt) is not None


def ensure_type_allowed(room: RoomModel, booking_type: str):
    """
    Only called when booking_type is not empty.
    allowed_event_types is empty => No types allowed (conservative)
    """
    allowed = {_norm(x) for x in _parse_semicolon_list(room.spacebooking_allowed_event_types)}
    if not allowed:
        raise HTTPException(status_code=400, detail="Room has no allowed event types configured")
    if _norm(booking_type) not in allowed:
        raise HTTPException(status_code=400, detail="Booking type not allowed for this room")



@router.post("/room_bookings", response_model=RoomBookingOut)
def create_room_booking(
    payload: RoomBookingCreate,
    db: DBSession = Depends(get_db),
    current=Depends(require_session),
):
    # 1) 时间范围
    ensure_time_valid(payload.start_time_utc, payload.end_time_utc)

    # 2) Search for rooms by ifcroom_id
    room = db.scalars(
        select(RoomModel).where(RoomModel.ifcroom_id == payload.ifcroom_id)
    ).first()
    
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")

    # 3) bookable
    if room.spacebooking_is_bookable is False:
        raise HTTPException(status_code=400, detail="Room is not bookable")

    ensure_capacity_ok(room, payload.attendee_count)

    # 5) allowed type
    if payload.type is not None and payload.type.strip():
        ensure_type_allowed(room, payload.type)

    # 6) conflict detection - use room.id
    if has_conflict(db, room.id, payload.start_time_utc, payload.end_time_utc):
        raise HTTPException(status_code=409, detail="Time conflict: room already booked")

    b = RoomBooking(
        room_id=room.id,  # Use the retrieved room.id as a foreign key.
        session_id=current.id,
        type=payload.type,
        activity_title=payload.activity_title,
        lead_organizer=payload.lead_organizer,
        attendee_count=payload.attendee_count,
        slogan=payload.slogan,
        start_time_utc=payload.start_time_utc,
        end_time_utc=payload.end_time_utc,
        poster_url=payload.poster_url,
    )

    try:
        db.add(b)
        db.commit()
        db.refresh(b)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

    return b




