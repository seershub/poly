/**
 * Privy Authentication Helper
 * 
 * Per Privy docs: https://docs.privy.io/guide/server/quickstart
 * 
 * Verify Privy JWT tokens in server-side API routes
 */

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmi2etaa501n3js0clqp3a5ri';
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || '4BH9Lob2UqL6mi5VEEH5azwqVTvXrGJSR8FY2dL8gE5qrpAG1J8g4cxuZh4BF47eV83Q9i4tCxZfqGFaV42k3hWj';

// JWKS client for verifying JWT tokens
const client = jwksClient({
  jwksUri: `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

/**
 * Get signing key for JWT verification
 */
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify Privy JWT token and extract user information
 * 
 * @param token - Privy JWT token from Authorization header or cookie
 * @returns Decoded token with user information
 */
export async function verifyPrivyToken(token: string): Promise<{
  userId: string;
  address: string | null;
  wallet: {
    address: string;
    chainType: string;
    walletClientType: string;
  } | null;
}> {
  return new Promise((resolve, reject) => {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    jwt.verify(
      cleanToken,
      getKey,
      {
        algorithms: ['ES256'],
        issuer: 'privy.io',
        audience: PRIVY_APP_ID,
      },
      (err, decoded: any) => {
        if (err) {
          return reject(new Error(`Invalid Privy token: ${err.message}`));
        }

        // Extract user information from token
        const userId = decoded.sub || decoded.userId; // DID format: did:privy:...
        const address = decoded.address || null;
        
        // Extract wallet information if available
        let wallet = null;
        if (decoded.wallet) {
          wallet = {
            address: decoded.wallet.address,
            chainType: decoded.wallet.chainType || 'EVM',
            walletClientType: decoded.wallet.walletClientType || 'privy',
          };
        }

        resolve({
          userId,
          address: address || wallet?.address || null,
          wallet,
        });
      }
    );
  });
}

/**
 * Get user address from Privy token or request
 * 
 * @param request - Next.js request object
 * @returns User's EOA address or null
 */
export async function getPrivyUserAddress(request: Request): Promise<string | null> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const user = await verifyPrivyToken(authHeader);
      return user.address;
    }

    // Try to get token from cookie
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const cookieMatch = cookies.match(/privy-token=([^;]+)/);
      if (cookieMatch) {
        const user = await verifyPrivyToken(cookieMatch[1]);
        return user.address;
      }
    }

    return null;
  } catch (error) {
    console.error('[Privy] Error getting user address:', error);
    return null;
  }
}

/**
 * Get Privy user ID from token or request
 * 
 * @param request - Next.js request object
 * @returns Privy user ID (DID format) or null
 */
export async function getPrivyUserId(request: Request): Promise<string | null> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const user = await verifyPrivyToken(authHeader);
      return user.userId;
    }

    // Try to get token from cookie
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const cookieMatch = cookies.match(/privy-token=([^;]+)/);
      if (cookieMatch) {
        const user = await verifyPrivyToken(cookieMatch[1]);
        return user.userId;
      }
    }

    return null;
  } catch (error) {
    console.error('[Privy] Error getting user ID:', error);
    return null;
  }
}

