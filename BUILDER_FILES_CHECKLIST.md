# Builder Signing Server - GitHub Upload Checklist

## 📁 GitHub'a Upload Edilecek Dosyalar

Builder signing server'ı GitHub'a upload etmek için şu dosyaları kopyalayın:

**Kaynak:** `/home/user/builder-signing-server/`
**Hedef:** https://github.com/seershub/polymarket-builder-signing-server

---

## ✅ Root Klasörde Upload Edilecek Dosyalar

```
✅ .gitignore
✅ .env.example
✅ Makefile
✅ README.md
✅ package.json
✅ pnpm-lock.yaml
✅ tsconfig.json
✅ tsconfig.production.json
✅ vercel.json          ⭐ ÖNEMLİ: Vercel config
✅ yarn.lock
```

## ✅ src/ Klasörü (Tüm İçeriğiyle)

```
src/
├── app.ts
├── server.ts
├── types.ts
└── utils.ts
```

## ❌ Upload ETMEYİN

```
❌ .env                 (credential'lar var - Vercel'e environment variable olarak ekleyeceğiz)
❌ .git/                (Git klasörü)
❌ node_modules/        (NPM packages - Vercel build sırasında yüklenecek)
❌ dist/                (Build edilmiş dosyalar - Vercel build edecek)
❌ .nyc_output/
❌ coverage/
```

---

## 🚀 GitHub'a Upload Etme Adımları

### Yöntem 1: Web Interface (EN KOLAY)

1. **GitHub repo'ya gidin:**
   https://github.com/seershub/polymarket-builder-signing-server

2. **"Add file" → "Upload files" tıklayın**

3. **File Explorer'da şu klasörü açın:**
   `/home/user/builder-signing-server/`

4. **Yukarıdaki listede ✅ işaretli dosyaları sürükleyin:**
   - Root'taki tüm dosyaları seçin (.env HARİÇ)
   - `src/` klasörünü sürükleyin

5. **Commit message:**
   ```
   Initial commit with Vercel deployment config
   ```

6. **"Commit changes" tıklayın**

---

## 🔍 Upload Sonrası Kontrol

GitHub repo'nuzda şunlar olmalı:

```
polymarket-builder-signing-server/
├── .gitignore
├── .env.example
├── Makefile
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.production.json
├── vercel.json          ⭐
├── yarn.lock
└── src/
    ├── app.ts
    ├── server.ts
    ├── types.ts
    └── utils.ts
```

**Toplam:** ~14 dosya

---

## ▶️ Sonraki Adım

Dosyalar GitHub'a yüklendikten sonra:

👉 **VERCEL_GITHUB_IMPORT_GUIDE.md** dosyasındaki "Adım 2: Vercel'e Import Edin" kısmını takip edin

---

## 💡 İpuçları

- **Drag & Drop:** En kolay yol, file explorer'dan dosyaları sürükleyip bırakmak
- **Çoklu Seçim:** Ctrl/Cmd tuşuna basılı tutup birden fazla dosya seçebilirsiniz
- **src/ klasörü:** Klasörü olduğu gibi sürükleyebilirsiniz (içindeki tüm dosyalarla)
- **.env kontrolü:** Kesinlikle .env dosyasını upload ETMEYİN (credential'lar var!)

---

## ✅ Hazır!

Dosyalar upload edildikten sonra Vercel'e import edebilirsiniz. 🚀
