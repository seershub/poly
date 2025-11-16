'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount, useWalletClient } from 'wagmi';
import { initializeClobClient, getUserOrders } from '@/lib/polymarket/clobClient';
import { useApiCredentials } from './useApiCredentials';

/**
 * Hook to fetch user's positions and orders
 */
export function useUserPositions() {
  const { address } = useAccount();
  const { credentials } = useApiCredentials();

  return useQuery({
    queryKey: ['user-positions', address],
    queryFn: async () => {
      if (!address || !credentials) {
        return [];
      }

      const clobClient = initializeClobClient(credentials);
      const orders = await getUserOrders(clobClient, address);

      return orders;
    },
    enabled: !!address && !!credentials,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch user's open orders
 */
export function useUserOrders() {
  const { address } = useAccount();
  const { credentials } = useApiCredentials();

  return useQuery({
    queryKey: ['user-orders', address],
    queryFn: async () => {
      if (!address || !credentials) {
        return [];
      }

      const clobClient = initializeClobClient(credentials);
      const orders = await getUserOrders(clobClient, address);

      // Filter only open/live orders
      return orders.filter((order: any) => order.status === 'LIVE');
    },
    enabled: !!address && !!credentials,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 15 * 1000,
  });
}
