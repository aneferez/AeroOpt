import re
from datetime import UTC, datetime

import httpx

from app.core.config import Settings
from app.providers.base import FlightProvider, ProviderError
from app.schemas.flight import (
    AirportSuggestion,
    BaggageAllowance,
    FareDetails,
    FlightSegment,
    NormalizedFlightOffer,
    SearchRequest,
)

DURATION_RE = re.compile(r"PT(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?")


def duration_minutes(value: str) -> int:
    match = DURATION_RE.fullmatch(value)
    if not match:
        raise ProviderError("Provider returned an invalid duration")
    return int(match.group("hours") or 0) * 60 + int(match.group("minutes") or 0)


class AmadeusProvider(FlightProvider):
    name = "amadeus"
    mode = "live"

    def __init__(self, settings: Settings) -> None:
        if not settings.amadeus_client_id or not settings.amadeus_client_secret:
            raise ProviderError("Amadeus credentials are not configured")
        self.settings = settings
        self.client = httpx.AsyncClient(base_url=settings.amadeus_base_url, timeout=20)
        self._token: str | None = None
        self._token_expires_at = 0.0

    async def _access_token(self) -> str:
        if self._token and self._token_expires_at > datetime.now(UTC).timestamp() + 30:
            return self._token
        response = await self.client.post(
            "/v1/security/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.settings.amadeus_client_id,
                "client_secret": self.settings.amadeus_client_secret,
            },
        )
        if response.status_code >= 400:
            raise ProviderError(
                "Flight provider authentication failed", retryable=response.status_code >= 500
            )
        payload = response.json()
        self._token = payload["access_token"]
        self._token_expires_at = datetime.now(UTC).timestamp() + int(payload.get("expires_in", 900))
        return self._token

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        token = await self._access_token()
        headers = {**kwargs.pop("headers", {}), "Authorization": f"Bearer {token}"}
        try:
            response = await self.client.request(method, path, headers=headers, **kwargs)
        except httpx.HTTPError as exc:
            raise ProviderError(
                "Flight provider is temporarily unavailable", retryable=True
            ) from exc
        if response.status_code >= 400:
            detail = (
                response.json()
                .get("errors", [{}])[0]
                .get("detail", "Flight provider request failed")
            )
            raise ProviderError(detail, retryable=response.status_code >= 500)
        return response.json()

    async def search_flights(self, request: SearchRequest) -> list[NormalizedFlightOffer]:
        params = {
            "originLocationCode": request.origin,
            "destinationLocationCode": request.destination,
            "departureDate": request.departure_date.isoformat(),
            "adults": request.adults,
            "travelClass": request.cabin.upper(),
            "currencyCode": request.currency,
            "max": 40,
        }
        if request.return_date:
            params["returnDate"] = request.return_date.isoformat()
        if request.max_price:
            params["maxPrice"] = int(request.max_price)
        payload = await self._request("GET", "/v2/shopping/flight-offers", params=params)
        dictionaries = payload.get("dictionaries", {})
        carriers = dictionaries.get("carriers", {})
        return [
            self._normalize(item, carriers, request)
            for item in payload.get("data", [])
            if self._stop_count(item)
            <= (request.max_stops if request.max_stops is not None else 99)
        ]

    @staticmethod
    def _stop_count(item: dict) -> int:
        return sum(
            max(0, len(itinerary.get("segments", [])) - 1)
            for itinerary in item.get("itineraries", [])
        )

    def _normalize(
        self, item: dict, carriers: dict[str, str], request: SearchRequest
    ) -> NormalizedFlightOffer:
        segments: list[FlightSegment] = []
        layover_minutes = 0
        for itinerary in item["itineraries"]:
            raw_segments = itinerary["segments"]
            for index, segment in enumerate(raw_segments):
                departure = datetime.fromisoformat(segment["departure"]["at"])
                arrival = datetime.fromisoformat(segment["arrival"]["at"])
                segments.append(
                    FlightSegment(
                        origin=segment["departure"]["iataCode"],
                        destination=segment["arrival"]["iataCode"],
                        departure_at=departure,
                        arrival_at=arrival,
                        carrier_code=segment["carrierCode"],
                        flight_number=f"{segment['carrierCode']}{segment['number']}",
                        duration_minutes=duration_minutes(segment["duration"]),
                        aircraft=segment.get("aircraft", {}).get("code"),
                    )
                )
                if index:
                    previous_arrival = datetime.fromisoformat(
                        raw_segments[index - 1]["arrival"]["at"]
                    )
                    layover_minutes += max(
                        0, int((departure - previous_arrival).total_seconds() / 60)
                    )
        traveler = item.get("travelerPricings", [{}])[0]
        fare_segments = traveler.get("fareDetailsBySegment", [{}])
        checked = fare_segments[0].get("includedCheckedBags", {}) if fare_segments else {}
        weight = float(checked.get("weight", 0)) if checked.get("weightUnit") == "KG" else 0
        quantity = int(checked.get("quantity", 1 if weight else 0))
        price = item["price"]
        total_duration = sum(
            duration_minutes(itinerary["duration"]) for itinerary in item["itineraries"]
        )
        stops = self._stop_count(item)
        min_layover = min(
            [layover_minutes] if stops else [180],
        )
        risk = min(0.8, 0.07 + stops * 0.12 + (0.18 if 0 < min_layover < 60 else 0))
        validating = item.get("validatingAirlineCodes", [segments[0].carrier_code])[0]
        offer_id = str(item["id"])
        return NormalizedFlightOffer(
            id=f"amadeus-{offer_id}",
            provider=self.name,
            provider_offer_id=offer_id,
            validating_airline=validating,
            airline_name=carriers.get(validating, validating),
            currency=price["currency"],
            base_price=float(price.get("base", price["grandTotal"])),
            total_price=float(price["grandTotal"]),
            duration_minutes=total_duration,
            stops=stops,
            total_layover_minutes=layover_minutes,
            overnight_layover=any(
                segment.departure_at.date() != segment.arrival_at.date() for segment in segments
            ),
            self_transfer=False,
            baggage=BaggageAllowance(cabin_bags=1, checked_bags=quantity, checked_weight_kg=weight),
            fare=FareDetails(
                cabin=request.cabin,
                fare_brand=traveler.get("fareOption"),
                changeable=False,
                refundable=False,
            ),
            segments=segments,
            reliability=0.78,
            airport_convenience=0.75,
            connection_risk=risk,
            bookable_seats=item.get("numberOfBookableSeats"),
            last_ticketing_date=item.get("lastTicketingDate"),
            fetched_at=datetime.now(UTC),
        )

    async def get_offer(self, provider_offer: dict) -> dict:
        return await self._request(
            "POST",
            "/v1/shopping/flight-offers/pricing",
            json={"data": {"type": "flight-offers-pricing", "flightOffers": [provider_offer]}},
        )

    async def get_airports(self, query: str) -> list[AirportSuggestion]:
        payload = await self._request(
            "GET",
            "/v1/reference-data/locations",
            params={"subType": "AIRPORT", "keyword": query, "page[limit]": 8, "view": "LIGHT"},
        )
        return [
            AirportSuggestion(
                iata_code=item["iataCode"],
                name=item["name"].title(),
                city=item.get("address", {}).get("cityName", "").title(),
                country=item.get("address", {}).get("countryName", "").title(),
            )
            for item in payload.get("data", [])
            if item.get("iataCode")
        ]

    async def get_airlines(self, codes: list[str]) -> dict[str, str]:
        payload = await self._request(
            "GET", "/v1/reference-data/airlines", params={"airlineCodes": ",".join(codes)}
        )
        return {
            item["iataCode"]: item.get("businessName") or item["commonName"]
            for item in payload.get("data", [])
        }

    async def get_fare_rules(self, provider_offer: dict) -> dict:
        priced = await self.get_offer(provider_offer)
        return {"fareRules": priced.get("data", {}).get("fareRules", {})}

    async def close(self) -> None:
        await self.client.aclose()
