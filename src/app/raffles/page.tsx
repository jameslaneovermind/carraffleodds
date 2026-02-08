import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { RaffleFilters } from '@/components/raffle-filters';
import { RaffleSkeletonGrid } from '@/components/raffle-skeleton';
import { RaffleListJsonLd, BreadcrumbJsonLd } from '@/components/json-ld';
import type { Raffle, Site } from '@/lib/types';

export const metadata: Metadata = {
  title: 'All UK Raffle Odds — Compare Live Competitions',
  description:
    'Browse and compare live raffles across UK competition sites. Filter by category, sort by best odds, and find your best chance to win.',
  alternates: {
    canonical: '/raffles',
  },
};

// Revalidate every 5 minutes
export const revalidate = 300;

async function fetchRaffles() {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('raffles')
    .select('*, site:sites(id, name, slug, url, logo_url)')
    .eq('status', 'active')
    .order('end_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching raffles:', error);
    return [];
  }

  return (data ?? []) as (Raffle & { site: Pick<Site, 'id' | 'name' | 'slug' | 'url' | 'logo_url'> })[];
}

export default async function RafflesPage() {
  const raffles = await fetchRaffles();

  // Extract unique sites from the data
  const sitesMap = new Map<string, { slug: string; name: string }>();
  for (const raffle of raffles) {
    if (raffle.site) {
      sitesMap.set(raffle.site.slug, { slug: raffle.site.slug, name: raffle.site.name });
    }
  }
  const sites = Array.from(sitesMap.values());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://www.carraffleodds.com' },
          { name: 'All Raffles', url: 'https://www.carraffleodds.com/raffles' },
        ]}
      />
      <RaffleListJsonLd
        name="UK Raffle Competitions"
        description={`Compare ${raffles.length} live raffles across ${sites.length} UK competition sites`}
        items={raffles.slice(0, 10).map((r) => ({
          title: r.title,
          url: r.source_url,
        }))}
      />
      <Suspense fallback={<RaffleSkeletonGrid />}>
        <RaffleFilters
          raffles={raffles}
          initialCategory={null}
          sites={sites}
        />
      </Suspense>
    </div>
  );
}
