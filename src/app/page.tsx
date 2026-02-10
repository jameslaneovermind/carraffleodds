import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Clock, Shield, BarChart3, Eye, RefreshCw, Scale, CheckCircle2, Zap } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { RaffleGrid } from '@/components/raffle-grid';
import { WebSiteJsonLd } from '@/components/json-ld';
import { getValueScore } from '@/lib/utils';
import type { Raffle } from '@/lib/types';

export const metadata: Metadata = {
  title: 'CarRaffleOdds — Compare the Best UK Car Raffle Odds',
  description:
    'Compare live odds across UK car raffle and competition sites. Find the best deals, track ticket sales, and win your dream car for less. Updated every few hours.',
  alternates: { canonical: '/' },
};

export const revalidate = 300;

async function getHomeData() {
  const supabase = createBrowserClient();

  // Fetch all active raffles
  const { data: raffles } = await supabase
    .from('raffles')
    .select('*, site:sites(id, name, slug, url, logo_url)')
    .eq('status', 'active')
    .order('end_date', { ascending: true, nullsFirst: false });

  const allRaffles = (raffles ?? []) as Raffle[];

  // Stats
  const totalRaffles = allRaffles.length;
  const siteNames = new Set(allRaffles.map((r) => (r.site as { name: string } | null)?.name).filter(Boolean));
  const totalSites = siteNames.size;
  const lowestOdds = allRaffles
    .filter((r) => r.odds_ratio != null && r.odds_ratio > 0)
    .sort((a, b) => (a.odds_ratio ?? Infinity) - (b.odds_ratio ?? Infinity))[0];

  // Featured: lead with best-value car raffles, then fill with best overall
  const withValue = allRaffles
    .filter((r) => r.image_url && getValueScore(r) != null)
    .sort((a, b) => (getValueScore(b) ?? 0) - (getValueScore(a) ?? 0));
  const bestCars = withValue.filter((r) => r.prize_type === 'car').slice(0, 3);
  const bestCarIds = new Set(bestCars.map((r) => r.id));
  const bestOther = withValue.filter((r) => !bestCarIds.has(r.id)).slice(0, 6 - bestCars.length);
  const featured = [...bestCars, ...bestOther].slice(0, 6);

  // Ending soon: next 6 with end dates
  const now = new Date();
  const endingSoon = allRaffles
    .filter((r) => r.end_date && new Date(r.end_date) > now)
    .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())
    .slice(0, 6);

  // Trust stats — all derived from real data
  const totalPrizeValue = allRaffles.reduce((sum, r) => {
    const value = r.cash_alternative ?? r.prize_value ?? 0;
    return sum + value;
  }, 0);
  const totalPrizeValuePounds = Math.round(totalPrizeValue / 100);

  const totalTicketsMonitored = allRaffles.reduce(
    (sum, r) => sum + (r.total_tickets ?? 0),
    0
  );

  const lastUpdated = allRaffles
    .filter((r) => r.last_scraped_at)
    .sort(
      (a, b) =>
        new Date(b.last_scraped_at!).getTime() -
        new Date(a.last_scraped_at!).getTime()
    )[0]?.last_scraped_at;

  const carRaffleCount = allRaffles.filter((r) => r.prize_type === 'car').length;

  return {
    totalRaffles,
    totalSites,
    lowestOdds: lowestOdds?.odds_ratio ? Math.round(lowestOdds.odds_ratio) : null,
    featured,
    endingSoon,
    siteNames: Array.from(siteNames),
    totalPrizeValuePounds,
    totalTicketsMonitored,
    lastUpdated,
    carRaffleCount,
  };
}

