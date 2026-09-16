from datetime import UTC, datetime, time, timedelta
from hashlib import sha256

from app.providers.base import FlightProvider, ProviderError
from app.schemas.flight import (
    AirportSuggestion,
    BaggageAllowance,
    FareDetails,
    FlightSegment,
    NormalizedFlightOffer,
    SearchRequest,
)

AIRPORTS = [
    # India
    ("MAA", "Chennai International Airport", "Chennai", "India"),
    ("DEL", "Indira Gandhi International Airport", "Delhi", "India"),
    ("BOM", "Chhatrapati Shivaji Maharaj International Airport", "Mumbai", "India"),
    ("BLR", "Kempegowda International Airport", "Bengaluru", "India"),
    ("HYD", "Rajiv Gandhi International Airport", "Hyderabad", "India"),
    ("CCU", "Netaji Subhas Chandra Bose International Airport", "Kolkata", "India"),
    ("COK", "Cochin International Airport", "Kochi", "India"),
    ("GOI", "Goa International Airport", "Goa", "India"),
    ("AMD", "Sardar Vallabhbhai Patel International Airport", "Ahmedabad", "India"),
    # Middle East
    ("DXB", "Dubai International Airport", "Dubai", "United Arab Emirates"),
    ("DWC", "Al Maktoum International Airport", "Dubai", "United Arab Emirates"),
    ("AUH", "Zayed International Airport", "Abu Dhabi", "United Arab Emirates"),
    ("DOH", "Hamad International Airport", "Doha", "Qatar"),
    ("RUH", "King Khalid International Airport", "Riyadh", "Saudi Arabia"),
    ("JED", "King Abdulaziz International Airport", "Jeddah", "Saudi Arabia"),
    ("MCT", "Muscat International Airport", "Muscat", "Oman"),
    ("BAH", "Bahrain International Airport", "Manama", "Bahrain"),
    ("KWI", "Kuwait International Airport", "Kuwait City", "Kuwait"),
    # South & Southeast Asia
    ("CMB", "Bandaranaike International Airport", "Colombo", "Sri Lanka"),
    ("KTM", "Tribhuvan International Airport", "Kathmandu", "Nepal"),
    ("DAC", "Hazrat Shahjalal International Airport", "Dhaka", "Bangladesh"),
    ("SIN", "Singapore Changi Airport", "Singapore", "Singapore"),
    ("BKK", "Suvarnabhumi Airport", "Bangkok", "Thailand"),
    ("KUL", "Kuala Lumpur International Airport", "Kuala Lumpur", "Malaysia"),
    ("CGK", "Soekarno-Hatta International Airport", "Jakarta", "Indonesia"),
    ("MNL", "Ninoy Aquino International Airport", "Manila", "Philippines"),
    # East Asia
    ("HKG", "Hong Kong International Airport", "Hong Kong", "Hong Kong"),
    ("NRT", "Narita International Airport", "Tokyo", "Japan"),
    ("HND", "Haneda Airport", "Tokyo", "Japan"),
    ("ICN", "Incheon International Airport", "Seoul", "South Korea"),
    ("PVG", "Shanghai Pudong International Airport", "Shanghai", "China"),
    ("PEK", "Beijing Capital International Airport", "Beijing", "China"),
    # Europe
    ("LHR", "Heathrow Airport", "London", "United Kingdom"),
    ("LGW", "Gatwick Airport", "London", "United Kingdom"),
    ("MAN", "Manchester Airport", "Manchester", "United Kingdom"),
    ("CDG", "Charles de Gaulle Airport", "Paris", "France"),
    ("FRA", "Frankfurt Airport", "Frankfurt", "Germany"),
    ("MUC", "Munich Airport", "Munich", "Germany"),
    ("AMS", "Amsterdam Airport Schiphol", "Amsterdam", "Netherlands"),
    ("IST", "Istanbul Airport", "Istanbul", "Turkey"),
    ("MAD", "Adolfo Suarez Madrid-Barajas Airport", "Madrid", "Spain"),
    ("FCO", "Leonardo da Vinci Fiumicino Airport", "Rome", "Italy"),
    ("ZRH", "Zurich Airport", "Zurich", "Switzerland"),
    ("DUB", "Dublin Airport", "Dublin", "Ireland"),
    # Americas
    ("JFK", "John F. Kennedy International Airport", "New York", "United States"),
    ("EWR", "Newark Liberty International Airport", "New York", "United States"),
    ("LAX", "Los Angeles International Airport", "Los Angeles", "United States"),
    ("SFO", "San Francisco International Airport", "San Francisco", "United States"),
    ("ORD", "O Hare International Airport", "Chicago", "United States"),
    ("YYZ", "Toronto Pearson International Airport", "Toronto", "Canada"),
    ("GRU", "Sao Paulo Guarulhos International Airport", "Sao Paulo", "Brazil"),
    # Oceania
    ("SYD", "Sydney Kingsford Smith Airport", "Sydney", "Australia"),
    ("MEL", "Melbourne Airport", "Melbourne", "Australia"),
    ("AKL", "Auckland Airport", "Auckland", "New Zealand"),
    # Africa
    ("JNB", "O. R. Tambo International Airport", "Johannesburg", "South Africa"),
    ("CAI", "Cairo International Airport", "Cairo", "Egypt"),
    ("NBO", "Jomo Kenyatta International Airport", "Nairobi", "Kenya"),
    ("ADD", "Addis Ababa Bole International Airport", "Addis Ababa", "Ethiopia"),
]

