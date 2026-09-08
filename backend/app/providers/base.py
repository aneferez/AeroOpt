from abc import ABC, abstractmethod

from app.schemas.flight import AirportSuggestion, NormalizedFlightOffer, SearchRequest


class ProviderError(RuntimeError):
    def __init__(self, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.retryable = retryable


class FlightProvider(ABC):
    name: str
    mode: str = "live"

    @abstractmethod
    async def search_flights(self, request: SearchRequest) -> list[NormalizedFlightOffer]: ...

    @abstractmethod
    async def get_offer(self, provider_offer: dict) -> dict: ...

    @abstractmethod
    async def get_airports(self, query: str) -> list[AirportSuggestion]: ...

    @abstractmethod
    async def get_airlines(self, codes: list[str]) -> dict[str, str]: ...

    @abstractmethod
    async def get_fare_rules(self, provider_offer: dict) -> dict: ...

    async def close(self) -> None:
        return None
