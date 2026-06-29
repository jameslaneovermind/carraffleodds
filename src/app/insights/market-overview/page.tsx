import type { Metadata } from 'next';
import Link from 'next/link';
import { InsightsWidget } from '@/components/insights/insights-widget';
import { getInsightsMetadata } from '@/lib/insights';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'UK Competition Site Market Overview: Prize Types & Volume',
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

      <div className="prose prose-slate max-w-none mb-8">
        <p>
          If you came to these sites for car competitions, you&apos;re in the minority. Of the active
          competitions tracked right now, cars account for roughly 5% of the total. These sites have
          expanded heavily into watches, tech prizes, cash, and houses — and a large catch-all
          &ldquo;other&rdquo; category that covers holidays, experiences, and lower-value prizes.
        </p>
        <p>
          Rev Comps runs more competitions than the other seven sites combined. BOTB stands out for
          house competitions — it&apos;s the only site running a meaningful number of them, and
          almost all of the house competitions in the market sit on BOTB. If you&apos;re here
          specifically for cars, the{' '}
          <a href="/raffles/cars">Cars filter</a> on the main listings page shows what&apos;s
          currently live — there are often fewer than 30 across all 8 sites at any one time.
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
