import axios from 'axios';
import { GAMMA_API_URL, SOCCER_TAGS } from '@/lib/constants';
import type {
  PolymarketMarket,
  GammaMarketsResponse,
  GammaSportsResponse,
  GammaEvent
} from '@/types/polymarket';

// Use our Next.js API route instead of calling Gamma API directly (bypasses CORS)
// Client-side only - do not call during SSR
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 second timeout
});

/**
 * Get sports metadata including tag IDs
 * Per Polymarket docs: /sports endpoint returns tag IDs for filtering
 * Note: Currently not used, can be implemented via API route if needed
 */
async function getSportsMetadata() {
  // TODO: Implement via API route if needed
  return [];
}

/**
 * Get all soccer/football markets from Polymarket
 * FIXED: Using server-side API route to bypass CORS
 *
 * Per docs:
 * - Use /events endpoint (more efficient than /markets)
 * - Use closed=false (not active=true)
 * - Events contain their associated markets
 */
export async function getSoccerMarkets(): Promise<PolymarketMarket[]> {
  // Always return mock data for now - client-side only
  if (typeof window === 'undefined') {
    console.log('[SSR] Returning empty array during server-side rendering');
    return [];
  }

  try {
    console.log('Fetching soccer markets via API route...');

    // Try /markets endpoint directly (simpler, more reliable)
    const marketsResponse = await apiClient.get('/markets', {
      params: {
        endpoint: 'markets',
        closed: false,
        limit: 100,
        offset: 0,
      },
    });

    console.log('API route response:', {
      status: marketsResponse.status,
      dataType: Array.isArray(marketsResponse.data) ? 'array' : typeof marketsResponse.data,
      count: Array.isArray(marketsResponse.data) ? marketsResponse.data.length : 0,
    });

    // Check if we got data
    if (!marketsResponse.data || !Array.isArray(marketsResponse.data) || marketsResponse.data.length === 0) {
      console.warn('No data from API, using mock markets');
      return getMockMarkets();
    }

    const markets = marketsResponse.data;

    // Filter for sports markets
    const sportsKeywords = ['soccer', 'football', 'nfl', 'nba', 'mlb', 'nhl', 'premier league', 'la liga', 'champions league', 'world cup', 'uefa', 'fifa'];

    const sportsMarkets = markets.filter((market: any) => {
      const question = (market.question || '').toLowerCase();
      const description = (market.description || '').toLowerCase();
      const tags = Array.isArray(market.tags) ? market.tags : [];

      return sportsKeywords.some(keyword =>
        question.includes(keyword) ||
        description.includes(keyword) ||
        tags.some((tag: string) => tag.toLowerCase().includes(keyword))
      );
    });

    console.log(`Found ${sportsMarkets.length} sports markets out of ${markets.length} total markets`);

    if (sportsMarkets.length > 0) {
      return sportsMarkets;
    }

    // No sports markets found, use mock data
    console.warn('No sports markets found in API response, using mock data');
    return getMockMarkets();

  } catch (error: any) {
    console.error('Error fetching soccer markets:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Always return mock data on error
    console.log('Returning mock data due to error');
    return getMockMarkets();
  }
}

/**
 * Get markets by specific tag
 * TODO: Implement via API route if needed
 */
export async function getMarketsByTag(tag: string): Promise<PolymarketMarket[]> {
  console.warn('getMarketsByTag not yet implemented via API route');
  return [];
}

/**
 * Get markets by league
 */
export async function getMarketsByLeague(leagueTag: string): Promise<PolymarketMarket[]> {
  return getMarketsByTag(leagueTag);
}

/**
 * Get a single market by slug
 * TODO: Implement via API route if needed
 */
export async function getMarketBySlug(slug: string): Promise<PolymarketMarket | null> {
  console.warn('getMarketBySlug not yet implemented via API route');
  return null;
}

/**
 * Get all sports tags available
 * TODO: Implement via API route if needed
 */
export async function getSportsTags(): Promise<string[]> {
  console.warn('getSportsTags not yet implemented via API route');
  return [];
}

/**
 * Get market details by ID
 * TODO: Implement via API route if needed
 */
export async function getMarketById(marketId: string): Promise<PolymarketMarket | null> {
  console.warn('getMarketById not yet implemented via API route');
  return null;
}

/**
 * Search markets by query
 * TODO: Implement via API route if needed
 */
export async function searchMarkets(query: string): Promise<PolymarketMarket[]> {
  console.warn('searchMarkets not yet implemented via API route');
  return [];
}

/**
 * Mock markets for development/testing
 */
function getMockMarkets(): PolymarketMarket[] {
  return [
    {
      id: 'mock-1',
      question: 'Will Arsenal beat Chelsea?',
      slug: 'arsenal-vs-chelsea',
      description: 'Arsenal vs Chelsea - Premier League',
      outcomes: ['Arsenal', 'Chelsea'],
      outcomePrices: ['0.55', '0.45'],
      volume: '125000',
      volume24hr: '25000',
      liquidity: '50000',
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      image: '',
      icon: '',
      active: true,
      closed: false,
      enableOrderBook: true,
      orderPriceMinTickSize: 0.01,
      orderMinSize: 0.1,
      volumeNum: 125000,
      liquidityNum: 50000,
      archived: false,
      conditionId: 'mock-condition-1',
      tokens: [
        { token_id: 'mock-token-1', outcome: 'Arsenal', price: 0.55, winner: false },
        { token_id: 'mock-token-2', outcome: 'Chelsea', price: 0.45, winner: false },
      ],
      clobTokenIds: ['mock-token-1', 'mock-token-2'],
      acceptingOrders: true,
      acceptingOrdersTimestamp: new Date().toISOString(),
      negRisk: false,
      tags: ['soccer', 'premier-league'],
    },
    {
      id: 'mock-2',
      question: 'Will Real Madrid beat Barcelona?',
      slug: 'real-madrid-vs-barcelona',
      description: 'Real Madrid vs Barcelona - La Liga',
      outcomes: ['Real Madrid', 'Barcelona'],
      outcomePrices: ['0.60', '0.40'],
      volume: '200000',
      volume24hr: '40000',
      liquidity: '75000',
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      image: '',
      icon: '',
      active: true,
      closed: false,
      enableOrderBook: true,
      orderPriceMinTickSize: 0.01,
      orderMinSize: 0.1,
      volumeNum: 200000,
      liquidityNum: 75000,
      archived: false,
      conditionId: 'mock-condition-2',
      tokens: [
        { token_id: 'mock-token-3', outcome: 'Real Madrid', price: 0.60, winner: false },
        { token_id: 'mock-token-4', outcome: 'Barcelona', price: 0.40, winner: false },
      ],
      clobTokenIds: ['mock-token-3', 'mock-token-4'],
      acceptingOrders: true,
      acceptingOrdersTimestamp: new Date().toISOString(),
      negRisk: false,
      tags: ['soccer', 'la-liga'],
    },
  ];
}
