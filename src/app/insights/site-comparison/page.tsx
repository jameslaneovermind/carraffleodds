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
