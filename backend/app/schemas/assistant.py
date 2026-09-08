from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class NaturalLanguageQueryRequest(BaseModel):
    query: str = Field(min_length=5, max_length=1000)


class TravelQueryExtraction(BaseModel):
    origin: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    destination: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    departure_date: date | None = None
    return_date: date | None = None
    departure_period: Literal["morning", "afternoon", "evening", "night"] | None = None
    return_period: Literal["morning", "afternoon", "evening", "night"] | None = None
    max_stops: int | None = Field(default=None, ge=0, le=4)
    priority: Literal["price", "duration", "comfort", "reliability", "balanced"] = "balanced"
    travelers: int = Field(default=1, ge=1, le=9)
    cabin: Literal["economy", "premium_economy", "business", "first"] = "economy"
    missing_fields: list[str] = Field(default_factory=list)

    @field_validator("origin", "destination", mode="before")
    @classmethod
    def uppercase_airports(cls, value):
        return value.upper() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.return_date and self.departure_date and self.return_date < self.departure_date:
            raise ValueError("Return date cannot precede departure date")
        return self


class NaturalLanguageQueryResponse(BaseModel):
    extraction: TravelQueryExtraction
    interpretation: str
    mode: Literal["ai", "rules"]
    ready_to_search: bool
