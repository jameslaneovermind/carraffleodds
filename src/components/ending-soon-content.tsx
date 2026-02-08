'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Flame, Clock, CalendarClock, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RaffleGrid } from './raffle-grid';
import type { Raffle } from '@/lib/types';

// ============================================
// Time bucket helpers
// ============================================

interface TimeBucket {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  accentClass: string;
  headerClass: string;
  badgeClass: string;
  raffles: Raffle[];
}

function bucketRaffles(raffles: Raffle[]): TimeBucket[] {
  const now = Date.now();
  const endOfToday: Raffle[] = [];
  const tomorrow: Raffle[] = [];
  const thisWeek: Raffle[] = [];
  const nextWeek: Raffle[] = [];

  for (const raffle of raffles) {
    if (!raffle.end_date) continue;
    const diff = new Date(raffle.end_date).getTime() - now;
    const hours = diff / (1000 * 60 * 60);

    if (hours <= 24) {
      endOfToday.push(raffle);
    } else if (hours <= 48) {
      tomorrow.push(raffle);
    } else if (hours <= 168) {
      thisWeek.push(raffle);
    } else {
      nextWeek.push(raffle);
    }
  }

  const buckets: TimeBucket[] = [];

  if (endOfToday.length > 0) {
    buckets.push({
      key: 'today',
      label: 'Ending Today',
      sublabel: `${endOfToday.length} competition${endOfToday.length !== 1 ? 's' : ''} closing in the next 24 hours`,
      icon: <Flame className="h-5 w-5" />,
      accentClass: 'text-rose-600',
      headerClass: 'bg-rose-50 border-rose-200',
      badgeClass: 'bg-rose-100 text-rose-700',
      raffles: endOfToday,
    });
  }

  if (tomorrow.length > 0) {
    buckets.push({
      key: 'tomorrow',
      label: 'Ending Tomorrow',
      sublabel: `${tomorrow.length} competition${tomorrow.length !== 1 ? 's' : ''} closing in 24–48 hours`,
      icon: <AlertTriangle className="h-5 w-5" />,
      accentClass: 'text-amber-600',
      headerClass: 'bg-amber-50 border-amber-200',
      badgeClass: 'bg-amber-100 text-amber-700',
      raffles: tomorrow,
    });
  }

  if (thisWeek.length > 0) {
    buckets.push({
      key: 'this-week',
      label: 'This Week',
      sublabel: `${thisWeek.length} competition${thisWeek.length !== 1 ? 's' : ''} closing within 7 days`,
      icon: <CalendarClock className="h-5 w-5" />,
      accentClass: 'text-blue-600',
      headerClass: 'bg-blue-50 border-blue-200',
      badgeClass: 'bg-blue-100 text-blue-700',
      raffles: thisWeek,
    });
  }

  if (nextWeek.length > 0) {
    buckets.push({
      key: 'later',
      label: 'Coming Up',
      sublabel: `${nextWeek.length} more competition${nextWeek.length !== 1 ? 's' : ''} ending soon`,
      icon: <Clock className="h-5 w-5" />,
      accentClass: 'text-slate-600',
      headerClass: 'bg-slate-50 border-slate-200',
      badgeClass: 'bg-slate-100 text-slate-600',
      raffles: nextWeek,
    });
  }

  return buckets;
}

// ============================================
// Component
// ============================================

interface EndingSoonContentProps {
  raffles: Raffle[];
  sites: { slug: string; name: string }[];
}

export function EndingSoonContent({ raffles, sites }: EndingSoonContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteParam = searchParams.get('site') ?? null;

  // Prize type quick filter (local state)
  const [prizeFilter, setPrizeFilter] = useState<string | null>(null);

  const handleSiteChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all') {
        params.delete('site');
      } else {
        params.set('site', value);
      }
      const qs = params.toString();
      router.replace(qs ? `/ending-soon?${qs}` : '/ending-soon', { scroll: false });
    },
    [router, searchParams]
  );

  // Filter raffles
  const filteredRaffles = useMemo(() => {
    let result = raffles;

    if (siteParam) {
      result = result.filter(r => r.site?.slug === siteParam);
    }

    if (prizeFilter) {
      result = result.filter(r => r.prize_type === prizeFilter);
    }

    return result;
  }, [raffles, siteParam, prizeFilter]);

  // Bucket them
  const buckets = useMemo(() => bucketRaffles(filteredRaffles), [filteredRaffles]);

  // Count unique prize types for filter
  const prizeTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of raffles) {
      if (r.prize_type) {
        counts.set(r.prize_type, (counts.get(r.prize_type) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, label: type.charAt(0).toUpperCase() + type.slice(1) }));
  }, [raffles]);

  const totalFiltered = filteredRaffles.length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="h-6 w-6 text-rose-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Ending Soon
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          {totalFiltered} competition{totalFiltered !== 1 ? 's' : ''} with live countdowns — don&apos;t miss out
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Site filter */}
        <Select value={siteParam ?? 'all'} onValueChange={handleSiteChange}>
          <SelectTrigger className="w-[180px] h-9 text-sm bg-white">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites.map(site => (
              <SelectItem key={site.slug} value={site.slug}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Prize type pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setPrizeFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              prizeFilter === null
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {prizeTypes.map(({ type, count, label }) => (
            <button
              key={type}
              onClick={() => setPrizeFilter(prizeFilter === type ? null : type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                prizeFilter === type
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Time-bucketed sections */}
      {buckets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No raffles ending soon
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            {siteParam || prizeFilter
              ? 'Try removing your filters to see more results.'
              : 'Check back later — new competitions are added regularly.'}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {buckets.map(bucket => (
            <section key={bucket.key}>
              {/* Section header */}
              <div className={`rounded-lg border px-4 py-3 mb-5 ${bucket.headerClass}`}>
                <div className="flex items-center gap-2">
                  <span className={bucket.accentClass}>{bucket.icon}</span>
                  <div>
                    <h2 className={`text-lg font-bold ${bucket.accentClass}`}>
                      {bucket.label}
                    </h2>
                    <p className="text-xs text-slate-500">{bucket.sublabel}</p>
                  </div>
                  <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${bucket.badgeClass}`}>
                    {bucket.raffles.length}
                  </span>
                </div>
              </div>

              {/* Grid */}
              <RaffleGrid raffles={bucket.raffles} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
