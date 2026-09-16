import type { AirportSuggestion, FlightOffer, PriceAlert, RankedOffer, SavedFlight, SearchRequest, SearchResponse, TokenResponse, UserSummary } from '@/types/travel';

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

// ---------------------------------------------------------------------------
// Demo natural-language interpretation
//
// A transparent, rule-based extractor that mirrors the backend's "rules" mode.
// It never involves an LLM, matching AeroOpt's guarantee that the optimizer and
// query parsing are deterministic.
// ---------------------------------------------------------------------------

const cityToCode: Record<string, string> = {};
const codeToCity: Record<string, string> = {};
for (const airport of airports) {
  codeToCity[airport.iata_code] = airport.city;
  const city = airport.city.toLowerCase();
  if (!(city in cityToCode)) cityToCode[city] = airport.iata_code;
}

export type DemoPriority = 'price' | 'duration' | 'comfort' | 'reliability' | 'balanced';
export type DemoPeriod = 'morning' | 'afternoon' | 'evening' | 'night';
export type DemoCabin = 'economy' | 'premium_economy' | 'business' | 'first';

export type DemoExtraction = {
  origin: string | null;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  departure_period: DemoPeriod | null;
  return_period: DemoPeriod | null;
  max_stops: number | null;
  priority: DemoPriority;
  travelers: number;
  cabin: DemoCabin;
  missing_fields: string[];
};

export type DemoInterpretation = {
  extraction: DemoExtraction;
  interpretation: string;
  mode: 'rules';
  ready_to_search: boolean;
};

function detectRoute(query: string): { origin: string | null; destination: string | null } {
  const lower = query.toLowerCase();
  const byCode = new Map<string, number>();
  const remember = (code: string, index: number) => {
    const previous = byCode.get(code);
    if (previous === undefined || index < previous) byCode.set(code, index);
  };
  for (const [city, code] of Object.entries(cityToCode)) {
    const index = lower.indexOf(city);
    if (index >= 0) remember(code, index);
  }
  for (const match of query.matchAll(/\b([A-Z]{3})\b/g)) {
    if (codeToCity[match[1]]) remember(match[1], match.index ?? 0);
  }
  const ordered = [...byCode.entries()].sort((a, b) => a[1] - b[1]).map(([code]) => code);
  return { origin: ordered[0] ?? null, destination: ordered[1] ?? null };
}

function detectPriority(query: string): DemoPriority {
  if (/cheap|budget|lowest fare|save money/.test(query)) return 'price';
  if (/fast|fastest|quick|shortest|direct route/.test(query)) return 'duration';
  if (/comfort|comfortable|legroom|premium experience/.test(query)) return 'comfort';
  if (/reliab|on[ -]?time|punctual/.test(query)) return 'reliability';
  return 'balanced';
}

function detectCabin(query: string): DemoCabin {
  if (/first class|first-class/.test(query)) return 'first';
  if (/business/.test(query)) return 'business';
  if (/premium/.test(query)) return 'premium_economy';
  return 'economy';
}

function detectStops(query: string): number | null {
  if (/nonstop|non-stop|no stops|direct/.test(query)) return 0;
  if (/(max(imum)?\s+)?(one|1)\s+stop/.test(query)) return 1;
  if (/(two|2)\s+stops/.test(query)) return 2;
  if (/(three|3)\s+stops/.test(query)) return 3;
  return null;
}

function detectPeriods(query: string): { departure: DemoPeriod | null; return: DemoPeriod | null } {
  const periods: DemoPeriod[] = ['morning', 'afternoon', 'evening', 'night'];
  const found = periods
    .map((period) => ({ period, index: query.indexOf(period) }))
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => a.index - b.index);
  const returnIndex = query.search(/return|coming back|back on/);
  const departure = found.find((entry) => returnIndex < 0 || entry.index < returnIndex)?.period ?? found[0]?.period ?? null;
  const back = returnIndex >= 0 ? found.find((entry) => entry.index > returnIndex)?.period ?? null : null;
  return { departure, return: back };
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function demoInterpret(query: string, now: Date = new Date()): DemoInterpretation {
  const lower = query.toLowerCase();
  const { origin, destination } = detectRoute(query);
  const priority = detectPriority(lower);
  const cabin = detectCabin(lower);
  const max_stops = detectStops(lower);
  const periods = detectPeriods(lower);

  const isoDates = [...query.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((match) => match[1]);
  let departure_date = isoDates[0] ?? null;
  const return_date = isoDates[1] ?? null;
  if (!departure_date && /next month/.test(lower)) {
    departure_date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15)).toISOString().slice(0, 10);
  }

  const travelerMatch = lower.match(/(\d+)\s+(adult|passenger|traveler|traveller|people|person)/);
  const travelers = travelerMatch ? Math.min(9, Math.max(1, Number(travelerMatch[1]))) : 1;

  const missing_fields: string[] = [];
  if (!origin) missing_fields.push('origin');
  if (!destination) missing_fields.push('destination');
  if (!departure_date) missing_fields.push('departure_date');

  const clauses: string[] = [];
  if (max_stops === 0) clauses.push('nonstop');
  else if (max_stops !== null) clauses.push(`up to ${max_stops} stop${max_stops === 1 ? '' : 's'}`);
  if (priority !== 'balanced') clauses.push(`prioritising ${priority}`);
  if (cabin !== 'economy') clauses.push(`${cabin.replace('_', ' ')} cabin`);
  if (periods.departure) clauses.push(`${periods.departure} departure`);
  if (travelers > 1) clauses.push(`${travelers} travelers`);

  const interpretation = origin && destination
    ? [`${codeToCity[origin]} (${origin}) → ${codeToCity[destination]} (${destination})`, ...clauses].join(', ') + '.'
    : 'Add an origin and destination so AeroOpt can build a search.';

  return {
    extraction: {
      origin,
      destination,
      departure_date,
      return_date,
      departure_period: periods.departure,
      return_period: periods.return,
      max_stops,
      priority,
      travelers,
      cabin,
      missing_fields,
    },
    interpretation,
    mode: 'rules',
    ready_to_search: Boolean(origin && destination),
  };
}

