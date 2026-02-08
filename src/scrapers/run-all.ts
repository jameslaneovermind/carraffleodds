/**
 * Scraper Orchestrator
 *
 * Runs all active scrapers, manages the shared browser instance,
 * persists results to Supabase, and logs scrape runs.
 *
 * Usage:
 *   npx tsx src/scrapers/run-all.ts              # full deep scrape
 *   npx tsx src/scrapers/run-all.ts --quick       # quick listing-only update
 *   npx tsx src/scrapers/run-all.ts --site=dream-car-giveaways  # single site
 */
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first, then .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { chromium, Browser, BrowserContext } from 'playwright';
import { createServiceClient } from '../lib/supabase';
import {
  BaseScraper,
  persistScrapeResult,
  persistQuickUpdate,
  logScrapeRun,
} from './base';
import { DreamCarGiveawaysScraper } from './dream-car-giveaways';
import { SevenDaysPerformanceScraper } from './seven-days-performance';

// ============================================
// Registry of all scrapers
// ============================================

function getAllScrapers(): BaseScraper[] {
  return [
    new DreamCarGiveawaysScraper(),
    new SevenDaysPerformanceScraper(),
    // Add more scrapers here as they're built:
    // new EliteCompetitionsScraper(),
    // new BotbScraper(),
  ];
}

// ============================================
// Browser management
// ============================================

async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',      // Important for low-memory environments
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-features=site-per-process',
    ],
  });
}

async function createContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });
}

// ============================================
// Orchestrator
// ============================================

export interface OrchestratorOptions {
  /** Run quick update instead of full scrape */
  quick?: boolean;
  /** Only run scraper for this site slug */
  siteSlug?: string;
  /** Max concurrent scrapers (browser contexts) */
  concurrency?: number;
  /** Existing browser to reuse (for persistent service) */
  browser?: Browser;
}

