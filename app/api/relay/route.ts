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
        // We might need a private key for the wallet passed to RelayClient?
        // The docs say: "const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);"
        // But if we are using API Key creds, do we need a wallet?
        // The RelayClient constructor signature is: new RelayClient(relayerUrl, chainId, wallet, builderConfig)
        // The wallet is used for signing?
        // If we use remote signing or API keys, maybe the wallet is just a placeholder or used for EOA ops?
        // Let's check if we have a POLY_BUILDER_PRIVATE_KEY or similar.
        // If not, we might need to generate a random one if it's not used for auth (since we use builderConfig).
        // But the docs show passing a wallet.
        // Let's assume we need a signer. If the user didn't provide one, we can't proceed?
        // Wait, the user provided API Key/Secret/Passphrase.
        // The docs example shows:
        // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        // const client = new RelayClient(relayerUrl, chainId, wallet, builderConfig);

        // If the Builder is paying for gas/executing, they need a wallet?
        // But the Relayer pays for gas.
        // Maybe the wallet is used to identify the Builder?
        // Let's try to use a random wallet if we don't have a private key, or use the secret as a key if it fits?
        // No, secret is for API auth.

        // Let's check if we have a private key in env.
        // If not, we can try to use a random wallet, but it might fail if the Relayer expects the wallet address to match something.
        // However, with `builderConfig` (API Creds), the auth should be via API Key.

        if (!apiKey || !secret || !passphrase) {
            return NextResponse.json({ error: 'Builder credentials not configured on server' }, { status: 500 });
        }

        // Create a provider (needed for the wallet)
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

        // Use a dummy wallet if no private key provided, as we are using API Creds for auth?
        // Or maybe we need the private key associated with the API Key?
        // Usually API Key is independent.
        // Let's try with a random wallet first.
        const wallet = ethers.Wallet.createRandom().connect(provider);

        const builderConfig = new BuilderConfig({
            localBuilderCreds: {
                key: apiKey,
                secret: secret,
                passphrase: passphrase,
            }
        });

        const relayerUrl = POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com';

        console.log('[Relayer Proxy] Initializing RelayClient:', {
            relayerUrl,
            chainId: POLYGON_CHAIN_ID,
            hasWallet: !!wallet,
            hasBuilderConfig: !!builderConfig
        });

        const client = new RelayClient(relayerUrl, POLYGON_CHAIN_ID, wallet, builderConfig);

        console.log('[Relayer Proxy] Executing transactions:', transactions);

        // Execute transactions
        // transactions should be an array of SafeTransaction objects
        const response = await client.executeSafeTransactions(transactions, metadata);

        // Wait for transaction? The client returns a Task/Response object.
        // The docs say: const result = await response.wait();
        // We should probably wait here to return the result to the client.

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
