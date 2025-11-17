'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider } from '@privy-io/react-auth';
import { config } from '@/lib/wagmi';
import { useState } from 'react';
import { polygon } from 'viem/chains';

// Note: Privy wallets work with Wagmi through PrivyProvider's built-in integration
// No separate @privy-io/wagmi package needed for basic functionality

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // Privy App ID from environment variables
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmi2etaa501n3js0clqp3a5ri';

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        // Login methods - enable email, wallet, and social logins
        loginMethods: ['email', 'wallet', 'sms', 'google', 'twitter', 'github'],
        // Appearance customization
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
          logo: '/logo.png', // Add your logo
        },
        // Embedded wallet configuration for Polygon
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
          noPromptOnSignature: false,
        },
        // Legal and terms
        legal: {
          termsAndConditionsUrl: '/terms',
          privacyPolicyUrl: '/privacy',
        },
        // Customize the modal
        modal: {
          showOnLoad: false,
        },
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}
