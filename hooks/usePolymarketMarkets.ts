'use client';

import { useQuery } from '@tanstack/react-query';
import { getSoccerMarkets, getMarketBySlug } from '@/lib/polymarket/gammaApi';
import { parsePolymarketMatches, parsePolymarketMatch } from '@/lib/polymarket/parseMatch';
import type { ParsedMatch } from '@/types/match';

/**
 * Hook to fetch all soccer markets
 */
export function usePolymarketMarkets() {
  return useQuery({
    queryKey: ['polymarket-markets', 'soccer'],
    queryFn: async () => {
      const markets = await getSoccerMarkets();
      return parsePolymarketMatches(markets);
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook to fetch a single market by slug
 */
export function usePolymarketMarket(slug: string) {
  return useQuery({
    queryKey: ['polymarket-market', slug],
    queryFn: async () => {
      const market = await getMarketBySlug(slug);
      if (!market) return null;
      return parsePolymarketMatch(market);
    },
    enabled: !!slug,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get filtered and sorted matches
 */
export function useFilteredMatches(filters?: {
  league?: string;
  dateRange?: 'today' | 'week' | 'month' | 'all';
  status?: 'active' | 'closed' | 'all';
  sortBy?: 'volume' | 'liquidity' | 'date';
}) {
  const { data: allMatches, isLoading, error } = usePolymarketMarkets();

  const filteredMatches = React.useMemo(() => {
    if (!allMatches) return [];

    let matches = [...allMatches];

    // Filter by league
    if (filters?.league && filters.league !== 'all') {
      matches = matches.filter(
        match => match.league.toLowerCase() === filters.league?.toLowerCase()
      );
    }

    // Filter by status
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        matches = matches.filter(match => match.active && !match.closed);
      } else if (filters.status === 'closed') {
        matches = matches.filter(match => match.closed);
      }
    }

    // Filter by date range
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      matches = matches.filter(match => {
        const matchDate = new Date(match.matchDate);

        switch (filters.dateRange) {
          case 'today':
            return matchDate.toDateString() === today.toDateString();

          case 'week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return matchDate >= today && matchDate <= weekFromNow;

          case 'month':
            const monthFromNow = new Date(today);
            monthFromNow.setMonth(monthFromNow.getMonth() + 1);
            return matchDate >= today && matchDate <= monthFromNow;

          default:
            return true;
        }
      });
    }

    // Sort matches
    if (filters?.sortBy) {
      matches.sort((a, b) => {
        switch (filters.sortBy) {
          case 'volume':
            return b.volume - a.volume;
          case 'liquidity':
            return b.liquidity - a.liquidity;
          case 'date':
            return a.matchDate.getTime() - b.matchDate.getTime();
          default:
            return 0;
        }
      });
    }

    return matches;
  }, [allMatches, filters]);

  return {
    matches: filteredMatches,
    isLoading,
    error,
  };
}

// Add React import
import React from 'react';
