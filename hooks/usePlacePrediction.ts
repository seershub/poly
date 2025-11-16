'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWalletClient,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseUnits } from 'viem';
import { POLYGON_USDC_ADDRESS, POLYMARKET_CLOB_ADDRESS, USDC_DECIMALS } from '@/lib/constants';
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
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { credentials } = useApiCredentials();
  const queryClient = useQueryClient();

  // Get USDC balance
  const { data: balance } = useBalance({
    address,
    token: POLYGON_USDC_ADDRESS,
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

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      if (!credentials) {
        throw new Error('API credentials not generated. Please generate credentials first.');
      }

      const { tokenId, side, size, price } = params;

      // Calculate required USDC (cost = shares * price)
      const cost = size * price;
      const requiredUsdc = parseUnits(cost.toFixed(USDC_DECIMALS), USDC_DECIMALS);

      // Check USDC balance
      if (!balance || BigInt(balance.value) < requiredUsdc) {
        throw new Error(
          `Insufficient USDC balance. Required: ${cost.toFixed(2)} USDC`
        );
      }

      // Check allowance
      const currentAllowance = allowance ? BigInt(allowance) : BigInt(0);

      if (currentAllowance < requiredUsdc) {
        // Need to approve first
        console.log('Approving USDC for CLOB contract...');

        // Request approval
        approveUsdc({
          address: POLYGON_USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [POLYMARKET_CLOB_ADDRESS, requiredUsdc],
        });

        // Wait for approval (this is handled by useWaitForTransactionReceipt)
        // In a real implementation, we should wait for the approval before continuing
        throw new Error('APPROVAL_REQUIRED');
      }

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
      if (error.message === 'APPROVAL_REQUIRED') {
        // This is expected, user needs to approve first
        console.log('Waiting for USDC approval...');
      } else {
        console.error('Error placing prediction:', error);
      }
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
