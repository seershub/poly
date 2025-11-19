import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { POLYMARKET_RELAYER_URL } from '@/lib/constants';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { method, path, data } = body;

        // 1. Get Builder Credentials
        const apiKey = process.env.POLY_BUILDER_API_KEY;
        const secret = process.env.POLY_BUILDER_SECRET;
        const passphrase = process.env.POLY_BUILDER_PASSPHRASE;

        if (!apiKey || !secret || !passphrase) {
            return NextResponse.json({ error: 'Builder credentials not configured on server' }, { status: 500 });
        }

        // 2. Construct URL
        // Use the V2 URL from constants, ensure no trailing slash
        const relayerUrl = (POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com').replace(/\/$/, '');
        // Ensure path starts with /
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const fullUrl = `${relayerUrl}${cleanPath}`;

        // 3. Generate Headers for Builder Authentication
        const timestamp = Math.floor(Date.now() / 1000);

        // Manual signature generation
        // Format: base64(hmac-sha256(timestamp + method + path + body, base64_decode(secret)))
        const secretBuffer = Buffer.from(secret, 'base64');
        const message = `${timestamp}${method}${cleanPath}${JSON.stringify(data)}`;
        const signature = crypto.createHmac('sha256', secretBuffer).update(message).digest('base64');

        const headers = {
            'Content-Type': 'application/json',
            'POLY-BUILDER-API-KEY': apiKey,
            'POLY-BUILDER-TIMESTAMP': timestamp.toString(),
            'POLY-BUILDER-SIGNATURE': signature,
            'POLY-BUILDER-PASSPHRASE': passphrase,
        };

        console.log('[Relayer Proxy] Forwarding request:', {
            url: fullUrl,
            method,
            timestamp,
            apiKey: apiKey.substring(0, 5) + '...',
        });

        // 4. Forward Request
        const response = await axios({
            method,
            url: fullUrl,
            data,
            headers,
        });

        return NextResponse.json(response.data);

    } catch (error: any) {
        console.error('[Relayer Proxy] Error:', error.response?.data || error.message);
        return NextResponse.json(
            { error: error.response?.data?.message || error.message || 'Relayer request failed' },
            { status: error.response?.status || 500 }
        );
    }
}
