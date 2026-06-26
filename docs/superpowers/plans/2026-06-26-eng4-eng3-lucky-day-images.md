# ENG-4 / ENG-3: Lucky Day Scraper Rewrite + Image Placeholder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `lucky-day-competitions.ts` from Playwright to `fetch`+`cheerio` (fixes navigation timeout and null image_url), and add a branded wordmark to the raffle card image placeholder.

**Architecture:** The scraper keeps the same `BaseScraper` interface (`scrape(context)`, `quickUpdate(context)`) but ignores the `BrowserContext` argument — all requests go through Node 18's native `fetch` with an `AbortController` timeout. Cheerio parses the static HTML. The UI change is a one-line addition inside the existing placeholder `<div>` in `raffle-card.tsx`.

**Tech Stack:** Node 18 native `fetch`, `cheerio` (new dependency, types bundled), `vitest` (new dev dependency for unit tests), Next.js/React for UI.

## Global Constraints

- Money is stored as **integer pence** (`parsePriceToPence` from `src/lib/utils.ts` handles conversion — use it, never inline).
- External IDs come from `extractSlugFromUrl(url)` from `src/lib/utils.ts` — use it, never extract slugs manually.
- **No mock/hardcoded data** — if a listing page fetch fails, return an empty `ScrapedRaffle[]` and push to `errors[]`. Never invent data.
- `BaseScraper` interface requires `scrape(context: BrowserContext): Promise<ScraperResult>` and `quickUpdate(context: BrowserContext): Promise<QuickUpdateResult>`. Keep these signatures; prefix unused param with `_context`.
- Cheerio v1.0+ ships its own TypeScript types — do NOT install `@types/cheerio`.
- Integration test command: `npx tsx src/scrapers/run-all.ts --site=lucky-day-competitions`
- Deploy: SSH to `root@46.101.53.17`, app at `/opt/carraffleodds`, PM2 process `scraper`. Always `npm install` (never `--omit=dev` — breaks Linux esbuild binary).

---

### Task 1: Install cheerio + vitest, rewrite Lucky Day scraper

**Files:**
- Modify: `package.json` (add `cheerio` dependency, `vitest` devDependency, `"test": "vitest run"` script)
- Modify: `src/scrapers/lucky-day-competitions.ts` (full rewrite, ~200 lines)
- Create: `src/scrapers/__tests__/lucky-day-parsing.test.ts`

**Interfaces:**
- Produces: `LuckyDayCompetitionsScraper` class (same external interface as before), plus two exported pure functions for testing: `parseCardText(lines: string[], url: string): ListingCard | null` and `parseRelativeDate(text?: string): Date | undefined`.

- [ ] **Step 1: Install dependencies**

```bash
cd /opt/carraffleodds  # if on droplet; locally: cd /path/to/repo
npm install cheerio
npm install -D vitest
```

Local (dev machine):
```bash
npm install cheerio
npm install -D vitest
```

Expected: `package.json` now shows `"cheerio"` in `dependencies` and `"vitest"` in `devDependencies`. No errors.

- [ ] **Step 2: Add test script to package.json**

In `package.json`, add `"test": "vitest run"` to the `"scripts"` block alongside the existing scrape scripts.

- [ ] **Step 3: Write failing unit tests**

