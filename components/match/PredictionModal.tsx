'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePlacePrediction } from '@/hooks/usePlacePrediction';
import { useAccount } from 'wagmi';
import { formatCurrency, formatPriceAsCents } from '@/lib/utils';
import { SHARE_PRESETS, MIN_SHARE_SIZE, MAX_SHARE_SIZE } from '@/lib/constants';
import type { ParsedMatch, PredictionSide } from '@/types/match';
import { TrendingUp, TrendingDown, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useChainId, useSwitchChain } from 'wagmi';
import { POLYGON_CHAIN_ID, ETHEREUM_CHAIN_ID, BASE_CHAIN_ID } from '@/lib/constants';
import { polygon, mainnet, base } from 'viem/chains';

interface PredictionModalProps {
  match: ParsedMatch;
  side: PredictionSide;
  onClose: () => void;
}

export function PredictionModal({ match, side, onClose }: PredictionModalProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { predict, isPending, isApproving, error } = usePlacePrediction();
  
  // CRITICAL: Determine required chain based on match platform
  const getRequiredChain = () => {
    if (match.chain === 'ethereum') return ETHEREUM_CHAIN_ID;
    if (match.chain === 'base') return BASE_CHAIN_ID;
    if (match.chain === 'polygon') return POLYGON_CHAIN_ID;
    // Kalshi (none) or Solana - no chain switch needed
    return POLYGON_CHAIN_ID; // Default to Polygon
  };
  
  const requiredChain = getRequiredChain();
  const isOnCorrectChain = match.chain === 'none' || match.chain === 'solana' || chainId === requiredChain;
  
  // Get chain name for display
  const getChainName = () => {
    if (match.chain === 'ethereum') return 'Ethereum';
    if (match.chain === 'base') return 'Base';
    if (match.chain === 'polygon') return 'Polygon';
    if (match.chain === 'solana') return 'Solana';
    return 'Polygon'; // Default
  };
  const chainName = getChainName();

  // CRITICAL: Share-based input (NOT amount-based)
  const [shares, setShares] = useState(1.0);

  // Get the selected team and price
  const team = side === 'YES' ? match.homeTeam : match.awayTeam;
  const outcome = match.outcomes[side];
  const price = outcome.price; // e.g., 0.65

  // UPDATED CALCULATIONS (Share-based, NOT amount-based)
  const cost = shares * price; // Cost = shares * price per share
  const potentialPayout = shares * 1.0; // Payout = shares * $1 (if they win)
  const profit = potentialPayout - cost; // Profit = payout - cost

  const handleSwitchChain = async () => {
    try {
      let targetChain;
      if (match.chain === 'ethereum') targetChain = mainnet;
      else if (match.chain === 'base') targetChain = base;
      else if (match.chain === 'polygon') targetChain = polygon;
      else {
        toast({
          title: 'Invalid Chain',
          description: 'Chain switching not supported for this market',
          variant: 'destructive',
        });
        return;
      }
      await switchChain({ chainId: targetChain.id });
    } catch (error: any) {
      console.error('Error switching chain:', error);
      toast({
        title: 'Network Switch Failed',
        description: error.message || `Failed to switch to ${chainName} network`,
        variant: 'destructive',
      });
    }
  };

  const handlePredict = () => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return;
    }

    // CRITICAL: Check if on correct chain (only for blockchain-based platforms)
    // Kalshi is centralized API, no chain required
    if (match.chain !== 'none' && match.chain !== 'solana' && !isOnCorrectChain) {
      toast({
        title: 'Wrong Network',
        description: `Please switch to ${chainName} network (Chain ID: ${requiredChain}). Current: ${chainId}`,
        variant: 'destructive',
      });
      handleSwitchChain();
      return;
    }

    // CRITICAL: Kalshi markets not yet supported for predictions
    // TODO: Implement Kalshi prediction logic when API is ready
    if (match.platform === 'kalshi') {
      toast({
        title: 'Coming Soon',
        description: 'Kalshi predictions will be available soon.',
        variant: 'default',
      });
      return;
    }

    if (shares < MIN_SHARE_SIZE || shares > MAX_SHARE_SIZE) {
      toast({
        title: 'Invalid Share Amount',
        description: `Shares must be between ${MIN_SHARE_SIZE} and ${MAX_SHARE_SIZE}.`,
        variant: 'destructive',
      });
      return;
    }

    predict(
      {
        tokenId: outcome.tokenId,
        side: 'BUY', // Always BUY for predictions (YES or NO outcome)
        size: shares, // CRITICAL: Send 'size' (shares), NOT 'amount' (USDC)
        price: price, // Use current price for market order
      },
      {
        onSuccess: () => {
          toast({
            title: 'Prediction Placed!',
            description: `Successfully predicted ${team} with ${shares} shares.`,
          });
          onClose();
        },
        onError: (error: any) => {
          if (error.message === 'APPROVAL_REQUIRED') {
            toast({
              title: 'Approval Required',
              description: 'Please approve USDC spending in your wallet.',
            });
          } else {
            toast({
              title: 'Prediction Failed',
              description: error.message || 'Failed to place prediction.',
              variant: 'destructive',
            });
          }
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {side === 'YES' ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            Predict: {team} Wins
          </DialogTitle>
          <DialogDescription>
            Place your prediction on {team} to win this match
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Network Warning */}
          {!isOnCorrectChain && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg flex items-center gap-2 text-yellow-500">
              <AlertCircle className="h-4 w-4" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Wrong Network</p>
                <p className="text-xs text-yellow-400/70">
                  Please switch to {chainName} network (Chain ID: {requiredChain})
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSwitchChain}
                className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20"
              >
                Switch
              </Button>
            </div>
          )}

          {/* Market Info */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Price:</span>
              <span className="font-bold text-lg">{formatPriceAsCents(price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Implied Odds:</span>
              <span className="font-semibold">{outcome.impliedOdds.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-blue-500/20">
              <span>Volume:</span>
              <span>{match.volume > 0 ? `$${(match.volume / 1000).toFixed(1)}K` : 'N/A'}</span>
            </div>
          </div>

          {/* Share Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Number of Shares</label>

            {/* Preset Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {SHARE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={shares === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShares(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>

            {/* Custom Input */}
            <input
              type="number"
              value={shares}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  setShares(Math.max(MIN_SHARE_SIZE, Math.min(MAX_SHARE_SIZE, value)));
                }
              }}
              min={MIN_SHARE_SIZE}
              max={MAX_SHARE_SIZE}
              step={0.1}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter shares"
            />
            <p className="text-xs text-muted-foreground">
              Min: {MIN_SHARE_SIZE} shares • Max: {MAX_SHARE_SIZE} shares
            </p>
          </div>

          {/* Payout Calculations */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Est. Cost:</span>
              <span className="font-bold text-lg">{formatCurrency(cost)} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Potential Payout:</span>
              <span className="font-semibold text-green-400">{formatCurrency(potentialPayout)} USDC</span>
            </div>
            <div className="border-t border-green-500/30 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Potential Profit:</span>
                <span className="font-bold text-xl text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-5 w-5" />
                  +{formatCurrency(profit)} USDC
                </span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-start gap-2 text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-semibold mb-1">Error</p>
                <p className="text-xs">{error.message || 'Failed to place prediction'}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending || isApproving}>
            Cancel
          </Button>
          <Button
            onClick={handlePredict}
            disabled={isPending || isApproving || !isConnected || !isOnCorrectChain || match.platform === 'kalshi'}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
          >
            {isApproving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Approving USDC...
              </>
            ) : isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing Prediction...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Predict Now • {formatCurrency(cost)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
