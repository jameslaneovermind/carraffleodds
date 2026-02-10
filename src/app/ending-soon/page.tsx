import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { EndingSoonContent } from '@/components/ending-soon-content';
import { RaffleSkeletonGrid } from '@/components/raffle-skeleton';
import type { Raffle, Site } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Ending Soon — UK Raffles Closing Today & This Week',
  description:
    'Don\'t miss out! Browse UK raffles and competitions ending soon. See live countdowns, ticket availability, and odds for raffles closing today, tomorrow, and this week.',
  alternates: {
    canonical: '/ending-soon',
  },
  openGraph: {
    title: 'Ending Soon — UK Raffles Closing Today & This Week',
    description:
      'Don\'t miss out! Browse UK raffles and competitions ending soon. See live countdowns and odds.',
  },
};

// Revalidate every 5 minutes
export const revalidate = 300;

async function fetchEndingSoonRaffles() {
  const supabase = createBrowserClient();

  // Fetch all active/ending_soon raffles with an end_date in the future
  const { data, error } = await supabase
    .from('raffles')
    .select('*, site:sites(id, name, slug, url, logo_url, competition_model)')
    .in('status', ['active', 'ending_soon'])
    .not('end_date', 'is', null)
    .gt('end_date', new Date().toISOString())
    .order('end_date', { ascending: true });

  if (error) {
    console.error('Error fetching ending-soon raffles:', error);
    return [];
  }

  return ((data ?? []) as (Raffle & { site: Pick<Site, 'id' | 'name' | 'slug' | 'url' | 'logo_url' | 'competition_model'> })[])
    .filter((r) => r.site?.competition_model !== 'spot_the_ball');
}

export default async function EndingSoonPage() {
  const raffles = await fetchEndingSoonRaffles();

  // Extract unique sites
  const sitesMap = new Map<string, { slug: string; name: string }>();
  for (const raffle of raffles) {
    if (raffle.site) {
      sitesMap.set(raffle.site.slug, { slug: raffle.site.slug, name: raffle.site.name });
    }
  }
  const sites = Array.from(sitesMap.values());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={<RaffleSkeletonGrid />}>
        <EndingSoonContent raffles={raffles} sites={sites} />
      </Suspense>
    </div>
  );
}
