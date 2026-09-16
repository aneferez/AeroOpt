from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.providers import provider_status

router = APIRouter(tags=["operations"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}


@router.get("/status")
def status():
    """Public, secret-free view of the active flight provider — use it to
    confirm a live Amadeus cut-over (mode should read "live")."""
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.environment,
        **provider_status(settings),
    }
