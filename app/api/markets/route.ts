import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Use environment variable if available, otherwise use default
const GAMMA_API_URL = process.env.NEXT_PUBLIC_GAMMA_API_URL || 'https://gamma-api.polymarket.com';

/**
 * Server-side API route to fetch markets from Polymarket Gamma API
 * This bypasses CORS issues when calling from the browser
 *
 * Per Polymarket docs:
 * - /events endpoint returns events with nested markets
 * - /markets endpoint returns flat list of markets
 * - Use /markets for simpler market listing
 * - Use /events for event-based grouping
 *
 * GET /api/markets
 * Query params:
 * - closed: boolean (default: false)
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - endpoint: 'events' | 'markets' (default: 'markets')
 * - tags: comma-separated tags for filtering (e.g., 'soccer,football')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Get query parameters
    const closed = searchParams.get('closed') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const endpoint = searchParams.get('endpoint') || 'markets'; // Default to 'markets' for simpler response
    const tags = searchParams.get('tags'); // Optional tag filtering

    console.log('[API Route] Fetching from Gamma API:', { endpoint, closed, limit, offset, tags });

    // Build request params according to Polymarket API docs
    const params: Record<string, any> = {
      closed,
      limit,
      offset,
    };

    // Add tags if provided (for /markets endpoint)
    if (tags && endpoint === 'markets') {
      params.tags = tags;
    }

    // For events endpoint, add ordering
    if (endpoint === 'events') {
      params.order = 'id';
      params.ascending = false;
    }

    // Fetch from Gamma API
    const response = await axios.get(`${GAMMA_API_URL}/${endpoint}`, {
      params,
      timeout: 20000, // 20 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    let markets: any[] = [];

    // Handle different response structures
    if (endpoint === 'events') {
      // Events endpoint returns array of events, each with nested markets
      const events = Array.isArray(response.data) ? response.data : [];
      // Extract all markets from all events
      markets = events.flatMap((event: any) => {
        if (event.markets && Array.isArray(event.markets)) {
          return event.markets;
        }
        return [];
      });
      console.log('[API Route] Extracted markets from events:', {
        eventsCount: events.length,
        marketsCount: markets.length,
      });
    } else {
      // Markets endpoint returns flat array of markets
      markets = Array.isArray(response.data) ? response.data : [];
    }

    console.log('[API Route] Gamma API response:', {
      status: response.status,
      endpoint,
      marketsCount: markets.length,
      dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
    });

    // Return markets array
    return NextResponse.json(markets, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });

  } catch (error: any) {
    console.error('[API Route] Error fetching from Gamma API:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
    });

    // Return empty array instead of error so client can use mock data
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}
