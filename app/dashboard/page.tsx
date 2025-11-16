'use client';

import { useAccount } from 'wagmi';
import { useUserPositions, useUserOrders } from '@/hooks/useUserPositions';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { Button } from '@/components/ui/button';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { Loader2, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const { credentials, isLoading: credentialsLoading, generateCredentials } = useApiCredentials();
  const { data: positions, isLoading: positionsLoading } = useUserPositions();
  const { data: orders, isLoading: ordersLoading } = useUserOrders();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground mb-6">
          Connect your wallet to view your positions and orders
        </p>
        <WalletConnect />
      </div>
    );
  }

  if (!credentials && !credentialsLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Setup Required</h1>
        <p className="text-muted-foreground mb-6">
          Generate API credentials to start trading
        </p>
        <Button onClick={() => generateCredentials()}>
          Generate API Credentials
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          View your positions and active orders
        </p>
      </div>

      {/* API Status */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">API Status</h3>
            <p className="text-sm text-muted-foreground">
              Connected to Polymarket CLOB
            </p>
          </div>
          <CheckCircle className="h-6 w-6 text-green-500" />
        </div>
      </div>

      {/* Active Orders */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Active Orders</h2>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map((order: any) => (
              <div
                key={order.id}
                className="bg-secondary/30 rounded p-4 flex justify-between"
              >
                <div>
                  <p className="font-medium">{order.market}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.side} • {order.size} shares @ ${order.price}
                  </p>
                </div>
                <span className="text-yellow-500 text-sm">Pending</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No active orders
          </p>
        )}
      </div>

      {/* Positions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">My Positions</h2>
        </div>

        {positionsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : positions && positions.length > 0 ? (
          <div className="space-y-2">
            {positions.map((position: any) => (
              <div
                key={position.id}
                className="bg-secondary/30 rounded p-4"
              >
                <p className="font-medium">{position.market}</p>
                <p className="text-sm text-muted-foreground">
                  {position.size} shares • Avg: ${position.avgPrice}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No positions yet. Start by making predictions!
          </p>
        )}
      </div>
    </div>
  );
}
