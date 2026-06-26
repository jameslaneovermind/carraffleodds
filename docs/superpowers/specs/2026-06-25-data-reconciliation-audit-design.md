# Data Reconciliation Audit — Design spec

**Date:** 2026-06-25  
**Status:** Approved, ready for implementation

---

## Problem

We have no way of knowing how accurately our Supabase DB reflects what's actually live on the 8 raffle sites we scrape. Scrapers are already showing failures (Rev Comps and 7 Days Performance timing out, Click Competitions returning 0 results). Before fixing ENG-3 (missing images) and ENG-4 (scraper reliability), we need to measure the actual state: what's stale, what's missing, and where images are broken.

---

## What this is

A one-off local diagnostic script. Run it from your Mac, get a terminal report + JSON file. Not production code, not scheduled — just a tool to measure the problem before fixing it.

---

## Approach

Single script `scripts/audit-sites.ts`. Serial execution, one site at a time.

For each site:
1. Playwright fetches the live listing page HTML
2. HTML is sent to Claude Haiku API → returns structured JSON array of live raffles
3. Supabase is queried for that site's current `active`/`ending_soon` raffles
4. Diff: match by URL slug (`external_id`), flag all discrepancies
5. Print per-site summary to terminal
6. Append site result to audit object

After all 8 sites: print overall summary, save full JSON to `scripts/audit-output/YYYY-MM-DD.json`.

---

## Architecture

**File:** `scripts/audit-sites.ts` (single file, ~250 lines)

**Dependencies:**
- `@anthropic-ai/sdk` — call Claude Haiku for HTML extraction
- `playwright` — already installed, fetch live listing pages
- Supabase service client — `createServiceClient()` from `src/lib/supabase`
- `dotenv` — reads `.env.local` for `ANTHROPIC_API_KEY` + Supabase keys

**Run:** `npx tsx scripts/audit-sites.ts`

**Output:** Terminal report + `scripts/audit-output/YYYY-MM-DD.json`

---

## What it checks

### Presence discrepancies
- **Stale in DB** — raffle is `active`/`ending_soon` in DB but not found on the live site. Scraper failed to clean it up, or raffle ended and wasn't caught.
- **Missing from DB** — raffle is live on the site but has no DB record. Scraper is missing it entirely.

### Field accuracy (matched raffles only)
- **Missing image** — `image_url` is null in DB. ENG-3 flag.
- **Price mismatch** — live ticket price differs from DB by more than 10%. Scraper parsing the wrong field.
- **End date mismatch** — live end date differs from DB by more than 24 hours. Date parsing issue.

### Site-level health
- Live count vs DB count — large gap signals partial scraper results.
- Zero live results from Claude → site down or Playwright blocked.

**Deliberately not checked:** `tickets_sold`/`percent_sold` (changes constantly), `prize_value` (unreliable to extract from listing pages).

---

## Claude prompting

**Model:** `claude-haiku-4-5-20251001` — fast and cheap for structured HTML extraction. Estimated cost: £0.01–0.05 per site, £0.10–0.40 for a full 8-site run.

**Prompt:**
```
System:
You are extracting raffle listings from HTML. Return a JSON array of raffles found on the page.
Each raffle object: { title, sourceUrl, ticketPricePence (integer or null), endDate (ISO string or null), imageUrl (string or null), totalTickets (integer or null) }
Only include paid entries — skip free/skill-based entries.
If a field is not visible on the listing page, return null for it.
Return only the JSON array, no other text.

User: [listing page HTML, truncated to 100,000 chars if needed]
```

No tool-use/function-calling — raw JSON response, parsed with `JSON.parse()`. Retry once on parse failure.

---

## Matching logic

Match live raffles to DB records by URL slug:
- Extract slug from `sourceUrl` using the existing `extractSlugFromUrl()` utility from `src/lib/utils.ts`
- Compare against `external_id` in DB records for that site
- Exact match = matched raffle; no match = missing from DB
- DB records with no matching live raffle = stale

---

## Output

### Terminal (per site, printed as each site completes)
```
━━━ Dream Car Giveaways ━━━━━━━━━━━━━━━━━━━━
Live: 47  |  DB active: 45  |  Matched: 44
⚠  Stale in DB (not on live site): 1
     → "Win a BMW M3 Competition" [bmw-m3-competition]
⚠  Missing from DB (live but not scraped): 3
     → "Win a Ferrari 296 GTB" [ferrari-296-gtb]  (+ 2 more)
✗  Missing images: 8/44 matched
✗  End date mismatch >24h: 1
     → "Win a Range Rover Sport" [range-rover-sport-240501]
```

### Terminal (overall summary at end)
```
━━━ AUDIT SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━
Sites audited: 8/8  |  Live: 312  |  DB active: 287
Stale in DB: 4  |  Missing from DB: 29
Missing images: 47/287 (16%)
Price mismatches: 2  |  End date mismatches: 3
Saved → scripts/audit-output/2026-06-25.json
```

### JSON structure
```json
{
  "auditedAt": "2026-06-25T23:00:00Z",
  "sites": [
    {
      "slug": "dream-car-giveaways",
      "name": "Dream Car Giveaways",
      "liveCount": 47,
      "dbCount": 45,
      "matchedCount": 44,
      "staleInDb": [{ "title": "...", "externalId": "..." }],
      "missingFromDb": [{ "title": "...", "sourceUrl": "..." }],
      "missingImages": [{ "title": "...", "externalId": "..." }],
      "priceMismatches": [{ "title": "...", "livePrice": 99, "dbPrice": 149 }],
      "endDateMismatches": [{ "title": "...", "liveDate": "...", "dbDate": "..." }],
      "error": null
    }
  ],
  "summary": {
    "sitesAudited": 8,
    "totalLive": 312,
    "totalDb": 287,
    "staleInDb": 4,
    "missingFromDb": 29,
    "missingImages": 47,
    "priceMismatches": 2,
    "endDateMismatches": 3
  }
}
```

If a site errors (Playwright blocked, Claude fails), its entry gets `"error": "<message>"` and zeros for counts. The script continues to the next site.

---

## Success criteria

- All 8 sites attempted; errors are caught and don't abort the run
- Terminal output clearly shows issues per site as it runs
- JSON saved with full detail for every discrepancy
- Claude parse failures retry once before marking site as errored
- Runs to completion in under 15 minutes on a standard connection
