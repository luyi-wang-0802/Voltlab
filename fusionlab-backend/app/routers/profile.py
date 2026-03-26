# 创建新文件: w:\2526ws\fl-ws2025-group8\fusionlab-backend\app\routers\profile.py
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession
from datetime import datetime

from ..Certification.deps import get_db
from app.data_models.models import RoomBooking, SeatBooking, Room as RoomModel, Seat as SeatModel, Session as SessionModel
from ..routers.schemas import SeatBookingDisplayOut, RoomBookingDisplayOut

router = APIRouter(tags=["profile"])


def get_session_from_header(
    x_session_id: str = Header(None, alias="X-Session-id"),
    db: DBSession = Depends(get_db)
) -> SessionModel:
    """从 Header 获取 session"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Missing X-Session-ID header")
    
    session = db.get(SessionModel, x_session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    return session


def _get_floor_from_seat(db: DBSession, seat: SeatModel) -> str | None:
    """从 seat 的 is_in_ifc_space 或 seat_id 查询对应楼层"""
    room_id = seat.is_in_ifc_space or seat.seat_id
    
    if not room_id:
        return None
    
    room = db.scalar(
        select(RoomModel)
        .where(RoomModel.ifcroom_id == room_id)
        .limit(1)
    )
    
    return room.floor if room else None


@router.get("/profile/seat-bookings", response_model=list[SeatBookingDisplayOut])
def get_seat_bookings(
    current: SessionModel = Depends(get_session_from_header),
    db: DBSession = Depends(get_db)
):
    """Retrieve the user's seat reservation"""
    
    # Retrieve the current user's seat reservation
    seat_bookings = db.scalars(
        select(SeatBooking)
        .where(SeatBooking.session_id == current.id)
        .order_by(SeatBooking.start_time_utc.asc())
    ).all()
    
    result = []
    for booking in seat_bookings:
        seat = db.get(SeatModel, booking.seat_id)
        
        start_time = booking.start_time_utc
        end_time = booking.end_time_utc
        
        start_time_germany = datetime.fromtimestamp(start_time.timestamp() + 3600)
        end_time_germany = datetime.fromtimestamp(end_time.timestamp() + 3600)
        
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        date_str = f"{month_names[start_time_germany.month - 1]} {start_time_germany.day}"
        
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_str = day_names[start_time_germany.weekday()]
        
        time_str = f"{start_time_germany.strftime('%H:%M')} – {end_time_germany.strftime('%H:%M')}"
        
        seat_id_display = seat.seat_id if seat and seat.seat_id else f"S-{booking.seat_id:03d}"
        
        floor_info = _get_floor_from_seat(db, seat) if seat else None
        floor_display = floor_info if floor_info else "LEVEL 01"
        location = f"ZONE B / {floor_display}"
        
        result.append(SeatBookingDisplayOut(
            id=f"BK-{booking.id}",
            date=date_str,
            day=day_str,
            time=time_str,
            seat=seat_id_display,
            location=location,
            status="Confirmed"
        ))
    
    return result


@router.get("/profile/room-bookings", response_model=list[RoomBookingDisplayOut])
def get_room_bookings(
    current: SessionModel = Depends(get_session_from_header),
    db: DBSession = Depends(get_db)
):
    """Retrieve the user's room reservation"""
    
    # Retrieve the current user's room reservations
    room_bookings = db.scalars(
        select(RoomBooking)
        .where(RoomBooking.session_id == current.id)
        .order_by(RoomBooking.start_time_utc.asc())
    ).all()
    
    result = []
    for booking in room_bookings:
        room = db.get(RoomModel, booking.room_id)
        
        start_time = booking.start_time_utc
        end_time = booking.end_time_utc
        
        start_time_germany = datetime.fromtimestamp(start_time.timestamp() + 3600)
        end_time_germany = datetime.fromtimestamp(end_time.timestamp() + 3600)
        
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        date_str = f"{month_names[start_time_germany.month - 1]} {start_time_germany.day}"
        
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_str = day_names[start_time_germany.weekday()]
        
        time_str = f"{start_time_germany.strftime('%H:%M')} – {end_time_germany.strftime('%H:%M')}"
        
        room_name = room.ifcroom_id if room and room.ifcroom_id else booking.activity_title
        
        floor_info = room.floor if room and room.floor else "LEVEL 01"
        location = f"ZONE B / {floor_info}"
        
        result.append(RoomBookingDisplayOut(
            id=f"BK-{booking.id}",
            date=date_str,
            day=day_str,
            time=time_str,
            room=room_name,
            location=location,
            status="Confirmed",
            activity_title=booking.activity_title
        ))
    
    return result