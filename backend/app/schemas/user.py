from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

ALLOWED_WEIGHT_KEYS = {
    "price",
    "duration",
    "layover",
    "reliability",
    "baggage",
    "schedule",
    "airport_convenience",
    "fare_flexibility",
    "connection_risk",
}


class PreferenceUpdate(BaseModel):
    profile: Literal["budget", "business", "comfort", "family", "balanced", "custom"]
    weights: dict[str, float] | None = None
    preferred_departure_period: Literal["morning", "afternoon", "evening", "night"] | None = None
    max_stops: int = Field(default=1, ge=0, le=4)
    checked_bag_required: bool = False
    value_of_time: float = Field(default=500, ge=0, le=10000)
    preferred_airports: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, weights: dict[str, float] | None):
        if weights is None:
            return weights
        unknown = set(weights) - ALLOWED_WEIGHT_KEYS
        if unknown:
            raise ValueError(f"Unknown weight dimensions: {', '.join(sorted(unknown))}")
        if any(value < 0 or value > 1 for value in weights.values()):
            raise ValueError("Each weight must be between 0 and 1")
        if sum(weights.values()) <= 0:
            raise ValueError("At least one weight must be greater than zero")
        return weights

    @field_validator("preferred_airports")
    @classmethod
    def uppercase_airports(cls, airports: list[str]) -> list[str]:
        clean = [airport.upper() for airport in airports]
        if any(len(airport) != 3 or not airport.isalpha() for airport in clean):
            raise ValueError("Preferred airports must be IATA codes")
        return clean


class PreferenceResponse(PreferenceUpdate):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SaveFlightRequest(BaseModel):
    provider: str = Field(min_length=2, max_length=40)
    provider_offer_id: str = Field(min_length=1, max_length=160)
    offer_snapshot: dict
    score_snapshot: dict
    label: str | None = Field(default=None, max_length=100)


class SavedFlightResponse(SaveFlightRequest):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertCreate(BaseModel):
    saved_flight_id: str | None = None
    origin: str = Field(pattern=r"^[A-Za-z]{3}$")
    destination: str = Field(pattern=r"^[A-Za-z]{3}$")
    departure_date: date
    target_price: float = Field(gt=0)
    currency: str = Field(default="INR", pattern=r"^[A-Za-z]{3}$")
    notification_email: EmailStr

    @field_validator("origin", "destination", "currency")
    @classmethod
    def uppercase_codes(cls, value: str) -> str:
        return value.upper()


class AlertResponse(AlertCreate):
    id: str
    is_active: bool
    last_checked_at: datetime | None
    last_price: float | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TripCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    destination: str = Field(min_length=2, max_length=120)
    starts_on: date | None = None
    ends_on: date | None = None
    itinerary: dict = Field(default_factory=dict)


class TripResponse(TripCreate):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DashboardResponse(BaseModel):
    saved_flights: int
    active_alerts: int
    upcoming_trips: int
    recent_searches: int
