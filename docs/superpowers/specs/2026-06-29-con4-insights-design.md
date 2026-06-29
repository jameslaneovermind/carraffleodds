# CON-4: Data Insights Section — Design Spec

**Date:** 2026-06-29
**Ticket:** CON-4 (Phase 2/3, Commercial + Data Journalism)
**Effort:** L (~2 weeks: data queries + components + 5 pages of editorial)
**Scope:** New `/insights/` section — live data widgets + human-written editorial

---

## Goal

Build a data-driven insights section that no other UK competition site can replicate — because they don't have the data. Four and a half months of scraped snapshot history across 8 sites becomes editorial proof that earns AI citations, community links, and search rankings for high-intent queries.

---

## Data Audit Findings (completed 2026-06-29)

Run before designing anything. Key facts the implementation must respect:

| Site | Snapshots | Completed car draws | Avg % sold at draw (cars) | Notes |
|------|-----------|-------------------|--------------------------|-------|
| Rev Comps | 73,749 | 182 | 73.2% | Feb 2026 → now |
| Dream Car Giveaways | 23,867 | 89 | 74.6% | Feb 2026 → now |
| Lucky Day | 16,135 | 12 | 54.5% | Feb 2026 → now |
| 7 Days Performance | 13,036 | 34 | 67.4% | Feb 2026 → now |
| BOTB | 2,488 | 2 | n/a | Spot-the-ball; no fixed ticket cap |
| Elite Competitions | 2,186 | 2 | 69.0% | Small sample |
| Click Competitions | 1,216 | 0 | — | Scraper only fixed 2026-06-26 |
| LLF Games | 486 | 0 | — | Very small sample |
| **Total** | **133,163** | **321** | | |

**Critical constraints:**
- `prize_value` is NULL for all historical raffles. EV-based insights are deferred until enough forward data (3–4 months of new raffles) accumulates. Do not attempt EV calculations.
- All sites run non-car competitions (watches, cash, tech, houses). Car-specific pages must filter `prize_type = 'car'`. All-competition pages intentionally show everything.
- BOTB is `spot_the_ball` / unlimited model — no `total_tickets`. Exclude from % sold comparisons.
- Sample sizes vary widely. Always show draw count alongside stats so readers can judge confidence themselves. No minimum thresholds that hide data — show small samples with their count.

---

## Architecture

### New route section

```
/insights                          → hub page
/insights/site-comparison          → % sold at draw, cars only
/insights/best-time-to-enter       → timing analysis, all raffles
/insights/when-sites-release       → release patterns, all raffles
/insights/market-overview          → prize type breakdown, all raffles
```

All pages: Next.js App Router, server components, SSR. `revalidate = 3600` (hourly refresh). No client JS except the `SnapshotChart` line chart.

### Components

**`InsightsWidget`** — server component. Takes a `config` prop, fetches its own data from Supabase via `createBrowserClient()`, renders as a styled table with CSS horizontal bars. No chart library. Three `type` variants:

```tsx
type InsightsWidgetConfig =
  | { type: 'site-comparison'; scope: 'cars' }
  | { type: 'release-patterns'; scope: 'all' }
  | { type: 'market-breakdown'; scope: 'all' }
```

**`SnapshotChart`** — lightweight client component. Receives pre-fetched aggregated data as a prop (server fetches, passes down). Renders a line chart of avg `percent_sold` by days-before-end-date as a plain SVG path — no chart library dependency.

### Page structure (all pages)

```
[Human-written editorial prose — 3–5 paragraphs, approved before publish]
[InsightsWidget or SnapshotChart]
[Optional: second widget with a different cut of the data]
[Footer: methodology note + "data updated hourly" + last scraped timestamp]
```

---

## Pages

### `/insights` — hub

**Scope:** n/a  
**Data:** most recent snapshot timestamp; count of active competitions; count of sites tracked.

Human-written intro (3–4 paragraphs): what CarRaffleOdds data is, how it's collected (scrapers running since February 2026, ~8 sites, hourly snapshots), what this section shows, and an honest methodology note. Links to all four insight pages with a one-sentence description each.

---

### `/insights/site-comparison` — cars only

**Scope:** `prize_type = 'car'`, `status IN ('drawn', 'sold_out')`  
**Key metric:** avg `percent_sold` at draw time per site (lower = better true odds for the buyer)

**Editorial angle:** Most competitions draw before every ticket is sold. The % sold at draw is the number that tells you whether advertised odds match reality — a draw at 55% sold means the true odds were nearly double what the site advertised.

**Widget — site comparison table:**

Query: group completed car draws by site, compute avg/min/max `percent_sold`, total draw count. Order by avg `percent_sold` ascending (best true odds first).

