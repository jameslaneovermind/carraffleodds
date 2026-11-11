import { describe, it, expect, vi } from 'vitest';

// Reproduces BUG-1: getReleasePatterns() reads every raffle row through the
// Supabase REST API, which returns at most 1,000 rows per request and reports
// no error when it cuts the rest off. The chart then counts a fraction of the
// raffles.
//
// The fake client below behaves like that API: a table read returns at most
// API_MAX_ROWS rows per request (a larger .limit() is still capped, as the live
// project does), while .range() pages and a server-side aggregate RPC see every
// row. The rows are test fixtures for this file only.

const API_MAX_ROWS = 1000;

interface FixtureRaffle {
  created_at: string;
  site: { name: string; slug: string; active: boolean };
}

const REV_COMPS = { name: 'Rev Comps', slug: 'rev-comps', active: true };
const LUCKY_DAY = { name: 'Lucky Day', slug: 'lucky-day', active: true };

// 2024-01-01 is a Monday; spreading rows one day apart cycles through the week.
function fixtureRows(site: FixtureRaffle['site'], count: number): FixtureRaffle[] {
  return Array.from({ length: count }, (_, i) => ({
    created_at: new Date(Date.UTC(2024, 0, 1 + (i % 700), 12)).toISOString(),
    site,
  }));
}

const RAFFLES: FixtureRaffle[] = [
  ...fixtureRows(REV_COMPS, 1500),
  ...fixtureRows(LUCKY_DAY, 1000),
];

function tableQuery(rows: FixtureRaffle[]) {
  let start = 0;
  let end = rows.length;
  const query = {
    select: () => query,
    not: () => query,
    eq: () => query,
    in: () => query,
    order: () => query,
    limit: (n: number) => {
      end = start + n;
      return query;
    },
    range: (from: number, to: number) => {
      start = from;
      end = to + 1;
      return query;
    },
    then: (resolve: (result: { data: FixtureRaffle[]; error: null }) => unknown) =>
      resolve({
        data: rows.slice(start, Math.min(end, start + API_MAX_ROWS)),
        error: null,
      }),
  };
  return query;
}

function aggregateBySiteAndDay(rows: FixtureRaffle[]) {
  const counts = new Map<string, { name: string; slug: string; day_of_week: number; competition_count: number }>();
  for (const row of rows) {
    if (!row.site.active) continue;
    const day = new Date(row.created_at).getUTCDay();
    const key = `${row.site.slug}-${day}`;
    const existing = counts.get(key);
    if (existing) existing.competition_count++;
    else counts.set(key, { name: row.site.name, slug: row.site.slug, day_of_week: day, competition_count: 1 });
  }
  return Array.from(counts.values());
}

vi.mock('../supabase', () => ({
  createBrowserClient: () => ({
    from: () => tableQuery(RAFFLES),
    rpc: async (fn: string) =>
      fn === 'get_release_patterns'
        ? { data: aggregateBySiteAndDay(RAFFLES), error: null }
        : { data: null, error: { message: `function ${fn} does not exist` } },
  }),
}));

import { getReleasePatterns } from '../insights';

describe('getReleasePatterns with more raffles than the API row cap', () => {
  it('counts every raffle, not only the first 1,000 rows', async () => {
    const result = await getReleasePatterns();
    const totals = Object.fromEntries(result.map(site => [site.slug, site.total]));

    expect(totals).toEqual({ 'rev-comps': 1500, 'lucky-day': 1000 });
  });

  it('accounts for every raffle across the day-of-week counts', async () => {
    const result = await getReleasePatterns();
    const counted = result.reduce(
      (sum, site) => sum + site.days.reduce((s, d) => s + d.count, 0),
      0
    );

    expect(counted).toBe(RAFFLES.length);
  });
});
