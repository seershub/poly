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
import { useAccount, useWalletClient, usePublicClient, useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { useProxyWallet } from '@/hooks/useProxyWallet';
import { POLYGON_USDC_ADDRESS, USDC_DECIMALS } from '@/lib/constants';
import { depositUsdcToProxyWallet, getUsdcBalance } from '@/lib/polymarket/usdcTransfer';
import { parseUnits, formatUnits } from 'viem';
import { Wallet, ArrowDown, ArrowUp, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface FundWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FundAction = 'deposit' | 'withdraw' | null;

export function FundWalletModal({ open, onOpenChange }: FundWalletModalProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { proxyWalletAddress, hasProxyWallet } = useProxyWallet();
  const { toast } = useToast();
  
  const [action, setAction] = useState<FundAction>(null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get EOA USDC balance
  const { data: eoaBalance, refetch: refetchEoaBalance } = useBalance({
    address,
    token: POLYGON_USDC_ADDRESS,
    query: {
      enabled: !!address && open,
      refetchInterval: 5000,
    },
  });

  // Get proxy wallet USDC balance
  const { data: proxyBalance, refetch: refetchProxyBalance } = useBalance({
    address: proxyWalletAddress || undefined,
    token: POLYGON_USDC_ADDRESS,
    query: {
      enabled: !!proxyWalletAddress && open,
      refetchInterval: 5000,
    },
  });

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

  const handleDeposit = async () => {
    if (!address || !proxyWalletAddress || !walletClient || !amount) {
      toast({
        title: 'Error',
        description: 'Please enter an amount and ensure wallet is connected',
        variant: 'destructive',
      });
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

    const eoaBalanceNum = parseFloat(eoaBalance?.formatted || '0');
    if (amountNum > eoaBalanceNum) {
      toast({
        title: 'Insufficient Balance',
        description: `You have ${eoaBalance?.formatted || '0.00'} USDC but trying to deposit ${amount}`,
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
    if (!eoaBalance || action !== 'deposit') return;
    const balance = parseFloat(eoaBalance.formatted);
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
                <ArrowDown className="h-4 w-4 text-zinc-400 rotate-[-90deg]" />
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
                <ArrowDown className="h-4 w-4 text-zinc-400 rotate-[-90deg]" />
              </div>
            </button>

            {/* Balance Info */}
            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Your Wallet:</span>
                <span className="text-white font-semibold">{eoaBalance?.formatted || '0.00'} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Trading Wallet:</span>
                <span className="text-white font-semibold">{proxyBalance?.formatted || '0.00'} USDC</span>
              </div>
            </div>
          </div>
        ) : action === 'deposit' ? (
          // Deposit view
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

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Available Balance</label>
              <div className="text-2xl font-bold text-white">
                {eoaBalance?.formatted || '0.00'} USDC
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Amount</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <span className="text-zinc-400">USDC</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((percentage) => (
                <Button
                  key={percentage}
                  variant="outline"
                  size="sm"
                  onClick={() => setPercentage(percentage)}
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                >
                  {percentage === 100 ? 'MAX' : `${percentage}%`}
                </Button>
              ))}
            </div>

            <Button
              onClick={handleDeposit}
              disabled={!amount || isProcessing || isWaitingTx || !hasProxyWallet}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
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

            {!hasProxyWallet && (
              <p className="text-xs text-yellow-500 text-center">
                Please deploy your proxy wallet first in the setup page
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
                {proxyBalance?.formatted || '0.00'} USDC
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
      </DialogContent>
    </Dialog>
  );
}

