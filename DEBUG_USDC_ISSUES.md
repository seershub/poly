# USDC Balance & Deposit Issues - Debug Guide

**Last Updated:** 2025-01-18
**Branch:** `claude/polymarket-sports-dapp-01SUb2nucDVD4k5UCgDNXe5E`
**Commit:** `26e2ac7` - Kalshi simplification deployed

---

## 🔴 CURRENT ISSUES (Reported by User)

1. **USDC Balance Not Showing**
   - User has 3.39 USDC in Metamask
   - Fund Wallet modal shows 0 USDC
   - Balance detection failing

2. **Safe Wallet Deposit Not Working**
   - Cannot transfer USDC from EOA to Safe Wallet
   - Deposit button not working
   - No error messages visible

3. **Polymarket Predictions Not Working**
   - Cannot place predictions
   - "Insufficient balance" error even with USDC

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue 1: USDC Balance Detection

**The Problem:**
Polymarket uses **Proxy Wallets (Safe Wallets)** to hold USDC, NOT your EOA (Metamask address).

**How it should work:**
1. User connects wallet (EOA) via Privy
2. App deploys a Safe Wallet for the user (proxy wallet)
3. User transfers USDC from EOA → Safe Wallet
4. App checks USDC balance from Safe Wallet (not EOA)

**Why it's failing:**
- **Code is checking balance from Proxy Wallet** (`usePlacePrediction.ts:65-72`)
- **But USDC is still in EOA** (Metamask), not transferred yet!
- **Result:** Balance shows 0 because Proxy Wallet is empty

**File:** `hooks/usePlacePrediction.ts`
```typescript
// Line 61
const balanceAddress = proxyWalletAddress || address; // Uses proxy wallet if available!

// Line 65-72
const { data: balance } = useBalance({
  address: balanceAddress, // ← Checking proxy wallet, not EOA!
  token: POLYGON_USDC_ADDRESS,
  ...
});
```

**FundWalletModal** has fallback logic but it's complex:
- `useBalance` for EOA
- `useReadContract` manual fallback
- But display logic might be wrong

---

### Issue 2: Safe Wallet Deposit

**The Problem:**
`depositUsdcToProxyWallet` function exists but might be failing silently.

**Possible reasons:**
1. **Chain mismatch:** Wallet not on Polygon
2. **Proxy wallet not deployed:** Safe wallet doesn't exist yet
3. **Transaction rejection:** User rejecting in wallet
4. **Insufficient gas:** No MATIC for gas

**File:** `lib/polymarket/usdcTransfer.ts`
```typescript
// Line 82-89
const hash = await walletClient.writeContract({
  chain: polygon, // ← Forces Polygon chain
  account: walletClient.account,
  address: POLYGON_USDC_ADDRESS,
  abi: USDC_ABI,
  functionName: 'transfer',
  args: [proxyWalletAddress, amountInUnits],
});
```

---

## 🛠️ DEBUGGING STEPS

### Step 1: Open Console and Check Logs

1. Go to **poly.seershub.com**
2. Press **F12** → **Console** tab
3. Connect your wallet
4. Look for these logs:

**Expected logs for balance check:**
```
FundWalletModal Debug: {
  address: '0x...',        // ← Your EOA address
  chainId: 137,            // ← Should be 137 (Polygon)
  isPolygon: true,
  eoaBalance: '3.39',      // ← Should show your balance!
  eoaBalanceError: null,
  proxyWalletAddress: '0x...',  // ← Your Safe Wallet address
  proxyBalance: '0.00',    // ← Safe Wallet is empty (expected)
}
```

**If you see:**
- `eoaBalance: '0'` or `eoaBalance: null` → Balance detection failed
- `eoaBalanceError: "..."` → RPC error
- `proxyWalletAddress: null` → Safe Wallet not deployed yet

### Step 2: Check Network

```
Current Network: Polygon (Chain ID: 137)
```

**If wrong network:**
- Go to Metamask
- Switch to Polygon network
- Refresh page

### Step 3: Check Safe Wallet Status

Look for logs like:
```
[Proxy Wallet] Checking for existing proxy wallet...
[Proxy Wallet] Proxy wallet found: 0x...
```

**Or:**
```
[Proxy Wallet] No proxy wallet found
[Proxy Wallet] Deploying new proxy wallet...
```

### Step 4: Try Depositing USDC

1. Click "Fund Wallet"
2. Click "Deposit"
3. Enter amount (e.g., "1")
4. Click "Deposit to Trading Wallet"
5. **Watch console for errors:**

**Expected logs:**
```
Depositing USDC to proxy wallet: {
  from: '0x...',    // EOA
  to: '0x...',      // Safe Wallet
  amount: '1',
  amountInUnits: '1000000',
  chainId: 137,
}
USDC deposit transaction hash: 0x...
```

**Common errors:**
```
❌ "Wrong network. Please switch to Polygon"
   → Switch to Polygon in Metamask

❌ "Proxy wallet address not available"
   → Go to /setup page first, deploy Safe Wallet

❌ "Insufficient USDC balance"
   → Check actual balance in Metamask

❌ "Transaction rejected by user"
   → You clicked "Reject" in Metamask

❌ "Insufficient funds for gas"
   → Need MATIC for gas fees
```

---

## 🔧 QUICK FIXES

### Fix 1: Ensure You're on Polygon Network

1. Open Metamask
2. Click network dropdown
3. Select "Polygon Mainnet"
4. Refresh poly.seershub.com

### Fix 2: Deploy Safe Wallet

1. Go to **poly.seershub.com/setup**
2. Follow 3-step setup:
   - Step 1: Deploy Safe Wallet
   - Step 2: Approve USDC
   - Step 3: Generate API Keys
