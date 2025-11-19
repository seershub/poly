import { BuilderSigner } from '@polymarket/builder-signing-sdk';
import { createApp } from './app';

// Safely load dotenv if available (dev mode)
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
} catch (e) {
    // Ignore error in production/Vercel where .env might not exist on disk
}

const PORT = Number(process.env.PORT ?? 8080);

// Lazy initialization or safe check
const key = process.env.POLY_BUILDER_API_KEY;
const secret = process.env.POLY_BUILDER_SECRET;
const passphrase = process.env.POLY_BUILDER_PASSPHRASE;
const authorizationToken = process.env.AUTHORIZATION_TOKEN;

let app: any;

try {
    if (!key || !secret || !passphrase) {
        console.warn("Missing Builder API credentials. Server will start but signing will fail.");
        // Create a dummy app that returns 500 for debugging
        const express = require('express');
        app = express();
        app.use((req: any, res: any) => {
            res.status(500).json({
                error: 'Configuration Error',
                message: 'Missing POLY_BUILDER_API_KEY, SECRET, or PASSPHRASE in environment variables.'
            });
        });
    } else {
        const signer = new BuilderSigner({ key, secret, passphrase });
        app = createApp(signer, authorizationToken);
    }
} catch (error) {
    console.error("Failed to initialize app:", error);
    const express = require('express');
    app = express();
    app.use((req: any, res: any) => {
        res.status(500).json({ error: 'Initialization Error', details: String(error) });
    });
}

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Builder signing server listening on :${PORT}`);
    });
}

// Export the app for Vercel
export default app;
