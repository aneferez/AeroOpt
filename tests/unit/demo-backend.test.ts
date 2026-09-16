import { describe, expect, it } from 'vitest';
import { demoAirports, demoSearch } from '@/lib/demo-backend';
import type { SearchRequest } from '@/types/travel';

function makeRequest(overrides: Partial<SearchRequest> = {}): SearchRequest {
  return {
    origin: 'MAA',
    destination: 'DXB',
    departure_date: '2026-10-10',
    adults: 1,
    cabin: 'economy',
    max_stops: 3,
    currency: 'inr',
    profile: 'balanced',
    checked_bag_required: false,
    value_of_time: 500,
    ...overrides,
  };
}

describe('demoSearch', () => {
  it('returns ranked offers sorted by descending overall score', () => {
    const { offers } = demoSearch(makeRequest());
    expect(offers.length).toBeGreaterThan(0);
    const scores = offers.map((item) => item.score.overall_score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });

  it('keeps every component score within the documented 0-100 range', () => {
    const { offers } = demoSearch(makeRequest());
    for (const { score } of offers) {
      for (const value of [
        score.overall_score,
        score.price_score,
        score.duration_score,
        score.layover_score,
        score.reliability_score,
        score.baggage_score,
        score.schedule_score,
        score.airport_convenience_score,
        score.fare_flexibility_score,
        score.connection_risk_score,
      ]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  it('is deterministic for identical inputs (ids, prices, and scores)', () => {
    const first = demoSearch(makeRequest());
    const second = demoSearch(makeRequest());
    const fingerprint = (response: ReturnType<typeof demoSearch>) =>
      response.offers.map((item) => `${item.offer.id}:${item.offer.total_price}:${item.score.overall_score}`);
    expect(fingerprint(first)).toEqual(fingerprint(second));
  });

  it('varies fares by route seed', () => {
    const a = demoSearch(makeRequest({ origin: 'MAA', destination: 'DXB' }));
    const b = demoSearch(makeRequest({ origin: 'DEL', destination: 'LHR' }));
    expect(a.offers[0]?.offer.total_price).not.toEqual(b.offers[0]?.offer.total_price);
  });

  it('respects the max_stops filter', () => {
    const { offers } = demoSearch(makeRequest({ max_stops: 0 }));
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((item) => item.offer.stops === 0)).toBe(true);
  });

  it('respects the max_price ceiling', () => {
    const ceiling = 15000;
    const { offers } = demoSearch(makeRequest({ max_price: ceiling }));
    expect(offers.every((item) => item.offer.total_price <= ceiling)).toBe(true);
  });

  it('prices round trips higher than the equivalent one-way', () => {
    const oneWay = demoSearch(makeRequest());
    const roundTrip = demoSearch(makeRequest({ return_date: '2026-10-17' }));
    expect(roundTrip.offers[0]?.offer.total_price).toBeGreaterThan(oneWay.offers[0]?.offer.total_price ?? 0);
  });

  it('labels the top-ranked offer as the smart pick', () => {
    const { offers, recommendations } = demoSearch(makeRequest());
    expect(offers[0]?.badges).toContain('Smart Pick');
    expect(recommendations.smart_pick_id).toBe(offers[0]?.offer.id);
  });

  it('points each recommendation at the correct extreme offer', () => {
    const { offers, recommendations } = demoSearch(makeRequest());
    const byId = new Map(offers.map((item) => [item.offer.id, item.offer]));
    const cheapest = offers.reduce((a, b) => (a.offer.total_price <= b.offer.total_price ? a : b));
    const fastest = offers.reduce((a, b) => (a.offer.duration_minutes <= b.offer.duration_minutes ? a : b));
    const lowestRisk = offers.reduce((a, b) => (a.offer.connection_risk <= b.offer.connection_risk ? a : b));
    expect(byId.get(recommendations.cheapest_id)?.total_price).toBe(cheapest.offer.total_price);
    expect(byId.get(recommendations.fastest_id)?.duration_minutes).toBe(fastest.offer.duration_minutes);
    expect(byId.get(recommendations.lowest_risk_id)?.connection_risk).toBe(lowestRisk.offer.connection_risk);
  });

  it('reports demo provider metadata with a booking disclaimer', () => {
    const { meta } = demoSearch(makeRequest());
    expect(meta.provider).toBe('demo');
    expect(meta.provider_mode).toBe('demo');
    expect(meta.price_disclaimer.length).toBeGreaterThan(0);
  });

  it('returns no offers when the price ceiling excludes everything', () => {
    const { offers, recommendations } = demoSearch(makeRequest({ max_price: 1 }));
    expect(offers).toHaveLength(0);
    expect(recommendations.smart_pick_id).toBe('');
  });
});

describe('demoAirports', () => {
  it('matches on city name, case-insensitively', () => {
    const results = demoAirports('dubai');
    const codes = results.map((airport) => airport.iata_code);
    expect(codes).toContain('DXB');
    expect(codes).toContain('DWC');
  });

  it('matches on IATA code', () => {
    expect(demoAirports('MAA').map((a) => a.iata_code)).toContain('MAA');
  });

  it('caps results at eight suggestions', () => {
    expect(demoAirports('').length).toBeLessThanOrEqual(8);
  });

  it('returns an empty list when nothing matches', () => {
    expect(demoAirports('zzzznowhere')).toEqual([]);
  });

  it('covers airports well beyond the India–Gulf core', () => {
    expect(demoAirports('tokyo').map((a) => a.iata_code)).toEqual(expect.arrayContaining(['NRT', 'HND']));
    expect(demoAirports('paris').map((a) => a.iata_code)).toContain('CDG');
    expect(demoAirports('new york').map((a) => a.iata_code)).toContain('JFK');
    expect(demoAirports('sydney').map((a) => a.iata_code)).toContain('SYD');
    expect(demoAirports('nairobi').map((a) => a.iata_code)).toContain('NBO');
  });
});
