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
      <div className="bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group">
        {/* Header: League and Date */}
        <div className="flex items-center justify-between mb-4 text-xs">
          <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded">{match.league}</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatShortDate(match.matchDate)}
          </span>
        </div>

        {/* Teams */}
        <Link href={`/matches/${match.slug}`} className="block mb-4">
          <div className="space-y-2.5">
            {/* Home Team */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-lg hover:from-green-500/20 hover:to-emerald-500/10 transition-all group-hover:border-green-500/40">
              <span className="font-bold text-sm">{match.homeTeam}</span>
              <span className="text-lg font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded">
                {formatPriceAsCents(match.outcomes.YES.price)}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-lg hover:from-blue-500/20 hover:to-cyan-500/10 transition-all group-hover:border-blue-500/40">
              <span className="font-bold text-sm">{match.awayTeam}</span>
              <span className="text-lg font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded">
                {formatPriceAsCents(match.outcomes.NO.price)}
              </span>
            </div>
          </div>
        </Link>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4 p-2 bg-secondary/30 rounded-lg text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Vol: <span className="text-foreground">{formatCurrency(match.volume, 0)}</span></span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Droplets className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Liq: <span className="text-foreground">{formatCurrency(match.liquidity, 0)}</span></span>
          </span>
        </div>

        {/* Prediction Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePredict('YES')}
            className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 border-green-500/40 hover:from-green-500/30 hover:to-emerald-500/20 hover:border-green-500/60 text-green-400 font-semibold transition-all"
          >
            {match.homeTeam}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePredict('NO')}
            className="bg-gradient-to-r from-blue-500/20 to-cyan-500/10 border-blue-500/40 hover:from-blue-500/30 hover:to-cyan-500/20 hover:border-blue-500/60 text-blue-400 font-semibold transition-all"
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
