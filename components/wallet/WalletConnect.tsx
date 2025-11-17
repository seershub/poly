'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Shield } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { useProxyWallet } from '@/hooks/useProxyWallet';
import { useEffect } from 'react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { credentials, generateCredentials, isGenerating } = useApiCredentials();
  const { 
    proxyWalletAddress, 
    hasProxyWallet, 
    isLoadingProxy,
    createProxyWallet,
    isCreatingProxy 
  } = useProxyWallet();

  // Auto-generate credentials when wallet connects
  useEffect(() => {
    if (isConnected && !credentials && !isGenerating) {
      generateCredentials();
    }
  }, [isConnected, credentials, isGenerating, generateCredentials]);

  // Auto-create proxy wallet if it doesn't exist (per Polymarket docs)
  // Per Polymarket docs: "When a user first uses Polymarket.com to trade they are prompted to create a wallet"
  useEffect(() => {
    if (isConnected && address && !isLoadingProxy && !hasProxyWallet && !isCreatingProxy) {
      // Per Polymarket docs: Proxy wallets are created automatically on first use
      // Automatically create proxy wallet when wallet connects (like other dApps)
      console.log('Proxy wallet not found. Creating automatically via Polymarket Relayer...');
      createProxyWallet('metamask'); // Default to metamask, can be detected dynamically
    }
  }, [isConnected, address, isLoadingProxy, hasProxyWallet, isCreatingProxy, createProxyWallet]);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <p className="text-sm font-medium">{truncateAddress(address)}</p>
          <div className="flex items-center gap-2">
            {credentials ? (
              <p className="text-xs text-green-500">API Ready</p>
            ) : (
              <p className="text-xs text-yellow-500">Generating API...</p>
            )}
            {hasProxyWallet ? (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <Shield className="h-3 w-3" />
                <span>Proxy Wallet</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-yellow-500">
                <Shield className="h-3 w-3" />
                <span>No Proxy</span>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnect()}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Disconnect</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="gap-2"
          size="sm"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      ))}
    </div>
  );
}
