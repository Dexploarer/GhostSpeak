import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Note: Static export disabled - this is a dynamic web3 app with wallet connections
  // and real-time blockchain data that requires client-side rendering

  // Disable TypeScript checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  // Disable ESLint during build (run separately in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Transpile MDX packages for React 19 compatibility
  transpilePackages: ['next-mdx-remote'],

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
    // Handle pino-pretty - it's an optional dependency of pino used by WalletConnect
    // We don't need pretty printing in production, so we can safely ignore it
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': path.resolve(__dirname, 'lib/utils/pino-pretty-noop.js'),
    }
    
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

