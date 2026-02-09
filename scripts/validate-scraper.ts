/**
 * Universal Scraper Validation Script
 *
 * Runs any scraper and validates output with automated PASS/WARN/FAIL checks.
 * Does NOT persist to Supabase — safe to run anytime.
 *
 * Usage:
 *   npm run test:scraper -- --site=dream-car-giveaways   # test one
 *   npm run test:scraper                                   # test all registered
 */
import { chromium, Browser, BrowserContext } from 'playwright';
import { getAllScrapers } from '../src/scrapers/run-all';
import { classifyPrizeType, classifyCarCategory, parseCashFromTitle } from '../src/lib/utils';
import type { ScrapedRaffle, ScraperResult } from '../src/scrapers/base';

// ============================================
// Types
// ============================================

type CheckLevel = 'PASS' | 'WARN' | 'FAIL';

interface CheckResult {
  level: CheckLevel;
  message: string;
  details?: string[];
}

interface ValidationReport {
  scraperName: string;
  siteSlug: string;
  duration: number;
  raffleCount: number;
  errorCount: number;
  criticalChecks: CheckResult[];
  qualityChecks: CheckResult[];
  coverage: Record<string, { count: number; total: number; percent: number }>;
  classification: Record<string, number>;
  valueScoreCount: number;
  overallResult: 'PASS' | 'FAIL';
  criticalFailures: number;
  warnings: number;
}

// ============================================
// Validation Checks
// ============================================

function runCriticalChecks(result: ScraperResult): CheckResult[] {
  const checks: CheckResult[] = [];
  const raffles = result.raffles;

  // 1. At least 1 raffle returned
  if (raffles.length === 0) {
    checks.push({
      level: 'FAIL',
      message: `No raffles returned (0 found)`,
    });
  } else {
    checks.push({
      level: 'PASS',
      message: `At least 1 raffle returned (${raffles.length})`,
    });
  }

  // 2. All externalIds non-empty
  const emptyIds = raffles.filter(r => !r.externalId || r.externalId.trim() === '');
  if (emptyIds.length > 0) {
    checks.push({
      level: 'FAIL',
      message: `${emptyIds.length} raffle(s) have empty externalId`,
    });
  } else {
    checks.push({
      level: 'PASS',
      message: 'All externalIds non-empty',
    });
  }

  // 3. All titles valid (non-empty, no HTML, reasonable length)
  const badTitles = raffles.filter(r => {
    if (!r.title || r.title.trim() === '') return true;
    if (r.title.length < 5 || r.title.length > 300) return true;
    if (/<[^>]+>/.test(r.title)) return true; // HTML tags
    return false;
  });
  if (badTitles.length > 0) {
    checks.push({
      level: 'FAIL',
      message: `${badTitles.length} raffle(s) have invalid titles`,
      details: badTitles.slice(0, 3).map(r =>
        `  "${r.title?.substring(0, 60) || '(empty)'}..." (len=${r.title?.length || 0})`
      ),
    });
  } else {
    checks.push({
      level: 'PASS',
      message: 'All titles valid (length 5-300, no HTML)',
    });
  }

  // 4. All sourceUrls valid
  const badUrls = raffles.filter(r => !r.sourceUrl || !r.sourceUrl.startsWith('http'));
  if (badUrls.length > 0) {
    checks.push({
      level: 'FAIL',
      message: `${badUrls.length} raffle(s) have invalid sourceUrl`,
      details: badUrls.slice(0, 3).map(r =>
        `  "${r.externalId}": ${r.sourceUrl || '(empty)'}`
      ),
    });
  } else {
    checks.push({
      level: 'PASS',
      message: 'All sourceUrls valid',
    });
  }

  // 5. No duplicate externalIds
  const idCounts = new Map<string, number>();
  for (const r of raffles) {
    idCounts.set(r.externalId, (idCounts.get(r.externalId) || 0) + 1);
  }
  const duplicates = Array.from(idCounts.entries()).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    checks.push({
      level: 'FAIL',
      message: `${duplicates.length} duplicate externalId(s)`,
      details: duplicates.slice(0, 5).map(([id, count]) =>
        `  "${id}" appears ${count} times`
      ),
    });
  } else {
    checks.push({
      level: 'PASS',
      message: 'No duplicate externalIds',
    });
  }

  // 6. No fatal errors
  const fatalErrors = result.errors.filter(e => e.toLowerCase().startsWith('fatal'));
  if (fatalErrors.length > 0) {
    checks.push({
      level: 'FAIL',
      message: `${fatalErrors.length} fatal error(s)`,
      details: fatalErrors.slice(0, 3).map(e => `  ${e}`),
    });
  } else {
    checks.push({
      level: 'PASS',
      message: `No fatal errors${result.errors.length > 0 ? ` (${result.errors.length} non-fatal)` : ''}`,
    });
  }

  return checks;
}

