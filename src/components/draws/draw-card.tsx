import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { formatPence } from '@/lib/utils';
import type { Raffle, Site } from '@/lib/types';

export type DrawRaffle = Raffle & {
  site: Pick<Site, 'id' | 'name' | 'slug' | 'affiliate_url' | 'competition_model'>;
};

interface DrawCardProps {
  raffle: DrawRaffle;
}

function getDrawUrgency(endDate: string): { text: string; className: string } | null {
  const diffMs = new Date(endDate).getTime() - Date.now();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 0) return null;
  if (diffDays < 1) return { text: 'Draws today', className: 'text-red-600 font-semibold' };
  if (diffDays === 1) return { text: 'Draws tomorrow', className: 'text-amber-600 font-medium' };
  return { text: `Draws in ${diffDays} days`, className: 'text-slate-500' };
}

export function DrawCard({ raffle }: DrawCardProps) {
  const pct = raffle.percent_sold ?? 0;
  const barColor =
    pct < 50 ? 'bg-emerald-500' : pct < 80 ? 'bg-amber-400' : 'bg-red-500';

  const carTitle =
    raffle.car_year && raffle.car_make && raffle.car_model
      ? `${raffle.car_year} ${raffle.car_make} ${raffle.car_model}`
      : raffle.title;

  const urgency = raffle.end_date ? getDrawUrgency(raffle.end_date) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/sites/${raffle.site.slug}`}
          className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1 hover:bg-slate-200 transition-colors shrink-0"
        >
          {raffle.site.name}
        </Link>
        {urgency && (
          <span className={`text-xs text-right ${urgency.className}`}>
            {urgency.text}
          </span>
        )}
      </div>

      <div>
        <p className="font-semibold text-slate-900 leading-snug">{carTitle}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5">
          {formatPence(raffle.prize_value)}
        </p>
      </div>

      <p className="text-sm text-slate-500">
        {formatPence(raffle.ticket_price)} per ticket
      </p>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{pct}% sold</span>
          {raffle.total_tickets != null && (
            <span>
              {(raffle.tickets_sold ?? 0).toLocaleString()} /{' '}
              {raffle.total_tickets.toLocaleString()}
            </span>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      <a
        href={raffle.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Enter now
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
