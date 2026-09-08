from app.core.config import Settings, get_settings
from app.providers.amadeus import AmadeusProvider
from app.providers.base import FlightProvider, ProviderError
from app.providers.demo import DemoProvider


def get_flight_provider(settings: Settings | None = None) -> FlightProvider:
    settings = settings or get_settings()
    live_configured = bool(settings.amadeus_client_id and settings.amadeus_client_secret)
    if settings.flight_provider == "amadeus" or (
        settings.flight_provider == "auto" and live_configured
    ):
        return AmadeusProvider(settings)
    if settings.allow_demo_provider and not settings.is_production:
        return DemoProvider()
    raise ProviderError("No live flight provider is configured")