Create `src/scrapers/__tests__/lucky-day-parsing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseCardText, parseRelativeDate } from '../lucky-day-competitions';

describe('parseCardText', () => {
  it('parses a fully-populated card', () => {
    // "Tickets remaining 98% 588/597": remaining=588, total=597, sold=9, percentSold=round(9/597*100)=2
    const lines = [
      'Win a BMW M3 Competition',
      '£2.97',
      'Tickets remaining 98% 588/597',
      'Ends Sun 15th Jun',
    ];
    const card = parseCardText(lines, 'https://www.luckydaycompetitions.com/product/win-bmw-m3/');
    expect(card).not.toBeNull();
    expect(card!.title).toBe('Win a BMW M3 Competition');
    expect(card!.ticketPrice).toBe(297);    // £2.97 → 297 pence
    expect(card!.totalTickets).toBe(597);
    expect(card!.ticketsRemaining).toBe(588);
    expect(card!.percentSold).toBe(2);      // sold=9, round(9/597*100)=2
    expect(card!.endDateText).toBe('Ends Sun 15th Jun');
  });

  it('skips lines that are Enter Now / Quick Buy / Read More', () => {
    const lines = ['Enter Now', '£1.97', '50/100', 'Ends Mon 2nd Feb'];
    const card = parseCardText(lines, 'https://www.luckydaycompetitions.com/product/test/');
    // No non-skip title line → null
    expect(card).toBeNull();
  });

  it('returns null when lines are empty', () => {
    expect(parseCardText([], 'https://www.luckydaycompetitions.com/product/test/')).toBeNull();
  });

  it('handles a card with just price and title (no tickets or end date)', () => {
    const lines = ['Win a Tesla Model 3', '£0.99'];
    const card = parseCardText(lines, 'https://www.luckydaycompetitions.com/product/win-tesla-model-3/');
    expect(card).not.toBeNull();
    expect(card!.title).toBe('Win a Tesla Model 3');
    expect(card!.ticketPrice).toBe(99);
    expect(card!.totalTickets).toBeUndefined();
    expect(card!.endDateText).toBeUndefined();
  });
});

describe('parseRelativeDate', () => {
  it('returns undefined for undefined input', () => {
    expect(parseRelativeDate(undefined)).toBeUndefined();
  });

  it('returns undefined for unrecognised format', () => {
    expect(parseRelativeDate('TBD')).toBeUndefined();
  });

  it('parses "Ends Sun 1st Jun" correctly', () => {
    const d = parseRelativeDate('Ends Sun 1st Jun');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getDate()).toBe(1);
    expect(d!.getMonth()).toBe(5);  // June = 5 (0-indexed)
    expect(d!.getHours()).toBe(21); // always set to 21:00
  });

  it('parses ordinal "22nd" correctly', () => {
    const d = parseRelativeDate('Ends Tue 22nd Mar');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getDate()).toBe(22);
    expect(d!.getMonth()).toBe(2);  // March = 2
  });

  it('advances year when the date has already passed this year', () => {
    // Manufacture a date guaranteed to be in the past: Jan 1st.
    const d = parseRelativeDate('Ends Wed 1st Jan');
    expect(d).toBeInstanceOf(Date);
    const now = new Date();
    expect(d!.getFullYear()).toBeGreaterThanOrEqual(now.getFullYear());
  });
});
```

- [ ] **Step 4: Run tests — verify they fail**

```bash
npx vitest run src/scrapers/__tests__/lucky-day-parsing.test.ts
```

Expected: FAIL — `parseCardText` and `parseRelativeDate` are not yet exported from `lucky-day-competitions.ts`.

- [ ] **Step 5: Write the new scraper**

Replace the entire contents of `src/scrapers/lucky-day-competitions.ts` with:

