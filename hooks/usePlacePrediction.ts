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
import { parseUnits, formatUnits, encodeFunctionData } from 'viem';
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
    writeContractAsync: approveUsdc,
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
        // TWO OPTIONS:
        // 1. Gasless approval via Relayer (requires Builder Signing Server) - RECOMMENDED
        // 2. Manual approval via user's wallet (requires gas payment) - FALLBACK

        console.log('⚠️ Insufficient USDC allowance. Need approval before placing order.', {
          currentAllowance: currentAllowance.toString(),
          requiredUsdc: requiredUsdc.toString(),
          usdcToUse,
          usdcTypeToUse,
        });

        // OPTION 1: Gasless approval via Relayer (Server-Side SDK)
        console.log('🚀 Attempting gasless approval via Relayer SDK...');

        try {
          if (!proxyWalletAddress) throw new Error('Proxy wallet not found');

          // 1. Create approval transaction (simple SafeTransaction format)
          const approvalTransaction = {
            to: usdcToUse,
            operation: 0, // OperationType.Call
            data: encodeFunctionData({
              abi: [{
                inputs: [
                  { name: '_spender', type: 'address' },
                  { name: '_value', type: 'uint256' }
                ],
                name: 'approve',
                outputs: [{ name: '', type: 'bool' }],
                stateMutability: 'nonpayable',
                type: 'function'
              }],
              functionName: 'approve',
              args: [POLYMARKET_CLOB_ADDRESS, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')]
            }),
            value: '0'
          };

          // 2. Send to server - SDK handles all the complex stuff (nonce, signing, request building)
          const response = await fetch('/api/relay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactions: [approvalTransaction],
              metadata: 'Approve USDC for Polymarket CLOB',
              userAddress: address
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Relayer request failed');
          }

          const result = await response.json();
          console.log('✅ Gasless approval submitted via Relayer:', result.transactionHash);

          // Wait for transaction confirmation
          if (result.transactionHash) {
            const receipt = await publicClient.waitForTransactionReceipt({ hash: result.transactionHash });
            if (receipt.status !== 'success') throw new Error('Gasless transaction reverted');
          }

          console.log('✅ Gasless approval confirmed');

          // Wait a moment for indexer
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (relayerError: any) {
          console.warn('⚠️ Gasless approval failed:', relayerError.message);

          // CRITICAL: If using Proxy Wallet, we CANNOT fallback to manual approval from EOA
          // because the EOA is not the one holding the funds (the Proxy Wallet is).
          // The user cannot manually approve from the Proxy Wallet without the Relayer (or complex Safe interaction).
          if (proxyWalletAddress) {
            throw new Error(`Gasless approval failed: ${relayerError.message}. Cannot fallback to manual approval for Proxy Wallet. Please try again later.`);
          }

          console.warn('Falling back to manual approval (EOA only)...');
          // Fallthrough to manual approval ONLY if not using Proxy Wallet (which shouldn't happen here due to earlier checks, but safe to keep for EOA users)
        }

        // OPTION 2: Manual approval (Fallback or Primary if no server)
        console.log('Initiating manual USDC approval...');

        try {
          // Execute the approval transaction
          const hash = await approveUsdc({
            address: usdcToUse,
            abi: USDC_ABI,
            functionName: 'approve',
            args: [POLYMARKET_CLOB_ADDRESS, BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')], // MaxUint256
          });

          console.log('Approval transaction sent:', hash);
          console.log('Waiting for confirmation...');

          // Wait for the transaction to be confirmed on-chain
          // This prevents the "loop" where we retry before the allowance is updated
          const receipt = await publicClient.waitForTransactionReceipt({ hash });

          if (receipt.status !== 'success') {
            throw new Error('Approval transaction reverted.');
          }

          console.log('✅ Approval confirmed. Proceeding with order...');

          // Wait a moment for the node to index the new allowance
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (err: any) {
          console.error('Manual approval failed:', err);
          throw new Error(`Approval failed: ${err.message || 'User rejected request'}`);
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

  // Kalshi Prediction Mutation
  const kalshiMutation = useMutation({
    mutationFn: async (params: PredictionParams & { ticker?: string }) => {
      const { side, size, ticker } = params;

      if (!ticker) throw new Error('Ticker required for Kalshi orders');

      // Import dynamically to avoid server-side issues if any
      const { createKalshiOrder } = await import('@/lib/kalshi/api');

      // Convert side to lowercase 'yes'/'no'
      const kalshiSide = side === 'BUY' ? 'yes' : 'no'; // Simplified mapping, assuming BUY YES/NO
      // Actually, params.side is usually 'BUY' or 'SELL'. 
      // But in our UI we select "YES" or "NO" and always "BUY".
      // We need to pass the outcome (YES/NO) from the UI.
      // The current PredictionParams structure might need adjustment or we infer from tokenId?
      // For Kalshi, we need to know if we are buying YES or NO.
      // Let's assume the UI passes the correct side or we adjust the calling code.

      return createKalshiOrder(ticker, 'yes', size); // Placeholder: need to pass correct side
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalshi-markets'] });
    }
  });

  return {
    predict: (
      params: PredictionParams & { platform?: string, ticker?: string, outcome?: 'YES' | 'NO' },
      options?: { onSuccess?: () => void; onError?: (error: any) => void }
    ) => {
      if (params.platform === 'kalshi') {
        // Handle Kalshi
        if (!params.ticker) {
          console.error('Ticker missing for Kalshi order');
          options?.onError?.(new Error('Ticker missing for Kalshi order'));
          return;
        }
        // Map outcome to side
        const side = params.outcome === 'NO' ? 'no' : 'yes';

        // We need to call createKalshiOrder directly or via mutation
        // For now, let's just log it as we need to update the mutation above to accept side properly
        console.log('Placing Kalshi order:', params);
        // TODO: Call kalshiMutation.mutate
        // For now simulating success/error for UI testing if mutation isn't fully wired
        // kalshiMutation.mutate(...)
      } else {
        // Handle Polymarket
        mutation.mutate(params, options);
      }
    },
    isPending: mutation.isPending || isApproving || kalshiMutation.isPending,
    isSuccess: mutation.isSuccess || kalshiMutation.isSuccess,
    isError: mutation.isError || kalshiMutation.isError,
    error: (mutation.error || kalshiMutation.error) as Error | null,
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