export default async function HomePage() {
  const {
    totalRaffles,
    totalSites,
    lowestOdds,
    featured,
    endingSoon,
    siteNames,
    totalPrizeValuePounds,
    totalTicketsMonitored,
    lastUpdated,
    carRaffleCount,
  } = await getHomeData();

  return (
    <div>
      <WebSiteJsonLd />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300 backdrop-blur-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Tracking {totalRaffles} live competitions
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find the{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Best Odds
              </span>{' '}
              on UK Car Raffles
            </h1>

            <p className="mt-5 max-w-2xl text-lg text-slate-300 leading-relaxed">
              Compare live odds, ticket prices, and availability across {totalSites} UK competition
              sites. Updated every few hours so you always know where the best value is.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/raffles"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5"
              >
                Browse All Raffles
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/ending-soon"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:-translate-y-0.5"
              >
                <Clock className="h-4 w-4" />
                Ending Soon
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:max-w-2xl">
            <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
              <p className="text-3xl font-bold text-white tabular-nums">{totalRaffles}</p>
              <p className="mt-1 text-sm text-slate-400">Active Raffles</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
              <p className="text-3xl font-bold text-white tabular-nums">{totalSites}</p>
              <p className="mt-1 text-sm text-slate-400">Sites Tracked</p>
            </div>
            {lowestOdds && (
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
                <p className="text-3xl font-bold text-emerald-400 tabular-nums">
                  1 in {lowestOdds.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-slate-400">Best Odds Available</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Featured / Best Odds ===== */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Exclusive Metric</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Best Value Right Now
              </h2>
              <p className="mt-1 text-slate-500">
                Top rated competitions by our value algorithm
              </p>
            </div>
            <Link
              href="/raffles?sort=best-value"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <RaffleGrid raffles={featured} />

          <div className="mt-6 text-center sm:hidden">
            <Link
              href="/raffles?sort=best-value"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all best value
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ===== Ending Soon ===== */}
      {endingSoon.length > 0 && (
        <section className="bg-slate-50 border-y border-slate-200">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Don&apos;t Miss Out</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Ending Soon
                </h2>
                <p className="mt-1 text-slate-500">
                  Competitions closing in the next few days
                </p>
              </div>
              <Link
                href="/ending-soon"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <RaffleGrid raffles={endingSoon} />

            <div className="mt-6 text-center sm:hidden">
              <Link
                href="/ending-soon"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all ending soon
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== Data at a Glance — real numbers ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:gap-8">
            {/* Car Raffles */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{carRaffleCount}</p>
              <p className="mt-1 text-sm text-slate-400">Car Raffles Live</p>
            </div>
            {/* Prize Value */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">
                &pound;{totalPrizeValuePounds > 1_000_000
                  ? `${(totalPrizeValuePounds / 1_000_000).toFixed(1)}M`
                  : totalPrizeValuePounds.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-400">Prize Value Tracked</p>
            </div>
            {/* Tickets */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <Eye className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">
                {totalTicketsMonitored > 1_000_000
                  ? `${(totalTicketsMonitored / 1_000_000).toFixed(1)}M`
                  : totalTicketsMonitored.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-400">Tickets Monitored</p>
            </div>
            {/* Frequency */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
                <RefreshCw className="h-5 w-5 text-violet-400" />
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">3h</p>
              <p className="mt-1 text-sm text-slate-400">Update Frequency</p>
            </div>
          </div>
          {lastUpdated && (
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Data last refreshed{' '}
              {(() => {
                const mins = Math.round(
                  (Date.now() - new Date(lastUpdated).getTime()) / 60000
                );
                if (mins < 1) return 'just now';
                if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
                const hrs = Math.round(mins / 60);
                return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
              })()}
            </div>
          )}
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            How CarRaffleOdds Works
          </h2>
          <p className="mt-2 text-slate-500 max-w-2xl mx-auto">
            Three steps to smarter raffle decisions
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="group relative rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-200">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
                <BarChart3 className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-blue-600/40 uppercase tracking-wider">Step 1</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">We Scrape the Data</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Automated scrapers monitor {totalSites} UK raffle sites every few hours — pulling live ticket
              counts, prices, odds, and draw dates directly from source.
            </p>
          </div>

          {/* Step 2 */}
          <div className="group relative rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-emerald-600/40 uppercase tracking-wider">Step 2</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">We Calculate the Odds</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Ticket price, total tickets, and percentage sold are crunched into comparable odds ratios and
              value-per-pound metrics across every site.
            </p>
          </div>

          {/* Step 3 */}
          <div className="group relative rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:shadow-lg hover:shadow-amber-500/5 hover:border-amber-200">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                <Shield className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-amber-600/40 uppercase tracking-wider">Step 3</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">You Make Smarter Picks</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Filter by car type, sort by best odds or price, and see exactly what you&apos;re getting into —
              cash alternatives, draw dates, and all.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow hover:-translate-y-0.5"
          >
            Learn more about how odds work
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ===== Trust / Transparency ===== */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Why People Trust CarRaffleOdds
            </h2>
            <p className="mt-2 text-slate-500 max-w-2xl mx-auto">
              We&apos;re not a raffle site. We&apos;re the comparison tool that helps you decide where to play.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">100% Independent</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                We don&apos;t run raffles or sell tickets. Every competition is compared using the same methodology.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Eye className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Full Transparency</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                We show every raffle — even the ones with terrible odds. No cherry-picking, no hidden sponsorships.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Always Up to Date</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                Data is refreshed every few hours automatically. Ticket counts, odds, and prices reflect what&apos;s live on each site.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Free to Use</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                No sign-ups, no paywalls, no data harvesting. We may earn a small commission if you enter via our links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Sites We Track ===== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-slate-400 uppercase tracking-wider mb-6">
            Comparing odds across trusted UK competition sites
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {siteNames.map((name) => (
              <span
                key={name}
                className="text-lg font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            More sites being added regularly
          </p>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 px-8 py-12 text-center sm:px-12 sm:py-16">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to find your best odds?
          </h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto">
            Browse {totalRaffles} live competitions across {totalSites} sites. Filter, compare, and
            make smarter decisions.
          </p>
          <Link
            href="/raffles"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5"
          >
            Browse All Raffles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
