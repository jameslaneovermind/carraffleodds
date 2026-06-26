# Data Reconciliation Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-off diagnostic script that fetches live raffle listings from all 8 sites via Playwright, extracts structured data using Claude Haiku, diffs against Supabase DB, and outputs a terminal report + JSON file.

**Architecture:** Single file `scripts/audit-sites.ts`. Serial execution per site: fetch HTML → Claude extracts raffles → compare against DB → collect discrepancies. Output to terminal as each site completes, full JSON saved at the end.

**Tech Stack:** TypeScript/tsx, Playwright (already installed), `@anthropic-ai/sdk` (needs installing), Supabase service client, dotenv.

## Global Constraints

- Model: `claude-haiku-4-5-20251001` for extraction (cheap, fast)
- HTML truncated to 100,000 chars before sending to Claude
- Match live raffles to DB records by URL slug via existing `extractSlugFromUrl()` from `src/lib/utils.ts`
- `ANTHROPIC_API_KEY` read from `.env.local` — never hardcoded
- Output JSON saved to `scripts/audit-output/YYYY-MM-DD.json` (gitignored)
- Price mismatch threshold: >10% difference
- End date mismatch threshold: >24 hours

---

## File Map

| File | Change |
|------|--------|
| `scripts/audit-sites.ts` | Create — the entire audit script |
| `scripts/audit-output/.gitkeep` | Create — ensures directory exists in repo |
| `.gitignore` | Modify — ignore `scripts/audit-output/*.json` |

---

## Task 1: Install SDK, scaffold types, and site registry

