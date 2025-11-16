import axios from 'axios';
import { GAMMA_API_URL, SOCCER_TAGS } from '@/lib/constants';
import type {
  PolymarketMarket,
  GammaMarketsResponse,
  GammaSportsResponse
} from '@/types/polymarket';

const gammaClient = axios.create({
  baseURL: GAMMA_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

/**
 * Get all soccer/football markets from Polymarket
 * UPDATED: Fetch from a single endpoint for better performance
 */
export async function getSoccerMarkets(): Promise<PolymarketMarket[]> {
  try {
    // Fetch all active markets with soccer tag
    const response = await gammaClient.get<PolymarketMarket[]>('/markets', {
      params: {
        active: true,
        closed: false,
        limit: 100,
        tag: 'soccer', // Primary soccer tag
      },
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.warn('Gamma API returned invalid data format');
      return [];
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching soccer markets:', error);

    // Return mock data for development/testing
    if (process.env.NODE_ENV === 'development') {
      return getMockMarkets();
    }

    return [];
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
