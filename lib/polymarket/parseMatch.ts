import type { PolymarketMarket } from '@/types/polymarket';
import type { ParsedMatch, MatchOutcome } from '@/types/match';

/**
 * Parse a Polymarket market into a structured match object.
 * CRITICAL: Extract team names from the outcomes array, NOT from the question string.
 * This ensures stability and accuracy.
 */
export function parsePolymarketMatch(market: PolymarketMarket): ParsedMatch | null {
  try {
    // Validate market has the required data
    if (!market || !market.outcomes || market.outcomes.length < 2) {
      return null;
    }

    // Extract team names from outcomes array
    // Typical format: ["Arsenal", "Chelsea"] or ["Team A", "Team B"]
    const homeTeam = market.outcomes[0] || 'Team 1';
    const awayTeam = market.outcomes[1] || 'Team 2';

    // Parse tokens for outcome data
    const tokens = market.tokens || [];

    // Get YES outcome (first team/outcome)
    const yesToken = tokens.find(t => t.outcome === market.outcomes[0]);
    const yesTokenId = market.clobTokenIds?.[0] || '';

    // Get NO outcome (second team/outcome)
    const noToken = tokens.find(t => t.outcome === market.outcomes[1]);
    const noTokenId = market.clobTokenIds?.[1] || '';

    // Parse prices from outcomePrices or tokens
    const yesPrice = yesToken?.price || parseFloat(market.outcomePrices?.[0] || '0.5');
    const noPrice = noToken?.price || parseFloat(market.outcomePrices?.[1] || '0.5');

    // Extract league from tags
    const league = extractLeagueFromTags(market.tags || []);

    // Parse match date
    const matchDate = market.endDate ? new Date(market.endDate) : new Date();

    const parsedMatch: ParsedMatch = {
      id: market.id,
      slug: market.slug,
      homeTeam,
      awayTeam,
      league,
      matchDate,
      outcomes: {
        YES: {
          tokenId: yesTokenId,
          outcome: homeTeam,
          price: yesPrice,
          impliedOdds: yesPrice * 100,
        },
        NO: {
          tokenId: noTokenId,
          outcome: awayTeam,
          price: noPrice,
          impliedOdds: noPrice * 100,
        },
      },
      volume: market.volumeNum || parseFloat(market.volume || '0'),
      liquidity: market.liquidityNum || parseFloat(market.liquidity || '0'),
      active: market.active,
      closed: market.closed,
      image: market.image || market.icon,
    };

    return parsedMatch;
  } catch (error) {
    console.error('Error parsing Polymarket match:', error);
    return null;
  }
}

/**
 * Extract league name from tags array
 */
function extractLeagueFromTags(tags: string[]): string {
  const leagueMap: Record<string, string> = {
    'premier-league': 'Premier League',
    'la-liga': 'La Liga',
    'bundesliga': 'Bundesliga',
    'serie-a': 'Serie A',
    'ligue-1': 'Ligue 1',
    'champions-league': 'Champions League',
    'europa-league': 'Europa League',
    'world-cup': 'World Cup',
    'soccer': 'Soccer',
    'football': 'Football',
  };

  for (const tag of tags) {
    const normalized = tag.toLowerCase();
    if (leagueMap[normalized]) {
      return leagueMap[normalized];
    }
  }

  return 'Soccer';
}

/**
 * Parse multiple markets into matches
 */
export function parsePolymarketMatches(markets: PolymarketMarket[]): ParsedMatch[] {
  return markets
    .map(market => parsePolymarketMatch(market))
    .filter((match): match is ParsedMatch => match !== null);
}

/**
 * Filter matches by league
 */
export function filterMatchesByLeague(matches: ParsedMatch[], league: string): ParsedMatch[] {
  if (!league || league === 'all') {
    return matches;
  }
  return matches.filter(match =>
    match.league.toLowerCase() === league.toLowerCase()
  );
}

/**
 * Filter matches by date range
 */
export function filterMatchesByDateRange(
  matches: ParsedMatch[],
  range: 'today' | 'week' | 'month' | 'all'
): ParsedMatch[] {
  if (range === 'all') {
    return matches;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return matches.filter(match => {
    const matchDate = new Date(match.matchDate);

    switch (range) {
      case 'today':
        return matchDate.toDateString() === today.toDateString();

      case 'week':
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return matchDate >= today && matchDate <= weekFromNow;

      case 'month':
        const monthFromNow = new Date(today);
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        return matchDate >= today && matchDate <= monthFromNow;

      default:
        return true;
    }
  });
}

/**
 * Sort matches
 */
export function sortMatches(
  matches: ParsedMatch[],
  sortBy: 'volume' | 'liquidity' | 'date'
): ParsedMatch[] {
  return [...matches].sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return b.volume - a.volume;
      case 'liquidity':
        return b.liquidity - a.liquidity;
      case 'date':
        return a.matchDate.getTime() - b.matchDate.getTime();
      default:
        return 0;
    }
  });
}
