import type { FlightOffer, SearchRequest } from '@/types/travel';

// AeroOpt is a meta-search engine: it never sells or issues tickets. Each ranked
// offer links out to a partner where the traveller completes the booking.
//
// The partner is configurable at build time so you can point it at whichever
// destination you have an affiliate relationship with:
//   NEXT_PUBLIC_BOOKING_PARTNER            skyscanner (default) | google | kayak
//   NEXT_PUBLIC_BOOKING_AFFILIATE_TEMPLATE optional wrapper containing "{url}",
//                                          replaced with the URL-encoded partner
//                                          link (e.g. an affiliate redirect).

export type BookingContext = Pick<SearchRequest, 'origin' | 'destination' | 'departure_date' | 'cabin' | 'adults'> & {
  return_date?: string | null;
};

type Partner = 'skyscanner' | 'google' | 'kayak';

type BookingParams = {
  origin: string; // lowercase IATA
  destination: string; // lowercase IATA
  departure: string; // YYYY-MM-DD
  returnDate: string | null; // YYYY-MM-DD or null
  adults: number;
  cabin: string; // economy | premium_economy | business | first
  nonstop: boolean;
};

const SKYSCANNER_CABIN: Record<string, string> = {
  economy: 'economy',
  premium_economy: 'premiumeconomy',
  business: 'business',
  first: 'first',
};

const GOOGLE_CABIN: Record<string, string> = {
  economy: 'economy',
  premium_economy: 'premium economy',
  business: 'business',
  first: 'first',
};

const PARTNER_HOME: Record<Partner, string> = {
  skyscanner: 'https://www.skyscanner.co.in/transport/flights/',
  google: 'https://www.google.com/travel/flights',
  kayak: 'https://www.kayak.co.in/flights',
};

// Skyscanner encodes dates in the path as yymmdd.
function toYymmdd(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return '';
  return `${year.slice(2)}${month}${day}`;
}

function skyscannerUrl(p: BookingParams): string {
  const legs = [p.origin, p.destination, toYymmdd(p.departure)];
  const back = p.returnDate ? toYymmdd(p.returnDate) : '';
  if (back.length === 6) legs.push(back);
  const params = new URLSearchParams({
    adults: String(p.adults),
    cabinclass: SKYSCANNER_CABIN[p.cabin] ?? 'economy',
    preferdirects: p.nonstop ? 'true' : 'false',
    rtn: back.length === 6 ? '1' : '0',
  });
  return `${PARTNER_HOME.skyscanner}${legs.join('/')}/?${params.toString()}`;
}

function googleUrl(p: BookingParams): string {
  const parts = [`Flights from ${p.origin.toUpperCase()} to ${p.destination.toUpperCase()} on ${p.departure}`];
  if (p.returnDate) parts.push(`returning ${p.returnDate}`);
  if (p.cabin !== 'economy') parts.push(GOOGLE_CABIN[p.cabin] ?? 'economy');
  if (p.nonstop) parts.push('nonstop');
  return `${PARTNER_HOME.google}?q=${encodeURIComponent(parts.join(' '))}`;
}

function kayakUrl(p: BookingParams): string {
  const route = `${p.origin.toUpperCase()}-${p.destination.toUpperCase()}`;
  const dates = p.returnDate ? `${p.departure}/${p.returnDate}` : p.departure;
  const tokens = [route, dates];
  if (p.adults > 1) tokens.push(`${p.adults}adults`);
  if (p.cabin === 'premium_economy') tokens.push('premium');
  else if (p.cabin !== 'economy') tokens.push(p.cabin);
  if (p.nonstop) tokens.push('nonstop');
  return `${PARTNER_HOME.kayak}/${tokens.join('/')}?sort=bestflight_a`;
}

const BUILDERS: Record<Partner, (params: BookingParams) => string> = {
  skyscanner: skyscannerUrl,
  google: googleUrl,
  kayak: kayakUrl,
};

function selectedPartner(): Partner {
  const raw = (process.env.NEXT_PUBLIC_BOOKING_PARTNER ?? '').trim().toLowerCase();
  return raw === 'google' || raw === 'kayak' ? raw : 'skyscanner';
}

// Optionally wrap the partner link in an affiliate redirect so bookings are
// attributed to you. The template must contain "{url}".
function withAffiliate(url: string): string {
  const template = process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_TEMPLATE;
  if (!template || !template.includes('{url}')) return url;
  return template.replace('{url}', encodeURIComponent(url));
}

export function buildBookingUrl(offer: FlightOffer, context?: BookingContext | null): string {
  const partner = selectedPartner();
  const origin = (context?.origin ?? offer.segments[0]?.origin ?? '').trim();
  const destination = (context?.destination ?? offer.segments.at(-1)?.destination ?? '').trim();
  const departure = (context?.departure_date ?? offer.segments[0]?.departure_at ?? '').slice(0, 10);
  if (origin.length !== 3 || destination.length !== 3 || departure.length !== 10) {
    return withAffiliate(PARTNER_HOME[partner]);
  }
  const params: BookingParams = {
    origin: origin.toLowerCase(),
    destination: destination.toLowerCase(),
    departure,
    returnDate: context?.return_date ? context.return_date.slice(0, 10) : null,
    adults: context?.adults ?? 1,
    cabin: context?.cabin ?? offer.fare.cabin,
    nonstop: offer.stops === 0,
  };
  return withAffiliate(BUILDERS[partner](params));
}
