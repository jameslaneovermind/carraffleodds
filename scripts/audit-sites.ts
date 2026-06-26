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

  const rows = (data ?? []) as DbRaffle[];
  if (rows.length === 1000) {
    console.warn(`[audit] fetchDbRaffles: result capped at 1000 rows for ${siteSlug} — results may be incomplete`);
  }
  return rows;
}

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

  for (const [externalId, dbRaffle] of Array.from(dbBySlug.entries())) {
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
  const outputPath = path.join(outputDir, `audit-${dateStr}.json`);

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
