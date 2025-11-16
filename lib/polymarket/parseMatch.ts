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
      console.warn('Invalid market data:', { hasMarket: !!market, outcomesCount: market?.outcomes?.length });
      return null;
    }

    // Extract team names from outcomes array
    // Typical format: ["Arsenal", "Chelsea"] or ["Team A", "Team B"]
    const homeTeam = market.outcomes[0] || 'Team 1';
    const awayTeam = market.outcomes[1] || 'Team 2';

    // Parse tokens for outcome data
    const tokens = market.tokens || [];

    // Get token IDs - try multiple sources
    // 1. clobTokenIds array (if available)
    // 2. tokens array with token_id field
    // 3. tokens array with id field
    let yesTokenId = market.clobTokenIds?.[0] || '';
    let noTokenId = market.clobTokenIds?.[1] || '';

    // Get YES outcome (first team/outcome)
    const yesToken = tokens.find(t => {
      const tokenOutcome = typeof t === 'object' ? t.outcome : null;
      return tokenOutcome === market.outcomes[0] || tokenOutcome === homeTeam;
    });
    
    // Get NO outcome (second team/outcome)
    const noToken = tokens.find(t => {
      const tokenOutcome = typeof t === 'object' ? t.outcome : null;
      return tokenOutcome === market.outcomes[1] || tokenOutcome === awayTeam;
    });

    // Extract token IDs from tokens if clobTokenIds not available
    if (!yesTokenId && yesToken && typeof yesToken === 'object') {
      yesTokenId = (yesToken as any).token_id || (yesToken as any).id || '';
    }
    if (!noTokenId && noToken && typeof noToken === 'object') {
      noTokenId = (noToken as any).token_id || (noToken as any).id || '';
    }

    // Parse prices from multiple sources (tokens, outcomePrices, or default)
    const yesPrice = yesToken && typeof yesToken === 'object' && 'price' in yesToken
      ? (typeof yesToken.price === 'number' ? yesToken.price : parseFloat(String(yesToken.price)))
      : parseFloat(market.outcomePrices?.[0] || '0.5');
    
    const noPrice = noToken && typeof noToken === 'object' && 'price' in noToken
      ? (typeof noToken.price === 'number' ? noToken.price : parseFloat(String(noToken.price)))
      : parseFloat(market.outcomePrices?.[1] || '0.5');

    // Extract league from tags (handle both string array and object array)
    const tags = market.tags || [];
    const tagStrings = tags.map(tag => 
      typeof tag === 'string' ? tag : (typeof tag === 'object' && tag !== null ? (tag as any).name || (tag as any).tag || String(tag) : String(tag))
    );
    const league = extractLeagueFromTags(tagStrings);

    // Parse match date - try multiple date fields
    let matchDate = new Date();
    if (market.endDate) {
      matchDate = new Date(market.endDate);
    } else if (market.endDateIso) {
      matchDate = new Date(market.endDateIso);
    } else if ((market as any).end_date) {
      matchDate = new Date((market as any).end_date);
    }
    
    // Validate date
    if (isNaN(matchDate.getTime())) {
      matchDate = new Date(); // Fallback to current date
    }

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
