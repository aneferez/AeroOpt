from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Cabin = Literal["economy", "premium_economy", "business", "first"]
ProfileName = Literal["budget", "business", "comfort", "family", "balanced", "custom"]


class Airport(BaseModel):
    iata_code: str = Field(pattern=r"^[A-Z]{3}$")
    name: str
    city: str
    country: str


class FlightSegment(BaseModel):
    origin: str = Field(pattern=r"^[A-Z]{3}$")
    destination: str = Field(pattern=r"^[A-Z]{3}$")
    departure_at: datetime
    arrival_at: datetime
    carrier_code: str = Field(min_length=2, max_length=3)
    flight_number: str
    duration_minutes: int = Field(gt=0)
    aircraft: str | None = None


class BaggageAllowance(BaseModel):
    cabin_bags: int = Field(default=1, ge=0, le=4)
    checked_bags: int = Field(default=0, ge=0, le=4)
    checked_weight_kg: float = Field(default=0, ge=0, le=100)


class FareDetails(BaseModel):
    cabin: Cabin
    fare_brand: str | None = None
    changeable: bool = False
    refundable: bool = False
    change_fee: float | None = Field(default=None, ge=0)


class NormalizedFlightOffer(BaseModel):
    id: str
    provider: str
    provider_offer_id: str
    validating_airline: str
    airline_name: str
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    base_price: float = Field(gt=0)
    total_price: float = Field(gt=0)
    expected_baggage_fee: float = Field(default=0, ge=0)
    estimated_ground_cost: float = Field(default=0, ge=0)
    duration_minutes: int = Field(gt=0)
    stops: int = Field(ge=0, le=8)
    total_layover_minutes: int = Field(ge=0)
    overnight_layover: bool = False
    self_transfer: bool = False
    baggage: BaggageAllowance
    fare: FareDetails
    segments: list[FlightSegment] = Field(min_length=1)
    reliability: float = Field(default=0.75, ge=0, le=1)
    airport_convenience: float = Field(default=0.75, ge=0, le=1)
    connection_risk: float = Field(default=0.15, ge=0, le=1)
    bookable_seats: int | None = Field(default=None, ge=0)
    last_ticketing_date: date | None = None
    fetched_at: datetime


class SearchRequest(BaseModel):
    origin: str = Field(pattern=r"^[A-Za-z]{3}$")
    destination: str = Field(pattern=r"^[A-Za-z]{3}$")
    departure_date: date
    return_date: date | None = None
    adults: int = Field(default=1, ge=1, le=9)
    cabin: Cabin = "economy"
    max_stops: int | None = Field(default=2, ge=0, le=4)
    max_price: float | None = Field(default=None, gt=0)
    currency: str = Field(default="INR", pattern=r"^[A-Za-z]{3}$")
    profile: ProfileName = "balanced"
    custom_weights: dict[str, float] | None = None
    preferred_departure_period: Literal["morning", "afternoon", "evening", "night"] | None = None
    checked_bag_required: bool = False
    value_of_time: float = Field(default=500, ge=0, le=10000)

    @field_validator("origin", "destination", "currency")
    @classmethod
    def uppercase_codes(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def validate_route_and_dates(self):
        if self.origin == self.destination:
            raise ValueError("Origin and destination must be different")
        if self.return_date and self.return_date < self.departure_date:
            raise ValueError("Return date cannot be before departure date")
        return self


class ScoreBreakdown(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    price_score: float = Field(ge=0, le=100)
    duration_score: float = Field(ge=0, le=100)
    layover_score: float = Field(ge=0, le=100)
    reliability_score: float = Field(ge=0, le=100)
    baggage_score: float = Field(ge=0, le=100)
    schedule_score: float = Field(ge=0, le=100)
    airport_convenience_score: float = Field(ge=0, le=100)
    fare_flexibility_score: float = Field(ge=0, le=100)
    connection_risk_score: float = Field(ge=0, le=100)
    estimated_true_cost: float = Field(gt=0)
    applied_weights: dict[str, float]
    explanation_factors: list[str]


class RankedOffer(BaseModel):
    offer: NormalizedFlightOffer
    score: ScoreBreakdown
    badges: list[str] = []


class RecommendationSet(BaseModel):
    smart_pick_id: str
    cheapest_id: str
    fastest_id: str
    best_value_id: str
    lowest_risk_id: str


class SearchMeta(BaseModel):
    search_id: str | None = None
    provider: str
    provider_mode: Literal["live", "demo"]
    cached: bool
    cache_ttl_seconds: int
    fetched_at: datetime
    price_disclaimer: str


class SearchResponse(BaseModel):
    offers: list[RankedOffer]
    recommendations: RecommendationSet
    meta: SearchMeta


class AirportSuggestion(BaseModel):
    iata_code: str
    name: str
    city: str
    country: str
    score: float = Field(default=1, ge=0, le=1)
