import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

/**
 * Server-side API route to fetch markets from Polymarket Gamma API
 * This bypasses CORS issues when calling from the browser
 *
 * GET /api/markets
 * Query params:
 * - closed: boolean (default: false)
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const closed = searchParams.get('closed') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const endpoint = searchParams.get('endpoint') || 'events'; // 'events' or 'markets'

    console.log('[API Route] Fetching from Gamma API:', { endpoint, closed, limit, offset });

    // Try /events endpoint first (recommended by Polymarket docs)
    const response = await axios.get(`${GAMMA_API_URL}/${endpoint}`, {
      params: {
        closed,
        limit,
        offset,
        ...(endpoint === 'events' && {
          order: 'id',
          ascending: false,
        }),
      },
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('[API Route] Gamma API response:', {
      status: response.status,
      dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
      count: Array.isArray(response.data) ? response.data.length : 0,
    });

    // Return the raw data from Gamma API
    return NextResponse.json(response.data, {
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
    });

    // Return error with appropriate status code
    return NextResponse.json(
      {
        error: 'Failed to fetch markets',
        message: error.message,
        details: error.response?.data,
      },
      { status: error.response?.status || 500 }
    );
  }
}
