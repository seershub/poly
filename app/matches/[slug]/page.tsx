'use client';

import { use } from 'react';
import { usePolymarketMarket } from '@/hooks/usePolymarketMarkets';
import { PredictionModal } from '@/components/match/PredictionModal';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils';
import { Calendar, TrendingUp, Droplets, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { PredictionSide } from '@/types/match';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: match, isLoading, error } = usePolymarketMarket(slug);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [selectedSide, setSelectedSide] = useState<PredictionSide>('YES');

  const handlePredict = (side: PredictionSide) => {
    setSelectedSide(side);
    setShowPredictionModal(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-500 mb-4">Match not found</p>
        <Link href="/matches">
          <Button variant="outline">Back to Matches</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/matches">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Matches
          </Button>
        </Link>

        {/* Match Header */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
            <span className="font-medium">{match.league}</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(match.matchDate)}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Home Team */}
            <div className="bg-secondary/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">{match.homeTeam}</h2>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Win Probability</span>
                <span className="text-xl font-semibold text-green-500">
                  {formatPercentage(match.outcomes.YES.price, 1)}
                </span>
              </div>
            </div>

            {/* Away Team */}
            <div className="bg-secondary/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">{match.awayTeam}</h2>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Win Probability</span>
                <span className="text-xl font-semibold text-blue-500">
                  {formatPercentage(match.outcomes.NO.price, 1)}
                </span>
              </div>
            </div>
          </div>

          {/* Prediction Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              size="lg"
              onClick={() => handlePredict('YES')}
              className="bg-green-600 hover:bg-green-700"
            >
              Predict {match.homeTeam} Wins
            </Button>
            <Button
              size="lg"
              onClick={() => handlePredict('NO')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Predict {match.awayTeam} Wins
            </Button>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">24h Volume</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(match.volume, 0)}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Droplets className="h-4 w-4" />
              <span className="text-sm">Liquidity</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(match.liquidity, 0)}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Status</span>
            </div>
            <p className="text-2xl font-bold">
              {match.active ? (
                <span className="text-green-500">Active</span>
              ) : (
                <span className="text-red-500">Closed</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Prediction Modal */}
      {showPredictionModal && match && (
        <PredictionModal
          match={match}
          side={selectedSide}
          onClose={() => setShowPredictionModal(false)}
        />
      )}
    </>
  );
}
