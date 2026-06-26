// src/components/sites/RaffleWidget.tsx
import { createBrowserClient } from '@/lib/supabase';
import { RaffleCard } from '@/components/raffle-card';
import type { Raffle } from '@/lib/types';

interface RaffleWidgetProps {
  siteSlug: string;
}

async function getLiveRaffles(siteSlug: string): Promise<Raffle[]> {
  const supabase = createBrowserClient();

  const { data: siteRow } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', siteSlug)
    .single();

  if (!siteRow) return [];

  const { data: raffles } = await supabase
    .from('raffles')
    .select('*, site:sites(id, name, slug, url, logo_url, trust_score, trustpilot_rating, trustpilot_reviews, affiliate_url, competition_model, has_affiliate, active, created_at, updated_at)')
    .eq('site_id', siteRow.id)
    .in('status', ['active', 'ending_soon'])
    .order('end_date', { ascending: true })
    .limit(5);

  return (raffles ?? []) as Raffle[];
}

export async function RaffleWidget({ siteSlug }: RaffleWidgetProps) {
  const raffles = await getLiveRaffles(siteSlug);

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Live Competitions</h2>
      {raffles.length === 0 ? (
        <p className="text-slate-500 text-sm border border-slate-200 rounded-xl p-6 text-center">
          No live competitions right now — check back soon.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {raffles.map((raffle) => (
            <RaffleCard key={raffle.id} raffle={raffle} />
          ))}
        </div>
      )}
    </section>
  );
}
