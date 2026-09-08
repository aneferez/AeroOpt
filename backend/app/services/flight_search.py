from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.optimization.engine import rank_offers
from app.providers import get_flight_provider
from app.repositories.travel import TravelRepository
from app.schemas.flight import SearchMeta, SearchRequest, SearchResponse
from app.services.cache import search_cache


class FlightSearchService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()

    async def search(self, request: SearchRequest, user_id: str | None = None) -> SearchResponse:
        key = search_cache.key(request)
        cached = await search_cache.get(key)
        if cached:
            response = SearchResponse.model_validate(cached)
            response.meta.cached = True
            return response

        provider = get_flight_provider(self.settings)
        try:
            offers = await provider.search_flights(request)
        finally:
            await provider.close()
        if not offers:
            raise LookupError("No flights matched these dates and filters")
        ranked, recommendations = rank_offers(offers, request)
        record = TravelRepository(self.db).record_search(
            request, provider.name, len(ranked), user_id
        )
        fetched_at = max(offer.offer.fetched_at for offer in ranked)
        response = SearchResponse(
            offers=ranked,
            recommendations=recommendations,
            meta=SearchMeta(
                search_id=record.id,
                provider=provider.name,
                provider_mode=provider.mode,
                cached=False,
                cache_ttl_seconds=self.settings.cache_ttl_seconds,
                fetched_at=fetched_at if fetched_at else datetime.now(UTC),
                price_disclaimer="Airfares are snapshots, not guarantees. Revalidate with the provider before booking.",
            ),
        )
        await search_cache.set(
            key, response.model_dump(mode="json"), self.settings.cache_ttl_seconds
        )
        return response
