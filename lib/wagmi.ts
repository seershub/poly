'use client';

import { http, createConfig, cookieStorage, createStorage } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Get WalletConnect project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set');
}

// Configure Polygon chain
export const config = createConfig({
  chains: [polygon],
  connectors: [
    injected({ target: 'metaMask' }),
    walletConnect({
      projectId,
      metadata: {
        name: 'Poly SeersHub',
        description: 'Sports prediction dApp powered by Polymarket',
        url: 'https://poly.seershub.com',
        icons: ['https://poly.seershub.com/icon.png'],
      },
      showQrModal: true,
    }),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [polygon.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
