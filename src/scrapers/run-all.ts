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
import * as Sentry from '@sentry/node';
import { computeQualityMetrics } from './quality-metrics';
import { createServiceClient } from '../lib/supabase';
import {
  BaseScraper,
  persistScrapeResult,
  persistQuickUpdate,
  logScrapeRun,
} from './base';
import { DreamCarGiveawaysScraper } from './dream-car-giveaways';
import { SevenDaysPerformanceScraper } from './seven-days-performance';
import { RevCompsScraper } from './rev-comps';
import { EliteCompetitionsScraper } from './elite-competitions';
import { ClickCompetitionsScraper } from './click-competitions';
import { LuckyDayCompetitionsScraper } from './lucky-day-competitions';
import { LlfGamesScraper } from './llf-games';
import { BotbScraper } from './botb';

// ============================================
// Sentry observability helpers
// ============================================

interface ScraperOutcome {
  name: string;
  siteSlug: string;
  zeroResults: boolean;
  qualityFailure: boolean;
  qualityDetail: string;
}

function checkAggregateFailures(outcomes: ScraperOutcome[]): void {
  const failures = outcomes.filter(o => o.zeroResults || o.qualityFailure);
  if (failures.length >= 2) {
    Sentry.captureMessage(
      `${failures.length} scrapers failed or have quality issues on this run`,
      {
        level: 'error',
        extra: {
          failures: failures.map(f => ({ site: f.siteSlug, reason: f.qualityDetail })),
        },
      }
    );
  }
}

// ============================================
// Registry of all scrapers
// ============================================

export function getAllScrapers(): BaseScraper[] {
  return [
    new DreamCarGiveawaysScraper(),
    new SevenDaysPerformanceScraper(),
    new RevCompsScraper(),
    new EliteCompetitionsScraper(),
    new ClickCompetitionsScraper(),
    new LuckyDayCompetitionsScraper(),
    new LlfGamesScraper(),
    new BotbScraper(),
    // Add more scrapers here as they're built:
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

/** Max time per individual scraper before it's forcefully timed out */
const PER_SCRAPER_TIMEOUT_MS = {
  full: 10 * 60 * 1000,  // 10 minutes per scraper for full scrape
  quick: 3 * 60 * 1000,  // 3 minutes per scraper for quick update
};

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

  const outcomes: ScraperOutcome[] = [];

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

          const timeoutMs = quick ? PER_SCRAPER_TIMEOUT_MS.quick : PER_SCRAPER_TIMEOUT_MS.full;
          const scraperStart = Date.now();

          try {
            // Wrap scraper execution in a timeout to prevent hangs
            await Promise.race([
              (async () => {
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

                    const metrics = computeQualityMetrics(result.raffles);
                    const qualityIssues: string[] = [];

                    if (metrics.imageNullRate > 0.80) {
                      qualityIssues.push(`image null ${Math.round(metrics.imageNullRate * 100)}%`);
                      Sentry.captureMessage(`[${scraper.name}] High image null rate`, {
                        level: 'warning',
                        tags: { site: scraper.siteSlug },
                        extra: { imageNullRate: metrics.imageNullRate, total: result.raffles.length },
                      });
                    }
                    if (metrics.priceNullRate > 0.50) {
                      qualityIssues.push(`price null ${Math.round(metrics.priceNullRate * 100)}%`);
                      Sentry.captureMessage(`[${scraper.name}] High price null rate`, {
                        level: 'warning',
                        tags: { site: scraper.siteSlug },
                        extra: { priceNullRate: metrics.priceNullRate, total: result.raffles.length },
                      });
                    }
                    if (metrics.otherTypeRate > 0.60) {
                      qualityIssues.push(`unknown type ${Math.round(metrics.otherTypeRate * 100)}%`);
                      Sentry.captureMessage(`[${scraper.name}] High other/unclassified prize_type rate`, {
                        level: 'warning',
                        tags: { site: scraper.siteSlug },
                        extra: { otherTypeRate: metrics.otherTypeRate, total: result.raffles.length },
                      });
                    }

                    outcomes.push({
                      name: scraper.name,
                      siteSlug: scraper.siteSlug,
                      zeroResults: false,
                      qualityFailure: qualityIssues.length > 0,
                      qualityDetail: qualityIssues.join('; '),
                    });

                    await logScrapeRun(scraper.siteSlug, {
                      status: result.errors.length > 0 ? 'partial' : 'success',
                      itemsFound: result.raffles.length,
                      itemsNew,
                      itemsUpdated,
                      errorMessage: result.errors.join('; ') || undefined,
                      durationMs: result.duration,
                    }, supabase);
                  } else {
                    Sentry.captureMessage(`[${scraper.name}] Returned zero results`, {
                      level: 'warning',
                      tags: { site: scraper.siteSlug },
                      extra: { errors: result.errors },
                    });

                    outcomes.push({
                      name: scraper.name,
                      siteSlug: scraper.siteSlug,
                      zeroResults: true,
                      qualityFailure: false,
                      qualityDetail: `Zero results${result.errors.length ? ': ' + result.errors[0] : ''}`,
                    });

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
              })(),
              new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error(`Scraper timed out after ${Math.round(timeoutMs / 60000)}m`)),
                  timeoutMs
                )
              ),
            ]);
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const elapsed = Math.round((Date.now() - scraperStart) / 1000);
            console.error(`[${scraper.name}] Fatal error after ${elapsed}s: ${msg}`);

            if (!quick) {
              Sentry.captureException(error instanceof Error ? error : new Error(msg), {
                tags: { site: scraper.siteSlug },
              });
              outcomes.push({
                name: scraper.name,
                siteSlug: scraper.siteSlug,
                zeroResults: true,
                qualityFailure: false,
                qualityDetail: `Fatal error: ${msg}`,
              });
            }

            await logScrapeRun(scraper.siteSlug, {
              status: 'failed',
              itemsFound: 0,
              itemsNew: 0,
              itemsUpdated: 0,
              errorMessage: msg,
              durationMs: Date.now() - scraperStart,
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

  if (!quick) {
    checkAggregateFailures(outcomes);
  }

  console.log(`\n[Orchestrator] ${mode} complete at ${new Date().toISOString()}\n`);
}

// ============================================
// Cleanup — mark expired raffles
// ============================================

export async function cleanupExpiredRaffles(): Promise<void> {
  console.log('[Cleanup] Running raffle cleanup...');
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Step 1: Snapshot all currently active/ending_soon raffles BEFORE any status change.
  // This captures a final odds record for raffles that are about to be marked drawn.
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

  // Step 2: Mark expired raffles as drawn.
  const { data: drawn, error: drawnError } = await supabase
    .from('raffles')
    .update({ status: 'drawn' })
    .lt('end_date', now)
    .in('status', ['active', 'ending_soon'])
    .select('id');

  if (drawnError) {
    console.error('[Cleanup] Error marking drawn:', drawnError.message);
  } else {
    console.log(`[Cleanup] Marked ${drawn?.length ?? 0} raffles as drawn`);
  }

  // Step 3: Promote active raffles ending within 48 hours to ending_soon.
  const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: promoted, error: promotedError } = await supabase
    .from('raffles')
    .update({ status: 'ending_soon' })
    .eq('status', 'active')
    .gt('end_date', now)
    .lte('end_date', fortyEightHoursFromNow)
    .select('id');

  if (promotedError) {
    console.error('[Cleanup] Error promoting ending_soon:', promotedError.message);
  } else {
    console.log(`[Cleanup] Promoted ${promoted?.length ?? 0} raffles to ending_soon`);
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
