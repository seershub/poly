# Builder Signing Server - Vercel Deployment Guide

## Problem
Builder signing server şu anda `localhost:5001`'de çalışıyor, bu yüzden sadece local development'ta çalışıyor. Production'da (poly.seershub.com - Vercel) çalışması için builder signing server'ı da deploy etmemiz gerekiyor.

## Çözüm: Builder Signing Server'ı Vercel'e Deploy Edin

### Adım 1: Builder Signing Server'ı Vercel'e Import Edin

Builder signing server `/home/user/builder-signing-server` klasöründe hazır durumda. İki seçeneğiniz var:

#### Seçenek A: GitHub Üzerinden Deploy (Önerilen)

1. **GitHub'da yeni bir repo oluşturun:**
   - Repo adı: `polymarket-builder-signing-server` (veya istediğiniz isim)
   - Private repo olarak oluşturun (credential'lar içerdiği için)

2. **Builder signing server'ı GitHub'a push edin:**
   ```bash
   cd /home/user/builder-signing-server
   git remote remove origin  # Eski Polymarket remote'unu kaldır
   git remote add origin https://github.com/YOUR_USERNAME/polymarket-builder-signing-server.git
   git push -u origin main
   ```

3. **Vercel'de import edin:**
   - Vercel Dashboard → "Add New" → "Project"
   - GitHub repo'nuzu seçin: `polymarket-builder-signing-server`
   - Framework Preset: "Other" seçin
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`
   - Install Command: `yarn install`

#### Seçenek B: Vercel CLI İle Deploy (Daha Hızlı)

```bash
cd /home/user/builder-signing-server
npx vercel
# Sorulara cevap verin:
# - Set up and deploy? Y
# - Which scope? (Vercel account'unuzu seçin)
# - Link to existing project? N
# - Project name? polymarket-builder-signing-server
# - In which directory? ./ (enter)
# - Override settings? N

# Production'a deploy edin:
npx vercel --prod
```

### Adım 2: Vercel Environment Variables Ekleyin

Deploy edildikten sonra, Vercel dashboard'da environment variables ekleyin:

1. **Vercel Dashboard'da projenize gidin**
2. **Settings → Environment Variables**
3. **Şu değişkenleri ekleyin:**

```env
PORT=5001

POLY_BUILDER_API_KEY=019a8ccc-09f1-7f2f-b058-50d58975161c

POLY_BUILDER_SECRET=R6UJFRo3W40cnJSmPxf4mnEe1w2GdarSKRERiBYx814=

POLY_BUILDER_PASSPHRASE=1fd5664b5f997e6dac7bc8e05e9e1ed8debd102167745088bba9b706574f6755
```

**Önemli:** Her değişkeni **Production, Preview, Development** için aktifleştirin (tüm checkboxları işaretleyin)

4. **Save** butonuna tıklayın

### Adım 3: Redeploy Edin

Environment variables ekledikten sonra:

1. **Deployments** sekmesine gidin
2. En son deployment'ın yanındaki **"..."** menüsünü açın
3. **"Redeploy"** → **"Redeploy with existing Build Cache"** seçin

### Adım 4: Deployment URL'sini Alın

Deployment tamamlandığında, Vercel size bir URL verecek:
```
https://polymarket-builder-signing-server.vercel.app
```

**Sign endpoint:**
```
https://polymarket-builder-signing-server.vercel.app/sign
```

### Adım 5: Poly Projesinin Vercel Environment Variables'ını Güncelleyin

1. **Poly projesinin Vercel dashboard'ına gidin** (poly.seershub.com)
2. **Settings → Environment Variables**
3. **`NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL` değişkenini güncelleyin:**

```env
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=https://polymarket-builder-signing-server.vercel.app/sign
```

**Not:** Eğer bu değişken yoksa, yeni ekleyin ve **Production, Preview, Development** için aktifleştirin.

4. **Poly projesini redeploy edin:**
   - Deployments → En son deployment → "..." → Redeploy

### Adım 6: Test Edin

1. **poly.seershub.com**'a gidin
2. Wallet'ınızı bağlayın
3. Bir maça prediction yapmayı deneyin
4. Browser console'u açın (F12)
5. Şu logları göreceksiniz:
   ```
   🚀 Attempting gasless approval via Builder Signing Server: https://polymarket-builder-signing-server.vercel.app/sign
   ✅ Gasless approval completed via Relayer
   ✅ Order placed successfully
   ```

## Özet

✅ Builder signing server Vercel'e deploy edildi
✅ Environment variables eklendi
✅ Poly projesi production URL'si ile güncellendi
✅ Gasless USDC approvals artık production'da çalışıyor

## Sorun Giderme

### Builder signing server 500 hatası veriyor

Environment variables doğru ayarlandı mı kontrol edin:
- PORT
- POLY_BUILDER_API_KEY
- POLY_BUILDER_SECRET
- POLY_BUILDER_PASSPHRASE

Vercel logs'ları kontrol edin:
- Deployments → Latest deployment → View Function Logs

### "Builder Signing Server not configured" hatası

Poly projesinin environment variable'ı doğru mu kontrol edin:
- `NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL` değeri doğru mu?
- `/sign` endpoint'i var mı?
- Poly projesi redeploy edildi mi?

### CORS hatası

Builder signing server CORS'u açık (tüm originlere izin veriyor), bu sorun olmamalı. Ama olursa Vercel logs'larını kontrol edin.

## Güvenlik Notları

- ✅ Builder signing server **private repo** olarak tutun
- ✅ Environment variables Vercel'de encrypted tutuluyor
- ✅ `.env` dosyası git'te commit edilmemiş (.gitignore'da)
- ⚠️ Builder credentials'ları kimseyle paylaşmayın
