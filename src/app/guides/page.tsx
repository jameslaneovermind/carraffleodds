import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllGuides } from '@/lib/guides';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const metadata: Metadata = {
  title: 'Car Competition Guides — CarRaffleOdds',
  description:
    'Honest guides to UK car competitions: are they legal, how free entry works, what happens when you win, and how to spot a legitimate site.',
  alternates: {
    canonical: '/guides',
  },
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Guides', url: `${SITE_URL}/guides` },
        ]}
      />

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          Car Competition Guides
        </h1>
        <p className="text-lg text-slate-600">
          Honest answers to the questions people actually ask before entering a UK car competition.
        </p>
      </div>

      <ul className="space-y-4">
        {guides.map((guide) => (
          <li key={guide.meta.slug}>
            <Link
              href={`/guides/${guide.meta.slug}`}
              className="flex items-start justify-between gap-4 p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
            >
              <div>
                <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {guide.meta.title}
                </p>
                <p className="text-sm text-slate-500 mt-1">{guide.meta.metaDescription}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-0.5 group-hover:text-blue-500 transition-colors" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
