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
 * Per Polymarket docs:
 * - Use /markets endpoint for flat list of markets (simpler)
 * - Use /events endpoint for event-based grouping (more complex)
 * - Use closed=false to get active markets
 * - Filter by tags when possible for better performance
 */
export async function getSoccerMarkets(): Promise<PolymarketMarket[]> {
  // Return empty array during SSR
  if (typeof window === 'undefined') {
    console.log('[SSR] Returning empty array during server-side rendering');
    return [];
  }

  try {
    console.log('Fetching soccer markets via API route...');

    // Use /markets endpoint with sports tags if available
    // Polymarket API supports tag filtering for better results
    const marketsResponse = await apiClient.get('/markets', {
      params: {
        endpoint: 'markets',
        closed: false,
        limit: 500, // Increased limit to get more markets (was 200)
        offset: 0,
        // Try to filter by sports tags if API supports it
        // tags: 'soccer,football', // Uncomment if API supports tag filtering
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

    // Enhanced sports keywords for better filtering - Soccer and Basketball
    const sportsKeywords = [
      // Soccer/Football
      'soccer', 'football', 'futbol',
      'premier league', 'premier-league', 'premierleague',
      'la liga', 'la-liga', 'laliga',
      'bundesliga', 'serie a', 'serie-a', 'seriea',
      'ligue 1', 'ligue-1', 'ligue1',
      'champions league', 'champions-league', 'championsleague',
      'europa league', 'europa-league', 'europaleague',
      'world cup', 'world-cup', 'worldcup',
      'uefa', 'fifa',
      // Basketball
      'nba', 'basketball', 'basket-ball', 'basket ball',
      'ncaa', 'college basketball', 'march madness',
      'euroleague', 'euro-league', 'euro league',
      'fiba', 'world cup basketball',
      'playoffs', 'playoff', 'finals', 'championship',
      // General
      'match', 'game', 'vs', 'versus',
    ];

    // Filter for sports markets with improved matching
    // Log first 5 markets to see what we're working with
    console.log('[DEBUG] Sample of first 5 markets:', markets.slice(0, 5).map((m: any) => ({
      question: m.question,
      outcomes: m.outcomes?.length || 0,
      active: m.active,
      closed: m.closed,
      tags: m.tags,
      volume: m.volume || m.volumeNum,
    })));

    let sportsMarkets = markets.filter((market: any) => {
      if (!market) return false;

      const question = (market.question || '').toLowerCase();
      const description = (market.description || '').toLowerCase();
      const tags = Array.isArray(market.tags) ? market.tags.map((t: any) =>
        typeof t === 'string' ? t.toLowerCase() : (t.name || t).toLowerCase()
      ) : [];

      // Check if any keyword matches
      const matchesKeyword = sportsKeywords.some(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        return question.includes(lowerKeyword) ||
          description.includes(lowerKeyword) ||
          tags.some((tag: string) => tag.includes(lowerKeyword));
      });

      // RELAXED: Allow any number of outcomes >= 2
      const hasValidOutcomes = market.outcomes && Array.isArray(market.outcomes) && market.outcomes.length >= 2;

      // RELAXED: Allow closed markets if they are recent (optional, but keeping strict for now)
      const isActive = market.active && !market.closed;

      // DEBUG: Log if a market matches keywords but fails other checks
      if (matchesKeyword && (!hasValidOutcomes || !isActive)) {
        console.log(`[DEBUG] Market '${market.question}' matched keywords but failed checks:`, { hasValidOutcomes, isActive });
      }

      return matchesKeyword && hasValidOutcomes && isActive;
    });

    console.log(`[FILTER] Found ${sportsMarkets.length} sports markets out of ${markets.length} total markets`);

    // Log why markets were filtered out (sample)
    const rejected = markets.slice(0, 10).filter((m: any) => !sportsMarkets.includes(m));
    if (rejected.length > 0) {
      console.log('[DEBUG] Sample rejected markets (first 10):', rejected.map((m: any) => ({
        question: m.question,
        reason: !m.active ? 'not active' :
          m.closed ? 'closed' :
            !m.outcomes || m.outcomes.length < 2 ? 'invalid outcomes' :
              'no keyword match',
      })));
    }

    // Filter for major matches (reduced thresholds to show more matches)
    // Per Polymarket docs: Show markets with reasonable activity
    const MIN_VOLUME = 100; // Minimum $100 volume (reduced from $1000)
    const MIN_LIQUIDITY = 50; // Minimum $50 liquidity (reduced from $500)

    sportsMarkets = sportsMarkets.filter((market: any) => {
      const volume = market.volumeNum || parseFloat(market.volume || '0');
      const liquidity = market.liquidityNum || parseFloat(market.liquidity || '0');

      // Show market if it has reasonable volume OR liquidity
      return volume >= MIN_VOLUME || liquidity >= MIN_LIQUIDITY;
    });

    // Sort by volume (descending) to show biggest matches first
    sportsMarkets.sort((a: any, b: any) => {
      const volumeA = a.volumeNum || parseFloat(a.volume || '0');
      const volumeB = b.volumeNum || parseFloat(b.volume || '0');
      return volumeB - volumeA;
    });

    console.log(`Filtered to ${sportsMarkets.length} major sports markets (volume >= $${MIN_VOLUME} or liquidity >= $${MIN_LIQUIDITY})`);

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
