-- CarRaffleOdds Database Schema
-- Migration 001: Initial schema

-- Sites we track
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  logo_url TEXT,
  trust_score DECIMAL(2,1),           -- 1.0 to 5.0
  trustpilot_rating DECIMAL(2,1),
  trustpilot_reviews INTEGER,
  affiliate_url TEXT,                  -- base affiliate link
  competition_model TEXT,              -- 'fixed_odds' | 'spot_the_ball' | 'unlimited'
  has_affiliate BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual competitions/raffles
CREATE TABLE raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  external_id TEXT,                    -- ID/slug from source site

  title TEXT NOT NULL,                 -- "Win this 2024 BMW M2 & £2,000 or £52,000 Tax Free"

  -- Prize classification
  prize_type TEXT,                     -- 'car' | 'cash' | 'tech' | 'watch' | 'holiday' | 'house' | 'motorcycle' | 'other'
  car_make TEXT,                       -- "BMW"
  car_model TEXT,                      -- "M2"
  car_year INTEGER,
  car_variant TEXT,                    -- "Competition xDrive"
  car_category TEXT,                   -- 'performance' | 'luxury' | 'electric' | 'suv' | 'sedan' | 'supercar' | 'classic' | 'van' | 'other'

  -- Prize details
  prize_value INTEGER,                 -- estimated value in pence
  cash_alternative INTEGER,            -- cash alt in pence (if offered)
  additional_cash INTEGER,             -- bonus cash included (e.g., "+ £2,000")
  image_url TEXT,
  source_url TEXT NOT NULL,            -- direct link to competition page

  -- Ticket/odds data
  ticket_price INTEGER,                -- in pence
  total_tickets INTEGER,
  tickets_sold INTEGER,
  tickets_remaining INTEGER,
  percent_sold DECIMAL(5,2),

  -- Calculated fields
  odds_ratio DECIMAL(10,2),            -- total_tickets / 1 (your odds per ticket)
  value_per_pound DECIMAL(10,2),       -- prize_value / ticket_price
  expected_value DECIMAL(10,4),        -- (prize_value / total_tickets) / ticket_price

  -- Timing
  end_date TIMESTAMPTZ,
  draw_type TEXT,                      -- 'live' | 'automated'

  -- Status
  status TEXT DEFAULT 'active',        -- 'active' | 'ending_soon' | 'sold_out' | 'drawn' | 'cancelled'
  is_featured BOOLEAN DEFAULT false,

  -- Metadata
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(site_id, external_id)
);

-- Scraping run logs
CREATE TABLE scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT,                         -- 'success' | 'partial' | 'failed'
  items_found INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

-- Historical snapshots for tracking odds changes over time
CREATE TABLE raffle_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID REFERENCES raffles(id) ON DELETE CASCADE,
  tickets_sold INTEGER,
  percent_sold DECIMAL(5,2),
  ticket_price INTEGER,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_raffles_status ON raffles(status);
CREATE INDEX idx_raffles_end_date ON raffles(end_date);
CREATE INDEX idx_raffles_car_category ON raffles(car_category);
CREATE INDEX idx_raffles_prize_type ON raffles(prize_type);
CREATE INDEX idx_raffles_site ON raffles(site_id);
CREATE INDEX idx_raffles_percent_sold ON raffles(percent_sold);
CREATE INDEX idx_snapshots_raffle ON raffle_snapshots(raffle_id);
CREATE INDEX idx_scrape_logs_site ON scrape_logs(site_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on sites
CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at on raffles
CREATE TRIGGER raffles_updated_at
  BEFORE UPDATE ON raffles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed the initial sites we track
INSERT INTO sites (name, slug, url, competition_model, active) VALUES
  ('Dream Car Giveaways', 'dream-car-giveaways', 'https://dreamcargiveaways.co.uk', 'fixed_odds', true),
  ('BOTB', 'botb', 'https://botb.com', 'spot_the_ball', false),
  ('Rev Comps', 'rev-comps', 'https://revcomps.com', 'fixed_odds', false),
  ('7 Days Performance', '7-days-performance', 'https://7daysperformance.co.uk', 'fixed_odds', false),
  ('Elite Competitions', 'elite-competitions', 'https://elitecompetitions.co.uk', 'fixed_odds', false);
