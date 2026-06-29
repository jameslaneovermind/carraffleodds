// src/app/insights/site-comparison/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { InsightsWidget } from '@/components/insights/insights-widget';
import { getInsightsMetadata } from '@/lib/insights';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Which UK Car Competition Sites Draw Before Selling Out?',
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

      <div className="prose prose-slate max-w-none mb-8">
        <p>
          Most UK car competition sites guarantee a draw on a fixed date whether or not every ticket
          has sold. When a competition draws at 55% sold, the true odds for each ticket were roughly
          1.8x better than the advertised 1-in-[total-tickets] figure. That gap is what this table
          measures.
        </p>
        <p>
          Across 321 completed car competitions tracked since February 2026, the average draw happened
          with around 70% of tickets sold. Lucky Day Competitions leads on this metric — averaging
          54.5% sold at draw, giving entrants historically better true odds than advertised.
          Rev Comps and Dream Car Giveaways are clustered around 73–74%, each with a much larger
          sample to draw on.
        </p>
        <p>
          Sample sizes matter here. Sites with fewer than 15 data points have averages that could
          shift meaningfully with one or two outlier draws. The draw count is shown alongside each
          figure so you can weigh the confidence yourself. This data covers car competitions only —
          each site&apos;s non-car competitions are not included.
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
