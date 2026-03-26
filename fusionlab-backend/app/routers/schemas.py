from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ---------- Sessions ----------

class SessionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


# ---------- Rooms ----------

class RoomSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    ifcroom_id: Optional[str] = None
    floor: Optional[str] = None
    area: Optional[float] = None
    spacebooking_max_occupancy: Optional[int] = None
    spacebooking_is_bookable: Optional[bool] = None
    spacebooking_existing_equipment: Optional[str] = None
    spacebooking_allowed_event_types: Optional[str] = None


class RoomSearchRequest(BaseModel):
    start_time_utc: datetime
    end_time_utc: datetime
    attendee_count: int
    event_type: Optional[str] = None
    required_equipment: Optional[List[str]] = None


class RoomMatchOut(BaseModel):
    room: RoomSummaryOut
    match_score: float


# ---------- Room Bookings ----------

class RoomBookingCreate(BaseModel):
    ifcroom_id: str
    activity_title: str = Field(min_length=1, max_length=200)
    lead_organizer: str = Field(min_length=1, max_length=100)
    attendee_count: int = Field(ge=1)
    slogan: str = Field(min_length=1, max_length=500)
    type: Optional[str] = None
    start_time_utc: datetime
    end_time_utc: datetime
    poster_url: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def normalize_empty_strings(cls, data):
        """Convert empty strings to None to enhance frontend compatibility."""
        if isinstance(data, dict):
            if 'poster_url' in data and data['poster_url'] == '':
                data['poster_url'] = None
            if 'type' in data and data['type'] == '':
                data['type'] = None
        return data


class RoomBookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    ifcroom_id: Optional[str] = None
    session_id: str
    activity_title: str
    lead_organizer: str
    attendee_count: int
    slogan: str
    type: Optional[str] = None
    start_time_utc: datetime
    end_time_utc: datetime
    poster_url: Optional[str] = None
    created_at_utc: datetime


# ---------- Seats ----------

class SeatSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    seat_id: Optional[str] = None
    floor: Optional[str] = None
    is_in_ifc_space: Optional[str] = None
    power_outlet_available: Optional[bool] = None


class SeatSearchRequest(BaseModel):
    start_time_utc: datetime
    end_time_utc: datetime
    floor: Optional[str] = None
    need_power: Optional[bool] = None


class SeatMatchOut(BaseModel):
    seat: SeatSummaryOut
    match_score: float 


# ---------- Seat Bookings ----------

class SeatBookingCreate(BaseModel):
    seat_id: int
    start_time_utc: datetime
    end_time_utc: datetime


class SeatBookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    seat_id: int
    session_id: str
    start_time_utc: datetime
    end_time_utc: datetime
    created_at_utc: datetime


# ---------- Events ----------

class EventOut(BaseModel):
    """Event Output (Events with Posters)"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    room_id: int
    ifcroom_id: Optional[str] = None  
    activity_title: str
    lead_organizer: str
    attendee_count: int
    slogan: str  
    type: Optional[str] = None
    category: Optional[str] = None  
    start_time_utc: datetime
    end_time_utc: datetime
    poster_url: Optional[str] = None
    created_at_utc: datetime

    # Frontend display fields (using Field's default_factory instead of relying on validator)
    month: int = 0
    date: str = ""
    time: str = ""
    location: str = ""
    imageUrl: str = ""
    title: str = ""
    price: str = "Free"
    
    @model_validator(mode='after')
    def compute_display_fields(self):
        """Calculated Display Field (UTC time, converted by the frontend)"""
        # Select month
        self.month = self.start_time_utc.month
        
        month_names = [
            'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
            'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
        ]
        self.date = f"{self.start_time_utc.day} {month_names[self.start_time_utc.month - 1]} {self.start_time_utc.year}"
        
        hour = self.start_time_utc.hour
        minute = self.start_time_utc.minute
        am_pm = 'AM' if hour < 12 else 'PM'
        display_hour = hour if hour <= 12 else hour - 12
        if display_hour == 0:
            display_hour = 12
        self.time = f"AT {display_hour}:{minute:02d} {am_pm}"
        
        if self.ifcroom_id:
            self.location = f"Room {self.ifcroom_id}, VoltLab"
        else:
            self.location = "VoltLab"
        
        self.imageUrl = self.poster_url or ""
        self.title = self.activity_title
        
        return self


# ---------- Profile ----------

class BookingItemOut(BaseModel):
    """Reservations in User Profile"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    activity_title: str
    lead_organizer: str
    attendee_count: int
    slogan: str
    type: Optional[str] = None
    start_time_utc: datetime
    end_time_utc: datetime
    ifcroom_id: Optional[str] = None
    created_at_utc: datetime
    status: str = "CONFIRMED"


class ProfileOut(BaseModel):
    """User Profile"""
    activities: list[EventOut] = Field(default_factory=list)
    bookings: list[BookingItemOut] = Field(default_factory=list)

# ---------- Profile Bookings ----------

class SeatBookingDisplayOut(BaseModel):
    """Seat Reservation Display - For Profile Page"""
    id: str
    date: str
    day: str
    time: str
    seat: str
    location: str
    status: str


class RoomBookingDisplayOut(BaseModel):
    """Room Reservation Display - For Profile Page"""
    id: str
    date: str
    day: str
    time: str
    room: str
    location: str
    status: str
    activity_title: str