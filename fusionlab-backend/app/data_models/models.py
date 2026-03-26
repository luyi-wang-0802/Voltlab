# app/models.py (or app/data_models/models.py)  — keep your actual path consistent
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    name: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    # optional, but useful later
    room_bookings = relationship("RoomBooking", back_populates="session")


class Room(Base):
    """
    Stable layer. One row per IFC Space (GlobalId).
    Loaded once and treated as immutable reference data.
    """
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    global_id: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    ifcroom_id: Mapped[str | None] = mapped_column(String, nullable=False, unique=True, index=True)
    floor: Mapped[str | None] = mapped_column(String, nullable=True)  # ← 添加：楼层
    spacebooking_allowed_event_types: Mapped[str | None] = mapped_column(String, nullable=True)
    spacebooking_bookable_by_role: Mapped[str | None] = mapped_column(String, nullable=True)
    spacebooking_existing_equipment: Mapped[str | None] = mapped_column(String, nullable=True)

    spacebooking_is_bookable: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    spacebooking_is_enclosed_space: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    spacebooking_max_occupancy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spacebooking_noise_sensitivity: Mapped[str | None] = mapped_column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("global_id", name="uq_rooms_global_id"),
        UniqueConstraint("ifcroom_id", name="uq_rooms_ifcroom_id"),
    )

    # optional, but useful later
    room_bookings = relationship("RoomBooking", back_populates="room")


class RoomBooking(Base):
    __tablename__ = "room_bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)

    activity_title: Mapped[str] = mapped_column(String, nullable=False)
    lead_organizer: Mapped[str] = mapped_column(String, nullable=False)
    attendee_count: Mapped[int] = mapped_column(Integer, nullable=False)
    slogan: Mapped[str] = mapped_column(String, nullable=False)

    type: Mapped[str | None] = mapped_column(String, nullable=True)

    start_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    poster_url: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    room = relationship("Room", back_populates="room_bookings")
    session = relationship("Session", back_populates="room_bookings")


class UserLike(Base):
    """User Like Activity Table"""
    __tablename__ = "user_likes"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("room_bookings.id"), nullable=False, index=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    
    # Ensure that a user can only like the same activity once.
    __table_args__ = (
        UniqueConstraint("session_id", "booking_id", name="uq_user_booking_like"),
    )
    
    session = relationship("Session")
    booking = relationship("RoomBooking")


class Seat(Base):
    """
    Seat model for individual furniture bookings.
    Loaded from IFC IfcFurniture with Pset_Fusion_SeatBooking.
    """
    __tablename__ = "seats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    global_id: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    seat_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)

    is_bookable: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    is_in_ifc_space: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    power_outlet_available: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    __table_args__ = (UniqueConstraint("global_id", name="uq_seats_global_id"),)

    # Relationships
    seat_bookings = relationship("SeatBooking", back_populates="seat")


class SeatBooking(Base):
    """Seat booking model - simpler than room bookings, no event metadata."""
    __tablename__ = "seat_bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    seat_id: Mapped[int] = mapped_column(ForeignKey("seats.id"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)

    start_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    created_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    # Relationships
    seat = relationship("Seat", back_populates="seat_bookings")
    session = relationship("Session")
