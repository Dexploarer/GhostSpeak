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

  // ESLint configuration - allow build to succeed with warnings
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
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
