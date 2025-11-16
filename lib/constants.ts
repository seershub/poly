// Polygon Mainnet Contract Addresses
export const POLYGON_USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const;
export const POLYMARKET_CLOB_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' as const;
export const POLYMARKET_COLLATERAL_TOKEN = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const; // USDC

// Polymarket API Endpoints
export const GAMMA_API_URL = 'https://gamma-api.polymarket.com' as const;
export const CLOB_API_URL = 'https://clob.polymarket.com' as const;
export const DATA_API_URL = 'https://data-api.polymarket.com' as const;

// Chain Configuration
export const POLYGON_CHAIN_ID = 137;

// Default Order Configuration
export const DEFAULT_FEE_RATE_BPS = 0; // 0 basis points
export const DEFAULT_EXPIRATION = Math.floor(Date.now() / 1000) + 86400; // 24 hours

// Sports Tags
export const SOCCER_TAGS = [
  'soccer',
  'football',
  'premier-league',
  'la-liga',
  'bundesliga',
  'serie-a',
  'ligue-1',
  'champions-league',
  'europa-league',
  'world-cup',
] as const;

// UI Constants
export const SHARE_PRESETS = [1, 5, 10, 25] as const;
export const MIN_SHARE_SIZE = 0.1;
export const MAX_SHARE_SIZE = 10000;

// USDC Configuration
export const USDC_DECIMALS = 6;

// Order Book Configuration
export const MIN_TICK_SIZE = 0.01;
export const MIN_ORDER_SIZE = 0.1;
