# Vercel Environment Variables Setup

## Kalshi API Credentials

Kalshi markets görünmesi için Vercel'de environment variable'ları ayarlamanız gerekiyor.

### Adım 1: Vercel Dashboard'a Gidin

1. https://vercel.com/seershub/poly adresine gidin
2. **Settings** sekmesine tıklayın
3. Sol menüden **Environment Variables** seçin

### Adım 2: KALSHI_API_KEY Ekleyin

**Name:**
```
KALSHI_API_KEY
```

**Value:**
```
b519d59e-b781-4e0f-b00c-61a6bf4d948e
```

**Environment:** (hepsini seçin)
- ✅ Production
- ✅ Preview
- ✅ Development

**Save** butonuna tıklayın.

### Adım 3: KALSHI_API_SECRET Ekleyin

**Name:**
```
KALSHI_API_SECRET
```

**Value:** (RSA private key'in TAMAMINI yapıştırın, BEGIN ve END dahil)
```
-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEA2IKRXe+7sDAG2wh2kDaZJ9nkqFKAKDSFOXNxEYNcBHZnjD/W
ljAcsn4bycRUjcFGJU4pTc34b8JnILu+9KNFCJBSZuWodtJagD6sBJCWlapZse7J
V+g+syv2mkfRq2e34x2sU4DKWn3BNrpvO2ss0gJ1x46b+ud0NvN/jyxh3opVXfdp
9/I3Ez2hHShCaqYpqq2EiwyGmEQj9V/FX/vMjeL2ZD5Z1bwrmr70jgQrQU0RIEbF
aYadqHkS9bdsKPb3OG3LKADPXLWszFL2V3MmsS7pAGBC70vAQKBqdqwCIHULrfI4
ZWBreGLPglSrqL3bK57vTz4uTleP0TDwROdO7QIDAQABAoIBAECvYbbq9OxCrQmr
kaCsbz2Uv9f6LgfVCSiM8O8Gi+tZZL5mJDpizXAWdT7mxUxEvixPGdABBYR+VElX
TknQrcNNOxE69AXr+tXt437Jo/O7HWknqkf1PyZQsDCP3HiVWD8mkmGwTMSUZbFw
KeNatd1Yls+0L63akMIKJcYkwGi35uzyH8sfRTW4IC5Fi2H05OXU5mvrPy6/hv5E
JMizl2j/2RceDilcY70L5zYa9XivYm3z+oxUqq0mLeS7wUV38Pq7NfC8ALmJRAlE
pcbsa9jYcHO6ZNC7hJoX2jJHb/IY6QGEuAATcRtrJFkyaxwbOeSIcWYHs8RUerOK
Mes49YECgYEA5sSmafbYfFqxie7AFfpuain9DW+KNcdFG7618DC9EMDB8JLa5Ath
0Ntk9GIlj2tyEwenrQnb+gjAgZegNSsQMTgFL0aTHekhOYGjmc54gCYEVGmcVLI3
PZXSY4utaftnbiJRWCyPZut+/IFQ1lzn5cQd3UPZ67eJPVvCGEWL3+kCgYEA8C7S
y22hs1V6EzpBjkuAMjWeKFXnhkqbRsqFmju9Sz9pD/oxPLA5Bq91I91kz8WvIDq9
oX7mHYHmV2ILNlklZQ7XKJ2tRM7Qd9xhB/lxpSrURXWfk4M1LexGukXrefLV7fLK
VBrAlKWfrsHADPX72UVgC4b1Qnvr4h8ucgy1OGUCgYBsMSpsZ8TbmJHAP2VjaIQ3
1fPERtUfnYtzFJisQc2CezzyE4f4frWffBz6zsEZWqCi92XPpN2zfkLy/ymng8cV
rFQR9B6pWVGwam1PgRPR0QEaqmEW/G8VupZnAWeOVsYJRqGom0uoTyS8Mcy6k9hN
SwNNZ7BV6Ti4wbpgMsr/cQKBgCqploXN5nANWc66hVR6Mr44aexuPd7Lt8MeTBb2
T4xjKg1Nept2DdsTJXKGa9bAHXhTFsXt3YAWR8zzvFwd/5dwyGUNhO548eyod4/M
DhSxg90GpJ62KqcKlhGWQ9p4eOl4O9oumlCNDs0i2zMyKlcQjJvfkAcMLf0PXteh
TDtFAoGAFlhtqOZ4TaTOOzOgFnZbSrnIvsLHIJGx/w0viXxkx7DvBbjXTlls5xQN
+LZ2CreASsecphMq4a3XcRi+QqJBATMEqghc17Yzthn6ycKEzPCjBkn4WxvBsElp
8kbB1XQ45ayR27E4eH4yGVrZYeBfiJw2ZYzqGJWm4IIg0sADF6A=
-----END RSA PRIVATE KEY-----
```

**Environment:** (hepsini seçin)
- ✅ Production
- ✅ Preview
- ✅ Development

**Save** butonuna tıklayın.

### Adım 4: Redeploy Edin

Environment variable'lar eklendikten sonra **MUTLAKA** redeploy etmelisiniz:

1. **Deployments** sekmesine gidin
2. En son deployment'ı bulun
3. Sağdaki **⋮** (3 nokta) menüsüne tıklayın
4. **Redeploy** seçin
5. ✅ **Use existing Build Cache** seçeneğini KALDIRINIZ (fresh build için)
6. **Redeploy** butonuna tıklayın

### Adım 5: Doğrulama

2-3 dakika sonra poly.seershub.com adresine gidin:

1. Sayfayı yenileyin (Hard refresh: Ctrl+Shift+R)
2. F12 → Console
3. Şunları göreceksiniz:

```
=== Kalshi API: Fetching Markets ===
[Kalshi API] ✅ API key configured
[Kalshi API] Fetching from: https://api.kalshi.com/trade-api/v2
[Kalshi API] ✅ Response received: { status: 200, totalMarkets: 50 }
[Kalshi API] ✅ Successfully converted X Kalshi markets
```

## Sorun Giderme

### "API key not configured" hatası devam ediyorsa:

1. ✅ Environment variable name'leri doğru yazdınız mı?
   - `KALSHI_API_KEY` (underscore ile, camelCase değil!)
   - `KALSHI_API_SECRET` (underscore ile, camelCase değil!)

2. ✅ Private key'i KOMPLE yapıştırdınız mı?
   - BEGIN satırı dahil
   - END satırı dahil
   - Araya boşluk koymadan

3. ✅ Redeploy yaptınız mı?
   - Environment variable eklemek yetmez!
   - MUTLAKA redeploy gerekli

4. ✅ Build cache'i temizlediniz mi?
   - Redeploy sırasında "Use existing Build Cache" seçeneğini KALDIRINIZ

## Notlar

- Local development için: `.env.local` dosyası yeterli (zaten ekli)
- Production için: Vercel environment variables gerekli
- Private key'i GitHub'a ASLA push etmeyin!
- `.env.local` dosyası `.gitignore`'da olduğundan güvenli
