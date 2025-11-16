'use client';

import { MatchGrid } from '@/components/match/MatchGrid';

export default function MatchesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Soccer Matches</h1>
        <p className="text-muted-foreground">
          Browse and predict outcomes for upcoming soccer matches
        </p>
      </div>

      <MatchGrid />
    </div>
  );
}
