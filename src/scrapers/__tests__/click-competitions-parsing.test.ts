import { describe, it, expect } from 'vitest';
import { deriveCompetitionUrl, parseAutoDrawDate } from '../click-competitions';

describe('deriveCompetitionUrl', () => {
  it('derives a /prizes/ URL from a prizes slugPrefix', () => {
    const url = deriveCompetitionUrl('.prizes.CupraLeon010726', 'https://www.clickcompetitions.co.uk');
    expect(url).toBe('https://www.clickcompetitions.co.uk/prizes/CupraLeon010726');
  });

  it('derives an /instawins/ URL from an instawins slugPrefix', () => {
    const url = deriveCompetitionUrl('.instawins.CarIW280626', 'https://www.clickcompetitions.co.uk');
    expect(url).toBe('https://www.clickcompetitions.co.uk/instawins/CarIW280626');
  });

  it('handles slugs with no leading dot gracefully', () => {
    const url = deriveCompetitionUrl('prizes.SomePrize', 'https://www.clickcompetitions.co.uk');
    expect(url).toBe('https://www.clickcompetitions.co.uk/prizes/SomePrize');
  });
});

describe('parseAutoDrawDate', () => {
  it('parses a PM draw date', () => {
    const d = parseAutoDrawDate('28/6/2026 - 2:00PM');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getDate()).toBe(28);
    expect(d!.getMonth()).toBe(5); // June = 5 (0-indexed)
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getHours()).toBe(14); // 2pm
    expect(d!.getMinutes()).toBe(0);
  });

  it('parses a zero-padded date', () => {
    const d = parseAutoDrawDate('01/07/2026 - 9:00PM');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getDate()).toBe(1);
    expect(d!.getMonth()).toBe(6); // July
    expect(d!.getHours()).toBe(21);
  });

  it('returns undefined for unrecognised format', () => {
    expect(parseAutoDrawDate('TBD')).toBeUndefined();
    expect(parseAutoDrawDate('')).toBeUndefined();
  });

  it('handles 12:00PM correctly (noon)', () => {
    const d = parseAutoDrawDate('15/8/2026 - 12:00PM');
    expect(d!.getHours()).toBe(12);
  });

  it('handles 12:00AM correctly (midnight)', () => {
    const d = parseAutoDrawDate('15/8/2026 - 12:00AM');
    expect(d!.getHours()).toBe(0);
  });
});
