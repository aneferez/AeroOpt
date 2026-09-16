import type { FlightOffer, SearchRequest } from '@/types/travel';

// AeroOpt is a meta-search engine: it never sells or issues tickets. Each ranked
// offer links out to a partner where the traveller completes the booking.
// Skyscanner is the default hand-off — it deep-links cleanly by route, date and
// cabin, covers Indian and global carriers, and has an affiliate programme for
// later monetisation. To monetise or change destination, swap the builder here
// (e.g. wrap the URL in an affiliate redirect); nothing else needs to change.

const SKYSCANNER_CABIN: Record<string, string> = {
  economy: 'economy',
  premium_economy: 'premiumeconomy',
  business: 'business',
  first: 'first',
};

const SKYSCANNER_HOME = 'https://www.skyscanner.co.in/transport/flights/';

export type BookingContext = Pick<SearchRequest, 'origin' | 'destination' | 'departure_date' | 'cabin' | 'adults'> & {
  return_date?: string | null;
};

// Skyscanner encodes dates in the path as yymmdd.
function toYymmdd(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return '';
  return `${year.slice(2)}${month}${day}`;
}

export function buildBookingUrl(offer: FlightOffer, context?: BookingContext | null): string {
  const origin = (context?.origin ?? offer.segments[0]?.origin ?? '').toLowerCase();
  const destination = (context?.destination ?? offer.segments.at(-1)?.destination ?? '').toLowerCase();
  const departure = toYymmdd(context?.departure_date ?? offer.segments[0]?.departure_at ?? '');
  if (origin.length !== 3 || destination.length !== 3 || departure.length !== 6) {
    return SKYSCANNER_HOME;
  }
  const legs = [origin, destination, departure];
  const back = context?.return_date ? toYymmdd(context.return_date) : '';
  if (back.length === 6) legs.push(back);
  const params = new URLSearchParams({
    adults: String(context?.adults ?? 1),
    cabinclass: SKYSCANNER_CABIN[context?.cabin ?? offer.fare.cabin] ?? 'economy',
    preferdirects: offer.stops === 0 ? 'true' : 'false',
    rtn: back.length === 6 ? '1' : '0',
  });
  return `${SKYSCANNER_HOME}${legs.join('/')}/?${params.toString()}`;
}
