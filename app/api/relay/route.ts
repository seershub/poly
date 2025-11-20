import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

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

        // 2. Dynamic import using namespace pattern (same as lib/polymarket/relayerClient.ts)
        // Per Polymarket docs: Use namespace import to handle both CommonJS and ESM exports
        const RelayerModule = await import('@polymarket/builder-relayer-client');
        const SigningModule = await import('@polymarket/builder-signing-sdk');
        
        // Get BuilderConfig from module (handle both named and default exports)
        // @ts-ignore - Dynamic module inspection
        let BuilderConfig = SigningModule.BuilderConfig;
        
        if (!BuilderConfig || typeof BuilderConfig !== 'function') {
            // @ts-ignore
            if (SigningModule.default) {
                // @ts-ignore
                BuilderConfig = SigningModule.default.BuilderConfig || SigningModule.default;
            }
        }
        
        // Brute force search for BuilderConfig if still not found
        if (typeof BuilderConfig !== 'function') {
            console.log('[Relayer] Searching for BuilderConfig constructor in module exports...');
            for (const key in SigningModule) {
                // @ts-ignore
                const exportVal = SigningModule[key];
                if (typeof exportVal === 'function' && (exportVal.name === 'BuilderConfig' || key === 'BuilderConfig')) {
                    console.log(`[Relayer] Found BuilderConfig at SigningModule.${key}`);
                    BuilderConfig = exportVal;
                    break;
                }
                // Search inside default
                if (key === 'default' && typeof exportVal === 'object' && exportVal !== null) {
                    for (const subKey in exportVal) {
                        // @ts-ignore
                        const subExport = exportVal[subKey];
                        if (typeof subExport === 'function' && (subExport.name === 'BuilderConfig' || subKey === 'BuilderConfig')) {
                            console.log(`[Relayer] Found BuilderConfig at SigningModule.default.${subKey}`);
                            BuilderConfig = subExport;
                            break;
                        }
                    }
                }
            }
        }

        // 3. Find RelayClient constructor (same pattern as lib/polymarket/relayerClient.ts)
        // @ts-ignore - Dynamic module inspection
        let ClientConstructor = RelayerModule.RelayClient;

        if (!ClientConstructor || typeof ClientConstructor !== 'function') {
            // @ts-ignore
            if (RelayerModule.default) {
                // @ts-ignore
                ClientConstructor = RelayerModule.default.RelayClient || RelayerModule.default;
            }
        }

        // Brute force search for RelayClient if still not found
        if (typeof ClientConstructor !== 'function') {
            console.log('[Relayer] Searching for RelayClient constructor in module exports...');
            for (const key in RelayerModule) {
                // @ts-ignore
                const exportVal = RelayerModule[key];
                if (typeof exportVal === 'function' && (exportVal.name === 'RelayClient' || key === 'RelayClient')) {
                    console.log(`[Relayer] Found RelayClient at RelayerModule.${key}`);
                    ClientConstructor = exportVal;
                    break;
                }
                // Search inside default
                if (key === 'default' && typeof exportVal === 'object' && exportVal !== null) {
                    for (const subKey in exportVal) {
                        // @ts-ignore
                        const subExport = exportVal[subKey];
                        if (typeof subExport === 'function' && (subExport.name === 'RelayClient' || subKey === 'RelayClient')) {
                            console.log(`[Relayer] Found RelayClient at RelayerModule.default.${subKey}`);
                            ClientConstructor = subExport;
                            break;
                        }
                    }
                }
            }
        }

        // Validate constructor
        if (typeof ClientConstructor !== 'function') {
            const moduleKeys = Object.keys(RelayerModule).join(', ');
            console.error('[Relayer] Failed to resolve RelayClient constructor. Module keys:', moduleKeys);
            throw new Error(`RelayClient is not a constructor. Module keys: ${moduleKeys}`);
        }

        // Validate BuilderConfig
        if (typeof BuilderConfig !== 'function') {
            throw new Error('BuilderConfig is not a constructor');
        }

        console.log('[Relayer] SDK loaded successfully:', {
            hasRelayClient: typeof ClientConstructor === 'function',
            hasBuilderConfig: typeof BuilderConfig === 'function',
            relayClientName: ClientConstructor.name || 'anonymous'
        });

        // 4. Create a signer for RelayClient constructor
        // Note: Polymarket Relayer uses the user's proxy wallet for actual execution
        // The signer here is just for constructor initialization - Relayer handles actual signing
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        // Use userAddress if provided, otherwise use a placeholder address
        // VoidSigner is a read-only signer that can't sign but satisfies the constructor
        const signerAddress = userAddress || ethers.Wallet.createRandom().address;
        const signer = new ethers.VoidSigner(signerAddress, provider);

        // 5. Initialize Builder Config
        // Per Polymarket docs: BuilderConfig with localBuilderCreds
        const builderCreds = {
            key: apiKey,
            secret: secret,
            passphrase: passphrase,
        };
        const builderConfig = new BuilderConfig({
            localBuilderCreds: builderCreds,
        });

        // 6. Initialize Relay Client
        // Per Polymarket docs: RelayClient(relayerUrl, chainId, wallet, builderConfig)
        const relayerUrl = process.env.NEXT_PUBLIC_POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com';
        const chainId = 137; // Polygon mainnet

        // @ts-ignore - Dynamic constructor
        const client = new ClientConstructor(
            relayerUrl,
            chainId,
            signer,
            builderConfig
        );

        console.log('[Relayer] Executing transactions:', {
            transactionCount: transactions?.length,
            metadata,
            userAddress
        });

        // 7. Execute transactions
        // Per Polymarket docs: Use executeSafeTransactions for Safe transactions
        // The transactions array contains SafeTransaction objects
        const response = await client.executeSafeTransactions(
            transactions,
            metadata || 'Gasless transaction'
        );

        console.log('[Relayer] Waiting for confirmation...');
        const result = await response.wait();

        console.log('[Relayer] Success:', {
            transactionID: result?.transactionID,
            transactionHash: result?.transactionHash,
            state: result?.state,
            proxyAddress: result?.proxyAddress
        });

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
