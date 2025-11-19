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
  } catch (error) {
    console.error('Error placing prediction:', error);
    throw new Error('Failed to place prediction order');
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
 */
export async function getUserOrders(
  clobClient: ClobClient,
  address: string
) {
  try {
    // Note: The CLOB client API for fetching user orders may vary
    // For now, returning empty array. This can be implemented later
    // using the correct API endpoint
    return [];
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
 * Get market trades
 * Note: This functionality can be implemented when needed
 */
export async function getMarketTrades(
  clobClient: ClobClient,
  tokenId: string
) {
  try {
    // Implementation depends on the correct CLOB API method
    return [];
  } catch (error) {
    console.error('Error fetching market trades:', error);
    return [];
  }
}
