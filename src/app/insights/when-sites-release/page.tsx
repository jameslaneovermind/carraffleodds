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
