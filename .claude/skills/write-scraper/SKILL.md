---
name: write-scraper
description: >
  How to build or fix a raffle-site scraper for CarRaffleOdds. Load this whenever
  creating a new scraper, repairing a broken one, or changing how raffle data is
  extracted and written to Supabase. Covers the base interface, the no-mock-data
  rule, politeness/anti-bot handling, field mapping, and error reporting.
---

# Skill: write-scraper

Scrapers are the product — there is no site without live data. Build them to be honest, polite, and observable.

> Verify file paths and the base interface against the real repo before coding.

## The iron rule
**Never fabricate or hardcode data.** If a scraper can't get real data, it writes nothing and reports the failure. No sample arrays, no fallback records. (CLAUDE.md rule 1 — this killed the previous build.)

## Base interface (per src/scrapers/base.ts)
Each scraper returns a `ScraperResult { siteName, raffles: ScrapedRaffle[], errors, duration }`. A `ScrapedRaffle` maps to the `raffles` schema: externalId, title, car fields, prizeValue/cashAlternative/additionalCash (pence), imageUrl, sourceUrl, ticketPrice (pence), totalTickets, ticketsSold, percentSold, endDate, drawType.

## Procedure
1. **Pick the tool.** Static HTML → `cheerio` + fetch. JS-heavy / protected → `Playwright` (stealth, realistic delays, rotating UA only where needed).
2. **Read the site first.** Listing page for cards; individual pages for full detail (total/sold tickets, cash alt, specs, draw date). Many sites need listing → per-raffle fetch.
3. **Extract to `ScrapedRaffle`.** Money in pence. Parse car make/model/year/variant; run the category classifier. Capture `image_url` and the direct `source_url` (this is the affiliate/link-out target).
4. **Be polite.** 1–2s between requests, respect the site, don't hammer. Honour robots/ToS spirit; don't aggressively evade.
5. **Handle the odds model.** Fixed-odds → odds from total_tickets. Spot-the-ball/unlimited (BOTB) → **no** total_tickets, no "1 in X"; capture entry price + draw frequency and set `competition_model` accordingly.
6. **Write to Supabase** via the upsert keyed on `(site_id, external_id)`. Update changed fields; create a `raffle_snapshots` row for odds history; write a `scrape_logs` row for the run.
7. **Report.** On exception or a degraded run (zero raffles, high missing-image rate), raise a Sentry event tagged with the site (ENG-1). Per-site try/catch so one site failing doesn't kill the orchestrator.

## Site notes (from prior build — re-verify current state)
- **Dream Car Giveaways** — easiest; cheerio works; good data on listing + detail pages.
- **Elite Competitions / 7 Days Performance** — low–moderate protection; standard Playwright.
- **RevComps** — had stability/downtime issues; check before investing time.
- **BOTB** — hardest: heavy anti-bot, dynamic loading, and spot-the-ball/unlimited (different model). Tackle last; handle odds separately.

## Acceptance for a scraper change
- Runs against the live site and writes real rows (verify in Supabase).
- Partial failures degrade gracefully (write what worked, report the rest).
- Failures surface in Sentry tagged by site; `scrape_logs` updated.
- No fabricated data anywhere.
