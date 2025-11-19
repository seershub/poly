import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { RelayClient, OperationType, SafeTransaction } from '@polymarket/builder-relayer-client';
import { BuilderApiKeyCreds, BuilderConfig } from '@polymarket/builder-signing-sdk';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { transactions, metadata, userAddress } = body;

        // 1. Get Builder Credentials
        const apiKey = process.env.POLY_BUILDER_API_KEY;
        const secret = process.env.POLY_BUILDER_SECRET;
        const passphrase = process.env.POLY_BUILDER_PASSPHRASE;

        if (!apiKey || !secret || !passphrase) {
            return NextResponse.json({ error: 'Builder credentials not configured on server' }, { status: 500 });
        }

        // 2. Create a server-side wallet (this is just for SDK initialization, not for signing user transactions)
        // The SDK uses this wallet only for Builder authentication
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

        // Create a random wallet - it's only used for SDK initialization
        // The actual transactions are executed on the user's Safe wallet
        const serverWallet = ethers.Wallet.createRandom().connect(provider);

        // 3. Initialize Builder Config
        const builderCreds: BuilderApiKeyCreds = {
            key: apiKey,
            secret: secret,
            passphrase: passphrase,
        };

        const builderConfig = new BuilderConfig({
            localBuilderCreds: builderCreds
        });

        // 4. Initialize Relay Client
        const relayerUrl = process.env.NEXT_PUBLIC_POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com';
        const chainId = 137; // Polygon mainnet

        const client = new RelayClient(relayerUrl, chainId, serverWallet, builderConfig);

        console.log('[Relayer Proxy] Executing transactions via SDK:', {
            transactionCount: transactions?.length,
            metadata,
            userAddress
        });

        // 5. Execute transactions
        // The SDK will handle all the complex request building, signing, and submission
        const response = await client.execute(transactions, metadata || 'Transaction via Relayer');

        console.log('[Relayer Proxy] Transaction submitted. Waiting for confirmation...');
        const result = await response.wait();

        console.log('[Relayer Proxy] Transaction confirmed:', result);

        return NextResponse.json({
            transactionID: result?.transactionID,
            transactionHash: result?.transactionHash,
            state: result?.state,
            proxyAddress: result?.proxyAddress
        });

    } catch (error: any) {
        console.error('[Relayer Proxy] Error:', {
            message: error.message,
            stack: error.stack
        });

        return NextResponse.json(
            { error: error.message || 'Relayer request failed' },
            { status: 500 }
        );
    }
}
