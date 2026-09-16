"""Unit tests for the live Amadeus adapter.

These mock the HTTP layer with recorded Amadeus payloads, so the normalization
logic is verified without live credentials or network access.
"""

import asyncio
from datetime import date

import pytest

from app.core.config import Settings
from app.providers.amadeus import AmadeusProvider, duration_minutes
from app.providers.base import ProviderError
from app.schemas.flight import SearchRequest

# A trimmed but realistic Amadeus "Flight Offers Search" response: one nonstop
# and one one-stop offer for MAA -> DXB.
FLIGHT_OFFERS = {
    "data": [
        {
            "id": "1",
            "itineraries": [
                {
                    "duration": "PT4H15M",
                    "segments": [
                        {
                            "departure": {"iataCode": "MAA", "at": "2026-10-16T07:30:00"},
                            "arrival": {"iataCode": "DXB", "at": "2026-10-16T10:45:00"},
                            "carrierCode": "EK",
                            "number": "545",
                            "duration": "PT4H15M",
                            "aircraft": {"code": "77W"},
                        }
                    ],
                }
            ],
            "price": {"currency": "INR", "base": "18000.00", "grandTotal": "21500.00"},
            "validatingAirlineCodes": ["EK"],
            "numberOfBookableSeats": 9,
            "lastTicketingDate": "2026-10-15",
            "travelerPricings": [
                {
                    "fareOption": "STANDARD",
                    "fareDetailsBySegment": [
                        {"includedCheckedBags": {"weight": 30, "weightUnit": "KG", "quantity": 1}}
                    ],
                }
            ],
        },
        {
            "id": "2",
            "itineraries": [
                {
                    "duration": "PT8H40M",
                    "segments": [
                        {
                            "departure": {"iataCode": "MAA", "at": "2026-10-16T02:15:00"},
                            "arrival": {"iataCode": "DOH", "at": "2026-10-16T04:30:00"},
                            "carrierCode": "QR",
                            "number": "529",
                            "duration": "PT3H45M",
                            "aircraft": {"code": "351"},
                        },
                        {
                            "departure": {"iataCode": "DOH", "at": "2026-10-16T06:10:00"},
                            "arrival": {"iataCode": "DXB", "at": "2026-10-16T08:05:00"},
                            "carrierCode": "QR",
                            "number": "1006",
                            "duration": "PT1H25M",
                            "aircraft": {"code": "320"},
                        },
                    ],
                }
            ],
            "price": {"currency": "INR", "base": "15000.00", "grandTotal": "17200.00"},
            "validatingAirlineCodes": ["QR"],
            "numberOfBookableSeats": 4,
            "travelerPricings": [
                {
                    "fareOption": "STANDARD",
                    "fareDetailsBySegment": [
                        {"includedCheckedBags": {"quantity": 2}}
                    ],
                }
            ],
        },
    ],
    "dictionaries": {"carriers": {"EK": "EMIRATES", "QR": "QATAR AIRWAYS"}},
}

LOCATIONS = {
    "data": [
        {
            "iataCode": "MAA",
            "name": "CHENNAI INTL",
            "address": {"cityName": "CHENNAI", "countryName": "INDIA"},
        }
    ]
}


def _settings() -> Settings:
    return Settings(amadeus_client_id="test-id", amadeus_client_secret="test-secret")


def _request(**overrides) -> SearchRequest:
    return SearchRequest(
        origin="MAA",
        destination="DXB",
        departure_date=date(2026, 10, 16),
        cabin="economy",
        currency="INR",
        **overrides,
    )


async def _with_provider(payload, coro_fn):
    provider = AmadeusProvider(_settings())

    async def fake_request(method, path, **kwargs):  # noqa: ARG001
        return payload

    provider._request = fake_request  # type: ignore[method-assign]
    try:
        return await coro_fn(provider)
    finally:
        await provider.close()


def test_missing_credentials_raise():
    with pytest.raises(ProviderError):
        AmadeusProvider(Settings(amadeus_client_id=None, amadeus_client_secret=None))


def test_duration_parsing():
    assert duration_minutes("PT4H15M") == 255
    assert duration_minutes("PT45M") == 45
    assert duration_minutes("PT2H") == 120
    with pytest.raises(ProviderError):
        duration_minutes("4H15M")


def test_search_normalizes_offers():
    offers = asyncio.run(
        _with_provider(FLIGHT_OFFERS, lambda p: p.search_flights(_request()))
    )
    assert len(offers) == 2
    nonstop = offers[0]
    assert nonstop.id == "amadeus-1"
    assert nonstop.provider == "amadeus"
    assert nonstop.airline_name == "EMIRATES"
    assert nonstop.currency == "INR"
    assert nonstop.total_price == 21500.0
    assert nonstop.stops == 0
    assert nonstop.baggage.checked_weight_kg == 30
    assert nonstop.segments[0].origin == "MAA"
    assert nonstop.segments[0].flight_number == "EK545"

    onestop = offers[1]
    assert onestop.stops == 1
    assert onestop.total_layover_minutes == 100  # 06:10 - 04:30
    assert onestop.airline_name == "QATAR AIRWAYS"


def test_search_respects_max_stops():
    offers = asyncio.run(
        _with_provider(FLIGHT_OFFERS, lambda p: p.search_flights(_request(max_stops=0)))
    )
    assert [offer.stops for offer in offers] == [0]


def test_airport_lookup_normalizes_names():
    airports = asyncio.run(_with_provider(LOCATIONS, lambda p: p.get_airports("chennai")))
    assert airports[0].iata_code == "MAA"
    assert airports[0].city == "Chennai"
    assert airports[0].country == "India"
