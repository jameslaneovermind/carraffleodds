# Data Model

The canonical reference for the data schema and the derived metrics. Code and docs should agree with this; if they don't, this doc is wrong — fix it.

> **Grounding note:** this reflects the documented schema. The live site now tracks ~9 sites and several thousand raffles, so the real Supabase schema may have drifted from what's below. **Verify against the live database in Claude Code and correct this doc** before relying on field names. Fields marked *(verify)* are most likely to have changed.

---

## Tables

### `sites` — the raffle operators we track
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | unique, e.g. "Dream Car Giveaways" |
| `slug` | text | unique, used in `/sites/[slug]` |
| `url` | text | site homepage |
| `logo_url` | text | |
| `trust_score` | decimal(2,1) | 1.0–5.0, our own assessment *(verify how this is set)* |
| `trustpilot_rating` | decimal(2,1) | |
| `trustpilot_reviews` | integer | |
| `affiliate_url` | text | base affiliate link |
| `competition_model` | text | `fixed_odds` \| `spot_the_ball` \| `unlimited` |
| `has_affiliate` | boolean | do we earn from this site |
| `active` | boolean | |
| `created_at` / `updated_at` | timestamptz | |

### `raffles` — individual competitions
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `site_id` | uuid | FK → sites |
| `external_id` | text | id/slug from source site; unique with site_id |
| `title` | text | raw title from source |
| `car_make` / `car_model` / `car_year` / `car_variant` | text/int | parsed car details |
| `car_category` | text | performance \| luxury \| electric \| suv \| sedan \| supercar \| classic \| van \| motorcycle \| other |
| `prize_value` | integer | **pence** |
| `cash_alternative` | integer | **pence**, if offered |
| `additional_cash` | integer | **pence**, bonus cash included |
| `image_url` | text | source image |
| `source_url` | text | direct link to the raffle (this is what we link out to) |
| `ticket_price` | integer | **pence** |
| `total_tickets` | integer | null for unlimited/spot-the-ball |
| `tickets_sold` | integer | |
| `tickets_remaining` | integer | |
| `percent_sold` | decimal(5,2) | |
| `odds_ratio` | decimal | computed — see below |
| `value_per_pound` | decimal | computed |
| `expected_value` | decimal | computed |
| `end_date` | timestamptz | draw date |
| `draw_type` | text | `live` \| `automated` |
| `status` | text | `active` \| `ending_soon` \| `sold_out` \| `drawn` \| `cancelled` |
| `is_featured` | boolean | |
| `last_scraped_at` | timestamptz | freshness signal |
| `created_at` / `updated_at` | timestamptz | |

### `scrape_logs` — one row per scraper run
`id, site_id, started_at, completed_at, status (success|partial|failed), items_found, items_updated, items_new, error_message, duration_ms`.
This is the historical record. Active alerting on top of it is a separate concern → Sentry (see ENGINEERING.md ENG-1).

### `raffle_snapshots` — odds-over-time history
`id, raffle_id, tickets_sold, percent_sold, ticket_price, snapshot_at`. Powers trend/history and any "odds improving/worsening" signal.

---

## Field provenance

Every field is one of:
- **Scraped** — comes directly from the source site (title, ticket_price, total_tickets, tickets_sold, image_url, end_date, …).
- **Parsed** — derived from scraped text (car_make/model/year/variant, car_category via the classifier).
- **Computed** — calculated from scraped numbers (odds_ratio, value_per_pound, expected_value, percent_sold if not given).
- **Assessed** — our own judgement (trust_score, is_featured).

Keep computed fields in one place (`src/lib/utils.ts`) and store the result; don't recompute inline in components.

---

## Derived metric formulas

All money in pence; convert at display only.

```ts
// Odds per single ticket — "1 in X". Lower is better. Null for unlimited/spot-the-ball.
oddsRatio = totalTickets;

// True current odds if undersold: use tickets_sold near the draw, not the cap.
// (This is the core insight — an undersold guaranteed draw has better real odds than advertised.)
currentOdds = ticketsSold > 0 ? ticketsSold : totalTickets;

// Value per £1 of prize
valuePerPound = prizeValue / ticketPrice;

// Expected value of one ticket (>1 means statistically "worth" more than its price)
expectedValue = (prizeValue / totalTickets) / ticketPrice;

// Spend to reach ~63% cumulative chance (1 - 1/e)
costToMatch = ticketPrice * totalTickets * 0.632;
```

**Spot-the-ball / unlimited sites (e.g. BOTB):** there is no `total_tickets`, so odds aren't fixed. Don't compute or display "1 in X". Display entry price and draw frequency instead, and make the different model explicit in the UI. See `competition_model`.

---

## Status lifecycle

`active` → (within the ending window) `ending_soon` → after `end_date` passes → `drawn` (or `sold_out`/`cancelled`). The daily cleanup job is responsible for flipping status and removing ended raffles from listings (ENG-2). Listings must never show a raffle whose `end_date` has passed as live.
