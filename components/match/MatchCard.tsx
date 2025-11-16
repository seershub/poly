'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PredictionModal } from './PredictionModal';
import { formatCurrency, formatShortDate, formatPercentage, formatPriceAsCents } from '@/lib/utils';
import type { ParsedMatch, PredictionSide } from '@/types/match';
import { Calendar, TrendingUp, Droplets } from 'lucide-react';

interface MatchCardProps {
  match: ParsedMatch;
}

export function MatchCard({ match }: MatchCardProps) {
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [selectedSide, setSelectedSide] = useState<PredictionSide>('YES');

  const handlePredict = (side: PredictionSide) => {
    setSelectedSide(side);
    setShowPredictionModal(true);
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all">
        {/* Header: League and Date */}
        <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
          <span className="font-medium">{match.league}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatShortDate(match.matchDate)}
          </span>
        </div>

        {/* Teams */}
        <Link href={`/matches/${match.slug}`} className="block mb-4">
          <div className="space-y-2">
            {/* Home Team */}
            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded hover:bg-secondary/50 transition-colors">
              <span className="font-semibold">{match.homeTeam}</span>
              <span className="text-sm font-bold text-foreground">
                {formatPriceAsCents(match.outcomes.YES.price)}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded hover:bg-secondary/50 transition-colors">
              <span className="font-semibold">{match.awayTeam}</span>
              <span className="text-sm font-bold text-foreground">
                {formatPriceAsCents(match.outcomes.NO.price)}
              </span>
            </div>
          </div>
        </Link>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Vol: {formatCurrency(match.volume, 0)}
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            Liq: {formatCurrency(match.liquidity, 0)}
          </span>
        </div>

        {/* Prediction Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePredict('YES')}
            className="bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-500"
          >
            {match.homeTeam}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePredict('NO')}
            className="bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-500"
          >
            {match.awayTeam}
          </Button>
        </div>
      </div>

      {/* Prediction Modal */}
      {showPredictionModal && (
        <PredictionModal
          match={match}
          side={selectedSide}
          onClose={() => setShowPredictionModal(false)}
        />
      )}
    </>
  );
}
