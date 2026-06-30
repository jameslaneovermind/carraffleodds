import Link from 'next/link';
import { getFreeEntryForSite, formatVerified } from '@/lib/free-entry';

interface FreeEntryCardProps {
  siteSlug: string;
}

export function FreeEntryCard({ siteSlug }: FreeEntryCardProps) {
  const site = getFreeEntryForSite(siteSlug);
  if (!site) return null;

  if (!site.isFreeEntryAvailable) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Free entry</h2>
        <div className="rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
          <p>{site.notes}</p>
          <p className="mt-3 text-xs text-slate-400">
            <Link href="/guides/free-entry-car-competitions" className="hover:underline">
              How free entry works at other sites →
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Free entry</h2>
      <div className="rounded-xl border border-slate-200 p-5 text-sm">
        <p className="text-slate-600 mb-4">
          You can enter by post for free — equal odds to paid tickets. Send a handwritten postcard
          or plain paper in an envelope with your name, address, phone number, email, the
          competition name, and the answer to the skill question where applicable.
        </p>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Postal address
            </dt>
            <dd className="text-slate-800">
              {site.postalAddress ?? (
                <span className="italic text-slate-400">
                  Verify against current T&amp;Cs before posting
                </span>
              )}
            </dd>
          </div>
          {site.entryDeadlineDays !== null && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Entry deadline
              </dt>
              <dd className="text-slate-800">
                {site.entryDeadlineDays} day{site.entryDeadlineDays !== 1 ? 's' : ''} before draw close
              </dd>
            </div>
          )}
          {site.skillQuestionFormat && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Skill question
              </dt>
              <dd className="text-slate-800">{site.skillQuestionFormat}</dd>
            </div>
          )}
          {site.notes && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Notes
              </dt>
              <dd className="text-slate-800">{site.notes}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
          Verified {formatVerified(site.lastVerified)} · Always check current T&amp;Cs before posting.{' '}
          <Link href="/guides/free-entry-car-competitions" className="hover:underline">
            Full free entry guide →
          </Link>
        </p>
      </div>
    </section>
  );
}
