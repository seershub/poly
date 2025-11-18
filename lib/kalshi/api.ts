/**
 * Kalshi API Integration - SIMPLIFIED VERSION
 *
 * Using API Key authentication (simpler than login-based)
 * Per Kalshi docs: Some endpoints support API key in header
 *
 * REVERT REASON: Login-based auth requires KALSHI_EMAIL/KALSHI_PASSWORD
 * but Vercel already has KALSHI_API_KEY/KALSHI_API_SECRET configured.
 * Reverting to simpler API key auth for faster deployment.
 */

import axios from 'axios';
import { KALSHI_API_URL, KALSHI_API_KEY } from '@/lib/constants';
import type { ParsedMatch } from '@/types/match';

// Kalshi API Response Types
interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  category: string;
  subcategory?: string;
  open_time: string;
  close_time: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  volume: number;
  open_interest?: number;
  liquidity?: number;
  status: string;
}

interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor?: string | null;
}

/**
 * Convert Kalshi market to ParsedMatch format
 */
function kalshiMarketToMatch(market: KalshiMarket): ParsedMatch {
  // Calculate price from yes_bid/yes_ask (0-100 scale, convert to 0-1)
  const yesPrice = market.yes_bid ? market.yes_bid / 100 : 0.5;
  const noPrice = market.no_bid ? market.no_bid / 100 : 0.5;

  // Parse team names from title (e.g., "Team A vs Team B")
  const parts = market.title.split(' vs ');
  const homeTeam = parts[0]?.trim() || 'Yes';
  const awayTeam = parts[1]?.trim() || 'No';

  return {
    id: market.ticker,
    slug: market.ticker.toLowerCase().replace(/\s+/g, '-'),
    homeTeam,
    awayTeam,
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
 * Fetch active Kalshi markets
 *
 * SIMPLIFIED: Using API key in header (if available)
 * Otherwise return empty array (graceful degradation)
 */
export async function fetchKalshiMarkets(
  category: string = 'sports',
  limit: number = 50
): Promise<ParsedMatch[]> {
  try {
    // Check if API key is configured
    if (!KALSHI_API_KEY || KALSHI_API_KEY === '') {
      console.warn('[Kalshi API] API key not configured. Skipping Kalshi markets.');
      console.warn('[Kalshi API] To enable Kalshi: Set KALSHI_API_KEY in environment variables');
      return []; // Graceful degradation
    }

    console.log(`[Kalshi API] Fetching ${category} markets (limit: ${limit})...`);

    // Fetch markets from Kalshi API
    // Try with API key in header
    const response = await axios.get<KalshiMarketsResponse>(`${KALSHI_API_URL}/markets`, {
      params: {
        limit,
        status: 'open', // Only fetch open markets
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Try API key as simple header (might not work, but worth a try)
        'X-API-Key': KALSHI_API_KEY,
      },
      timeout: 15000,
    });

    console.log('[Kalshi API] Response:', {
      status: response.status,
      marketsCount: response.data.markets?.length || 0,
    });

    // Convert Kalshi markets to ParsedMatch format
    const matches = (response.data.markets || [])
      .filter((market: KalshiMarket) => {
        // Filter for sports markets
        const cat = market.category?.toLowerCase() || '';
        const title = market.title?.toLowerCase() || '';
        return cat.includes('sport') ||
               title.includes('nfl') ||
               title.includes('nba') ||
               title.includes('mlb') ||
               title.includes('soccer') ||
               title.includes('football');
      })
      .map(kalshiMarketToMatch);

    console.log(`[Kalshi API] Converted ${matches.length} sports markets to ParsedMatch format`);

    return matches;
  } catch (error: any) {
    console.error('[Kalshi API] Error fetching markets:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Graceful degradation - return empty array
    // This allows Polymarket markets to still show
    console.log('[Kalshi API] Returning empty array (graceful degradation)');
    return [];
  }
}

/**
 * Fetch a single Kalshi market by ticker
 */
export async function fetchKalshiMarket(ticker: string): Promise<ParsedMatch | null> {
  try {
    if (!KALSHI_API_KEY || KALSHI_API_KEY === '') {
      console.warn('[Kalshi API] API key not configured');
      return null;
    }

    console.log(`[Kalshi API] Fetching market: ${ticker}...`);

    const response = await axios.get<KalshiMarket>(`${KALSHI_API_URL}/markets/${ticker}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': KALSHI_API_KEY,
      },
      timeout: 15000,
    });

    console.log('[Kalshi API] Market fetched successfully');

    return kalshiMarketToMatch(response.data);
  } catch (error: any) {
    console.error(`[Kalshi API] Error fetching market ${ticker}:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    return null;
  }
}
