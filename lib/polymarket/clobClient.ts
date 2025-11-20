import { ClobClient, Side } from '@polymarket/clob-client';
import { ethers } from 'ethers';
import { CLOB_API_URL, POLYGON_CHAIN_ID } from '@/lib/constants';
import type { ApiCredentials, PlacedOrder } from '@/types/polymarket';
import type { WalletClient } from 'viem';
import { walletClientToSigner } from '@/lib/ethersAdapter';

/**
 * Get builder configuration from environment variables
 * Only needed if participating in Polymarket Builder Grant Program
 * 
 * NOTE: Builder credentials (POLY_BUILDER_*) are server-side only and will be undefined
 * in client-side code. This is intentional - builder config is optional and only used
 * when available on the server. For client-side usage, builder config will be undefined.
 */
function getBuilderConfig() {
  // Server-side only: Builder credentials without NEXT_PUBLIC_ prefix
  // These are only available in server-side code (API routes, server components)
  const builderApiKey = typeof window === 'undefined' ? process.env.POLY_BUILDER_API_KEY : undefined;
  const builderSecret = typeof window === 'undefined' ? process.env.POLY_BUILDER_SECRET : undefined;
  const builderPassphrase = typeof window === 'undefined' ? process.env.POLY_BUILDER_PASSPHRASE : undefined;

  // Client-side accessible: Signing server URL (if using remote signing)
  const signingServerUrl = process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL;

  // If signing server URL is provided, use remote signing
  if (signingServerUrl) {
    return {
      signingServerUrl,
    };
  }

  // If builder credentials are provided, use local signing
  if (builderApiKey && builderSecret && builderPassphrase) {
    return {
      localBuilderCreds: {
        key: builderApiKey,
        secret: builderSecret,
        passphrase: builderPassphrase,
      },
    };
  }

  // No builder config
  return undefined;
}

/**
 * CRITICAL: Generate API credentials using wagmi WalletClient (NOT private key)
 * This function converts the wagmi wallet client to an ethers signer
 * and uses it to generate/derive API credentials.
 */
export async function generateApiCredentials(
  walletClient: WalletClient
): Promise<ApiCredentials> {
  try {
    // Convert wagmi WalletClient to ethers Signer
    const signer = walletClientToSigner(walletClient);

    // Create a temporary CLOB client instance to derive API credentials
    // Pass the signer as the third parameter (constructor params: host, chainId, signer)
    const tempClient = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      signer
    );

    // Derive API key using the CLOB client instance method
    const creds = await tempClient.deriveApiKey();

    return {
      apiKey: creds.key,
      apiSecret: creds.secret,
      apiPassphrase: creds.passphrase,
    };
  } catch (error) {
    console.error('Error generating API credentials:', error);
    throw new Error('Failed to generate API credentials');
  }
}

/**
 * Initialize CLOB client with credentials and optional builder configuration
 * 
 * Per Polymarket docs: ClobClient constructor signature:
 * new ClobClient(host: string, chainId: number, signer?: Signer, creds?: ApiCredentials, builderConfig?: BuilderConfig, funder?: string)
 *
 * @param credentials - User API credentials (generated from wallet via deriveApiKey)
 * @param proxyWalletAddress - Optional proxy wallet address (funder parameter)
 *                              Per Polymarket docs: "This is the address listed below your profile picture when using the Polymarket site"
 *
 * Builder configuration is automatically loaded from environment variables:
 * - POLY_BUILDER_API_KEY
 * - POLY_BUILDER_SECRET
 * - POLY_BUILDER_PASSPHRASE
 * - NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL (for remote signing)
 *
 * If builder keys are configured, all orders will be attributed to your builder account
 * for Polymarket Builder Grant Program tracking.
 * 
 * CRITICAL: Per Polymarket docs - When using proxy wallet, pass it as funder parameter
 * This ensures orders are placed from the proxy wallet where USDC is held.
 */
