# Scraper Architecture

Reference doc for the scraper service — how the pieces fit together, what each file does, the data flow, and how monitoring works. For procedures, see the skills: `write-scraper`, `deploy-droplet`, `add-site`.

---

## What the scraper service is

A long-running Node.js process on a DigitalOcean droplet (`root@46.101.53.17`), managed by PM2 under the process name `scraper`. It scrapes 8 UK car raffle sites on a schedule, writes live raffle data to Supabase, and reports failures to Sentry.

The Next.js frontend on Vercel reads from the same Supabase database — the scraper is the sole writer. There is no scraping on Vercel; Vercel never calls scraper code.

---

## File map

```
scripts/
  scraper-service.ts      ← PM2 entry point; owns the cron schedule, browser lifecycle,
                            Sentry init, and process-level exception handlers

src/scrapers/
  run-all.ts              ← Orchestrator; runs scrapers in batches, persists results,
                            fires Sentry quality events, aggregate failure check
  base.ts                 ← Shared types (ScrapedRaffle, ScraperResult), BaseScraper class,
                            and DB persistence helpers (persistScrapeResult, logScrapeRun)
  quality-metrics.ts      ← Pure function: imageNullRate, priceNullRate, otherTypeRate
  botb.ts                 ← BOTB scraper (spot-the-ball / unlimited model)
  click-competitions.ts   ← Click Competitions scraper
  dream-car-giveaways.ts  ← Dream Car Giveaways scraper
  elite-competitions.ts   ← Elite Competitions scraper
  llf-games.ts            ← LLF Games scraper
  lucky-day-competitions.ts ← Lucky Day Competitions scraper (cheerio, no Playwright)
  rev-comps.ts            ← Rev Comps scraper
  seven-days-performance.ts ← 7 Days Performance scraper

src/lib/
  sentry.ts               ← initSentry(dsn) — thin wrapper; called once at service startup
  supabase.ts             ← Typed Supabase client
  utils.ts                ← classifyPrizeType, classifyCarCategory, calculateRaffleMetrics,
                            parsePriceToPence, parseCashFromTitle, extractSlugFromUrl
```

---

## Cron schedule (inside scraper-service.ts)

| Job | Schedule | What it does |
|-----|----------|--------------|
| Full scrape | Every 3 hours (`0 */3 * * *`) | Deep scrape all 8 sites; fires Sentry cron check-in; runs cleanup after |
| Quick update | Every 20 minutes | Listing-only pass to refresh % sold, price, status |
| Startup | On process start | Full scrape + cleanup runs immediately |

**Only full scrape runs are instrumented with Sentry events.** Quick updates produce zero Sentry events — they're best-effort.

---

## Data flow (full scrape)

```
scraper-service.ts: fullScrape()
  → Sentry captureCheckIn (in_progress)
  → runWithLock('Full Scrape')
      → runAllScrapers({ browser, concurrency: 3 }) [src/scrapers/run-all.ts]
          → for each batch of scrapers:
              → scraper.scrape(context) → ScraperResult
              → computeQualityMetrics(result.raffles)
              → Sentry warning events (if thresholds exceeded)
              → persistScrapeResult(result, supabase) [src/scrapers/base.ts]
                  → upsert each raffle into raffles table
                  → guard: don't overwrite terminal statuses (drawn/cancelled)
                  → guard: don't overwrite past end_date with year-advanced date
              → logScrapeRun(siteSlug, ...) → scrape_logs table
          → checkAggregateFailures(outcomes)
              → if ≥2 scrapers failed or had quality issues → Sentry error event
      → cleanupExpiredRaffles()
          → mark past-end_date raffles as drawn/cancelled
          → take raffle_snapshots before retiring
  → Sentry captureCheckIn (ok or error)
```

---

## Scraper types

**Static HTML scrapers** (Lucky Day Competitions): use `cheerio` + native `fetch`. Faster, no Playwright needed. Site serves complete HTML immediately.

**Playwright scrapers** (everyone else): spawn a Chromium browser via the Playwright browser context passed from `scraper-service.ts`. The single browser instance is shared across scrapers within a run; `scraper-service.ts` watches for disconnect events and relaunches.

Each scraper implements:
- `scrape(context: BrowserContext): Promise<ScraperResult>` — full deep scrape
- `quickUpdate(context: BrowserContext): Promise<QuickUpdateResult>` — listing-only pass

