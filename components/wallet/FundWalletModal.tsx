'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAccount, useWalletClient, usePublicClient, useBalance, useWaitForTransactionReceipt, useChainId, useSwitchChain, useReadContract } from 'wagmi';
import { useProxyWallet } from '@/hooks/useProxyWallet';
import { POLYGON_USDC_ADDRESS, POLYGON_USDC_NATIVE, POLYGON_USDC_BRIDGED, ETHEREUM_USDC_ADDRESS, BASE_USDC_ADDRESS, USDC_DECIMALS, POLYGON_CHAIN_ID, ETHEREUM_CHAIN_ID, BASE_CHAIN_ID } from '@/lib/constants';
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

  // USDC ERC20 ABI for balanceOf
  const USDC_ABI = [
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
  ] as const;

  // CRITICAL: Polygon has TWO USDC tokens! Check BOTH!
  // 1. USDC (Native) - NEW: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
  // 2. USDC.e (Bridged) - OLD: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174

  // Check NATIVE USDC (new)
  const {
    data: eoaBalanceNative,
    isLoading: isLoadingNative,
    error: errorNative
  } = useBalance({
    address,
    token: POLYGON_USDC_NATIVE,
    chainId: polygon.id,
    query: {
      enabled: !!address && open,
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Check BRIDGED USDC (old/Polymarket default)
  const {
    data: eoaBalanceBridged,
    refetch: refetchEoaBalance,
    isLoading: isLoadingBridged,
    error: errorBridged
  } = useBalance({
    address,
    token: POLYGON_USDC_BRIDGED,
    chainId: polygon.id,
    query: {
      enabled: !!address && open,
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // MANUAL FALLBACK for NATIVE USDC
  const {
    data: manualNativeRaw,
    isLoading: isLoadingManualNative
  } = useReadContract({
    address: POLYGON_USDC_NATIVE,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: polygon.id,
    query: {
      enabled: !!address && open,
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // MANUAL FALLBACK for BRIDGED USDC
  const {
    data: manualBridgedRaw,
    refetch: refetchManualBalance,
    isLoading: isLoadingManualBridged
  } = useReadContract({
    address: POLYGON_USDC_BRIDGED,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: polygon.id,
    query: {
      enabled: !!address && open,
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Calculate balances for both tokens
  const nativeFormatted = eoaBalanceNative?.formatted || (manualNativeRaw ? formatUnits(manualNativeRaw, USDC_DECIMALS) : '0');
  const bridgedFormatted = eoaBalanceBridged?.formatted || (manualBridgedRaw ? formatUnits(manualBridgedRaw, USDC_DECIMALS) : '0');

  const nativeAmount = parseFloat(nativeFormatted);
  const bridgedAmount = parseFloat(bridgedFormatted);

  // SMART SELECTION: Use whichever has balance (prioritize native if both have balance)
  const eoaBalance = nativeAmount > 0 ? eoaBalanceNative : eoaBalanceBridged;
  const eoaBalanceError = nativeAmount > 0 ? errorNative : errorBridged;
  const isLoadingEoaBalance = isLoadingNative || isLoadingBridged;
  const isLoadingManualBalance = isLoadingManualNative || isLoadingManualBridged;

  // Selected USDC token address (for transfers)
  const selectedUsdcAddress = nativeAmount > 0 ? POLYGON_USDC_NATIVE : POLYGON_USDC_BRIDGED;
  const selectedUsdcType = nativeAmount > 0 ? 'USDC (Native)' : 'USDC.e (Bridged)';

  const manualBalanceFormatted = nativeAmount > 0 ?
    (manualNativeRaw ? formatUnits(manualNativeRaw, USDC_DECIMALS) : null) :
    (manualBridgedRaw ? formatUnits(manualBridgedRaw, USDC_DECIMALS) : null);

  const manualEoaBalance = (
    (eoaBalanceError || (eoaBalance && parseFloat(eoaBalance.formatted) === 0)) &&
    manualBalanceFormatted &&
    parseFloat(manualBalanceFormatted) > 0
  ) ? manualBalanceFormatted : null;

  // CRITICAL FIX: Get proxy wallet USDC balance - CHECK BOTH TOKENS!
  // Proxy wallet can have BOTH native and bridged USDC
  const {
    data: proxyBalanceNative,
    refetch: refetchProxyNative,
    isLoading: isLoadingProxyNative,
    error: proxyErrorNative
  } = useBalance({
    address: proxyWalletAddress || undefined,
    token: POLYGON_USDC_NATIVE,
    chainId: polygon.id,
    query: {
      enabled: !!proxyWalletAddress && open,
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000,
    },
  });

  const {
    data: proxyBalanceBridged,
    refetch: refetchProxyBridged,
    isLoading: isLoadingProxyBridged,
    error: proxyErrorBridged
  } = useBalance({
    address: proxyWalletAddress || undefined,
    token: POLYGON_USDC_BRIDGED,
    chainId: polygon.id,
    query: {
      enabled: !!proxyWalletAddress && open,
      refetchInterval: 5000,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Calculate total proxy balance (sum of both)
  const proxyNativeAmount = parseFloat(proxyBalanceNative?.formatted || '0');
  const proxyBridgedAmount = parseFloat(proxyBalanceBridged?.formatted || '0');
  const proxyTotalAmount = proxyNativeAmount + proxyBridgedAmount;

  const refetchProxyBalance = useCallback(() => {
    refetchProxyNative();
    refetchProxyBridged();
  }, [refetchProxyNative, refetchProxyBridged]);

  const isLoadingProxyBalance = isLoadingProxyNative || isLoadingProxyBridged;
  const proxyBalanceError = proxyErrorNative || proxyErrorBridged;

  // CRITICAL: Calculate display balances (prioritize manual fallback if useBalance failed)
  const displayEoaBalance = manualEoaBalance || eoaBalance?.formatted || '0.00';
  const displayProxyBalance = proxyTotalAmount > 0 ? proxyTotalAmount.toFixed(6) : '0.00';

  // Enhanced debug logging - DUAL USDC CHECK
  useEffect(() => {
    if (open && address) {
      console.log('=== FundWalletModal Debug Info ===');
      console.log('[Network] Chain ID:', chainId, '| Is Polygon:', isPolygon, '| Expected:', POLYGON_CHAIN_ID);
      console.log('[Addresses] EOA:', address);
      console.log('[Addresses] Proxy Wallet:', proxyWalletAddress || 'NOT DEPLOYED');
      console.log('[Addresses] Has Proxy Wallet:', hasProxyWallet);
      console.log('---');
      console.log('[USDC Native] Balance:', nativeFormatted, 'USDC | Loading:', isLoadingNative, '| Error:', errorNative?.message || 'none');
      console.log('[USDC Bridged] Balance:', bridgedFormatted, 'USDC | Loading:', isLoadingBridged, '| Error:', errorBridged?.message || 'none');
      console.log('[SELECTED] Using:', selectedUsdcType, '| Address:', selectedUsdcAddress);
      console.log('[EOA Balance] ✅ DISPLAY BALANCE:', displayEoaBalance, 'USDC');
      console.log('---');
      console.log('[Proxy Native] Balance:', proxyNativeAmount, 'USDC | Loading:', isLoadingProxyNative, '| Error:', proxyErrorNative?.message || 'none');
      console.log('[Proxy Bridged] Balance:', proxyBridgedAmount, 'USDC | Loading:', isLoadingProxyBridged, '| Error:', proxyErrorBridged?.message || 'none');
      console.log('[Proxy TOTAL] ✅ DISPLAY BALANCE:', displayProxyBalance, 'USDC (Native:', proxyNativeAmount, '+ Bridged:', proxyBridgedAmount + ')');
      console.log('==================================');
    }
  }, [open, address, chainId, isPolygon, nativeFormatted, bridgedFormatted, selectedUsdcType, selectedUsdcAddress, displayEoaBalance, displayProxyBalance, isLoadingNative, isLoadingBridged, errorNative, errorBridged, proxyWalletAddress, hasProxyWallet, isLoadingProxyNative, isLoadingProxyBridged, proxyErrorNative, proxyErrorBridged, proxyNativeAmount, proxyBridgedAmount]);

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
    console.log('=== Attempting USDC Deposit ===');

    if (!address || !proxyWalletAddress || !walletClient || !amount) {
      const missingFields = [];
      if (!address) missingFields.push('wallet address');
      if (!proxyWalletAddress) missingFields.push('proxy wallet');
      if (!walletClient) missingFields.push('wallet client');
      if (!amount) missingFields.push('amount');

      console.error('❌ Deposit failed - Missing:', missingFields.join(', '));
      toast({
        title: 'Error',
        description: `Missing: ${missingFields.join(', ')}. ${!proxyWalletAddress ? 'Please deploy your Safe Wallet first from the /setup page.' : 'Please ensure wallet is connected and enter an amount.'}`,
        variant: 'destructive',
      });
      return;
    }

    // CRITICAL: Check if on Polygon network
    if (!isPolygon) {
      console.error(`❌ Wrong network - Current: ${chainId}, Expected: ${POLYGON_CHAIN_ID}`);
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
      console.error('❌ Invalid amount:', amount);
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    // CRITICAL: Check balance - use manual fallback if available, otherwise useBalance
    const eoaBalanceValue = manualEoaBalance || eoaBalance?.formatted || '0';
    const eoaBalanceNum = parseFloat(eoaBalanceValue);

    console.log('Balance check:', {
      requested: amount,
      available: eoaBalanceValue,
      source: manualEoaBalance ? 'manual fallback' : 'useBalance hook',
    });

    if (amountNum > eoaBalanceNum) {
      console.error('❌ Insufficient balance:', { requested: amountNum, available: eoaBalanceNum });
      toast({
        title: 'Insufficient Balance',
        description: `You have ${eoaBalanceValue} USDC but trying to deposit ${amount}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      console.log('✅ All checks passed, initiating transfer...', {
        from: address,
        to: proxyWalletAddress,
        amount: amount,
        usdcToken: selectedUsdcType,
        usdcAddress: selectedUsdcAddress,
        chainId,
      });

      const hash = await depositUsdcToProxyWallet(
        walletClient,
        address,
        proxyWalletAddress,
        amount,
        selectedUsdcAddress as `0x${string}`
      );

      console.log('✅ Deposit transaction submitted:', hash);
      setTxHash(hash);
      toast({
        title: 'Transaction Submitted',
        description: `Transferring ${amount} ${selectedUsdcType}...`,
      });
    } catch (error: any) {
      console.error('❌ Deposit error:', error);
      toast({
        title: 'Deposit Failed',
        description: error.message || 'Failed to deposit USDC. Check console for details.',
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
    // CRITICAL: Use manual fallback if available, otherwise useBalance
    const balanceValue = manualEoaBalance || eoaBalance?.formatted || '0';
    if (!balanceValue || action !== 'deposit') return;
    const balance = parseFloat(balanceValue);
    const calculatedAmount = (balance * percentage / 100).toFixed(2);
    setAmount(calculatedAmount);
  };

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
                  {isLoadingEoaBalance ? 'Loading...' : displayEoaBalance} {selectedUsdcType}
                </span>
              </div>
              {nativeAmount > 0 && bridgedAmount > 0 && (
                <div className="text-xs text-blue-400">
                  Note: You have both USDC types. Using Native USDC.
                </div>
              )}
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
              disabled={!amount || isProcessing || isWaitingTx || !hasProxyWallet || !isPolygon}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing || isWaitingTx ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isWaitingTx ? 'Processing...' : 'Confirming...'}
                </>
              ) : isLoadingEoaBalance || isLoadingManualBalance ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading Balance...
                </>
              ) : (
                <>Transfer to Trading Wallet</>
              )}
            </Button>

            {/* Status Messages */}
            {!hasProxyWallet && (
              <div className="flex items-center gap-2 justify-center text-xs text-yellow-500">
                <AlertCircle className="h-3 w-3" />
                <span>Please deploy your proxy wallet first at /setup</span>
              </div>
            )}
            {!isPolygon && (
              <div className="flex items-center gap-2 justify-center text-xs text-yellow-500">
                <AlertCircle className="h-3 w-3" />
                <span>Please switch to Polygon network to deposit USDC</span>
              </div>
            )}
            {eoaBalanceError && manualEoaBalance && (
              <div className="flex items-center gap-2 justify-center text-xs text-blue-400">
                <AlertCircle className="h-3 w-3" />
                <span>Using fallback balance check: {displayEoaBalance} USDC</span>
              </div>
            )}
            {eoaBalanceError && !manualEoaBalance && (
              <div className="flex items-center gap-2 justify-center text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                <span>Failed to load balance. Please refresh or check your connection.</span>
              </div>
            )}
            {(isLoadingEoaBalance || isLoadingManualBalance) && (
              <div className="flex items-center gap-2 justify-center text-xs text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading balance from Polygon network...</span>
              </div>
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