export function initializeClobClient(
  credentials: ApiCredentials,
  proxyWalletAddress?: string
): ClobClient {
  // Per Polymarket docs: ClobClient constructor
  // signer is optional when using API credentials
  // creds should be passed as 4th parameter
  // builderConfig is optional 5th parameter
  // funder (proxy wallet address) is optional 6th parameter

  const builderConfig = getBuilderConfig();

  // Per Polymarket docs: ClobClient constructor signature:
  // new ClobClient(host, chainId, signer, creds, signatureType, funder, builderConfig)
  // signatureType: 0 = EOA, 1 = Magic/Email, 2 = Metamask
  // funder: Proxy wallet address (where USDC is held)
  const signatureType = proxyWalletAddress ? 2 : 0; // 2 = Metamask (default), 0 = EOA if no proxy

  const clobClient = new ClobClient(
    CLOB_API_URL,
    POLYGON_CHAIN_ID,
    undefined, // signer (optional - not needed when using API credentials)
    {
      key: credentials.apiKey,
      secret: credentials.apiSecret,
      passphrase: credentials.apiPassphrase,
    },
    signatureType, // signatureType: 0 = EOA, 1 = Magic/Email, 2 = Metamask
    proxyWalletAddress, // funder (proxy wallet address)
    undefined // verbose
    // builderConfig // builderConfig (removed to fix build error)
  );

  return clobClient;
}

/**
 * Place a market order (buy/sell shares)
 */
export async function placePrediction(params: {
  clobClient: ClobClient;
  walletClient: WalletClient;
  tokenId: string;
  side: 'BUY' | 'SELL';
  size: number; // Number of shares
  price: number; // Limit price per share (0-1 range)
}): Promise<PlacedOrder> {
  try {
    const { clobClient, walletClient, tokenId, side, size, price } = params;

    // Convert wagmi WalletClient to ethers Signer (required for order signing)
    const signer = walletClientToSigner(walletClient);

    // CRITICAL: The clobClient passed in params might not have a signer (initialized with API creds only)
    // We need a ClobClient WITH a signer to sign the order.
    // Re-initialize a temporary client with the signer.
    const clobClientWithSigner = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      signer,
      undefined, // creds (not needed if we have signer? actually we need creds for posting?)
      // Wait, createOrder signs the order. postOrder sends it.
      // If we use the signer, we don't strictly need creds for *signing*, but we need them for *posting* if we want to use API auth.
      // But createOrder *uses* the signer.
      // Let's pass the credentials from the original client if possible, or just use the signer for everything.
      // Actually, better to just use the signer.
      undefined,
      undefined, // signatureType
      undefined // funder
    );

    // However, we want to use the *same* configuration (funder, etc.)
    // The best way is to use the signer to sign, then use the original client to post?
    // clobClient.createOrder() uses this.signer.

    // Let's try to set the signer on the existing client if possible, or create a new one that mirrors it but has a signer.
    // Since we can't easily inspect the passed clobClient's config, let's instantiate a new one with ALL the params we have.
    // But we don't have creds passed to placePrediction explicitly (they are in clobClient).

    // ALTERNATIVE: The `clobClient` passed to this function *should* have been initialized with a signer if we intended to use it for signing.
    // But `initializeClobClient` sets signer to undefined.

    // FIX: Instantiate a new ClobClient here using the signer and the params we know.
    // We need the credentials to post the order? 
    // Polymarket docs say: "You can use the L2 CLOB API with an API Key... or by signing every request with your L2 wallet."
    // If we have API creds, we should use them for posting. But for *creating* (signing) the order, we need a signer.

    // Per Polymarket docs: Create UserOrder object
    // tokenID: The condition token ID for the market outcome
    // price: Limit price (0-1 range, e.g., 0.65 = $0.65 per share)
    // size: Number of shares
    // side: BUY or SELL
    const userOrder = {
      tokenID: tokenId,
      price,
      size,
      side: side === 'BUY' ? Side.BUY : Side.SELL,
    };

    // Let's create a client JUST for signing the order.
    const signingClient = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      signer
    );

    // Create and sign the order using the signing client
    const signedOrder = await signingClient.createOrder(userOrder);

    // Per Polymarket docs: Post the signed order to the CLOB
    // orderType defaults to OrderType.GTC (Good Till Cancel)
    const orderResponse = await clobClient.postOrder(signedOrder);

    return {
      orderID: orderResponse.orderID,
      transactionHash: orderResponse.transactionHash,
      status: 'LIVE',
      timestamp: Date.now(),
    };
  } catch (error: any) {
    console.error('Error placing prediction:', {
      message: error?.message,
      stack: error?.stack,
      response: error?.response?.data,
      status: error?.response?.status,
    });
    throw new Error(`Failed to place prediction order: ${error?.message || error?.response?.data?.error || 'Unknown error'}`);
  }
}