AIRLINES = {
    "EK": "Emirates",
    "AI": "Air India",
    "6E": "IndiGo",
    "EY": "Etihad Airways",
    "QR": "Qatar Airways",
    "WY": "Oman Air",
}

TEMPLATES = [
    ("EK", 2, 255, 0, 0, 1.22, 0.90, 0.06, 30, True, True),
    ("6E", 6, 275, 0, 0, 0.94, 0.78, 0.09, 15, False, False),
    ("AI", 9, 305, 0, 0, 1.00, 0.81, 0.08, 25, True, False),
    ("EY", 16, 395, 1, 85, 0.91, 0.87, 0.18, 30, True, True),
    ("WY", 11, 430, 1, 115, 0.82, 0.79, 0.24, 20, False, False),
    ("QR", 20, 465, 1, 145, 1.08, 0.92, 0.20, 30, True, True),
    ("6E", 22, 510, 1, 190, 0.76, 0.74, 0.33, 0, False, False),
]


class DemoProvider(FlightProvider):
    name = "demo"
    mode = "demo"

    async def search_flights(self, request: SearchRequest) -> list[NormalizedFlightOffer]:
        if request.max_stops is not None and request.max_stops < 0:
            raise ProviderError("Invalid maximum stops")
        seed = int(
            sha256(
                f"{request.origin}:{request.destination}:{request.departure_date}".encode()
            ).hexdigest()[:6],
            16,
        )
        route_base = 15500 + seed % 6500
        offers: list[NormalizedFlightOffer] = []
        for index, template in enumerate(TEMPLATES):
            (
                carrier,
                hour,
                duration,
                stops,
                layover,
                multiplier,
                reliability,
                risk,
                bag_kg,
                changeable,
                refundable,
            ) = template
            if request.max_stops is not None and stops > request.max_stops:
                continue
            departure = datetime.combine(request.departure_date, time(hour=hour), tzinfo=UTC)
            arrival = departure + timedelta(minutes=duration)
            fare_total = round(route_base * multiplier / 100) * 100
            if request.return_date:
                fare_total = round(fare_total * 1.82 / 100) * 100
            if request.max_price and fare_total > request.max_price:
                continue
            baggage_fee = 2200 if bag_kg == 0 and request.checked_bag_required else 0
            offer_id = f"demo-{seed:x}-{index + 1}"
            offers.append(
                NormalizedFlightOffer(
                    id=offer_id,
                    provider=self.name,
                    provider_offer_id=offer_id,
                    validating_airline=carrier,
                    airline_name=AIRLINES[carrier],
                    currency=request.currency,
                    base_price=fare_total - 920,
                    total_price=fare_total,
                    expected_baggage_fee=baggage_fee,
                    estimated_ground_cost=900
                    if request.destination in {"DWC", "LGW", "EWR"}
                    else 450,
                    duration_minutes=duration,
                    stops=stops,
                    total_layover_minutes=layover,
                    overnight_layover=hour >= 20 and stops > 0,
                    self_transfer=index == 6,
                    baggage=BaggageAllowance(
                        cabin_bags=1,
                        checked_bags=1 if bag_kg else 0,
                        checked_weight_kg=bag_kg,
                    ),
                    fare=FareDetails(
                        cabin=request.cabin,
                        fare_brand="Flex" if refundable else "Value",
                        changeable=changeable,
                        refundable=refundable,
                        change_fee=0 if refundable else (2500 if changeable else None),
                    ),
                    segments=[
                        FlightSegment(
                            origin=request.origin,
                            destination=request.destination,
                            departure_at=departure,
                            arrival_at=arrival,
                            carrier_code=carrier,
                            flight_number=f"{carrier}{310 + index * 17}",
                            duration_minutes=duration,
                            aircraft="Boeing 777" if carrier == "EK" else "Airbus A320neo",
                        )
                    ],
                    reliability=reliability,
                    airport_convenience=0.82,
                    connection_risk=risk,
                    bookable_seats=max(2, 8 - index),
                    last_ticketing_date=request.departure_date - timedelta(days=1),
                    fetched_at=datetime.now(UTC),
                )
            )
        return offers

    async def get_offer(self, provider_offer: dict) -> dict:
        return {**provider_offer, "revalidated": False, "mode": "demo"}

    async def get_airports(self, query: str) -> list[AirportSuggestion]:
        needle = query.strip().lower()
        matches = [
            AirportSuggestion(iata_code=code, name=name, city=city, country=country)
            for code, name, city, country in AIRPORTS
            if needle in f"{code} {name} {city} {country}".lower()
        ]
        return matches[:8]

    async def get_airlines(self, codes: list[str]) -> dict[str, str]:
        return {code: AIRLINES.get(code, code) for code in codes}

    async def get_fare_rules(self, provider_offer: dict) -> dict:
        return {"rules": provider_offer.get("fare", {}), "mode": "demo"}
