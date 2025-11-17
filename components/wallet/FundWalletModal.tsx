'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAccount, useWalletClient, usePublicClient, useBalance, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { useProxyWallet } from '@/hooks/useProxyWallet';
import { POLYGON_USDC_ADDRESS, ETHEREUM_USDC_ADDRESS, BASE_USDC_ADDRESS, USDC_DECIMALS, POLYGON_CHAIN_ID, ETHEREUM_CHAIN_ID, BASE_CHAIN_ID } from '@/lib/constants';
import { depositUsdcToProxyWallet } from '@/lib/polymarket/usdcTransfer';
import { parseUnits, formatUnits } from 'viem';
import { Wallet, ArrowDown, ArrowUp, Loader2, X, ChevronDown, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { polygon, mainnet, base } from 'viem/chains';

interface FundWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FundAction = 'deposit' | 'withdraw' | null;

// Token configuration (for future expansion)
type Token = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon?: string;
};

// Chain configuration (for future expansion)
type Chain = {
  id: number;
  name: string;
  icon?: string;
};

const TOKENS: Token[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: POLYGON_USDC_ADDRESS, // Default to Polygon, will be updated based on selected chain
    decimals: 6,
  },
  // TODO: Add USDT, ETH when multi-token support is implemented
  // TODO: SOL requires Solana integration (@solana/web3.js)
];

const CHAINS: Chain[] = [
  {
    id: polygon.id,
    name: 'Polygon',
  },
  {
    id: mainnet.id,
    name: 'Ethereum',
  },
  {
    id: base.id,
    name: 'Base',
  },
  // TODO: Solana is not EVM-compatible, requires separate integration
];

