/**
 * Persistent Scraper Service
 *
 * Runs as a long-lived process on the DigitalOcean droplet.
 * Keeps a Chromium browser instance alive and runs scrapes on schedule.
 *
 * Managed by PM2:
 *   pm2 start ecosystem.config.js
 *   pm2 logs scraper-service
 *   pm2 restart scraper-service
 */
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first, then .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import cron from 'node-cron';
import { chromium, Browser } from 'playwright';
import { runAllScrapers, cleanupExpiredRaffles } from '../src/scrapers/run-all';
import * as Sentry from '@sentry/node';
import { initSentry } from '../src/lib/sentry';

let browser: Browser | null = null;
let isRunning = false;

// ============================================
// Browser lifecycle
// ============================================

async function ensureBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) {
    return browser;
  }

  console.log('[Service] Launching Chromium...');
  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-features=site-per-process',
    ],
  });

  // Handle unexpected browser disconnection
  browser.on('disconnected', () => {
    console.warn('[Service] Browser disconnected unexpectedly');
    browser = null;
  });

  console.log('[Service] Chromium ready');
  return browser;
}

// ============================================
// Job runners with lock to prevent overlap
// ============================================

const JOB_TIMEOUT_MS: Record<string, number> = {
  'Full Scrape': 45 * 60 * 1000,   // 45 minutes max (supports 9 scrapers at concurrency 3)
  'Quick Update': 20 * 60 * 1000,  // 20 minutes max (supports 9 scrapers at concurrency 2)
  'Cleanup': 5 * 60 * 1000,        // 5 minutes max
};

async function runWithLock(jobName: string, fn: () => Promise<void>): Promise<void> {
  if (isRunning) {
    console.log(`[Service] Skipping ${jobName} — another job is still running`);
    return;
  }

  isRunning = true;
  console.log(`[Service] Starting ${jobName}...`);

  const timeoutMs = JOB_TIMEOUT_MS[jobName] ?? 20 * 60 * 1000;

  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${jobName} timed out after ${Math.round(timeoutMs / 60000)}m`)), timeoutMs)
      ),
    ]);
    console.log(`[Service] ${jobName} complete`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Service] ${jobName} failed: ${msg}`);

    // If timed out, kill the browser to clean up hung pages
    if (msg.includes('timed out')) {
      console.warn('[Service] Killing browser to recover from timeout...');
      if (browser) {
        await browser.close().catch(() => {});
        browser = null;
      }
    }
  } finally {
    isRunning = false;
  }
}

async function fullScrape(): Promise<void> {
  const checkInId = Sentry.captureCheckIn(
    { monitorSlug: 'scraper-full-run', status: 'in_progress' },
    {
      schedule: { type: 'crontab', value: '0 */3 * * *' },
      checkinMargin: 30,
      maxRuntime: 45,
      timezone: 'Europe/London',
    }
  );
  try {
    await runWithLock('Full Scrape', async () => {
      const b = await ensureBrowser();
      await runAllScrapers({ browser: b, concurrency: 3 });
      await cleanupExpiredRaffles();
    });
    Sentry.captureCheckIn({ monitorSlug: 'scraper-full-run', status: 'ok', checkInId });
  } catch {
    Sentry.captureCheckIn({ monitorSlug: 'scraper-full-run', status: 'error', checkInId });
  }
}

async function quickUpdate(): Promise<void> {
  await runWithLock('Quick Update', async () => {
    const b = await ensureBrowser();
    await runAllScrapers({ quick: true, browser: b, concurrency: 2 });
  });
}

async function cleanup(): Promise<void> {
  await runWithLock('Cleanup', async () => {
    await cleanupExpiredRaffles();
  });
}

// ============================================
// Schedule
// ============================================

function startSchedule(): void {
  console.log('[Service] Setting up cron schedules...');

  // Full scrape every 3 hours — cleanup runs at the end of each full scrape
  cron.schedule('0 */3 * * *', () => {
    fullScrape();
  }, { timezone: 'Europe/London' });

  // Quick update every 20 minutes
  cron.schedule('*/20 * * * *', () => {
    quickUpdate();
  }, { timezone: 'Europe/London' });

  console.log('[Service] Schedules active:');
  console.log('  - Full scrape:   every 3 hours (concurrency 3, timeout 45m; cleanup runs after each)');
  console.log('  - Quick update:  every 20 minutes (concurrency 2, timeout 20m)');
}

// ============================================
// Graceful shutdown
// ============================================

async function shutdown(signal: string): Promise<void> {
  console.log(`[Service] Received ${signal}, shutting down...`);

  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  Sentry.captureException(error);
  console.error('[Service] Uncaught exception:', error.message);
  // Don't exit — let PM2 decide
});

process.on('unhandledRejection', (reason) => {
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
  console.error('[Service] Unhandled rejection:', reason);
});

// ============================================
// Startup
// ============================================

async function main(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('[Service] CarRaffleOdds Scraper Service starting...');
  console.log(`[Service] Time: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  // Verify environment
  const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const altEnv = ['NEXT_PUBLIC_SUPABASE_URL'];
  const hasUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!hasUrl || !hasKey) {
    console.error('[Service] Missing environment variables!');
    console.error('  Need: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  initSentry(process.env.SENTRY_DSN);

  // Launch browser
  await ensureBrowser();

  // Clean up stale raffles immediately on startup, before waiting for the first full scrape
  console.log('[Service] Running startup cleanup...');
  await cleanup();

  // Run initial full scrape on startup (cleanup will also run at the end of this)
  console.log('[Service] Running initial full scrape...');
  await fullScrape();

  // Start cron schedule
  startSchedule();

  console.log('\n[Service] Service is running. Press Ctrl+C to stop.\n');
}

main().catch((error) => {
  console.error('[Service] Fatal startup error:', error);
  process.exit(1);
});
