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
  // India
  MAA: { code: 'MAA', city: 'Chennai', airport: 'Chennai International Airport', country: 'India' },
  DEL: { code: 'DEL', city: 'Delhi', airport: 'Indira Gandhi International Airport', country: 'India' },
  BOM: { code: 'BOM', city: 'Mumbai', airport: 'Chhatrapati Shivaji Maharaj International Airport', country: 'India' },
  BLR: { code: 'BLR', city: 'Bengaluru', airport: 'Kempegowda International Airport', country: 'India' },
  HYD: { code: 'HYD', city: 'Hyderabad', airport: 'Rajiv Gandhi International Airport', country: 'India' },
  CCU: { code: 'CCU', city: 'Kolkata', airport: 'Netaji Subhas Chandra Bose International Airport', country: 'India' },
  COK: { code: 'COK', city: 'Kochi', airport: 'Cochin International Airport', country: 'India' },
  GOI: { code: 'GOI', city: 'Goa', airport: 'Goa International Airport', country: 'India' },
  AMD: { code: 'AMD', city: 'Ahmedabad', airport: 'Sardar Vallabhbhai Patel International Airport', country: 'India' },
  // Middle East
  DXB: { code: 'DXB', city: 'Dubai', airport: 'Dubai International Airport', country: 'United Arab Emirates' },
  AUH: { code: 'AUH', city: 'Abu Dhabi', airport: 'Zayed International Airport', country: 'United Arab Emirates' },
  DOH: { code: 'DOH', city: 'Doha', airport: 'Hamad International Airport', country: 'Qatar' },
  RUH: { code: 'RUH', city: 'Riyadh', airport: 'King Khalid International Airport', country: 'Saudi Arabia' },
  JED: { code: 'JED', city: 'Jeddah', airport: 'King Abdulaziz International Airport', country: 'Saudi Arabia' },
  BAH: { code: 'BAH', city: 'Manama', airport: 'Bahrain International Airport', country: 'Bahrain' },
  KWI: { code: 'KWI', city: 'Kuwait City', airport: 'Kuwait International Airport', country: 'Kuwait' },
  // South & Southeast Asia
  CMB: { code: 'CMB', city: 'Colombo', airport: 'Bandaranaike International Airport', country: 'Sri Lanka' },
  KTM: { code: 'KTM', city: 'Kathmandu', airport: 'Tribhuvan International Airport', country: 'Nepal' },
  DAC: { code: 'DAC', city: 'Dhaka', airport: 'Hazrat Shahjalal International Airport', country: 'Bangladesh' },
  SIN: { code: 'SIN', city: 'Singapore', airport: 'Singapore Changi Airport', country: 'Singapore' },
  BKK: { code: 'BKK', city: 'Bangkok', airport: 'Suvarnabhumi Airport', country: 'Thailand' },
  KUL: { code: 'KUL', city: 'Kuala Lumpur', airport: 'Kuala Lumpur International Airport', country: 'Malaysia' },
  CGK: { code: 'CGK', city: 'Jakarta', airport: 'Soekarno-Hatta International Airport', country: 'Indonesia' },
  // East Asia
  HKG: { code: 'HKG', city: 'Hong Kong', airport: 'Hong Kong International Airport', country: 'Hong Kong' },
  NRT: { code: 'NRT', city: 'Tokyo', airport: 'Narita International Airport', country: 'Japan' },
  ICN: { code: 'ICN', city: 'Seoul', airport: 'Incheon International Airport', country: 'South Korea' },
  // Europe
  LHR: { code: 'LHR', city: 'London', airport: 'Heathrow Airport', country: 'United Kingdom' },
  CDG: { code: 'CDG', city: 'Paris', airport: 'Charles de Gaulle Airport', country: 'France' },
  FRA: { code: 'FRA', city: 'Frankfurt', airport: 'Frankfurt Airport', country: 'Germany' },
  MUC: { code: 'MUC', city: 'Munich', airport: 'Munich Airport', country: 'Germany' },
  AMS: { code: 'AMS', city: 'Amsterdam', airport: 'Amsterdam Airport Schiphol', country: 'Netherlands' },
  IST: { code: 'IST', city: 'Istanbul', airport: 'Istanbul Airport', country: 'Turkey' },
  // Americas
  JFK: { code: 'JFK', city: 'New York', airport: 'John F. Kennedy International Airport', country: 'United States' },
  SFO: { code: 'SFO', city: 'San Francisco', airport: 'San Francisco International Airport', country: 'United States' },
  ORD: { code: 'ORD', city: 'Chicago', airport: 'O Hare International Airport', country: 'United States' },
  YYZ: { code: 'YYZ', city: 'Toronto', airport: 'Toronto Pearson International Airport', country: 'Canada' },
  // Oceania
  SYD: { code: 'SYD', city: 'Sydney', airport: 'Sydney Kingsford Smith Airport', country: 'Australia' },
  // Africa
  NBO: { code: 'NBO', city: 'Nairobi', airport: 'Jomo Kenyatta International Airport', country: 'Kenya' },
  JNB: { code: 'JNB', city: 'Johannesburg', airport: 'O. R. Tambo International Airport', country: 'South Africa' },
  CAI: { code: 'CAI', city: 'Cairo', airport: 'Cairo International Airport', country: 'Egypt' },
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
  // Domestic (India)
  ['DEL', 'BOM', 130, true, ['IndiGo', 'Vistara', 'Air India', 'Akasa Air']],
  ['BOM', 'DEL', 130, true, ['IndiGo', 'Vistara', 'Air India']],
  ['DEL', 'BLR', 165, true, ['IndiGo', 'Vistara', 'Air India']],
  ['BLR', 'DEL', 165, true, ['IndiGo', 'Vistara', 'Air India']],
  ['DEL', 'MAA', 165, true, ['IndiGo', 'Vistara', 'Air India']],
  ['MAA', 'DEL', 165, true, ['IndiGo', 'Air India']],
  ['DEL', 'CCU', 130, true, ['IndiGo', 'Vistara', 'Air India']],
  ['DEL', 'HYD', 135, true, ['IndiGo', 'Air India']],
  ['DEL', 'GOI', 150, true, ['IndiGo', 'Vistara']],
  ['DEL', 'AMD', 85, true, ['IndiGo', 'Air India']],
  ['BOM', 'BLR', 95, true, ['IndiGo', 'Vistara', 'Akasa Air']],
  ['BLR', 'BOM', 95, true, ['IndiGo', 'Vistara']],
  ['BOM', 'GOI', 70, true, ['IndiGo', 'Akasa Air']],
  ['BOM', 'HYD', 80, true, ['IndiGo', 'Air India']],
  ['MAA', 'BLR', 55, true, ['IndiGo', 'Air India']],
  ['MAA', 'CCU', 140, true, ['IndiGo', 'Air India']],
  ['MAA', 'COK', 75, true, ['IndiGo', 'Air India']],
  ['MAA', 'HYD', 75, true, ['IndiGo', 'Air India']],
  ['CCU', 'BLR', 150, true, ['IndiGo', 'Vistara']],
  ['HYD', 'BLR', 65, true, ['IndiGo', 'Air India']],
  // India <-> Middle East
  ['MAA', 'DXB', 255, true, ['IndiGo', 'Emirates', 'Air India']],
  ['DXB', 'MAA', 260, true, ['Emirates', 'IndiGo', 'Air India']],
  ['BOM', 'DXB', 200, true, ['Emirates', 'IndiGo', 'Air India']],
  ['DEL', 'DXB', 230, true, ['Emirates', 'IndiGo', 'Air India']],
  ['HYD', 'DXB', 230, true, ['IndiGo', 'Emirates', 'Air India']],
  ['COK', 'DXB', 235, true, ['Emirates', 'IndiGo', 'Air India']],
  ['BLR', 'DXB', 245, true, ['Emirates', 'IndiGo', 'Air India']],
  ['CCU', 'DXB', 340, true, ['IndiGo', 'Emirates']],
  ['MAA', 'AUH', 250, true, ['Etihad Airways', 'IndiGo']],
  ['BOM', 'AUH', 195, true, ['Etihad Airways', 'IndiGo', 'Air India']],
  ['DEL', 'DOH', 240, true, ['Qatar Airways', 'IndiGo', 'Air India']],
  ['COK', 'DOH', 260, true, ['Qatar Airways', 'IndiGo']],
  ['DEL', 'RUH', 320, true, ['Saudia', 'Air India', 'IndiGo']],
  ['COK', 'BAH', 250, true, ['Gulf Air', 'IndiGo']],
  ['BOM', 'KWI', 260, true, ['Kuwait Airways', 'IndiGo', 'Air India']],
  ['DEL', 'JED', 360, true, ['Saudia', 'Air India']],
  // India <-> Asia
  ['MAA', 'SIN', 275, true, ['Singapore Airlines', 'IndiGo', 'Air India']],
  ['BLR', 'SIN', 265, true, ['Singapore Airlines', 'IndiGo', 'Air India']],
  ['BOM', 'SIN', 320, true, ['Singapore Airlines', 'IndiGo']],
  ['DEL', 'SIN', 335, true, ['Singapore Airlines', 'Air India', 'IndiGo']],
  ['MAA', 'KUL', 270, true, ['AirAsia', 'Malaysia Airlines', 'IndiGo']],
  ['BLR', 'KUL', 260, true, ['AirAsia', 'Malaysia Airlines']],
  ['CCU', 'BKK', 155, true, ['IndiGo', 'Thai Airways', 'Air India']],
  ['DEL', 'BKK', 260, true, ['Thai Airways', 'IndiGo', 'Air India']],
  ['MAA', 'CMB', 90, true, ['SriLankan Airlines', 'IndiGo']],
  ['DEL', 'KTM', 100, true, ['IndiGo', 'Nepal Airlines', 'Air India']],
  ['CCU', 'DAC', 60, true, ['IndiGo', 'US-Bangla Airlines', 'Biman Bangladesh']],
  ['DEL', 'HKG', 350, true, ['Cathay Pacific', 'IndiGo', 'Air India']],
  ['DEL', 'ICN', 380, true, ['Korean Air', 'Air India']],
  ['DEL', 'NRT', 450, true, ['Air India', 'Japan Airlines']],
  ['BOM', 'CGK', 340, false, ['Singapore Airlines', 'Malaysia Airlines']],
  // India <-> Europe
  ['BOM', 'LHR', 585, true, ['British Airways', 'Air India', 'Virgin Atlantic']],
  ['DEL', 'LHR', 570, true, ['Air India', 'British Airways', 'Vistara']],
  ['DEL', 'CDG', 555, true, ['Air France', 'Air India', 'Vistara']],
  ['BOM', 'FRA', 555, true, ['Lufthansa', 'Air India']],
  ['DEL', 'FRA', 540, true, ['Lufthansa', 'Air India']],
  ['DEL', 'AMS', 555, true, ['KLM', 'Air India']],
  ['BOM', 'MUC', 555, true, ['Lufthansa']],
  ['DEL', 'IST', 375, true, ['Turkish Airlines', 'IndiGo']],
  // India <-> Americas, Oceania, Africa
  ['DEL', 'JFK', 905, true, ['Air India']],
  ['BOM', 'JFK', 950, true, ['Air India']],
  ['DEL', 'SFO', 950, true, ['Air India', 'United Airlines']],
  ['DEL', 'ORD', 930, true, ['Air India', 'United Airlines']],
  ['DEL', 'YYZ', 870, true, ['Air India', 'Air Canada']],
  ['DEL', 'SYD', 720, true, ['Air India', 'Qantas']],
  ['BOM', 'SYD', 780, false, ['Singapore Airlines', 'Qantas']],
  ['BOM', 'NBO', 320, true, ['Kenya Airways', 'Air India']],
  ['BOM', 'JNB', 520, true, ['Air India', 'South African Airways']],
  ['DEL', 'CAI', 330, false, ['EgyptAir', 'Air India']],
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
