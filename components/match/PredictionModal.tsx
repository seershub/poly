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
import { formatCurrency } from '@/lib/utils';
import { SHARE_PRESETS, MIN_SHARE_SIZE, MAX_SHARE_SIZE } from '@/lib/constants';
import type { ParsedMatch, PredictionSide } from '@/types/match';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from '@/hooks/useToast';

interface PredictionModalProps {
  match: ParsedMatch;
  side: PredictionSide;
  onClose: () => void;
}

export function PredictionModal({ match, side, onClose }: PredictionModalProps) {
  const { isConnected } = useAccount();
  const { predict, isPending, isApproving } = usePlacePrediction();

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

  const handlePredict = () => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
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
          {/* Market Info */}
          <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Price:</span>
              <span className="font-semibold">{formatCurrency(price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Implied Odds:</span>
              <span className="font-semibold">{outcome.impliedOdds.toFixed(1)}%</span>
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
          <div className="bg-blue-600/20 border border-blue-600/30 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Est. Cost:</span>
              <span className="font-semibold">{formatCurrency(cost)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Potential Payout:</span>
              <span className="font-semibold">{formatCurrency(potentialPayout)} USDC</span>
            </div>
            <div className="border-t border-blue-600/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Potential Profit:</span>
                <span className="font-bold text-green-500">
                  +{formatCurrency(profit)} USDC
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handlePredict}
            disabled={isPending || !isConnected}
            className="gap-2"
          >
            {isApproving ? (
              'Approving USDC...'
            ) : isPending ? (
              'Placing Prediction...'
            ) : (
              <>Predict Now • {formatCurrency(cost)}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
