# Data Insights Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live `/insights/` section with 4 data pages and a hub, powered by 4.5 months of scraped snapshot history — the only UK competition site with this data.

**Architecture:** One Postgres RPC function handles the 133k-row timing aggregation server-side. A server component (`InsightsWidget`) renders tabular/bar visualisations for the other 3 data shapes. A client component (`SnapshotChart`) renders an SVG line chart. Five App Router pages compose these with draft editorial prose.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase JS v2, Vitest

## Global Constraints

- `export const revalidate = 3600` on every insights page (hourly ISR)
- All Supabase queries use `createBrowserClient()` from `@/lib/supabase` (existing pattern in codebase)
- No chart library — `SnapshotChart` is a plain SVG polyline
- `prize_value` is NULL across all historical raffles — never compute or display EV
- BOTB (`competition_model = 'spot_the_ball'`) has no fixed ticket cap — exclude from `site-comparison` widget
- Show all sites with ≥1 data point — no minimum thresholds — always display draw count for transparency
- Every page carries a `[DRAFT — HUMAN REVIEW REQUIRED]` banner on the prose section until a human edits and removes it
- Never auto-remove the draft banner in code; a human must edit the file to publish
- 18+ framing on all pages
- Money is integer pence in DB — do not display any monetary values in this section (prize_value is NULL anyway)
- `cn()` utility is at `@/lib/utils`; all styling uses Tailwind classes

---

## File Map

**Create:**
```
supabase/migrations/003_insights_functions.sql   # Postgres RPC function
src/lib/insights.ts                              # Data fetching + types + aggregation helpers
src/lib/__tests__/insights.test.ts               # Unit tests for aggregation helpers
src/components/insights/insights-widget.tsx      # Server component — tabular/bar viz
src/components/insights/snapshot-chart.tsx       # Client component — SVG line chart
src/app/insights/page.tsx                        # Hub page
src/app/insights/site-comparison/page.tsx
src/app/insights/best-time-to-enter/page.tsx
src/app/insights/when-sites-release/page.tsx
src/app/insights/market-overview/page.tsx
```

**Modify:**
```
src/components/layout/header.tsx                 # Add "Insights" to NAV_ITEMS
src/components/layout/footer.tsx                 # Add link in Learn section
src/app/sitemap.ts                               # Add 5 insights URLs
```

---

### Task 1: Postgres timing function

The timing analysis aggregates 133k `raffle_snapshots` rows server-side. This cannot be done efficiently in JavaScript — it requires a Postgres function called via `supabase.rpc()`.

**Files:**
- Create: `supabase/migrations/003_insights_functions.sql`

**Interfaces:**
- Produces: `supabase.rpc('get_timing_analysis')` returns `{ days_before_end: number, avg_percent_sold: number, sample_count: number }[]`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/003_insights_functions.sql
-- Aggregates raffle_snapshots into a sell-through curve (days before end → avg % sold).
-- Called via supabase.rpc('get_timing_analysis').
-- Requires: raffle_snapshots.percent_sold, raffles.end_date

