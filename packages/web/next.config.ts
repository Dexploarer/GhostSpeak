import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Note: Static export disabled - this is a dynamic web3 app with wallet connections
  // and real-time blockchain data that requires client-side rendering

  // TypeScript checking during build - set to false to enforce type safety
  typescript: {
    ignoreBuildErrors: false,
  },

  // Set basePath for GitHub Pages (uncomment if deploying to subdirectory)
  // basePath: process.env.NODE_ENV === 'production' ? '/ghostspeak' : '',

  // Configure asset prefix for GitHub Pages
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/ghostspeak/' : '',

  // Externalize server-only packages from client bundle
  serverExternalPackages: [
    'libsql',
    '@libsql/client',
    '@libsql/darwin-arm64',
    '@libsql/hrana-client',
  ],

  // Configure webpack to handle SDK imports properly
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages in client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
      }

      // Externalize native modules
      config.externals = [
        ...((config.externals as unknown[]) || []),
        'libsql',
        '@libsql/client',
        '@libsql/darwin-arm64',
        '@libsql/hrana-client',
      ]
    }

    return config
  },
}

export default nextConfig
