// src/app/sites/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Star, Shield, Building2 } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getReview, getAllSlugs } from '@/lib/reviews';
import { RaffleWidget } from '@/components/sites/RaffleWidget';
import { BreadcrumbJsonLd, ReviewJsonLd } from '@/components/json-ld';
import { AuthorByline } from '@/components/AuthorByline';

export const revalidate = 60;

const SITE_URL = 'https://www.carraffleodds.com';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const review = getReview(params.slug);
  if (!review) return {};
  return {
    title: `${review.meta.name} Review 2026 — Is It Legit?`,
    description: review.meta.metaDescription,
    alternates: { canonical: `/sites/${params.slug}` },
  };
}

export default function SiteReviewPage({ params }: PageProps) {
  const review = getReview(params.slug);
  if (!review) notFound();

  const { meta, content } = review;
  const chUrl = `https://find-and-update.company-information.service.gov.uk/company/${meta.companiesHouseNumber}`;
  const reviewUrl = `${SITE_URL}/sites/${meta.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Sites', url: `${SITE_URL}/sites` },
          { name: meta.name, url: reviewUrl },
        ]}
      />
      <ReviewJsonLd
        siteName={meta.name}
        siteUrl={meta.affiliateUrl}
        trustpilotScore={meta.trustpilotScore}
        reviewUrl={reviewUrl}
      />

      {/* Site header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <nav className="text-xs text-slate-400 mb-2">
            <Link href="/sites" className="hover:text-slate-600">Sites</Link>
            {' / '}
            <span className="text-slate-600">{meta.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{meta.name} Review</h1>
        </div>
        <a
          href={meta.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg px-4 py-2.5 hover:bg-blue-700 transition-colors mt-6"
        >
          Visit site
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Trust bar */}
      <div className="flex flex-wrap gap-4 items-center mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
        {/* Trustpilot */}
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-slate-800">{meta.trustpilotScore.toFixed(1)}</span>
          <span className="text-slate-500">Trustpilot ({meta.trustpilotCount} reviews)</span>
        </div>

        {/* Est. */}
        <div className="text-slate-500">
          Est. <span className="font-medium text-slate-700">{meta.yearsEstablished}</span>
        </div>

        {/* Voluntary Code badge */}
        {meta.voluntaryCode && (
          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Voluntary Code</span>
          </div>
        )}

        {/* Companies House */}
        <a
          href={chUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs"
        >
          <Building2 className="h-3.5 w-3.5" />
          CH {meta.companiesHouseNumber}
        </a>
      </div>

      {/* Prose */}
      <article className="prose-custom space-y-4">
        <AuthorByline />
        <MDXRemote source={content} />
      </article>

      {/* Raffle widget */}
      <RaffleWidget siteSlug={meta.slug} />

      {/* Footer note */}
      <p className="mt-10 text-xs text-slate-400 border-t border-slate-100 pt-6">
        We may earn commission if you buy tickets via links on this page — it doesn&apos;t affect what we say.{' '}
        <Link href="/about-our-reviews" className="underline hover:text-slate-600">
          About our reviews
        </Link>
        {' · '}
        <Link href="/methodology" className="underline hover:text-slate-600">
          How we calculate
        </Link>
        . Last research update: June 2026.
      </p>
    </div>
  );
}
