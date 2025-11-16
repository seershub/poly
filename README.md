# Poly SeersHub - Sports Prediction dApp

A production-ready, mobile-first sports prediction dApp built on Polymarket's infrastructure. Predict soccer match outcomes and earn rewards.

## Features

- **Polymarket Integration**: Real markets powered by Polymarket's CLOB and Gamma APIs
- **Share-Based Trading**: Buy/sell shares with accurate profit calculations
- **Secure Wallet Connection**: wagmi v2 integration (no private keys required)
- **USDC Approval Flow**: Automated approval handling before orders
- **Real-time Market Data**: Live prices and liquidity from Polymarket
- **Mobile-First Design**: Responsive UI built with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Blockchain**: Polygon Mainnet (Chain ID: 137)
- **Wallet**: wagmi v2 + viem v2
- **State Management**: TanStack Query v5
- **API Client**: @polymarket/clob-client
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- WalletConnect Project ID ([Get one here](https://cloud.walletconnect.com))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd poly-seershub
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your WalletConnect Project ID:
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
poly-seershub/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Homepage
│   ├── matches/           # Match listing and details
│   └── dashboard/         # User dashboard
├── components/
│   ├── ui/                # shadcn/ui base components
│   ├── match/             # Match-related components
│   ├── wallet/            # Wallet connection
│   └── layout/            # Navbar, Footer
├── lib/
│   ├── polymarket/        # Polymarket API integrations
│   ├── wagmi.ts           # wagmi configuration
│   ├── constants.ts       # Contract addresses & constants
│   └── utils.ts           # Utility functions
├── hooks/
│   ├── usePolymarketMarkets.ts  # Fetch markets
│   ├── usePlacePrediction.ts    # Place orders (with USDC approval)
│   ├── useApiCredentials.ts     # Generate API credentials
│   └── useUserPositions.ts      # Fetch user positions
└── types/
    ├── polymarket.ts      # Polymarket types
    └── match.ts           # Match types
```

## Key Implementation Details

### 1. Secure API Credential Generation

**CRITICAL**: This app NEVER asks for private keys. API credentials are generated using wagmi's `useWalletClient` hook:

```typescript
const { data: walletClient } = useWalletClient();
const credentials = await generateApiCredentials(walletClient);
```

### 2. Share-Based Predictions

The app uses a **share-based** input model (not amount-based):

```typescript
// User inputs: Number of shares
const shares = 10;
const price = 0.65; // Current market price

// Calculations
const cost = shares * price;              // 10 * 0.65 = $6.50
const potentialPayout = shares * 1.0;     // 10 * $1 = $10.00
const profit = potentialPayout - cost;    // $10 - $6.50 = $3.50
```

### 3. USDC Approval Flow

Before placing an order, the app automatically checks and requests USDC approval:

```typescript
const requiredUsdc = shares * price;
const currentAllowance = await getAllowance();

if (currentAllowance < requiredUsdc) {
  await approveUsdc(requiredUsdc); // Triggers wallet approval
}

await placePrediction({ size: shares, price });
```

### 4. Team Name Parsing

Team names are extracted from the `outcomes` array (NOT from the question string):

```typescript
const homeTeam = market.outcomes[0]; // e.g., "Arsenal"
const awayTeam = market.outcomes[1]; // e.g., "Chelsea"
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud Project ID | Yes |
| `NEXT_PUBLIC_GAMMA_API_URL` | Polymarket Gamma API URL | No (has default) |
| `NEXT_PUBLIC_CLOB_API_URL` | Polymarket CLOB API URL | No (has default) |
| `NEXT_PUBLIC_CHAIN_ID` | Polygon Chain ID (137) | No (has default) |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Build for Production

```bash
npm run build
npm start
```

## Security Considerations

1. **Never expose private keys**: The app uses wagmi's wallet client
2. **USDC approval**: Users approve only the required amount
3. **Client-side credential storage**: For production, store API credentials securely on the backend

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
