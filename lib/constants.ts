// Polygon Mainnet Contract Addresses
export const POLYGON_USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const;
export const POLYMARKET_CLOB_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' as const;
export const POLYMARKET_COLLATERAL_TOKEN = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const; // USDC

// Polymarket Proxy Wallet Factories
// Per Polymarket docs: Proxy wallets are 1 of 1 multisig wallets deployed for each user
// They hold user positions (ERC1155) and USDC (ERC20)
// https://docs.polymarket.com/developers/proxy-wallet
export const POLYMARKET_GNOSIS_SAFE_FACTORY = '0xaacfeea03eb1561c4e67d661e40682bd20e3541b' as const; // For MetaMask users
export const POLYMARKET_PROXY_FACTORY = '0xaB45c54AB0c941a2F231C04C3f49182e1A254052' as const; // For MagicLink users

// Polymarket API Endpoints
// Use environment variables if available, otherwise use defaults
// NEXT_PUBLIC_ prefix makes these available on both client and server
export const GAMMA_API_URL: string = process.env.NEXT_PUBLIC_GAMMA_API_URL || 'https://gamma-api.polymarket.com';
export const CLOB_API_URL: string = process.env.NEXT_PUBLIC_CLOB_API_URL || 'https://clob.polymarket.com';
export const DATA_API_URL: string = process.env.NEXT_PUBLIC_DATA_API_URL || 'https://data-api.polymarket.com';

// Polymarket Relayer URL
// Per Polymarket docs: https://docs.polymarket.com/developers/builders/relayer-client
export const POLYMARKET_RELAYER_URL: string = process.env.NEXT_PUBLIC_POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com/';

// Chain Configuration
// Use environment variable if available, otherwise use default (Polygon Mainnet)
export const POLYGON_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '137');

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