CREATE OR REPLACE FUNCTION get_timing_analysis()
RETURNS TABLE(
  days_before_end int,
  avg_percent_sold numeric,
  sample_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    FLOOR(
      EXTRACT(EPOCH FROM (r.end_date::timestamptz - rs.snapshot_at)) / 86400
    )::int AS days_before_end,
    ROUND(AVG(rs.percent_sold)::numeric, 1) AS avg_percent_sold,
    COUNT(rs.id)::int AS sample_count
  FROM raffle_snapshots rs
  JOIN raffles r ON rs.raffle_id = r.id
  WHERE r.end_date IS NOT NULL
    AND rs.snapshot_at < r.end_date::timestamptz
    AND EXTRACT(EPOCH FROM (r.end_date::timestamptz - rs.snapshot_at)) / 86400
        BETWEEN 0 AND 60
  GROUP BY 1
  HAVING COUNT(rs.id) >= 50
  ORDER BY 1 DESC;
$$;
```

- [ ] **Step 2: Apply the SQL to the live Supabase database**

This is a manual step — there is no Supabase CLI in this project.

1. Open the Supabase Dashboard: https://supabase.com/dashboard
2. Select the project (`sugzcsdmiknsqomxheki`)
3. Go to **SQL Editor** → **New query**
4. Paste the full contents of `supabase/migrations/003_insights_functions.sql`
5. Click **Run**
6. Confirm: "Success. No rows returned."

- [ ] **Step 3: Verify the function exists and returns data**

```bash
node --input-type=module << 'EOF'
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf8');
const vars = Object.fromEntries(
  env.split('\n').filter(l => l.includes('=') && !l.startsWith('#') && l.trim())
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
    .filter(([k]) => k)
);
const supabase = createClient(vars['NEXT_PUBLIC_SUPABASE_URL'], vars['SUPABASE_SERVICE_ROLE_KEY'], {
  auth: { autoRefreshToken: false, persistSession: false }
});
const { data, error } = await supabase.rpc('get_timing_analysis');
console.log('Error:', error?.message ?? 'none');
console.log('Rows returned:', data?.length);
console.log('Sample row:', data?.[0]);
EOF
```

Expected output:
```
Error: none
Rows returned: 61
Sample row: { days_before_end: 60, avg_percent_sold: 18.3, sample_count: 412 }
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_insights_functions.sql
git commit -m "feat: add get_timing_analysis Postgres function for insights (CON-4)"
```

---

### Task 2: Data layer — `src/lib/insights.ts`

All data fetching for the insights section lives here. Four query shapes + a metadata helper. Site comparison, release patterns, and market breakdown aggregate in JavaScript after fetching (row counts are manageable: 321, ~4k, ~500). Timing uses the RPC function from Task 1.

**Files:**
- Create: `src/lib/insights.ts`
- Create: `src/lib/__tests__/insights.test.ts`

**Interfaces:**
- Produces (used by Tasks 3, 6, 7, 8, 9):
  - `getSiteComparisonData(): Promise<SiteComparisonRow[]>`
  - `getTimingData(): Promise<TimingDataPoint[]>`
  - `getReleasePatterns(): Promise<ReleasePatternSiteData[]>`
  - `getMarketBreakdown(): Promise<MarketBreakdownSiteData[]>`
  - `getInsightsMetadata(): Promise<InsightsMetadata>`

- [ ] **Step 1: Write failing tests for the aggregation helpers**

```typescript
// src/lib/__tests__/insights.test.ts
import { describe, it, expect } from 'vitest';
import {
  groupSiteComparisonRows,
  groupReleasePatternRows,
  groupMarketBreakdownRows,
} from '../insights';

describe('groupSiteComparisonRows', () => {
  it('aggregates draws by site and computes avg/min/max', () => {
    const rows = [
      { name: 'Rev Comps', slug: 'rev-comps', percent_sold: 80 },
      { name: 'Rev Comps', slug: 'rev-comps', percent_sold: 60 },
      { name: 'Lucky Day', slug: 'lucky-day', percent_sold: 50 },
    ];
    const result = groupSiteComparisonRows(rows);
    const rc = result.find(r => r.slug === 'rev-comps')!;
    expect(rc.total_draws).toBe(2);
    expect(rc.avg_percent_sold).toBe(70);
    expect(rc.min_percent_sold).toBe(60);
    expect(rc.max_percent_sold).toBe(80);
    expect(result.length).toBe(2);
  });

  it('sorts by avg_percent_sold ascending (best odds first)', () => {
    const rows = [
      { name: 'Rev Comps', slug: 'rev-comps', percent_sold: 80 },
      { name: 'Lucky Day', slug: 'lucky-day', percent_sold: 50 },
    ];
    const result = groupSiteComparisonRows(rows);
    expect(result[0].slug).toBe('lucky-day');
    expect(result[1].slug).toBe('rev-comps');
  });

  it('returns empty array for empty input', () => {
    expect(groupSiteComparisonRows([])).toEqual([]);
  });
});

describe('groupReleasePatternRows', () => {
  it('groups by site and fills all 7 days', () => {
    const rows = [
      { name: 'Rev Comps', slug: 'rev-comps', day_of_week: 1, competition_count: 10 },
      { name: 'Rev Comps', slug: 'rev-comps', day_of_week: 3, competition_count: 5 },
    ];
    const result = groupReleasePatternRows(rows);
    expect(result.length).toBe(1);
    expect(result[0].slug).toBe('rev-comps');
    expect(result[0].days.length).toBe(7);
    expect(result[0].days.find(d => d.day_of_week === 1)!.count).toBe(10);
    expect(result[0].days.find(d => d.day_of_week === 0)!.count).toBe(0);
  });
});

describe('groupMarketBreakdownRows', () => {
  it('groups by site with all prize types as columns', () => {
    const rows = [
      { name: 'Rev Comps', slug: 'rev-comps', prize_type: 'car', active_count: 3 },
      { name: 'Rev Comps', slug: 'rev-comps', prize_type: 'watch', active_count: 10 },
    ];
    const result = groupMarketBreakdownRows(rows);
    expect(result.length).toBe(1);
    expect(result[0].counts['car']).toBe(3);
    expect(result[0].counts['watch']).toBe(10);
    expect(result[0].total).toBe(13);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test src/lib/__tests__/insights.test.ts
```

Expected: FAIL — `Cannot find module '../insights'`

- [ ] **Step 3: Create `src/lib/insights.ts`**

```typescript
// src/lib/insights.ts
import { createBrowserClient } from '@/lib/supabase';

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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test src/lib/__tests__/insights.test.ts
```

Expected: PASS — 6 tests passing

- [ ] **Step 5: Confirm full test suite still passes**

```bash
npm test
```

Expected: 24 + 6 = 30 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/lib/insights.ts src/lib/__tests__/insights.test.ts
git commit -m "feat: add insights data layer with types and aggregation helpers (CON-4)"
```

---

### Task 3: InsightsWidget server component

A single server component that fetches and renders three different data shapes depending on `config.type`. No client JS — pure server-rendered HTML/Tailwind.

**Files:**
- Create: `src/components/insights/insights-widget.tsx`

**Interfaces:**
- Consumes: `getSiteComparisonData`, `getReleasePatterns`, `getMarketBreakdown` from `@/lib/insights`
- Produces: `<InsightsWidget config={...} />` used in Tasks 6, 8, 9

- [ ] **Step 1: Create the component**

```tsx
// src/components/insights/insights-widget.tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  getSiteComparisonData,
  getReleasePatterns,
  getMarketBreakdown,
  type SiteComparisonRow,
  type ReleasePatternSiteData,
  type MarketBreakdownSiteData,
} from '@/lib/insights';

export type InsightsWidgetConfig =
  | { type: 'site-comparison' }
  | { type: 'release-patterns' }
  | { type: 'market-breakdown' };

interface InsightsWidgetProps {
  config: InsightsWidgetConfig;
  className?: string;
}

export async function InsightsWidget({ config, className }: InsightsWidgetProps) {
  if (config.type === 'site-comparison') {
    const data = await getSiteComparisonData();
    return <SiteComparisonTable data={data} className={className} />;
  }
  if (config.type === 'release-patterns') {
    const data = await getReleasePatterns();
    return <ReleasePatternsTable data={data} className={className} />;
  }
  if (config.type === 'market-breakdown') {
    const data = await getMarketBreakdown();
    return <MarketBreakdownTable data={data} className={className} />;
  }
  return null;
}

// ─── Site Comparison Table ────────────────────────────────────────────────────

function SiteComparisonTable({ data, className }: { data: SiteComparisonRow[]; className?: string }) {
  if (!data.length) {
    return <p className="text-slate-500 text-sm py-4">No data available yet.</p>;
  }
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Site</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Draws</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Avg % sold</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Range</th>
            <th className="py-3 px-4 font-semibold text-slate-700 w-40 hidden sm:table-cell">Fill rate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const barColor =
              row.avg_percent_sold < 60
                ? 'bg-green-500'
                : row.avg_percent_sold < 80
                  ? 'bg-amber-500'
                  : 'bg-red-400';
            return (
              <tr key={row.slug} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="py-3 px-4">
                  <Link href={`/sites/${row.slug}`} className="font-medium text-blue-600 hover:underline">
                    {row.name}
                  </Link>
                </td>
                <td className="py-3 px-4 text-right text-slate-500">{row.total_draws}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-800">{row.avg_percent_sold}%</td>
                <td className="py-3 px-4 text-right text-slate-400 text-xs">
                  {row.min_percent_sold}–{row.max_percent_sold}%
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', barColor)}
                      style={{ width: `${row.avg_percent_sold}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 px-4 py-3 border-t border-slate-100">
        Lower % sold = better true odds than advertised. Based on completed car competitions only.
      </p>
    </div>
  );
}

// ─── Release Patterns Table ───────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ReleasePatternsTable({
  data,
  className,
}: {
  data: ReleasePatternSiteData[];
  className?: string;
}) {
  if (!data.length) {
    return <p className="text-slate-500 text-sm py-4">No data available yet.</p>;
  }
  return (
    <div className={cn('space-y-6', className)}>
      {data.map((site) => {
        const maxCount = Math.max(...site.days.map((d) => d.count), 1);
        return (
          <div key={site.slug} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-baseline justify-between mb-3">
              <Link href={`/sites/${site.slug}`} className="font-semibold text-slate-900 hover:text-blue-600">
                {site.name}
              </Link>
              <span className="text-xs text-slate-400">{site.total.toLocaleString()} total competitions</span>
            </div>
            <div className="flex gap-1 items-end h-16">
              {site.days.map((day) => {
                const heightPct = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                return (
                  <div key={day.day_of_week} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-slate-100 rounded-sm relative" style={{ height: '48px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-blue-500 rounded-sm"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{DAY_LABELS[day.day_of_week]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Market Breakdown Table ───────────────────────────────────────────────────

const PRIZE_TYPE_ORDER = ['car', 'cash', 'tech', 'watch', 'house', 'holiday', 'motorcycle', 'other'];

function MarketBreakdownTable({
  data,
  className,
}: {
  data: MarketBreakdownSiteData[];
  className?: string;
}) {
  if (!data.length) {
    return <p className="text-slate-500 text-sm py-4">No data available yet.</p>;
  }
  // Determine which prize types are actually present
  const presentTypes = PRIZE_TYPE_ORDER.filter((pt) => data.some((r) => (r.counts[pt] ?? 0) > 0));
  const maxCount = Math.max(...data.flatMap((r) => Object.values(r.counts)));

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Site</th>
            {presentTypes.map((pt) => (
              <th key={pt} className="text-right py-3 px-3 font-semibold text-slate-700 capitalize">
                {pt}
              </th>
            ))}
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.slug} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="py-3 px-4">
                <Link href={`/sites/${row.slug}`} className="font-medium text-blue-600 hover:underline">
                  {row.name}
                </Link>
              </td>
              {presentTypes.map((pt) => {
                const count = row.counts[pt] ?? 0;
                const opacity = maxCount > 0 ? Math.max(0.08, count / maxCount) : 0;
                return (
                  <td
                    key={pt}
                    className="py-3 px-3 text-right font-medium text-slate-800"
                    style={{ backgroundColor: count > 0 ? `rgba(59,130,246,${opacity})` : undefined }}
                  >
                    {count > 0 ? count : <span className="text-slate-300">—</span>}
                  </td>
                );
              })}
              <td className="py-3 px-4 text-right font-semibold text-slate-700">{row.total}</td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-slate-50 border-t border-slate-200">
            <td className="py-3 px-4 font-semibold text-slate-700">Total</td>
            {presentTypes.map((pt) => (
              <td key={pt} className="py-3 px-3 text-right font-semibold text-slate-700">
                {data.reduce((s, r) => s + (r.counts[pt] ?? 0), 0)}
              </td>
            ))}
            <td className="py-3 px-4 text-right font-semibold text-slate-700">
              {data.reduce((s, r) => s + r.total, 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/insights/insights-widget.tsx
git commit -m "feat: add InsightsWidget server component with 3 viz types (CON-4)"
```

---

### Task 4: SnapshotChart client component

SVG line chart. Receives pre-fetched data as a prop — no Supabase calls inside this component.

**Files:**
- Create: `src/components/insights/snapshot-chart.tsx`

**Interfaces:**
- Consumes: `TimingDataPoint[]` from `@/lib/insights` (passed as prop from page)
- Produces: `<SnapshotChart data={...} />` used in Task 7

- [ ] **Step 1: Create the component**

```tsx
// src/components/insights/snapshot-chart.tsx
'use client';

import type { TimingDataPoint } from '@/lib/insights';

interface SnapshotChartProps {
  data: TimingDataPoint[];
}

const PAD = { top: 24, right: 24, bottom: 48, left: 52 };
const W = 700;
const H = 320;
const CW = W - PAD.left - PAD.right;  // 624
const CH = H - PAD.top - PAD.bottom;  // 248

export function SnapshotChart({ data }: SnapshotChartProps) {
  if (!data.length) {
    return (
      <p className="text-slate-500 text-sm py-6 text-center border border-slate-200 rounded-xl">
        No timing data available yet.
      </p>
    );
  }

  // Sort descending (60 → 0 days before end)
  const sorted = [...data].sort((a, b) => b.days_before_end - a.days_before_end);
  const maxDays = sorted[0].days_before_end;

  // Scales
  const xScale = (days: number) =>
    maxDays > 0 ? ((maxDays - days) / maxDays) * CW : 0;
  const yScale = (pct: number) => CH - (pct / 100) * CH;

  // Polyline points
  const points = sorted
    .map((d) => `${xScale(d.days_before_end).toFixed(1)},${yScale(d.avg_percent_sold).toFixed(1)}`)
    .join(' ');

  // Axis ticks
  const yTicks = [0, 25, 50, 75, 100];
  const xTickValues = [60, 45, 30, 14, 7, 0].filter((d) => d <= maxDays);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-2xl"
        role="img"
        aria-label="Average sell-through rate by days before draw close"
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Y grid lines + labels */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={0} y1={yScale(tick)} x2={CW} y2={yScale(tick)}
                stroke="#e2e8f0" strokeWidth={1}
              />
              <text
                x={-8} y={yScale(tick)}
                textAnchor="end" dominantBaseline="middle"
                fill="#94a3b8" fontSize={11}
              >
                {tick}%
              </text>
            </g>
          ))}

          {/* X axis ticks */}
          {xTickValues.map((days) => (
            <g key={days}>
              <line
                x1={xScale(days)} y1={CH} x2={xScale(days)} y2={CH + 5}
                stroke="#cbd5e1" strokeWidth={1}
              />
              <text
                x={xScale(days)} y={CH + 18}
                textAnchor="middle"
                fill="#94a3b8" fontSize={11}
              >
                {days}d
              </text>
            </g>
          ))}

          {/* Axis border lines */}
          <line x1={0} y1={0} x2={0} y2={CH} stroke="#e2e8f0" strokeWidth={1} />
          <line x1={0} y1={CH} x2={CW} y2={CH} stroke="#e2e8f0" strokeWidth={1} />

          {/* Data line */}
          <polyline
            points={points}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Axis labels */}
          <text
            x={CW / 2} y={CH + 40}
            textAnchor="middle"
            fill="#64748b" fontSize={12}
          >
            Days before draw closes
          </text>
          <text
            x={-(CH / 2)} y={-40}
            textAnchor="middle"
            fill="#64748b" fontSize={12}
            transform="rotate(-90)"
          >
            Avg % tickets sold
          </text>
        </g>
      </svg>
      <p className="text-xs text-slate-400 mt-2">
        Based on {data.reduce((s, d) => s + d.sample_count, 0).toLocaleString()} snapshot readings
        across all sites. Buckets with fewer than 50 readings excluded.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Lint check**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/insights/snapshot-chart.tsx
git commit -m "feat: add SnapshotChart SVG client component (CON-4)"
```

---

### Task 5: Hub page + nav + footer + sitemap

The hub at `/insights` links to all four data pages and shows live metadata (sites tracked, active competitions, last update). Add "Insights" to site navigation.

**Files:**
- Create: `src/app/insights/page.tsx`
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/footer.tsx`
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Consumes: `getInsightsMetadata()` from `@/lib/insights`

- [ ] **Step 1: Create the hub page**

```tsx
// src/app/insights/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getInsightsMetadata } from '@/lib/insights';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'UK Car Competition Data & Insights — CarRaffleOdds',
  description:
    'Data from 4.5 months of tracking UK car competition sites: which sites draw with tickets unsold, when to enter for better odds, and how the market works.',
  alternates: { canonical: '/insights' },
};

const INSIGHT_PAGES = [
  {
    href: '/insights/site-comparison',
    title: 'Site Comparison: % Sold at Draw',
    description:
      'Which sites consistently draw before selling out — and what that means for your real odds.',
  },
  {
    href: '/insights/best-time-to-enter',
    title: 'Best Time to Enter',
    description:
      'How sell-through rate changes across a competition's lifetime. When the rush actually happens.',
  },
  {
    href: '/insights/when-sites-release',
    title: 'When Sites Release New Competitions',
    description:
      'Each site has a publishing rhythm. Knowing it means you can be first in when sell-through is lowest.',
  },
  {
    href: '/insights/market-overview',
    title: 'Market Overview: What These Sites Actually Offer',
    description:
      'These sites run far more than car competitions. The full prize-type breakdown across all 8 sites.',
  },
];

export default async function InsightsHubPage() {
  const meta = await getInsightsMetadata();
  const lastUpdated = meta.last_snapshot_at
    ? new Date(meta.last_snapshot_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Data & Insights', url: `${SITE_URL}/insights` },
        ]}
      />

      {/* DRAFT BANNER — remove this block when prose has been reviewed */}
      <div className="mb-8 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <strong>[DRAFT — HUMAN REVIEW REQUIRED]</strong> Editorial prose below has not been reviewed.
        Remove this banner after editing and approving the content.
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          UK Car Competition Data & Insights
        </h1>
        <p className="text-lg text-slate-600 mb-6">
          We&apos;ve been tracking {meta.site_count} UK competition sites since February 2026 — scraping
          odds, ticket sales, and draw outcomes every hour. This section turns that data into analysis
          you can&apos;t find anywhere else.
        </p>

        {/* Live stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{meta.site_count}</p>
            <p className="text-sm text-slate-500 mt-1">Sites tracked</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">
              {meta.active_competition_count.toLocaleString()}
            </p>
            <p className="text-sm text-slate-500 mt-1">Live competitions</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {lastUpdated ?? 'Updating…'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Last updated</p>
          </div>
        </div>

        {/* DRAFT PROSE — replace with real editorial content */}
        <div className="prose prose-slate max-w-none mb-8">
          <p>
            [DRAFT] This is where the editorial introduction goes. Explain what the data is, how it
            was collected (scrapers running hourly since February 2026, 8 UK competition sites), and
            what the key finding is — that most competitions draw before every ticket is sold, which
            means the true odds for buyers are often better than advertised.
          </p>
          <p>
            [DRAFT] Second paragraph: explain the methodology briefly and honestly. We scrape
            publicly visible data — ticket counts, sell-through percentages, draw dates. We don&apos;t
            have access to operator systems. Our data reflects what&apos;s publicly shown at scrape
            time, not internal records.
          </p>
          <p className="text-sm text-slate-500">
            18+ only. This data is informational. Past draw patterns do not guarantee future
            outcomes. See our{' '}
            <Link href="/responsible-gambling" className="text-blue-600 hover:underline">
              responsible gambling guidance
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Page links */}
      <ul className="space-y-4">
        {INSIGHT_PAGES.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className="flex items-start justify-between gap-4 p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
            >
              <div>
                <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {page.title}
                </p>
                <p className="text-sm text-slate-500 mt-1">{page.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-0.5 group-hover:text-blue-500 transition-colors" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Add "Insights" to header nav**

In `src/components/layout/header.tsx`, update `NAV_ITEMS`:

```tsx
const NAV_ITEMS = [
  { href: '/raffles', label: 'All Raffles' },
  { href: '/ending-soon', label: 'Ending Soon' },
  { href: '/raffles/cars', label: 'Cars' },
  { href: '/raffles/cash', label: 'Cash' },
  { href: '/raffles/tech', label: 'Tech' },
  { href: '/competitions', label: 'Skill Comps' },
  { href: '/sites', label: 'Sites' },
  { href: '/guides', label: 'Guides' },
  { href: '/insights', label: 'Insights' },
];
```

- [ ] **Step 3: Add "Insights" link to footer Learn section**

In `src/components/layout/footer.tsx`, add after the Guides link in the Learn column:

```tsx
<li><Link href="/insights" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Data & Insights</Link></li>
```

- [ ] **Step 4: Add insights pages to sitemap**

In `src/app/sitemap.ts`, add to the staticPages array:

```typescript
{
  url: `${SITE_URL}/insights`,
  lastModified: now,
  changeFrequency: 'daily' as const,
  priority: 0.8,
},
{
  url: `${SITE_URL}/insights/site-comparison`,
  lastModified: now,
  changeFrequency: 'daily' as const,
  priority: 0.7,
},
{
  url: `${SITE_URL}/insights/best-time-to-enter`,
  lastModified: now,
  changeFrequency: 'daily' as const,
  priority: 0.7,
},
{
  url: `${SITE_URL}/insights/when-sites-release`,
  lastModified: now,
  changeFrequency: 'daily' as const,
  priority: 0.7,
},
{
  url: `${SITE_URL}/insights/market-overview`,
  lastModified: now,
  changeFrequency: 'daily' as const,
  priority: 0.7,
},
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: builds successfully. The `/insights` route should appear in the output.

- [ ] **Step 6: Commit**

```bash
git add src/app/insights/page.tsx src/components/layout/header.tsx src/components/layout/footer.tsx src/app/sitemap.ts
git commit -m "feat: add insights hub page, nav, footer link, sitemap entries (CON-4)"
```

---

### Task 6: Site comparison page

**Files:**
- Create: `src/app/insights/site-comparison/page.tsx`

**Interfaces:**
- Consumes: `InsightsWidget` from `@/components/insights/insights-widget`
- Consumes: `getInsightsMetadata` from `@/lib/insights`

- [ ] **Step 1: Create the page**

```tsx
// src/app/insights/site-comparison/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { InsightsWidget } from '@/components/insights/insights-widget';
import { getInsightsMetadata } from '@/lib/insights';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Which UK Car Competition Sites Draw Before Selling Out? — CarRaffleOdds',
  description:
    'Data from 321 completed car competitions: which sites draw with tickets still available, and what that means for your real odds vs the advertised figure.',
  alternates: { canonical: '/insights/site-comparison' },
};

export default async function SiteComparisonPage() {
  const meta = await getInsightsMetadata();
  const lastUpdated = meta.last_snapshot_at
    ? new Date(meta.last_snapshot_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Data & Insights', url: `${SITE_URL}/insights` },
          { name: 'Site Comparison', url: `${SITE_URL}/insights/site-comparison` },
        ]}
      />

      {/* DRAFT BANNER — remove when prose reviewed */}
      <div className="mb-8 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <strong>[DRAFT — HUMAN REVIEW REQUIRED]</strong> Editorial prose has not been reviewed.
        Remove this banner after editing and approving the content.
      </div>

      <div className="mb-3">
        <Link href="/insights" className="text-sm text-blue-600 hover:underline">
          ← Data & Insights
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
        Which Sites Draw Before Selling Out?
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Based on 321 completed car competitions · Updated {lastUpdated ?? 'hourly'}
      </p>

      {/* DRAFT PROSE — replace with real editorial content */}
      <div className="prose prose-slate max-w-none mb-8">
        <p>
          [DRAFT] Most UK car competition sites guarantee a draw on a set date — whether or not every
          ticket has sold. That means many competitions close with unsold tickets remaining. When a
          competition draws at 60% sold, the true odds for buyers were nearly twice as good as the
          advertised &ldquo;1 in X&rdquo; figure.
        </p>
        <p>
          [DRAFT] The table below ranks each site by average % of tickets sold at draw time, based on
          all completed car competitions we&apos;ve tracked since February 2026. Lower is better for
          buyers — it means the site regularly draws before selling out, giving entrants better true
          odds than advertised.
        </p>
        <p>
          [DRAFT] Note: this data covers car competitions only. Sites that run non-car competitions
          (watches, cash, tech) are ranked here purely on their car competition sell-through rate.
          BOTB uses a skill-based model with no fixed ticket cap and is shown separately.
        </p>
      </div>

      <InsightsWidget config={{ type: 'site-comparison' }} className="mb-10" />

      {/* Methodology */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-700 mb-2">Methodology</p>
        <p>
          Data from completed car competitions (status: drawn or sold out) scraped since February 2026
          across {meta.site_count} UK competition sites. % sold at draw is the <code>percent_sold</code>{' '}
          value recorded at time of status change. Sample sizes vary — draw count is shown alongside each
          figure so you can judge confidence. Sites with zero completed car competitions are excluded.
          Data updated hourly.
        </p>
      </div>

      <p className="text-xs text-slate-400 mt-6">
        18+ only. Past draw patterns do not guarantee future outcomes.{' '}
        <Link href="/responsible-gambling" className="hover:underline">
          Responsible gambling guidance
        </Link>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: builds successfully.

- [ ] **Step 3: Commit**

```bash
git add src/app/insights/site-comparison/page.tsx
git commit -m "feat: add site-comparison insights page (CON-4)"
```

---

### Task 7: Best time to enter page

**Files:**
- Create: `src/app/insights/best-time-to-enter/page.tsx`

**Interfaces:**
- Consumes: `getTimingData()` from `@/lib/insights` (server fetches, passes to `SnapshotChart`)
- Consumes: `SnapshotChart` from `@/components/insights/snapshot-chart`

- [ ] **Step 1: Create the page**

```tsx
// src/app/insights/best-time-to-enter/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTimingData, getInsightsMetadata } from '@/lib/insights';
import { SnapshotChart } from '@/components/insights/snapshot-chart';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Best Time to Enter UK Car Competitions — Data — CarRaffleOdds',
  description:
    'When do tickets actually sell? We tracked 133,000 snapshots across 8 UK competition sites. Here's what the sell-through curve looks like — and when the rush is real.',
  alternates: { canonical: '/insights/best-time-to-enter' },
};

export default async function BestTimeToEnterPage() {
  const [timingData, meta] = await Promise.all([getTimingData(), getInsightsMetadata()]);
  const lastUpdated = meta.last_snapshot_at
    ? new Date(meta.last_snapshot_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Data & Insights', url: `${SITE_URL}/insights` },
          { name: 'Best Time to Enter', url: `${SITE_URL}/insights/best-time-to-enter` },
        ]}
      />

      {/* DRAFT BANNER — remove when prose reviewed */}
      <div className="mb-8 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <strong>[DRAFT — HUMAN REVIEW REQUIRED]</strong> Editorial prose has not been reviewed.
        Remove this banner after editing and approving the content.
      </div>

      <div className="mb-3">
        <Link href="/insights" className="text-sm text-blue-600 hover:underline">
          ← Data & Insights
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
        When Do Tickets Actually Sell?
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Based on 133,000+ snapshot readings · Updated {lastUpdated ?? 'hourly'}
      </p>

      {/* DRAFT PROSE */}
      <div className="prose prose-slate max-w-none mb-8">
        <p>
          [DRAFT] We took an hourly snapshot of every tracked competition — recording how many tickets
          had sold at each point in time. After 4.5 months and 133,000 readings, a clear pattern
          emerged. Write the actual finding here once you&apos;ve looked at the chart output and can
          describe the real curve (e.g. flat for first 3/4 of the run, then sharp uptick in final 7
          days).
        </p>
        <p>
          [DRAFT] Second paragraph: what this means practically for entering competitions. If the
          surge happens in the final 7 days, entering at day 14 gives you similar odds to day 30 but
          more certainty the draw will happen. If sell-through is flat throughout, the timing
          argument is weaker and the undersold-at-draw insight (see site comparison) is more
          relevant.
        </p>
      </div>

      <SnapshotChart data={timingData} />

      {/* Methodology */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600 mt-10">
        <p className="font-semibold text-slate-700 mb-2">Methodology</p>
        <p>
          Data from {timingData.reduce((s, d) => s + d.sample_count, 0).toLocaleString()} snapshot
          readings across all active and completed competitions tracked since February 2026. Each point
          on the chart shows the average % of tickets sold at that number of days before the draw closes.
          Only buckets with 50 or more readings are shown to avoid noisy results from rare draw lengths.
          Data covers all prize types across {meta.site_count} sites.
        </p>
      </div>

      <p className="text-xs text-slate-400 mt-6">
        18+ only. Past patterns do not guarantee future outcomes.{' '}
        <Link href="/responsible-gambling" className="hover:underline">
          Responsible gambling guidance
        </Link>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: builds successfully.

- [ ] **Step 3: Commit**

```bash
git add src/app/insights/best-time-to-enter/page.tsx
git commit -m "feat: add best-time-to-enter insights page with SnapshotChart (CON-4)"
```

---

### Task 8: When sites release page

**Files:**
- Create: `src/app/insights/when-sites-release/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/insights/when-sites-release/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { InsightsWidget } from '@/components/insights/insights-widget';
import { getInsightsMetadata } from '@/lib/insights';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'When Do UK Competition Sites Release New Raffles? — CarRaffleOdds',
  description:
    'Each UK competition site has a publishing rhythm. Our data shows which days new competitions typically go live — so you can be first in when sell-through is lowest.',
  alternates: { canonical: '/insights/when-sites-release' },
};

export default async function WhenSitesReleasePage() {
  const meta = await getInsightsMetadata();
  const lastUpdated = meta.last_snapshot_at
    ? new Date(meta.last_snapshot_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Data & Insights', url: `${SITE_URL}/insights` },
          { name: 'When Sites Release', url: `${SITE_URL}/insights/when-sites-release` },
        ]}
      />

      {/* DRAFT BANNER — remove when prose reviewed */}
      <div className="mb-8 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <strong>[DRAFT — HUMAN REVIEW REQUIRED]</strong> Editorial prose has not been reviewed.
        Remove this banner after editing and approving the content.
      </div>

      <div className="mb-3">
        <Link href="/insights" className="text-sm text-blue-600 hover:underline">
          ← Data & Insights
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
        When Do Sites Release New Competitions?
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Based on all competitions tracked since February 2026 · Updated {lastUpdated ?? 'hourly'}
      </p>

      {/* DRAFT PROSE */}
      <div className="prose prose-slate max-w-none mb-8">
        <p>
          [DRAFT] If you enter a competition on the day it opens — when sell-through is at its
          lowest — your true odds are at their best. Each site has a publishing rhythm. Some batch-
          release competitions on specific days of the week; others drip-feed throughout the week.
          Knowing the pattern means you can set reminders or check the site at the right time.
        </p>
        <p>
          [DRAFT] The charts below show the day-of-week distribution of new competition launches for
          each site, based on when competitions first appeared in our scraper data since February 2026.
          Note the actual finding once you&apos;ve seen the data (e.g. &ldquo;Rev Comps launches most
          competitions on Mondays and Tuesdays&rdquo; etc).
        </p>
      </div>

      <InsightsWidget config={{ type: 'release-patterns' }} className="mb-10" />

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-700 mb-2">Methodology</p>
        <p>
          Day of week is derived from the UTC <code>created_at</code> timestamp of each competition
          in our database — i.e. when it was first detected by our scraper. This approximates
          the actual launch date but may lag by up to a few hours depending on scraper timing.
          Covers all prize types across {meta.site_count} sites since February 2026.
        </p>
      </div>

      <p className="text-xs text-slate-400 mt-6">
        18+ only.{' '}
        <Link href="/responsible-gambling" className="hover:underline">
          Responsible gambling guidance
        </Link>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Build check + commit**

```bash
npm run build
git add src/app/insights/when-sites-release/page.tsx
git commit -m "feat: add when-sites-release insights page (CON-4)"
```

---

### Task 9: Market overview page

**Files:**
- Create: `src/app/insights/market-overview/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/insights/market-overview/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { InsightsWidget } from '@/components/insights/insights-widget';
import { getInsightsMetadata } from '@/lib/insights';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'UK Competition Site Market Overview: Prize Types & Volume — CarRaffleOdds',
  description:
    'UK competition sites offer far more than cars. Here's the full prize-type breakdown across 8 sites — cars, cash, watches, tech, houses, and more.',
  alternates: { canonical: '/insights/market-overview' },
};

export default async function MarketOverviewPage() {
  const meta = await getInsightsMetadata();
  const lastUpdated = meta.last_snapshot_at
    ? new Date(meta.last_snapshot_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Data & Insights', url: `${SITE_URL}/insights` },
          { name: 'Market Overview', url: `${SITE_URL}/insights/market-overview` },
        ]}
      />

      {/* DRAFT BANNER — remove when prose reviewed */}
      <div className="mb-8 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <strong>[DRAFT — HUMAN REVIEW REQUIRED]</strong> Editorial prose has not been reviewed.
        Remove this banner after editing and approving the content.
      </div>

      <div className="mb-3">
        <Link href="/insights" className="text-sm text-blue-600 hover:underline">
          ← Data & Insights
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
        What UK Competition Sites Actually Offer
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        {meta.active_competition_count.toLocaleString()} active competitions across {meta.site_count} sites ·
        Updated {lastUpdated ?? 'hourly'}
      </p>

      {/* DRAFT PROSE */}
      <div className="prose prose-slate max-w-none mb-8">
        <p>
          [DRAFT] Most people discover these sites looking for car competitions — but the majority
          of what&apos;s on offer isn&apos;t cars. Watches, cash prizes, tech, houses, and holidays
          make up the bulk of active competitions on many sites. The table below shows exactly what&apos;s
          live right now, broken down by prize type per site.
        </p>
        <p>
          [DRAFT] Note the actual finding from the data. For example: Rev Comps runs the highest
          volume of non-car competitions; BOTB is primarily house and skill competitions; Lucky Day
          has a high proportion of cash prizes. Write the specific observations that make this
          page genuinely informative rather than just a table.
        </p>
      </div>

      <InsightsWidget config={{ type: 'market-breakdown' }} className="mb-10" />

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-700 mb-2">Methodology</p>
        <p>
          Counts reflect competitions with status &lsquo;active&rsquo; or &lsquo;ending soon&rsquo;
          at time of last scrape. Prize type is classified by our scraper based on competition titles
          and site metadata. &lsquo;Other&rsquo; covers prizes that don&apos;t fit a specific
          category. Data updated hourly.
        </p>
      </div>

      <p className="text-xs text-slate-400 mt-6">
        18+ only.{' '}
        <Link href="/responsible-gambling" className="hover:underline">
          Responsible gambling guidance
        </Link>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Full build + test suite**

```bash
npm run build && npm test
```

Expected: build succeeds, 30 tests passing

- [ ] **Step 3: Final lint**

```bash
npm run lint
```

Expected: clean

- [ ] **Step 4: Commit**

```bash
git add src/app/insights/market-overview/page.tsx
git commit -m "feat: add market-overview insights page (CON-4)"
```
