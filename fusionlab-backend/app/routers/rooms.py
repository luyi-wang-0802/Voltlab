# app/routers/rooms.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from ..Certification.deps import get_db
from ..Certification.auth import require_session
from app.data_models.models import Room as RoomModel, RoomBooking
from ..routers.schemas import RoomSummaryOut, RoomSearchRequest, RoomMatchOut

router = APIRouter(tags=["rooms"])


def _parse_semicolon_list(s: str | None) -> list[str]:
    if not s:
        return []
    return [x.strip() for x in s.split(";") if x.strip()]


def _norm(s: str) -> str:
    return s.strip().upper()


def _room_to_summary(r: RoomModel) -> RoomSummaryOut:
    return RoomSummaryOut.model_validate(r)


def _compute_match(db: DBSession, r: RoomModel, req: RoomSearchRequest) -> tuple[bool, float]:
    """
    Return (ok, match_score)

    Hard filters (applies to subsequent bookings as well):
    - is_bookable must be True
    - attendee_count <= max_occupancy (max_occupancy is None: fail, conservative)
    - event_type is in allowed_event_types (allowed is empty: fail, conservative)
    - Time slot conflict detection (when both req.start and req.end are provided)
    """
    # bookable
    if r.spacebooking_is_bookable is not True:
        return (False, 0.0)

    cap = r.spacebooking_max_occupancy
    if cap is None or req.attendee_count > cap:
        return (False, 0.0)

    if req.event_type is not None:
        allowed = {_norm(x) for x in _parse_semicolon_list(r.spacebooking_allowed_event_types)}
        if not allowed:
            return (False, 0.0)
        if _norm(req.event_type) not in allowed:
            return (False, 0.0)

    if req.start_time_utc is not None and req.end_time_utc is not None:
        if req.start_time_utc >= req.end_time_utc:
            return (False, 0.0)

        conflict_stmt = (
            select(RoomBooking.id)
            .where(RoomBooking.room_id == r.id)
            .where(RoomBooking.start_time_utc < req.end_time_utc)
            .where(RoomBooking.end_time_utc > req.start_time_utc)
            .limit(1)
        )
        if db.scalar(conflict_stmt) is not None:
            return (False, 0.0)

    have = {_norm(x) for x in _parse_semicolon_list(r.spacebooking_existing_equipment)}
    need = [_norm(x) for x in (req.required_equipment or []) if x and x.strip()]

    if len(need) == 0:
        return (True, 1.0)

    missing = [x for x in need if x not in have]
    score = (len(need) - len(missing)) / len(need)
    return (True, float(score))



@router.post("/rooms/search", response_model=list[RoomMatchOut])
def search_rooms(
    payload: RoomSearchRequest,
    db: DBSession = Depends(get_db),
    current=Depends(require_session) 
):
    rooms = db.scalars(select(RoomModel)).all()

    results: list[RoomMatchOut] = []
    for r in rooms:
        ok, score = _compute_match(db, r, payload)  # ✅ Corrected: Pass db + parameter order
        if not ok:
            continue
        results.append(RoomMatchOut(room=_room_to_summary(r), match_score=score))

    results.sort(key=lambda x: (-x.match_score, x.room.id))
    return results