Install `@anthropic-ai/sdk`, create the output directory, write all TypeScript interfaces and the site registry constant. Script must compile cleanly at the end of this task.

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.gitignore`
- Create: `scripts/audit-output/.gitkeep`
- Create: `scripts/audit-sites.ts`

**Interfaces:**
- Produces: `LiveRaffle`, `DbRaffle`, `SiteAuditResult`, `AuditOutput` types; `SITES` constant — consumed by all later tasks

- [ ] **Step 1: Install the Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

Expected: installs without error, `@anthropic-ai/sdk` appears in `package.json` dependencies.

- [ ] **Step 2: Add audit output to .gitignore**

Add this line to `.gitignore`:
```
scripts/audit-output/*.json
```

- [ ] **Step 3: Create the output directory placeholder**

```bash
mkdir -p scripts/audit-output && touch scripts/audit-output/.gitkeep
```

- [ ] **Step 4: Write the scaffold — imports, types, and SITES constant**

Create `scripts/audit-sites.ts` with this content:

```typescript
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import Anthropic from '@anthropic-ai/sdk';
import { chromium } from 'playwright';
import { createServiceClient } from '../src/lib/supabase';
import { extractSlugFromUrl } from '../src/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface LiveRaffle {
  title: string;
  sourceUrl: string | null;
  ticketPricePence: number | null;
  endDate: string | null;
  imageUrl: string | null;
  totalTickets: number | null;
}

interface DbRaffle {
  id: string;
  external_id: string;
  title: string;
  source_url: string;
  ticket_price: number | null;
  end_date: string | null;
  image_url: string | null;
  total_tickets: number | null;
  status: string;
}

interface SiteAuditResult {
  slug: string;
  name: string;
  listingUrl: string;
  liveCount: number;
  dbCount: number;
  matchedCount: number;
  staleInDb: { title: string; externalId: string }[];
  missingFromDb: { title: string; sourceUrl: string }[];
  missingImages: { title: string; externalId: string }[];
  priceMismatches: { title: string; livePrice: number; dbPrice: number }[];
  endDateMismatches: { title: string; liveDate: string; dbDate: string }[];
  error: string | null;
}

interface AuditOutput {
  auditedAt: string;
  sites: SiteAuditResult[];
  summary: {
    sitesAudited: number;
    totalLive: number;
    totalDb: number;
    staleInDb: number;
    missingFromDb: number;
    missingImages: number;
    priceMismatches: number;
    endDateMismatches: number;
  };
}

// ── Site registry ─────────────────────────────────────────────────────────────
// Listing URLs verified against each scraper's baseUrl/listingUrl fields.

const SITES: { slug: string; name: string; listingUrl: string }[] = [
  { slug: 'dream-car-giveaways',     name: 'Dream Car Giveaways',     listingUrl: 'https://dreamcargiveaways.co.uk/competitions' },
  { slug: '7-days-performance',      name: '7 Days Performance',      listingUrl: 'https://7daysperformance.co.uk' },
  { slug: 'rev-comps',               name: 'Rev Comps',               listingUrl: 'https://www.revcomps.com' },
  { slug: 'elite-competitions',      name: 'Elite Competitions',      listingUrl: 'https://elitecompetitions.co.uk' },
  { slug: 'click-competitions',      name: 'Click Competitions',      listingUrl: 'https://www.clickcompetitions.co.uk/competitions/' },
  { slug: 'lucky-day-competitions',  name: 'Lucky Day Competitions',  listingUrl: 'https://www.luckydaycompetitions.com/all-competitions/' },
  { slug: 'llf-games',               name: 'LLF Games',               listingUrl: 'https://llfgames.com/shop/' },
  { slug: 'botb',                    name: 'BOTB',                    listingUrl: 'https://www.botb.com' },
];
```

- [ ] **Step 5: Verify it compiles**

```bash
npx tsc --noEmit scripts/audit-sites.ts --module commonjs --target es2020 --moduleResolution node --esModuleInterop 2>&1 | head -20
```

Expected: no errors (or only module-resolution warnings that don't affect runtime). If there are import errors, check that `src/lib/supabase.ts` and `src/lib/utils.ts` paths are correct relative to `scripts/`.

- [ ] **Step 6: Commit**

```bash
git add scripts/audit-sites.ts scripts/audit-output/.gitkeep .gitignore package.json package-lock.json
git commit -m "feat: scaffold data reconciliation audit script"
```

---

## Task 2: Implement Claude extraction, DB query, and diff logic

Add three functions to `scripts/audit-sites.ts`:
- `extractLiveRaffles()` — sends HTML to Claude Haiku, parses response
- `fetchDbRaffles()` — queries Supabase for a site's active raffles
- `diffRaffles()` — matches live vs DB by slug, produces discrepancy lists

**Files:**
- Modify: `scripts/audit-sites.ts`

**Interfaces:**
- Consumes: `LiveRaffle`, `DbRaffle`, `SiteAuditResult`, `SITES` from Task 1; `extractSlugFromUrl` from `src/lib/utils.ts`
- Produces: `extractLiveRaffles(html: string, siteName: string): Promise<LiveRaffle[]>`, `fetchDbRaffles(siteSlug: string, supabase): Promise<DbRaffle[]>`, `diffRaffles(live, db, slug, name, listingUrl): SiteAuditResult`

- [ ] **Step 1: Add `extractLiveRaffles` after the SITES constant**

```typescript
// ── Claude extraction ─────────────────────────────────────────────────────────

async function extractLiveRaffles(html: string, siteName: string): Promise<LiveRaffle[]> {
  const client = new Anthropic();
  const truncated = html.slice(0, 100_000);

  const systemPrompt = `You are extracting raffle listings from HTML for the site "${siteName}".
Return a JSON array of raffles found on the page.
Each raffle object must have exactly these keys:
{ "title": string, "sourceUrl": string | null, "ticketPricePence": number | null, "endDate": string | null, "imageUrl": string | null, "totalTickets": number | null }
Rules:
- ticketPricePence: convert £X.XX to integer pence (£2.99 → 299). Null if not visible.
- endDate: ISO 8601 string if a draw/end date is shown, null otherwise.
- sourceUrl: direct URL to this raffle's own page. Null if not found.
- imageUrl: URL of the raffle card image. Null if not found.
- totalTickets: integer if shown, null otherwise.
- Skip free-entry / skill-question entries (no paid ticket price).
- Return ONLY the raw JSON array. No markdown fences, no explanation, no other text.`;

  const tryParse = async (prompt: string): Promise<LiveRaffle[] | null> => {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? (parsed as LiveRaffle[]) : null;
    } catch {
      return null;
    }
  };

  const result = await tryParse(truncated);
  if (result) return result;

  // Retry once with an explicit reminder
  const retry = await tryParse(`${truncated}\n\n---\nReturn ONLY a valid JSON array, nothing else.`);
  return retry ?? [];
}
```

- [ ] **Step 2: Add `fetchDbRaffles` after `extractLiveRaffles`**

```typescript
// ── DB query ──────────────────────────────────────────────────────────────────

async function fetchDbRaffles(
  siteSlug: string,
  supabase: ReturnType<typeof createServiceClient>
): Promise<DbRaffle[]> {
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', siteSlug)
    .single();

  if (!site) return [];

  const { data } = await supabase
    .from('raffles')
    .select('id, external_id, title, source_url, ticket_price, end_date, image_url, total_tickets, status')
    .eq('site_id', site.id)
    .in('status', ['active', 'ending_soon']);

  return (data ?? []) as DbRaffle[];
}
```

- [ ] **Step 3: Add `diffRaffles` after `fetchDbRaffles`**

```typescript
// ── Diff logic ────────────────────────────────────────────────────────────────

function diffRaffles(
  live: LiveRaffle[],
  db: DbRaffle[],
  slug: string,
  name: string,
  listingUrl: string
): SiteAuditResult {
  // Build lookup maps by URL slug
  const dbBySlug = new Map(db.map(r => [r.external_id, r]));
  const liveBySlug = new Map<string, LiveRaffle>();
  for (const r of live) {
    if (r.sourceUrl) {
      liveBySlug.set(extractSlugFromUrl(r.sourceUrl), r);
    }
  }

  const staleInDb: SiteAuditResult['staleInDb'] = [];
  const missingImages: SiteAuditResult['missingImages'] = [];
  const priceMismatches: SiteAuditResult['priceMismatches'] = [];
  const endDateMismatches: SiteAuditResult['endDateMismatches'] = [];
  let matchedCount = 0;

  for (const [externalId, dbRaffle] of dbBySlug) {
    if (!liveBySlug.has(externalId)) {
      staleInDb.push({ title: dbRaffle.title, externalId });
      continue;
    }

    matchedCount++;
    const liveRaffle = liveBySlug.get(externalId)!;

    // Missing image in DB
    if (!dbRaffle.image_url) {
      missingImages.push({ title: dbRaffle.title, externalId });
    }

    // Ticket price mismatch >10%
    if (liveRaffle.ticketPricePence != null && dbRaffle.ticket_price != null && dbRaffle.ticket_price > 0) {
      const diff = Math.abs(liveRaffle.ticketPricePence - dbRaffle.ticket_price) / dbRaffle.ticket_price;
      if (diff > 0.1) {
        priceMismatches.push({
          title: dbRaffle.title,
          livePrice: liveRaffle.ticketPricePence,
          dbPrice: dbRaffle.ticket_price,
        });
      }
    }

    // End date mismatch >24h
    if (liveRaffle.endDate && dbRaffle.end_date) {
      const diffMs = Math.abs(new Date(liveRaffle.endDate).getTime() - new Date(dbRaffle.end_date).getTime());
      if (diffMs > 24 * 60 * 60 * 1000) {
        endDateMismatches.push({
          title: dbRaffle.title,
          liveDate: liveRaffle.endDate,
          dbDate: dbRaffle.end_date,
        });
      }
    }
  }

  // Live raffles not in DB (Claude found sourceUrl but slug not in dbBySlug)
  const missingFromDb = live
    .filter(r => r.sourceUrl && !dbBySlug.has(extractSlugFromUrl(r.sourceUrl)))
    .map(r => ({ title: r.title, sourceUrl: r.sourceUrl! }));

  return {
    slug, name, listingUrl,
    liveCount: live.length,
    dbCount: db.length,
    matchedCount,
    staleInDb,
    missingFromDb,
    missingImages,
    priceMismatches,
    endDateMismatches,
    error: null,
  };
}
```

- [ ] **Step 4: Smoke test against one site**

Temporarily add this at the bottom of the file to test the two functions end-to-end:

```typescript
// TEMP SMOKE TEST — remove after verifying
(async () => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  const supabase = createServiceClient();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  const page = await context.newPage();
  await page.goto('https://dreamcargiveaways.co.uk/competitions', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  const html = await page.content();
  await browser.close();
  const live = await extractLiveRaffles(html, 'Dream Car Giveaways');
  const db = await fetchDbRaffles('dream-car-giveaways', supabase);
  const result = diffRaffles(live, db, 'dream-car-giveaways', 'Dream Car Giveaways', 'https://dreamcargiveaways.co.uk/competitions');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
})();
```

Run:
```bash
npx tsx scripts/audit-sites.ts
```

Expected: JSON output with `liveCount > 0`, `dbCount > 0`, and meaningful discrepancy arrays. If `liveCount` is 0, Claude failed to parse — check the raw HTML with `console.log(html.slice(0, 2000))` to see if the page loaded correctly.

- [ ] **Step 5: Remove the smoke test block** (the `// TEMP SMOKE TEST` IIFE at the bottom of the file)

- [ ] **Step 6: Commit**

```bash
git add scripts/audit-sites.ts
git commit -m "feat: add Claude extraction, DB query, and diff logic to audit script"
```

---

## Task 3: Add output functions and main orchestration loop

Add the terminal output functions and the `main()` function that ties everything together. Full run across all 8 sites, terminal report per site, JSON saved at the end.

**Files:**
- Modify: `scripts/audit-sites.ts`

**Interfaces:**
- Consumes: `SiteAuditResult`, `AuditOutput`, `SITES`, `extractLiveRaffles`, `fetchDbRaffles`, `diffRaffles` from Tasks 1 & 2
- Produces: runnable script via `npx tsx scripts/audit-sites.ts`

- [ ] **Step 1: Add `printSiteResult` after the diff logic**

```typescript
// ── Terminal output ───────────────────────────────────────────────────────────

function printSiteResult(result: SiteAuditResult): void {
  const bar = '━'.repeat(52);
  console.log(`\n${bar}`);
  console.log(`  ${result.name}`);
  console.log(bar);

  if (result.error) {
    console.log(`  ✗ ERROR: ${result.error}`);
    return;
  }

  console.log(`  Live: ${result.liveCount}  |  DB active: ${result.dbCount}  |  Matched: ${result.matchedCount}`);

  if (result.staleInDb.length > 0) {
    console.log(`\n  ⚠  Stale in DB (not on live site): ${result.staleInDb.length}`);
    result.staleInDb.slice(0, 3).forEach(r => console.log(`       → "${r.title}" [${r.externalId}]`));
    if (result.staleInDb.length > 3) console.log(`       (+ ${result.staleInDb.length - 3} more)`);
  }

  if (result.missingFromDb.length > 0) {
    console.log(`\n  ⚠  Missing from DB (live but not scraped): ${result.missingFromDb.length}`);
    result.missingFromDb.slice(0, 3).forEach(r => console.log(`       → "${r.title}"`));
    if (result.missingFromDb.length > 3) console.log(`       (+ ${result.missingFromDb.length - 3} more)`);
  }

  if (result.missingImages.length > 0) {
    console.log(`\n  ✗  Missing images: ${result.missingImages.length}/${result.matchedCount} matched`);
  }

  if (result.priceMismatches.length > 0) {
    console.log(`\n  ✗  Price mismatches (>10%): ${result.priceMismatches.length}`);
    result.priceMismatches.forEach(r =>
      console.log(`       → "${r.title}"  live: £${(r.livePrice / 100).toFixed(2)}  db: £${(r.dbPrice / 100).toFixed(2)}`)
    );
  }

  if (result.endDateMismatches.length > 0) {
    console.log(`\n  ✗  End date mismatches (>24h): ${result.endDateMismatches.length}`);
    result.endDateMismatches.slice(0, 3).forEach(r => console.log(`       → "${r.title}"`));
    if (result.endDateMismatches.length > 3) console.log(`       (+ ${result.endDateMismatches.length - 3} more)`);
  }

  const clean = !result.staleInDb.length && !result.missingFromDb.length &&
    !result.missingImages.length && !result.priceMismatches.length && !result.endDateMismatches.length;
  if (clean) console.log(`  ✓  No issues found`);
}
```

- [ ] **Step 2: Add `printSummary` after `printSiteResult`**

```typescript
function printSummary(results: SiteAuditResult[], outputPath: string): void {
  const bar = '━'.repeat(52);
  const ok = results.filter(r => !r.error);
  const matchedTotal = ok.reduce((s, r) => s + r.matchedCount, 0);
  const missingImages = ok.reduce((s, r) => s + r.missingImages.length, 0);
  const imgPct = matchedTotal > 0 ? Math.round((missingImages / matchedTotal) * 100) : 0;

  console.log(`\n${bar}`);
  console.log(`  AUDIT SUMMARY`);
  console.log(bar);
  console.log(`  Sites: ${results.length}/8  |  Live: ${ok.reduce((s, r) => s + r.liveCount, 0)}  |  DB active: ${ok.reduce((s, r) => s + r.dbCount, 0)}`);
  console.log(`  Stale in DB: ${ok.reduce((s, r) => s + r.staleInDb.length, 0)}  |  Missing from DB: ${ok.reduce((s, r) => s + r.missingFromDb.length, 0)}`);
  console.log(`  Missing images: ${missingImages}/${matchedTotal} (${imgPct}%)`);
  console.log(`  Price mismatches: ${ok.reduce((s, r) => s + r.priceMismatches.length, 0)}  |  End date mismatches: ${ok.reduce((s, r) => s + r.endDateMismatches.length, 0)}`);
  console.log(`\n  Saved → ${outputPath}`);
  console.log(bar);
}
```

- [ ] **Step 3: Add `main` after `printSummary`**

```typescript
// ── Orchestration ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════');
  console.log('  CarRaffleOdds — Data Reconciliation Audit');
  console.log(`  ${new Date().toISOString()}`);
  console.log('════════════════════════════════════════════════════');

  const supabase = createServiceClient();
  const results: SiteAuditResult[] = [];

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    for (const site of SITES) {
      console.log(`\n[Audit] → ${site.name} (${site.listingUrl})`);
      let siteResult: SiteAuditResult;

      try {
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          locale: 'en-GB',
          timezoneId: 'Europe/London',
        });
        const page = await context.newPage();
        await page.goto(site.listingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        const html = await page.content();
        await context.close();

        console.log(`[Audit]   Fetched ${Math.round(html.length / 1000)}k chars — sending to Claude...`);
        const live = await extractLiveRaffles(html, site.name);
        console.log(`[Audit]   Claude: ${live.length} live raffles`);

        const db = await fetchDbRaffles(site.slug, supabase);
        console.log(`[Audit]   DB: ${db.length} active raffles`);

        siteResult = diffRaffles(live, db, site.slug, site.name, site.listingUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Audit]   FAILED: ${msg}`);
        siteResult = {
          slug: site.slug, name: site.name, listingUrl: site.listingUrl,
          liveCount: 0, dbCount: 0, matchedCount: 0,
          staleInDb: [], missingFromDb: [], missingImages: [],
          priceMismatches: [], endDateMismatches: [],
          error: msg,
        };
      }

      printSiteResult(siteResult);
      results.push(siteResult);
    }
  } finally {
    await browser.close();
  }

  // Save JSON
  const outputDir = path.resolve(process.cwd(), 'scripts/audit-output');
  fs.mkdirSync(outputDir, { recursive: true });
  const dateStr = new Date().toISOString().slice(0, 10);
  const outputPath = path.join(outputDir, `${dateStr}.json`);

  const output: AuditOutput = {
    auditedAt: new Date().toISOString(),
    sites: results,
    summary: {
      sitesAudited: results.filter(r => !r.error).length,
      totalLive: results.reduce((s, r) => s + r.liveCount, 0),
      totalDb: results.reduce((s, r) => s + r.dbCount, 0),
      staleInDb: results.reduce((s, r) => s + r.staleInDb.length, 0),
      missingFromDb: results.reduce((s, r) => s + r.missingFromDb.length, 0),
      missingImages: results.reduce((s, r) => s + r.missingImages.length, 0),
      priceMismatches: results.reduce((s, r) => s + r.priceMismatches.length, 0),
      endDateMismatches: results.reduce((s, r) => s + r.endDateMismatches.length, 0),
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  printSummary(results, outputPath);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
```

- [ ] **Step 4: Run the full audit**

```bash
npx tsx scripts/audit-sites.ts
```

Expected: runs for 5–15 minutes, prints per-site summaries as they complete, finishes with the overall summary and saves a JSON file to `scripts/audit-output/YYYY-MM-DD.json`.

Watch for:
- Any site with `liveCount: 0` — Playwright may be blocked or the page structure changed. Check the site manually.
- `missingFromDb` counts that are very high (>50% of live count) — indicates a broken scraper.
- `missingImages` count — feeds directly into ENG-3 priority.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit-sites.ts
git commit -m "feat: complete data reconciliation audit script"
```

- [ ] **Step 6: Commit docs**

```bash
git add docs/superpowers/
git commit -m "docs: add data reconciliation audit spec and plan"
```

---

## Verification Checklist (after full run)

- [ ] All 8 sites attempted (no fatal crash)
- [ ] At least 6/8 sites return `liveCount > 0` (some may be blocked)
- [ ] JSON file saved to `scripts/audit-output/YYYY-MM-DD.json`
- [ ] Per-site terminal output is readable and matches the JSON content
- [ ] `summary.missingImages` gives a concrete number to target for ENG-3
- [ ] `missingFromDb` highlights which scrapers are underperforming (feeds ENG-4)
