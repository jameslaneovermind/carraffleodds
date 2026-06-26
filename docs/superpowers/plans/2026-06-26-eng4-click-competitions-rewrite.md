# ENG-4: Click Competitions Scraper Rewrite

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Click Competitions scraper to work with their new Next.js SPA site, which killed all the old selectors.

**Architecture:** The site migrated from WordPress/WooCommerce to a custom Next.js SPA. The old `/competitions/` listing page is dead (404). New approach: (1) fetch active competitions from a JSON API endpoint — no Playwright needed; (2) hit a per-competition JSON API for ticket counts; (3) use Playwright only for detail pages to extract title, image, end date, and cash alternative from rendered HTML. Quick updates need zero Playwright — pure fetch.

**Tech Stack:** Playwright (Chromium) for detail pages only; native `fetch` for the JSON APIs; TypeScript/vitest for tests.

## Global Constraints

- No mock or hardcoded raffle data — if the API returns nothing, write nothing.
- Money in integer pence throughout (`ticketPrice`, `cashAlternative`, `prizeValue`).
- `externalId` for each raffle = the UUID from the API (`id` field) — stable across slug changes.
- `waitUntil: 'domcontentloaded'` + `waitForSelector('h1', { timeout: 15000 })` on detail pages — not `'networkidle'` (too slow).
- No new npm dependencies.
- `unified_status !== 'liveOpen'` competitions are skipped entirely.
- Polite delays: 1 s between detail page fetches (`this.delay(1000)`).
- The cookie banner selector is `button.osano-cm-accept` — dismiss once per browser context, skip on subsequent pages.

---

## Background: what was discovered through live investigation

The listing URL `https://www.clickcompetitions.co.uk/competitions/` now returns a "Page not found" page. All competition data comes from:

**Listing API** — GET `https://www.clickcompetitions.co.uk/be/content/api/competitions/active`
Returns a JSON array. Relevant fields per item:
```json
{
  "id": "019ef448-f6c1-7718-98cd-4268413c8f29",
  "slugPrefix": ".prizes.500TaxFreeCash010726",
  "unified_status": "liveOpen",
  "ticketAmount": 0.10,
  "visability": { "percentage": 1.35 },
  "global_maximum_tickets_quantity": 500
}
```
`ticketAmount` is in pounds (multiply by 100 for pence). `visability.percentage` is the % sold.

**Detail API** — GET `https://www.clickcompetitions.co.uk/be/content/api/competitions/{id}`
Returns `visability.soldTickets` and `visability.totalTickets` (the real cap — ignore `global_maximum_tickets_quantity`, which is the per-user limit).
```json
{
  "id": "019ef448-...",
  "visability": { "soldTickets": 135, "totalTickets": 9995 }
}
```

**Competition page URLs** — derived from `slugPrefix`:
- `.prizes.CupraLeon010726` → `https://www.clickcompetitions.co.uk/prizes/CupraLeon010726`
- `.instawins.CarIW280626` → `https://www.clickcompetitions.co.uk/instawins/CarIW280626`
- Rule: strip the leading dot, replace the first remaining dot with `/`.

**Detail page (Playwright)** — after JS render, `document.body.innerText` contains:
- Title in `<h1>` — e.g. `"Win This Cupra Leon VZ3 + £5,000 Cash!"`
- Draw date: `"Auto Draw:\n28/6/2026 - 2:00PM"` — regex `Auto Draw:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}:\d{2})\s*(AM|PM)`
- Cash alternative: `"Cash alternative:\n£20,000"` — regex `cash\s*alternative[:\s]*£([\d,]+)`
- Image: `<meta property="og:image">` is the most reliable source (set by the site, no Next.js proxy indirection)

---

## File Map

| File | Change |
|------|--------|
| `src/scrapers/click-competitions.ts` | Full rewrite — new API-based approach |
| `src/scrapers/__tests__/click-competitions-parsing.test.ts` | New — unit tests for the two pure parse functions |

---

## Task 1: Parsing utilities and tests

Export two pure functions from the scraper so they can be unit-tested without Playwright. The rest of the scraper stays untouched in this task.

**Files:**
- Modify: `src/scrapers/click-competitions.ts` (add two exported functions near the top, before the class)
- Create: `src/scrapers/__tests__/click-competitions-parsing.test.ts`

**Interfaces:**
- Produces:
  - `export function deriveCompetitionUrl(slugPrefix: string, baseUrl: string): string`
  - `export function parseAutoDrawDate(text: string): Date | undefined`

