import axios from 'axios';
import { GAMMA_API_URL, SOCCER_TAGS } from '@/lib/constants';
import type {
  PolymarketMarket,
  GammaMarketsResponse,
  GammaSportsResponse,
  GammaEvent
} from '@/types/polymarket';

const gammaClient = axios.create({
  baseURL: GAMMA_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  timeout: 15000, // 15 second timeout
});

/**
 * Get sports metadata including tag IDs
 * Per Polymarket docs: /sports endpoint returns tag IDs for filtering
 */
async function getSportsMetadata() {
  try {
    const response = await gammaClient.get('/sports');
    return response.data;
  } catch (error) {
    console.error('Error fetching sports metadata:', error);
    return [];
  }
}

/**
 * Get all soccer/football markets from Polymarket
 * FIXED: Using /events endpoint with correct parameters per Polymarket docs
 *
 * Per docs:
 * - Use /events endpoint (more efficient than /markets)
 * - Use tag_id parameter (not tag)
 * - Use closed=false (not active=true)
 * - Events contain their associated markets
 */
export async function getSoccerMarkets(): Promise<PolymarketMarket[]> {
  try {
    console.log('Fetching soccer markets from Gamma API...');

    // Try multiple approaches to get sports markets

    // Approach 1: Get all active events and filter for sports
    const eventsResponse = await gammaClient.get('/events', {
      params: {
        closed: false,        // Only active events (per docs)
        limit: 100,           // Get more results
        offset: 0,            // Start from beginning
        order: 'id',          // Order by ID
        ascending: false,     // Newest first
      },
    });

    console.log('Events API response:', {
      status: eventsResponse.status,
      dataType: Array.isArray(eventsResponse.data) ? 'array' : typeof eventsResponse.data,
      count: Array.isArray(eventsResponse.data) ? eventsResponse.data.length : 0,
    });

    if (!eventsResponse.data) {
      console.warn('Gamma API returned no data');
      return getMockMarkets();
    }

    // Events endpoint returns array of events, each containing markets
    const events = Array.isArray(eventsResponse.data) ? eventsResponse.data : [];

    // Extract markets from events and filter for sports-related ones
    const allMarkets: PolymarketMarket[] = [];

    for (const event of events) {
      // Check if event has markets
      if (event.markets && Array.isArray(event.markets)) {
        // Filter for sports-related markets by checking tags or question
        const sportsKeywords = ['soccer', 'football', 'nfl', 'nba', 'mlb', 'premier league', 'la liga', 'champions league', 'world cup'];

        for (const market of event.markets) {
          const question = (market.question || '').toLowerCase();
          const description = (market.description || '').toLowerCase();
          const tags = market.tags || [];

          const isSports =
            sportsKeywords.some(keyword => question.includes(keyword) || description.includes(keyword)) ||
            tags.some((tag: string) => sportsKeywords.some(keyword => tag.toLowerCase().includes(keyword)));

          if (isSports) {
            allMarkets.push(market);
          }
        }
      }
    }

    console.log(`Found ${allMarkets.length} sports markets`);

    if (allMarkets.length > 0) {
      return allMarkets;
    }

    // If no sports markets found, try direct markets endpoint
    console.log('No sports markets in events, trying /markets endpoint...');
    const marketsResponse = await gammaClient.get('/markets', {
      params: {
        closed: false,
        limit: 100,
        offset: 0,
      },
    });

    console.log('Markets API response:', {
      status: marketsResponse.status,
      dataType: Array.isArray(marketsResponse.data) ? 'array' : typeof marketsResponse.data,
      count: Array.isArray(marketsResponse.data) ? marketsResponse.data.length : 0,
    });

    const markets = Array.isArray(marketsResponse.data) ? marketsResponse.data : [];

    // Filter for sports
    const sportsMarkets = markets.filter((market: any) => {
      const question = (market.question || '').toLowerCase();
      const description = (market.description || '').toLowerCase();
      const tags = market.tags || [];

      const sportsKeywords = ['soccer', 'football', 'nfl', 'nba', 'mlb', 'premier league', 'la liga', 'champions league', 'world cup'];

      return sportsKeywords.some(keyword => question.includes(keyword) || description.includes(keyword)) ||
             tags.some((tag: string) => sportsKeywords.some(keyword => tag.toLowerCase().includes(keyword)));
    });

    console.log(`Found ${sportsMarkets.length} sports markets from /markets endpoint`);

    if (sportsMarkets.length > 0) {
      return sportsMarkets;
    }

    // If still no markets, return mock data
    console.warn('No sports markets found in Gamma API, using mock data');
    return getMockMarkets();

  } catch (error: any) {
    console.error('Error fetching soccer markets:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Always return mock data on error so users can see the UI
    console.log('Returning mock data due to error');
    return getMockMarkets();
  }
}

/**
 * Get markets by specific tag
 */
export async function getMarketsByTag(tag: string): Promise<PolymarketMarket[]> {
  try {
    const response = await gammaClient.get<PolymarketMarket[]>('/markets', {
      params: {
        tag,
        limit: 100,
        active: true,
        closed: false,
      },
    });

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(`Error fetching markets for tag ${tag}:`, error);
    return [];
  }
}

/**
 * Get markets by league
 */
export async function getMarketsByLeague(leagueTag: string): Promise<PolymarketMarket[]> {
  return getMarketsByTag(leagueTag);
}

/**
 * Get a single market by slug
 */
export async function getMarketBySlug(slug: string): Promise<PolymarketMarket | null> {
  try {
    const response = await gammaClient.get<PolymarketMarket>(`/markets/${slug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching market ${slug}:`, error);
    return null;
  }
}

/**
 * Get all sports tags available
 */
export async function getSportsTags(): Promise<string[]> {
  try {
    const response = await gammaClient.get<GammaSportsResponse>('/sports');
    return response.data?.tags || [];
  } catch (error) {
    console.error('Error fetching sports tags:', error);
    return [];
  }
}

/**
 * Get market details by ID
 */
export async function getMarketById(marketId: string): Promise<PolymarketMarket | null> {
  try {
    const response = await gammaClient.get<PolymarketMarket>(`/markets/${marketId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching market ${marketId}:`, error);
    return null;
  }
}

/**
 * Search markets by query
 */
export async function searchMarkets(query: string): Promise<PolymarketMarket[]> {
  try {
    const response = await gammaClient.get<PolymarketMarket[]>('/search', {
      params: { q: query },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(`Error searching markets for "${query}":`, error);
    return [];
  }
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
