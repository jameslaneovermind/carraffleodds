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
  const maxCount = Math.max(...data.flatMap((r) => Object.values(r.counts)), 0);

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
