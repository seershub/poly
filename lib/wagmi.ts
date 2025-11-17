'use client';

import { http, createConfig, cookieStorage, createStorage } from 'wagmi';
import { polygon, base, mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Get WalletConnect project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set');
}

// Multi-chain configuration: Polygon (Polymarket), Ethereum, Base
// Note: Solana is not an EVM chain, so it requires separate integration (e.g., @solana/web3.js)
// Kalshi is a centralized exchange API and doesn't require blockchain integration
// Note: PrivyProvider handles wallet connections, so we primarily use injected connector
// WalletConnect connector disabled to prevent double initialization with Privy
// If you need WalletConnect, disable Privy or use Privy's built-in WalletConnect support
export const config = createConfig({
  chains: [
    polygon,      // Chain ID: 137 - Polymarket
    mainnet,      // Chain ID: 1 - Ethereum Mainnet
    base,         // Chain ID: 8453 - Base L2
    // Solana is not EVM-compatible, requires separate integration
  ],
  connectors: [
    injected({ target: 'metaMask' }),
    // WalletConnect disabled to prevent double initialization with Privy
    // PrivyProvider already includes WalletConnect support
    // Uncomment below if not using Privy:
    // ...(projectId ? [walletConnect({
    //   projectId,
    //   metadata: {
    //     name: 'Poly SeersHub',
    //     description: 'Sports prediction dApp powered by Polymarket & Kalshi',
    //     url: 'https://poly.seershub.com',
    //     icons: ['https://poly.seershub.com/icon.png'],
    //   },
    //   showQrModal: true,
    // })] : []),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com'),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
