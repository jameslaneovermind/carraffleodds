'use client';

import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RaffleEmptyStateProps {
  onClearFilters: () => void;
}

export function RaffleEmptyState({ onClearFilters }: RaffleEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <SearchX className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        No raffles match your filters
      </h3>
      <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
        Try broadening your search or clearing filters to see all available competitions.
      </p>
      <Button onClick={onClearFilters} variant="outline">
        Clear all filters
      </Button>
    </div>
  );
}
