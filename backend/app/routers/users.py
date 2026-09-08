from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Alert, SavedFlight, Search, Trip, User
from app.repositories.users import UserRepository
from app.routers.dependencies import get_current_user
from app.schemas.user import DashboardResponse, PreferenceResponse, PreferenceUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/preferences", response_model=PreferenceResponse)
def get_preferences(user: User = Depends(get_current_user)):
    return user.preferences


@router.put("/preferences", response_model=PreferenceResponse)
def update_preferences(
    payload: PreferenceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UserRepository(db).update_preferences(user, payload)


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scalar = lambda stmt: int(db.scalar(stmt) or 0)
    return DashboardResponse(
        saved_flights=scalar(
            select(func.count()).select_from(SavedFlight).where(SavedFlight.user_id == user.id)
        ),
        active_alerts=scalar(
            select(func.count())
            .select_from(Alert)
            .where(Alert.user_id == user.id, Alert.is_active.is_(True))
        ),
        upcoming_trips=scalar(
            select(func.count())
            .select_from(Trip)
            .where(Trip.user_id == user.id, Trip.status == "planning")
        ),
        recent_searches=scalar(
            select(func.count()).select_from(Search).where(Search.user_id == user.id)
        ),
    )
