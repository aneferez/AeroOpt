import { describe, expect, it } from 'vitest';
import { ROUTES, allRouteSlugs, durationText, getRoute, routeFaqs, routeSlug, slugify } from '@/lib/routes';

describe('slugify', () => {
  it('lowercases and hyphenates city names', () => {
    expect(slugify('Kuala Lumpur')).toBe('kuala-lumpur');
    expect(slugify('New York')).toBe('new-york');
    expect(slugify('Delhi')).toBe('delhi');
  });
});

describe('route slugs', () => {
  it('builds an origin-to-destination slug', () => {
    const route = getRoute('chennai-to-dubai');
    expect(route).toBeDefined();
    expect(route?.origin.code).toBe('MAA');
    expect(route?.destination.code).toBe('DXB');
    expect(routeSlug(route!)).toBe('chennai-to-dubai');
  });

  it('exposes a unique slug for every route', () => {
    const slugs = allRouteSlugs();
    expect(slugs.length).toBe(ROUTES.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('returns undefined for an unknown slug', () => {
    expect(getRoute('nowhere-to-nowhere')).toBeUndefined();
  });
});

describe('durationText', () => {
  it('formats hours and minutes', () => {
    expect(durationText(255)).toBe('4h 15m');
    expect(durationText(120)).toBe('2h');
  });
});

describe('routeFaqs', () => {
  it('produces three answered questions naming both cities', () => {
    const faqs = routeFaqs(getRoute('chennai-to-dubai')!);
    expect(faqs).toHaveLength(3);
    for (const faq of faqs) {
      expect(faq.question.length).toBeGreaterThan(0);
      expect(faq.answer.length).toBeGreaterThan(0);
    }
    expect(faqs[0].question).toContain('Chennai');
    expect(faqs[0].question).toContain('Dubai');
  });
});
