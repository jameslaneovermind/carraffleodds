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

      <div className="prose prose-slate max-w-none mb-8">
        <p>
          When a competition opens, sell-through is at zero — your true odds are as good as
          they&apos;ll ever be. Each site has a clear weekly pattern for when new competitions go
          live, and knowing it means you can check at the right time rather than stumbling across a
          competition that&apos;s already half-full.
        </p>
        <p>
          The patterns are distinct. Lucky Day Competitions clusters its releases heavily around
          Wednesday — roughly half of all competitions we&apos;ve tracked from that site launched
          mid-week. Dream Car Giveaways and 7 Days Performance both favour Saturday launches.
          Rev Comps releases throughout the week but peaks on Sundays and Mondays. Those are the
          days to check if you want to be in early.
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
