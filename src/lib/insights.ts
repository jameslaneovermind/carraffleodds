// src/lib/insights.ts
import { createBrowserClient } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SiteComparisonRow {
  name: string;
  slug: string;
  total_draws: number;
  avg_percent_sold: number;
  min_percent_sold: number;
  max_percent_sold: number;
}

export interface TimingDataPoint {
  days_before_end: number;
  avg_percent_sold: number;
  sample_count: number;
}

export interface ReleasePatternDayData {
  day_of_week: number;   // 0 = Sun, 1 = Mon, ..., 6 = Sat
  count: number;
}

export interface ReleasePatternSiteData {
  name: string;
  slug: string;
  total: number;
  days: ReleasePatternDayData[];  // always 7 entries, index = day_of_week
}

export interface MarketBreakdownSiteData {
  name: string;
  slug: string;
  total: number;
  counts: Record<string, number>;  // prize_type → count
}

export interface InsightsMetadata {
  last_snapshot_at: string | null;
  active_competition_count: number;
  site_count: number;
}

// ─── Aggregation helpers (pure, exported for tests) ───────────────────────────

export function groupSiteComparisonRows(
  rows: { name: string; slug: string; percent_sold: number }[]
): SiteComparisonRow[] {
  const map = new Map<string, { name: string; slug: string; values: number[] }>();
  for (const row of rows) {
    const existing = map.get(row.slug);
    if (existing) {
      existing.values.push(row.percent_sold);
    } else {
      map.set(row.slug, { name: row.name, slug: row.slug, values: [row.percent_sold] });
    }
  }
  return Array.from(map.values())
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

export function groupReleasePatternRows(
  rows: { name: string; slug: string; day_of_week: number; competition_count: number }[]
): ReleasePatternSiteData[] {
  const map = new Map<string, { name: string; slug: string; dayMap: Map<number, number> }>();
  for (const row of rows) {
    const existing = map.get(row.slug);
    if (existing) {
      existing.dayMap.set(row.day_of_week, row.competition_count);
    } else {
      const dayMap = new Map<number, number>();
      dayMap.set(row.day_of_week, row.competition_count);
      map.set(row.slug, { name: row.name, slug: row.slug, dayMap });
    }
  }
  return Array.from(map.values()).map(({ name, slug, dayMap }) => {
    const days: ReleasePatternDayData[] = Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      count: dayMap.get(i) ?? 0,
    }));
    const total = days.reduce((s, d) => s + d.count, 0);
    return { name, slug, total, days };
  });
}

export function groupMarketBreakdownRows(
  rows: { name: string; slug: string; prize_type: string; active_count: number }[]
): MarketBreakdownSiteData[] {
  const map = new Map<string, { name: string; slug: string; counts: Record<string, number> }>();
  for (const row of rows) {
    const existing = map.get(row.slug);
    if (existing) {
      existing.counts[row.prize_type] = (existing.counts[row.prize_type] ?? 0) + row.active_count;
    } else {
      map.set(row.slug, {
        name: row.name,
        slug: row.slug,
        counts: { [row.prize_type]: row.active_count },
      });
    }
  }
  return Array.from(map.values()).map(({ name, slug, counts }) => ({
    name,
    slug,
    counts,
    total: Object.values(counts).reduce((s, v) => s + v, 0),
  }));
}

// ─── Data fetching functions ──────────────────────────────────────────────────

export async function getSiteComparisonData(): Promise<SiteComparisonRow[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('raffles')
    .select('percent_sold, site:sites(name, slug, competition_model, active)')
    .eq('prize_type', 'car')
    .in('status', ['drawn', 'sold_out'])
    .not('percent_sold', 'is', null);
  if (error || !data) return [];
  const filtered = (data as { percent_sold: number; site: { name: string; slug: string; competition_model: string; active: boolean } | null }[])
    .filter(r => r.site?.active && r.site.competition_model !== 'spot_the_ball' && r.percent_sold != null);
  return groupSiteComparisonRows(
    filtered.map(r => ({
      name: r.site!.name,
      slug: r.site!.slug,
      percent_sold: parseFloat(r.percent_sold as unknown as string),
    }))
  );
}

export async function getTimingData(): Promise<TimingDataPoint[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.rpc('get_timing_analysis');
  if (error || !data) return [];
  return (data as TimingDataPoint[]).sort((a, b) => b.days_before_end - a.days_before_end);
}

export async function getReleasePatterns(): Promise<ReleasePatternSiteData[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('raffles')
    .select('created_at, site:sites(name, slug, active)')
    .not('created_at', 'is', null);
  if (error || !data) return [];
  const rows = (data as { created_at: string; site: { name: string; slug: string; active: boolean } | null }[])
    .filter(r => r.site?.active)
    .map(r => ({
      name: r.site!.name,
      slug: r.site!.slug,
      day_of_week: new Date(r.created_at).getUTCDay(),
      competition_count: 1,
    }));
  // Aggregate competition_count per site+day before passing to grouper
  const aggMap = new Map<string, { name: string; slug: string; day_of_week: number; competition_count: number }>();
  for (const row of rows) {
    const key = `${row.slug}-${row.day_of_week}`;
    const existing = aggMap.get(key);
    if (existing) {
      existing.competition_count++;
    } else {
      aggMap.set(key, { ...row });
    }
  }
  return groupReleasePatternRows(Array.from(aggMap.values()));
}

export async function getMarketBreakdown(): Promise<MarketBreakdownSiteData[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('raffles')
    .select('prize_type, site:sites(name, slug, active)')
    .in('status', ['active', 'ending_soon']);
  if (error || !data) return [];
  const rows = (data as { prize_type: string | null; site: { name: string; slug: string; active: boolean } | null }[])
    .filter(r => r.site?.active)
    .map(r => ({
      name: r.site!.name,
      slug: r.site!.slug,
      prize_type: r.prize_type ?? 'other',
      active_count: 1,
    }));
  // Aggregate
  const aggMap = new Map<string, { name: string; slug: string; prize_type: string; active_count: number }>();
  for (const row of rows) {
    const key = `${row.slug}-${row.prize_type}`;
    const existing = aggMap.get(key);
    if (existing) {
      existing.active_count++;
    } else {
      aggMap.set(key, { ...row });
    }
  }
  return groupMarketBreakdownRows(Array.from(aggMap.values()));
}

export async function getInsightsMetadata(): Promise<InsightsMetadata> {
  const supabase = createBrowserClient();
  const [snapshotRes, activeRes, sitesRes] = await Promise.all([
    supabase
      .from('raffle_snapshots')
      .select('snapshot_at')
      .order('snapshot_at', { ascending: false })
      .limit(1),
    supabase
      .from('raffles')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'ending_soon']),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('active', true),
  ]);
  return {
    last_snapshot_at: (snapshotRes.data?.[0]?.snapshot_at as string) ?? null,
    active_competition_count: activeRes.count ?? 0,
    site_count: sitesRes.count ?? 0,
  };
}
