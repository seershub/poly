'use client';

import Link from 'next/link';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { useAccount } from 'wagmi';
import { Trophy, Home, LayoutDashboard } from 'lucide-react';

export function Navbar() {
  const { isConnected } = useAccount();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold group">
            <div className="p-1.5 bg-gradient-to-br from-primary to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Poly SeersHub
            </span>
            <span className="sm:hidden bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              PSH
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <Link
              href="/matches"
              className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10"
            >
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Matches</span>
            </Link>

            {isConnected && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10"
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
