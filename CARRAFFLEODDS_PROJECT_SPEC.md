# CarRaffleOdds — Project Spec & Cursor Starter Guide

## What This Is

A UK car raffle comparison website that scrapes live competition data from major raffle sites and presents it in a single, filterable interface. Users can compare odds, prices, and value across sites to find the best deals. Revenue comes from affiliate links.

**Domain:** carraffleodds.com (already owned)

---

## Architecture

### Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL) — free tier is fine to start
- **Scraping:** Node.js scripts using Playwright for JS-heavy sites, cheerio for static sites
- **Scheduling:** Vercel Cron Jobs (or a simple GitHub Action on a schedule)
- **Hosting:** Vercel
- **Analytics:** PostHog or Plausible

### Why This Stack

The previous version used a React frontend (Lovable-generated) + FastAPI backend + SQLite + Selenium scrapers. Too many moving parts. Next.js consolidates the frontend + API routes + server-side rendering into one project. Supabase gives us a real database with a generous free tier. Vercel handles hosting and cron.

---

## Project Structure

```
carraffleodds/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Homepage — featured raffles, stats, hero
│   │   ├── raffles/
│   │   │   └── page.tsx        # Main comparison page (filterable grid)
│   │   ├── ending-soon/
│   │   │   └── page.tsx        # Raffles ending within 48hrs
│   │   ├── sites/
│   │   │   └── [slug]/
│   │   │       └── page.tsx    # Individual site review pages
│   │   ├── about/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── scrape/
│   │       │   └── route.ts    # Trigger scraping (protected endpoint)
│   │       └── raffles/
│   │           └── route.ts    # Public API for raffle data
│   ├── components/
│   │   ├── raffle-card.tsx
│   │   ├── raffle-grid.tsx
│   │   ├── filters.tsx
│   │   ├── odds-calculator.tsx
│   │   ├── site-badge.tsx
│   │   └── layout/
│   │       ├── header.tsx
│   │       └── footer.tsx
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   ├── types.ts            # Shared TypeScript types
│   │   └── utils.ts            # Odds calculation, formatting
│   └── scrapers/               # Scraping modules
│       ├── base.ts             # Base scraper interface
│       ├── dream-car-giveaways.ts
│       ├── botb.ts
│       ├── rev-comps.ts
│       ├── seven-days.ts
│       ├── elite-competitions.ts
│       └── run-all.ts          # Orchestrator
├── supabase/
│   └── migrations/
│       └── 001_initial.sql     # Database schema
├── scripts/
│   └── seed.ts                 # Seed script for dev (NOT mock data in prod)
└── .env.local                  # Supabase keys, scrape secrets
```

---

## Database Schema

```sql
-- Sites we track
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  logo_url TEXT,
  trust_score DECIMAL(2,1),       -- 1.0 to 5.0
  trustpilot_rating DECIMAL(2,1),
  trustpilot_reviews INTEGER,
  affiliate_url TEXT,              -- base affiliate link
  competition_model TEXT,          -- 'fixed_odds' | 'spot_the_ball' | 'unlimited'
  has_affiliate BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual competitions/raffles
CREATE TABLE raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  external_id TEXT,                -- ID/slug from source site
  title TEXT NOT NULL,             -- "Win this 2024 BMW M2 & £2,000 or £52,000 Tax Free"
  car_make TEXT,                   -- "BMW"
  car_model TEXT,                  -- "M2"
  car_year INTEGER,
  car_variant TEXT,                -- "Competition xDrive"
  car_category TEXT,               -- 'performance' | 'luxury' | 'electric' | 'suv' | 'sedan' | 'supercar' | 'classic' | 'van' | 'motorcycle' | 'other'
  
  -- Prize details
  prize_value INTEGER,             -- estimated value in pence
  cash_alternative INTEGER,        -- cash alt in pence (if offered)
  additional_cash INTEGER,         -- bonus cash included (e.g., "+ £2,000")
  image_url TEXT,
  source_url TEXT NOT NULL,        -- direct link to competition page
  
  -- Ticket/odds data
  ticket_price INTEGER,            -- in pence
  total_tickets INTEGER,
  tickets_sold INTEGER,
  tickets_remaining INTEGER,
  percent_sold DECIMAL(5,2),
  
  -- Calculated fields
  odds_ratio DECIMAL(10,2),        -- total_tickets / 1 (your odds per ticket)
  value_per_pound DECIMAL(10,2),   -- prize_value / ticket_price
  expected_value DECIMAL(10,4),    -- (prize_value / total_tickets) / ticket_price
  
  -- Timing
  end_date TIMESTAMPTZ,
  draw_type TEXT,                  -- 'live' | 'automated'
  
  -- Status
  status TEXT DEFAULT 'active',    -- 'active' | 'ending_soon' | 'sold_out' | 'drawn' | 'cancelled'
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
  site_id UUID REFERENCES sites(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT,                     -- 'success' | 'partial' | 'failed'
  items_found INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

-- Historical snapshots for tracking odds changes over time
CREATE TABLE raffle_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID REFERENCES raffles(id),
  tickets_sold INTEGER,
  percent_sold DECIMAL(5,2),
  ticket_price INTEGER,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_raffles_status ON raffles(status);
CREATE INDEX idx_raffles_end_date ON raffles(end_date);
CREATE INDEX idx_raffles_car_category ON raffles(car_category);
CREATE INDEX idx_raffles_site ON raffles(site_id);
CREATE INDEX idx_snapshots_raffle ON raffle_snapshots(raffle_id);
```

