# Vercel Environment Variables Checklist

## ✅ Mevcut (Zaten Ekli Olması Gerekenler)

### Polymarket Configuration
- `POLY_BUILDER_API_KEY` - Polymarket Builder API Key
- `POLY_BUILDER_SECRET` - Polymarket Builder Secret
- `POLY_BUILDER_PASSPHRASE` - Polymarket Builder Passphrase
- `NEXT_PUBLIC_GAMMA_API_URL` - Polymarket Gamma API URL (default: https://gamma-api.polymarket.com)
- `NEXT_PUBLIC_CLOB_API_URL` - Polymarket CLOB API URL (default: https://clob.polymarket.com)
- `NEXT_PUBLIC_DATA_API_URL` - Polymarket Data API URL (default: https://data-api.polymarket.com)
- `NEXT_PUBLIC_POLYMARKET_RELAYER_URL` - Polymarket Relayer URL (default: https://relayer-v2.polymarket.com/)
- `NEXT_PUBLIC_CHAIN_ID` - Chain ID (137 for Polygon)

### Privy.io Configuration
- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy App ID (cmi2etaa501n3js0clqp3a5ri)

### WalletConnect
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect Project ID

---

## 🆕 YENİ EKLENMESİ GEREKENLER (Multi-Chain Support)

### RPC URLs (Önerilen: Alchemy veya Infura)
**ÖNEMLİ:** Public RPC'ler rate limit'e takılabilir. Production için Alchemy/Infura kullanın.

#### Polygon RPC
- `NEXT_PUBLIC_POLYGON_RPC_URL`
  - **Alchemy:** `https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
  - **Infura:** `https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID`
  - **Public (fallback):** `https://polygon-rpc.com` (zaten default)

#### Ethereum RPC
- `NEXT_PUBLIC_ETHEREUM_RPC_URL`
  - **Alchemy:** `https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
  - **Infura:** `https://mainnet.infura.io/v3/YOUR_PROJECT_ID`
  - **Public (fallback):** `https://eth.llamarpc.com` (zaten default)

#### Base RPC
- `NEXT_PUBLIC_BASE_RPC_URL`
  - **Alchemy:** `https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
  - **Infura:** `https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID`
  - **Public (fallback):** `https://mainnet.base.org` (zaten default)

### Kalshi API Configuration
- `KALSHI_API_KEY` - Kalshi API Key (RSA private key'den türetilmiş)
- `KALSHI_API_SECRET` - Kalshi API Secret
- `NEXT_PUBLIC_KALSHI_API_URL` - Kalshi API URL (default: https://api.kalshi.com/trade-api/v2)

---

## 📝 Vercel'de Ekleme Adımları

1. Vercel Dashboard → Projeniz → Settings → Environment Variables
2. Her bir değişkeni ekleyin:
   - **Name:** Değişken adı (yukarıdaki listeden)
   - **Value:** Değeri
   - **Environment:** Production, Preview, Development (hepsini seçin)

### Örnek RPC URL Formatları:

```
# Alchemy (Önerilen)
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Infura (Alternatif)
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
```

---

## ⚠️ ÖNEMLİ NOTLAR

1. **RPC URL'ler:** Public RPC'ler (polygon-rpc.com, eth.llamarpc.com) rate limit'e takılabilir. Production için mutlaka Alchemy veya Infura kullanın.

2. **Kalshi API Keys:** Kalshi API key'leriniz RSA private key formatında. Bunları environment variable olarak eklerken dikkatli olun.

3. **NEXT_PUBLIC_ Prefix:** `NEXT_PUBLIC_` ile başlayan değişkenler client-side'da da kullanılabilir. Gizli bilgiler (API keys, secrets) için bu prefix'i KULLANMAYIN.

4. **Deployment:** Environment variables ekledikten sonra yeni bir deployment yapmanız gerekebilir.

---

## 🔍 Kontrol Listesi

- [ ] `NEXT_PUBLIC_POLYGON_RPC_URL` eklendi
- [ ] `NEXT_PUBLIC_ETHEREUM_RPC_URL` eklendi
- [ ] `NEXT_PUBLIC_BASE_RPC_URL` eklendi
- [ ] `KALSHI_API_KEY` eklendi
- [ ] `KALSHI_API_SECRET` eklendi
- [ ] `NEXT_PUBLIC_KALSHI_API_URL` eklendi (opsiyonel, default var)
- [ ] Tüm environment variables Production, Preview, Development için ayarlandı
- [ ] Yeni deployment yapıldı


