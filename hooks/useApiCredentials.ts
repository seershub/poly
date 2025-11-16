'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWalletClient, useAccount } from 'wagmi';
import { generateApiCredentials } from '@/lib/polymarket/clobClient';
import type { ApiCredentials } from '@/types/polymarket';

/**
 * Hook to generate and manage Polymarket API credentials
 * CRITICAL: Uses wagmi wallet client (NOT private keys)
 */
export function useApiCredentials() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  // Query to get existing credentials (from localStorage for now)
  // In production, this should be from a secure backend
  const credentialsQuery = useQuery({
    queryKey: ['api-credentials', address],
    queryFn: async () => {
      if (!address) return null;

      // Try to get from localStorage
      const stored = localStorage.getItem(`poly-creds-${address}`);
      if (stored) {
        try {
          return JSON.parse(stored) as ApiCredentials;
        } catch {
          return null;
        }
      }

      return null;
    },
    enabled: !!address,
    staleTime: Infinity, // Credentials don't expire
  });

  // Mutation to generate new credentials
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!walletClient) {
        throw new Error('Wallet not connected');
      }

      const credentials = await generateApiCredentials(walletClient);

      // Store in localStorage (in production, use secure backend)
      if (address) {
        localStorage.setItem(
          `poly-creds-${address}`,
          JSON.stringify(credentials)
        );
      }

      return credentials;
    },
    onSuccess: (data) => {
      // Update the query cache
      queryClient.setQueryData(['api-credentials', address], data);
    },
  });

  return {
    credentials: credentialsQuery.data,
    isLoading: credentialsQuery.isLoading,
    isGenerating: generateMutation.isPending,
    generateCredentials: generateMutation.mutate,
    error: credentialsQuery.error || generateMutation.error,
  };
}

/**
 * Hook to check if user has API credentials
 */
export function useHasApiCredentials() {
  const { credentials, isLoading } = useApiCredentials();

  return {
    hasCredentials: !!credentials,
    isLoading,
  };
}
