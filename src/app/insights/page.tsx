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
      'How sell-through rate changes across a competition\'s lifetime. When the rush actually happens.',
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
