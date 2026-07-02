import type { Metadata } from 'next';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';
import { groupDrawsByDate } from '@/lib/draws';
import { DrawCard } from '@/components/draws/draw-card';
import type { DrawRaffle } from '@/components/draws/draw-card';
import { BreadcrumbJsonLd } from '@/components/json-ld';

export const revalidate = 3600;

const SITE_URL = 'https://www.carraffleodds.com';

export const metadata: Metadata = {
  title: 'Upcoming Car Competition Draw Dates',
  description:
    'See every UK car competition draw in the next 14 days — sorted by date so you can plan your entries before they close.',
  alternates: { canonical: '/draws' },
};

async function getUpcomingDraws(): Promise<DrawRaffle[]> {
  const supabase = createBrowserClient();
  const now = new Date().toISOString();
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('raffles')
    .select(
      'id, title, end_date, prize_value, ticket_price, percent_sold, total_tickets, tickets_sold, source_url, car_make, car_model, car_year, site:sites(id, name, slug, affiliate_url, competition_model)'
    )
    .eq('prize_type', 'car')
    .in('status', ['active', 'ending_soon'])
    .gt('end_date', now)
    .lte('end_date', twoWeeks)
    .order('end_date', { ascending: true });

  if (error) {
    console.error('draws: fetch failed', error);
    return [];
  }

  return ((data ?? []) as unknown as DrawRaffle[]).filter(
    (r) => r.site?.competition_model !== 'spot_the_ball'
  );
}

export default async function DrawsPage() {
  const draws = await getUpcomingDraws();
  const groups = groupDrawsByDate(draws);
  const todayGroup = groups.find((g) => g.label === 'Today');
  const otherGroups = groups.filter((g) => g.label !== 'Today');

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Upcoming Draws', url: `${SITE_URL}/draws` },
        ]}
      />

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
        Upcoming Car Draws
      </h1>
      <p className="text-slate-500 mb-10">
        {draws.length > 0
          ? `${draws.length} car draw${draws.length === 1 ? '' : 's'} in the next 14 days · Updated hourly`
          : 'Updated hourly'}
      </p>

      {draws.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg font-medium text-slate-700 mb-2">
            No car draws in the next 14 days
          </p>
          <p className="text-sm mb-6">
            New competitions are added hourly — check back soon.
          </p>
          <Link href="/raffles/cars" className="text-blue-600 hover:underline text-sm">
            Browse all active car competitions →
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {todayGroup && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
              <div className="flex items-center gap-2 mb-5">
                <h2 className="text-lg font-bold text-amber-900">Today</h2>
                <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                  Closing today — enter before midnight
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {todayGroup.draws.map((draw) => (
                  <DrawCard key={draw.id} raffle={draw as DrawRaffle} />
                ))}
              </div>
            </div>
          )}

          {otherGroups.map((group) => (
            <section key={group.isoDate}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-slate-900">{group.label}</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {group.draws.length} draw{group.draws.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.draws.map((draw) => (
                  <DrawCard key={draw.id} raffle={draw as DrawRaffle} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-10 border-t border-slate-100 pt-6">
        18+ only. Draw dates are as listed by each operator and may change.{' '}
        <Link href="/responsible-gambling" className="hover:underline">
          Responsible gambling guidance
        </Link>
        .
      </p>
    </div>
  );
}
