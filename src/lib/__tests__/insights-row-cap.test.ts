import { describe, it, expect, vi } from 'vitest';

// Reproduces BUG-2: getMarketBreakdown() and getSiteComparisonData() read raffle
// rows through the Supabase REST API, which returns at most 1,000 rows per
// request and reports no error when it cuts the rest off. Past that volume the
// charts count a fraction of the raffles.
//
// The fake client below behaves like that API: a table read applies its filters
// and then returns at most API_MAX_ROWS rows per request (a larger .limit() is
// still capped, as the live project does), while .range() pages and server-side
// aggregate RPCs see every row. The rows are test fixtures for this file only.

const API_MAX_ROWS = 1000;

interface FixtureSite {
  name: string;
  slug: string;
  competition_model: string;
  active: boolean;
}

interface FixtureRaffle {
  status: string;
  prize_type: string | null;
  percent_sold: number | null;
  site: FixtureSite;
}

const REV_COMPS: FixtureSite = { name: 'Rev Comps', slug: 'rev-comps', competition_model: 'raffle', active: true };
const LUCKY_DAY: FixtureSite = { name: 'Lucky Day', slug: 'lucky-day', competition_model: 'raffle', active: true };
const BOTB: FixtureSite = { name: 'BOTB', slug: 'botb', competition_model: 'spot_the_ball', active: true };
const RETIRED: FixtureSite = { name: 'Retired Site', slug: 'retired-site', competition_model: 'raffle', active: false };

function rows(count: number, make: (i: number) => FixtureRaffle): FixtureRaffle[] {
  return Array.from({ length: count }, (_, i) => make(i));
}

const RAFFLES: FixtureRaffle[] = [
  // Ended raffles — site comparison reads these.
  ...rows(1200, i => ({ status: 'drawn', prize_type: 'car', percent_sold: i % 2 === 0 ? 40 : 60, site: REV_COMPS })),
  ...rows(600, () => ({ status: 'sold_out', prize_type: 'car', percent_sold: 100, site: LUCKY_DAY })),
  // Ended raffles site comparison must leave out.
  ...rows(50, () => ({ status: 'drawn', prize_type: 'cash', percent_sold: 90, site: REV_COMPS })),
  ...rows(50, () => ({ status: 'drawn', prize_type: 'car', percent_sold: null, site: REV_COMPS })),
  ...rows(50, () => ({ status: 'drawn', prize_type: 'car', percent_sold: 10, site: BOTB })),
  ...rows(50, () => ({ status: 'drawn', prize_type: 'car', percent_sold: 10, site: RETIRED })),
  // Live raffles — market breakdown reads these.
  ...rows(1500, () => ({ status: 'active', prize_type: 'car', percent_sold: 20, site: REV_COMPS })),
  ...rows(800, () => ({ status: 'active', prize_type: 'cash', percent_sold: 20, site: LUCKY_DAY })),
  ...rows(200, () => ({ status: 'ending_soon', prize_type: 'car', percent_sold: 95, site: LUCKY_DAY })),
  // Live raffles market breakdown must leave out.
  ...rows(50, () => ({ status: 'active', prize_type: 'car', percent_sold: 5, site: RETIRED })),
];

type Predicate = (row: FixtureRaffle) => boolean;

function tableQuery(all: FixtureRaffle[]) {
  const filters: Predicate[] = [];
  let start = 0;
  let end = Number.POSITIVE_INFINITY;
  const field = (row: FixtureRaffle, column: string) => (row as unknown as Record<string, unknown>)[column];
  const query = {
    select: () => query,
    order: () => query,
    eq: (column: string, value: unknown) => {
      filters.push(row => field(row, column) === value);
      return query;
    },
    in: (column: string, values: unknown[]) => {
      filters.push(row => values.includes(field(row, column)));
      return query;
    },
    not: (column: string, operator: string, value: unknown) => {
      if (operator === 'is' && value === null) filters.push(row => field(row, column) != null);
      return query;
    },
    limit: (n: number) => {
      end = start + n;
      return query;
    },
    range: (from: number, to: number) => {
      start = from;
      end = to + 1;
      return query;
    },
    then: (resolve: (result: { data: FixtureRaffle[]; error: null }) => unknown) => {
      const matching = all.filter(row => filters.every(f => f(row)));
      return resolve({
        data: matching.slice(start, Math.min(end, start + API_MAX_ROWS)),
        error: null,
      });
    },
  };
  return query;
}