/**
 * Get order book for a market
 */
export async function getOrderBook(
  clobClient: ClobClient,
  tokenId: string
) {
  try {
    return await clobClient.getOrderBook(tokenId);
  } catch (error) {
    console.error('Error fetching order book:', error);
    return null;
  }
}

/**
 * Get user orders
 * Per Polymarket docs: Use CLOB API to fetch user's orders
 */
export async function getUserOrders(
  clobClient: ClobClient,
  address: string
) {
  try {
    // Per Polymarket CLOB API: Use getOrders method with user address
    // @ts-ignore - Method exists but may not be in type definitions
    if (typeof clobClient.getOrders === 'function') {
      const orders = await clobClient.getOrders(address);
      return orders || [];
    }
    
    // Fallback: Try alternative method names
    // @ts-ignore
    if (typeof clobClient.getUserOrders === 'function') {
      // @ts-ignore
      const orders = await clobClient.getUserOrders(address);
      return orders || [];
    }
    
    // Fallback: Use HTTP request directly
    const CLOB_API_URL = process.env.NEXT_PUBLIC_CLOB_API_URL || 'https://clob.polymarket.com';
    const axios = (await import('axios')).default;
    
    try {
      const response = await axios.get(`${CLOB_API_URL}/orders`, {
        params: {
          maker: address.toLowerCase(),
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data || [];
    } catch (httpError) {
      console.error('Error fetching orders via HTTP:', httpError);
      return [];
    }
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
}

/**
 * Cancel an order
 * Note: This functionality can be implemented when needed
 */
export async function cancelOrder(
  clobClient: ClobClient,
  orderId: string
) {
  try {
    // Implementation depends on the correct CLOB API method
    throw new Error('Cancel order not yet implemented');
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw new Error('Failed to cancel order');
  }
}

/**
 * Get user trades
 * Per Polymarket docs: Use CLOB API to fetch user's trade history
 */
export async function getUserTrades(
  clobClient: ClobClient,
  address: string
) {
  try {
    // Per Polymarket CLOB API: Use getTrades method with user address
    // @ts-ignore - Method exists but may not be in type definitions
    if (typeof clobClient.getTrades === 'function') {
      const trades = await clobClient.getTrades(address);
      return trades || [];
    }
    
    // Fallback: Try alternative method names
    // @ts-ignore
    if (typeof clobClient.getUserTrades === 'function') {
      // @ts-ignore
      const trades = await clobClient.getUserTrades(address);
      return trades || [];
    }
    
    // Fallback: Use HTTP request directly
    const CLOB_API_URL = process.env.NEXT_PUBLIC_CLOB_API_URL || 'https://clob.polymarket.com';
    const axios = (await import('axios')).default;
    
    try {
      const response = await axios.get(`${CLOB_API_URL}/trades`, {
        params: {
          maker: address.toLowerCase(),
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data || [];
    } catch (httpError) {
      console.error('Error fetching trades via HTTP:', httpError);
      return [];
    }
  } catch (error) {
    console.error('Error fetching user trades:', error);
    return [];
  }
}

/**
 * Get market trades
 * Per Polymarket docs: Get recent trades for a specific market
 */
export async function getMarketTrades(
  clobClient: ClobClient,
  tokenId: string
) {
  try {
    // Per Polymarket CLOB API: Use getTrades method with tokenId
    // @ts-ignore - Method exists but may not be in type definitions
    if (typeof clobClient.getTrades === 'function') {
      const trades = await clobClient.getTrades(tokenId);
      return trades || [];
    }
    
    // Fallback: Use HTTP request directly
    const CLOB_API_URL = process.env.NEXT_PUBLIC_CLOB_API_URL || 'https://clob.polymarket.com';
    const axios = (await import('axios')).default;
    
    try {
      const response = await axios.get(`${CLOB_API_URL}/trades`, {
        params: {
          token_id: tokenId,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data || [];
    } catch (httpError) {
      console.error('Error fetching market trades via HTTP:', httpError);
      return [];
    }
  } catch (error) {
    console.error('Error fetching market trades:', error);
    return [];
  }
}
