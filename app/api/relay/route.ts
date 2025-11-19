import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { transactions, metadata } = body;

        // 1. Get Builder Credentials
        const apiKey = process.env.POLY_BUILDER_API_KEY;
        const secret = process.env.POLY_BUILDER_SECRET;
        const passphrase = process.env.POLY_BUILDER_PASSPHRASE;

        if (!apiKey || !secret || !passphrase) {
            return NextResponse.json({ error: 'Builder credentials not configured on server' }, { status: 500 });
        }

        // 2. Prepare request to Relayer
        const relayerUrl = 'https://relayer-v2.polymarket.com';
        const endpoint = '/execute';
        const fullUrl = `${relayerUrl}${endpoint}`;

        // 3. Create request body
        const requestBody = {
            transactions,
            metadata: metadata || 'Transaction via Relayer'
        };

        const bodyString = JSON.stringify(requestBody);

        // 4. Generate HMAC signature for Builder Authentication
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const method = 'POST';

        // Signature format: timestamp + method + endpoint + body
        const secretBuffer = Buffer.from(secret, 'base64');
        const message = `${timestamp}${method}${endpoint}${bodyString}`;
        const signature = crypto.createHmac('sha256', secretBuffer).update(message).digest('base64');

        const headers = {
            'Content-Type': 'application/json',
            'POLY-BUILDER-API-KEY': apiKey,
            'POLY-BUILDER-TIMESTAMP': timestamp,
            'POLY-BUILDER-SIGNATURE': signature,
            'POLY-BUILDER-PASSPHRASE': passphrase,
        };

        console.log('[Relayer Proxy] Sending request:', {
            url: fullUrl,
            method,
            timestamp,
            transactionCount: transactions?.length
        });

        // 5. Forward to Relayer
        const response = await axios.post(fullUrl, requestBody, { headers });

        console.log('[Relayer Proxy] Success:', response.data);

        return NextResponse.json(response.data);

    } catch (error: any) {
        console.error('[Relayer Proxy] Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        return NextResponse.json(
            {
                error: error.response?.data?.message || error.message || 'Relayer request failed',
                details: error.response?.data
            },
            { status: error.response?.status || 500 }
        );
    }
}
