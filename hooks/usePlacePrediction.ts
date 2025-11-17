'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWalletClient,
  useWaitForTransactionReceipt,
  useChainId,
  usePublicClient,
} from 'wagmi';
import { parseUnits } from 'viem';
import { POLYGON_USDC_ADDRESS, POLYMARKET_CLOB_ADDRESS, USDC_DECIMALS, POLYGON_CHAIN_ID } from '@/lib/constants';
import { placePrediction, initializeClobClient } from '@/lib/polymarket/clobClient';
import { useApiCredentials } from './useApiCredentials';
import { useProxyWallet } from './useProxyWallet';
import type { PredictionParams } from '@/types/match';

// USDC ERC20 ABI (approve function)
const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/**
 * Hook to place a prediction (buy/sell shares)
 * CRITICAL: Handles USDC approval before placing order
 */
export function usePlacePrediction() {
  const { address, chain } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { credentials } = useApiCredentials();
  const { proxyWalletAddress, hasProxyWallet } = useProxyWallet();
  const queryClient = useQueryClient();

  // CRITICAL: Check if connected to Polygon network
  const isPolygon = chainId === POLYGON_CHAIN_ID || chain?.id === POLYGON_CHAIN_ID;

  // CRITICAL: Per Polymarket docs - USDC is held in proxy wallet, NOT in EOA
  // "This proxy wallet is where all the user's positions (ERC1155) and USDC (ERC20) are held."
  // Check balance from proxy wallet address, not EOA address
  const balanceAddress = proxyWalletAddress || address; // Use proxy wallet if available, fallback to EOA
  
  // Get USDC balance from proxy wallet (or EOA if proxy doesn't exist yet)
  // Per Polymarket docs: Must be on Polygon network
  const { data: balance, refetch: refetchBalance, isLoading: isLoadingBalance } = useBalance({
    address: balanceAddress,
    token: POLYGON_USDC_ADDRESS,
    query: {
      enabled: !!balanceAddress && isPolygon, // Only fetch when address is available AND on Polygon
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Get USDC allowance for CLOB contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: POLYGON_USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address && [address, POLYMARKET_CLOB_ADDRESS],
  });

  // Write contract hook for approval
  const {
    writeContract: approveUsdc,
    data: approvalTxHash,
  } = useWriteContract();

  // Wait for approval transaction
  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
  });

  // Main prediction mutation
  const mutation = useMutation({
    mutationFn: async (params: PredictionParams) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      // CRITICAL: Check if on Polygon network (per Polymarket docs)
      if (!isPolygon) {
        throw new Error(`Please switch to Polygon network (Chain ID: ${POLYGON_CHAIN_ID}). Current chain: ${chainId || chain?.id || 'unknown'}`);
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      if (!credentials) {
        throw new Error('API credentials not generated. Please generate credentials first.');
      }

      const { tokenId, side, size, price } = params;

      // Calculate required USDC (cost = shares * price)
      // Per Polymarket docs: cost = size (shares) * price per share
      const cost = size * price;
      
      // Convert cost to USDC units (6 decimals)
      // Per Polymarket docs: Use parseUnits with proper decimal precision
      const requiredUsdc = parseUnits(cost.toFixed(USDC_DECIMALS), USDC_DECIMALS);

      // CRITICAL: Per Polymarket docs - USDC is in proxy wallet, not EOA
      // Ensure proxy wallet exists before checking balance
      if (!hasProxyWallet || !proxyWalletAddress) {
        throw new Error('Proxy wallet not found. Please ensure your proxy wallet is created. This should happen automatically when you connect your wallet.');
      }

      // CRITICAL: Force refetch balance from proxy wallet to ensure we have latest data
      // Per Polymarket docs: Always check balance before placing order
      console.log('Refetching USDC balance from proxy wallet...', { 
        eoaAddress: address, 
        proxyWalletAddress, 
        isPolygon, 
        chainId 
      });
      const { data: refreshedBalance, error: balanceError } = await refetchBalance();
      
      const currentBalance = refreshedBalance || balance;

      console.log('Checking USDC balance from proxy wallet (per Polymarket docs):', {
        cost,
        requiredUsdc: requiredUsdc.toString(),
        balance: currentBalance ? currentBalance.value.toString() : 'null',
        formatted: currentBalance?.formatted,
        symbol: currentBalance?.symbol,
        proxyWalletAddress,
        eoaAddress: address,
        chainId,
        isPolygon,
        balanceError: balanceError?.message,
      });

      // Check USDC balance - per Polymarket requirements
      if (!currentBalance) {
        if (balanceError) {
          throw new Error(`Failed to fetch USDC balance from proxy wallet: ${balanceError.message}. Please ensure you are connected to Polygon network and have USDC in your proxy wallet (${proxyWalletAddress}).`);
        }
        throw new Error(`USDC balance not loaded from proxy wallet (${proxyWalletAddress}). Please ensure you are connected to Polygon network (Chain ID: 137) and have USDC in your proxy wallet. Note: USDC must be in your proxy wallet, not your EOA address.`);
      }

      const balanceValue = BigInt(currentBalance.value);

      if (balanceValue < requiredUsdc) {
        const formattedBalance = Number(balanceValue) / 10 ** USDC_DECIMALS;
        throw new Error(
          `Insufficient USDC balance. You have ${formattedBalance.toFixed(2)} USDC but need ${cost.toFixed(2)} USDC`
        );
      }

      console.log('✅ USDC balance check passed');

      // CRITICAL: Per Polymarket docs - Check allowance from proxy wallet, not EOA
      // Allowance must be set from proxy wallet to CLOB contract
      if (!publicClient || !proxyWalletAddress) {
        throw new Error('Public client or proxy wallet address not available');
      }

      const proxyAllowanceResult = await publicClient.readContract({
        address: POLYGON_USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [proxyWalletAddress, POLYMARKET_CLOB_ADDRESS],
      });

      const currentAllowance = BigInt(proxyAllowanceResult as string);

      console.log('Checking USDC allowance from proxy wallet:', {
        proxyWalletAddress,
        currentAllowance: currentAllowance.toString(),
        requiredUsdc: requiredUsdc.toString(),
        needsApproval: currentAllowance < requiredUsdc,
      });

      if (currentAllowance < requiredUsdc) {
        // Need to approve first
        // Per Polymarket docs: Use Relayer Client for gasless token approvals
        // CRITICAL: Approval must be done FROM proxy wallet, not EOA
        console.log('⚠️ Insufficient allowance from proxy wallet, requesting approval via Relayer (gasless)...');
        
        try {
          // Try to approve via Relayer (gasless) if builder credentials are configured
          // The relayer will execute the approval transaction FROM the proxy wallet
          const { approveTokenViaRelayer } = await import('@/lib/polymarket/relayerClient');
          const approvalTxHash = await approveTokenViaRelayer(
            walletClient,
            POLYGON_USDC_ADDRESS,
            POLYMARKET_CLOB_ADDRESS,
            requiredUsdc
          );
          console.log('✅ Token approval completed via Relayer (gasless):', approvalTxHash);
          
          // Wait a bit for the transaction to be processed
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Refetch allowance from proxy wallet
          const refreshedAllowance = await publicClient.readContract({
            address: POLYGON_USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: 'allowance',
            args: [proxyWalletAddress, POLYMARKET_CLOB_ADDRESS],
          });
          
          if (BigInt(refreshedAllowance as string) < requiredUsdc) {
            throw new Error('Allowance still insufficient after approval. Please try again.');
          }
        } catch (relayerError) {
          console.warn('Relayer approval failed:', relayerError);
          throw new Error(`Failed to approve USDC from proxy wallet. Please ensure builder credentials are configured for gasless approvals, or manually approve USDC spending from your proxy wallet (${proxyWalletAddress}) to the CLOB contract.`);
        }
      }

      console.log('✅ USDC allowance check passed');

      // Initialize CLOB client with proxy wallet address as funder
      // Per Polymarket docs: Pass proxy wallet address as funder parameter
      // This ensures orders are placed from the proxy wallet where USDC is held
      const clobClient = initializeClobClient(credentials, proxyWalletAddress);

      // Place the order
      const result = await placePrediction({
        clobClient,
        walletClient,
        tokenId,
        side,
        size,
        price,
      });

      return result;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user-positions'] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      queryClient.invalidateQueries({ queryKey: ['polymarket-markets'] });
    },
    onError: (error) => {
      console.error('Error placing prediction:', error);
    },
  });

  return {
    predict: mutation.mutate,
    isPending: mutation.isPending || isApproving,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    isApproving,
  };
}

/**
 * Helper hook to check if approval is needed
 */
export function useNeedsApproval(cost: number) {
  const { address } = useAccount();

  const { data: allowance } = useReadContract({
    address: POLYGON_USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address && [address, POLYMARKET_CLOB_ADDRESS],
  });

  const requiredUsdc = parseUnits(cost.toFixed(USDC_DECIMALS), USDC_DECIMALS);
  const currentAllowance = allowance ? BigInt(allowance) : BigInt(0);

  return {
    needsApproval: currentAllowance < requiredUsdc,
    currentAllowance,
    requiredUsdc,
  };
}
