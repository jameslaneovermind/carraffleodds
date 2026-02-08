import type { PrizeType } from './types';

// ============================================
// Category definitions for filter pills
// ============================================

export interface CategoryDefinition {
  slug: string;
  label: string;
  /** Plural label for page titles, e.g., "Car Raffles" not "Cars Raffles" */
  pageTitle: string;
  prizeTypes: PrizeType[];
  /** SEO metadata for category landing pages */
  seoTitle: string;
  seoDescription: string;
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    slug: 'cars',
    label: 'Cars',
    pageTitle: 'Car Raffles',
    prizeTypes: ['car'],
    seoTitle: 'Best Car Raffle Odds UK — Compare Live Competitions',
    seoDescription: 'Compare car raffle odds across UK competition sites. Find the best deals on BMW, Audi, Ferrari and more.',
  },
  {
    slug: 'motorcycles',
    label: 'Motorcycles',
    pageTitle: 'Motorcycle Raffles',
    prizeTypes: ['motorcycle'],
    seoTitle: 'Best Motorcycle Raffle Odds UK — Compare Live Competitions',
    seoDescription: 'Compare motorcycle raffle odds across UK competition sites. Find the best deals on Ducati, Sur Ron and more.',
  },
  {
    slug: 'cash',
    label: 'Cash',
    pageTitle: 'Cash Raffles',
    prizeTypes: ['cash'],
    seoTitle: 'Best Cash Raffle Odds UK — Win Tax Free Cash',
    seoDescription: 'Compare cash raffle odds across UK competition sites. Find the best deals on tax free cash prizes.',
  },
  {
    slug: 'tech',
    label: 'Tech',
    pageTitle: 'Tech Raffles',
    prizeTypes: ['tech'],
    seoTitle: 'Best Tech Raffle Odds UK — Win iPhones, TVs & More',
    seoDescription: 'Compare tech raffle odds across UK competition sites. Win iPhones, PS5s, TVs and more.',
  },
  {
    slug: 'watches',
    label: 'Watches',
    pageTitle: 'Watch Raffles',
    prizeTypes: ['watch'],
    seoTitle: 'Best Watch Raffle Odds UK — Win Rolex, TAG Heuer',
    seoDescription: 'Compare watch raffle odds across UK competition sites. Win Rolex, TAG Heuer, Omega and more.',
  },
];

/** Categories shown behind a "More" toggle */
export const MORE_CATEGORIES: CategoryDefinition[] = [
  {
    slug: 'holidays',
    label: 'Holidays',
    pageTitle: 'Holiday Raffles',
    prizeTypes: ['holiday'],
    seoTitle: 'Best Holiday Raffle Odds UK — Win Dream Getaways',
    seoDescription: 'Compare holiday raffle odds across UK competition sites.',
  },
  {
    slug: 'house',
    label: 'House',
    pageTitle: 'House Raffles',
    prizeTypes: ['house'],
    seoTitle: 'Best House Raffle Odds UK — Win Your Dream Home',
    seoDescription: 'Compare house raffle odds across UK competition sites.',
  },
  {
    slug: 'other',
    label: 'Other',
    pageTitle: 'Other Raffles',
    prizeTypes: ['other'],
    seoTitle: 'All Other Raffles UK — Compare Live Competitions',
    seoDescription: 'Compare raffle odds across UK competition sites for all other prize types.',
  },
];

export const ALL_CATEGORIES = [...CATEGORIES, ...MORE_CATEGORIES];

export function getCategoryBySlug(slug: string): CategoryDefinition | undefined {
  return ALL_CATEGORIES.find(c => c.slug === slug);
}

// ============================================
// Sort options
// ============================================

export interface SortOption {
  value: string;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: 'ending-soon', label: 'Ending Soon' },
  { value: 'best-odds', label: 'Best Odds' },
  { value: 'lowest-price', label: 'Lowest Price' },
  { value: 'highest-value', label: 'Highest Value' },
  { value: 'newest', label: 'Newest' },
];

export const DEFAULT_SORT = 'ending-soon';
