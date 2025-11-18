# Builder Signing Server - Vercel GitHub Import Guide

## 🎯 Kolay Yol: GitHub Repo'dan Direkt Vercel'e Import

GitHub repo'nuz hazır: https://github.com/seershub/polymarket-builder-signing-server

Şimdi dosyaları oraya upload edip Vercel'e import edeceğiz.

---

## Adım 1: GitHub'a Dosyaları Upload Edin

### Yöntem A: GitHub Web Interface (En Kolay)

1. **GitHub repo'nuza gidin:**
   https://github.com/seershub/polymarket-builder-signing-server

2. **"Add file" → "Upload files" butonuna tıklayın**

3. **Şu klasördeki tüm dosyaları sürükleyip bırakın:**
   `/home/user/builder-signing-server/`

   **Upload edilecek dosyalar:**
   - `.gitignore`
   - `Makefile`
   - `package.json`
   - `pnpm-lock.yaml`
   - `README.md`
   - `tsconfig.json`
   - `tsconfig.production.json`
   - `vercel.json` ⭐ (Vercel config)
   - `yarn.lock`
   - `src/` klasörü (tüm içeriğiyle)
   - `dist/` klasörü (build edilmiş dosyalar)

   **UPLOAD ETMEYİN:**
   - `.env` (credential'lar içeriyor - Vercel'de ekleyeceğiz)
   - `node_modules/` klasörü
   - `.git/` klasörü

4. **Commit message:**
   ```
   Initial commit: Polymarket builder signing server with Vercel config
   ```

5. **"Commit changes" butonuna tıklayın**

### Yöntem B: GitHub Desktop (Eğer varsa)

1. GitHub Desktop'ı açın
2. "Add Local Repository" → `/home/user/builder-signing-server` seçin
3. Remote: `https://github.com/seershub/polymarket-builder-signing-server.git`
4. Commit ve Push

### Yöntem C: Git CLI ile (Personal Access Token gerekli)

Eğer GitHub Personal Access Token'ınız varsa:

```bash
cd /home/user/builder-signing-server

# Token ile push
git push https://YOUR_GITHUB_TOKEN@github.com/seershub/polymarket-builder-signing-server.git main
```

Token oluşturmak için: https://github.com/settings/tokens (repo scope yeterli)

---

## Adım 2: Vercel'e Import Edin

Dosyalar GitHub'a yüklendikten sonra:

1. **Vercel Dashboard'a gidin:** https://vercel.com/dashboard

2. **"Add New..." → "Project" tıklayın**

3. **"Import Git Repository" kısmında:**
   - GitHub hesabınızı bağlayın (eğer bağlı değilse)
   - `seershub/polymarket-builder-signing-server` repo'sunu bulun
   - **"Import" butonuna tıklayın**

4. **Configure Project ayarları:**

   **Framework Preset:** Other

   **Build and Output Settings:**
   - Build Command: `npm run vercel-build` veya `make build`
   - Output Directory: `dist`
   - Install Command: `yarn install` veya `npm install`

   **Root Directory:** `./ ` (olduğu gibi)

5. **Environment Variables ekleyin (ÇOK ÖNEMLİ!):**

   **"Environment Variables" bölümünde şunları ekleyin:**

   ```
   PORT=5001
   ```
   ```
   POLY_BUILDER_API_KEY=019a8ccc-09f1-7f2f-b058-50d58975161c
   ```
   ```
   POLY_BUILDER_SECRET=R6UJFRo3W40cnJSmPxf4mnEe1w2GdarSKRERiBYx814=
   ```
   ```
   POLY_BUILDER_PASSPHRASE=1fd5664b5f997e6dac7bc8e05e9e1ed8debd102167745088bba9b706574f6755
   ```

   **Her değişken için:**
   - "Production" ✅
   - "Preview" ✅
   - "Development" ✅

   (Hepsini işaretleyin!)

6. **"Deploy" butonuna tıklayın**

7. **Deploy tamamlanmasını bekleyin** (2-3 dakika)

---

## Adım 3: Deployment URL'sini Alın

Deploy tamamlandığında:

1. **Deployment URL'sini kopyalayın:**
   ```
   https://polymarket-builder-signing-server-xxxxx.vercel.app
   ```

2. **Sign endpoint'i test edin:**
   ```
   https://polymarket-builder-signing-server-xxxxx.vercel.app/sign
   ```

   Browser'da açtığınızda JSON response görmeli veya "Method not allowed" hatası almalısınız (bu normal - POST endpoint)

---

## Adım 4: Poly Projesini Güncelleyin

Builder signing server deploy edildikten sonra:

1. **Poly projesinin Vercel Dashboard'ına gidin**
   (poly.seershub.com projesi)

2. **Settings → Environment Variables**

3. **`NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL` ekleyin/güncelleyin:**

   ```
   NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=https://polymarket-builder-signing-server-xxxxx.vercel.app/sign
   ```

   (xxxxx yerine gerçek deployment URL'inizi yazın)

   **Environment için:**
   - Production ✅
   - Preview ✅
   - Development ✅

4. **"Save" butonuna tıklayın**

5. **Poly projesini redeploy edin:**
   - Deployments sekmesine gidin
   - En son deployment → "..." menü → "Redeploy"
   - **"Redeploy"** tıklayın

---

## Adım 5: Test Edin!

1. **poly.seershub.com**'a gidin

2. **Wallet'ınızı bağlayın**

3. **Bir maça prediction yapın**

4. **Browser console'u açın (F12)**

5. **Şu logları göreceksiniz:**
   ```
   🚀 Attempting gasless approval via Builder Signing Server: https://polymarket-builder-signing-server-xxxxx.vercel.app/sign
   [Relayer API] Using Builder Signing Server for remote signing
   ✅ Gasless approval completed via Relayer
   ✅ Order placed successfully
   ```

6. **✅ Artık gasless predictions çalışıyor!**

---

## 🚨 Sorun Giderme

### "Build failed" hatası alırsanız:

Vercel build logs'larını kontrol edin. Genellikle şunlardan biridir:

1. **`dist/` klasörü yok:**
   - Local'de `npm run build` çalıştırın
   - `dist/` klasörünü GitHub'a upload edin

2. **Dependencies eksik:**
   - Build Command: `yarn install && make build`

3. **TypeScript hatası:**
   - `tsconfig.json` dosyası GitHub'da var mı kontrol edin

### "Environment variable not found" hatası:

1. Vercel Settings → Environment Variables
2. Tüm 4 değişken var mı kontrol edin
3. Redeploy edin

### Builder signing server 500 error:

1. Function logs'ları kontrol edin (Vercel → Deployments → Functions)
2. Environment variables doğru mu kontrol edin

---

## ✅ Başarı Kriterleri

- ✅ GitHub repo'da tüm dosyalar var
- ✅ Vercel'de deployment başarılı
- ✅ `/sign` endpoint çalışıyor
- ✅ Poly projesi güncel URL ile çalışıyor
- ✅ Predictions gasless olarak yapılabiliyor

---

## 📞 Yardım

Herhangi bir adımda takılırsanız:

1. GitHub repo'nun public/private olduğundan emin olun (Vercel her ikisini de destekler)
2. Vercel build logs'larına bakın
3. Environment variables'ın hepsinin kaydedildiğinden emin olun
4. Browser console'da hata mesajlarını kontrol edin
