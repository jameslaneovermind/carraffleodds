# ENG-1: Sentry Observability Design

## What

Add Sentry to the scraper service on the DigitalOcean droplet. The goal is passive dashboard visibility for individual scraper issues, and a single email alert when failures become systemic or the service goes completely dark. Not on-call — this is a side project where you can't always act immediately, so the design optimises for signal quality over coverage breadth.

## Context

The scraper service (`scripts/scraper-service.ts`) runs as a PM2 process on the droplet. It full-scrapes 8 sites every 3 hours and quick-updates every 20 minutes. Failures are currently silent: `scrape_logs` has a historical record, but nothing raises its hand when something goes wrong. The Lucky Day images bug (340 null images for weeks) and the LLF Games stale listings (year-advanced end dates for months) were both caught manually — Sentry would have surfaced them on the first affected scrape run.

## Event taxonomy

### `error` level — triggers email alert

- **Systemic failure:** ≥2 scrapers returned 0 results on the same full scrape run. Fired as a single `captureMessage` listing the affected sites — not one event per site.
- **Systemic quality failure:** ≥2 scrapers exceed a data quality threshold (see below) on the same full scrape run. Fired as a single `captureMessage` with per-site rates.
- **Unhandled exception:** any uncaught exception or unhandled promise rejection in the service process.
- **Per-scraper fatal:** any scraper that throws rather than returning a result (already caught in the orchestrator's per-scraper try/catch).

### `warning` level — dashboard visible, no alert

- **Single scraper zero results:** one scraper returned 0 on a full scrape.
- **High image null rate:** >80% of a scraper's results have no `imageUrl`. Tagged `{site}`.
- **High price null rate:** >50% of a scraper's results have no `ticketPrice`. Tagged `{site}`.
- **High unknown prize_type rate:** >60% of a scraper's results classify as `prize_type: 'unknown'`. Catches regressions in `classifyPrizeType`. Tagged `{site}`.

### Not sent to Sentry

- Quick update runs (noise — full scrape is the source of truth)
- Individual page/fetch failures within a scraper (already aggregated in `result.errors` and `scrape_logs`)
- Browser disconnect warnings (auto-recovery, not actionable)
- Successful runs — a healthy cycle produces zero Sentry events

## Heartbeat (service goes dark)

Use Sentry Cron Monitoring (free tier). Register a monitor with schedule `0 */3 * * *`. After each successful full scrape, send a check-in ping. If no ping arrives within 3 hours + 30 minute margin, Sentry fires an alert. Catches: PM2 crash, droplet down, service hung indefinitely.

## Alert rules (Sentry UI, not code)

- `level:error` → email immediately
- `level:warning` → no alert, dashboard only

One rule. Thresholds can be tightened or loosened in the Sentry UI without touching code.

## Implementation shape

### New file: `src/lib/sentry.ts` (~20 lines)

Single `initSentry(dsn: string)` function. Initialises `@sentry/node` with DSN, `environment: 'production'`, and the droplet hostname as `serverName`. Called once at service startup. Consumers import from `@sentry/node` directly — this file only handles init config.

### Modified: `scripts/scraper-service.ts` (~10 lines added)

- Call `initSentry(process.env.SENTRY_DSN)` after env validation at startup. No-op if DSN is absent (safe for local dev).
- Replace `console.error` in the `uncaughtException` handler with `Sentry.captureException(error)` + `console.error`.
- Replace `console.error` in the `unhandledRejection` handler with `Sentry.captureException(reason)` + `console.error`.
- At the end of a successful full scrape inside `runWithLock`: send Sentry cron check-in (`Sentry.captureCheckIn`).

### Modified: `src/scrapers/run-all.ts` (~50 lines added)

**Per-scraper, after result is returned (full scrape only):**

1. Compute quality metrics from `result.raffles`:
   - `imageNullRate` = results with no `imageUrl` / total
   - `priceNullRate` = results with no `ticketPrice` / total
   - `unknownTypeRate` = results where `classifyPrizeType(title) === 'unknown'` / total
2. Fire individual `warning` events for any threshold exceeded, tagged `{site: scraper.siteSlug}`.
3. In the existing per-scraper catch block: add `Sentry.captureException(error, { tags: { site: scraper.siteSlug } })` alongside the existing `logScrapeRun`.

**After the full batch completes:**

Collect the per-scraper outcomes. If ≥2 scrapers have zero results or quality failures, fire one `error`-level `captureMessage` with the full list of affected sites and their failure reasons.

### Modified: `package.json`

Add `@sentry/node` to dependencies. No other new packages.

## Environment

`SENTRY_DSN` stored as an env var on the droplet only (in `/opt/carraffleodds/.env`). Never committed to the repo. The Sentry project is created manually on a personal Sentry account (free tier) before implementation — not the work account.

## Out of scope

- Sentry in the Next.js frontend (separate concern, separate project)
- Performance tracing / transaction spans (unnecessary overhead for a cron-driven service)
- Quick update quality metrics (quick updates are best-effort; full scrape is the source of truth)
- Per-site baseline comparison for classification health (requires scrape history to establish; current `unknown rate` threshold is a sufficient proxy for now)
