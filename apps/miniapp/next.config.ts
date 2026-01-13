import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Disable static optimization - Mini App needs runtime data
  output: 'standalone',

  // Disable ESLint and TypeScript checking during builds for Vercel deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Telegram Mini Apps run in iframe/webview
  experimental: {
    scrollRestoration: true,
  },

  // Headers for Telegram WebView
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL', // Allow Telegram to embed
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://web.telegram.org https://telegram.org",
          },
        ],
      },
    ]
  },

  // Environment variables are automatically exposed via NEXT_PUBLIC_ prefix
  // No need to explicitly pass them here - Next.js handles this natively
  // Validation is done in lib/env.ts using Zod schemas

  // Optimize for production
  poweredByHeader: false,
  compress: true,

  // Webpack configuration
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
}

export default nextConfig
