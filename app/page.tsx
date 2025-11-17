import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <Trophy className="h-20 w-20 text-primary" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Predict. Win. Earn.
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          The ultimate sports prediction platform powered by Polymarket.
          Predict soccer match outcomes and earn rewards.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/matches">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg">
              <TrendingUp className="h-5 w-5" />
              Browse Matches
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="gap-2 border-2 hover:bg-primary/10">
              View Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Decentralized</h3>
          <p className="text-muted-foreground">
            Built on Polygon with Polymarket infrastructure. Your funds are always secure.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <TrendingUp className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Real Markets</h3>
          <p className="text-muted-foreground">
            Trade on real Polymarket markets with live prices and deep liquidity.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <Zap className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Instant Trading</h3>
          <p className="text-muted-foreground">
            Place predictions instantly using Polymarket&apos;s CLOB for best execution.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-secondary/30 rounded-lg p-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h4 className="font-semibold mb-2">Connect Wallet</h4>
            <p className="text-sm text-muted-foreground">
              Connect your wallet to get started
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h4 className="font-semibold mb-2">Browse Matches</h4>
            <p className="text-sm text-muted-foreground">
              Explore upcoming soccer matches
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h4 className="font-semibold mb-2">Make Predictions</h4>
            <p className="text-sm text-muted-foreground">
              Buy shares in your predicted outcome
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              4
            </div>
            <h4 className="font-semibold mb-2">Earn Rewards</h4>
            <p className="text-sm text-muted-foreground">
              Win $1 per share if you&apos;re right
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
        <p className="text-muted-foreground mb-6">
          Join thousands of users making predictions on Polymarket
        </p>
        <Link href="/matches">
          <Button size="lg" className="gap-2">
            <Trophy className="h-5 w-5" />
            Start Predicting
          </Button>
        </Link>
      </div>
    </div>
  );
}
