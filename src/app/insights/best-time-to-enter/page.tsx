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
    'When do tickets actually sell? We tracked 133,000 snapshots across 8 UK competition sites. Here\'s what the sell-through curve looks like — and when the rush is real.',
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
