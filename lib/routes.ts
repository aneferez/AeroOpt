// Data + helpers for SEO route landing pages ("Flights from X to Y").
//
// These pages are the organic-traffic engine of a meta-search site: each popular
// city pair gets a statically generated, richly-described page that links into
// the live search. Add a city to CITIES and a pair to ROUTES to publish a page.

export type RouteCity = {
  code: string;
  city: string;
  airport: string;
  country: string;
};

export const CITIES: Record<string, RouteCity> = {
  MAA: { code: 'MAA', city: 'Chennai', airport: 'Chennai International Airport', country: 'India' },
  DEL: { code: 'DEL', city: 'Delhi', airport: 'Indira Gandhi International Airport', country: 'India' },
  BOM: { code: 'BOM', city: 'Mumbai', airport: 'Chhatrapati Shivaji Maharaj International Airport', country: 'India' },
  BLR: { code: 'BLR', city: 'Bengaluru', airport: 'Kempegowda International Airport', country: 'India' },
  HYD: { code: 'HYD', city: 'Hyderabad', airport: 'Rajiv Gandhi International Airport', country: 'India' },
  CCU: { code: 'CCU', city: 'Kolkata', airport: 'Netaji Subhas Chandra Bose International Airport', country: 'India' },
  COK: { code: 'COK', city: 'Kochi', airport: 'Cochin International Airport', country: 'India' },
  DXB: { code: 'DXB', city: 'Dubai', airport: 'Dubai International Airport', country: 'United Arab Emirates' },
  AUH: { code: 'AUH', city: 'Abu Dhabi', airport: 'Zayed International Airport', country: 'United Arab Emirates' },
  DOH: { code: 'DOH', city: 'Doha', airport: 'Hamad International Airport', country: 'Qatar' },
  SIN: { code: 'SIN', city: 'Singapore', airport: 'Singapore Changi Airport', country: 'Singapore' },
  BKK: { code: 'BKK', city: 'Bangkok', airport: 'Suvarnabhumi Airport', country: 'Thailand' },
  KUL: { code: 'KUL', city: 'Kuala Lumpur', airport: 'Kuala Lumpur International Airport', country: 'Malaysia' },
  LHR: { code: 'LHR', city: 'London', airport: 'Heathrow Airport', country: 'United Kingdom' },
  JFK: { code: 'JFK', city: 'New York', airport: 'John F. Kennedy International Airport', country: 'United States' },
};

export type PopularRoute = {
  origin: RouteCity;
  destination: RouteCity;
  domestic: boolean;
  nonstop: boolean;
  typicalDurationMinutes: number;
  airlines: string[];
};

type RouteSeed = [origin: string, destination: string, durationMinutes: number, nonstop: boolean, airlines: string[]];

const ROUTE_SEEDS: RouteSeed[] = [
  ['MAA', 'DXB', 255, true, ['IndiGo', 'Emirates', 'Air India']],
  ['DXB', 'MAA', 260, true, ['Emirates', 'IndiGo', 'Air India']],
  ['DEL', 'BOM', 130, true, ['IndiGo', 'Vistara', 'Air India', 'Akasa Air']],
  ['BOM', 'DEL', 130, true, ['IndiGo', 'Vistara', 'Air India']],
  ['BLR', 'DEL', 165, true, ['IndiGo', 'Vistara', 'Air India']],
  ['BOM', 'BLR', 95, true, ['IndiGo', 'Vistara', 'Akasa Air']],
  ['DEL', 'HYD', 135, true, ['IndiGo', 'Air India']],
  ['BOM', 'DXB', 200, true, ['Emirates', 'IndiGo', 'Air India']],
  ['DEL', 'DXB', 230, true, ['Emirates', 'IndiGo', 'Air India']],
  ['HYD', 'DXB', 230, true, ['IndiGo', 'Emirates', 'Air India']],
  ['COK', 'DXB', 235, true, ['Emirates', 'IndiGo', 'Air India']],
  ['MAA', 'SIN', 275, true, ['Singapore Airlines', 'IndiGo', 'Air India']],
  ['BLR', 'SIN', 265, true, ['Singapore Airlines', 'IndiGo', 'Air India']],
  ['MAA', 'KUL', 270, true, ['AirAsia', 'Malaysia Airlines', 'IndiGo']],
  ['CCU', 'BKK', 155, true, ['IndiGo', 'Thai Airways', 'Air India']],
  ['DEL', 'DOH', 240, true, ['Qatar Airways', 'IndiGo', 'Air India']],
  ['BOM', 'LHR', 585, true, ['British Airways', 'Air India', 'Virgin Atlantic']],
  ['DEL', 'LHR', 570, true, ['Air India', 'British Airways', 'Vistara']],
  ['DEL', 'JFK', 905, true, ['Air India']],
];

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function routeSlug(route: PopularRoute): string {
  return `${slugify(route.origin.city)}-to-${slugify(route.destination.city)}`;
}

export const ROUTES: PopularRoute[] = ROUTE_SEEDS.map(([origin, destination, duration, nonstop, airlines]) => ({
  origin: CITIES[origin],
  destination: CITIES[destination],
  domestic: CITIES[origin].country === CITIES[destination].country,
  nonstop,
  typicalDurationMinutes: duration,
  airlines,
}));

const ROUTES_BY_SLUG = new Map(ROUTES.map((route) => [routeSlug(route), route]));

export function getRoute(slug: string): PopularRoute | undefined {
  return ROUTES_BY_SLUG.get(slug);
}

export function allRouteSlugs(): string[] {
  return [...ROUTES_BY_SLUG.keys()];
}

export function durationText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function routeFaqs(route: PopularRoute): { question: string; answer: string }[] {
  const { origin, destination } = route;
  const lister = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
  return [
    {
      question: `How long is the flight from ${origin.city} to ${destination.city}?`,
      answer: `A ${route.nonstop ? 'nonstop' : 'typical'} ${origin.city} (${origin.code}) to ${destination.city} (${destination.code}) flight takes about ${durationText(route.typicalDurationMinutes)}. AeroOpt ranks each option by total journey time, not just the airline's headline number.`,
    },
    {
      question: `Which airlines fly from ${origin.city} to ${destination.city}?`,
      answer: `Carriers on this route include ${lister.format(route.airlines)}. AeroOpt compares them side by side and scores each on price, duration, reliability, baggage, and connection risk.`,
    },
    {
      question: `How do I find the cheapest ${origin.city} to ${destination.city} fare?`,
      answer: `Search the route on AeroOpt to see every offer ranked by whole-journey value, then use the "Book" link to complete the purchase with the airline or a partner. AeroOpt never adds a booking fee — it is a meta-search engine.`,
    },
  ];
}
