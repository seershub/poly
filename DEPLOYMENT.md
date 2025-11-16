# Vercel Deployment Guide

## Quick Deploy to Vercel

### Prerequisites
- WalletConnect Project ID (get from https://cloud.walletconnect.com)

### Deploy Steps

1. **Get WalletConnect Project ID**
   ```
   1. Go to https://cloud.walletconnect.com
   2. Sign up/Login
   3. Create new project
   4. Copy Project ID
   ```

2. **Deploy to Vercel**

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seershub/poly)

3. **Configure Environment Variables in Vercel**

   Go to: **Project Settings → Environment Variables**

   Add this ONE required variable:

   ```
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = your_project_id_here
   ```

   Optional variables (have defaults):
   ```
   NEXT_PUBLIC_GAMMA_API_URL = https://gamma-api.polymarket.com
   NEXT_PUBLIC_CLOB_API_URL = https://clob.polymarket.com
   NEXT_PUBLIC_DATA_API_URL = https://data-api.polymarket.com
   NEXT_PUBLIC_CHAIN_ID = 137
   ```

   **For Polymarket Builder Grant Program** (Optional):

   If you're participating in the Builder Grant Program, add these variables:

   ```
   POLY_BUILDER_API_KEY = your_builder_api_key
   POLY_BUILDER_SECRET = your_builder_secret
   POLY_BUILDER_PASSPHRASE = your_builder_passphrase
   ```

   **How to get Builder API Keys:**
   1. Go to https://polymarket.com
   2. Connect your wallet
   3. Click profile → Builders section
   4. Create/Copy your API keys

   **IMPORTANT:** These are server-side keys (no NEXT_PUBLIC_ prefix)
   - They will NOT be exposed to the client
   - All orders will be attributed to your builder account for grant tracking

4. **Redeploy**
   - After adding env vars, trigger a redeploy
   - Go to Deployments tab → Click "..." → Redeploy

### Troubleshooting

#### Build Fails with "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set"
**Solution**: Add the environment variable in Vercel Dashboard → Project Settings → Environment Variables

#### Build Fails with "No Output Directory named 'public' found"
**Solution**: This is fixed by the `vercel.json` file. Make sure it exists in your repo.

#### WalletConnect Shows "Project ID Not Configured"
**Solution**:
1. Make sure you added `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in Vercel
2. Redeploy the project
3. Clear browser cache

### Polymarket API Notes

- **Gamma API**: Public, no authentication needed ✅
- **CLOB API**: API keys generated client-side using wallet signature ✅
- **No server-side secrets needed**: All authentication happens through user's wallet ✅

### Network Requirements

- **Polygon Mainnet** (Chain ID: 137)
- Users need **USDC on Polygon** to place predictions
- Bridge: https://wallet.polygon.technology/polygon/bridge

---

**That's it!** Your Polymarket sports prediction dApp should now be live on Vercel.
