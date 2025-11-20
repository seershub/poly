/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'encoding');
    
    // Only alias packages that are truly not needed for web
    config.resolve.alias = {
      ...config.resolve.alias,
      // Ignore @react-native-async-storage/async-storage (not needed for web)
      '@react-native-async-storage/async-storage': false,
    };
    
    return config;
  },
};

module.exports = nextConfig;
