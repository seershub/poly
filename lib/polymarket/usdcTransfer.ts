/**
 * USDC Transfer Functions
 * 
 * Per Polymarket docs: USDC must be in proxy wallet for trading
 * This module handles transferring USDC between EOA and proxy wallet
 */

import { type Address, type WalletClient, type PublicClient, parseUnits, formatUnits } from 'viem';
import { polygon } from 'viem/chains';
import { POLYGON_USDC_ADDRESS, USDC_DECIMALS } from '@/lib/constants';

// USDC ERC20 ABI (transfer functions)
const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/**
 * Deposit USDC from EOA to proxy wallet
 * Per Polymarket docs: USDC must be in proxy wallet for trading
 * 
 * @param walletClient - Wagmi wallet client
 * @param eoaAddress - EOA address (source)
 * @param proxyWalletAddress - Proxy wallet address (destination)
 * @param amount - Amount in USDC (e.g., "100.50")
 * @returns Transaction hash
 */
export async function depositUsdcToProxyWallet(
  walletClient: WalletClient,
  eoaAddress: Address,
  proxyWalletAddress: Address,
  amount: string
): Promise<string> {
  try {
    if (!walletClient) {
      throw new Error('Wallet client not available');
    }

    // Convert amount to USDC units (6 decimals)
    const amountInUnits = parseUnits(amount, USDC_DECIMALS);

    console.log('Depositing USDC to proxy wallet:', {
      from: eoaAddress,
      to: proxyWalletAddress,
      amount,
      amountInUnits: amountInUnits.toString(),
    });

    // Transfer USDC from EOA to proxy wallet
    // Note: walletClient already has account information, but we need to pass it explicitly
    const hash = await walletClient.writeContract({
      chain: polygon,
      account: walletClient.account,
      address: POLYGON_USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [proxyWalletAddress, amountInUnits],
    });

    console.log('USDC deposit transaction hash:', hash);
    return hash;
  } catch (error) {
    console.error('Error depositing USDC to proxy wallet:', error);
    throw error;
  }
}

/**
 * Withdraw USDC from proxy wallet to EOA
 * Per Polymarket docs: Users can withdraw USDC from proxy wallet back to EOA
 * 
 * Note: This requires the proxy wallet to execute a transaction
 * For now, this is a placeholder - full implementation would require
 * proxy wallet signature or relayer support
 * 
 * @param walletClient - Wagmi wallet client
 * @param proxyWalletAddress - Proxy wallet address (source)
 * @param eoaAddress - EOA address (destination)
 * @param amount - Amount in USDC (e.g., "100.50")
 * @returns Transaction hash
 */
export async function withdrawUsdcFromProxyWallet(
  walletClient: WalletClient,
  proxyWalletAddress: Address,
  eoaAddress: Address,
  amount: string
): Promise<string> {
  try {
    if (!walletClient) {
      throw new Error('Wallet client not available');
    }

    // Convert amount to USDC units (6 decimals)
    const amountInUnits = parseUnits(amount, USDC_DECIMALS);

    console.log('Withdrawing USDC from proxy wallet:', {
      from: proxyWalletAddress,
      to: eoaAddress,
      amount,
      amountInUnits: amountInUnits.toString(),
    });

    // TODO: Implement proxy wallet transaction execution
    // This would require:
    // 1. Creating a Safe transaction
    // 2. Signing it with the EOA (owner of the proxy wallet)
    // 3. Executing it via the proxy wallet
    
    // For now, throw an error indicating this needs to be implemented
    throw new Error('Withdraw from proxy wallet not yet implemented. This requires Safe wallet transaction execution.');
  } catch (error) {
    console.error('Error withdrawing USDC from proxy wallet:', error);
    throw error;
  }
}

/**
 * Get USDC balance for an address
 * 
 * @param publicClient - Viem public client
 * @param address - Address to check balance for
 * @returns Balance in USDC (formatted string, e.g., "100.50")
 */
export async function getUsdcBalance(
  publicClient: PublicClient,
  address: Address
): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: POLYGON_USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    // Convert from units to USDC (6 decimals)
    return formatUnits(balance, USDC_DECIMALS);
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return '0.00';
  }
}