function runQualityChecks(raffles: ScrapedRaffle[]): CheckResult[] {
  const checks: CheckResult[] = [];
  const total = raffles.length;
  if (total === 0) return checks;

  const checkField = (
    fieldName: string,
    predicate: (r: ScrapedRaffle) => boolean,
    warnThreshold = 0.7,
  ) => {
    const passing = raffles.filter(predicate);
    const pct = passing.length / total;
    const pctStr = `${passing.length}/${total} (${Math.round(pct * 100)}%)`;

    if (pct >= warnThreshold) {
      checks.push({
        level: 'PASS',
        message: `${fieldName}: ${pctStr}`,
      });
    } else {
      const missing = raffles.filter(r => !predicate(r));
      checks.push({
        level: 'WARN',
        message: `${fieldName}: ${pctStr}`,
        details: missing.slice(0, 3).map(r =>
          `  missing on: "${r.externalId}"`
        ),
      });
    }
  };

  checkField('ticketPrice', r => r.ticketPrice != null && r.ticketPrice > 0);
  checkField('imageUrl', r => !!r.imageUrl && r.imageUrl.startsWith('http'));
  checkField('endDate', r => r.endDate != null && r.endDate > new Date());
  checkField('totalTickets', r => r.totalTickets != null && r.totalTickets > 0);
  checkField(
    'cashAlternative or prizeValue',
    r => (r.cashAlternative != null && r.cashAlternative > 0) || (r.prizeValue != null && r.prizeValue > 0),
  );
  checkField('percentSold', r => r.percentSold != null && r.percentSold >= 0 && r.percentSold <= 100);

  return checks;
}

function computeCoverage(raffles: ScrapedRaffle[]): Record<string, { count: number; total: number; percent: number }> {
  const total = raffles.length;
  if (total === 0) return {};

  const fields: Record<string, (r: ScrapedRaffle) => boolean> = {
    ticketPrice: r => r.ticketPrice != null && r.ticketPrice > 0,
    totalTickets: r => r.totalTickets != null && r.totalTickets > 0,
    imageUrl: r => !!r.imageUrl,
    endDate: r => r.endDate != null,
    cashAlternative: r => r.cashAlternative != null && r.cashAlternative > 0,
    prizeValue: r => r.prizeValue != null && r.prizeValue > 0,
    percentSold: r => r.percentSold != null,
    ticketsSold: r => r.ticketsSold != null,
  };

  const coverage: Record<string, { count: number; total: number; percent: number }> = {};
  for (const [field, pred] of Object.entries(fields)) {
    const count = raffles.filter(pred).length;
    coverage[field] = { count, total, percent: Math.round((count / total) * 100) };
  }

  // Value Score calculability
  const valueScoreCount = raffles.filter(r => {
    const value = r.prizeValue || r.cashAlternative;
    return value && value > 0 && r.totalTickets && r.totalTickets > 0 && r.ticketPrice && r.ticketPrice > 0;
  }).length;
  coverage['Value Score'] = { count: valueScoreCount, total, percent: Math.round((valueScoreCount / total) * 100) };

  return coverage;
}

function computeClassification(raffles: ScrapedRaffle[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of raffles) {
    const prizeType = classifyPrizeType(r.title);
    counts[prizeType] = (counts[prizeType] || 0) + 1;
  }
  return counts;
}

// ============================================
// Report Printer
// ============================================

