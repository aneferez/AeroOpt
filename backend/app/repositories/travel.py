from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Alert, SavedFlight, Search
from app.schemas.flight import SearchRequest
from app.schemas.user import AlertCreate, SaveFlightRequest


class TravelRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record_search(
        self, request: SearchRequest, provider: str, result_count: int, user_id: str | None
    ) -> Search:
        search = Search(
            user_id=user_id,
            origin=request.origin,
            destination=request.destination,
            departure_date=request.departure_date,
            return_date=request.return_date,
            cabin=request.cabin,
            travelers=request.adults,
            filters=request.model_dump(
                mode="json",
                exclude={
                    "origin",
                    "destination",
                    "departure_date",
                    "return_date",
                    "cabin",
                    "adults",
                },
            ),
            result_count=result_count,
            provider=provider,
        )
        self.db.add(search)
        self.db.commit()
        self.db.refresh(search)
        return search

    def list_saved(self, user_id: str) -> list[SavedFlight]:
        return list(
            self.db.scalars(
                select(SavedFlight)
                .where(SavedFlight.user_id == user_id)
                .order_by(SavedFlight.created_at.desc())
            )
        )

    def save_flight(self, user_id: str, request: SaveFlightRequest) -> SavedFlight:
        existing = self.db.scalar(
            select(SavedFlight).where(
                SavedFlight.user_id == user_id,
                SavedFlight.provider == request.provider,
                SavedFlight.provider_offer_id == request.provider_offer_id,
            )
        )
        if existing:
            existing.offer_snapshot = request.offer_snapshot
            existing.score_snapshot = request.score_snapshot
            existing.label = request.label
            saved = existing
        else:
            saved = SavedFlight(user_id=user_id, **request.model_dump())
            self.db.add(saved)
        self.db.commit()
        self.db.refresh(saved)
        return saved

    def delete_saved(self, user_id: str, saved_id: str) -> bool:
        saved = self.db.scalar(
            select(SavedFlight).where(SavedFlight.id == saved_id, SavedFlight.user_id == user_id)
        )
        if not saved:
            return False
        self.db.delete(saved)
        self.db.commit()
        return True

    def list_alerts(self, user_id: str) -> list[Alert]:
        return list(
            self.db.scalars(
                select(Alert).where(Alert.user_id == user_id).order_by(Alert.created_at.desc())
            )
        )

    def create_alert(self, user_id: str, request: AlertCreate) -> Alert:
        alert = Alert(user_id=user_id, **request.model_dump())
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def disable_alert(self, user_id: str, alert_id: str) -> bool:
        alert = self.db.scalar(select(Alert).where(Alert.id == alert_id, Alert.user_id == user_id))
        if not alert:
            return False
        alert.is_active = False
        self.db.commit()
        return True
