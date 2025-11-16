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

#### Step 1: Get WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign up or login
3. Create a new project
4. Copy your Project ID

#### Step 2: Deploy to Vercel

1. **Push code to GitHub** (already done if you see this)

2. **Import project in Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import your GitHub repository
   - Framework Preset: **Next.js** (auto-detected)

3. **Configure Environment Variables**

   Go to **Project Settings → Environment Variables** and add:

   | Variable | Value | Required |
   |----------|-------|----------|
   | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Your WalletConnect Project ID | ✅ YES |
   | `NEXT_PUBLIC_GAMMA_API_URL` | `https://gamma-api.polymarket.com` | ❌ Optional (has default) |
   | `NEXT_PUBLIC_CLOB_API_URL` | `https://clob.polymarket.com` | ❌ Optional (has default) |
   | `NEXT_PUBLIC_DATA_API_URL` | `https://data-api.polymarket.com` | ❌ Optional (has default) |
   | `NEXT_PUBLIC_CHAIN_ID` | `137` | ❌ Optional (has default) |

   **CRITICAL**: Only `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is REQUIRED!

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live!

#### Step 3: Verify Deployment

1. Open your deployed URL
2. Click "Connect Wallet"
3. Connect with MetaMask or WalletConnect
4. Browse matches and test predictions

### Build for Production (Self-Hosted)

```bash
# 1. Set environment variables
cp .env.example .env.local
# Edit .env.local and add your WALLETCONNECT_PROJECT_ID

# 2. Build
npm run build

# 3. Start
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
