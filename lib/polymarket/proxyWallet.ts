/**
 * Polymarket Proxy Wallet Integration
 * 
 * Per Polymarket docs: https://docs.polymarket.com/developers/proxy-wallet
 * 
 * When a user first uses Polymarket to trade, a 1 of 1 multisig is deployed to Polygon
 * which is controlled/owned by the accessing EOA (either MetaMask wallet or MagicLink wallet).
 * This proxy wallet is where all the user's positions (ERC1155) and USDC (ERC20) are held.
 * 
 * Using proxy wallets allows Polymarket to provide an improved UX where:
 * - Multi-step transactions can be executed atomically
 * - Transactions can be relayed by relayers on the gas station network
 */

import { type Address, type WalletClient, type PublicClient, getAddress } from 'viem';
import { POLYMARKET_GNOSIS_SAFE_FACTORY, POLYMARKET_PROXY_FACTORY } from '@/lib/constants';

// Gnosis Safe Factory ABI (simplified - for proxy wallet lookup)
// Per PolygonScan: Polymarket uses computeProxyAddress(user) instead of getAddress
const GNOSIS_SAFE_FACTORY_ABI = [
  {
    name: 'computeProxyAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/**
 * Check if a proxy wallet exists for the given EOA address
 * Per Polymarket docs: Each user has their own proxy wallet address
 * 
 * @param eoaAddress - The EOA (Externally Owned Account) address (MetaMask/MagicLink)
 * @param publicClient - Viem public client for contract reads
 * @returns The proxy wallet address if it exists, null otherwise
 */
export async function getProxyWalletAddress(
  eoaAddress: Address,
  publicClient: PublicClient
): Promise<Address | null> {
  try {
    // Per Polymarket docs: Proxy wallets are deployed via factory contracts
    // We need to check both factories (Gnosis Safe for MetaMask, Polymarket Proxy for MagicLink)
    
    console.log('Checking for proxy wallet:', { eoaAddress });
    
    // For MetaMask users: Check Gnosis Safe Factory
    // Per Polymarket docs: Gnosis Safe Factory creates 1 of 1 multisig for MetaMask users
    try {
      // Per PolygonScan: Polymarket's Safe Proxy Factory uses computeProxyAddress(user)
      // This is simpler than the standard Gnosis Safe Factory getAddress function
      const predictedAddress = await publicClient.readContract({
        address: POLYMARKET_GNOSIS_SAFE_FACTORY,
        abi: GNOSIS_SAFE_FACTORY_ABI,
        functionName: 'computeProxyAddress',
        args: [eoaAddress], // user: the EOA address that will own the proxy
      });

      // Check if contract exists at predicted address
      const code = await publicClient.getBytecode({ address: predictedAddress });
      if (code && code !== '0x') {
        console.log('Found Gnosis Safe proxy wallet:', predictedAddress);
        return predictedAddress;
      }
    } catch (error) {
      console.log('Gnosis Safe Factory check failed (may not exist yet):', error);
    }

    // For MagicLink users: Check Polymarket Proxy Factory
    // TODO: Implement Polymarket Proxy Factory lookup when ABI is available
    
    // If no proxy wallet found, return null
    console.log('No proxy wallet found for:', eoaAddress);
    return null;
  } catch (error) {
    console.error('Error checking proxy wallet:', error);
    return null;
  }
}

/**
 * Deploy a proxy wallet for the user via Polymarket Relayer
 * Per Polymarket docs: Use Relayer Client for gasless Safe Wallet deployment
 * 
 * @param eoaAddress - The EOA address that will own the proxy wallet
 * @param walletClient - Wagmi wallet client for contract writes
 * @param walletType - 'metamask' uses Gnosis Safe, 'magiclink' uses Polymarket Proxy
 * @returns The deployed proxy wallet address
 */
export async function deployProxyWallet(
  eoaAddress: Address,
  walletClient: WalletClient,
  walletType: 'metamask' | 'magiclink' = 'metamask'
): Promise<Address> {
  try {
    console.log('Deploying proxy wallet via Polymarket Relayer:', { eoaAddress, walletType });
    
    // Per Polymarket docs: Use Relayer Client for gasless Safe Wallet deployment
    // This is the recommended approach as Polymarket pays for gas fees
    try {
      const { deploySafeWalletViaRelayer } = await import('./relayerClient');
      const safeAddress = await deploySafeWalletViaRelayer(walletClient);
      console.log('Safe Wallet deployed via Relayer:', safeAddress);
      return safeAddress as Address;
    } catch (relayerError) {
      console.warn('Relayer deployment failed, falling back to direct deployment:', relayerError);
      
      // Fallback: Direct factory deployment (user pays gas)
      // Per Polymarket docs:
      // - MetaMask users: Use Gnosis Safe Factory (0xaacfeea03eb1561c4e67d661e40682bd20e3541b)
      // - MagicLink users: Use Polymarket Proxy Factory (0xaB45c54AB0c941a2F231C04C3f49182e1A254052)
      
      const factoryAddress = walletType === 'metamask' 
        ? POLYMARKET_GNOSIS_SAFE_FACTORY 
        : POLYMARKET_PROXY_FACTORY;
      
      // TODO: Implement direct factory deployment if relayer is not available
      throw new Error('Proxy wallet deployment via Relayer failed. Please ensure builder credentials are configured. Fallback direct deployment not yet implemented.');
    }
    
  } catch (error) {
    console.error('Error deploying proxy wallet:', error);
    throw error;
  }
}

/**
 * Get or create a proxy wallet for the user
 * Per Polymarket docs: Proxy wallets are created automatically on first use
 * 
 * @param eoaAddress - The EOA address
 * @param publicClient - Viem public client for reads
 * @param walletClient - Wagmi wallet client for writes
 * @param walletType - Wallet type ('metamask' or 'magiclink')
 * @returns The proxy wallet address
 */
export async function ensureProxyWallet(
  eoaAddress: Address,
  publicClient: PublicClient,
  walletClient: WalletClient,
  walletType: 'metamask' | 'magiclink' = 'metamask'
): Promise<Address> {
  // Check if proxy wallet already exists
  const existingProxy = await getProxyWalletAddress(eoaAddress, publicClient);
  
  if (existingProxy) {
    console.log('Proxy wallet already exists:', existingProxy);
    return existingProxy;
  }
  
  // Deploy new proxy wallet
  console.log('No proxy wallet found, deploying new one...');
  return await deployProxyWallet(eoaAddress, walletClient, walletType);
}

/**
 * Check if an address is a proxy wallet
 * Per Polymarket docs: Proxy wallets are smart contracts deployed by factory contracts
 * 
 * @param address - Address to check
 * @param walletClient - Wagmi wallet client
 * @returns True if the address is a proxy wallet
 */
export async function isProxyWallet(
  address: Address,
  walletClient: WalletClient
): Promise<boolean> {
  try {
    // TODO: Implement proxy wallet detection
    // This would check if the address is a contract and if it's a known proxy wallet type
    // For now, we'll return false
    
    return false;
  } catch (error) {
    console.error('Error checking if address is proxy wallet:', error);
    return false;
  }
}

