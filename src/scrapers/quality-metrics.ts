import { classifyPrizeType } from '../lib/utils';
import type { ScrapedRaffle } from './base';

export interface QualityMetrics {
  imageNullRate: number;
  priceNullRate: number;
  otherTypeRate: number;
}

export function computeQualityMetrics(raffles: ScrapedRaffle[]): QualityMetrics {
  if (raffles.length === 0) {
    return { imageNullRate: 0, priceNullRate: 0, otherTypeRate: 0 };
  }
  const total = raffles.length;
  return {
    imageNullRate: raffles.filter(r => !r.imageUrl).length / total,
    priceNullRate: raffles.filter(r => !r.ticketPrice).length / total,
    otherTypeRate: raffles.filter(r => classifyPrizeType(r.title) === 'other').length / total,
  };
}
