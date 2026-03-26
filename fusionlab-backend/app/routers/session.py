# app/routers/session.py
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session as DBSession

from ..Certification.deps import get_db
from ..Certification.auth import require_session
from app.data_models.models import Session as SessionModel
from ..routers.schemas import SessionOut, SessionCreate

router = APIRouter(tags=["session"])


@router.post("/session", response_model=SessionOut)
def create_session(payload: SessionCreate, db: DBSession = Depends(get_db)):
    # If you enabled Pydantic v2: ConfigDict(str_strip_whitespace=True),
    # you can remove .strip() here. Keeping it is fine.
    s = SessionModel(id=str(uuid4()), name=payload.name.strip())

    try:
        db.add(s)
        db.commit()
        db.refresh(s)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

    return s


@router.get("/me", response_model=SessionOut)
def get_me(_current: SessionModel = Depends(require_session)):
    return _current


@router.get("/session/{session_id}", response_model=SessionOut)
def get_session(
    session_id: str,
    db: DBSession = Depends(get_db),
    _current: SessionModel = Depends(require_session),
):
    s = db.get(SessionModel, session_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return s
