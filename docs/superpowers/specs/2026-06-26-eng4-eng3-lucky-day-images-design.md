# ENG-4 / ENG-3: Lucky Day Scraper Rewrite + Image Placeholder Design

## What

Rewrite `src/scrapers/lucky-day-competitions.ts` from Playwright to `fetch` + `cheerio`. This fixes two issues in one shot:

- **ENG-4**: The Playwright scraper times out on the DigitalOcean droplet (3/3 navigation attempts). Diagnosis confirmed the site is fully server-rendered WooCommerce — `curl` returns 200 in 0.04s with 56+ `/product/` links in the static HTML. Playwright is the wrong tool.
- **ENG-3**: 340/340 active Lucky Day raffles have `null` image_url. Playwright's lazy-load handling missed the images; cheerio reads `img[src]` directly from the static HTML.

Also adds a branded placeholder component for any raffle card with `null` image_url (safety net for any future scraper gaps).

Click Competitions is excluded — their site rebuilt on Next.js with client-side rendering; that requires a separate investigation and scraper rewrite.

## Architecture

`src/scrapers/lucky-day-competitions.ts` is rewritten from scratch. The `BaseScraper` interface (`scrape()`, `quickUpdate()`) stays identical — no changes to `run-all.ts` or any other consumer.

The new scraper:
- Uses `node-fetch` + `cheerio` (both already project dependencies)
- Fetches listing pages with a browser `User-Agent` header and a 30s `AbortController` timeout
- Parses raffle cards from server-rendered HTML
- For high-value prizes (same keyword list as today), fetches the WooCommerce detail page with a second `fetch` call to get `cashAlternative` and `prizeValue`
- Does **not** use a browser at all — no Playwright context parameter is needed, but `scrape(context)` and `quickUpdate(context)` signatures are kept for interface compatibility (context is simply unused)

`src/components/raffle-card` (or the nearest image-rendering component): render a branded placeholder `<div>` when `imageUrl` is null — grey background, site wordmark centred. No broken-image icon, no external request.

## Data Extraction

### Listing page
- URL: `https://www.luckydaycompetitions.com/all-competitions/`
- Pagination: follow WooCommerce `.next.page-numbers` link, up to 10 pages max
- Card selector: `li a[href*="/product/"]` (same as existing Playwright logic)
- Per card, extract via cheerio:
  - `imageUrl`: `img[src]` from within the card — present in static HTML, no lazy-load issue
  - `title`: first non-metadata text line (same skip-pattern logic as today)
  - `ticketPrice`: line matching `/^£[\d.]+$/`
  - `totalTickets` / `ticketsRemaining` / `percentSold`: line matching `/(\d+)\s*\/\s*(\d+)/`
  - `endDateText`: line matching `/^ends\s/i`
  - `sourceUrl`: the `href` attribute

### Detail page (high-value prizes only)
Same keyword list as today (`bmw`, `audi`, `mercedes`, etc.). Fetched with `fetch` + cheerio:
- `cashAlternative`: text matching `/cash\s*alternative[:\s]*£([\d,]+)/i`
- `prizeValue`: text matching `/(?:prize|rrp|value)[:\s]*£([\d,]+)/i`
- `imageUrl` override: `.woocommerce-product-gallery img` — higher-res than the listing thumbnail if available
- `totalTickets` fallback: `/(?:max|total)\s*(?:entries|tickets)[:\s]*([\d,]+)/i`

### Image placeholder (UI)
In the raffle card component, when `imageUrl` is null or empty:
- Render a `<div>` with light grey background (`bg-gray-100`) and the CarRaffleOdds wordmark centred in muted text
- No `<img>` tag, no broken-image icon, no external image request
- Matches the card's existing aspect ratio

## Error Handling

- Listing page fetch failure → return empty `ScrapedRaffle[]` and push error string (no fabricated data — CLAUDE.md rule 1)
- Detail page fetch failure → fall back to listing card data (same pattern as current scraper)
- Fetch timeout: 30s via `AbortController` on each request
- Politeness: 800ms delay between requests (same as today)

## Fix for Existing Null Images

No manual DB patch needed. The scraper upserts on `(site_id, external_id)` and writes `image_url` on each run. The 340 existing null-image records get populated automatically on the next successful scrape after deployment.

## Deployment

1. Run locally: `npm run scrape:lucky-day-competitions` — verify it returns raffles with `imageUrl` populated
2. Deploy to droplet via `deploy-droplet` skill (git pull → npm install → pm2 restart scraper)
3. Watch next full scrape cycle in PM2 logs — confirm Lucky Day shows raffles found > 0 and no fatal errors

## Out of Scope

- Click Competitions scraper (separate investigation needed — new Next.js site, unknown API structure)
- Sentry integration (ENG-1, separate ticket)
- Any change to the `quickUpdate` data flow beyond the tool swap
