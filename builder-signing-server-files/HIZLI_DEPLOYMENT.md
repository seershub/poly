# ⚡ HIZLI DEPLOYMENT - Builder Signing Server

## 🎯 3 Adımda Deployment

### 1️⃣ Polymarket Repo'yu Clone + Dosyaları Ekle

Terminal'de:

```bash
git clone https://github.com/Polymarket/builder-signing-server.git
cd builder-signing-server
```

**Bu klasörde şu dosyaları oluştur/güncelle:**

**`vercel.json`** (yeni dosya):
```json
{
  "version": 2,
  "builds": [{"src": "dist/server.js", "use": "@vercel/node"}],
  "routes": [{"src": "/(.*)", "dest": "dist/server.js"}],
  "env": {
    "PORT": "5001",
    "POLY_BUILDER_API_KEY": "@poly_builder_api_key",
    "POLY_BUILDER_SECRET": "@poly_builder_secret",
    "POLY_BUILDER_PASSPHRASE": "@poly_builder_passphrase"
  }
}
```

**`package.json`** - scripts kısmına ekle:
```json
"scripts": {
  ...
  "vercel-build": "make build"
}
```

### 2️⃣ GitHub'a Push

```bash
npm install
npm run build

git remote remove origin
git remote add origin https://github.com/seershub/polymarket-builder-signing-server.git

git add .
git commit -m "Add Vercel config"
git push -u origin main
```

### 3️⃣ Vercel'e Deploy

1. **https://vercel.com/dashboard**
2. **"Add New" → "Project"**
3. **Import:** `seershub/polymarket-builder-signing-server`
4. **Framework:** Other
5. **Build Command:** `npm run vercel-build`
6. **Output Directory:** `dist`
7. **Install Command:** `yarn install`

**Environment Variables:**
```
PORT=5001
POLY_BUILDER_API_KEY=019a8ccc-09f1-7f2f-b058-50d58975161c
POLY_BUILDER_SECRET=R6UJFRo3W40cnJSmPxf4mnEe1w2GdarSKRERiBYx814=
POLY_BUILDER_PASSPHRASE=1fd5664b5f997e6dac7bc8e05e9e1ed8debd102167745088bba9b706574f6755
```

8. **Deploy!**

### 4️⃣ Poly Projesini Güncelle

Deployment URL'sini aldıktan sonra:

1. **Poly projesi Vercel → Settings → Environment Variables**
2. **Ekle:**
   ```
   NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=https://YOUR-DEPLOYMENT.vercel.app/sign
   ```
3. **Redeploy**

## ✅ TAMAM!

Gasless predictions artık çalışacak! 🚀
