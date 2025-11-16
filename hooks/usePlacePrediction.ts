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
} from 'wagmi';
import { parseUnits } from 'viem';
import { POLYGON_USDC_ADDRESS, POLYMARKET_CLOB_ADDRESS, USDC_DECIMALS, POLYGON_CHAIN_ID } from '@/lib/constants';
import { placePrediction, initializeClobClient } from '@/lib/polymarket/clobClient';
import { useApiCredentials } from './useApiCredentials';
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
  const { credentials } = useApiCredentials();
  const queryClient = useQueryClient();

  // CRITICAL: Check if connected to Polygon network
  const isPolygon = chainId === POLYGON_CHAIN_ID || chain?.id === POLYGON_CHAIN_ID;

  // Get USDC balance - with enabled check and refetch
  // Per Polymarket docs: Must be on Polygon network
  const { data: balance, refetch: refetchBalance, isLoading: isLoadingBalance } = useBalance({
    address,
    token: POLYGON_USDC_ADDRESS,
    query: {
      enabled: !!address && isPolygon, // Only fetch when address is available AND on Polygon
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

      // CRITICAL: Force refetch balance to ensure we have latest data
      // Per Polymarket docs: Always check balance before placing order
      console.log('Refetching USDC balance...', { address, isPolygon, chainId });
      const { data: refreshedBalance, error: balanceError } = await refetchBalance();
      
      const currentBalance = refreshedBalance || balance;

      console.log('Checking USDC balance (per Polymarket docs):', {
        cost,
        requiredUsdc: requiredUsdc.toString(),
        balance: currentBalance ? currentBalance.value.toString() : 'null',
        formatted: currentBalance?.formatted,
        symbol: currentBalance?.symbol,
        chainId,
        isPolygon,
        balanceError: balanceError?.message,
      });

      // Check USDC balance - per Polymarket requirements
      if (!currentBalance) {
        if (balanceError) {
          throw new Error(`Failed to fetch USDC balance: ${balanceError.message}. Please ensure you are connected to Polygon network and have USDC in your wallet.`);
        }
        throw new Error('USDC balance not loaded. Please ensure you are connected to Polygon network (Chain ID: 137) and have USDC in your wallet.');
      }

      const balanceValue = BigInt(currentBalance.value);

      if (balanceValue < requiredUsdc) {
        const formattedBalance = Number(balanceValue) / 10 ** USDC_DECIMALS;
        throw new Error(
          `Insufficient USDC balance. You have ${formattedBalance.toFixed(2)} USDC but need ${cost.toFixed(2)} USDC`
        );
      }

      console.log('✅ USDC balance check passed');

      // Check allowance
      const currentAllowance = allowance ? BigInt(allowance) : BigInt(0);

      console.log('Checking USDC allowance:', {
        currentAllowance: currentAllowance.toString(),
        requiredUsdc: requiredUsdc.toString(),
        needsApproval: currentAllowance < requiredUsdc,
      });

      if (currentAllowance < requiredUsdc) {
        // Need to approve first
        // Per Polymarket docs: Use Relayer Client for gasless token approvals
        console.log('⚠️ Insufficient allowance, requesting approval via Relayer (gasless)...');
        
        try {
          // Try to approve via Relayer (gasless) if builder credentials are configured
          const { approveTokenViaRelayer } = await import('@/lib/polymarket/relayerClient');
          const approvalTxHash = await approveTokenViaRelayer(
            walletClient,
            POLYGON_USDC_ADDRESS,
            POLYMARKET_CLOB_ADDRESS,
            requiredUsdc
          );
          console.log('✅ Token approval completed via Relayer (gasless):', approvalTxHash);
          
          // Wait a bit for the transaction to be processed
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Refetch allowance
          await refetchAllowance();
        } catch (relayerError) {
          console.warn('Relayer approval failed, falling back to direct approval:', relayerError);
          
          // Fallback: Direct approval (user pays gas)
          console.log('Approving USDC for CLOB contract (user pays gas):', {
            token: POLYGON_USDC_ADDRESS,
            spender: POLYMARKET_CLOB_ADDRESS,
            amount: requiredUsdc.toString(),
          });

          approveUsdc({
            address: POLYGON_USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: 'approve',
            args: [POLYMARKET_CLOB_ADDRESS, requiredUsdc],
          });

          throw new Error('Please approve USDC spending in your wallet, then try again.');
        }
      }

      console.log('✅ USDC allowance check passed');

      // Initialize CLOB client
      const clobClient = initializeClobClient(credentials);

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
