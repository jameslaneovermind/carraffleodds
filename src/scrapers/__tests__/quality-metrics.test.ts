import { describe, it, expect } from 'vitest';
import { computeQualityMetrics } from '../quality-metrics';
import type { ScrapedRaffle } from '../base';

function makeRaffle(overrides: Partial<ScrapedRaffle> = {}): ScrapedRaffle {
  return {
    externalId: 'test-id',
    title: 'Win BMW M3',
    sourceUrl: 'https://example.com/product/win-bmw-m3/',
    ...overrides,
  };
}

describe('computeQualityMetrics', () => {
  it('returns all zeros for an empty array', () => {
    expect(computeQualityMetrics([])).toEqual({
      imageNullRate: 0,
      priceNullRate: 0,
      otherTypeRate: 0,
    });
  });

  it('imageNullRate: 4 of 5 missing → 0.8', () => {
    const raffles = [
      makeRaffle({ imageUrl: 'https://example.com/img.jpg' }),
      makeRaffle({ imageUrl: undefined }),
      makeRaffle({ imageUrl: undefined }),
      makeRaffle({ imageUrl: undefined }),
      makeRaffle({ imageUrl: undefined }),
    ];
    expect(computeQualityMetrics(raffles).imageNullRate).toBe(0.8);
  });

  it('imageNullRate: all images present → 0', () => {
    const raffles = [
      makeRaffle({ imageUrl: 'https://example.com/a.jpg' }),
      makeRaffle({ imageUrl: 'https://example.com/b.jpg' }),
    ];
    expect(computeQualityMetrics(raffles).imageNullRate).toBe(0);
  });

  it('priceNullRate: 1 of 2 missing → 0.5', () => {
    const raffles = [
      makeRaffle({ ticketPrice: 500 }),
      makeRaffle({ ticketPrice: undefined }),
    ];
    expect(computeQualityMetrics(raffles).priceNullRate).toBe(0.5);
  });

  it('otherTypeRate: unrecognised title classifies as other', () => {
    const raffles = [
      makeRaffle({ title: 'Win BMW M3' }),          // → 'car'
      makeRaffle({ title: 'xyzzy mystery prize' }),  // → 'other'
    ];
    expect(computeQualityMetrics(raffles).otherTypeRate).toBe(0.5);
  });
});
