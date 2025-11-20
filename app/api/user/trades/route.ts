import { NextRequest, NextResponse } from 'next/server';
import { getPrivyUserAddress, getPrivyUserId, verifyPrivyToken } from '@/lib/privy/auth';
import { getProxyWalletAddress } from '@/lib/polymarket/proxyWallet';
import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';
import { ethers } from 'ethers';

/**
 * Get user trades from Polymarket
 * Per Polymarket docs: Trades are stored on-chain and can be queried via CLOB API
 * 
 * Query params:
 * - userId: Privy DID (did:privy:...) - optional, will be extracted from token if not provided
 * 
 * Headers:
 * - Authorization: Bearer <Privy JWT token> (optional, can also use cookie)
 * 
 * Returns:
 * - trades: Array of user trades
 * - userId: Privy user ID (DID format)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userIdParam = searchParams.get('userId');

    // Try to get user address from Privy token
    let userAddress: string | null = null;
    let userId: string | null = userIdParam;

    try {
      const authHeader = request.headers.get('authorization');
      const cookies = request.headers.get('cookie');
      
      if (authHeader) {
        const user = await verifyPrivyToken(authHeader);
        userAddress = user.address;
        userId = user.userId;
      } else if (cookies) {
        const cookieMatch = cookies.match(/privy-token=([^;]+)/);
        if (cookieMatch) {
          const user = await verifyPrivyToken(cookieMatch[1]);
          userAddress = user.address;
          userId = user.userId;
        }
      }
    } catch (error) {
      console.log('[API] Could not verify Privy token:', error);
    }

    // Fallback: Try userAddress query param
    if (!userAddress) {
      const userAddressParam = searchParams.get('userAddress') as `0x${string}` | null;
      if (userAddressParam && ethers.utils.isAddress(userAddressParam)) {
        userAddress = userAddressParam;
      }
    }

    if (!userAddress) {
      return NextResponse.json(
        { 
          trades: [],
          userId: userId || null,
          error: 'userAddress is required. Provide via Privy token or userAddress query param'
        },
        { status: 200 }
      );
    }

    // Get Safe wallet address (proxy wallet)
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
    const publicClient = createPublicClient({
      chain: polygon,
      transport: http(rpcUrl),
    });
    
    const proxyWalletAddress = await getProxyWalletAddress(userAddress as `0x${string}`, publicClient);

    // NOTE: To get trades, we need API credentials which require a wallet signer
    // In server-side API route, we can't use walletClient directly
    // For now, return empty array - client-side should use hooks instead
    // TODO: In future, store API credentials in database or use server-side signing
    
    return NextResponse.json({
      trades: [],
      userId: userId || null,
      eoaAddress: userAddress,
      proxyWalletAddress: proxyWalletAddress || null,
      message: 'Use client-side hooks for trade fetching. Server-side requires wallet signer.',
    });
  } catch (error: any) {
    console.error('[API] Error getting user trades:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

