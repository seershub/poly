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

  // Helper to get a team logo URL (using a placeholder service for now)
  // In a real app, you'd map team names to specific assets or use a sports API
  const getTeamLogoUrl = (teamName: string) => {
    // Simple hash to get consistent colors/images if needed, but for now using UI Avatars
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=random&color=fff&size=64&font-size=0.4`;
  };

  return (
    <>
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group flex flex-col h-full">

        {/* Header: League & Date */}
        <div className="px-4 py-3 border-b border-border/30 bg-muted/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {match.platform === 'kalshi' ? (
              <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider">KALSHI</span>
            ) : (
              <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider">POLY</span>
            )}
            <span className="font-medium text-muted-foreground">{match.league}</span>
          </div>
          <span className="flex items-center gap-1 text-muted-foreground/80">
            <Calendar className="h-3 w-3" />
            {formatShortDate(match.matchDate)}
          </span>
        </div>

        {/* Match Content */}
        <Link href={`/matches/${match.slug}`} className="flex-1 p-4 flex flex-col gap-4">

          {/* Teams Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/50 p-1 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all">
                <img
                  src={getTeamLogoUrl(match.homeTeam)}
                  alt={match.homeTeam}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-sm font-bold leading-tight line-clamp-2 h-10 flex items-center justify-center">
                {match.homeTeam}
              </span>
            </div>

            {/* VS / Time */}
            <div className="flex flex-col items-center justify-center gap-1">
              <span className="text-xs font-bold text-muted-foreground/50">VS</span>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/50 p-1 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all">
                <img
                  src={getTeamLogoUrl(match.awayTeam)}
                  alt={match.awayTeam}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-sm font-bold leading-tight line-clamp-2 h-10 flex items-center justify-center">
                {match.awayTeam}
              </span>
            </div>
          </div>

          {/* Odds Display */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-green-500/5 border border-green-500/10 group-hover:border-green-500/30 transition-all text-center">
              <span className="text-[10px] font-semibold text-green-500/70 uppercase tracking-wider">Home Win</span>
              <span className="text-xl font-bold text-green-500">{formatPriceAsCents(match.outcomes.YES.price)}</span>
            </div>
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 group-hover:border-blue-500/30 transition-all text-center">
              <span className="text-[10px] font-semibold text-blue-500/70 uppercase tracking-wider">Away Win</span>
              <span className="text-xl font-bold text-blue-500">{formatPriceAsCents(match.outcomes.NO.price)}</span>
            </div>
          </div>

        </Link>

        {/* Footer Actions */}
        <div className="p-3 border-t border-border/30 bg-muted/10 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePredict('YES')}
            className="h-9 text-xs font-semibold bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-colors"
          >
            Bet {match.homeTeam}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePredict('NO')}
            className="h-9 text-xs font-semibold bg-background hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-colors"
          >
            Bet {match.awayTeam}
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
