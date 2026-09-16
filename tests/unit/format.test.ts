import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, formatMoney, formatTime } from '@/lib/format';

describe('formatMoney', () => {
  it('formats INR by default with no fractional digits', () => {
    const result = formatMoney(1234);
    expect(result).toContain('1,234');
    expect(result).not.toContain('.00');
  });

  it('groups large amounts with the Indian numbering system', () => {
    // en-IN groups as 1,23,456 rather than 123,456.
    expect(formatMoney(123456)).toContain('1,23,456');
  });

  it('honours an explicit currency code', () => {
    const usd = formatMoney(1000, 'USD');
    expect(usd).toContain('1,000');
    expect(usd).not.toContain('.00');
  });
});

describe('formatDuration', () => {
  it('renders hours and minutes', () => {
    expect(formatDuration(125)).toBe('2h 5m');
  });

  it('omits the minute segment on a whole hour', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('keeps a zero hour prefix for sub-hour durations', () => {
    expect(formatDuration(45)).toBe('0h 45m');
    expect(formatDuration(0)).toBe('0h');
  });
});

describe('formatTime / formatDate', () => {
  it('produce non-empty strings for a valid ISO timestamp', () => {
    const iso = '2026-09-16T09:30:00.000Z';
    expect(formatTime(iso).length).toBeGreaterThan(0);
    expect(formatDate(iso).length).toBeGreaterThan(0);
  });
});
