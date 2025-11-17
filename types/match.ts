// Parsed Match Types for UI
export interface ParsedMatch {
  id: string;
  slug: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: Date;
  outcomes: {
    YES: MatchOutcome;
    NO: MatchOutcome;
  };
  volume: number;
  liquidity: number;
  active: boolean;
  closed: boolean;
  image?: string;
  chain?: 'polygon' | 'ethereum' | 'base' | 'solana' | 'none'; // Chain where the market exists (none for centralized APIs like Kalshi)
  platform?: 'polymarket' | 'kalshi'; // Platform name
}

export interface MatchOutcome {
  tokenId: string;
  outcome: string;
  price: number;
  impliedOdds: number;
}

export type PredictionSide = 'YES' | 'NO';

export interface PredictionParams {
  tokenId: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
}

export interface MatchFilters {
  league?: string;
  dateRange?: 'today' | 'week' | 'month' | 'all';
  status?: 'active' | 'closed' | 'all';
  sortBy?: 'volume' | 'liquidity' | 'date';
  platform?: 'all' | 'polymarket' | 'kalshi'; // Platform filter
}
