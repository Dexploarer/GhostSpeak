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

  // Configure output file tracing for monorepo (includes files from parent dirs)
  outputFileTracingRoot: require('path').join(__dirname, '../../'),

  // Configure asset prefix for GitHub Pages
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/ghostspeak/' : '',

  // Externalize server-only packages from client bundle
  serverExternalPackages: [
    'libsql',
    '@libsql/client',
    '@libsql/core',
    '@libsql/darwin-arm64',
    '@libsql/linux-x64-gnu',
    '@libsql/linux-x64-musl',
    '@libsql/hrana-client',
  ],

  // Configure webpack to handle SDK imports properly
  webpack: (config, { isServer }) => {
    // Ignore markdown files which can cause issues with dynamic imports in dependencies
    config.module.rules.push({
      test: /\.md$/,
      use: 'ignore-loader',
    })

    // Handle .node binary files
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
      type: 'javascript/auto',
    })

    if (!isServer) {
      // Don't bundle server-only packages in client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // @libsql/client uses these
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        child_process: false,
      }
    }

    return config
  },
}

export default nextConfig