function printReport(report: ValidationReport): void {
  const { scraperName, siteSlug, duration, raffleCount, errorCount } = report;
  const durationSec = (duration / 1000).toFixed(1);

  console.log('');
  console.log('='.repeat(50));
  console.log(`  SCRAPER VALIDATION: ${scraperName}`);
  console.log(`  (${siteSlug})`);
  console.log('='.repeat(50));
  console.log('');
  console.log(`Ran full scrape in ${durationSec}s — ${raffleCount} raffles, ${errorCount} errors`);
  console.log('');

  // Critical checks
  console.log('--- Critical Checks ---');
  for (const check of report.criticalChecks) {
    const icon = check.level === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`  ${icon}  ${check.message}`);
    if (check.details) {
      for (const d of check.details) console.log(`       ${d}`);
    }
  }
  console.log('');

  // Quality checks
  console.log('--- Data Quality ---');
  for (const check of report.qualityChecks) {
    const icon = check.level === 'PASS' ? 'PASS' : 'WARN';
    console.log(`  ${icon}  ${check.message}`);
    if (check.details) {
      for (const d of check.details) console.log(`       ${d}`);
    }
  }
  console.log('');

  // Coverage summary
  if (raffleCount > 0) {
    console.log('--- Coverage Summary ---');
    const maxFieldLen = Math.max(...Object.keys(report.coverage).map(k => k.length));
    for (const [field, { count, total, percent }] of Object.entries(report.coverage)) {
      const fieldPad = field.padEnd(maxFieldLen + 2);
      const countStr = `${count}/${total}`.padStart(8);
      console.log(`  ${fieldPad} ${countStr}   ${String(percent).padStart(3)}%`);
    }
    console.log('');
  }

  // Classification
  if (raffleCount > 0) {
    console.log('--- Classification ---');
    const sorted = Object.entries(report.classification).sort((a, b) => b[1] - a[1]);
    console.log('  ' + sorted.map(([type, count]) => `${type}: ${count}`).join(' | '));
    console.log('');
  }

  // Sample raffles (first 3)
  if (raffleCount > 0) {
    console.log('--- Sample Raffles (first 3) ---');
    const samples = report.raffleCount > 0 ? 3 : 0;
    // We don't have access to raffles here, this is printed in the main function
  }

  // Overall result
  const resultColor = report.overallResult === 'PASS' ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${resultColor}RESULT: ${report.overallResult}${reset} (${report.criticalFailures} critical failures, ${report.warnings} warnings)`);
  console.log('');
}

function printSampleRaffles(raffles: ScrapedRaffle[], count = 3): void {
  if (raffles.length === 0) return;

  console.log('--- Sample Raffles ---');
  for (const raffle of raffles.slice(0, count)) {
    const prizeType = classifyPrizeType(raffle.title);
    const carCategory = (prizeType === 'car' || prizeType === 'motorcycle')
      ? classifyCarCategory(raffle.title, raffle.carMake, raffle.carModel)
      : null;
    const titleCash = parseCashFromTitle(raffle.title);

    console.log(`  ${raffle.title}`);
    console.log(`    Type: ${prizeType}${carCategory ? ` (${carCategory})` : ''}`);
    console.log(`    Price: ${raffle.ticketPrice ? `£${(raffle.ticketPrice / 100).toFixed(2)}` : 'N/A'} | Tickets: ${raffle.totalTickets?.toLocaleString() ?? 'N/A'} | Sold: ${raffle.percentSold ?? 'N/A'}%`);
    console.log(`    Cash Alt: ${raffle.cashAlternative ? `£${(raffle.cashAlternative / 100).toLocaleString()}` : 'N/A'}${titleCash.cashAlternative ? ` (from title: £${(titleCash.cashAlternative / 100).toLocaleString()})` : ''}`);
    console.log(`    End: ${raffle.endDate?.toISOString() ?? 'N/A'} | Image: ${raffle.imageUrl ? 'YES' : 'NO'}`);
    console.log(`    URL: ${raffle.sourceUrl}`);
    console.log('');
  }
}

// ============================================
// Main
// ============================================

async function validateScraper(
  scraper: { name: string; siteSlug: string; scrape: (ctx: BrowserContext) => Promise<ScraperResult> },
  browser: Browser,
): Promise<ValidationReport> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });

  let result: ScraperResult;
  try {
    result = await scraper.scrape(context);
  } finally {
    await context.close();
  }

  // Run checks
  const criticalChecks = runCriticalChecks(result);
  const qualityChecks = runQualityChecks(result.raffles);
  const coverage = computeCoverage(result.raffles);
  const classification = computeClassification(result.raffles);

  const criticalFailures = criticalChecks.filter(c => c.level === 'FAIL').length;
  const warnings = qualityChecks.filter(c => c.level === 'WARN').length;

  const valueScoreCount = coverage['Value Score']?.count ?? 0;

  const report: ValidationReport = {
    scraperName: scraper.name,
    siteSlug: scraper.siteSlug,
    duration: result.duration,
    raffleCount: result.raffles.length,
    errorCount: result.errors.length,
    criticalChecks,
    qualityChecks,
    coverage,
    classification,
    valueScoreCount,
    overallResult: criticalFailures > 0 ? 'FAIL' : 'PASS',
    criticalFailures,
    warnings,
  };

  // Print report
  printSampleRaffles(result.raffles);
  printReport(report);

  // Print non-fatal errors if any
  if (result.errors.length > 0) {
    console.log('--- Scraper Errors ---');
    for (const err of result.errors.slice(0, 10)) {
      console.log(`  - ${err}`);
    }
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`);
    }
    console.log('');
  }

  return report;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const siteArg = args.find(a => a.startsWith('--site='));
  const targetSlug = siteArg?.split('=')[1];

  // Get scrapers
  let scrapers = getAllScrapers();

  if (targetSlug) {
    scrapers = scrapers.filter(s => s.siteSlug === targetSlug);
    if (scrapers.length === 0) {
      console.error(`No scraper found for slug "${targetSlug}"`);
      console.error(`Available: ${getAllScrapers().map(s => s.siteSlug).join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`\nValidating ${scrapers.length} scraper(s): ${scrapers.map(s => s.siteSlug).join(', ')}\n`);

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  let hasFailures = false;

  try {
    for (const scraper of scrapers) {
      const report = await validateScraper(scraper, browser);
      if (report.overallResult === 'FAIL') {
        hasFailures = true;
      }
    }
  } finally {
    await browser.close();
  }

  // Summary if multiple scrapers
  if (scrapers.length > 1) {
    console.log('='.repeat(50));
    console.log(`  OVERALL: ${hasFailures ? 'FAIL' : 'PASS'}`);
    console.log('='.repeat(50));
  }

  process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
