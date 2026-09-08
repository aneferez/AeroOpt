import type { AirportSuggestion, FlightOffer, RankedOffer, SearchRequest, SearchResponse } from '@/types/travel';

const airports: AirportSuggestion[] = [
  { iata_code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India', score: 1 },
  { iata_code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', score: 1 },
  { iata_code: 'DWC', name: 'Al Maktoum International Airport', city: 'Dubai', country: 'United Arab Emirates', score: 0.9 },
  { iata_code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India', score: 1 },
  { iata_code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India', score: 1 },
  { iata_code: 'BLR', name: 'Kempegowda International Airport', city: 'Bengaluru', country: 'India', score: 1 },
  { iata_code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', score: 1 },
  { iata_code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom', score: 1 },
  { iata_code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'United Kingdom', score: 0.9 },
  { iata_code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', score: 1 },
  { iata_code: 'EWR', name: 'Newark Liberty International Airport', city: 'New York', country: 'United States', score: 0.9 },
  { iata_code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', score: 1 },
];

const airlines = [
  ['EK', 'Emirates'],
  ['6E', 'IndiGo'],
  ['AI', 'Air India'],
  ['EY', 'Etihad Airways'],
  ['WY', 'Oman Air'],
  ['QR', 'Qatar Airways'],
] as const;

const profiles: Record<string, Record<string, number>> = {
  budget: { price: 0.45, duration: 0.1, layover: 0.1, reliability: 0.08, baggage: 0.05, schedule: 0.04, airport: 0.04, flexibility: 0.04, risk: 0.1 },
  business: { price: 0.12, duration: 0.25, layover: 0.16, reliability: 0.14, baggage: 0.07, schedule: 0.1, airport: 0.06, flexibility: 0.05, risk: 0.05 },
  comfort: { price: 0.15, duration: 0.2, layover: 0.17, reliability: 0.12, baggage: 0.12, schedule: 0.05, airport: 0.07, flexibility: 0.07, risk: 0.05 },
  family: { price: 0.2, duration: 0.13, layover: 0.17, reliability: 0.13, baggage: 0.15, schedule: 0.07, airport: 0.05, flexibility: 0.05, risk: 0.05 },
  balanced: { price: 0.3, duration: 0.2, layover: 0.15, reliability: 0.1, baggage: 0.1, schedule: 0.05, airport: 0.05, flexibility: 0.05, risk: 0.0 },
};

const hash = (value: string) => {
  let result = 7;
  for (let index = 0; index < value.length; index += 1) result = ((result * 31) + value.charCodeAt(index)) >>> 0;
  return result;
};

const isoAt = (date: string, hour: number) => {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  parsed.setUTCHours(hour, 0, 0, 0);
  return parsed.toISOString();
};

function scoreOffers(offers: FlightOffer[], request: SearchRequest): RankedOffer[] {
  const minPrice = Math.min(...offers.map((item) => item.total_price));
  const maxPrice = Math.max(...offers.map((item) => item.total_price));
  const minDuration = Math.min(...offers.map((item) => item.duration_minutes));
  const maxDuration = Math.max(...offers.map((item) => item.duration_minutes));
  const weights = profiles[request.profile] ?? profiles.balanced;
  const scale = (value: number, min: number, max: number) => max === min ? 100 : 100 - ((value - min) / (max - min)) * 100;
  return offers.map((offer) => {
    const departureHour = new Date(offer.segments[0].departure_at).getUTCHours();
    const schedule = request.preferred_departure_period === 'morning' ? (departureHour < 12 ? 100 : 65)
      : request.preferred_departure_period === 'afternoon' ? (departureHour >= 12 && departureHour < 17 ? 100 : 65)
        : request.preferred_departure_period === 'evening' ? (departureHour >= 17 && departureHour < 21 ? 100 : 65)
          : request.preferred_departure_period === 'night' ? (departureHour >= 21 || departureHour < 6 ? 100 : 65) : 82;
    const price = scale(offer.total_price, minPrice, maxPrice);
    const duration = scale(offer.duration_minutes, minDuration, maxDuration);
    const layover = Math.max(0, 100 - offer.stops * 22 - offer.total_layover_minutes / 5);
    const reliability = offer.reliability * 100;
    const baggage = offer.baggage.checked_weight_kg >= (request.checked_bag_required ? 20 : 15) ? 100 : 55;
    const airport = offer.airport_convenience * 100;
    const flexibility = offer.fare.refundable ? 100 : offer.fare.changeable ? 75 : 45;
    const risk = (1 - offer.connection_risk) * 100;
    const overall = Math.round(price * weights.price + duration * weights.duration + layover * weights.layover + reliability * weights.reliability + baggage * weights.baggage + schedule * weights.schedule + airport * weights.airport + flexibility * weights.flexibility + risk * weights.risk);
    const trueCost = Math.round(offer.total_price + offer.expected_baggage_fee + offer.estimated_ground_cost + (offer.duration_minutes / 60) * request.value_of_time);
    const factors = [
      price >= 80 ? 'Strong fare for this search' : 'Priced above the cheapest option',
      offer.stops === 0 ? 'Nonstop routing' : `${offer.stops} connection with ${offer.total_layover_minutes} min layover`,
      offer.baggage.checked_weight_kg ? `${offer.baggage.checked_weight_kg} kg checked baggage` : 'Cabin baggage only',
    ];
    return {
      offer,
      score: {
        overall_score: Math.max(0, Math.min(100, overall)),
        price_score: Math.round(price), duration_score: Math.round(duration), layover_score: Math.round(layover),
        reliability_score: Math.round(reliability), baggage_score: Math.round(baggage), schedule_score: Math.round(schedule),
        airport_convenience_score: Math.round(airport), fare_flexibility_score: Math.round(flexibility), connection_risk_score: Math.round(risk),
        estimated_true_cost: trueCost, applied_weights: weights, explanation_factors: factors,
      },
      badges: [],
    };
  }).sort((a, b) => b.score.overall_score - a.score.overall_score);
}

export function demoAirports(query: string): AirportSuggestion[] {
  const needle = query.trim().toLowerCase();
  return airports.filter((airport) => `${airport.iata_code} ${airport.name} ${airport.city} ${airport.country}`.toLowerCase().includes(needle)).slice(0, 8);
}

export function demoSearch(request: SearchRequest): SearchResponse {
  const seed = hash(`${request.origin}:${request.destination}:${request.departure_date}`);
  const routeBase = 15500 + (seed % 6500);
  const templates = [
    [2, 255, 0, 0, 1.22, 0.9, 0.06, 30, true, true],
    [6, 275, 0, 0, 0.94, 0.78, 0.09, 15, false, false],
    [9, 305, 0, 0, 1, 0.81, 0.08, 25, true, false],
    [16, 395, 1, 85, 0.91, 0.87, 0.18, 30, true, true],
    [11, 430, 1, 115, 0.82, 0.79, 0.24, 20, false, false],
    [20, 465, 1, 145, 1.08, 0.92, 0.2, 30, true, true],
    [22, 510, 1, 190, 0.76, 0.74, 0.33, 0, false, false],
  ] as const;
  const raw: FlightOffer[] = templates.flatMap(([hour, duration, stops, layover, multiplier, reliability, risk, bagKg, changeable, refundable], index) => {
    if (request.max_stops !== undefined && request.max_stops !== null && stops > request.max_stops) return [];
    const [carrier, airline] = airlines[index % airlines.length];
    const fare = Math.round(routeBase * multiplier / 100) * 100 * (request.return_date ? 1.82 : 1);
    if (request.max_price && fare > request.max_price) return [];
    const id = `demo-${seed.toString(16)}-${index + 1}`;
    const departure = isoAt(request.departure_date, hour);
    const arrivalDate = new Date(departure);
    arrivalDate.setUTCMinutes(arrivalDate.getUTCMinutes() + duration);
    return [{
      id, provider: 'demo', provider_offer_id: id, validating_airline: carrier, airline_name: airline, currency: request.currency.toUpperCase(),
      base_price: fare - 920, total_price: fare, expected_baggage_fee: bagKg === 0 && request.checked_bag_required ? 2200 : 0,
      estimated_ground_cost: ['DWC', 'LGW', 'EWR'].includes(request.destination.toUpperCase()) ? 900 : 450, duration_minutes: duration,
      stops, total_layover_minutes: layover, overnight_layover: hour >= 20 && stops > 0, self_transfer: index === 6,
      baggage: { cabin_bags: 1, checked_bags: bagKg ? 1 : 0, checked_weight_kg: bagKg },
      fare: { cabin: request.cabin, fare_brand: refundable ? 'Flex' : 'Value', changeable, refundable, change_fee: refundable ? 0 : changeable ? 2500 : null },
      segments: [{ origin: request.origin.toUpperCase(), destination: request.destination.toUpperCase(), departure_at: departure, arrival_at: arrivalDate.toISOString(), carrier_code: carrier, flight_number: `${carrier}${310 + index * 17}`, duration_minutes: duration, aircraft: carrier === 'EK' ? 'Boeing 777' : 'Airbus A320neo' }],
      reliability, airport_convenience: 0.82, connection_risk: risk, bookable_seats: Math.max(2, 8 - index), fetched_at: new Date().toISOString(),
    }];
  });
  const ranked = scoreOffers(raw, request);
  const withBadges = ranked.map((item, index) => ({ ...item, badges: index === 0 ? ['Smart Pick'] : [] }));
  const by = (selector: (item: RankedOffer) => number) => [...withBadges].sort((a, b) => selector(a) - selector(b))[0] ?? withBadges[0];
  const cheapest = by((item) => item.offer.total_price);
  const fastest = by((item) => item.offer.duration_minutes);
  const lowestRisk = by((item) => item.offer.connection_risk);
  const fetchedAt = new Date().toISOString();
  return {
    offers: withBadges,
    recommendations: { smart_pick_id: withBadges[0]?.offer.id ?? '', cheapest_id: cheapest?.offer.id ?? '', fastest_id: fastest?.offer.id ?? '', best_value_id: withBadges[0]?.offer.id ?? '', lowest_risk_id: lowestRisk?.offer.id ?? '' },
    meta: { search_id: null, provider: 'demo', provider_mode: 'demo', cached: false, cache_ttl_seconds: 300, fetched_at: fetchedAt, price_disclaimer: 'Demo fares are illustrative. Connect a live provider before booking.' },
  };
}
