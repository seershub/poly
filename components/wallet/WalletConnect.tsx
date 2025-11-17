'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
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
  const { 
    ready, 
    authenticated, 
    login, 
    logout, 
    user 
  } = usePrivy();
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
    if ((isConnected || authenticated) && !credentials && !isGenerating) {
      generateCredentials();
    }
  }, [isConnected, authenticated, credentials, isGenerating, generateCredentials]);

  // Redirect to setup page if wallet is connected but setup is not complete
  // Per Polymarket docs: "When a user first uses Polymarket.com to trade they are prompted to create a wallet"
  useEffect(() => {
    if ((isConnected || authenticated) && address && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      
      // Don't redirect if already on setup page
      if (currentPath === '/setup') {
        return;
      }
      
      // Check if setup is already completed (from localStorage)
      const setupCompleted = localStorage.getItem(`poly-setup-completed-${address}`);
      if (setupCompleted === 'true') {
        return; // Setup already completed, don't redirect
      }
      
      // Check if setup is needed (proxy wallet or API credentials missing)
      // Note: USDC approval is checked on setup page, not here
      const needsSetup = !hasProxyWallet || !credentials;
      
      if (needsSetup) {
        // Redirect to setup page
        window.location.href = '/setup';
      }
    }
  }, [isConnected, authenticated, address, hasProxyWallet, credentials]);

  // Show connected state if either Wagmi or Privy is connected
  const isWalletConnected = isConnected || authenticated;
  const displayAddress = address || user?.wallet?.address;

  if (isWalletConnected && displayAddress) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <p className="text-sm font-medium">{truncateAddress(displayAddress)}</p>
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
          onClick={() => {
            if (authenticated) {
              logout();
            } else {
              disconnect();
            }
          }}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Disconnect</span>
        </Button>
      </div>
    );
  }

  // Show Privy login button (more user-friendly than Wagmi connectors)
  if (!ready) {
    return (
      <Button disabled size="sm" className="gap-2">
        <Wallet className="h-4 w-4" />
        Loading...
      </Button>
    );
  }

  return (
    <Button
      onClick={() => login()}
      className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
      size="sm"
    >
      <Wallet className="h-4 w-4" />
      Sign In
    </Button>
  );
}
