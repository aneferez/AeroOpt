import { describe, expect, it } from 'vitest';
import {
  demoAlerts,
  demoDashboard,
  demoInterpret,
  demoPreferences,
  demoSavedFlights,
  demoToken,
  demoUser,
} from '@/lib/demo-backend';

const FIXED_NOW = new Date('2026-09-16T00:00:00.000Z');

describe('demoInterpret', () => {
  it('extracts route, priority, stops, periods, and a next-month date from a rich query', () => {
    const result = demoInterpret(
      'Find me a cheap flight from Chennai to Dubai next month, leaving Friday evening and returning Sunday night, maximum one stop.',
      FIXED_NOW,
    );
    expect(result.mode).toBe('rules');
    expect(result.ready_to_search).toBe(true);
    expect(result.extraction.origin).toBe('MAA');
    expect(result.extraction.destination).toBe('DXB');
    expect(result.extraction.priority).toBe('price');
    expect(result.extraction.max_stops).toBe(1);
    expect(result.extraction.departure_period).toBe('evening');
    expect(result.extraction.return_period).toBe('night');
    expect(result.extraction.departure_date).toBe('2026-10-15');
    expect(result.extraction.missing_fields).not.toContain('origin');
    expect(result.interpretation).toContain('Chennai (MAA)');
    expect(result.interpretation).toContain('Dubai (DXB)');
  });

  it('detects cabin and nonstop preferences', () => {
    const business = demoInterpret('business class from Delhi to London, direct please', FIXED_NOW);
    expect(business.extraction.origin).toBe('DEL');
    expect(business.extraction.destination).toBe('LHR');
    expect(business.extraction.cabin).toBe('business');
    expect(business.extraction.max_stops).toBe(0);
  });

  it('reads explicit ISO dates for departure and return', () => {
    const result = demoInterpret('BOM to DXB on 2026-12-01 returning 2026-12-10', FIXED_NOW);
    expect(result.extraction.departure_date).toBe('2026-12-01');
    expect(result.extraction.return_date).toBe('2026-12-10');
  });

  it('flags missing fields and stays not-ready when no route is given', () => {
    const result = demoInterpret('I would like to travel somewhere warm', FIXED_NOW);
    expect(result.extraction.origin).toBeNull();
    expect(result.extraction.destination).toBeNull();
    expect(result.ready_to_search).toBe(false);
    expect(result.extraction.missing_fields).toEqual(expect.arrayContaining(['origin', 'destination']));
    expect(result.interpretation).toContain('Add an origin and destination');
  });
});

describe('demo account helpers', () => {
  it('derives a stable user and display name from an email', () => {
    const user = demoUser('Ada.Lovelace@example.com');
    expect(user.email).toBe('ada.lovelace@example.com');
    expect(user.display_name).toBe('Ada Lovelace');
    expect(demoUser('Ada.Lovelace@example.com').id).toBe(user.id);
  });

  it('honours an explicit display name', () => {
    expect(demoUser('a@b.com', 'Grace Hopper').display_name).toBe('Grace Hopper');
  });

  it('issues a bearer token that expires in the future', () => {
    const token = demoToken(demoUser('a@b.com'), FIXED_NOW);
    expect(token.token_type).toBe('bearer');
    expect(new Date(token.expires_at).getTime()).toBeGreaterThan(FIXED_NOW.getTime());
    expect(token.user.email).toBe('a@b.com');
  });

  it('returns two saved flights with usable snapshots', () => {
    const saved = demoSavedFlights();
    expect(saved).toHaveLength(2);
    expect(new Set(saved.map((item) => item.id)).size).toBe(2);
    for (const item of saved) {
      expect(item.offer_snapshot.total_price).toBeGreaterThan(0);
      expect(item.score_snapshot.overall_score).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns one active alert carrying the account email', () => {
    const alerts = demoAlerts('traveller@aeroopt.app');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].is_active).toBe(true);
    expect(alerts[0].notification_email).toBe('traveller@aeroopt.app');
  });

  it('keeps dashboard counts consistent with the sample data', () => {
    const dashboard = demoDashboard();
    expect(dashboard.saved_flights).toBe(demoSavedFlights().length);
    expect(dashboard.active_alerts).toBe(1);
  });

  it('merges preference overrides onto the defaults', () => {
    const prefs = demoPreferences('demo-user-1', { profile: 'business', max_stops: 0 });
    expect(prefs.user_id).toBe('demo-user-1');
    expect(prefs.profile).toBe('business');
    expect(prefs.max_stops).toBe(0);
    expect(prefs.value_of_time).toBe(500);
  });
});