```typescript
/**
 * Lucky Day Competitions Scraper
 * Site: https://www.luckydaycompetitions.com
 *
 * WooCommerce SSR site. Static HTML is served immediately — no Playwright needed.
 * Uses Node 18 native fetch + cheerio.
 *
 * Ticket data format on listing cards: "Tickets remaining 98% 588/597"
 *   → ticketsRemaining = 588, totalTickets = 597, percentSold = 100 - 98 = 2
 */

import * as cheerio from 'cheerio';
import { BrowserContext } from 'playwright';
import {
  BaseScraper,
  ScrapedRaffle,
  ScraperResult,
  QuickUpdateResult,
} from './base';
import { parsePriceToPence, extractSlugFromUrl } from '../lib/utils';

// ============================================
// Types
// ============================================

export interface ListingCard {
  title: string;
  url: string;
  imageUrl?: string;
  ticketPrice?: number;      // pence
  totalTickets?: number;
  ticketsRemaining?: number;
  percentSold?: number;      // 0–100
  endDateText?: string;
}

// ============================================
// Skip patterns
// ============================================

const SKIP_TITLE_PATTERNS = [/gift voucher/i];

const SKIP_LINE_PATTERNS = [
  /^£[\d.]+$/,
  /tickets remaining/i,
  /^\d+%/,
  /^\d+\/\d+/,
  /^quick buy$/i,
  /^enter now$/i,
  /^read more$/i,
  /^ends\s/i,
  /^every ticket wins$/i,
  /^win for free!$/i,
  /^less than \d+% left$/i,
  /^just launched$/i,
  /^😮/,
  /^😲/,
  /^⏱️/,
];

// ============================================
// Pure parsing helpers (exported for unit tests)
// ============================================

/**
 * Parse text lines from a WooCommerce listing card into structured data.
 * Returns null if the card is unusable (no title, etc.).
 */
export function parseCardText(lines: string[], url: string): ListingCard | null {
  if (lines.length === 0) return null;

  // Price: first line matching "£N.NN"
  let ticketPrice: number | undefined;
  const priceLine = lines.find(l => /^£[\d.]+$/.test(l));
  if (priceLine) ticketPrice = parsePriceToPence(priceLine) ?? undefined;

  // Tickets: "Tickets remaining 98% 588/597" or "588/597"
  let totalTickets: number | undefined;
  let ticketsRemaining: number | undefined;
  let percentSold: number | undefined;

  const ticketLine = lines.find(l => /\d+\/\d+/.test(l));
  if (ticketLine) {
    const m = ticketLine.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) {
      ticketsRemaining = parseInt(m[1], 10);
      totalTickets = parseInt(m[2], 10);
      const sold = totalTickets - ticketsRemaining;
      percentSold = totalTickets > 0 ? Math.round((sold / totalTickets) * 100) : 0;
    }
  }

  if (percentSold === undefined) {
    const remLine = lines.find(l => /tickets remaining\s+\d+%/i.test(l));
    if (remLine) {
      const m = remLine.match(/(\d+)%/);
      if (m) percentSold = 100 - parseInt(m[1], 10);
    }
  }

  // End date: "Ends Tue 10th Feb"
  let endDateText: string | undefined;
  const endLine = lines.find(l => /^ends\s/i.test(l));
  if (endLine) endDateText = endLine;

  // Title: first non-skip line with enough substance
  const titleCandidates = lines.filter(l =>
    !SKIP_LINE_PATTERNS.some(p => p.test(l)) && l.length > 3
  );
  const title = titleCandidates[0] || '';
  if (!title) return null;

  return { title, url, ticketPrice, totalTickets, ticketsRemaining, percentSold, endDateText };
}

/**
 * Parse relative end-date text.
 * "Ends Tue 10th Feb" → Date at 21:00 that day (advances year if date is past).
 */
export function parseRelativeDate(text?: string): Date | undefined {
  if (!text) return undefined;

  const m = text.match(
    /(?:mon|tue|wed|thu|fri|sat|sun)\w*\s+(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i
  );
  if (!m) return undefined;

  const day = parseInt(m[1], 10);
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const month = monthMap[m[2].toLowerCase()];
  if (month === undefined) return undefined;

  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month, day, 21, 0, 0, 0);
  if (candidate < now) year++;

  return new Date(year, month, day, 21, 0, 0, 0);
}

// ============================================
// HTTP helper
// ============================================

const FETCH_TIMEOUT_MS = 30_000;
const DELAY_MS = 800;
const MAX_PAGES = 10;

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CarRaffleOdds-Bot/1.0; +https://carraffleodds.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================
// Scraper
// ============================================

export class LuckyDayCompetitionsScraper extends BaseScraper {
  name = 'Lucky Day Competitions';
  siteSlug = 'lucky-day-competitions';
  baseUrl = 'https://www.luckydaycompetitions.com';

  private listingUrl = 'https://www.luckydaycompetitions.com/all-competitions/';

  private static readonly HIGH_VALUE_KEYWORDS = [
    'bmw', 'audi', 'mercedes', 'ferrari', 'lamborghini', 'porsche', 'mclaren',
    'volkswagen', 'vw ', 'ford', 'honda', 'toyota', 'nissan',
    'range rover', 'land rover', 'bentley', 'rolls royce', 'tesla',
    'volvo', 'vauxhall', 'mini cooper', 'jaguar', 'aston martin',
    'defender', 'motorhome', 'campervan', 'camper',
    'peugeot', 'seat ', 'skoda', 'fiat ', 'alfa romeo', 'maserati',
    'suzuki', 'transit', 'transporter',
    'ducati', 'kawasaki', 'yamaha', 'motorcycle', 'motorbike',
    'triumph', 'fireblade', 'hayabusa', 'sur ron', 'surron',
    'rolex', 'tag heuer', 'omega', 'breitling', 'watch',
    'house', 'home', 'property',
    'car', 'van', 'bike',
  ];

  private needsDetailPage(title: string): boolean {
    const lower = title.toLowerCase();
    return LuckyDayCompetitionsScraper.HIGH_VALUE_KEYWORDS.some(kw => lower.includes(kw));
  }

  // ==========================================
  // Public interface (context param kept for BaseScraper compatibility)
  // ==========================================

  async scrape(_context: BrowserContext): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    try {
      const cards = await this.scrapeListingPages(errors);
      console.log(`[${this.name}] Found ${cards.length} cards`);

      const detailCards = cards.filter(c => this.needsDetailPage(c.title));
      const listingOnlyCards = cards.filter(c => !this.needsDetailPage(c.title));

      console.log(`[${this.name}] ${detailCards.length} high-value (detail), ${listingOnlyCards.length} listing-only`);

      for (const card of listingOnlyCards) {
        const r = this.buildRaffleFromCard(card);
        if (r) raffles.push(r);
      }

      for (let i = 0; i < detailCards.length; i++) {
        const card = detailCards[i];
        const slug = extractSlugFromUrl(card.url);
        console.log(`[${this.name}] [${i + 1}/${detailCards.length}] Detail: ${slug}`);

        const r = await this.scrapeDetailPage(card).catch(err => {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${slug}: ${msg}`);
          return this.buildRaffleFromCard(card);
        });
        if (r) raffles.push(r);

        await sleep(DELAY_MS);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Fatal: ${msg}`);
      console.error(`[${this.name}] Fatal: ${msg}`);
    }

    return { siteName: this.name, siteSlug: this.siteSlug, raffles, errors, duration: Date.now() - start };
  }

  async quickUpdate(_context: BrowserContext): Promise<QuickUpdateResult> {
    const start = Date.now();
    const errors: string[] = [];
    const updates: QuickUpdateResult['updates'] = [];

    try {
      const cards = await this.scrapeListingPages(errors);
      for (const card of cards) {
        const externalId = extractSlugFromUrl(card.url);
        if (!externalId) continue;
        updates.push({ externalId, percentSold: card.percentSold, ticketPrice: card.ticketPrice });
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    return { siteName: this.name, siteSlug: this.siteSlug, updates, errors, duration: Date.now() - start };
  }

  // ==========================================
  // Listing pages (paginated)
  // ==========================================

  private async scrapeListingPages(errors: string[]): Promise<ListingCard[]> {
    const all: ListingCard[] = [];
    let url: string | null = this.listingUrl;
    let pageNum = 0;

    while (url && pageNum < MAX_PAGES) {
      pageNum++;
      let html: string;
      try {
        html = await fetchHtml(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Listing page ${pageNum} fetch failed: ${msg}`);
        break;
      }

      const $ = cheerio.load(html);
      const seen = new Set<string>();

      $('li a[href*="/product/"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const rawText = $a.text().trim();
        if (!rawText) return;

        // Reject stand-alone button links
        if (['Enter Now', 'Quick Buy', 'Read More'].includes(rawText)) return;

        const imageUrl =
          $a.find('img').first().attr('src') ||
          $a.find('img').first().attr('data-src') ||
          '';

        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        const card = parseCardText(lines, href);
        if (!card) return;
        if (SKIP_TITLE_PATTERNS.some(p => p.test(card.title))) return;
        if (card.ticketPrice === undefined || card.ticketPrice <= 0) return;

        all.push({ ...card, imageUrl: imageUrl || undefined });
      });

      // Follow WooCommerce pagination
      const nextHref = $('a.next.page-numbers').attr('href') || null;
      url = nextHref;
      if (url) await sleep(DELAY_MS);
    }

    return all;
  }

  // ==========================================
  // Detail page (high-value raffles only)
  // ==========================================

  private async scrapeDetailPage(card: ListingCard): Promise<ScrapedRaffle | null> {
    const html = await fetchHtml(card.url);
    const $ = cheerio.load(html);
    const body = $.text();

    const cashMatch = body.match(/cash\s*alternative[:\s]*£([\d,]+)/i);
    const cashAlternative = cashMatch
      ? (parsePriceToPence('£' + cashMatch[1]) ?? undefined)
      : undefined;

    const prizeMatch = body.match(/(?:prize|rrp|value)[:\s]*£([\d,]+)/i);
    const prizeValue = prizeMatch
      ? (parsePriceToPence('£' + prizeMatch[1]) ?? undefined)
      : undefined;

    const galleryImg = $('.woocommerce-product-gallery img, .product-image img, img.wp-post-image').first();
    const imageUrl = galleryImg.attr('src') || galleryImg.attr('data-src') || card.imageUrl;

    const ticketMatch = body.match(/(?:max|total)\s*(?:entries|tickets)[:\s]*([\d,]+)/i);
    const totalTickets = card.totalTickets
      || (ticketMatch ? parseInt(ticketMatch[1].replace(/,/g, ''), 10) : undefined);

    const externalId = extractSlugFromUrl(card.url);
    if (!externalId) return null;

    const ticketsSold = totalTickets !== undefined && card.ticketsRemaining !== undefined
      ? totalTickets - card.ticketsRemaining
      : undefined;

    return {
      externalId,
      title: this.sanitizeTitle(card.title, card.url),
      sourceUrl: card.url,
      imageUrl,
      ticketPrice: card.ticketPrice,
      totalTickets,
      ticketsSold,
      percentSold: card.percentSold,
      cashAlternative,
      prizeValue,
      endDate: parseRelativeDate(card.endDateText),
      drawType: 'live_draw',
    };
  }

  // ==========================================
  // Fallback builder (listing data only)
  // ==========================================

  private buildRaffleFromCard(card: ListingCard): ScrapedRaffle | null {
    const externalId = extractSlugFromUrl(card.url);
    if (!externalId) return null;

    const ticketsSold = card.totalTickets !== undefined && card.ticketsRemaining !== undefined
      ? card.totalTickets - card.ticketsRemaining
      : undefined;

    return {
      externalId,
      title: this.sanitizeTitle(card.title, card.url),
      sourceUrl: card.url,
      imageUrl: card.imageUrl,
      ticketPrice: card.ticketPrice,
      totalTickets: card.totalTickets,
      ticketsSold,
      percentSold: card.percentSold,
      endDate: parseRelativeDate(card.endDateText),
      drawType: 'live_draw',
    };
  }
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
npx vitest run src/scrapers/__tests__/lucky-day-parsing.test.ts
```

Expected output (all green):
```
✓ src/scrapers/__tests__/lucky-day-parsing.test.ts (7)
  ✓ parseCardText > parses a fully-populated card
  ✓ parseCardText > skips lines that are Enter Now / Quick Buy / Read More
  ✓ parseCardText > returns null when lines are empty
  ✓ parseCardText > handles a card with just price and title
  ✓ parseRelativeDate > returns undefined for undefined input
  ✓ parseRelativeDate > returns undefined for unrecognised format
  ✓ parseRelativeDate > parses "Ends Sun 1st Jun" correctly
  ✓ parseRelativeDate > parses ordinal "22nd" correctly
  ✓ parseRelativeDate > advances year when the date has already passed

