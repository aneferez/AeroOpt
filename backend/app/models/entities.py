from datetime import UTC, date, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def uid() -> str:
    return str(uuid4())


def utcnow() -> datetime:
    return datetime.now(UTC)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    preferences: Mapped["UserPreference"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    refresh_sessions: Mapped[list["RefreshSession"]] = relationship(cascade="all, delete-orphan")


class UserPreference(TimestampMixin, Base):
    __tablename__ = "user_preferences"
    __table_args__ = (CheckConstraint("value_of_time >= 0", name="ck_preferences_value_of_time"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    profile: Mapped[str] = mapped_column(String(20), default="balanced", nullable=False)
    weights: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    preferred_departure_period: Mapped[str | None] = mapped_column(String(20))
    max_stops: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    checked_bag_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    value_of_time: Mapped[float] = mapped_column(Float, default=500.0, nullable=False)
    preferred_airports: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    user: Mapped[User] = relationship(back_populates="preferences")


class Search(TimestampMixin, Base):
    __tablename__ = "searches"
    __table_args__ = (Index("ix_search_route_date", "origin", "destination", "departure_date"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date | None] = mapped_column(Date)
    cabin: Mapped[str] = mapped_column(String(20), nullable=False)
    travelers: Mapped[int] = mapped_column(Integer, nullable=False)
    filters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    result_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)


class FlightOffer(TimestampMixin, Base):
    """Short-lived provider snapshots, persisted only for saved/alerted offers when enabled."""

    __tablename__ = "flight_offers"
    __table_args__ = (Index("ix_offer_provider_reference", "provider", "provider_offer_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    search_id: Mapped[str | None] = mapped_column(
        ForeignKey("searches.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    provider_offer_id: Mapped[str] = mapped_column(String(160), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    normalized_data: Mapped[dict] = mapped_column(JSON, nullable=False)


class SavedFlight(TimestampMixin, Base):
    __tablename__ = "saved_flights"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", "provider_offer_id", name="uq_saved_offer"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    provider_offer_id: Mapped[str] = mapped_column(String(160), nullable=False)
    offer_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    score_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    label: Mapped[str | None] = mapped_column(String(100))


class Alert(TimestampMixin, Base):
    __tablename__ = "alerts"
    __table_args__ = (CheckConstraint("target_price > 0", name="ck_alert_target_price"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    saved_flight_id: Mapped[str | None] = mapped_column(
        ForeignKey("saved_flights.id", ondelete="SET NULL"), index=True
    )
    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    target_price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_price: Mapped[float | None] = mapped_column(Float)
    notification_email: Mapped[str] = mapped_column(String(320), nullable=False)


class Trip(TimestampMixin, Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    destination: Mapped[str] = mapped_column(String(120), nullable=False)
    starts_on: Mapped[date | None] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="planning", index=True, nullable=False)
    itinerary: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class PriceHistory(Base):
    __tablename__ = "price_history"
    __table_args__ = (
        Index("ix_price_history_route_observed", "origin", "destination", "observed_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    alert_id: Mapped[str | None] = mapped_column(
        ForeignKey("alerts.id", ondelete="CASCADE"), index=True
    )
    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )


class Recommendation(TimestampMixin, Base):
    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    search_id: Mapped[str] = mapped_column(
        ForeignKey("searches.id", ondelete="CASCADE"), index=True
    )
    offer_reference: Mapped[str] = mapped_column(String(160), nullable=False)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    explanation: Mapped[list] = mapped_column(JSON, nullable=False)


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"
    __table_args__ = (Index("ix_refresh_user_active", "user_id", "revoked_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(Text)