// What a database-side aggregate would return, computed over every row.
function marketBreakdownAggregate(all: FixtureRaffle[]) {
  const counts = new Map<string, { name: string; slug: string; prize_type: string; active_count: number }>();
  for (const row of all) {
    if (!row.site.active || !['active', 'ending_soon'].includes(row.status)) continue;
    const prizeType = row.prize_type ?? 'other';
    const key = `${row.site.slug}-${prizeType}`;
    const existing = counts.get(key);
    if (existing) existing.active_count++;
    else counts.set(key, { name: row.site.name, slug: row.site.slug, prize_type: prizeType, active_count: 1 });
  }
  return Array.from(counts.values());
}

function siteComparisonAggregate(all: FixtureRaffle[]) {
  const bySite = new Map<string, { name: string; slug: string; values: number[] }>();
  for (const row of all) {
    if (!row.site.active || row.site.competition_model === 'spot_the_ball') continue;
    if (row.prize_type !== 'car' || !['drawn', 'sold_out'].includes(row.status) || row.percent_sold == null) continue;
    const existing = bySite.get(row.site.slug);
    if (existing) existing.values.push(row.percent_sold);
    else bySite.set(row.site.slug, { name: row.site.name, slug: row.site.slug, values: [row.percent_sold] });
  }
  return Array.from(bySite.values())
    .map(({ name, slug, values }) => ({
      name,
      slug,
      total_draws: values.length,
      avg_percent_sold: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
      min_percent_sold: Math.round(Math.min(...values)),
      max_percent_sold: Math.round(Math.max(...values)),
    }))
    .sort((a, b) => a.avg_percent_sold - b.avg_percent_sold);
}

vi.mock('../supabase', () => ({
  createBrowserClient: () => ({
    from: () => tableQuery(RAFFLES),
    rpc: async (fn: string) => {
      if (fn === 'get_market_breakdown') return { data: marketBreakdownAggregate(RAFFLES), error: null };
      if (fn === 'get_site_comparison') return { data: siteComparisonAggregate(RAFFLES), error: null };
      return { data: null, error: { message: `function ${fn} does not exist` } };
    },
  }),
}));

import { getMarketBreakdown, getSiteComparisonData } from '../insights';

describe('getMarketBreakdown with more live raffles than the API row cap', () => {
  it('counts every live raffle on active sites, not only the first 1,000 rows', async () => {
    const result = await getMarketBreakdown();
    const bySlug = Object.fromEntries(result.map(site => [site.slug, { total: site.total, counts: site.counts }]));

    expect(bySlug).toEqual({
      'rev-comps': { total: 1500, counts: { car: 1500 } },
      'lucky-day': { total: 1000, counts: { cash: 800, car: 200 } },
    });
  });
});

describe('getSiteComparisonData with more ended raffles than the API row cap', () => {
  it('summarises every ended car raffle, not only the first 1,000 rows', async () => {
    const result = await getSiteComparisonData();

    expect(result).toEqual([
      { name: 'Rev Comps', slug: 'rev-comps', total_draws: 1200, avg_percent_sold: 50, min_percent_sold: 40, max_percent_sold: 60 },
      { name: 'Lucky Day', slug: 'lucky-day', total_draws: 600, avg_percent_sold: 100, min_percent_sold: 100, max_percent_sold: 100 },
    ]);
  });
});
