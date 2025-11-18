# Kalshi Integration Setup Guide

## Overview

This guide explains how to set up Kalshi API integration for your sports prediction dApp. Kalshi is a centralized prediction market exchange that doesn't require blockchain integration.

**Official Documentation:** https://docs.kalshi.com

---

## Authentication Method

Kalshi API v2 uses **login-based authentication** with JWT tokens.

### How it works:
1. POST `/login` with your email/password
2. Receive JWT token (expires in 30 minutes)
3. Use token in `Authorization: Bearer {token}` header
4. Auto-refresh token before expiration (implemented)

---

## Step 1: Create Kalshi Account

1. Go to https://kalshi.com
2. Click "Sign Up"
3. Create your account with:
   - Email address
   - Password (remember this!)
4. Verify your email
5. Complete KYC if required for API access

---

## Step 2: Configure Environment Variables

### For Local Development

Add to your `.env.local` file:

```bash
# Kalshi API Configuration
NEXT_PUBLIC_KALSHI_API_URL=https://api.kalshi.com/trade-api/v2
KALSHI_EMAIL=your_kalshi_email@example.com
KALSHI_PASSWORD=your_kalshi_password
```

**IMPORTANT:** Replace `your_kalshi_email@example.com` and `your_kalshi_password` with YOUR actual Kalshi account credentials.

### For Vercel Deployment

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add these variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_KALSHI_API_URL` | `https://api.kalshi.com/trade-api/v2` | Production, Preview, Development |
| `KALSHI_EMAIL` | Your Kalshi email | Production, Preview, Development |
| `KALSHI_PASSWORD` | Your Kalshi password | Production, Preview, Development |

**Security Note:**
- ✅ `KALSHI_EMAIL` and `KALSHI_PASSWORD` are server-side only (no `NEXT_PUBLIC_` prefix)
- ✅ These credentials are never exposed to the browser
- ✅ Token is generated server-side and cached for 25 minutes

---

## Step 3: How to Use

### Automatic Integration

Once environment variables are set, Kalshi markets will automatically appear in your dApp:

1. **Markets Page** (`/matches`):
   - Polymarket and Kalshi markets are combined
   - Use platform filter to switch between platforms

2. **Platform Filter**:
   - "All Platforms" - Shows both Polymarket and Kalshi
   - "Polymarket" - Shows only Polymarket markets
   - "Kalshi" - Shows only Kalshi markets

### API Functions

```typescript
import { fetchKalshiMarkets, fetchKalshiMarket } from '@/lib/kalshi/api';

// Fetch all sports markets
const markets = await fetchKalshiMarkets('sports', 50);

// Fetch specific market by ticker
const market = await fetchKalshiMarket('TICKER-123');
```

### React Hook

```typescript
import { useKalshiMarkets } from '@/hooks/useKalshiMarkets';

function MyComponent() {
  const { data: markets, isLoading, error } = useKalshiMarkets();

  // markets is already in ParsedMatch[] format
}
```

---

## Step 4: Verify Integration

### Check Console Logs

Open browser console (F12) and look for:

```
[Kalshi API] Logging in...
[Kalshi API] Login successful, token cached
[Kalshi API] Fetching sports markets (limit: 50)...
[Kalshi API] Response: { status: 200, marketsCount: X }
[Kalshi API] Converted X Kalshi markets to ParsedMatch format
```

### If You See Errors:

#### "Kalshi credentials not configured"
- Check that `KALSHI_EMAIL` and `KALSHI_PASSWORD` are set in environment variables
- Restart your dev server: `npm run dev`
- For Vercel: Redeploy after adding env vars

#### "Kalshi login failed: 401 Unauthorized"
- Verify your email/password are correct
- Try logging in to https://kalshi.com manually
- Reset your password if needed

#### "Kalshi login failed: Network Error"
- Check your internet connection
- Kalshi API might be down (check status)
- Firewall might be blocking the request

---

## Token Management

### Auto-Refresh
- Token is cached for **25 minutes** (expires in 30)
- Automatically refreshes 5 minutes before expiration
- No manual token management required

### Manual Token Clear (for debugging)
```typescript
import { clearKalshiToken } from '@/lib/kalshi/api';

clearKalshiToken(); // Force re-login on next API call
```

---

## API Rate Limits

Kalshi API has rate limits (check official docs for current limits).

**Our implementation:**
- Fetches markets every 60 seconds
- Caches token for 25 minutes
- Retries 3 times on failure

---

## Market Data Structure

Kalshi markets are automatically converted to `ParsedMatch` format:

```typescript
{
  id: 'TICKER-123',
  slug: 'ticker-123',
  homeTeam: 'Team A',        // Parsed from title
  awayTeam: 'Team B',        // Parsed from title
  league: 'Sports',          // From category
  matchDate: Date,           // From open_time
  outcomes: {
    YES: {
      tokenId: 'TICKER-123-yes',
      outcome: 'Yes',
      price: 0.55,           // From yes_bid (0-100 → 0-1)
      impliedOdds: 55,
    },
    NO: { ... }
  },
  volume: 10000,
  liquidity: 5000,
  active: true,
  closed: false,
  chain: 'none',             // Kalshi is centralized
  platform: 'kalshi',        // Identifies as Kalshi market
}
```

---

## Troubleshooting

### No Kalshi markets showing

1. **Check environment variables are set**
   ```bash
   # In terminal
   echo $KALSHI_EMAIL
   echo $KALSHI_PASSWORD
   ```

2. **Check console for errors**
   - Open F12 → Console
   - Look for `[Kalshi API]` logs

3. **Verify API credentials work**
   - Try logging in to https://kalshi.com manually
   - Make sure your account has API access

4. **Check platform filter**
   - Make sure "All Platforms" or "Kalshi" is selected
   - Not filtering to "Polymarket" only

### Markets load but show wrong data

- Kalshi market structure might have changed
- Check `lib/kalshi/api.ts` → `kalshiMarketToMatch` function
- Update parsing logic based on actual API response

---

## Production Checklist

Before deploying to production:

- [ ] Kalshi account created and verified
- [ ] Environment variables set in Vercel
- [ ] Test login works (check console logs)
- [ ] Markets appear in dApp
- [ ] Platform filter works correctly
- [ ] Error handling gracefully degrades (shows Polymarket markets if Kalshi fails)

---

## Security Best Practices

✅ **DO:**
- Use server-side environment variables for credentials
- Keep passwords secure
- Enable 2FA on your Kalshi account

❌ **DON'T:**
- Commit `.env.local` to git
- Share your credentials
- Use `NEXT_PUBLIC_` prefix for credentials (exposes to browser)

---

## Support

- **Kalshi API Docs:** https://docs.kalshi.com
- **Kalshi API Status:** https://status.kalshi.com (check if API is down)
- **Your dApp Issues:** Check console logs and file issues

---

## Future Improvements

Potential enhancements:

- [ ] Implement signature-based auth (more secure than login)
- [ ] Add more market categories (politics, economics, etc.)
- [ ] Add trading functionality (currently read-only)
- [ ] Add market search/filtering
- [ ] Add real-time price updates via WebSocket

---

**Last Updated:** 2025-01-XX
**API Version:** v2
**Integration Status:** ✅ Complete (read-only)