export async function runAllScrapers(options: OrchestratorOptions = {}): Promise<void> {
  const { quick = false, siteSlug, concurrency = 1 } = options;
  const mode = quick ? 'QUICK UPDATE' : 'FULL SCRAPE';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Orchestrator] Starting ${mode} at ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  const supabase = createServiceClient();

  // Get active site slugs from DB
  const { data: activeSites } = await supabase
    .from('sites')
    .select('slug')
    .eq('active', true);

  const activeSlugs = new Set(activeSites?.map(s => s.slug) || []);

  // Filter scrapers
  let scrapers = getAllScrapers().filter(s => activeSlugs.has(s.siteSlug));

  if (siteSlug) {
    scrapers = scrapers.filter(s => s.siteSlug === siteSlug);
  }

  if (scrapers.length === 0) {
    console.log('[Orchestrator] No active scrapers to run.');
    return;
  }

  console.log(`[Orchestrator] Running ${scrapers.length} scraper(s): ${scrapers.map(s => s.name).join(', ')}`);

  // Create or reuse browser
  const ownBrowser = !options.browser;
  const browser = options.browser ?? await createBrowser();

  try {
    // Run scrapers in batches based on concurrency
    for (let i = 0; i < scrapers.length; i += concurrency) {
      const batch = scrapers.slice(i, i + concurrency);

      await Promise.all(
        batch.map(async (scraper) => {
          const context = await createContext(browser);

          try {
            if (quick) {
              // Quick update — listing pages only
              console.log(`[${scraper.name}] Starting quick update...`);
              const result = await scraper.quickUpdate(context);

              console.log(`[${scraper.name}] Quick update found ${result.updates.length} updates in ${result.duration}ms`);

              if (result.updates.length > 0) {
                const updated = await persistQuickUpdate(result, supabase);
                console.log(`[${scraper.name}] Persisted ${updated} quick updates`);
              }

              if (result.errors.length > 0) {
                console.warn(`[${scraper.name}] Errors:`, result.errors);
              }

              await logScrapeRun(scraper.siteSlug, {
                status: result.errors.length > 0 ? 'partial' : 'success',
                itemsFound: result.updates.length,
                itemsNew: 0,
                itemsUpdated: result.updates.length,
                errorMessage: result.errors.join('; ') || undefined,
                durationMs: result.duration,
              }, supabase);

            } else {
              // Full deep scrape
              console.log(`[${scraper.name}] Starting full scrape...`);
              const result = await scraper.scrape(context);

              console.log(`[${scraper.name}] Found ${result.raffles.length} raffles in ${result.duration}ms`);

              if (result.raffles.length > 0) {
                const { itemsNew, itemsUpdated } = await persistScrapeResult(result, supabase);
                console.log(`[${scraper.name}] Persisted: ${itemsNew} new, ${itemsUpdated} updated`);

                await logScrapeRun(scraper.siteSlug, {
                  status: result.errors.length > 0 ? 'partial' : 'success',
                  itemsFound: result.raffles.length,
                  itemsNew,
                  itemsUpdated,
                  errorMessage: result.errors.join('; ') || undefined,
                  durationMs: result.duration,
                }, supabase);
              } else {
                await logScrapeRun(scraper.siteSlug, {
                  status: 'failed',
                  itemsFound: 0,
                  itemsNew: 0,
                  itemsUpdated: 0,
                  errorMessage: result.errors.join('; ') || 'No raffles found',
                  durationMs: result.duration,
                }, supabase);
              }

              if (result.errors.length > 0) {
                console.warn(`[${scraper.name}] Errors:`, result.errors);
              }
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[${scraper.name}] Fatal error: ${msg}`);

            await logScrapeRun(scraper.siteSlug, {
              status: 'failed',
              itemsFound: 0,
              itemsNew: 0,
              itemsUpdated: 0,
              errorMessage: msg,
              durationMs: 0,
            }, supabase);
          } finally {
            await context.close();
          }
        })
      );
    }
  } finally {
    if (ownBrowser) {
      await browser.close();
    }
  }

  console.log(`\n[Orchestrator] ${mode} complete at ${new Date().toISOString()}\n`);
}

// ============================================
// Cleanup — mark expired raffles
// ============================================

export async function cleanupExpiredRaffles(): Promise<void> {
  console.log('[Cleanup] Marking expired raffles...');
  const supabase = createServiceClient();

  // Mark raffles past their end date as 'drawn'
  const { data, error } = await supabase
    .from('raffles')
    .update({ status: 'drawn' })
    .lt('end_date', new Date().toISOString())
    .in('status', ['active', 'ending_soon'])
    .select('id');

  if (error) {
    console.error('[Cleanup] Error:', error.message);
  } else {
    console.log(`[Cleanup] Marked ${data?.length || 0} raffles as drawn`);
  }

  // Take snapshots of all active raffles
  const { data: activeRaffles } = await supabase
    .from('raffles')
    .select('id, tickets_sold, percent_sold, ticket_price')
    .in('status', ['active', 'ending_soon']);

  if (activeRaffles && activeRaffles.length > 0) {
    const snapshots = activeRaffles.map(r => ({
      raffle_id: r.id,
      tickets_sold: r.tickets_sold,
      percent_sold: r.percent_sold,
      ticket_price: r.ticket_price,
    }));

    const { error: snapError } = await supabase
      .from('raffle_snapshots')
      .insert(snapshots);

    if (snapError) {
      console.error('[Cleanup] Snapshot error:', snapError.message);
    } else {
      console.log(`[Cleanup] Saved ${snapshots.length} snapshots`);
    }
  }
}

// ============================================
// CLI entrypoint
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const quick = args.includes('--quick');
  const cleanupOnly = args.includes('--cleanup');
  const siteArg = args.find(a => a.startsWith('--site='));
  const siteSlug = siteArg?.split('=')[1];
  const concurrencyArg = args.find(a => a.startsWith('--concurrency='));
  const concurrency = concurrencyArg ? parseInt(concurrencyArg.split('=')[1]) : 1;

  if (cleanupOnly) {
    await cleanupExpiredRaffles();
    return;
  }

  await runAllScrapers({ quick, siteSlug, concurrency });
}

// Only run if called directly (not imported)
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal:', error);
      process.exit(1);
    });
}
