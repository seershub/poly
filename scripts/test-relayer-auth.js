const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load env vars manually
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error('Error: .env.local not found');
            return {};
        }
        const content = fs.readFileSync(envPath, 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error('Error loading .env.local:', e);
        return {};
    }
}

const env = loadEnv();
const apiKey = env.POLY_BUILDER_API_KEY;
const secret = env.POLY_BUILDER_SECRET;
const passphrase = env.POLY_BUILDER_PASSPHRASE;

if (!apiKey || !secret || !passphrase) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
}

console.log('Testing Relayer Auth with:');
console.log('API Key:', apiKey.substring(0, 5) + '...');
console.log('Secret:', secret.substring(0, 5) + '...');

async function testEndpoint(url, method, path, data) {
    return new Promise((resolve, reject) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const dataString = JSON.stringify(data);

        const secretBuffer = Buffer.from(secret, 'base64');
        const message = `${timestamp}${method}${path}${dataString}`;
        const signature = crypto.createHmac('sha256', secretBuffer).update(message).digest('base64');

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'POLY-BUILDER-API-KEY': apiKey,
                'POLY-BUILDER-TIMESTAMP': timestamp.toString(),
                'POLY-BUILDER-SIGNATURE': signature,
                'POLY-BUILDER-PASSPHRASE': passphrase,
            }
        };

        console.log(`\nTesting ${method} ${url}${path}...`);

        const req = https.request(`${url}${path}`, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                console.log(`Body: ${body.substring(0, 200)}...`);
                resolve(res.statusCode);
            });
        });

        req.on('error', (e) => {
            console.error(`Request error: ${e.message}`);
            resolve(0);
        });

        req.write(dataString);
        req.end();
    });
}

async function run() {
    // Test Data (Dummy Safe Transaction)
    const data = {
        to: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
        value: "0",
        data: "0x",
        operation: 0,
        safeTxGas: "0",
        baseGas: "0",
        gasPrice: "0",
        gasToken: "0x0000000000000000000000000000000000000000",
        refundReceiver: "0x0000000000000000000000000000000000000000",
        nonce: "0",
        signatures: "0x"
    };

    // Test 1: /submit on V2
    await testEndpoint('https://relayer-v2.polymarket.com', 'POST', '/submit', data);

    // Test 2: /transactions on V2
    await testEndpoint('https://relayer-v2.polymarket.com', 'POST', '/transactions', data);

    // Test 3: /v1/transactions on V2
    await testEndpoint('https://relayer-v2.polymarket.com', 'POST', '/v1/transactions', data);

    // Test 4: /submit on V1 (relayer.polymarket.com)
    await testEndpoint('https://relayer.polymarket.com', 'POST', '/submit', data);
}

run();
