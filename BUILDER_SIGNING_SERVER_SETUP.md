# Polymarket Builder Signing Server Kurulumu

## Neden Gerekli?

Polymarket prediction yapabilmek için **USDC approval** işlemi proxy wallet'tan yapılmalı. Bu işlem için **Builder Signing Server** gerekiyor çünkü:

- ✅ Builder credentials güvenli şekilde server'da tutuluyor (client-side'da expose olmuyor)
- ✅ Gasless approval sağlıyor (Polymarket gas ücretini ödüyor)
- ✅ Polymarket'in önerdiği güvenli yöntem

## Hızlı Kurulum (5 Dakika)

### Adım 1: Builder Signing Server'ı Klonlayın

```bash
# Ana dizinde
cd ~
git clone https://github.com/Polymarket/builder-signing-server.git
cd builder-signing-server
```

### Adım 2: Bağımlılıkları Kurun

```bash
yarn install
# veya
npm install
```

### Adım 3: .env Dosyası Oluşturun

Builder signing server klasöründe `.env` dosyası oluşturun:

```bash
nano .env
# veya favori editörünüzü kullanın
```

İçeriği:

```env
PORT=5001
POLY_BUILDER_API_KEY=019a8ccc-09f1-7f2f-b058-50d58975161c
POLY_BUILDER_SECRET=R6UJFRo3W40cnJSmPxf4mnEe1w2GdarSKRERiBYx814=
POLY_BUILDER_PASSPHRASE=1fd5664b5f997e6dac7bc8e05e9e1ed8debd102167745088bba9b706574f6755
```

### Adım 4: Server'ı Başlatın

```bash
yarn start-dev
# veya
npm run start-dev
```

Şunu göreceksiniz:
```
Builder signing server listening on :5001
```

### Adım 5: Poly Projesini Güncelleyin

Poly projenizin `.env.local` dosyasına ekleyin:

```bash
# /home/user/poly/.env.local
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=http://localhost:5001/sign
```

### Adım 6: Poly Projesini Yeniden Başlatın

```bash
cd /home/user/poly
npm run dev
```

## Test

1. poly.seershub.com'a gidin
2. Bir maça prediction yapmayı deneyin
3. Console'da şunu göreceksiniz:
   ```
   [Relayer API] Using Builder Signing Server for remote signing: http://localhost:5001/sign
   ✅ Token approval completed via Relayer (gasless)
   ```

## Üretim (Vercel) İçin

Vercel'de deploy için signing server'ı bir yerde host etmeniz gerekir:

### Seçenek 1: Vercel'de Ayrı Proje (Kolay)

1. Builder signing server'ı Vercel'de ayrı bir proje olarak deploy edin
2. Vercel'in verdiği URL'yi kullanın: `https://your-signing-server.vercel.app/sign`
3. Poly projesinin Vercel environment variables'ına ekleyin:
   ```
   NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=https://your-signing-server.vercel.app/sign
   ```

### Seçenek 2: Railway/Render (Daha Kolay)

1. Railway.app veya Render.com'da builder signing server deploy edin
2. URL'yi poly projesine ekleyin

## Sorun Giderme

### Port 5001 kullanımda

`.env` dosyasında port'u değiştirin:
```env
PORT=5002
```

Ve poly projesinde:
```env
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=http://localhost:5002/sign
```

### Server başlamıyor

Environment variables'ları kontrol edin:
- POLY_BUILDER_API_KEY
- POLY_BUILDER_SECRET
- POLY_BUILDER_PASSPHRASE

Hepsi doğru mu?

## Güvenlik Notları

- ✅ Builder signing server **sadece approve request'leri** imzalar
- ✅ Private key'ler client-side'a asla expose olmuyor
- ✅ Tüm approval işlemleri server-side yapılıyor
- ⚠️ `.env` dosyasını git'e **ASLA** commit etmeyin!

## Daha Fazla Bilgi

- Polymarket Docs: https://docs.polymarket.com/developers/builders/builder-signing-server
- GitHub: https://github.com/Polymarket/builder-signing-server
