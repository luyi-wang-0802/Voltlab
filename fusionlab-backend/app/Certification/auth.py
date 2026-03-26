#This is a script usd for realizing require_session

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session as OrmSession

from .deps import get_db
from app.data_models.models import Session as SessionModel


def require_session(
    x_session_id: str | None = Header(default=None, alias="X-Session-id"),
    db: OrmSession = Depends(get_db),
) -> SessionModel:
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Missing X-Session-id")
    s = db.get(SessionModel, x_session_id)
    if s is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    return s
