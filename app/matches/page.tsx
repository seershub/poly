'use client';

import { MatchGrid } from '@/components/match/MatchGrid';

export default function MatchesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          Soccer Matches
        </h1>
        <p className="text-muted-foreground text-lg">
          Browse and predict outcomes for upcoming soccer matches on Polymarket
        </p>
      </div>

      <MatchGrid />
    </div>
  );
}