Test Files  1 passed (1)
```

If TypeScript errors: the most common issue is that cheerio's types conflict. Fix: ensure `"moduleResolution": "bundler"` or `"node16"` in `tsconfig.json`, or add `"skipLibCheck": true`.

- [ ] **Step 7: Integration test — run against live site**

```bash
npx tsx src/scrapers/run-all.ts --site=lucky-day-competitions
```

Expected: scraper logs `Found N cards` with N > 0, logs some `Detail:` lines for high-value raffles, and exits with `duration: Xms`. Crucially, **no Playwright timeout errors**.

Also check that imageUrl is populated (should now be non-null) by inspecting the console log output. If the scraper logs `Found 0 cards`, check that the HTML still contains `li a[href*="/product/"]` by running:

```bash
curl -s https://www.luckydaycompetitions.com/all-competitions/ | grep -c '/product/' 
```

Expected: ≥ 50.

- [ ] **Step 8: Run lint**

```bash
npm run lint
```

Fix any TypeScript errors before committing. Common issue: `BrowserContext` import from `playwright` — keep it for the interface signature.

- [ ] **Step 9: Commit**

```bash
git add src/scrapers/lucky-day-competitions.ts src/scrapers/__tests__/lucky-day-parsing.test.ts package.json package-lock.json
git commit -m "feat(eng-4): rewrite Lucky Day scraper — fetch+cheerio, fixes timeout and null images"
```

---

### Task 2: Add CarRaffleOdds wordmark to the image placeholder

**Files:**
- Modify: `src/components/raffle-card.tsx:62-65`

**Interfaces:**
- Consumes: Nothing from Task 1.
- Produces: Updated `RaffleCard` component with branded placeholder.

- [ ] **Step 1: Update the placeholder div**

In `src/components/raffle-card.tsx`, find the placeholder block (currently lines 62–64):

```tsx
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Ticket className="h-12 w-12 text-slate-300" />
          </div>
        )}