---

## Database writes

All DB writes go through helpers in `src/scrapers/base.ts`:

**`persistScrapeResult`** — upserts each `ScrapedRaffle` into the `raffles` table keyed on `(site_id, external_id)`. Two guards:
1. Terminal statuses (`drawn`, `cancelled`) are never overwritten — a finished raffle stays finished even if the source site still lists it.
2. Past `end_date` values are never overwritten with a year-advanced date — `parseRelativeDate` advances "Ends Mon 27 Feb" by a year when it's already past; this guard keeps the correct past date so the cleanup job can retire it.

**`logScrapeRun`** — inserts a row into `scrape_logs` for every run (success, partial, or failed).

**`persistQuickUpdate`** — updates only `percent_sold`, `ticket_price`, `status`, `last_scraped_at`.

---

## Money

All money is stored as **integer pence** (`prize_value`, `cash_alternative`, `ticket_price`). Formatting to £ happens only at the display layer (`src/lib/utils.ts: parsePriceToPence`, `src/app/**`). Never introduce float pounds in the scraper layer.

---

## Sentry observability

Initialised in `scripts/scraper-service.ts` via `initSentry(process.env.SENTRY_DSN)`. DSN is stored only in `/opt/carraffleodds/.env` on the droplet — never committed.

### Event taxonomy

| Level | Event | Trigger |
|-------|-------|---------|
| `error` | Aggregate failure | ≥2 scrapers returned 0 results or exceeded a quality threshold on the same full scrape run |
| `error` | Unhandled exception | `uncaughtException` or `unhandledRejection` in the service process |
| `error` | Per-scraper fatal | Scraper throws inside the orchestrator's catch block (full scrape only) |
| `warning` | Single scraper zero results | One scraper returned 0 results on a full scrape |
| `warning` | High image null rate | >80% of a scraper's results have no `imageUrl` |
| `warning` | High price null rate | >50% of a scraper's results have no `ticketPrice` |
| `warning` | High other/unclassified prize_type rate | >60% of results classify as `prize_type: 'other'` |

Alert rule in Sentry UI: `level:error` → email immediately. `warning` → dashboard only, no alert.

### Heartbeat

A Sentry Cron Monitor (`scraper-full-run`, schedule `0 */3 * * *`, margin 30min) tracks whether the full scrape actually runs. If no check-in arrives within the window, Sentry fires an alert — catches PM2 crash, droplet down, or service hung.

### Healthy run = zero events

A full scrape where all scrapers return results within thresholds produces no Sentry events. Sentry noise only appears when something actually needs attention.

---

## Environment variables (droplet only)

All in `/opt/carraffleodds/.env`:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (write access) |
| `SENTRY_DSN` | Personal Sentry project DSN |

Never committed to the repo. The service exits on startup if Supabase vars are missing; Sentry is a no-op (not a crash) when `SENTRY_DSN` is absent.

---

## Common failure modes

**Scraper returns 0 results**
- Check `scrape_logs` in Supabase for the error message.
- Check the source site directly — markup may have changed.
- Sentry fires a `warning` event. If ≥2 scrapers are affected on the same run, an `error` event fires and you get an email.

**Browser disconnect**
- The service logs `[Service] Browser disconnected unexpectedly` and relaunches Chromium automatically. Occasional disconnects are normal; repeated ones on the same scraper suggest an anti-bot or timeout issue.

**Year-advanced end_date**
- `parseRelativeDate` (in `lucky-day-competitions.ts`) advances a date by 1 year if it appears to be in the past. A draw that ended "Tue 27 Feb" last year gets pinned to Feb next year. The `persistScrapeResult` guard prevents this from overwriting a correct past end_date in the DB.
- Long-term fix: use a full date format with year from the source site where available.

**Service not starting (MODULE_NOT_FOUND)**
- Usually a package not installed. Run `pm2 stop scraper && npm install && pm2 start scraper`. Never use `--omit=dev` or `--omit=optional` — the esbuild Linux binary is an optional dep and will be dropped.

---

## Adding a new site

Follow the `add-site` skill. Key steps: create `src/scrapers/<slug>.ts` implementing `BaseScraper`, register in `run-all.ts`'s `getAllScrapers()`, add the site row to Supabase, test locally with `npm run scrape:site -- --site <slug>`, deploy with the `deploy-droplet` skill.