---

## Scraper Architecture

### CRITICAL: No Mock Data

The previous build failed because AI tools kept falling back to mock/hardcoded data when scrapers didn't work. This time:

1. **Never commit mock data to the codebase.** No hardcoded raffle arrays. No sample data files. The ONLY data source is the scrapers writing to the database.
2. **Use a `seed.ts` script** only for local dev, and it should call the actual scrapers against live sites — not insert fake records.
3. **If a scraper fails, the page shows "No data available" — not fake data.**

### Base Scraper Interface

```typescript
// src/scrapers/base.ts
export interface ScrapedRaffle {
  externalId: string;
  title: string;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  carVariant?: string;
  carCategory?: string;
  prizeValue?: number;        // pence
  cashAlternative?: number;   // pence
  additionalCash?: number;    // pence
  imageUrl?: string;
  sourceUrl: string;
  ticketPrice?: number;       // pence
  totalTickets?: number;
  ticketsSold?: number;
  percentSold?: number;
  endDate?: Date;
  drawType?: string;
}

export interface ScraperResult {
  siteName: string;
  raffles: ScrapedRaffle[];
  errors: string[];
  duration: number;
}

export interface Scraper {
  name: string;
  siteSlug: string;
  scrape(): Promise<ScraperResult>;
}
```

### Target Sites — Scraping Notes

#### 1. Dream Car Giveaways (PRIORITY — easiest target)

- **URL:** `https://dreamcargiveaways.co.uk/competitions`
- **Sub-pages:** `/competitions/cars`, `/competitions/cash`, `/competitions/cars/coupe`, etc.
- **Model:** Fixed-odds raffle with limited tickets
- **Protection:** Minimal — works with basic HTTP requests + cheerio
- **Data available on listing page:**
  - Competition title
  - Ticket price
  - Percentage sold
  - Days remaining
  - Prize images
  - Category (Cars, Cash, Tech, Watches)
- **Data on individual pages:**
  - Total tickets / tickets sold / remaining
  - Cash alternative value
  - Car specs (BHP, 0-60, mileage, year)
  - Draw date and type
  - Multiple images
- **Strategy:** Fetch listing page, extract card data, then hit individual pages for full details
- **Rate limiting:** 1-2 seconds between requests

#### 2. BOTB (Best of the Best)

- **URL:** `https://botb.com`
- **Model:** Spot-the-ball (unlimited entries, not fixed odds)
- **Protection:** HIGH — advanced anti-bot, dynamic loading, rate limiting
- **Key difference:** No "total tickets" concept — odds aren't fixed
- **Data available:**
  - Competition titles and images
  - Entry cost (from £0.40)
  - Prize categories
  - Draw frequency (weekly)
- **Strategy:** Use Playwright with stealth settings, rotating user agents, realistic delays
- **Note:** Because BOTB is unlimited entry/spot-the-ball, odds calculation is different. Display as "entry from £X" rather than "1 in Y odds"

#### 3. Rev Comps

- **URL:** `https://revcomps.com`
- **Model:** Fixed-odds raffle
- **Status (as of July 2025):** Was experiencing issues/downtime. Check current status before investing scraper time.
- **Protection:** Moderate
- **Strategy:** Monitor availability, implement when stable

#### 4. 7 Days Performance

- **URL:** `https://7daysperformance.co.uk`
- **Model:** Fixed-odds raffle
- **Protection:** Low-moderate
- **Strategy:** Standard Playwright scraper

#### 5. Elite Competitions

- **URL:** `https://elitecompetitions.co.uk`
- **Model:** Fixed-odds raffle
- **Protection:** Low-moderate

### Scraper Development Order

1. **Dream Car Giveaways** — prove the pipeline works end-to-end with the easiest site
2. **Elite Competitions / 7 Days** — expand coverage with similar difficulty
3. **Rev Comps** — if stable
4. **BOTB** — tackle last due to protection complexity and different odds model

### Car Classification

Use a lookup/matching approach to categorise cars:

```typescript
// Categories: performance, luxury, electric, suv, sedan, supercar, classic, van, motorcycle, other

const CATEGORY_RULES: Record<string, string[]> = {
  supercar: ['lamborghini', 'ferrari', 'mclaren', 'bugatti', 'pagani', 'koenigsegg'],
  performance: ['m2', 'm3', 'm4', 'm5', 'm140i', 'm240i', 'rs3', 'rs4', 'rs6', 'amg', 'type r', 'st', 'vxr', 'gti', 'golf r', 'focus rs', 'civic type', 'sti', 'wrx', 'gt3', 'gt4', 'cayman', '911'],
  luxury: ['rolls royce', 'bentley', 'maybach', 'range rover', 'g wagon', 'g63'],
  electric: ['tesla', 'model 3', 'model y', 'model s', 'model x', 'taycan', 'e-tron', 'id.', 'ioniq', 'ev6'],
  suv: ['urus', 'cayenne', 'macan', 'x3', 'x5', 'x7', 'q5', 'q7', 'glc', 'gle'],
  classic: ['escort', 'mk1', 'mk2', 'e30', 'e36', 'mini cooper classic'],
  van: ['transit', 'sprinter', 'vivaro', 'transporter'],
  motorcycle: ['ducati', 'kawasaki', 'yamaha', 'suzuki', 'honda cb', 'triumph'],
};
```

