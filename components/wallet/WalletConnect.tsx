'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { useEffect } from 'react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { credentials, generateCredentials, isGenerating } = useApiCredentials();

  // Auto-generate credentials when wallet connects
  useEffect(() => {
    if (isConnected && !credentials && !isGenerating) {
      generateCredentials();
    }
  }, [isConnected, credentials, isGenerating, generateCredentials]);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <p className="text-sm font-medium">{truncateAddress(address)}</p>
          {credentials ? (
            <p className="text-xs text-green-500">API Ready</p>
          ) : (
            <p className="text-xs text-yellow-500">Generating API...</p>
          )}
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
