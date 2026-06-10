/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for Turborepo
  experimental: {
    typedRoutes: true,
  },
  // Webpack config for handling native modules in workers
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXTAUTH_URL,
  },
};

export default nextConfig;
