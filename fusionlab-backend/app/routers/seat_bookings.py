# app/routers/seat_bookings.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session as DBSession
from ..Certification.deps import get_db
from ..Certification.auth import require_session
from app.data_models.models import Seat as SeatModel, SeatBooking, Room as RoomModel
from ..routers.schemas import SeatSummaryOut, SeatSearchRequest, SeatMatchOut, SeatBookingCreate, SeatBookingOut
from datetime import datetime, timezone

router = APIRouter(tags=["seat_bookings"])


def _get_floor_from_seat(db: DBSession, seat: SeatModel) -> str | None:
    """Query the corresponding floor based on the seat's is_in_ifc_space or seat_id."""
    room_id = seat.is_in_ifc_space or seat.seat_id
    
    if not room_id:
        return None
    
    room = db.scalar(
        select(RoomModel)
        .where(RoomModel.ifcroom_id == room_id)
        .limit(1)
    )
    
    return room.floor if room else None


def _seat_to_summary(db: DBSession, s: SeatModel) -> SeatSummaryOut:
    """Convert to SeatSummaryOut, including floor information"""
    floor = _get_floor_from_seat(db, s)
    
    return SeatSummaryOut(
        id=s.id,
        seat_id=s.seat_id,
        floor=floor,
        is_in_ifc_space=s.is_in_ifc_space,
        power_outlet_available=s.power_outlet_available,
        is_bookable=s.is_bookable
    )


def _compute_match(db: DBSession, s: SeatModel, req: SeatSearchRequest) -> tuple[bool, float]:
    """
    Return (ok, match_score)
    
    Hard filters:
    - is_bookable must be True
    - need_power check (if power supply is required)
    - time slot conflict detection
    """
    if s.is_bookable is not True:
        return (False, 0.0)
    
    if req.need_power is True and s.power_outlet_available is not True:
        return (False, 0.0)
    
    if req.start_time_utc is not None and req.end_time_utc is not None:
        if req.start_time_utc >= req.end_time_utc:
            return (False, 0.0)
        
        conflict_stmt = (
            select(SeatBooking.id)
            .where(SeatBooking.seat_id == s.id)
            .where(SeatBooking.start_time_utc < req.end_time_utc)
            .where(SeatBooking.end_time_utc > req.start_time_utc)
            .limit(1)
        )
        if db.scalar(conflict_stmt) is not None:
            return (False, 0.0)
    
    if s.power_outlet_available:
        return (True, 1.0)
    else:
        return (True, 0.5)


@router.post("/seats/search", response_model=list[SeatMatchOut])
def search_seats(
    payload: SeatSearchRequest,
    db: DBSession = Depends(get_db),
    current=Depends(require_session)
):
    """
    Search for available seats
    - Filter criteria: Time period, Power outlet required
    - Return a list of matching seats, sorted by rating
    """
    seats = db.scalars(select(SeatModel)).all()
    
    results: list[SeatMatchOut] = []
    for seat in seats:
        ok, score = _compute_match(db, seat, payload)
        if not ok:
            continue
        
        seat_summary = _seat_to_summary(db, seat)
        
        if payload.floor is not None and seat_summary.floor != payload.floor:
            continue
        
        results.append(SeatMatchOut(seat=seat_summary, match_score=score))
    
    results.sort(key=lambda x: (-x.match_score, x.seat.id))
    return results


@router.post("/seat_bookings", response_model=SeatBookingOut)
def create_seat_booking(
    payload: SeatBookingCreate,
    db: DBSession = Depends(get_db),
    current=Depends(require_session)
):
    """
    Create Seat Reservation
    - Validate time slot validity and seat availability
    - Check for time conflicts
    """
    if payload.start_time_utc >= payload.end_time_utc:
        raise HTTPException(status_code=400, detail="The start time must be earlier than the end time.")
    
    seat = db.scalar(select(SeatModel).where(SeatModel.id == payload.seat_id))
    if not seat:
        raise HTTPException(status_code=404, detail="The seat does not exist.")
    if seat.is_bookable is not True:
        raise HTTPException(status_code=400, detail="This seat is not available for reservation.")
    
    conflict = db.scalar(
        select(SeatBooking.id)
        .where(SeatBooking.seat_id == payload.seat_id)
        .where(SeatBooking.start_time_utc < payload.end_time_utc)
        .where(SeatBooking.end_time_utc > payload.start_time_utc)
        .limit(1)
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Seats for this time slot have been reserved.")
    
    booking = SeatBooking(
        seat_id=payload.seat_id,
        session_id=current.id,
        start_time_utc=payload.start_time_utc,
        end_time_utc=payload.end_time_utc,
    )
    
    try:
        db.add(booking)
        db.commit()
        db.refresh(booking)
        return booking
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create reservation: {str(e)}")
