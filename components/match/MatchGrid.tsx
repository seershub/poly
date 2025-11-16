'use client';

import { MatchCard } from './MatchCard';
import { MatchFilters } from './MatchFilters';
import type { ParsedMatch, MatchFilters as FilterType } from '@/types/match';
import { useState } from 'react';
import { useFilteredMatches } from '@/hooks/usePolymarketMarkets';
import { Loader2 } from 'lucide-react';

export function MatchGrid() {
  const [filters, setFilters] = useState<FilterType>({
    league: 'all',
    dateRange: 'week',
    status: 'active',
    sortBy: 'volume',
  });

  const { matches, isLoading, error } = useFilteredMatches(filters);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load matches</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="space-y-6">
        <MatchFilters filters={filters} onFiltersChange={setFilters} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">No matches found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MatchFilters filters={filters} onFiltersChange={setFilters} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Showing {matches.length} match{matches.length !== 1 ? 'es' : ''}
      </div>
    </div>
  );
}
