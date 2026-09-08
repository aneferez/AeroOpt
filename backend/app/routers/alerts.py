from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.repositories.travel import TravelRepository
from app.routers.dependencies import get_current_user
from app.schemas.user import AlertCreate, AlertResponse

router = APIRouter(prefix="/alerts", tags=["price alerts"])


@router.get("", response_model=list[AlertResponse])
def list_alerts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return TravelRepository(db).list_alerts(user.id)


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: AlertCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return TravelRepository(db).create_alert(user.id, payload)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def disable_alert(
    alert_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if not TravelRepository(db).disable_alert(user.id, alert_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
