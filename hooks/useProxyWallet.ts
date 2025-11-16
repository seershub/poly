/**
 * Hook to manage Polymarket Proxy Wallet
 * 
 * Per Polymarket docs: Proxy wallets are 1 of 1 multisig wallets that hold
 * user positions (ERC1155) and USDC (ERC20). They enable:
 * - Atomic multi-step transactions
 * - Gasless transactions via relayers
 * - Improved UX
 */

'use client';

import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProxyWalletAddress, ensureProxyWallet } from '@/lib/polymarket/proxyWallet';
import type { Address } from 'viem';

/**
 * Hook to get or create a proxy wallet for the connected user
 * Per Polymarket docs: Proxy wallets are created automatically on first use
 */
export function useProxyWallet() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  // Query to check if proxy wallet exists
  const {
    data: proxyWalletAddress,
    isLoading: isLoadingProxy,
    error: proxyError,
    refetch: refetchProxy,
  } = useQuery({
    queryKey: ['proxy-wallet', address],
    queryFn: async () => {
      if (!address || !publicClient) {
        return null;
      }

      // Check if proxy wallet exists
      const proxyAddress = await getProxyWalletAddress(address, publicClient);
      return proxyAddress;
    },
    enabled: isConnected && !!address && !!publicClient,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to create proxy wallet via Polymarket Relayer (gasless)
  const createProxyMutation = useMutation({
    mutationFn: async (walletType: 'metamask' | 'magiclink' = 'metamask') => {
      if (!address || !walletClient || !publicClient) {
        throw new Error('Wallet not connected');
      }

      // Per Polymarket docs: Use Relayer Client for gasless Safe Wallet deployment
      // First check if proxy wallet already exists
      const existingProxy = await getProxyWalletAddress(address, publicClient);
      if (existingProxy) {
        return existingProxy;
      }

      // Deploy new proxy wallet via Relayer (gasless)
      // This will use Polymarket Relayer Client if builder credentials are configured
      const proxyAddress = await ensureProxyWallet(address, publicClient, walletClient, walletType);
      return proxyAddress;
    },
    onSuccess: (proxyAddress) => {
      // Invalidate and refetch proxy wallet query
      queryClient.setQueryData(['proxy-wallet', address], proxyAddress);
      queryClient.invalidateQueries({ queryKey: ['proxy-wallet', address] });
    },
  });

  return {
    proxyWalletAddress: proxyWalletAddress as Address | null,
    isLoadingProxy,
    proxyError,
    hasProxyWallet: !!proxyWalletAddress,
    createProxyWallet: createProxyMutation.mutate,
    isCreatingProxy: createProxyMutation.isPending,
    createProxyError: createProxyMutation.error,
    refetchProxy,
  };
}

