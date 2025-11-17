'use client';

import { Button } from '@/components/ui/button';
import type { MatchFilters as FilterType } from '@/types/match';
import { Filter } from 'lucide-react';

interface MatchFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
}

export function MatchFilters({ filters, onFiltersChange }: MatchFiltersProps) {
  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ] as const;

  const sortOptions = [
    { value: 'volume', label: 'Volume' },
    { value: 'liquidity', label: 'Liquidity' },
    { value: 'date', label: 'Date' },
  ] as const;

  const platformOptions = [
    { value: 'all', label: 'All Platforms' },
    { value: 'polymarket', label: 'Polymarket' },
    { value: 'kalshi', label: 'Kalshi' },
  ] as const;

  const updateFilter = (key: keyof FilterType, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Filter className="h-4 w-4" />
        Filters
      </div>

      {/* Platform Filter */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Platform</label>
        <div className="flex gap-2">
          {platformOptions.map((platform) => (
            <Button
              key={platform.value}
              variant={filters.platform === platform.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('platform', platform.value)}
            >
              {platform.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Date Range</label>
        <div className="grid grid-cols-4 gap-2">
          {dateRanges.map((range) => (
            <Button
              key={range.value}
              variant={filters.dateRange === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('dateRange', range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Sort By</label>
        <div className="grid grid-cols-3 gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant={filters.sortBy === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('sortBy', option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
