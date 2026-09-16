import { describe, expect, it } from 'vitest';
import { type BookingContext, buildBookingUrl } from '@/lib/booking';
import type { FlightOffer } from '@/types/travel';

function makeOffer(overrides: Partial<FlightOffer> = {}): FlightOffer {
  return {
    id: 'demo-1',
    provider: 'demo',
    provider_offer_id: 'demo-1',
    validating_airline: 'EK',
    airline_name: 'Emirates',
    currency: 'INR',
    base_price: 18000,
    total_price: 21500,
    expected_baggage_fee: 0,
    estimated_ground_cost: 450,
    duration_minutes: 255,
    stops: 0,
    total_layover_minutes: 0,
    overnight_layover: false,
    self_transfer: false,
    baggage: { cabin_bags: 1, checked_bags: 1, checked_weight_kg: 30 },
    fare: { cabin: 'economy', fare_brand: 'Value', changeable: false, refundable: false, change_fee: null },
    segments: [
      {
        origin: 'MAA',
        destination: 'DXB',
        departure_at: '2026-10-16T07:30:00.000Z',
        arrival_at: '2026-10-16T10:45:00.000Z',
        carrier_code: 'EK',
        flight_number: 'EK545',
        duration_minutes: 255,
        aircraft: 'Boeing 777',
      },
    ],
    reliability: 0.9,
    airport_convenience: 0.82,
    connection_risk: 0.06,
    bookable_seats: 9,
    fetched_at: '2026-09-16T00:00:00.000Z',
    ...overrides,
  };
}

const context: BookingContext = {
  origin: 'MAA',
  destination: 'DXB',
  departure_date: '2026-10-16',
  cabin: 'business',
  adults: 2,
};

describe('buildBookingUrl', () => {
  it('builds a Skyscanner deep link from the search context', () => {
    const url = new URL(buildBookingUrl(makeOffer(), context));
    expect(url.hostname).toBe('www.skyscanner.co.in');
    expect(url.pathname).toBe('/transport/flights/maa/dxb/261016/');
    expect(url.searchParams.get('adults')).toBe('2');
    expect(url.searchParams.get('cabinclass')).toBe('business');
    expect(url.searchParams.get('preferdirects')).toBe('true');
    expect(url.searchParams.get('rtn')).toBe('0');
  });

  it('adds the return leg for round trips', () => {
    const url = new URL(buildBookingUrl(makeOffer(), { ...context, return_date: '2026-10-23' }));
    expect(url.pathname).toBe('/transport/flights/maa/dxb/261016/261023/');
    expect(url.searchParams.get('rtn')).toBe('1');
  });

  it('maps premium economy to the Skyscanner cabin code', () => {
    const url = new URL(buildBookingUrl(makeOffer(), { ...context, cabin: 'premium_economy' }));
    expect(url.searchParams.get('cabinclass')).toBe('premiumeconomy');
  });

  it('marks connecting itineraries as not direct', () => {
    const url = new URL(buildBookingUrl(makeOffer({ stops: 1 }), context));
    expect(url.searchParams.get('preferdirects')).toBe('false');
  });

  it('falls back to the offer segments when no context is given', () => {
    const url = new URL(buildBookingUrl(makeOffer()));
    expect(url.pathname).toBe('/transport/flights/maa/dxb/261016/');
    expect(url.searchParams.get('adults')).toBe('1');
  });

  it('returns a safe Skyscanner URL when the route is incomplete', () => {
    const broken = makeOffer({ segments: [] });
    expect(buildBookingUrl(broken)).toBe('https://www.skyscanner.co.in/transport/flights/');
  });
});