Display columns:
- Site name (linked to `/sites/[slug]`)
- Draws in dataset (transparency — don't hide small samples)
- Avg % sold at draw
- Range (min–max)
- CSS bar: width = avg % sold, coloured green→amber→red (low → high)

Include all sites with at least 1 completed car draw. Show BOTB separately with a note explaining its model is different (skill competition, no ticket cap — not comparable).

**Second widget (optional, same page):** Same data but filtered to the last 90 days only, so readers can see whether a site's sell-through rate is trending up or down.

---

### `/insights/best-time-to-enter` — all raffles

**Scope:** all `raffle_snapshots` where `snapshot_at < end_date`  
**Key metric:** avg `percent_sold` bucketed by days-before-end-date

**Editorial angle:** Most competitions follow a predictable sell-through curve. Understanding where you are on that curve tells you whether the "ending soon" urgency is real or manufactured.

**SnapshotChart:**

Query: for each snapshot, compute `days_before_end = FLOOR((end_date - snapshot_at) / interval '1 day')`. Bucket 0–60 days. Average `percent_sold` per bucket with sample count. Filter to buckets with ≥ 50 snapshots for statistical reliability (don't show noisy tail — this is a display filter, not a data cap).

Server fetches the aggregated array, passes to `SnapshotChart` as a prop.

Chart: line chart, x-axis = days before end (60 → 0), y-axis = avg % sold (0–100%). Annotation at the "inflection point" — where the curve steepens. This is the data behind the "enter late" insight.

**Second widget:** same chart but split by site (multiple lines, one per site). Shows whether the late-surge pattern is universal or site-specific.

---

### `/insights/when-sites-release` — all raffles

**Scope:** all raffles, `created_at` patterns  
**Key metric:** competition count by day of week, by site

**Editorial angle:** Each site has a publishing rhythm. Knowing it means you can be first in on a new competition — when sell-through is lowest and true odds are best.

**Widget — release patterns:**

Query: group raffles by `EXTRACT(DOW FROM created_at)` and site. Return day-of-week label + count per site.

Display: a table per site showing day-of-week distribution as a mini bar chart (CSS bars, width proportional to count). Include total competitions per site as context. Show all 7 days even if count = 0.

**Second widget:** same data but time-of-day (hour of day, grouped in 3-hour bands) for sites with enough data (> 100 raffles). Some sites may batch-publish at a specific hour.

---

### `/insights/market-overview` — all raffles

**Scope:** all active competitions  
**Key metric:** competition count by prize type, by site

**Editorial angle:** These sites run far more than car competitions. The full picture shows what you're actually competing against — and where the niches are.

**Widget — prize type breakdown:**

Query: active raffles grouped by site + `prize_type`. Return counts. Include `null`/`other` categories.

Display: table with one row per site, columns per prize type (car, cash, tech, watch, house, holiday, motorcycle, other). Cell = count, styled as a heat cell (darker = more). Footer row = totals across all sites.

**Second widget:** same data as a stacked bar per site (CSS), normalised to 100% — shows each site's prize mix as a proportion.

---

## Queries (reference implementations)

### Site comparison
```sql
SELECT 
  s.name, s.slug,
  COUNT(r.id)::int AS total_draws,
  ROUND(AVG(r.percent_sold)::numeric, 1) AS avg_percent_sold,
  ROUND(MIN(r.percent_sold)::numeric, 1) AS min_percent_sold,
  ROUND(MAX(r.percent_sold)::numeric, 1) AS max_percent_sold
FROM raffles r
JOIN sites s ON r.site_id = s.id
WHERE r.prize_type = 'car'
  AND r.status IN ('drawn', 'sold_out')
  AND r.percent_sold IS NOT NULL
  AND s.active = true
GROUP BY s.id, s.name, s.slug
ORDER BY avg_percent_sold ASC;
```

### Timing analysis (SnapshotChart)
```sql
SELECT
  FLOOR(EXTRACT(EPOCH FROM (r.end_date - rs.snapshot_at)) / 86400)::int AS days_before_end,
  ROUND(AVG(rs.percent_sold)::numeric, 1) AS avg_percent_sold,
  COUNT(rs.id)::int AS sample_count
FROM raffle_snapshots rs
JOIN raffles r ON rs.raffle_id = r.id
WHERE r.end_date IS NOT NULL
  AND rs.snapshot_at < r.end_date
  AND EXTRACT(EPOCH FROM (r.end_date - rs.snapshot_at)) / 86400 BETWEEN 0 AND 60
GROUP BY days_before_end
HAVING COUNT(rs.id) >= 50
ORDER BY days_before_end DESC;
```

### Release patterns
```sql
SELECT
  s.name, s.slug,
  EXTRACT(DOW FROM r.created_at)::int AS day_of_week,
  COUNT(r.id)::int AS competition_count
FROM raffles r
JOIN sites s ON r.site_id = s.id
WHERE s.active = true
  AND r.created_at IS NOT NULL
GROUP BY s.id, s.name, s.slug, day_of_week
ORDER BY s.name, day_of_week;
```

### Market breakdown
```sql
SELECT
  s.name, s.slug,
  COALESCE(r.prize_type, 'other') AS prize_type,
  COUNT(r.id)::int AS active_count
FROM raffles r
JOIN sites s ON r.site_id = s.id
WHERE r.status IN ('active', 'ending_soon')
  AND s.active = true
GROUP BY s.id, s.name, s.slug, prize_type
ORDER BY s.name, active_count DESC;
```

---

## SEO

- Each page gets a unique `<title>`, `<meta description>`, and `<link rel="canonical">`.
- Hub page (`/insights`) is the primary shareable URL — this is what gets linked in forums and cited by AI engines.
- All pages are server-rendered (SSR) so Google indexes fresh data.
- No `noindex`. All five pages are intended to rank.
- Add "Data & Insights" to site navigation.

---

## Editorial requirements

- **All prose is human-written and human-approved before publish.** The agent may draft; a human edits and signs off. This applies to every page in this section — no auto-publishing.
- Methodology note on every page (brief): data collected by automated scrapers running since February 2026, updated hourly, covering 8 UK competition sites.
- Responsible framing: insights are analytical, not a guarantee. Don't imply users can "beat" the competition operators.
- 18+ framing consistent with the rest of the site.

---

## Out of scope

- EV / value-per-pound per site — deferred until `prize_value` accumulates in forward data (~Q4 2026)
- Prize value accuracy vs external RRP — requires external data source (Autotrader/CAP HPI), deferred to CON-5
- Raffolux — zero data, exclude from all pages
- `/raffles` default page prize_type filtering — separate ticket
- Interactive client-side filtering on the insight tables — add later if engagement data justifies it
