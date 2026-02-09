'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Clock, Ticket, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SiteBadge } from './site-badge';
import { ProgressBar } from './progress-bar';
import { CountdownTimer } from './countdown-timer';
import { formatPence, formatOdds, getValueScore, formatValueScore, getValueScoreLabel } from '@/lib/utils';
import type { Raffle } from '@/lib/types';

interface RaffleCardProps {
  raffle: Raffle;
}

function getCategoryLabel(category: string | null): string | null {
  if (!category || category === 'other') return null;
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function isEndingSoon(endDate: string | null): boolean {
  if (!endDate) return false;
  const diff = new Date(endDate).getTime() - Date.now();
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
}

function isNew(createdAt: string): boolean {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

export function RaffleCard({ raffle }: RaffleCardProps) {
  const siteName = raffle.site?.name ?? 'Unknown Site';
  const categoryLabel = getCategoryLabel(raffle.car_category ?? raffle.prize_type);
  const endingSoon = isEndingSoon(raffle.end_date);
  const isNewRaffle = isNew(raffle.created_at);
  const [imgState, setImgState] = useState<'optimized' | 'unoptimized' | 'failed'>('optimized');
  const valueScore = getValueScore(raffle);
  const vsLabel = getValueScoreLabel(valueScore);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-[16/9] bg-slate-200 overflow-hidden">
        {raffle.image_url && imgState !== 'failed' ? (
          <Image
            src={raffle.image_url}
            alt={raffle.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={imgState === 'unoptimized'}
            onError={() => {
              // First try failed (optimized) → retry unoptimized (direct load)
              // Second try failed (unoptimized) → show placeholder
              setImgState((prev) => (prev === 'optimized' ? 'unoptimized' : 'failed'));
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Ticket className="h-12 w-12 text-slate-300" />
          </div>
        )}

        {/* Value Score badge — top right of image */}
        {valueScore != null && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-slate-200/50">
            <div className="flex items-center gap-1">
              <Zap className={`h-3 w-3 ${vsLabel.color}`} />
              <span className={`text-xs font-bold ${vsLabel.color}`}>
                {formatValueScore(valueScore)}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">per £1</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <SiteBadge siteName={siteName} />
          {categoryLabel && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-slate-100 text-slate-500 border-0">
              {categoryLabel}
            </Badge>
          )}
          {endingSoon && (
            <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-100 text-amber-700 border-0 hover:bg-amber-100">
              Ending Soon
            </Badge>
          )}
          {isNewRaffle && (
            <Badge className="text-[10px] px-1.5 py-0 h-5 bg-blue-100 text-blue-700 border-0 hover:bg-blue-100">
              New
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-[1.0625rem] leading-snug text-slate-800 line-clamp-2 mb-3">
          {raffle.title}
        </h3>

        {/* Data grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          {/* Ticket price */}
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Ticket Price</p>
            <p className="text-sm font-bold text-slate-800 tabular-nums">
              {formatPence(raffle.ticket_price)}
            </p>
          </div>

          {/* Odds */}
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Odds</p>
            <p className="text-sm font-medium text-slate-700 tabular-nums">
              {raffle.total_tickets
                ? formatOdds(raffle.total_tickets)
                : <span className="text-slate-400">N/A</span>
              }
            </p>
          </div>

          {/* Ends in */}
          <div>
            <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Ends
            </p>
            <CountdownTimer endDate={raffle.end_date} />
          </div>

          {/* Value Score */}
          <div>
            <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Value
            </p>
            {valueScore != null ? (
              <p className={`text-sm font-bold tabular-nums ${vsLabel.color}`}>
                {formatValueScore(valueScore)}<span className="text-xs font-normal text-slate-400">/£1</span>
              </p>
            ) : (
              <p className="text-sm text-slate-400">N/A</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {raffle.percent_sold != null && (
          <ProgressBar percentSold={Number(raffle.percent_sold)} className="mb-3" />
        )}

        {/* Cash alternative */}
        {raffle.cash_alternative != null && (
          <p className="text-xs text-slate-500 mb-3">
            Or <span className="font-medium text-emerald-600">{formatPence(raffle.cash_alternative)}</span> cash
          </p>
        )}

        {/* CTA — pushed to bottom */}
        <div className="mt-auto">
          <a
            href={raffle.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
          >
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-sm">
              View Competition
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
