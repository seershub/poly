import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { RelayClient } from '@polymarket/builder-relayer-client';
import { BuilderConfig } from '@polymarket/builder-signing-sdk';
import { POLYMARKET_RELAYER_URL, POLYGON_CHAIN_ID } from '@/lib/constants';

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

        // 2. Initialize Provider and Wallet
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const wallet = ethers.Wallet.createRandom().connect(provider);

        // 3. Initialize Relay Client
        const builderConfig = new BuilderConfig({
            localBuilderCreds: {
                key: apiKey,
                secret: secret,
                passphrase: passphrase,
            }
        });

        const relayerUrl = POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com';
        const client = new RelayClient(relayerUrl, POLYGON_CHAIN_ID, wallet, builderConfig);

        console.log('[Relayer Proxy] Executing transactions via SDK:', {
            count: transactions.length,
            metadata
        });

        // 4. Execute Transactions
        // We use 'execute' which should exist on the client
        // We pass the transactions array which should contain the User's signature in the 'signatures' field
        const response = await client.execute(transactions, metadata);

        console.log('[Relayer Proxy] Transaction submitted. Waiting for confirmation...');
        const result = await response.wait();

        console.log('[Relayer Proxy] Transaction confirmed:', result);

        return NextResponse.json({
            transactionHash: result?.transactionHash,
            state: result?.state,
            result: result
        });

    } catch (error: any) {
        console.error('[Relayer Proxy] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Relayer request failed' },
            { status: 500 }
        );
    }
}
