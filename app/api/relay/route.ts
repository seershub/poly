import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * Polymarket Relayer API Route
 * 
 * Per Polymarket Builder Program docs: https://docs.polymarket.com/developers/builders/builder-intro
 * 
 * This endpoint handles gasless transactions via Polymarket's Polygon Relayer.
 * Polymarket pays for gas fees when using Safe Wallets.
 * 
 * POST /api/relay
 * Body: {
 *   transactions: SafeTransaction[],
 *   metadata?: string,
 *   userAddress: string (EOA address - required for Safe wallet identification)
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { transactions, metadata, userAddress } = body;

        // Validate input
        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            return NextResponse.json(
                { error: 'transactions array is required' },
                { status: 400 }
            );
        }

        if (!userAddress || !ethers.utils.isAddress(userAddress)) {
            return NextResponse.json(
                { error: 'Valid userAddress is required' },
                { status: 400 }
            );
        }

        // 1. Get Builder Credentials
        // Per Polymarket docs: Builder credentials are required for relayer access
        const apiKey = process.env.POLY_BUILDER_API_KEY;
        const secret = process.env.POLY_BUILDER_SECRET;
        const passphrase = process.env.POLY_BUILDER_PASSPHRASE;

        if (!apiKey || !secret || !passphrase) {
            return NextResponse.json(
                { error: 'Builder credentials not configured. POLY_BUILDER_API_KEY, SECRET, and PASSPHRASE are required.' },
                { status: 500 }
            );
        }

        // 2. Import SDK modules
        // Per Polymarket docs: Use dynamic imports for server-side compatibility
        const RelayerModule = await import('@polymarket/builder-relayer-client');
        const SigningModule = await import('@polymarket/builder-signing-sdk');

        // 3. Find RelayClient constructor
        // Per Polymarket SDK: RelayClient is exported as named export
        let RelayClient: any = null;
        
        if (RelayerModule.RelayClient && typeof RelayerModule.RelayClient === 'function') {
            RelayClient = RelayerModule.RelayClient;
        } else if (RelayerModule.default?.RelayClient) {
            RelayClient = RelayerModule.default.RelayClient;
        } else if (typeof RelayerModule.default === 'function') {
            RelayClient = RelayerModule.default;
        }

        if (!RelayClient || typeof RelayClient !== 'function') {
            const moduleKeys = Object.keys(RelayerModule).join(', ');
            return NextResponse.json(
                { error: `RelayClient constructor not found. Module keys: ${moduleKeys}` },
                { status: 500 }
            );
        }

        // 4. Find BuilderConfig constructor
        let BuilderConfig: any = null;
        
        if (SigningModule.BuilderConfig && typeof SigningModule.BuilderConfig === 'function') {
            BuilderConfig = SigningModule.BuilderConfig;
        } else if (SigningModule.default?.BuilderConfig) {
            BuilderConfig = SigningModule.default.BuilderConfig;
        } else if (typeof SigningModule.default === 'function') {
            BuilderConfig = SigningModule.default;
        }

        if (!BuilderConfig || typeof BuilderConfig !== 'function') {
            return NextResponse.json(
                { error: 'BuilderConfig constructor not found' },
                { status: 500 }
            );
        }

        // 5. Create provider and wallet
        // Per Polymarket docs: RelayClient needs a Signer/Wallet
        // SDK uses wallet.address to identify the Safe wallet for the user
        const chainId = 137; // Polygon mainnet
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
        const network = ethers.providers.getNetwork(chainId);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);

        // CRITICAL: Create a wallet with user's address
        // Per Polymarket docs: SDK uses wallet.address to find the Safe wallet
        // We create a minimal signer that satisfies SDK requirements
        // Signing is handled by Builder credentials, not the wallet itself
        const wallet = {
            address: userAddress,
            provider: provider,
            getAddress: () => Promise.resolve(userAddress),
            // @ts-ignore - SDK compatibility
            _isSigner: true,
        } as any;

        // 6. Initialize Builder Config
        // Per Polymarket docs: Support both remote and local builder credentials
        const signingServerUrl = process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL;
        
        let builderConfig;
        if (signingServerUrl) {
            // Remote signing server (RECOMMENDED)
            const signingUrl = signingServerUrl.endsWith('/sign') 
                ? signingServerUrl 
                : `${signingServerUrl.replace(/\/$/, '')}/sign`;
            
            builderConfig = new BuilderConfig({
                remoteBuilderConfig: { url: signingUrl },
            });
        } else {
            // Local credentials
            builderConfig = new BuilderConfig({
                localBuilderCreds: {
                    key: apiKey,
                    secret: secret,
                    passphrase: passphrase,
                },
            });
        }

        // 7. Initialize Relay Client
        // Per Polymarket docs: RelayClient(relayerUrl, chainId, wallet, builderConfig)
        const relayerUrl = process.env.NEXT_PUBLIC_POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com';
        
        const client = new RelayClient(
            relayerUrl,
            chainId,
            wallet,
            builderConfig
        );

        console.log('[Relayer] Client initialized:', {
            relayerUrl,
            chainId,
            userAddress,
            hasRemoteSigning: !!signingServerUrl,
        });

        // 8. Check and deploy Safe wallet if needed
        // Per Polymarket docs: Safe wallet must be deployed before executing transactions
        let safeAddress: string | null = null;
        
        try {
            // Check if Safe is deployed
            if (typeof client.getDeployed === 'function') {
                safeAddress = await client.getDeployed();
            }
        } catch (error: any) {
            // Safe not deployed yet - this is OK for first-time users
            console.log('[Relayer] Safe wallet not deployed yet:', error.message);
        }

        // Deploy Safe wallet if not deployed
        if (!safeAddress) {
            console.log('[Relayer] Deploying Safe wallet for user:', userAddress);
            
            if (typeof client.deploy === 'function') {
                const deployResponse = await client.deploy();
                const deployResult = await deployResponse.wait();
                
                if (deployResult?.proxyAddress) {
                    safeAddress = deployResult.proxyAddress;
                    console.log('[Relayer] Safe wallet deployed:', {
                        transactionHash: deployResult.transactionHash,
                        safeAddress: safeAddress,
                    });
                } else {
                    throw new Error('Safe deployment failed - no proxy address returned');
                }
            } else {
                throw new Error('deploy method not available on RelayClient');
            }
        } else {
            console.log('[Relayer] Safe wallet already deployed:', safeAddress);
        }

        // 9. Execute transactions
        // Per Polymarket docs: Use execute method for Safe transactions
        let response;
        
        if (typeof client.execute === 'function') {
            response = await client.execute(transactions, metadata || 'Gasless transaction');
        } else if (typeof client.executeSafeTransactions === 'function') {
            // @ts-ignore - Method exists but may not be in type definitions
            response = await client.executeSafeTransactions(transactions, metadata || 'Gasless transaction');
        } else {
            throw new Error('No execute method found on RelayClient');
        }

        // 10. Wait for transaction confirmation
        console.log('[Relayer] Transaction submitted, waiting for confirmation...');
        const result = await response.wait();

        console.log('[Relayer] Transaction confirmed:', {
            transactionID: result?.transactionID,
            transactionHash: result?.transactionHash,
            state: result?.state,
            proxyAddress: result?.proxyAddress || safeAddress,
        });

        return NextResponse.json({
            transactionID: result?.transactionID,
            transactionHash: result?.transactionHash,
            state: result?.state,
            proxyAddress: result?.proxyAddress || safeAddress,
        });

    } catch (error: any) {
        console.error('[Relayer] Error:', {
            message: error.message,
            stack: error.stack,
        });

        return NextResponse.json(
            { 
                error: error.message || 'Relayer request failed',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
