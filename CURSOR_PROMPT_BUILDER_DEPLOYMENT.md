# Cursor AI Prompt: Builder Signing Server Deployment

Aşağıdaki promptu Cursor'da kopyalayıp yapıştırın (Cmd+L veya Ctrl+L ile Cursor chat açın):

---

## PROMPT BAŞLANGIÇ

I need you to help me deploy the Polymarket builder signing server to Vercel. Here's what needs to be done:

**Context:**
- The builder signing server is located at `/home/user/builder-signing-server`
- It's already prepared for Vercel deployment with `vercel.json` and build scripts
- I need to deploy it to production so my app at poly.seershub.com can use it for gasless USDC approvals

**Tasks:**

### 1. Deploy to Vercel

```bash
cd /home/user/builder-signing-server
npx vercel --prod
```

When prompted:
- "Set up and deploy?" → **Y**
- "Which scope?" → Select my Vercel account
- "Link to existing project?" → **N**
- "What's your project's name?" → `polymarket-builder-signing-server`
- "In which directory is your code located?" → `./`
- "Want to override the settings?" → **N**

### 2. After Deployment

The deployment will give me a URL like:
```
https://polymarket-builder-signing-server-xxxxx.vercel.app
```

**IMPORTANT:** Save this URL and show it to me!

### 3. Configure Environment Variables

Tell me to go to Vercel Dashboard and add these environment variables to the builder signing server project:

**Settings → Environment Variables → Add:**

```
PORT=5001
POLY_BUILDER_API_KEY=019a8ccc-09f1-7f2f-b058-50d58975161c
POLY_BUILDER_SECRET=R6UJFRo3W40cnJSmPxf4mnEe1w2GdarSKRERiBYx814=
POLY_BUILDER_PASSPHRASE=1fd5664b5f997e6dac7bc8e05e9e1ed8debd102167745088bba9b706574f6755
```

Make sure I check all three boxes: Production, Preview, Development

### 4. Redeploy After Adding Variables

After I add the environment variables, tell me to:
1. Go to Deployments tab
2. Click "..." menu on the latest deployment
3. Click "Redeploy"

### 5. Update Main Project

Once the builder signing server is deployed and working, help me update the poly project's Vercel environment variables:

Go to poly.seershub.com project → Settings → Environment Variables

Update or add:
```
NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL=https://polymarket-builder-signing-server-xxxxx.vercel.app/sign
```

(Replace xxxxx with the actual deployment URL)

Then redeploy the poly project.

### 6. Verify Deployment

Help me test by:
1. Opening the builder signing server URL in browser
2. Checking `/sign` endpoint returns proper response
3. Testing a prediction on poly.seershub.com

---

**Start with step 1 and guide me through each step. Show me the exact commands to run and wait for my confirmation before moving to the next step.**

## PROMPT SON

---

# Alternatif: Daha Basit Prompt (Eğer Cursor login sıkıntısı varsa)

Eğer Cursor Vercel login yapamıyorsa, şu promptu kullanın:

---

I need step-by-step instructions to manually deploy the builder signing server at `/home/user/builder-signing-server` to Vercel.

**Requirements:**
1. I'll run the Vercel CLI commands in my terminal
2. I need the exact commands to run
3. I need to know what environment variables to add in Vercel Dashboard
4. I need to update my main project (poly.seershub.com) after deployment

Walk me through this process step by step, showing me what to do after each step completes.

---

# Notlar

- **İlk promptu kullanmanızı öneririm** - daha detaylı ve Cursor'un tam olarak ne yapması gerektiğini açıklıyor
- Cursor size adım adım rehberlik edecek
- Her adımdan sonra size ne yapmanız gerektiğini söyleyecek
- Deployment URL'sini gösterecek
- Environment variable'ları nasıl ekleyeceğinizi anlatacak

# Manuel Olarak Yapmak İsterseniz

Terminal'de şu komutları çalıştırın:

```bash
cd /home/user/builder-signing-server
npx vercel --prod
```

URL'yi aldıktan sonra:
1. Vercel Dashboard → polymarket-builder-signing-server → Settings → Environment Variables
2. Yukarıdaki 4 değişkeni ekleyin
3. Redeploy edin
4. Poly projesinde `NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL` güncelleyin
