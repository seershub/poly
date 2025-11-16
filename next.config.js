/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'encoding');
    
    // Make @polymarket/builder-relayer-client optional to prevent build errors
    // This package may not be installed, but the code handles it gracefully at runtime
    config.resolve.alias = {
      ...config.resolve.alias,
      '@polymarket/builder-relayer-client': false,
    };
    
    return config;
  },
};

module.exports = nextConfig;