```

Replace with:

```tsx
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Ticket className="h-10 w-10 text-slate-300" />
            <span className="text-[10px] font-semibold tracking-widest text-slate-300 uppercase select-none">
              CarRaffleOdds
            </span>
          </div>
        )}
```

- [ ] **Step 2: Visually verify**

Start the dev server and open a raffle card whose `image_url` is null (Lucky Day raffles all have null images in the DB currently):

```bash
npm run dev
```

Open `http://localhost:3000` — Lucky Day raffle cards should show the Ticket icon with "CARRAFFLEODDS" wordmark below it in muted slate text. Verify the card layout is not disrupted (aspect ratio, no overflow).

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/raffle-card.tsx
git commit -m "feat(eng-3): add CarRaffleOdds wordmark to raffle card image placeholder"
```

---

### Task 3: Deploy to droplet and verify

**Files:** None — this task is operational.

**Note:** Follow the `deploy-droplet` skill. Key steps summarised here:

- [ ] **Step 1: Push the branch**

```bash
git push origin HEAD
```

- [ ] **Step 2: SSH to the droplet and deploy**

```bash
ssh root@46.101.53.17
cd /opt/carraffleodds
git pull
npm install          # NEVER --omit=dev
pm2 restart scraper
```

- [ ] **Step 3: Watch logs for the next Lucky Day scrape**

```bash
pm2 logs scraper --lines 200
```

Look for:
```
[Lucky Day Competitions] Found N cards
[Lucky Day Competitions] M high-value (detail), K listing-only
```

With no `TimeoutError` or `Navigation timeout` messages. N should be > 0.

- [ ] **Step 4: Verify image_url population in DB**

After one full scrape cycle completes, check Supabase (or via the local client):

```bash
# On the droplet or locally with .env.local credentials:
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.from('raffles').select('image_url').eq('site_id', (await sb.from('sites').select('id').eq('slug','lucky-day-competitions').single()).data.id).not('image_url','is',null).limit(5);
console.log('Sample images:', data);
"
```

Expected: 5 rows with non-null `image_url` values pointing to `luckydaycompetitions.com` image URLs.

- [ ] **Step 5: Commit not needed — deployment is operational, not code**

Exit the SSH session. Note the deployment time for the Linear ticket update.
