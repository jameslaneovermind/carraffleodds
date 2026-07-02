import { describe, it, expect } from 'vitest';
import { groupDrawsByDate } from '../draws';
import type { Raffle } from '../types';

const makeRaffle = (endDate: string | null, id = endDate ?? 'null') =>
  ({ id, end_date: endDate } as unknown as Raffle);

describe('groupDrawsByDate', () => {
  it('groups two raffles on the same UK day into one group', () => {
    const now = new Date('2026-07-01T10:00:00Z');
    const draws = [
      makeRaffle('2026-07-01T18:00:00Z', 'r1'),
      makeRaffle('2026-07-01T20:00:00Z', 'r2'),
      makeRaffle('2026-07-02T14:00:00Z', 'r3'),
    ];
    const groups = groupDrawsByDate(draws, now);
    expect(groups).toHaveLength(2);
    expect(groups[0].draws).toHaveLength(2);
    expect(groups[1].draws).toHaveLength(1);
  });

  it('labels today\'s group "Today"', () => {
    const now = new Date('2026-07-01T10:00:00Z');
    const draws = [makeRaffle('2026-07-01T18:00:00Z')];
    const groups = groupDrawsByDate(draws, now);
    expect(groups[0].label).toBe('Today');
  });

  it('labels tomorrow\'s group "Tomorrow"', () => {
    const now = new Date('2026-07-01T10:00:00Z');
    const draws = [makeRaffle('2026-07-02T14:00:00Z')];
    const groups = groupDrawsByDate(draws, now);
    expect(groups[0].label).toBe('Tomorrow');
  });

  it('labels later dates with weekday and date, no year', () => {
    // 2026-07-03 is a Friday
    const now = new Date('2026-07-01T10:00:00Z');
    const draws = [makeRaffle('2026-07-03T18:00:00Z')];
    const groups = groupDrawsByDate(draws, now);
    expect(groups[0].label).toBe('Friday 3 July');
  });

  it('sorts groups chronologically', () => {
    const now = new Date('2026-07-01T10:00:00Z');
    const draws = [
      makeRaffle('2026-07-03T18:00:00Z', 'r1'),
      makeRaffle('2026-07-01T18:00:00Z', 'r2'),
    ];
    const groups = groupDrawsByDate(draws, now);
    expect(groups[0].label).toBe('Today');
    expect(groups[1].label).toBe('Friday 3 July');
  });

  it('skips raffles with null end_date', () => {
    const now = new Date('2026-07-01T10:00:00Z');
    expect(groupDrawsByDate([makeRaffle(null)], now)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(groupDrawsByDate([], new Date())).toEqual([]);
  });

  it('groups by UK date, not UTC (BST timezone test)', () => {
    // 23:00 UTC on 2026-07-01 = 00:00 BST on 2026-07-02 → belongs to July 2
    const now = new Date('2026-07-01T10:00:00Z');
    const draws = [makeRaffle('2026-07-01T23:00:00Z')];
    const groups = groupDrawsByDate(draws, now);
    expect(groups[0].isoDate).toBe('2026-07-02');
    expect(groups[0].label).toBe('Tomorrow');
  });
});
