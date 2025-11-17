/**
 * Kalshi API Integration
 * 
 * Per Kalshi docs: https://docs.kalshi.com
 * Kalshi is a centralized exchange API and doesn't require blockchain integration
 */

import axios from 'axios';
import { KALSHI_API_URL, KALSHI_API_KEY, KALSHI_API_SECRET } from '@/lib/constants';
import type { ParsedMatch } from '@/types/match';

// Kalshi API Response Types
interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle: string;
  category: string;
  subcategory: string;
  open_time: string;
  close_time: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  volume: number;
  open_interest: number;
  liquidity: number;
  status: string;
}

interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor: string | null;
}

/**
 * Convert Kalshi market to ParsedMatch format
 */
function kalshiMarketToMatch(market: KalshiMarket): ParsedMatch {
  // Calculate price from yes_bid/yes_ask (0-100 scale, convert to 0-1)
  const yesPrice = market.yes_bid ? market.yes_bid / 100 : 0.5;
  const noPrice = market.no_bid ? market.no_bid / 100 : 0.5;

  return {
    id: market.ticker,
    slug: market.ticker.toLowerCase().replace(/\s+/g, '-'),
    homeTeam: market.title.split(' vs ')[0] || 'Yes', // Attempt to parse teams from title
    awayTeam: market.title.split(' vs ')[1] || 'No', // Attempt to parse teams from title
    league: market.category || 'General',
    matchDate: new Date(market.open_time),
    outcomes: {
      YES: {
        tokenId: `${market.ticker}-yes`,
        outcome: 'Yes',
        price: yesPrice,
        impliedOdds: yesPrice * 100,
      },
      NO: {
        tokenId: `${market.ticker}-no`,
        outcome: 'No',
        price: noPrice,
        impliedOdds: noPrice * 100,
      },
    },
    volume: market.volume || 0,
    liquidity: market.liquidity || 0,
    active: market.status === 'open',
    closed: market.status === 'closed',
    chain: 'none', // Kalshi is centralized API, no blockchain required
    platform: 'kalshi',
  };
}

/**
 * Fetch active Kalshi markets (Soccer category)
 * Per Kalshi docs: Use REST API to fetch markets
 */
export async function fetchKalshiMarkets(
  category: string = 'soccer',
  limit: number = 50
): Promise<ParsedMatch[]> {
  try {
    // Kalshi API requires authentication
    // For now, we'll use a mock approach or public endpoint if available
    // TODO: Implement proper Kalshi API authentication
    
    // Note: Kalshi API might require different authentication
    // Check Kalshi docs for exact endpoint and auth method
    
    const response = await axios.get<KalshiMarketsResponse>(
      `${KALSHI_API_URL}/markets`,
      {
        params: {
          category,
          limit,
          status: 'open', // Only fetch open markets
        },
        headers: KALSHI_API_KEY && KALSHI_API_SECRET
          ? {
              'Authorization': `Bearer ${KALSHI_API_KEY}`, // Adjust based on Kalshi auth method
            }
          : {},
      }
    );

    // Convert Kalshi markets to Match format
    const matches = response.data.markets.map(kalshiMarketToMatch);
    
    return matches;
  } catch (error: any) {
    console.error('Error fetching Kalshi markets:', error);
    
    // Return empty array on error (graceful degradation)
    // In production, you might want to show an error to the user
    return [];
  }
}

/**
 * Fetch a single Kalshi market by ticker
 */
export async function fetchKalshiMarket(ticker: string): Promise<ParsedMatch | null> {
  try {
    const response = await axios.get<KalshiMarket>(
      `${KALSHI_API_URL}/markets/${ticker}`,
      {
        headers: KALSHI_API_KEY && KALSHI_API_SECRET
          ? {
              'Authorization': `Bearer ${KALSHI_API_KEY}`,
            }
          : {},
      }
    );

    return kalshiMarketToMatch(response.data);
  } catch (error: any) {
    console.error(`Error fetching Kalshi market ${ticker}:`, error);
    return null;
  }
}