// ---------------------------------------------------------------------------
// Self-contained demo account
//
// The hosted starter has no database, so these helpers return deterministic,
// clearly-labelled sample data. A demo session is tracked by an httpOnly cookie
// (managed in the API route); nothing here persists beyond that browser.
// ---------------------------------------------------------------------------

const DEMO_TIMESTAMP = '2026-09-01T00:00:00.000Z';

export type DemoPreferences = {
  id: string;
  user_id: string;
  profile: 'budget' | 'business' | 'comfort' | 'family' | 'balanced' | 'custom';
  weights: Record<string, number> | null;
  preferred_departure_period: DemoPeriod | null;
  max_stops: number;
  checked_bag_required: boolean;
  value_of_time: number;
  preferred_airports: string[];
  created_at: string;
  updated_at: string;
};

export function demoUser(email: string, displayName?: string): UserSummary {
  const normalized = email.trim().toLowerCase();
  const name = displayName?.trim() || toTitleCase(normalized.split('@')[0].replace(/[._-]+/g, ' '));
  return { id: `demo-user-${hash(normalized).toString(16)}`, email: normalized, display_name: name || 'Demo Traveller' };
}

export function demoToken(user: UserSummary, now: Date = new Date()): TokenResponse {
  return {
    access_token: 'demo-access-token',
    token_type: 'bearer',
    expires_at: new Date(now.getTime() + 15 * 60_000).toISOString(),
    user,
  };
}

export function demoDashboard(): { saved_flights: number; active_alerts: number; upcoming_trips: number; recent_searches: number } {
  const saved = demoSavedFlights();
  const alerts = demoAlerts('demo@aeroopt.app');
  return {
    saved_flights: saved.length,
    active_alerts: alerts.filter((alert) => alert.is_active).length,
    upcoming_trips: 1,
    recent_searches: 3,
  };
}

export function demoSavedFlights(): SavedFlight[] {
  const { offers } = demoSearch({
    origin: 'MAA',
    destination: 'DXB',
    departure_date: '2026-11-14',
    adults: 1,
    cabin: 'economy',
    max_stops: 1,
    currency: 'inr',
    profile: 'balanced',
    checked_bag_required: false,
    value_of_time: 500,
  });
  return offers.slice(0, 2).map((ranked, index) => ({
    id: `demo-saved-${index + 1}`,
    provider: ranked.offer.provider,
    provider_offer_id: ranked.offer.provider_offer_id,
    offer_snapshot: ranked.offer,
    score_snapshot: ranked.score,
    label: index === 0 ? 'Smart pick to revisit' : null,
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
  }));
}

export function demoAlerts(email: string): PriceAlert[] {
  return [
    {
      id: 'demo-alert-1',
      saved_flight_id: 'demo-saved-1',
      origin: 'MAA',
      destination: 'DXB',
      departure_date: '2026-11-14',
      target_price: 18000,
      currency: 'INR',
      notification_email: email,
      is_active: true,
      last_checked_at: null,
      last_price: null,
      created_at: DEMO_TIMESTAMP,
      updated_at: DEMO_TIMESTAMP,
    },
  ];
}

export function demoPreferences(userId: string, override: Partial<DemoPreferences> = {}): DemoPreferences {
  return {
    id: 'demo-preferences',
    user_id: userId,
    profile: 'balanced',
    weights: null,
    preferred_departure_period: null,
    max_stops: 1,
    checked_bag_required: false,
    value_of_time: 500,
    preferred_airports: [],
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
    ...override,
  };
}

export function demoSaveFlight(userId: string, body: Partial<SavedFlight>): SavedFlight {
  return {
    id: `demo-saved-${hash(`${userId}:${body.provider_offer_id ?? Date.now()}`).toString(16)}`,
    provider: body.provider ?? 'demo',
    provider_offer_id: body.provider_offer_id ?? 'demo-offer',
    offer_snapshot: body.offer_snapshot as SavedFlight['offer_snapshot'],
    score_snapshot: body.score_snapshot as SavedFlight['score_snapshot'],
    label: body.label ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
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
