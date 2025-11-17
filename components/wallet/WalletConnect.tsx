'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Shield, DollarSign } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { useProxyWallet } from '@/hooks/useProxyWallet';
import { useEffect, useState } from 'react';
import { FundWalletModal } from './FundWalletModal';

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
      // This is the primary check - if setup is marked as complete, don't redirect
      const setupCompleted = localStorage.getItem(`poly-setup-completed-${address}`);
      if (setupCompleted === 'true') {
        return; // Setup already completed, don't redirect
      }
      
      // Only redirect if setup is not completed AND we're not already on setup page
      // Give a small delay to allow state to load
      const timer = setTimeout(() => {
        const stillNeedsSetup = localStorage.getItem(`poly-setup-completed-${address}`) !== 'true';
        if (stillNeedsSetup && window.location.pathname !== '/setup') {
          console.log('Setup not completed, redirecting to setup page...', {
            address,
            hasProxyWallet,
            hasCredentials: !!credentials,
          });
          window.location.href = '/setup';
        }
      }, 1000); // Wait 1 second for state to load
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, authenticated, address, hasProxyWallet, credentials]);

  // Show connected state if either Wagmi or Privy is connected
  const isWalletConnected = isConnected || authenticated;
  const displayAddress = address || user?.wallet?.address;
  const [showFundModal, setShowFundModal] = useState(false);

  if (isWalletConnected && displayAddress) {
    return (
      <>
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
          
          {/* Fund Wallet Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFundModal(true)}
            className="gap-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30 hover:from-green-600/30 hover:to-emerald-600/30"
          >
            <DollarSign className="h-4 w-4 text-green-400" />
            <span className="hidden sm:inline text-green-400">Fund</span>
          </Button>
          
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
        
        <FundWalletModal open={showFundModal} onOpenChange={setShowFundModal} />
      </>
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
