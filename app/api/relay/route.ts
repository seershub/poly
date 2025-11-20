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
        // CRITICAL: Per Polymarket docs and lib/polymarket/relayerClient.ts pattern
        // SDK needs a Wallet/Signer with proper provider that has network config
        // The wallet address identifies the Safe wallet, but we use user's address
        if (!userAddress) {
            throw new Error('User address is required for Safe wallet operations');
        }
        
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
        const chainId = 137; // Polygon mainnet
        
        // CRITICAL: Per Polymarket SDK and lib/polymarket/relayerClient.ts pattern
        // SDK uses viem internally, but accepts ethers Signer
        // The signer must have a provider with proper network config
        // We need to create a signer that matches the pattern in relayerClient.ts
        
        // Create provider with network configuration
        const network = ethers.providers.getNetwork(chainId);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
        
        // CRITICAL: SDK internally uses viem which expects provider.config
        // But ethers provider doesn't have config. We need to create a compatible signer
        // Per lib/polymarket/relayerClient.ts: walletClientToSigner creates Web3Provider from window.ethereum
        // But in server-side, we don't have window.ethereum
        // Solution: Create a JsonRpcSigner-like object that SDK can use
        
        // Create a wallet with user's address
        // SDK uses wallet.address to identify Safe wallet
        // We create a random wallet and override address to user's EOA
        const tempWallet = ethers.Wallet.createRandom();
        const wallet = tempWallet.connect(provider);
        
        // Override address to user's EOA (SDK uses this to find Safe wallet)
        // @ts-ignore - Overriding read-only property for SDK compatibility
        Object.defineProperty(wallet, 'address', {
            value: userAddress,
            writable: false,
            configurable: true,
        });
        
        // CRITICAL: SDK expects provider to have config property (viem format)
        // Add config to provider for SDK compatibility
        // @ts-ignore - Adding config property for SDK compatibility
        if (!provider.config) {
            // @ts-ignore
            provider.config = {
                chain: {
                    id: chainId,
                    name: 'polygon',
                    network: 'polygon',
                    nativeCurrency: {
                        name: 'MATIC',
                        symbol: 'MATIC',
                        decimals: 18,
                    },
                    rpcUrls: {
                        default: {
                            http: [rpcUrl],
                        },
                    },
                },
            };
        }
        
        console.log('[Relayer] Wallet created for user:', {
            userAddress,
            walletAddress: wallet.address,
            providerNetwork: provider.network?.chainId,
            // @ts-ignore - config is added dynamically for SDK compatibility
            providerHasConfig: !!(provider as any).config
        });

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
        // Note: chainId is already defined above (line 155)
        const relayerUrl = process.env.NEXT_PUBLIC_POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com';

        // @ts-ignore - Dynamic constructor
        const client = new ClientConstructor(
            relayerUrl,
            chainId, // Use chainId from line 155
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

        // 7. Get expected Safe wallet address and check if deployed
        // Per Polymarket docs: Safe wallet address is deterministic from EOA address
        let expectedSafeAddress: string | null = null;
        if (typeof client.getExpectedSafe === 'function') {
            try {
                expectedSafeAddress = await client.getExpectedSafe();
                console.log('[Relayer] Expected Safe wallet address:', expectedSafeAddress);
            } catch (error) {
                console.log('[Relayer] Could not get expected Safe address:', error);
            }
        }

        // Check if Safe wallet is deployed, deploy if not
        // Per Polymarket docs: Safe wallet must be deployed before executing transactions
        // CRITICAL: getDeployed() uses wallet.address internally, which we've set to userAddress
        let safeDeployed = false;
        let deployedAddress: string | null = null;
        if (typeof client.getDeployed === 'function') {
            try {
                // getDeployed() uses wallet.address to find the Safe wallet
                // We've set wallet.address = userAddress, so this should work
                const deployed = await client.getDeployed();
                deployedAddress = deployed;
                safeDeployed = !!deployed && deployed !== null && deployed !== '0x0000000000000000000000000000000000000000';
                console.log('[Relayer] Safe wallet deployment status:', { 
                    deployed: safeDeployed, 
                    address: deployed,
                    expectedAddress: expectedSafeAddress,
                    userAddress: userAddress,
                    walletAddress: wallet.address // Should match userAddress
                });
            } catch (error: any) {
                // getDeployed might fail if Safe is not deployed yet - this is OK
                console.log('[Relayer] Safe wallet not deployed yet (this is OK for first-time users):', error.message || error);
                safeDeployed = false;
                deployedAddress = null;
            }
        }

        // Deploy Safe wallet if not deployed
        if (!safeDeployed) {
            console.log('[Relayer] Safe wallet not deployed. Deploying now for user:', userAddress);
            if (typeof client.deploy === 'function') {
                try {
                    const deployResponse = await client.deploy();
                    const deployResult = await deployResponse.wait();
                    if (deployResult && deployResult.proxyAddress) {
                        console.log('[Relayer] Safe wallet deployed successfully:', {
                            transactionHash: deployResult.transactionHash,
                            safeAddress: deployResult.proxyAddress,
                            userEOA: userAddress,
                            matchesExpected: deployResult.proxyAddress.toLowerCase() === expectedSafeAddress?.toLowerCase()
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
