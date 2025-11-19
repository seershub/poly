import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// CRITICAL: Dynamic import to avoid build-time issues
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { transactions, metadata, userAddress } = body;

        // 1. Get Builder Credentials
        const apiKey = process.env.POLY_BUILDER_API_KEY;
        const secret = process.env.POLY_BUILDER_SECRET;
        const passphrase = process.env.POLY_BUILDER_PASSPHRASE;

        if (!apiKey || !secret || !passphrase) {
            return NextResponse.json({ error: 'Builder credentials not configured' }, { status: 500 });
        }

        // 2. Dynamic import of SDK modules
        const { RelayClient } = await import('@polymarket/builder-relayer-client');
        const { BuilderConfig } = await import('@polymarket/builder-signing-sdk');

        // 3. Create server-side wallet
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const serverWallet = ethers.Wallet.createRandom().connect(provider);

        // 4. Initialize Builder Config
        const builderConfig = new BuilderConfig({
            localBuilderCreds: {
                key: apiKey,
                secret: secret,
                passphrase: passphrase,
            }
        });

        // 5. Initialize Relay Client
        const relayerUrl = process.env.NEXT_PUBLIC_POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com';
        const chainId = 137;

        const client = new RelayClient(relayerUrl, chainId, serverWallet, builderConfig);

        console.log('[Relayer] Executing transactions:', {
            transactionCount: transactions?.length,
            metadata,
            userAddress
        });

        // 6. Execute transactions
        const response = await client.execute(transactions, metadata || 'Gasless transaction');

        console.log('[Relayer] Waiting for confirmation...');
        const result = await response.wait();

        console.log('[Relayer] Success:', result);

        return NextResponse.json({
            transactionID: result?.transactionID,
            transactionHash: result?.transactionHash,
            state: result?.state,
            proxyAddress: result?.proxyAddress
        });

    } catch (error: any) {
        console.error('[Relayer] Error:', {
            message: error.message,
            stack: error.stack
        });

        return NextResponse.json(
            { error: error.message || 'Relayer request failed' },
            { status: 500 }
        );
    }
}
