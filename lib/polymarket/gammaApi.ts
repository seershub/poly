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
});

/**
 * Get all soccer/football markets from Polymarket
 */
export async function getSoccerMarkets(): Promise<PolymarketMarket[]> {
  try {
    const allMarkets: PolymarketMarket[] = [];

    // Fetch markets for each soccer tag
    for (const tag of SOCCER_TAGS) {
      const markets = await getMarketsByTag(tag);
      allMarkets.push(...markets);
    }

    // Remove duplicates based on market ID
    const uniqueMarkets = Array.from(
      new Map(allMarkets.map(market => [market.id, market])).values()
    );

    // Filter only active markets
    return uniqueMarkets.filter(market => market.active && !market.closed);
  } catch (error) {
    console.error('Error fetching soccer markets:', error);
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

    return response.data || [];
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
    return response.data || [];
  } catch (error) {
    console.error(`Error searching markets for "${query}":`, error);
    return [];
  }
}
