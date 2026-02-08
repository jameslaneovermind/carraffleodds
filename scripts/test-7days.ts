/**
 * Test script for 7 Days Performance scraper.
 * Runs a full scrape (listing + detail pages) without persisting to Supabase.
 *
 * Run: npx tsx scripts/test-7days.ts
 */
import { chromium } from 'playwright';
import { SevenDaysPerformanceScraper } from '../src/scrapers/seven-days-performance';
import { classifyPrizeType, classifyCarCategory, parseCashFromTitle } from '../src/lib/utils';

async function test() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });

  const scraper = new SevenDaysPerformanceScraper();

  // Quick update test
  console.log('\n=== Quick Update Test ===\n');
  const quickResult = await scraper.quickUpdate(context);
  console.log(`Quick update found ${quickResult.updates.length} updates in ${quickResult.duration}ms`);
  quickResult.updates.slice(0, 5).forEach(u => {
    console.log(`  ${u.externalId}: ${u.percentSold ?? '?'}% sold, £${((u.ticketPrice || 0) / 100).toFixed(2)}`);
  });

  // Full scrape test
  console.log('\n=== Full Scrape Test (all pages) ===\n');
  const context2 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });

  const result = await scraper.scrape(context2);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${result.raffles.length} raffles`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`${'='.repeat(60)}\n`);

  // Show all raffles with classification
  console.log('--- All Raffles with Classification ---\n');
  for (const raffle of result.raffles) {
    const prizeType = classifyPrizeType(raffle.title);
    const carCategory = prizeType === 'car' || prizeType === 'motorcycle'
      ? classifyCarCategory(raffle.title)
      : null;
    const titleCash = parseCashFromTitle(raffle.title);

    console.log(`${raffle.title}`);
    console.log(`  Type: ${prizeType} | Car Category: ${carCategory || 'N/A'}`);
    console.log(`  Price: ${raffle.ticketPrice ? `£${(raffle.ticketPrice / 100).toFixed(2)}` : 'N/A'}`);
    console.log(`  Tickets: ${raffle.totalTickets?.toLocaleString() ?? 'N/A'} total, ${raffle.ticketsSold?.toLocaleString() ?? 'N/A'} sold (${raffle.percentSold ?? 'N/A'}%)`);
    console.log(`  Cash Alt: ${raffle.cashAlternative ? `£${(raffle.cashAlternative / 100).toLocaleString()}` : 'N/A'} (from title: £${titleCash.cashAlternative ? (titleCash.cashAlternative / 100).toLocaleString() : 'N/A'})`);
    console.log(`  Additional: ${raffle.additionalCash ? `£${(raffle.additionalCash / 100).toLocaleString()}` : 'N/A'}`);
    console.log(`  End: ${raffle.endDate?.toISOString() ?? 'N/A'} | Draw: ${raffle.drawType ?? 'N/A'}`);
    console.log(`  Image: ${raffle.imageUrl ? 'YES' : 'NO'} | URL: ${raffle.sourceUrl}`);
    console.log('');
  }

  // Data coverage
  const withTickets = result.raffles.filter(r => r.totalTickets);
  const withPrice = result.raffles.filter(r => r.ticketPrice);
  const withCashAlt = result.raffles.filter(r => r.cashAlternative);
  const withEndDate = result.raffles.filter(r => r.endDate);
  const withImage = result.raffles.filter(r => r.imageUrl);

  console.log(`--- Data Coverage ---`);
  console.log(`Total raffles: ${result.raffles.length}`);
  console.log(`With ticket count: ${withTickets.length} (${((withTickets.length / result.raffles.length) * 100).toFixed(0)}%)`);
  console.log(`With price: ${withPrice.length} (${((withPrice.length / result.raffles.length) * 100).toFixed(0)}%)`);
  console.log(`With cash alt: ${withCashAlt.length} (${((withCashAlt.length / result.raffles.length) * 100).toFixed(0)}%)`);
  console.log(`With end date: ${withEndDate.length} (${((withEndDate.length / result.raffles.length) * 100).toFixed(0)}%)`);
  console.log(`With image: ${withImage.length} (${((withImage.length / result.raffles.length) * 100).toFixed(0)}%)`);

  // Prize type breakdown
  const typeCounts: Record<string, number> = {};
  for (const r of result.raffles) {
    const t = classifyPrizeType(r.title);
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  console.log(`\n--- Prize Type Breakdown ---`);
  Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
    console.log(`  ${t}: ${c}`);
  });

  if (result.errors.length > 0) {
    console.log('\n--- Errors ---');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  await browser.close();
}

test().catch(console.error);
