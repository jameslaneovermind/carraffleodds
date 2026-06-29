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
    'UK competition sites offer far more than cars. Here\'s the full prize-type breakdown across 8 sites — cars, cash, watches, tech, houses, and more.',
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
