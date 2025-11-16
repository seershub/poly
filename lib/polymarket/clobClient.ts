import { ClobClient, Side } from '@polymarket/clob-client';
import { ethers } from 'ethers';
import { CLOB_API_URL, POLYGON_CHAIN_ID } from '@/lib/constants';
import type { ApiCredentials, PlacedOrder } from '@/types/polymarket';
import type { WalletClient } from 'viem';
import { walletClientToSigner } from '@/lib/ethersAdapter';

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
    const signer = await walletClientToSigner(walletClient);

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
 * Initialize CLOB client with credentials
 */
export function initializeClobClient(credentials: ApiCredentials): ClobClient {
  // Constructor: (host, chainId, signer?, creds?, ...)
  // We pass undefined for signer and pass creds as the 4th parameter
  return new ClobClient(
    CLOB_API_URL,
    POLYGON_CHAIN_ID,
    undefined, // signer (optional)
    {
      key: credentials.apiKey,
      secret: credentials.apiSecret,
      passphrase: credentials.apiPassphrase,
    }
  );
}

/**
 * Place a market order (buy/sell shares)
 * CRITICAL: Uses 'size' (shares) NOT 'amount' (USDC)
 */
export async function placePrediction(params: {
  clobClient: ClobClient;
  walletClient: WalletClient;
  tokenId: string;
  side: 'BUY' | 'SELL';
  size: number; // Number of shares
  price: number; // Limit price (use current price for market order)
}): Promise<PlacedOrder> {
  try {
    const { clobClient, walletClient, tokenId, side, size, price } = params;

    // Convert wagmi WalletClient to ethers Signer
    const signer = walletClientToSigner(walletClient);

    // Create order (UserOrder type)
    const userOrder = {
      tokenID: tokenId,
      price,
      size,
      side: side === 'BUY' ? Side.BUY : Side.SELL,
    };

    // Create and sign the order
    const signedOrder = await clobClient.createOrder(userOrder);

    // Post the order to the CLOB
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
