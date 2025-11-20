import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getProxyWalletAddress } from '@/lib/polymarket/proxyWallet';
import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';
import { getPrivyUserAddress, getPrivyUserId, verifyPrivyToken } from '@/lib/privy/auth';

/**
 * Get Safe wallet status for a Privy user
 * Per Polymarket docs: Safe wallet is tied to user's EOA address
 * 
 * Query params:
 * - userId: Privy DID (did:privy:...) - optional, will be extracted from token if not provided
 * 
 * Headers:
 * - Authorization: Bearer <Privy JWT token> (optional, can also use cookie)
 * 
 * Returns:
 * - safeWalletAddress: The Safe wallet address if deployed
 * - isDeployed: Whether the Safe wallet is deployed
 * - eoaAddress: The user's EOA address
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
      // Try to verify token and get user info
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
      console.log('[API] Could not verify Privy token, trying userId param:', error);
    }

    // If still no address, try to get from query param (fallback)
    if (!userAddress) {
      const userAddressParam = searchParams.get('userAddress') as `0x${string}` | null;
      if (userAddressParam && ethers.utils.isAddress(userAddressParam)) {
        userAddress = userAddressParam;
      }
    }

    if (!userAddress) {
      return NextResponse.json(
        { 
          error: 'userAddress is required. Provide via Privy token (Authorization header or cookie) or userAddress query param',
          safeWalletAddress: null,
          isDeployed: false,
          eoaAddress: null,
          userId: userId || null,
        },
        { status: 200 } // Return 200 with error in body (like matchr.xyz does)
      );
    }

    // Validate address format
    if (!ethers.utils.isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Create viem public client for contract reads
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
    const publicClient = createPublicClient({
      chain: polygon,
      transport: http(rpcUrl),
    });

    // Check Safe wallet deployment status
    // Per Polymarket docs: Use getProxyWalletAddress to check if deployed
    const safeWalletAddress = await getProxyWalletAddress(userAddress as `0x${string}`, publicClient);
    const isDeployed = safeWalletAddress !== null;

    return NextResponse.json({
      safeWalletAddress,
      isDeployed,
      eoaAddress: userAddress,
      userId: userId || null,
    });
  } catch (error: any) {
    console.error('[API] Error getting Safe wallet status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

