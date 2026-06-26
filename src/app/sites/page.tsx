import type { Metadata } from 'next';
import { getAllReviews } from '@/lib/reviews';
import { SiteCard } from '@/components/sites/SiteCard';
import { BreadcrumbJsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'UK Car Raffle Sites — Operator Reviews & Comparisons',
  description:
    'Independent reviews of every major UK car raffle and competition site. We cover Trustpilot ratings, how draws work, ownership, and what to watch out for.',
  alternates: {
    canonical: '/sites',
  },
};

export default function SitesPage() {
  const reviews = getAllReviews(); // sorted by yearsEstablished ASC

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://www.carraffleodds.com' },
          { name: 'Sites', url: 'https://www.carraffleodds.com/sites' },
        ]}
      />

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          UK Car Raffle Sites
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          Independent reviews of every major UK car competition operator — how they work, what
          real entrants say, and what to consider before buying tickets.
        </p>
        <p className="text-sm text-slate-400 mt-2">
          Listed by year established. We earn commission from some of these sites — it doesn&apos;t affect what we say about them.{' '}
          <a href="/about-our-reviews" className="text-blue-500 hover:text-blue-600 underline">
            About our reviews
          </a>
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reviews.map((review) => (
          <SiteCard key={review.meta.slug} meta={review.meta} />
        ))}
      </div>
    </div>
  );
}