- [ ] **Step 1: Write the failing tests first**

  Create `src/scrapers/__tests__/click-competitions-parsing.test.ts`:

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { deriveCompetitionUrl, parseAutoDrawDate } from '../click-competitions';

  describe('deriveCompetitionUrl', () => {
    it('derives a /prizes/ URL from a prizes slugPrefix', () => {
      const url = deriveCompetitionUrl('.prizes.CupraLeon010726', 'https://www.clickcompetitions.co.uk');
      expect(url).toBe('https://www.clickcompetitions.co.uk/prizes/CupraLeon010726');
    });

    it('derives an /instawins/ URL from an instawins slugPrefix', () => {
      const url = deriveCompetitionUrl('.instawins.CarIW280626', 'https://www.clickcompetitions.co.uk');
      expect(url).toBe('https://www.clickcompetitions.co.uk/instawins/CarIW280626');
    });

    it('handles slugs with no leading dot gracefully', () => {
      const url = deriveCompetitionUrl('prizes.SomePrize', 'https://www.clickcompetitions.co.uk');
      expect(url).toBe('https://www.clickcompetitions.co.uk/prizes/SomePrize');
    });
  });

  describe('parseAutoDrawDate', () => {
    it('parses a PM draw date', () => {
      const d = parseAutoDrawDate('28/6/2026 - 2:00PM');
      expect(d).toBeInstanceOf(Date);
      expect(d!.getDate()).toBe(28);
      expect(d!.getMonth()).toBe(5); // June = 5 (0-indexed)
      expect(d!.getFullYear()).toBe(2026);
      expect(d!.getHours()).toBe(14); // 2pm
      expect(d!.getMinutes()).toBe(0);
    });

    it('parses a zero-padded date', () => {
      const d = parseAutoDrawDate('01/07/2026 - 9:00PM');
      expect(d).toBeInstanceOf(Date);
      expect(d!.getDate()).toBe(1);
      expect(d!.getMonth()).toBe(6); // July
      expect(d!.getHours()).toBe(21);
    });

    it('returns undefined for unrecognised format', () => {
      expect(parseAutoDrawDate('TBD')).toBeUndefined();
      expect(parseAutoDrawDate('')).toBeUndefined();
    });

    it('handles 12:00PM correctly (noon)', () => {
      const d = parseAutoDrawDate('15/8/2026 - 12:00PM');
      expect(d!.getHours()).toBe(12);
    });

    it('handles 12:00AM correctly (midnight)', () => {
      const d = parseAutoDrawDate('15/8/2026 - 12:00AM');
      expect(d!.getHours()).toBe(0);
    });
  });
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npx vitest run src/scrapers/__tests__/click-competitions-parsing.test.ts
  ```

  Expected: all tests fail with "does not provide an export named 'deriveCompetitionUrl'" (or similar).

- [ ] **Step 3: Add the two exported functions to `src/scrapers/click-competitions.ts`**

  Add these two exports near the top of the file, after the imports and before the `SKIP_TITLE_PATTERNS` constant (around line 18). Do not remove anything else yet — just add:

  ```typescript
  /**
   * Derives the full competition page URL from the API's slugPrefix.
   * ".prizes.CupraLeon010726"  → "https://…/prizes/CupraLeon010726"
   * ".instawins.CarIW280626"   → "https://…/instawins/CarIW280626"
   */
  export function deriveCompetitionUrl(slugPrefix: string, baseUrl: string): string {
    const withoutLeadingDot = slugPrefix.replace(/^\./, '');
    const path = withoutLeadingDot.replace('.', '/');
    return `${baseUrl}/${path}`;
  }

  /**
   * Parses "28/6/2026 - 2:00PM" → Date.
   * Returns undefined for any format it doesn't recognise.
   */
  export function parseAutoDrawDate(text: string): Date | undefined {
    const m = text.match(
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i
    );
    if (!m) return undefined;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1; // 0-indexed
    const year = parseInt(m[3], 10);
    let hour = parseInt(m[4], 10);
    const minute = parseInt(m[5], 10);
    const ampm = m[6].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return new Date(year, month, day, hour, minute, 0, 0);
  }
  ```

- [ ] **Step 4: Run tests — all should pass**

  ```bash
  npx vitest run src/scrapers/__tests__/click-competitions-parsing.test.ts
  ```

  Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/scrapers/click-competitions.ts src/scrapers/__tests__/click-competitions-parsing.test.ts
  git commit -m "feat(eng-4): add deriveCompetitionUrl and parseAutoDrawDate with tests"
  ```

