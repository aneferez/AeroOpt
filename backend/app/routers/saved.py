from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.repositories.travel import TravelRepository
from app.routers.dependencies import get_current_user
from app.schemas.user import SavedFlightResponse, SaveFlightRequest

router = APIRouter(prefix="/saved-flights", tags=["saved flights"])


@router.get("", response_model=list[SavedFlightResponse])
def list_saved(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return TravelRepository(db).list_saved(user.id)


@router.post("", response_model=SavedFlightResponse, status_code=status.HTTP_201_CREATED)
def save_flight(
    payload: SaveFlightRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TravelRepository(db).save_flight(user.id, payload)


@router.delete("/{saved_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved(
    saved_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if not TravelRepository(db).delete_saved(user.id, saved_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved flight not found")
