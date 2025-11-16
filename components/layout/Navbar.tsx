'use client';

import Link from 'next/link';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { useAccount } from 'wagmi';
import { Trophy, Home, LayoutDashboard } from 'lucide-react';

export function Navbar() {
  const { isConnected } = useAccount();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">Poly SeersHub</span>
            <span className="sm:hidden">PSH</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            {isConnected && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}

            <WalletConnect />
          </div>
        </div>
      </div>
    </nav>
  );
}
