import type { Metadata } from 'next';
import Link from 'next/link';
import { getTimingData, getInsightsMetadata } from '@/lib/insights';
import { SnapshotChart } from '@/components/insights/snapshot-chart';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Best Time to Enter UK Car Competitions — Timing Data',
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

      <div className="prose prose-slate max-w-none mb-8">
        <p>
          Competitions are quiet for most of their run, then see a concentrated surge of ticket sales
          in the final 24 hours. At one day before close, the average sell-through across all tracked
          competitions sits at 33.7%. By the time of the draw, that number rises to 62.3% — a
          28-percentage-point jump in the last day alone. The early weeks of a competition&apos;s
          run are, on average, slow.
        </p>
        <p>
          In practical terms: entering a week before a competition closes gives you near-identical
          odds to entering on the day it launched. The final day is when most sales happen, so getting
          in before that rush is the better play. The one caveat is sell-out risk — if a competition
          happens to fill completely before its draw date, entering early protects you from missing it.
          On current data, that&apos;s the exception rather than the rule. See the{' '}
          <a href="/insights/site-comparison">site comparison</a> for which sites are most likely to
          draw before selling out.
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
