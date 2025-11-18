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
  console.log('=== Kalshi API: Fetching Markets ===');

  try {
    // Check if API key is configured
    if (!KALSHI_API_KEY || KALSHI_API_KEY === '' || KALSHI_API_KEY === 'your_api_key') {
      console.warn('[Kalshi API] ❌ API key not configured or using placeholder value');
      console.warn('[Kalshi API] Set KALSHI_API_KEY in environment variables');
      console.warn('[Kalshi API] Skipping Kalshi markets (graceful degradation)');
      return []; // Graceful degradation
    }

    console.log('[Kalshi API] ✅ API key configured');
    console.log('[Kalshi API] Fetching from:', KALSHI_API_URL);
    console.log('[Kalshi API] Params:', { category, limit, status: 'open' });

    // Fetch markets from Kalshi API
    const response = await axios.get<KalshiMarketsResponse>(`${KALSHI_API_URL}/markets`, {
      params: {
        limit,
        status: 'open', // Only fetch open markets
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': KALSHI_API_KEY,
      },
      timeout: 15000,
    });

    console.log('[Kalshi API] ✅ Response received:', {
      status: response.status,
      totalMarkets: response.data.markets?.length || 0,
    });

    // Log sample of raw markets (first 3) for debugging
    if (response.data.markets && response.data.markets.length > 0) {
      console.log('[Kalshi API] Sample markets (first 3):',
        response.data.markets.slice(0, 3).map(m => ({
          ticker: m.ticker,
          title: m.title,
          category: m.category,
          status: m.status,
        }))
      );
    }

    // Filter for sports markets
    const allMarkets = response.data.markets || [];
    const sportsKeywords = ['sport', 'nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'hockey', 'nhl', 'tennis', 'golf'];

    const filteredMarkets = allMarkets.filter((market: KalshiMarket) => {
      const cat = market.category?.toLowerCase() || '';
      const title = market.title?.toLowerCase() || '';
      const subtitle = market.subtitle?.toLowerCase() || '';

      // Check if any sports keyword appears in category, title, or subtitle
      return sportsKeywords.some(keyword =>
        cat.includes(keyword) ||
        title.includes(keyword) ||
        subtitle.includes(keyword)
      );
    });

    console.log('[Kalshi API] Filtered markets:', {
      total: allMarkets.length,
      sportsOnly: filteredMarkets.length,
      filterKeywords: sportsKeywords.join(', '),
    });

    // Convert to ParsedMatch format
    const matches = filteredMarkets.map(kalshiMarketToMatch);

    console.log('[Kalshi API] ✅ Successfully converted', matches.length, 'Kalshi markets');
    console.log('=====================================');

    return matches;
  } catch (error: any) {
    console.error('=== Kalshi API Error ===');
    console.error('[Kalshi API] ❌ Error:', error.message);

    if (error.response) {
      console.error('[Kalshi API] Response status:', error.response.status);
      console.error('[Kalshi API] Response data:', error.response.data);

      if (error.response.status === 401) {
        console.error('[Kalshi API] 401 Unauthorized - API key might be invalid');
      } else if (error.response.status === 403) {
        console.error('[Kalshi API] 403 Forbidden - API key might not have required permissions');
      } else if (error.response.status === 429) {
        console.error('[Kalshi API] 429 Rate Limited - too many requests');
      } else if (error.response.status === 404) {
        console.error('[Kalshi API] 404 Not Found - endpoint might be incorrect');
      }
    } else if (error.request) {
      console.error('[Kalshi API] No response received - network error or timeout');
    } else {
      console.error('[Kalshi API] Request setup error:', error.message);
    }

    console.log('[Kalshi API] Returning empty array (graceful degradation)');
    console.log('========================');
    return []; // Graceful degradation
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
