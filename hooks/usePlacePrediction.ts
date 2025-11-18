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
import { parseUnits, formatUnits } from 'viem';
import { POLYGON_USDC_ADDRESS, POLYGON_USDC_NATIVE, POLYGON_USDC_BRIDGED, POLYMARKET_CLOB_ADDRESS, USDC_DECIMALS, POLYGON_CHAIN_ID } from '@/lib/constants';
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

  // CRITICAL: Polygon has TWO USDC tokens - check BOTH!
  // USDC (Native): 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 - NEW (2023+)
  // USDC.e (Bridged): 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 - OLD

  // Get NATIVE USDC balance from proxy wallet
  const { data: balanceNative, refetch: refetchBalanceNative, isLoading: isLoadingBalanceNative } = useBalance({
    address: balanceAddress,
    token: POLYGON_USDC_NATIVE,
    query: {
      enabled: !!balanceAddress && isPolygon,
      refetchInterval: 5000,
    },
  });

  // Get BRIDGED USDC balance from proxy wallet
  const { data: balanceBridged, refetch: refetchBalanceBridged, isLoading: isLoadingBalanceBridged } = useBalance({
    address: balanceAddress,
    token: POLYGON_USDC_BRIDGED,
    query: {
      enabled: !!balanceAddress && isPolygon,
      refetchInterval: 5000,
    },
  });

  // Calculate total USDC balance (sum of both native and bridged)
  const nativeAmount = parseFloat(balanceNative?.formatted || '0');
  const bridgedAmount = parseFloat(balanceBridged?.formatted || '0');
  const totalUsdcAmount = nativeAmount + bridgedAmount;

  // Determine which USDC token has balance (for approval purposes)
  const activeUsdcAddress = nativeAmount > 0 ? POLYGON_USDC_NATIVE : (bridgedAmount > 0 ? POLYGON_USDC_BRIDGED : POLYGON_USDC_ADDRESS);
  const activeUsdcType = nativeAmount > 0 ? 'USDC (Native)' : (bridgedAmount > 0 ? 'USDC.e (Bridged)' : 'Unknown');

  const isLoadingBalance = isLoadingBalanceNative || isLoadingBalanceBridged;

  // CRITICAL: Get USDC allowance from proxy wallet (not EOA)
  // Per Polymarket docs: USDC is in proxy wallet, so allowance must be checked from proxy wallet
  // Check allowance for whichever USDC token has balance
  const allowanceOwner = proxyWalletAddress || address; // Use proxy wallet if available
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: activeUsdcAddress,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: allowanceOwner && [allowanceOwner, POLYMARKET_CLOB_ADDRESS],
    query: {
      enabled: !!allowanceOwner && isPolygon && totalUsdcAmount > 0, // Only fetch when address is available AND on Polygon AND has USDC
    },
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
      // However, for first-time users, proxy wallet might not exist yet
      // Allow balance check from EOA if proxy wallet doesn't exist (temporary)
      // Note: Once proxy wallet is created, USDC should be transferred to it
      if (hasProxyWallet && !proxyWalletAddress) {
        throw new Error('Proxy wallet address not available. Please refresh the page.');
      }

      // CRITICAL: Force refetch BOTH USDC balances from proxy wallet to ensure we have latest data
      // Per Polymarket docs: Always check balance before placing order
      console.log('Refetching USDC balances (native + bridged) from proxy wallet...', {
        eoaAddress: address,
        proxyWalletAddress,
        isPolygon,
        chainId
      });

      const [{ data: refreshedBalanceNative, error: balanceErrorNative }, { data: refreshedBalanceBridged, error: balanceErrorBridged }] = await Promise.all([
        refetchBalanceNative(),
        refetchBalanceBridged()
      ]);

      const currentBalanceNative = refreshedBalanceNative || balanceNative;
      const currentBalanceBridged = refreshedBalanceBridged || balanceBridged;

      // Calculate total balance from both USDC tokens
      const nativeValue = currentBalanceNative ? BigInt(currentBalanceNative.value) : BigInt(0);
      const bridgedValue = currentBalanceBridged ? BigInt(currentBalanceBridged.value) : BigInt(0);
      const totalBalanceValue = nativeValue + bridgedValue;

      const nativeFormatted = currentBalanceNative?.formatted || '0';
      const bridgedFormatted = currentBalanceBridged?.formatted || '0';
      const totalFormatted = formatUnits(totalBalanceValue, USDC_DECIMALS);

      console.log('Checking USDC balance from proxy wallet (DUAL USDC - per Polymarket docs):', {
        cost,
        requiredUsdc: requiredUsdc.toString(),
        nativeBalance: nativeValue.toString(),
        nativeFormatted,
        bridgedBalance: bridgedValue.toString(),
        bridgedFormatted,
        totalBalance: totalBalanceValue.toString(),
        totalFormatted,
        proxyWalletAddress,
        eoaAddress: address,
        chainId,
        isPolygon,
        activeUsdcType,
        balanceErrorNative: balanceErrorNative?.message,
        balanceErrorBridged: balanceErrorBridged?.message,
      });

      // Check USDC balance - per Polymarket requirements
      if (totalBalanceValue === BigInt(0)) {
        if (balanceErrorNative || balanceErrorBridged) {
          throw new Error(`Failed to fetch USDC balance from proxy wallet: ${balanceErrorNative?.message || balanceErrorBridged?.message}. Please ensure you are connected to Polygon network and have USDC in your proxy wallet (${proxyWalletAddress}).`);
        }
        throw new Error(`No USDC found in proxy wallet (${proxyWalletAddress}). Please ensure you are connected to Polygon network (Chain ID: 137) and have USDC in your proxy wallet. Note: USDC must be in your proxy wallet, not your EOA address.`);
      }

      if (totalBalanceValue < requiredUsdc) {
        const formattedBalance = Number(totalBalanceValue) / 10 ** USDC_DECIMALS;
        throw new Error(
          `Insufficient USDC balance. You have ${formattedBalance.toFixed(2)} USDC (Native: ${nativeFormatted}, Bridged: ${bridgedFormatted}) but need ${cost.toFixed(2)} USDC`
        );
      }

      console.log('✅ USDC balance check passed (Total:', totalFormatted, 'USDC)');

      // CRITICAL: Per Polymarket docs - Check allowance from the wallet that holds USDC
      // If proxy wallet exists, check from proxy wallet. Otherwise check from EOA.
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      // Use proxy wallet if available, otherwise use EOA (for first-time users)
      const allowanceOwner = proxyWalletAddress || address;
      if (!allowanceOwner) {
        throw new Error('No wallet address available for allowance check');
      }

      // Determine which USDC token to use for approval (prioritize whichever has balance)
      const usdcToUse = nativeValue > BigInt(0) ? POLYGON_USDC_NATIVE : (bridgedValue > BigInt(0) ? POLYGON_USDC_BRIDGED : POLYGON_USDC_ADDRESS);
      const usdcTypeToUse = nativeValue > BigInt(0) ? 'USDC (Native)' : (bridgedValue > BigInt(0) ? 'USDC.e (Bridged)' : 'Unknown');

      console.log('Checking USDC allowance:', {
        allowanceOwner,
        isProxyWallet: !!proxyWalletAddress,
        proxyWalletAddress,
        eoaAddress: address,
        usdcToUse,
        usdcTypeToUse,
      });

      const proxyAllowanceResult = await publicClient.readContract({
        address: usdcToUse,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [allowanceOwner, POLYMARKET_CLOB_ADDRESS],
      });

      // readContract already returns bigint, no need to convert
      const currentAllowance = proxyAllowanceResult as bigint;

      console.log('USDC allowance check result:', {
        allowanceOwner,
        usdcToUse,
        usdcTypeToUse,
        currentAllowance: currentAllowance.toString(),
        requiredUsdc: requiredUsdc.toString(),
        needsApproval: currentAllowance < requiredUsdc,
      });

      if (currentAllowance < requiredUsdc) {
        // Need to approve first
        // Per Polymarket docs: Use Relayer Client for gasless token approvals
        // CRITICAL: Approval must be done FROM proxy wallet, not EOA
        console.log('⚠️ Insufficient allowance from proxy wallet, requesting approval via Relayer (gasless)...', {
          usdcToUse,
          usdcTypeToUse,
        });

        try {
          // Try to approve via Relayer (gasless) if builder credentials are configured
          // The relayer will execute the approval transaction FROM the proxy wallet
          const { approveTokenViaRelayer } = await import('@/lib/polymarket/relayerClient');
          const approvalTxHash = await approveTokenViaRelayer(
            walletClient,
            usdcToUse,  // Use the correct USDC token (native or bridged)
            POLYMARKET_CLOB_ADDRESS,
            requiredUsdc
          );
          console.log('✅ Token approval completed via Relayer (gasless):', approvalTxHash, '| USDC Type:', usdcTypeToUse);

          // Wait a bit for the transaction to be processed
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Refetch allowance from proxy wallet
          // CRITICAL: proxyWalletAddress must exist at this point (checked earlier)
          if (!proxyWalletAddress) {
            throw new Error('Proxy wallet address not available');
          }

          const refreshedAllowance = await publicClient.readContract({
            address: usdcToUse,  // Use the correct USDC token (native or bridged)
            abi: USDC_ABI,
            functionName: 'allowance',
            args: [proxyWalletAddress, POLYMARKET_CLOB_ADDRESS],
          });

          // readContract already returns bigint, no need to convert
          if ((refreshedAllowance as bigint) < requiredUsdc) {
            throw new Error('Allowance still insufficient after approval. Please try again.');
          }
        } catch (relayerError) {
          console.warn('Relayer approval failed:', relayerError);
          throw new Error(`Failed to approve ${usdcTypeToUse} from proxy wallet. Please ensure builder credentials are configured for gasless approvals, or manually approve USDC spending from your proxy wallet (${proxyWalletAddress}) to the CLOB contract.`);
        }
      }

      console.log('✅ USDC allowance check passed');

      // Initialize CLOB client with proxy wallet address as funder
      // Per Polymarket docs: Pass proxy wallet address as funder parameter
      // This ensures orders are placed from the proxy wallet where USDC is held
      // CRITICAL: proxyWalletAddress must exist at this point (checked earlier)
      if (!proxyWalletAddress) {
        throw new Error('Proxy wallet address not available. Please ensure your proxy wallet is deployed.');
      }
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
    error: mutation.error as Error | null,
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
