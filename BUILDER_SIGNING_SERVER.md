# Polymarket Builder Signing Server Setup Guide

## Overview

The Builder Signing Server is a self-hosted Express.js application that enables **secure remote signing** of builder authentication headers. This keeps your Builder API credentials secure on your own infrastructure.

## Why Use Remote Signing?

- **Security**: Builder API keys never leave your secure server
- **Centralized Management**: Manage credentials in one secure location
- **Reduced Exposure**: Client applications don't need direct access to sensitive keys

## Setup Options

### Option 1: Local Development (Recommended for Testing)

For local development, you can run the Builder Signing Server on your local machine:

1. **Clone the Builder Signing Server repository:**
   ```bash
   git clone https://github.com/Polymarket/builder-signing-server.git
   cd builder-signing-server
   yarn install
   ```

2. **Create `.env` file in `builder-signing-server` directory:**
   ```env
   PORT=5001
   POLY_BUILDER_API_KEY=your_builder_api_key
   POLY_BUILDER_SECRET=your_builder_secret
   POLY_BUILDER_PASSPHRASE=your_builder_passphrase
   ```

3. **Start the server:**
   ```bash
   yarn start-dev  # Development mode with auto-reload
   # OR
   yarn start      # Production mode
   ```

4. **Update your Next.js `.env.local` file:**
   ```env
   # For local development
   NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=http://localhost:5001/sign
   ```

### Option 2: Production Deployment

For production, deploy the Builder Signing Server to your own infrastructure:

1. **Deploy to your server** (Vercel, Railway, Render, etc.)
2. **Set environment variables** on your hosting platform
3. **Update your Next.js environment variables:**
   ```env
   # For production
   NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=https://your-signing-server.com/sign
   ```

### Option 3: Direct Credentials (Less Secure, Not Recommended)

If you don't want to use a signing server, you can use credentials directly (server-side only):

```env
# Server-side only (NOT client-side accessible)
POLY_BUILDER_API_KEY=your_builder_api_key
POLY_BUILDER_SECRET=your_builder_secret
POLY_BUILDER_PASSPHRASE=your_builder_passphrase
```

**⚠️ WARNING**: This approach exposes credentials in your server-side code. Use remote signing for better security.

## Environment Variables Configuration

### For Next.js Application (`.env.local`)

```env
# ============================================
# Polymarket Relayer Configuration
# ============================================

# Relayer URL (Polymarket's public relayer)
# Default: https://relayer-v2.polymarket.com/
# You can use the default or set a custom one
NEXT_PUBLIC_POLYMARKET_RELAYER_URL=https://relayer-v2.polymarket.com/

# ============================================
# Builder Signing Server (Remote Signing)
# ============================================

# Option A: Use Builder Signing Server (RECOMMENDED)
# For local development:
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=http://localhost:5001/sign

# For production:
# NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=https://your-signing-server.com/sign

# Option B: Direct credentials (server-side only, less secure)
# POLY_BUILDER_API_KEY=your_builder_api_key
# POLY_BUILDER_SECRET=your_builder_secret
# POLY_BUILDER_PASSPHRASE=your_builder_passphrase
```

### For Builder Signing Server (`.env` in `builder-signing-server` directory)

```env
PORT=5001
POLY_BUILDER_API_KEY=your_builder_api_key
POLY_BUILDER_SECRET=your_builder_secret
POLY_BUILDER_PASSPHRASE=your_builder_passphrase
```

## How It Works

1. **Client Application** (Next.js):
   - Makes request to Builder Signing Server
   - Sends signing request data
   - Receives signed authentication header

2. **Builder Signing Server**:
   - Receives signing request
   - Signs with Builder API credentials
   - Returns signed header

3. **Polymarket Relayer**:
   - Receives signed request from client
   - Validates signature
   - Executes gasless transaction

## Testing the Setup

### 1. Start Builder Signing Server

```bash
cd builder-signing-server
yarn start-dev
```

You should see:
```
Builder signing server listening on :5001
```

### 2. Test the Signing Server

```bash
curl -X POST http://localhost:5001/sign \
  -H "Content-Type: application/json" \
  -d '{"path":"/test","method":"POST","body":"{}"}'
```

### 3. Test in Your Application

1. Connect wallet
2. Try to place a prediction
3. Check browser console for:
   - "Relayer client initialized successfully"
   - "Token approval completed via Relayer (gasless)"

## Troubleshooting

### Server Won't Start

**Error**: `POLY_BUILDER_API_KEY environment variable is required`

**Solution**: Ensure your `.env` file in `builder-signing-server` contains:
- `POLY_BUILDER_API_KEY`
- `POLY_BUILDER_SECRET`
- `POLY_BUILDER_PASSPHRASE`

### Port Already in Use

**Error**: `listen EADDRINUSE: address already in use :::5001`

**Solution**: Change port in `.env`:
```env
PORT=5002
```

And update Next.js `.env.local`:
```env
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=http://localhost:5002/sign
```

### Invalid Signature Errors

**Solution**:
1. Verify request body is being passed correctly as JSON string
2. Check that path and method match exactly
3. Ensure server and client use the same Builder API credentials

### CORS Issues

If you get CORS errors, add CORS headers to the Builder Signing Server or use a proxy.

## Getting Builder Credentials

1. **Apply to Polymarket Builder Program:**
   - Visit: https://builders.polymarket.com/
   - Apply for Builder Program access

2. **Get Builder API Credentials:**
   - Once approved, you'll receive:
     - `POLY_BUILDER_API_KEY`
     - `POLY_BUILDER_SECRET`
     - `POLY_BUILDER_PASSPHRASE`

3. **Add to Environment Variables:**
   - Add to Builder Signing Server `.env`
   - Or add to Next.js `.env.local` (if using direct credentials)

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use remote signing** instead of direct credentials
3. **Deploy signing server** to secure infrastructure
4. **Use HTTPS** in production
5. **Rotate credentials** regularly

## Next Steps

1. ✅ Install packages: `npm install @polymarket/builder-relayer-client @polymarket/builder-signing-sdk`
2. ✅ Clone Builder Signing Server repository
3. ✅ Set up Builder Signing Server with your credentials
4. ✅ Configure Next.js environment variables
5. ✅ Test gasless transactions

