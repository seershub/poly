import crypto from 'crypto';

/**
 * Generate RSA signature for Kalshi API v2
 * 
 * @param timestamp - Current timestamp in milliseconds
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path (e.g., /trade-api/v2/markets) - NO QUERY PARAMS
 * @param privateKey - RSA private key (PEM format)
 * @returns Base64 encoded signature
 */
export function generateKalshiSignature(
  timestamp: number,
  method: string,
  path: string,
  privateKey: string
): string {
  // 1. Create message string: timestamp + method + path
  // IMPORTANT: Path must NOT include query parameters
  const message = `${timestamp}${method}${path}`;

  // 2. Sign with RSA-SHA256
  const signer = crypto.createSign('SHA256');
  signer.update(message);
  signer.end();

  // 3. Return base64 encoded signature
  // Kalshi uses RSA-PSS padding with salt length 32 (usually default for PSS)
  // But standard RSA-PKCS1-v1_5 is also common. Let's try standard first as it's simpler in Node.
  // Wait, docs say: "Sign the message using your private key with RSA-PSS and SHA256"
  
  return signer.sign(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST // Use digest length (32 for SHA256)
    },
    'base64'
  );
}

/**
 * Format private key if it's missing headers/newlines
 * Vercel env vars might strip newlines
 */
export function formatPrivateKey(key: string): string {
  if (!key) return '';
  
  // If already formatted properly
  if (key.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    return key.replace(/\\n/g, '\n'); // Fix escaped newlines if any
  }

  // Reconstruct PEM format
  const body = key.replace(/\s/g, ''); // Remove all whitespace
  const chunks = body.match(/.{1,64}/g) || [];
  
  return `-----BEGIN RSA PRIVATE KEY-----\n${chunks.join('\n')}\n-----END RSA PRIVATE KEY-----`;
}
