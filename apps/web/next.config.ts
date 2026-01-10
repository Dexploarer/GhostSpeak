import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'

// Bundle analyzer configuration
const bundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

// Main Next.js configuration
const nextConfig: NextConfig = {
  // Note: Static export disabled - this is a dynamic web3 app with wallet connections
  // and real-time blockchain data that requires client-side rendering

  // TypeScript checking during build - set to false to enforce type safety
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration - temporarily disabled to test critical bug fixes
  eslint: {
    // TODO: Re-enable after fixing prettier/formatting issues
    ignoreDuringBuilds: true,
  },

  // Turbopack configuration to mirror webpack rules and resolve warnings
  turbopack: {
    rules: {
      // Handle .md and .node files as in webpack config
      '*.md': {
        loaders: ['ignore-loader'],
        as: '*.js',
      },
      '*.node': {
        loaders: ['node-loader'],
        as: '*.js',
      },
    },
    resolveAlias: {
      // Mirror browser fallbacks from webpack config
      // Use an empty module for ignored server-side packages ONLY in the browser
      fs: { browser: './lib/empty.js' },
      path: { browser: './lib/empty.js' },
      os: { browser: './lib/empty.js' },
      crypto: { browser: './lib/empty.js' },
      stream: { browser: './lib/empty.js' },
      http: { browser: './lib/empty.js' },
      https: { browser: './lib/empty.js' },
      net: { browser: './lib/empty.js' },
      tls: { browser: './lib/empty.js' },
      child_process: { browser: './lib/empty.js' },
    },
  },

  // Optimize memory usage during build
  experimental: {
    // Reduce webpack cache size
    webpackMemoryOptimizations: true,
  },

  // Set basePath for GitHub Pages (uncomment if deploying to subdirectory)
  // basePath: process.env.NODE_ENV === 'production' ? '/ghostspeak' : '',

  // Configure output file tracing for monorepo (includes files from parent dirs)
  outputFileTracingRoot: require('path').join(__dirname, '../../'),

  // Transpile workspace packages (required for monorepo)
  transpilePackages: ['@ghostspeak/plugin-elizaos', '@ghostspeak/sdk'],

  // Configure asset prefix for GitHub Pages
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/ghostspeak/' : '',

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Content Security Policy - adjust based on your needs
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel-analytics.com *.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: *.posthog.com",
              "font-src 'self'",
              "connect-src 'self' *.convex.cloud *.solana.com *.helius-rpc.com wss://*.convex.cloud",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },

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
    // Reduce memory usage by disabling source maps in production
    if (process.env.NODE_ENV === 'production') {
      config.devtool = false
    }

    // Optimize memory by limiting concurrent compilations
    config.parallelism = 1

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

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Disable source map upload to reduce memory usage during build
  disableLogger: true,
  hideSourceMaps: true,

  // Only upload source maps if explicitly enabled (reduces memory usage)
  widenClientFileUpload: false,

  // Disable React component annotation to save memory
  reactComponentAnnotation: {
    enabled: false,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the Sentry DSN is publicly available before enabling this option.
  tunnelRoute: '/monitoring',
}

// Export with both bundle analyzer and Sentry config
let config = bundleAnalyzerConfig(nextConfig)

// Add Sentry config only if DSN is set AND not in memory-constrained build
// Disable Sentry plugin during Vercel builds to save memory
if (process.env.SENTRY_DSN && process.env.ENABLE_SENTRY_BUILD === 'true') {
  config = withSentryConfig(config, sentryWebpackPluginOptions)
}

export default config
