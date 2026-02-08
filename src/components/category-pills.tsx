'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORIES, MORE_CATEGORIES } from '@/lib/constants';
import type { PrizeType } from '@/lib/types';
import type { Raffle } from '@/lib/types';

interface CategoryPillsProps {
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  raffles: Raffle[];
}

function countByCategory(raffles: Raffle[], prizeTypes: PrizeType[]): number {
  return raffles.filter(r => r.prize_type && prizeTypes.includes(r.prize_type)).length;
}

export function CategoryPills({ activeCategory, onCategoryChange, raffles }: CategoryPillsProps) {
  const [showMore, setShowMore] = useState(false);

  const totalCount = raffles.length;

  // Count how many raffles are in "more" categories
  const morePrizeTypes = MORE_CATEGORIES.flatMap(c => c.prizeTypes);
  const moreCount = countByCategory(raffles, morePrizeTypes);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* All pill */}
      <button
        onClick={() => onCategoryChange(null)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          activeCategory === null
            ? 'bg-blue-500 text-white'
            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
        )}
      >
        All
        <span className={cn(
          'text-xs tabular-nums',
          activeCategory === null ? 'text-blue-100' : 'text-slate-400'
        )}>
          {totalCount}
        </span>
      </button>

      {/* Main categories */}
      {CATEGORIES.map(cat => {
        const count = countByCategory(raffles, cat.prizeTypes);
        if (count === 0) return null;

        return (
          <button
            key={cat.slug}
            onClick={() => onCategoryChange(cat.slug)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              activeCategory === cat.slug
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            )}
          >
            {cat.label}
            <span className={cn(
              'text-xs tabular-nums',
              activeCategory === cat.slug ? 'text-blue-100' : 'text-slate-400'
            )}>
              {count}
            </span>
          </button>
        );
      })}

      {/* More toggle */}
      {moreCount > 0 && (
        <>
          <button
            onClick={() => setShowMore(!showMore)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            More
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMore && 'rotate-180')} />
          </button>

          {showMore && MORE_CATEGORIES.map(cat => {
            const count = countByCategory(raffles, cat.prizeTypes);
            if (count === 0) return null;

            return (
              <button
                key={cat.slug}
                onClick={() => onCategoryChange(cat.slug)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  activeCategory === cat.slug
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                )}
              >
                {cat.label}
                <span className={cn(
                  'text-xs tabular-nums',
                  activeCategory === cat.slug ? 'text-blue-100' : 'text-slate-400'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
