# Polymarket Builder Program Integration Guide

## Overview

This dApp supports the **Polymarket Builder Grant Program**, which allows you to earn grants based on trading volume attributed to your builder account.

## Two Modes of Operation

### 1. End-User Mode (Default - No Builder Keys)
- ✅ App works perfectly without builder keys
- ✅ Users can trade normally
- ❌ No order attribution
- ❌ Not eligible for builder grants

### 2. Builder Mode (With Builder Keys)
- ✅ Orders attributed to your builder account
- ✅ Eligible for Polymarket builder grants
- ✅ Track your trading volume on Builder Leaderboard
- ⚠️ Requires additional setup

---

## Getting Builder API Keys

### Step 1: Access Builder Profile

1. Go to **https://polymarket.com**
2. **Connect your wallet**
3. Click your **profile picture** (top right)
4. Select **"Builders"** from dropdown

### Step 2: Create API Keys

In your Builder Profile:
1. Scroll to **"Builder Keys"** section
2. Click **"+ Create New"**
3. Copy these 3 values:
   ```
   apiKey: xxxxx.....
   secret: xxxxx.....
   passphrase: xxxxx.....
   ```

⚠️ **SECURITY WARNING**: These are SERVER-SIDE keys. NEVER expose them in client code!

---

## Integration Methods

### Method 1: Local Signing (Simple - For Testing)

**⚠️ NOT RECOMMENDED for production** - Keys are exposed server-side

1. Add to your `.env` file:
```bash
POLY_BUILDER_API_KEY=your_key_here
POLY_BUILDER_SECRET=your_secret_here
POLY_BUILDER_PASSPHRASE=your_passphrase_here
```

2. The app will automatically use these keys when available

### Method 2: Remote Signing (Recommended - For Production)

**✅ RECOMMENDED** - Keys stay on your secure server

#### Step 2.1: Deploy Builder Signing Server

```bash
# Clone the signing server
git clone https://github.com/Polymarket/builder-signing-server.git
cd builder-signing-server

# Install dependencies
npm install

# Configure environment variables
cat > .env <<EOF
PORT=3000
POLY_BUILDER_API_KEY=your_key_here
POLY_BUILDER_SECRET=your_secret_here
POLY_BUILDER_PASSPHRASE=your_passphrase_here
EOF

# Start the server
npm start
```

#### Step 2.2: Configure App

Add to your `.env`:
```bash
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=https://your-signing-server.com/sign
```

---

## Vercel Deployment with Builder Keys

### For Local Signing (Not Recommended)

In Vercel Dashboard → Settings → Environment Variables:

```
POLY_BUILDER_API_KEY = your_key_here
POLY_BUILDER_SECRET = your_secret_here
POLY_BUILDER_PASSPHRASE = your_passphrase_here
```

### For Remote Signing (Recommended)

1. Deploy builder signing server separately (Railway, Fly.io, AWS, etc.)
2. In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL = https://your-server.com/sign
```

---

## How It Works

### Without Builder Keys:
```
User → Connect Wallet → Place Order → CLOB → Market
```

### With Builder Keys:
```
User → Connect Wallet → Place Order → Add Builder Headers → CLOB → Market
                                      ↓
                            Orders attributed to YOU
                                      ↓
                            Tracked on Builder Leaderboard
                                      ↓
                            Eligible for Grants
```

---

## Checking Your Builder Stats

1. Go to **Polymarket Builder Leaderboard**
2. Find your builder address
3. See your attributed trading volume
4. Track your grant eligibility

---

## Important Notes

### Security
- ⚠️ **NEVER** commit builder keys to git
- ⚠️ **NEVER** expose keys in client-side code
- ✅ Use environment variables
- ✅ Use remote signing for production

### Order Attribution
- All user orders will be attributed to YOUR builder account
- You earn grants based on THEIR trading volume
- Make sure your builder profile is set up correctly

### Without Builder Keys
- App works perfectly fine
- Users can trade normally
- Just no grant attribution

---

## Troubleshooting

### "Builder keys not configured"
- This is normal if you haven't added keys
- App still works in end-user mode

### "Invalid builder signature"
- Check your keys are correct
- Ensure signing server is running (if using remote signing)
- Verify environment variables are set

### Orders not attributed
- Check Builder Leaderboard
- Verify keys are active
- Contact Polymarket support

---

## Resources

- **Builder Signing Server**: https://github.com/Polymarket/builder-signing-server
- **CLOB Client Docs**: https://docs.polymarket.com
- **Builder Program**: Contact support@polymarket.com

---

## Quick Start Commands

### Local Development (No Builder Keys)
```bash
npm install
npm run dev
```

### Local Development (With Local Builder Keys)
```bash
# Add to .env:
# POLY_BUILDER_API_KEY=...
# POLY_BUILDER_SECRET=...
# POLY_BUILDER_PASSPHRASE=...

npm run dev
```

### Production (With Remote Signing)
```bash
# 1. Deploy signing server
# 2. Add to Vercel:
#    NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=...
# 3. Deploy to Vercel

vercel deploy --prod
```

---

**The app works perfectly without builder keys!** Builder integration is optional and only needed if you want to participate in the grant program.
