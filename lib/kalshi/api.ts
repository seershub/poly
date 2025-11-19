import axios from 'axios';
import type { ParsedMatch } from '@/types/match';

// Client-side interface for Kalshi API
// Calls our Next.js API routes to avoid exposing secrets or using Node.js modules in browser

export async function fetchKalshiMarkets(
    category: string = 'sports',
    limit: number = 50
): Promise<ParsedMatch[]> {
    try {
        const response = await axios.get('/api/kalshi', {
            params: { limit: limit.toString() }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching Kalshi markets:', error);
        return [];
    }
}

export async function createKalshiOrder(
    ticker: string,
    side: 'yes' | 'no',
    count: number
): Promise<any> {
    try {
        const response = await axios.post('/api/kalshi', {
            ticker,
            side,
            count
        });
        return response.data;
    } catch (error) {
        console.error('Error placing Kalshi order:', error);
        throw error;
    }
}
