import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { RaffleFilters } from '@/components/raffle-filters';
import { RaffleSkeletonGrid } from '@/components/raffle-skeleton';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { ALL_CATEGORIES, getCategoryBySlug } from '@/lib/constants';
import type { Raffle, Site } from '@/lib/types';

interface CategoryPageProps {
  params: { category: string };
}

export function generateStaticParams() {
  return ALL_CATEGORIES.map(cat => ({
    category: cat.slug,
  }));
}

export function generateMetadata({ params }: CategoryPageProps): Metadata {
  const category = getCategoryBySlug(params.category);
  if (!category) {
    return { title: 'Raffles Not Found' };
  }

  return {
    title: category.seoTitle,
    description: category.seoDescription,
    alternates: {
      canonical: `/raffles/${category.slug}`,
    },
  };
}

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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = getCategoryBySlug(params.category);
  if (!category) {
    notFound();
  }

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
          { name: category.pageTitle, url: `https://www.carraffleodds.com/raffles/${category.slug}` },
        ]}
      />
      <Suspense fallback={<RaffleSkeletonGrid />}>
        <RaffleFilters
          raffles={raffles}
          initialCategory={params.category}
          sites={sites}
        />
      </Suspense>
    </div>
  );
}
