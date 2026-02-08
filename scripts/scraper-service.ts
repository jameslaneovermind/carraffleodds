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

async function runWithLock(jobName: string, fn: () => Promise<void>): Promise<void> {
  if (isRunning) {
    console.log(`[Service] Skipping ${jobName} — another job is still running`);
    return;
  }

  isRunning = true;
  console.log(`[Service] Starting ${jobName}...`);

  try {
    await fn();
    console.log(`[Service] ${jobName} complete`);
  } catch (error) {
    console.error(`[Service] ${jobName} failed:`, error instanceof Error ? error.message : error);
  } finally {
    isRunning = false;
  }
}

async function fullScrape(): Promise<void> {
  await runWithLock('Full Scrape', async () => {
    const b = await ensureBrowser();
    await runAllScrapers({ browser: b, concurrency: 1 });
  });
}

async function quickUpdate(): Promise<void> {
  await runWithLock('Quick Update', async () => {
    const b = await ensureBrowser();
    await runAllScrapers({ quick: true, browser: b });
  });
}

async function dailyCleanup(): Promise<void> {
  await runWithLock('Daily Cleanup', async () => {
    await cleanupExpiredRaffles();
  });
}

// ============================================
// Schedule
// ============================================

function startSchedule(): void {
  console.log('[Service] Setting up cron schedules...');

  // Full scrape every 3 hours: 0 */3 * * *
  cron.schedule('0 */3 * * *', () => {
    fullScrape();
  }, { timezone: 'Europe/London' });

  // Quick update every 10 minutes: */10 * * * *
  cron.schedule('*/10 * * * *', () => {
    quickUpdate();
  }, { timezone: 'Europe/London' });

  // Daily cleanup at 3:00 AM: 0 3 * * *
  cron.schedule('0 3 * * *', () => {
    dailyCleanup();
  }, { timezone: 'Europe/London' });

  console.log('[Service] Schedules active:');
  console.log('  - Full scrape:   every 3 hours');
  console.log('  - Quick update:  every 10 minutes');
  console.log('  - Daily cleanup: 3:00 AM London time');
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
  console.error('[Service] Uncaught exception:', error.message);
  // Don't exit — let PM2 decide
});

process.on('unhandledRejection', (reason) => {
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

  // Launch browser
  await ensureBrowser();

  // Run initial full scrape on startup
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
