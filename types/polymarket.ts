// Polymarket Market Types
export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  description: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  volume24hr: string;
  liquidity: string;
  endDate: string;
  startDate?: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  marketMakerAddress?: string;
  rewardsMinSize?: string;
  rewardsMaxSpread?: string;
  spread?: number;
  groupItemTitle?: string;
  groupItemThreshold?: string;
  questionID?: string;
  enableOrderBook: boolean;
  orderPriceMinTickSize: number;
  orderMinSize: number;
  volumeNum: number;
  liquidityNum: number;
  endDateIso?: string;
  archived: boolean;
  conditionId: string;
  tokens: PolymarketToken[];
  clobTokenIds: string[];
  acceptingOrders: boolean;
  acceptingOrdersTimestamp: string;
  negRisk: boolean;
  tags?: string[];
  events?: PolymarketEvent[];
  competitive?: number;
  seconds_delay?: number;
  fpmm?: string;
}

export interface PolymarketToken {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  markets: string[];
  startDate?: string;
  endDate?: string;
  tags?: string[];
  ticker?: string;
}

// Gamma Event Type (from /events endpoint)
export interface GammaEvent {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  markets?: PolymarketMarket[];
  tags?: string[];
  closed?: boolean;
  active?: boolean;
}

// CLOB Client Types
export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
}

export interface OrderArgs {
  tokenID: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  feeRateBps?: number;
  nonce?: number;
  expiration?: number;
  taker?: string;
}

export interface PlacedOrder {
  orderID: string;
  transactionHash?: string;
  status: 'LIVE' | 'MATCHED' | 'CANCELLED';
  timestamp: number;
}

export interface UserPosition {
  marketId: string;
  tokenId: string;
  outcome: string;
  size: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
}

export interface MarketOrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface OrderBookLevel {
  price: string;
  size: string;
}

// Gamma API Response Types
export interface GammaMarketsResponse {
  data: PolymarketMarket[];
  count: number;
  limit: number;
  offset: number;
}

export interface GammaSportsResponse {
  tags: string[];
  sports: SportCategory[];
}

export interface SportCategory {
  tag: string;
  label: string;
  markets: number;
  volume: string;
}
