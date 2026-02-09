'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CategoryPills } from './category-pills';
import { getValueScore } from '@/lib/utils';
import { RaffleGrid } from './raffle-grid';
import { RaffleEmptyState } from './raffle-empty-state';
import { cn, formatPence } from '@/lib/utils';
import { SORT_OPTIONS, DEFAULT_SORT, getCategoryBySlug } from '@/lib/constants';
import type { Raffle } from '@/lib/types';

interface RaffleFiltersProps {
  raffles: Raffle[];
  /** Category from the URL route segment (e.g., /raffles/cars → 'cars') */
  initialCategory: string | null;
  /** Unique sites from the dataset */
  sites: { slug: string; name: string }[];
}

export function RaffleFilters({ raffles, initialCategory, sites }: RaffleFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read state from URL (or defaults)
  const sortParam = searchParams.get('sort') ?? DEFAULT_SORT;
  const siteParam = searchParams.get('site') ?? null;
  const minPriceParam = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : 0;
  const maxPriceParam = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;

  // View toggle (not in URL — local state)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  // Category from the route segment
  const activeCategory = initialCategory;

  // Compute price bounds from data
  const priceBounds = useMemo(() => {
    const prices = raffles
      .map(r => r.ticket_price)
      .filter((p): p is number => p != null);
    return {
      min: Math.min(...prices, 0),
      max: Math.max(...prices, 10000),
    };
  }, [raffles]);

  const effectiveMaxPrice = maxPriceParam ?? priceBounds.max;

  // Update URL search params (replace, no history pollution)
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Category change navigates to a new route
  const handleCategoryChange = useCallback(
    (category: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      const queryString = params.toString();
      const basePath = category ? `/raffles/${category}` : '/raffles';
      const newUrl = queryString ? `${basePath}?${queryString}` : basePath;
      router.push(newUrl);
    },
    [router, searchParams]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      updateParams({ sort: value === DEFAULT_SORT ? null : value });
    },
    [updateParams]
  );

  const handleSiteChange = useCallback(
    (value: string) => {
      updateParams({ site: value === 'all' ? null : value });
    },
    [updateParams]
  );

  const handlePriceChange = useCallback(
    (values: number[]) => {
      updateParams({
        minPrice: values[0] > 0 ? String(values[0]) : null,
        maxPrice: values[1] < priceBounds.max ? String(values[1]) : null,
      });
    },
    [updateParams, priceBounds.max]
  );

  const clearAllFilters = useCallback(() => {
    router.push('/raffles');
  }, [router]);

  // Has any filters active?
  const hasActiveFilters = activeCategory !== null || siteParam !== null || minPriceParam > 0 || maxPriceParam !== null;

  // ========== Filtering ==========

  const filteredRaffles = useMemo(() => {
    let result = [...raffles];

    // Category filter
    if (activeCategory) {
      const categoryDef = getCategoryBySlug(activeCategory);
      if (categoryDef) {
        result = result.filter(r => r.prize_type && categoryDef.prizeTypes.includes(r.prize_type));
      }
    }

    // Site filter
    if (siteParam) {
      result = result.filter(r => r.site?.slug === siteParam);
    }

    // Price filter
    if (minPriceParam > 0) {
      result = result.filter(r => r.ticket_price != null && r.ticket_price >= minPriceParam);
    }
    if (maxPriceParam !== null) {
      result = result.filter(r => r.ticket_price != null && r.ticket_price <= maxPriceParam);
    }

    // ========== Sorting ==========
    result.sort((a, b) => {
      switch (sortParam) {
        case 'best-value': {
          // Highest value score first, nulls last
          const scoreA = getValueScore(a);
          const scoreB = getValueScore(b);
          if (scoreA == null && scoreB == null) return 0;
          if (scoreA == null) return 1;
          if (scoreB == null) return -1;
          return scoreB - scoreA;
        }
        case 'best-odds': {
          // Lowest odds first, nulls last
          if (a.total_tickets == null && b.total_tickets == null) return 0;
          if (a.total_tickets == null) return 1;
          if (b.total_tickets == null) return -1;
          return a.total_tickets - b.total_tickets;
        }
        case 'lowest-price': {
          const priceA = a.ticket_price ?? Infinity;
          const priceB = b.ticket_price ?? Infinity;
          return priceA - priceB;
        }
        case 'newest': {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case 'ending-soon':
        default: {
          // Soonest first, nulls last
          if (a.end_date == null && b.end_date == null) return 0;
          if (a.end_date == null) return 1;
          if (b.end_date == null) return -1;
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        }
      }
    });

    return result;
  }, [raffles, activeCategory, siteParam, sortParam, minPriceParam, maxPriceParam]);

  // Dynamic page title
  const categoryDef = activeCategory ? getCategoryBySlug(activeCategory) : null;
  const pageTitle = categoryDef ? categoryDef.pageTitle : 'All Raffles';
  const siteCount = sites.length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Compare {filteredRaffles.length} competitions from {siteCount} verified sites
            </p>
          </div>

          {/* View toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="space-y-4 mb-6">
        {/* Category pills */}
        <CategoryPills
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          raffles={raffles}
        />

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Site filter */}
          <Select value={siteParam ?? 'all'} onValueChange={handleSiteChange}>
            <SelectTrigger className="w-[180px] h-9 text-sm bg-white">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites.map(site => (
                <SelectItem key={site.slug} value={site.slug}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Price filter toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm"
            onClick={() => setShowPriceFilter(!showPriceFilter)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            Price
            {(minPriceParam > 0 || maxPriceParam !== null) && (
              <span className="ml-1 text-xs text-blue-500">
                {formatPence(minPriceParam)} – {formatPence(effectiveMaxPrice)}
              </span>
            )}
          </Button>

          {/* Sort dropdown — right-aligned */}
          <div className="ml-auto">
            <Select value={sortParam} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[160px] h-9 text-sm bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Price range slider (expandable) */}
        {showPriceFilter && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">Price Range</span>
              <span className="text-sm tabular-nums text-slate-500">
                {formatPence(minPriceParam)} – {formatPence(effectiveMaxPrice)}
              </span>
            </div>
            <Slider
              min={priceBounds.min}
              max={priceBounds.max}
              step={10}
              value={[minPriceParam, effectiveMaxPrice]}
              onValueChange={handlePriceChange}
              className="w-full"
            />
          </div>
        )}

        {/* Active filters summary + clear */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              Showing {filteredRaffles.length} of {raffles.length} raffles
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-500 hover:text-slate-700"
              onClick={clearAllFilters}
            >
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {filteredRaffles.length === 0 ? (
        <RaffleEmptyState onClearFilters={clearAllFilters} />
      ) : (
        <RaffleGrid raffles={filteredRaffles} />
      )}
    </div>
  );
}
