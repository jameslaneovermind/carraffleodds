// ============================================
// CarRaffleOdds — Shared TypeScript Types
// ============================================

// --- Database Row Types ---

export interface Site {
  id: string;
  name: string;
  slug: string;
  url: string;
  logo_url: string | null;
  trust_score: number | null;
  trustpilot_rating: number | null;
  trustpilot_reviews: number | null;
  affiliate_url: string | null;
  competition_model: 'fixed_odds' | 'spot_the_ball' | 'unlimited';
  has_affiliate: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type PrizeType = 'car' | 'cash' | 'tech' | 'watch' | 'holiday' | 'house' | 'motorcycle' | 'other';

export type CarCategory =
  | 'performance'
  | 'luxury'
  | 'electric'
  | 'suv'
  | 'sedan'
  | 'supercar'
  | 'classic'
  | 'van'
  | 'other';

export type RaffleStatus = 'active' | 'ending_soon' | 'sold_out' | 'drawn' | 'cancelled';

export interface Raffle {
  id: string;
  site_id: string;
  external_id: string | null;

  title: string;

  // Prize classification
  prize_type: PrizeType | null;
  car_make: string | null;
  car_model: string | null;
  car_year: number | null;
  car_variant: string | null;
  car_category: CarCategory | null;

  // Prize details
  prize_value: number | null;       // pence
  cash_alternative: number | null;  // pence
  additional_cash: number | null;   // pence
  image_url: string | null;
  source_url: string;

  // Ticket/odds data
  ticket_price: number | null;      // pence
  total_tickets: number | null;
  tickets_sold: number | null;
  tickets_remaining: number | null;
  percent_sold: number | null;

  // Calculated fields
  odds_ratio: number | null;
  value_per_pound: number | null;
  expected_value: number | null;

  // Timing
  end_date: string | null;
  draw_type: string | null;

  // Status
  status: RaffleStatus;
  is_featured: boolean;

  // Metadata
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined data (optional, from queries)
  site?: Site;
}

export interface ScrapeLog {
  id: string;
  site_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'success' | 'partial' | 'failed';
  items_found: number;
  items_updated: number;
  items_new: number;
  error_message: string | null;
  duration_ms: number | null;
}

export interface RaffleSnapshot {
  id: string;
  raffle_id: string;
  tickets_sold: number | null;
  percent_sold: number | null;
  ticket_price: number | null;
  snapshot_at: string;
}