export function FundWalletModal({ open, onOpenChange }: FundWalletModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { proxyWalletAddress, hasProxyWallet } = useProxyWallet();
  const { toast } = useToast();
  
  const [action, setAction] = useState<FundAction>(null);
  const [selectedToken, setSelectedToken] = useState<Token>(TOKENS[0]);
  const [selectedChain, setSelectedChain] = useState<Chain>(CHAINS[0]);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // CRITICAL: Check if on Polygon network
  const isPolygon = chainId === POLYGON_CHAIN_ID;

  // CRITICAL FIX: Get EOA USDC balance 
  // Try to fetch from Polygon regardless of current chain (cross-chain balance check)
  // Per Wagmi v2 docs: useBalance with chainId can fetch balances from different chains
  const { 
    data: eoaBalance, 
    refetch: refetchEoaBalance, 
    isLoading: isLoadingEoaBalance,
    error: eoaBalanceError 
  } = useBalance({
    address,
    token: POLYGON_USDC_ADDRESS,
    chainId: polygon.id, // Always fetch from Polygon (where USDC is held)
    query: {
      enabled: !!address && open,
      refetchInterval: 5000, // Refetch every 5 seconds to watch for balance changes
      retry: 3, // Retry 3 times if fails
      retryDelay: 1000, // Wait 1s between retries
    },
  });

  // CRITICAL FIX: Get proxy wallet USDC balance
  // Always fetch from Polygon (where USDC is held)
  const { 
    data: proxyBalance, 
    refetch: refetchProxyBalance, 
    isLoading: isLoadingProxyBalance,
    error: proxyBalanceError 
  } = useBalance({
    address: proxyWalletAddress || undefined,
    token: POLYGON_USDC_ADDRESS,
    chainId: polygon.id, // Always fetch from Polygon
    query: {
      enabled: !!proxyWalletAddress && open,
      refetchInterval: 5000, // Refetch every 5 seconds to watch for balance changes
      retry: 3, // Retry 3 times if fails
      retryDelay: 1000, // Wait 1s between retries
    },
  });

  // Debug logging
  useEffect(() => {
    if (open && address) {
      console.log('useBalance Debug:', {
        address,
        chainId,
        isPolygon,
        eoaBalance: eoaBalance?.formatted,
        eoaBalanceError,
        proxyWalletAddress,
        proxyBalance: proxyBalance?.formatted,
        proxyBalanceError,
      });
    }
  }, [open, address, chainId, isPolygon, eoaBalance, eoaBalanceError, proxyWalletAddress, proxyBalance, proxyBalanceError]);

  // Wait for transaction
  const { isLoading: isWaitingTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
    query: {
      enabled: !!txHash,
    },
  });

  // Reset on close
  useEffect(() => {
    if (!open) {
      setAction(null);
      setAmount('');
      setTxHash(null);
      setIsProcessing(false);
      setShowTokenDropdown(false);
      setShowChainDropdown(false);
    }
  }, [open]);

  // Handle successful transaction
  useEffect(() => {
    if (isTxSuccess && txHash) {
      toast({
        title: 'Transaction Successful',
        description: action === 'deposit' 
          ? 'USDC deposited to proxy wallet successfully'
          : 'USDC withdrawn from proxy wallet successfully',
      });
      refetchEoaBalance();
      refetchProxyBalance();
      setTxHash(null);
      setIsProcessing(false);
      setAmount('');
      if (action === 'deposit') {
        setAction(null); // Return to main menu after deposit
      }
    }
  }, [isTxSuccess, txHash, action, toast, refetchEoaBalance, refetchProxyBalance]);

  // Debug logging
  useEffect(() => {
    if (open && address) {
      console.log('FundWalletModal Debug:', {
        address,
        chainId,
        isPolygon,
        eoaBalance: eoaBalance?.formatted,
        eoaBalanceError,
        proxyWalletAddress,
        proxyBalance: proxyBalance?.formatted,
        proxyBalanceError,
      });
    }
  }, [open, address, chainId, isPolygon, eoaBalance, eoaBalanceError, proxyWalletAddress, proxyBalance, proxyBalanceError]);

  const handleSwitchToPolygon = async () => {
    try {
      await switchChain({ chainId: polygon.id });
      toast({
        title: 'Switching Network',
        description: 'Please confirm the network switch in your wallet',
      });
    } catch (error: any) {
      console.error('Error switching chain:', error);
      toast({
        title: 'Network Switch Failed',
        description: error.message || 'Failed to switch to Polygon network',
        variant: 'destructive',
      });
    }
  };

  const handleDeposit = async () => {
    if (!address || !proxyWalletAddress || !walletClient || !amount) {
      toast({
        title: 'Error',
        description: 'Please enter an amount and ensure wallet is connected',
        variant: 'destructive',
      });
      return;
    }

    // CRITICAL: Check if on Polygon network
    if (!isPolygon) {
      toast({
        title: 'Wrong Network',
        description: `Please switch to Polygon network (Chain ID: ${POLYGON_CHAIN_ID}). Current: ${chainId}`,
        variant: 'destructive',
      });
      handleSwitchToPolygon();
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    // CRITICAL: Check balance from useBalance hook (100% reliable with explicit chainId)
    const eoaBalanceValue = eoaBalance?.formatted || '0';
    const eoaBalanceNum = parseFloat(eoaBalanceValue);
    
    if (amountNum > eoaBalanceNum) {
      toast({
        title: 'Insufficient Balance',
        description: `You have ${eoaBalanceValue} USDC but trying to deposit ${amount}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      const hash = await depositUsdcToProxyWallet(
        walletClient,
        address,
        proxyWalletAddress,
        amount
      );
      setTxHash(hash);
    } catch (error: any) {
      console.error('Error depositing USDC:', error);
      toast({
        title: 'Deposit Failed',
        description: error.message || 'Failed to deposit USDC',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    // Withdraw not yet implemented (requires Safe wallet transaction execution)
    toast({
      title: 'Coming Soon',
      description: 'Withdraw functionality will be available soon',
      variant: 'default',
    });
  };

  const setPercentage = (percentage: number) => {
    // CRITICAL: Use useBalance hook balance (100% reliable with explicit chainId)
    const balanceValue = eoaBalance?.formatted || '0';
    if (!balanceValue || action !== 'deposit') return;
    const balance = parseFloat(balanceValue);
    const calculatedAmount = (balance * percentage / 100).toFixed(2);
    setAmount(calculatedAmount);
  };

  // CRITICAL: Get display balance from useBalance hook
  const displayEoaBalance = eoaBalance?.formatted || '0.00';
  const displayProxyBalance = proxyBalance?.formatted || '0.00';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-5 w-5 text-green-500" />
            Fund Wallet
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Manage your USDC balance between your wallet and trading wallet
          </DialogDescription>
        </DialogHeader>

        {!action ? (
          // Main menu
          <div className="space-y-3 py-4">
            <button
              onClick={() => setAction('deposit')}
              className="w-full p-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 hover:from-green-500/30 hover:to-emerald-500/20 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-full">
                    <ArrowDown className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Deposit</p>
                    <p className="text-sm text-green-400/70">Add funds to your trading wallet</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-zinc-400 rotate-[-90deg]" />
              </div>
            </button>

            <button
              onClick={() => setAction('withdraw')}
              className="w-full p-4 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/10 border border-blue-500/30 hover:from-blue-500/30 hover:to-cyan-500/20 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <ArrowUp className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Withdraw</p>
                    <p className="text-sm text-blue-400/70">Move funds back to your wallet</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-zinc-400 rotate-[-90deg]" />
              </div>
            </button>

            {/* Balance Info */}
            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Your Wallet:</span>
                <span className="text-white font-semibold">
                  {isLoadingEoaBalance ? 'Loading...' : displayEoaBalance} USDC
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Trading Wallet:</span>
                <span className="text-white font-semibold">
                  {isLoadingProxyBalance ? 'Loading...' : displayProxyBalance} USDC
                </span>
              </div>
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 pt-2 border-t border-zinc-700 text-xs text-zinc-500">
                  <div>Chain ID: {chainId} (Polygon: {POLYGON_CHAIN_ID})</div>
                  <div>Hook Balance: {eoaBalance?.formatted || 'N/A'}</div>
                  {eoaBalanceError && <div className="text-red-400">Error: {eoaBalanceError.message}</div>}
                </div>
              )}
            </div>
          </div>
        ) : action === 'deposit' ? (
          // Deposit view - Matching competitor design
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Deposit USDC</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAction(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Network Warning */}
            {!isPolygon && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-semibold">Wrong Network</span>
                </div>
                <p className="text-xs text-yellow-400">
                  Please switch to Polygon network (Chain ID: {POLYGON_CHAIN_ID}). Current: {chainId}
                </p>
                <Button
                  onClick={handleSwitchToPolygon}
                  size="sm"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Switch to Polygon
                </Button>
              </div>
            )}

            {/* Token and Chain Selection - Matching competitor design */}
            <div className="grid grid-cols-2 gap-3">
              {/* Token Selection */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">TOKEN</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowTokenDropdown(!showTokenDropdown);
                      setShowChainDropdown(false);
                    }}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-between hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-400">$</span>
                      </div>
                      <span className="text-white font-medium">{selectedToken.symbol}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${showTokenDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showTokenDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {TOKENS.map((token) => (
                        <button
                          key={token.symbol}
                          onClick={() => {
                            setSelectedToken(token);
                            setShowTokenDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-center gap-2 hover:bg-zinc-700 transition-colors text-left"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-400">$</span>
                          </div>
                          <span className="text-white font-medium">{token.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chain Selection */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase tracking-wide">CHAIN</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowChainDropdown(!showChainDropdown);
                      setShowTokenDropdown(false);
                    }}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-between hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-purple-400">P</span>
                      </div>
                      <span className="text-white font-medium">{selectedChain.name}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${showChainDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showChainDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {CHAINS.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => {
                            setSelectedChain(chain);
                            setShowChainDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-center gap-2 hover:bg-zinc-700 transition-colors text-left"
                        >
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-400">P</span>
                          </div>
                          <span className="text-white font-medium">{chain.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Available Balance */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Available Balance</span>
                <span className="text-white font-semibold">
                  {isLoadingEoaBalance ? 'Loading...' : displayEoaBalance} USDC
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 uppercase tracking-wide">AMOUNT</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <span className="text-zinc-400 text-sm">USDC</span>
              </div>
            </div>

            {/* Percentage Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((percentage) => (
                <Button
                  key={percentage}
                  variant="outline"
                  size="sm"
                  onClick={() => setPercentage(percentage)}
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white text-sm"
                >
                  {percentage === 100 ? 'MAX' : `${percentage}%`}
                </Button>
              ))}
            </div>

            {/* Transfer Button */}
            <Button
              onClick={handleDeposit}
              disabled={!amount || isProcessing || isWaitingTx || !hasProxyWallet || !isPolygon || isLoadingEoaBalance}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing || isWaitingTx ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isWaitingTx ? 'Processing...' : 'Confirming...'}
                </>
              ) : (
                <>Transfer to Trading Wallet</>
              )}
            </Button>

            {/* Error Messages */}
            {!hasProxyWallet && (
              <p className="text-xs text-yellow-500 text-center">
                Please deploy your proxy wallet first in the setup page
              </p>
            )}
            {!isPolygon && (
              <p className="text-xs text-yellow-500 text-center">
                Please switch to Polygon network to deposit USDC
              </p>
            )}
            {eoaBalanceError && (
              <p className="text-xs text-red-400 text-center">
                Error loading balance. Using manual check: {displayEoaBalance} USDC
              </p>
            )}
          </div>
        ) : (
          // Withdraw view
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Withdraw USDC</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAction(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Available in Trading Wallet</label>
              <div className="text-2xl font-bold text-white">
                {isLoadingProxyBalance ? 'Loading...' : displayProxyBalance} USDC
              </div>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-400">
                Withdraw functionality is coming soon. This requires Safe wallet transaction execution.
              </p>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled
              className="w-full bg-zinc-700 text-zinc-400 cursor-not-allowed"
            >
              Coming Soon
            </Button>
          </div>
        )}

        {/* Back Link */}
        {action && (
          <div className="text-center pt-2">
            <button
              onClick={() => setAction(null)}
              className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1 mx-auto"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
              Back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