3. Complete all steps
4. Return to /matches

### Fix 3: Manual USDC Transfer (If Automated Fails)

If the Fund Wallet modal doesn't work, transfer manually:

1. **Get your Safe Wallet address:**
   - Open Console (F12)
   - Type: `localStorage.getItem('proxy-wallet-address')`
   - Copy the address

2. **Transfer via Metamask:**
   - Open Metamask
   - Click "Send"
   - Paste Safe Wallet address
   - Select USDC token
   - Enter amount
   - Send

3. **Verify:**
   - Refresh page
   - Balance should now show in Safe Wallet

---

## 📊 EXPECTED VS ACTUAL STATE

### Expected State (Working):
```
EOA (Metamask):
  USDC: 3.39 → 2.39 (after transferring 1 USDC)
  MATIC: ~0.1 (for gas)

Safe Wallet (Proxy):
  USDC: 0 → 1.00 (after deposit)

Fund Wallet Modal:
  EOA Balance: 2.39 USDC
  Trading Wallet: 1.00 USDC

Prediction:
  Can place bet with 1 USDC
```

### Current State (Broken):
```
EOA (Metamask):
  USDC: 3.39 (all funds stuck here)
  MATIC: ~0.1

Safe Wallet (Proxy):
  USDC: 0 (empty - can't trade!)

Fund Wallet Modal:
  EOA Balance: 0 USDC (wrong!) or not showing
  Trading Wallet: 0 USDC

Prediction:
  "Insufficient balance" error
```

---

## 🎯 ACTION PLAN FOR USER

### Immediate Actions:

1. **Open poly.seershub.com**
2. **Open Console (F12)**
3. **Take screenshots of console logs**
4. **Send me:**
   - Full console log (copy/paste)
   - Any error messages (red text)
   - Network info (chainId, isPolygon)
   - Balance info (eoaBalance, proxyBalance)

### What to Look For:

```
✅ GOOD - These should be TRUE:
- chainId: 137
- isPolygon: true
- eoaBalance: '3.39' (or your actual balance)
- proxyWalletAddress: '0x...' (address exists)

❌ BAD - If you see:
- chainId: 1 (Ethereum) or other
- isPolygon: false
- eoaBalance: '0' or null
- eoaBalanceError: "Network error" or similar
- proxyWalletAddress: null
```

---

## 💡 POTENTIAL SOLUTIONS

### Solution 1: Force Balance Refresh

I can add a "Refresh Balance" button that:
- Forces refetch from both EOA and Safe Wallet
- Shows both balances separately
- Allows deposit even if one is 0

### Solution 2: Simplify Balance Detection

Current code has complex fallback logic. I can:
- Remove fallback, use only `useBalance`
- Show both EOA and Safe Wallet balances
- Make it clear which one to use

### Solution 3: Better Error Messages

Add toast notifications showing:
- "Checking balance from EOA..."
- "Checking balance from Safe Wallet..."
- "Found X USDC in EOA, Y USDC in Safe Wallet"
- "Please deposit from EOA to Safe Wallet to trade"

### Solution 4: Bypass Safe Wallet (Temporary)

For testing, allow trading directly from EOA:
- Skip Safe Wallet requirement
- Use EOA USDC directly
- This won't work long-term (Polymarket requires Safe Wallet)
- But useful for debugging

---

## 🚀 NEXT STEPS

**For Me (Claude):**
1. ✅ Simplified Kalshi auth (deployed)
2. ⏳ Wait for user console logs
3. ⏳ Fix USDC balance detection based on logs
4. ⏳ Fix deposit functionality
5. ⏳ Test end-to-end

**For You (User):**
1. **Deploy latest changes** (already done - commit `26e2ac7`)
2. **Open poly.seershub.com**
3. **Open Console (F12)**
4. **Send me console logs** (screenshot or copy/paste)
5. **Try clicking Fund Wallet → Deposit**
6. **Send me any error messages**

---

## 📝 TECHNICAL NOTES

### Why Polymarket Uses Proxy Wallets

From Polymarket docs:
> "When users create a wallet on Polymarket.com, a 1 of 1 multisig is deployed to Polygon which is controlled/owned by the accessing EOA. This proxy wallet is where all the user's positions (ERC1155) and USDC (ERC20) are held."

**Reason:** Security and gas optimization
- Proxy wallet = Gnosis Safe (1-of-1 multisig)
- Controlled by your EOA
- Allows gasless transactions via Relayer
- Required for Polymarket CLOB trading

### Current Implementation

**Files involved:**
- `hooks/usePlacePrediction.ts` - Check balance from proxy
- `components/wallet/FundWalletModal.tsx` - Display balances
- `lib/polymarket/usdcTransfer.ts` - Transfer USDC
- `hooks/useProxyWallet.ts` - Manage proxy wallet

**Balance check flow:**
```
1. Get proxy wallet address (useProxyWallet)
2. Use proxy address for balance check (useBalance)
3. If proxy doesn't exist, fallback to EOA
4. Check allowance from proxy wallet
5. Place order via CLOB client
```

**The issue:**
- Code checks proxy wallet balance ✅
- But USDC is in EOA, not proxy ❌
- User needs to transfer EOA → Proxy first ✅
- But transfer button might be failing ❌

---

## 📞 WAITING FOR USER INPUT

**I need console logs to proceed!**

Without seeing actual console output, I can only guess at the issue. Please:

1. Open F12 Console
2. Connect wallet
3. Try Fund Wallet → Deposit
4. Copy all console logs
5. Send to me

Then I can fix the exact issue! 🎯