---

## Odds & Value Calculations

```typescript
// Odds ratio: "1 in X" — lower is better
const oddsRatio = totalTickets; // per single ticket

// Value per pound: how much prize value per £1 spent
const valuePerPound = prizeValue / ticketPrice;

// Expected value: statistical value of each ticket
// EV > 1 means ticket is "worth more" than its price on average
const expectedValue = (prizeValue / totalTickets) / ticketPrice;

// Cost to match odds: how much you'd need to spend to have ~63% chance
// (equivalent to buying enough tickets that probability ≈ 1 - 1/e)
const costToMatch = ticketPrice * totalTickets * 0.632;
```

---

## Pages & Features

### Homepage
- Hero with value proposition: "Compare odds across UK car raffles. Find the best deals."
- Key stats (total active raffles, sites tracked, lowest odds available)
- Featured/best value raffles (3-6 cards)
- "Ending Soon" preview
- Site trust badges

### Main Comparison Page (`/raffles`)
- Filterable grid of all active raffles
- Filters: site, car category, price range, odds range, ending within X days
- Sort by: best odds, lowest price, ending soon, highest value, best expected value
- Card shows: car image, title, site badge, ticket price, odds, % sold, end date, affiliate link

### Ending Soon (`/ending-soon`)
- Raffles ending within 48 hours, sorted by end time
- Countdown timers
- Highlight "low sold %" as opportunities

### Site Reviews (`/sites/[slug]`)
- Individual pages per raffle site
- Trust score, Trustpilot rating, competition model explanation
- All active raffles from that site
- Historical stats (average odds, typical ticket prices)

### About Page
- What the site does
- How odds are calculated
- Disclaimer (not gambling advice, independent comparison)

---

## SEO & Content

- SSR all pages (Next.js App Router with server components)
- Dynamic meta titles: "Best Car Raffle Odds UK — Compare [X] Active Competitions"
- Individual raffle pages are NOT needed initially — link out to source sites via affiliate links
- Blog section (later) for content like "Best low-odds car raffles this week"
- Schema markup for product comparisons

---

## Affiliate Integration

- Each site record has an `affiliate_url` field
- All "Enter Now" / "Buy Tickets" buttons use affiliate links
- Track clicks with UTM params or simple click counter in DB
- Disclose affiliate relationship in footer and about page

---

## Scheduling

Run scrapers via Vercel Cron or GitHub Actions:

- **Every 4 hours:** Full scrape of all sites
- **Every 30 minutes:** Quick scrape of "ending soon" raffles only (for accurate % sold)
- **Daily:** Clean up drawn/expired raffles, take snapshots for historical tracking

---

## Development Phases

### Phase 1: Scrapers (do this FIRST)
- [ ] Set up Supabase project and run migration
- [ ] Build Dream Car Giveaways scraper
- [ ] Verify scraper outputs real data to database
- [ ] Build scraper runner / orchestrator
- [ ] Add second site (Elite or 7 Days)

### Phase 2: Core UI
- [ ] Next.js project with Tailwind + shadcn
- [ ] Homepage with live data from Supabase
- [ ] Main comparison page with filters and sorting
- [ ] Raffle card component
- [ ] Ending soon page

### Phase 3: Polish & Launch
- [ ] Site review pages
- [ ] SEO metadata and sitemap
- [ ] Affiliate link integration
- [ ] About page and disclaimers
- [ ] Deploy to Vercel, point carraffleodds.com
- [ ] Set up cron schedule

### Phase 4: Growth
- [ ] Add remaining sites (BOTB, Rev Comps)
- [ ] Historical odds tracking and charts
- [ ] Email alerts for low-odds opportunities
- [ ] Blog / content section
- [ ] Social sharing

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SCRAPE_API_KEY=              # protect the /api/scrape endpoint
```

---

## Key Lessons From Previous Build

1. **Scrapers are the product.** Don't build UI until you have live data flowing.
2. **No mock data.** If the scraper doesn't work, fix the scraper — don't fake the output.
3. **Start with the easiest site.** Dream Car Giveaways has the best data structure and lowest protection.
4. **BOTB is different.** It's spot-the-ball with unlimited entries, not a fixed-odds raffle. Handle it separately.
5. **Car classification matters.** Users want to filter by type. Build the categoriser early.
6. **Percentage sold is the key metric.** Low % sold + close to end date = best odds opportunity.
7. **Keep it simple.** One repo, one framework, one database. The previous version had too many moving parts.
