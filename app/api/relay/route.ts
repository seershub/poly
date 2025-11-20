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

        // 3. Find RelayClient constructor
        // Per Polymarket SDK: The module uses default export, so RelayClient is in default
        // @ts-ignore - Dynamic module inspection
        let ClientConstructor: any = null;
        
        // Log module structure for debugging
        console.log('[Relayer] Module keys:', Object.keys(RelayerModule));
        if (RelayerModule.default) {
            console.log('[Relayer] Default export keys:', Object.keys(RelayerModule.default));
        }
        
        // Try named export first
        // @ts-ignore
        if (RelayerModule.RelayClient && typeof RelayerModule.RelayClient === 'function') {
            ClientConstructor = RelayerModule.RelayClient;
            console.log('[Relayer] Found RelayClient as named export');
        }
        // Try default export (most common case)
        else if (RelayerModule.default) {
            // @ts-ignore
            if (RelayerModule.default.RelayClient && typeof RelayerModule.default.RelayClient === 'function') {
                // @ts-ignore
                ClientConstructor = RelayerModule.default.RelayClient;
                console.log('[Relayer] Found RelayClient at default.RelayClient');
            }
            // Default export might be RelayClient itself
            // @ts-ignore
            else if (typeof RelayerModule.default === 'function') {
                // @ts-ignore
                ClientConstructor = RelayerModule.default;
                console.log('[Relayer] Found RelayClient as default export');
            }
        }

        // Brute force search if still not found
        if (!ClientConstructor || typeof ClientConstructor !== 'function') {
            console.log('[Relayer] Searching for RelayClient constructor in module exports...');
            for (const key in RelayerModule) {
                // @ts-ignore
                const exportVal = RelayerModule[key];
                if (typeof exportVal === 'function') {
                    // Check function name or key name
                    // @ts-ignore
                    if (exportVal.name === 'RelayClient' || key === 'RelayClient') {
                        console.log(`[Relayer] Found RelayClient at RelayerModule.${key}`);
                        ClientConstructor = exportVal;
                        break;
                    }
                }
                // Search inside default object
                if (key === 'default' && typeof exportVal === 'object' && exportVal !== null) {
                    for (const subKey in exportVal) {
                        // @ts-ignore
                        const subExport = exportVal[subKey];
                        if (typeof subExport === 'function') {
                            // @ts-ignore
                            if (subExport.name === 'RelayClient' || subKey === 'RelayClient') {
                                console.log(`[Relayer] Found RelayClient at RelayerModule.default.${subKey}`);
                                ClientConstructor = subExport;
                                break;
                            }
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

        // 4. Create a wallet for RelayClient constructor
        // Note: Polymarket Relayer uses the user's proxy wallet for actual execution
        // The wallet here is just for constructor initialization - Relayer handles actual signing
        // Per Polymarket docs: RelayClient requires a Wallet or Signer, but Relayer uses proxy wallet for execution
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        // Create a random wallet for constructor (Relayer uses user's proxy wallet for actual execution)
        // This wallet is only used for constructor initialization, not for signing transactions
        const wallet = ethers.Wallet.createRandom().connect(provider);

        // 5. Initialize Builder Config
        // Per Polymarket docs: Support both remote and local builder credentials
        // Priority: Remote signing server (more secure) > Local credentials
        const signingServerUrl = process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL;
        
        let builderConfig;
        if (signingServerUrl) {
            // Use remote signing server (RECOMMENDED - more secure)
            // Ensure URL ends with /sign if not already
            const signingUrl = signingServerUrl.endsWith('/sign') 
                ? signingServerUrl 
                : `${signingServerUrl.replace(/\/$/, '')}/sign`;
            console.log('[Relayer] Using remote builder signing server:', signingUrl);
            builderConfig = new BuilderConfig({
                remoteBuilderConfig: { url: signingUrl },
            });
        } else {
            // Use local credentials (fallback)
            console.log('[Relayer] Using local builder credentials');
            const builderCreds = {
                key: apiKey,
                secret: secret,
                passphrase: passphrase,
            };
            builderConfig = new BuilderConfig({
                localBuilderCreds: builderCreds,
            });
        }

        // 6. Initialize Relay Client
        // Per Polymarket docs: RelayClient(relayerUrl, chainId, wallet, builderConfig)
        const relayerUrl = process.env.NEXT_PUBLIC_POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com';
        const chainId = 137; // Polygon mainnet

        // @ts-ignore - Dynamic constructor
        const client = new ClientConstructor(
            relayerUrl,
            chainId,
            wallet,
            builderConfig
        );

        // Debug: Log all available methods on the client
        console.log('[Relayer] Client instance created. Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)).filter(name => name !== 'constructor'));
        console.log('[Relayer] Client instance keys:', Object.keys(client));

        console.log('[Relayer] Executing transactions:', {
            transactionCount: transactions?.length,
            metadata,
            userAddress
        });

        // 7. Check if Safe wallet is deployed, deploy if not
        // Per Polymarket docs: Safe wallet must be deployed before executing transactions
        let safeDeployed = false;
        if (typeof client.getDeployed === 'function') {
            try {
                const deployed = await client.getDeployed();
                safeDeployed = !!deployed;
                console.log('[Relayer] Safe wallet deployment status:', { deployed: safeDeployed, address: deployed });
            } catch (error) {
                console.log('[Relayer] Could not check Safe deployment status:', error);
            }
        }

        // Deploy Safe wallet if not deployed
        if (!safeDeployed) {
            console.log('[Relayer] Safe wallet not deployed. Deploying now...');
            if (typeof client.deploy === 'function') {
                try {
                    const deployResponse = await client.deploy();
                    const deployResult = await deployResponse.wait();
                    if (deployResult && deployResult.proxyAddress) {
                        console.log('[Relayer] Safe wallet deployed successfully:', {
                            transactionHash: deployResult.transactionHash,
                            safeAddress: deployResult.proxyAddress
                        });
                        safeDeployed = true;
                    } else {
                        throw new Error('Safe deployment failed - no proxy address returned');
                    }
                } catch (deployError: any) {
                    console.error('[Relayer] Failed to deploy Safe wallet:', deployError);
                    throw new Error(`Safe wallet deployment failed: ${deployError.message || 'Unknown error'}`);
                }
            } else {
                throw new Error('Safe wallet not deployed and deploy method not available');
            }
        }

        // 8. Execute transactions
        // Per Polymarket docs: Use execute method for Safe transactions
        let response;
        if (typeof client.execute === 'function') {
            console.log('[Relayer] Using execute method');
            response = await client.execute(
                transactions,
                metadata || 'Gasless transaction'
            );
        } else if (typeof client.executeSafeTransactions === 'function') {
            console.log('[Relayer] Using executeSafeTransactions method');
            response = await client.executeSafeTransactions(
                transactions,
                metadata || 'Gasless transaction'
            );
        } else if (typeof client.executeTransactions === 'function') {
            console.log('[Relayer] Using executeTransactions method');
            response = await client.executeTransactions(
                transactions,
                metadata || 'Gasless transaction'
            );
        } else {
            // List all available methods for debugging
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
                .filter(name => typeof client[name] === 'function' && name !== 'constructor');
            throw new Error(`No execute method found. Available methods: ${methods.join(', ')}`);
        }

        console.log('[Relayer] Transaction submitted, waiting for confirmation...');
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
