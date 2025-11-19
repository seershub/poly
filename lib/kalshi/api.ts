/**
 * Kalshi API Integration - RSA SIGNATURE AUTHENTICATION
 *
 * Uses RSA-PSS signature for authentication (required for Kalshi API v2)
 */

import axios from 'axios';
import { KALSHI_API_URL, KALSHI_API_KEY, KALSHI_API_SECRET } from '@/lib/constants';
import { generateKalshiSignature, formatPrivateKey } from './auth';
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
 * Helper to make authenticated requests to Kalshi
 */
async function kalshiRequest<T>(method: 'GET' | 'POST', endpoint: string, params: any = {}): Promise<T> {
  if (!KALSHI_API_KEY || !KALSHI_API_SECRET) {
    throw new Error('Kalshi credentials missing (KALSHI_API_KEY or KALSHI_API_SECRET)');
  }

  const timestamp = Date.now();
  // Endpoint for signature should NOT include query params or base URL
  // e.g., /trade-api/v2/markets
  const path = `/trade-api/v2${endpoint}`;

  const privateKey = formatPrivateKey(KALSHI_API_SECRET);
  const signature = generateKalshiSignature(timestamp, method, path, privateKey);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'KALSHI-ACCESS-KEY': KALSHI_API_KEY,
    'KALSHI-ACCESS-TIMESTAMP': timestamp.toString(),
    'KALSHI-ACCESS-SIGNATURE': signature,
  };

  const url = `${KALSHI_API_URL}${endpoint}`;

  const response = await axios({
    method,
    url,
    headers,
    params: method === 'GET' ? params : undefined,
    data: method === 'POST' ? params : undefined,
    timeout: 15000,
  });

  return response.data;
}

/**
 * Fetch active Kalshi markets
 */
export async function fetchKalshiMarkets(
  category: string = 'sports',
  limit: number = 50
): Promise<ParsedMatch[]> {
  console.log('=== Kalshi API: Fetching Markets (RSA Auth) ===');

  try {
    if (!KALSHI_API_KEY || !KALSHI_API_SECRET) {
      console.warn('[Kalshi API] ❌ Credentials not configured');
      return [];
    }

    console.log('[Kalshi API] Fetching from:', KALSHI_API_URL);

    const data = await kalshiRequest<KalshiMarketsResponse>('GET', '/markets', {
      limit,
      status: 'open',
    });

    console.log('[Kalshi API] ✅ Response received, markets:', data.markets?.length || 0);

    // Filter for sports markets
    const allMarkets = data.markets || [];
    const sportsKeywords = ['sport', 'nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'hockey', 'nhl', 'tennis', 'golf'];

    const filteredMarkets = allMarkets.filter((market: KalshiMarket) => {
      const cat = market.category?.toLowerCase() || '';
      const title = market.title?.toLowerCase() || '';
      return sportsKeywords.some(keyword => cat.includes(keyword) || title.includes(keyword));
    });

    // Convert to ParsedMatch format
    const matches = filteredMarkets.map(kalshiMarketToMatch);
    return matches;

  } catch (error: any) {
    console.error('=== Kalshi API Error ===');
    console.error('[Kalshi API] ❌ Error:', error.message);
    if (error.response) {
      console.error('[Kalshi API] Status:', error.response.status);
      console.error('[Kalshi API] Data:', error.response.data);
    }
    return [];
  }
}

/**
 * Fetch a single Kalshi market by ticker
 */
export async function fetchKalshiMarket(ticker: string): Promise<ParsedMatch | null> {
  try {
    const data = await kalshiRequest<KalshiMarket>('GET', `/markets/${ticker}`);
    return kalshiMarketToMatch(data);
  } catch (error: any) {
    console.error(`[Kalshi API] Error fetching market ${ticker}:`, error.message);
    return null;
  }
}