---

## Task 2: Rewrite the scraper class

Replace everything in `src/scrapers/click-competitions.ts` from the class definition downwards. The two exported functions from Task 1 remain at the top; only the class and its internal types change.

**Files:**
- Modify: `src/scrapers/click-competitions.ts` (replace class + internal types; keep the two exported functions)

**Interfaces:**
- Consumes: `deriveCompetitionUrl` and `parseAutoDrawDate` from Task 1
- Consumes: `BaseScraper`, `ScrapedRaffle`, `ScraperResult`, `QuickUpdateResult` from `./base`
- Consumes: `parsePriceToPence` from `../lib/utils`
- Produces: `ClickCompetitionsScraper` class — same public interface as before (`scrape`, `quickUpdate`)

- [ ] **Step 1: Replace the internal types and class**

  After the two exported functions (and keeping the existing `SKIP_TITLE_PATTERNS` array if it still makes sense — it probably does), replace everything from `interface ListingCard` downwards with the following complete class:

  ```typescript
  // ============================================
  // API response types
  // ============================================

  interface ApiCompetition {
    id: string;
    slugPrefix: string;
    unified_status: string;
    ticketAmount: number;
    visability: {
      percentage?: number;
    };
    global_maximum_tickets_quantity: number;
  }

  interface ApiCompetitionDetail {
    visability: {
      soldTickets: number;
      totalTickets: number;
    };
  }

  // ============================================
  // Scraper
  // ============================================

  export class ClickCompetitionsScraper extends BaseScraper {
    name = 'Click Competitions';
    siteSlug = 'click-competitions';
    baseUrl = 'https://www.clickcompetitions.co.uk';

    private readonly listingApiUrl = 'https://www.clickcompetitions.co.uk/be/content/api/competitions/active';
    private cookiesDismissed = false;

    // ==========================================
    // Full Scrape
    // ==========================================

    async scrape(context: BrowserContext): Promise<ScraperResult> {
      const start = Date.now();
      const errors: string[] = [];
      const raffles: ScrapedRaffle[] = [];

      try {
        const competitions = await this.fetchActiveCompetitions();
        console.log(`[${this.name}] API returned ${competitions.length} active competitions`);

        for (let i = 0; i < competitions.length; i++) {
          const comp = competitions[i];
          const sourceUrl = deriveCompetitionUrl(comp.slugPrefix, this.baseUrl);
          console.log(`[${this.name}] [${i + 1}/${competitions.length}] ${comp.id}`);

          try {
            const raffle = await this.buildRaffle(context, comp, sourceUrl);
            if (raffle) raffles.push(raffle);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[${this.name}] Error on ${comp.id}: ${msg}`);
            errors.push(`${comp.id}: ${msg}`);
          }

          await this.delay(1000);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Fatal: ${msg}`);
        console.error(`[${this.name}] Fatal error: ${msg}`);
      }

      return {
        siteName: this.name,
        siteSlug: this.siteSlug,
        raffles,
        errors,
        duration: Date.now() - start,
      };
    }

    // ==========================================
    // Quick Update
    // ==========================================

    async quickUpdate(_context: BrowserContext): Promise<QuickUpdateResult> {
      const start = Date.now();
      const errors: string[] = [];
      const updates: QuickUpdateResult['updates'] = [];

      try {
        const competitions = await this.fetchActiveCompetitions();

        for (const comp of competitions) {
          updates.push({
            externalId: comp.id,
            percentSold: comp.visability.percentage ?? undefined,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
      }

      return {
        siteName: this.name,
        siteSlug: this.siteSlug,
        updates,
        errors,
        duration: Date.now() - start,
      };
    }

    // ==========================================
    // API helpers
    // ==========================================

    private async fetchActiveCompetitions(): Promise<ApiCompetition[]> {
      const response = await fetch(this.listingApiUrl, {
        headers: {
          'Accept': 'application/json',
          'Referer': this.baseUrl + '/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Listing API returned ${response.status}`);
      }

      const all = await response.json() as ApiCompetition[];
      return all.filter((c) => c.unified_status === 'liveOpen');
    }

    private async fetchCompetitionDetail(id: string): Promise<ApiCompetitionDetail | null> {
      try {
        const response = await fetch(
          `${this.baseUrl}/be/content/api/competitions/${id}`,
          {
            headers: {
              'Accept': 'application/json',
              'Referer': this.baseUrl + '/',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          }
        );
        if (!response.ok) return null;
        return await response.json() as ApiCompetitionDetail;
      } catch {
        return null;
      }
    }

    // ==========================================
    // Build a single raffle (API + Playwright)
    // ==========================================

    private async buildRaffle(
      context: BrowserContext,
      comp: ApiCompetition,
      sourceUrl: string,
    ): Promise<ScrapedRaffle | null> {
      // 1. Fetch ticket counts from the detail API (no Playwright needed)
      const detail = await this.fetchCompetitionDetail(comp.id);
      const totalTickets = detail?.visability.totalTickets;
      const ticketsSold = detail?.visability.soldTickets;

      // 2. Load the competition page in Playwright to get title, image, dates
      const page = await context.newPage();
      try {
        const ok = await this.navigateWithRetry(page, sourceUrl);
        if (!ok) return null;

        // Wait for the main content to render (it's a Next.js SPA)
        await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});

        // Dismiss cookie banner on first page in this context
        if (!this.cookiesDismissed) {
          await this.dismissCookies(page);
          this.cookiesDismissed = true;
        }

        const pageData = await page.evaluate(() => {
          // Title
          const h1 = document.querySelector('h1');
          const title = h1 ? (h1.textContent || '').trim() : '';

          // Image — og:image is most reliable; fall back to first skywind/prismic img
          const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
          let imageUrl: string | null = ogImage?.content || null;
          if (!imageUrl) {
            const imgs = Array.from(document.querySelectorAll('img'));
            const match = imgs.find(
              (img) => img.src.includes('skywind360') || img.src.includes('prismic.skywind360')
            );
            imageUrl = match?.src || null;
          }

          // End date — "Auto Draw:\n28/6/2026 - 2:00PM"
          const bodyText = document.body.innerText;
          const drawMatch = bodyText.match(
            /Auto Draw:\s*(\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM))/i
          );
          const drawDateStr = drawMatch ? drawMatch[1].trim() : null;

          // Cash alternative — "Cash alternative:\n£20,000"
          const cashMatch = bodyText.match(/cash\s*alternative[:\s]*£([\d,]+)/i);
          const cashAltStr = cashMatch ? cashMatch[1] : null;

          // Draw type — page text reveals "Auto Draw" vs "Live Draw"
          const isLive = /live\s*draw/i.test(bodyText);
          const drawType = isLive ? 'live_draw' : 'auto_draw';

          return { title, imageUrl, drawDateStr, cashAltStr, drawType };
        });

        if (!pageData.title) return null;

        const cashAlternative = pageData.cashAltStr
          ? parseInt(pageData.cashAltStr.replace(/,/g, ''), 10) * 100
          : undefined;

        const endDate = pageData.drawDateStr
          ? parseAutoDrawDate(pageData.drawDateStr)
          : undefined;

        return {
          externalId: comp.id,
          title: this.sanitizeTitle(pageData.title, sourceUrl),
          sourceUrl,
          imageUrl: pageData.imageUrl ?? undefined,
          ticketPrice: Math.round(comp.ticketAmount * 100),
          totalTickets,
          ticketsSold,
          percentSold: comp.visability.percentage ?? undefined,
          cashAlternative,
          endDate,
          drawType: pageData.drawType,
        };
      } finally {
        await page.close();
      }
    }

    // ==========================================
    // Helpers
    // ==========================================

    private async dismissCookies(page: Page): Promise<void> {
      try {
        const btn = await page.$('button.osano-cm-accept');
        if (btn) {
          await btn.click();
          await this.delay(500);
        }
      } catch {
        // Cookie banner not present
      }
    }
  }
  ```

- [ ] **Step 2: Update the import block at the top of the file**

  The new class uses `Page` from playwright directly (for `dismissCookies`), so make sure the import line includes it:

  ```typescript
  import { BrowserContext, Page } from 'playwright';
  ```

  Remove the import of `extractSlugFromUrl` from `../lib/utils` if it's no longer used — the new approach uses `deriveCompetitionUrl` instead.

  Also remove `parsePriceToPence` if it's no longer used (the new code does inline math). Check the top of the file and tidy only unused imports.

- [ ] **Step 3: Verify TypeScript compiles with no errors**

  ```bash
  npm run build
  ```

  Expected: build succeeds. Common error to watch for: `_context` unused parameter — the underscore prefix suppresses the lint warning.

- [ ] **Step 4: Run the full test suite to confirm nothing broke**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass, including the 8 from Task 1.

- [ ] **Step 5: Commit**

  ```bash
  git add src/scrapers/click-competitions.ts
  git commit -m "feat(eng-4): rewrite Click Competitions scraper — API-based listing, Playwright for detail pages"
  ```

---

## Task 3: Live validation and deploy

Confirm the rewritten scraper writes real data to Supabase, then deploy to the droplet.

**Files:**
- No file changes — this task is validation and deployment only.

**Interfaces:**
- Consumes: rewritten `ClickCompetitionsScraper` from Task 2
- Produces: verified Supabase rows + running droplet service with the new code

- [ ] **Step 1: Run the scraper against the live site**

  ```bash
  npx tsx src/scrapers/run-all.ts --site=click-competitions
  ```

  Expected output:
  ```
  [Orchestrator] Running 1 scraper(s): Click Competitions
  [Click Competitions] Starting full scrape...
  [Click Competitions] API returned N active competitions
  [Click Competitions] [1/N] <uuid>
  ...
  [Click Competitions] Found N raffles in Xms
  [Click Competitions] Persisted: X new, Y updated
  ```

  Failure indicators to investigate:
  - "Listing API returned 4xx" → API changed; check the URL
  - "Found 0 raffles" → all items filtered out or all detail pages failed; check `errors` array in output
  - TypeScript compile errors → fix before running

- [ ] **Step 2: Verify rows in Supabase**

  Run this query in the Supabase SQL editor (or via the local script approach used earlier in the session):

  ```sql
  SELECT
    external_id,
    title,
    ticket_price,
    total_tickets,
    tickets_sold,
    percent_sold,
    image_url,
    end_date,
    draw_type,
    status
  FROM raffles
  WHERE site_id = (SELECT id FROM sites WHERE slug = 'click-competitions')
    AND status IN ('active', 'ending_soon')
  ORDER BY end_date ASC
  LIMIT 20;
  ```

  Acceptance criteria:
  - At least 5 rows (the site typically has 10–20 active competitions)
  - `title` is not null and looks like a real competition title (e.g. "Win This Cupra Leon VZ3...")
  - `ticket_price` is not null and is in pence (e.g. `19` for £0.19)
  - `image_url` is set on most rows (og:image should be reliable)
  - `end_date` is set on rows with a known draw date

- [ ] **Step 3: Check image null rate**

  ```sql
  SELECT
    COUNT(*) FILTER (WHERE image_url IS NULL) AS null_images,
    COUNT(*) AS total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE image_url IS NULL) / COUNT(*), 1) AS null_pct
  FROM raffles
  WHERE site_id = (SELECT id FROM sites WHERE slug = 'click-competitions')
    AND status IN ('active', 'ending_soon');
  ```

  Expected: null_pct well below 50%. If og:image is available on all pages, it should be near 0%.

- [ ] **Step 4: Deploy to the droplet**

  Follow the deploy-droplet skill. Make sure the branch is merged to main first.

  ```bash
  # Merge to main (or open a PR — follow the project's branch workflow)
  git checkout main
  git merge --no-ff <your-branch>
  git push origin main
  ```

  Then deploy:

  ```bash
  ssh root@46.101.53.17 "cd /opt/carraffleodds && pm2 stop scraper && git pull && npm install"
  ssh root@46.101.53.17 "pm2 start scraper"
  ssh root@46.101.53.17 "sleep 8 && pm2 logs scraper --nostream --lines 30 --no-color 2>/dev/null"
  ```

  Expected startup sequence in logs:
  ```
  [Service] CarRaffleOdds Scraper Service starting...
  [Service] Chromium ready
  [Service] Running startup cleanup...
  [Cleanup] Running raffle cleanup...
  [Service] Running initial full scrape...
  [Orchestrator] Running 8 scraper(s): ...
  [Click Competitions] API returned N active competitions
  ```

- [ ] **Step 5: Confirm no Sentry errors for Click Competitions in the first post-deploy run**

  Check the Sentry dashboard after the next full scrape completes (~15 min after deploy). You should NOT see:
  - `[Click Competitions] Returned zero results`
  - `[Click Competitions] High image null rate`
  - Any `captureException` tagged with `site: click-competitions`

---

## Verification Checklist (run after all tasks)

- [ ] `npx vitest run` passes — all 8 parsing tests + existing tests green
- [ ] `npm run build` produces zero type errors
- [ ] `npx tsx src/scrapers/run-all.ts --site=click-competitions` returns ≥ 5 raffles
- [ ] Supabase shows real titles, prices, and images for click-competitions rows
- [ ] Droplet deployed and running without Sentry errors for this site
