import { NextRequest, NextResponse } from 'next/server';
import { fetchKalshiMarkets, createKalshiOrder } from '@/lib/kalshi/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');

        const markets = await fetchKalshiMarkets('sports', limit);
        return NextResponse.json(markets);
    } catch (error: any) {
        console.error('Error in Kalshi markets API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticker, side, count } = body;

        if (!ticker || !side || !count) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await createKalshiOrder(ticker, side, count);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error in Kalshi order API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
