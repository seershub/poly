// Polygon Mainnet Contract Addresses
export const POLYMARKET_CLOB_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' as const;
export const POLYMARKET_COLLATERAL_TOKEN = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const; // USDC (same as POLYGON_USDC_ADDRESS)

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
export const POLYMARKET_RELAYER_URL: string = process.env.NEXT_PUBLIC_POLYMARKET_RELAYER_URL || 'https://relayer-v2.polymarket.com';

// Chain Configuration
// Multi-chain support: Polygon (Polymarket), Ethereum, Base
// Note: Kalshi is a centralized exchange API and doesn't require blockchain integration
export const POLYGON_CHAIN_ID = 137;
export const ETHEREUM_CHAIN_ID = 1;
export const BASE_CHAIN_ID = 8453;
// Solana is not EVM-compatible (Chain ID: N/A, requires @solana/web3.js)

// Multi-chain USDC Addresses
// CRITICAL: Polygon has TWO USDC tokens - check BOTH!
export const POLYGON_USDC_NATIVE = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const; // USDC (Native) - NEW (2023+)
export const POLYGON_USDC_BRIDGED = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const; // USDC.e (Bridged from Ethereum) - OLD
export const POLYGON_USDC_ADDRESS = POLYGON_USDC_BRIDGED; // Default to bridged for Polymarket compatibility
export const ETHEREUM_USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const; // USDC on Ethereum
export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const; // USDC on Base

// Kalshi API Configuration
// Per Kalshi docs: https://docs.kalshi.com
// Kalshi is a centralized exchange and doesn't require blockchain integration
// Authentication: RSA Signature-based (API Key + Private Key)
export const KALSHI_API_URL: string = process.env.NEXT_PUBLIC_KALSHI_API_URL || 'https://api.kalshi.com/trade-api/v2';
export const KALSHI_API_KEY: string = process.env.KALSHI_API_KEY || '';
export const KALSHI_API_SECRET: string = process.env.KALSHI_API_SECRET || '';

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
