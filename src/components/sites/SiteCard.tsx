import Link from 'next/link';
import { ExternalLink, Star } from 'lucide-react';
import type { SiteReviewMeta } from '@/lib/reviews';

interface SiteCardProps {
  meta: SiteReviewMeta;
}

export function SiteCard({ meta }: SiteCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-400 mb-1">Est. {meta.yearsEstablished}</p>
        <h2 className="text-lg font-semibold text-slate-900 leading-snug">{meta.name}</h2>
        <p className="text-sm text-slate-500 mt-1">{meta.tagline}</p>
      </div>

      {/* Trust signals */}
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1 text-amber-600 font-medium">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {meta.trustpilotScore.toFixed(1)}
        </span>
        <span className="text-slate-400 text-xs">{meta.trustpilotCount} reviews</span>
        {meta.voluntaryCode && (
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            Voluntary Code
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="mt-auto flex gap-2">
        <Link
          href={`/sites/${meta.slug}`}
          className="flex-1 text-center text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-100 transition-colors"
        >
          Read review →
        </Link>
        <a
          href={meta.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-slate-500 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
          aria-label={`Visit ${meta.name}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
