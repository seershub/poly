/**
 * Kalshi API Integration
 *
 * Per Kalshi docs: https://docs.kalshi.com
 * Kalshi is a centralized exchange API and doesn't require blockchain integration
 *
 * Authentication Method: Login-based
 * - POST /login with email/password
 * - Returns JWT token (expires in 30 minutes)
 * - Use Bearer token in Authorization header
 *
 * API v2 Documentation: https://trading-api.readme.io/reference/getting-started
 */

import axios, { AxiosInstance } from 'axios';
import { KALSHI_API_URL, KALSHI_EMAIL, KALSHI_PASSWORD } from '@/lib/constants';
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

interface KalshiLoginResponse {
  token: string;
  user_id: string;
}

// Token cache (in-memory)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Login to Kalshi API and get JWT token
 * Token expires in 30 minutes
 */
async function loginToKalshi(): Promise<string> {
  try {
    // Check if we have valid credentials
    if (!KALSHI_EMAIL || !KALSHI_PASSWORD) {
      console.warn('Kalshi credentials not configured. Please set KALSHI_EMAIL and KALSHI_PASSWORD in environment variables.');
      throw new Error('Kalshi credentials not configured');
    }

    console.log('[Kalshi API] Logging in...');

    const response = await axios.post<KalshiLoginResponse>(
      `${KALSHI_API_URL}/login`,
      {
        email: KALSHI_EMAIL,
        password: KALSHI_PASSWORD,
      }
    );

    const token = response.data.token;

    // Cache token for 25 minutes (expires in 30, refresh 5 minutes early)
    cachedToken = token;
    tokenExpiry = Date.now() + (25 * 60 * 1000);

    console.log('[Kalshi API] Login successful, token cached');

    return token;
  } catch (error: any) {
    console.error('[Kalshi API] Login failed:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(`Kalshi login failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get valid auth token (login if needed or token expired)
 */
async function getAuthToken(): Promise<string> {
  // Check if token is still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Token expired or not cached, login
  return await loginToKalshi();
}

/**
 * Create authenticated axios instance
 */
async function getAuthenticatedClient(): Promise<AxiosInstance> {
  const token = await getAuthToken();

  return axios.create({
    baseURL: KALSHI_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`, // ✅ CORRECT: Bearer token from login
    },
    timeout: 15000,
  });
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
 * Fetch active Kalshi markets (Sports category)
 * Per Kalshi docs: Use REST API to fetch markets
 *
 * FIXED: Proper authentication with login-based Bearer token
 */
export async function fetchKalshiMarkets(
  category: string = 'sports',
  limit: number = 50
): Promise<ParsedMatch[]> {
  try {
    console.log(`[Kalshi API] Fetching ${category} markets (limit: ${limit})...`);

    // Get authenticated axios client
    const client = await getAuthenticatedClient();

    // Fetch markets from Kalshi API
    const response = await client.get<KalshiMarketsResponse>('/markets', {
      params: {
        series_ticker: category, // Filter by category (e.g., 'sports', 'politics')
        limit,
        status: 'open', // Only fetch open markets
      },
    });

    console.log('[Kalshi API] Response:', {
      status: response.status,
      marketsCount: response.data.markets?.length || 0,
    });

    // Convert Kalshi markets to ParsedMatch format
    const matches = (response.data.markets || []).map(kalshiMarketToMatch);

    console.log(`[Kalshi API] Converted ${matches.length} Kalshi markets to ParsedMatch format`);

    return matches;
  } catch (error: any) {
    console.error('[Kalshi API] Error fetching markets:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Return empty array on error (graceful degradation)
    // This allows the app to continue working with Polymarket markets only
    return [];
  }
}

/**
 * Fetch a single Kalshi market by ticker
 */
export async function fetchKalshiMarket(ticker: string): Promise<ParsedMatch | null> {
  try {
    console.log(`[Kalshi API] Fetching market: ${ticker}...`);

    const client = await getAuthenticatedClient();

    const response = await client.get<KalshiMarket>(`/markets/${ticker}`);

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

/**
 * Clear cached token (useful for logout or testing)
 */
export function clearKalshiToken() {
  cachedToken = null;
  tokenExpiry = 0;
  console.log('[Kalshi API] Token cache cleared');
}
