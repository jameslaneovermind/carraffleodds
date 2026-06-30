import Link from 'next/link';
import { FREE_ENTRY_SITES, formatVerified } from '@/lib/free-entry';

export function FreeEntrySitesTable() {
  const sites = FREE_ENTRY_SITES.filter(s => s.isFreeEntryAvailable);

  return (
    <div className="not-prose mt-4 space-y-3">
      {sites.map(site => (
        <div key={site.siteSlug} className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/sites/${site.siteSlug}`}
                className="font-semibold text-slate-900 hover:text-blue-600 text-sm"
              >
                {site.siteName}
              </Link>
              <p className="text-sm text-slate-600 mt-1 break-words">
                {site.postalAddress ?? (
                  <span className="italic text-slate-400">
                    Address not confirmed — check current T&amp;Cs
                  </span>
                )}
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate-400 whitespace-nowrap">
              Verified {formatVerified(site.lastVerified)}
            </span>
          </div>
          {(site.entryDeadlineDays !== null || site.skillQuestionFormat || site.notes) && (
            <dl className="mt-3 space-y-1 text-xs text-slate-500">
              {site.entryDeadlineDays !== null && (
                <div className="flex gap-2">
                  <dt className="font-medium shrink-0">Deadline:</dt>
                  <dd>
                    {site.entryDeadlineDays} day{site.entryDeadlineDays !== 1 ? 's' : ''} before draw
                  </dd>
                </div>
              )}
              {site.skillQuestionFormat && (
                <div className="flex gap-2">
                  <dt className="font-medium shrink-0">Skill question:</dt>
                  <dd>{site.skillQuestionFormat}</dd>
                </div>
              )}
              {site.notes && (
                <div className="flex gap-2">
                  <dt className="font-medium shrink-0">Notes:</dt>
                  <dd>{site.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      ))}
      <p className="text-xs text-slate-400 mt-2">
        BOTB&apos;s Spot the Ball is a skill competition — the free entry requirement does not apply.
        Always verify addresses against each site&apos;s current T&amp;Cs before posting.
      </p>
    </div>
  );
}
