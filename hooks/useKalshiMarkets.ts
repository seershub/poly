'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchKalshiMarkets } from '@/lib/kalshi/api';
import type { ParsedMatch } from '@/types/match';

/**
 * Convert Kalshi market to ParsedMatch format
 * This is a simplified conversion - adjust based on actual Kalshi API response
 */
function kalshiToParsedMatch(kalshiMatch: any): ParsedMatch {
  // Parse title to extract teams (e.g., "Will Team A beat Team B?")
  const titleParts = kalshiMatch.title.split(' ');
  const homeTeam = titleParts[0] || 'Team A';
  const awayTeam = titleParts[2] || 'Team B';
  
  return {
    id: kalshiMatch.id,
    slug: kalshiMatch.id.toLowerCase().replace(/\s+/g, '-'),
    homeTeam,
    awayTeam,
    league: kalshiMatch.category || 'Soccer',
    matchDate: new Date(kalshiMatch.startTime),
    outcomes: {
      YES: {
        tokenId: kalshiMatch.outcomes[0]?.id || `${kalshiMatch.id}-yes`,
        outcome: 'YES',
        price: kalshiMatch.outcomes[0]?.price || 0.5,
        impliedOdds: (kalshiMatch.outcomes[0]?.price || 0.5) * 100,
      },
      NO: {
        tokenId: kalshiMatch.outcomes[1]?.id || `${kalshiMatch.id}-no`,
        outcome: 'NO',
        price: kalshiMatch.outcomes[1]?.price || 0.5,
        impliedOdds: (kalshiMatch.outcomes[1]?.price || 0.5) * 100,
      },
    },
    volume: kalshiMatch.volume || 0,
    liquidity: kalshiMatch.liquidity || 0,
    active: kalshiMatch.status === 'open',
    closed: kalshiMatch.status === 'closed',
    image: undefined,
  };
}

/**
 * Hook to fetch Kalshi markets (Soccer category)
 * Per Kalshi docs: Markets are fetched via REST API
 */
export function useKalshiMarkets() {
  return useQuery({
    queryKey: ['kalshi-markets', 'soccer'],
    queryFn: async () => {
      const markets = await fetchKalshiMarkets('soccer', 50);
      // Convert to ParsedMatch format
      return markets.map(kalshiToParsedMatch);
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

