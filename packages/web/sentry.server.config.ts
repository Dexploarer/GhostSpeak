import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: process.env.NODE_ENV || 'development',

  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint.originalException

    // Don't send rate limit errors (these are expected)
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message).toLowerCase()
      if (message.includes('rate limit') || message.includes('too many requests')) {
        return null
      }
    }

    return event
  },

  // Add custom tags for better filtering
  initialScope: {
    tags: {
      app: 'ghostspeak-web',
      platform: 'solana',
      runtime: 'server',
    },
  },

  // Performance monitoring for server-side operations
  integrations: [
    Sentry.httpIntegration({
      tracing: {
        // Capture performance data for outgoing HTTP requests
        shouldCreateSpanForRequest: (url) => {
          // Track Solana RPC and Convex API calls
          return url.includes('solana') || url.includes('convex') || url.includes('api.stripe.com')
        },
      },
    }),
  ],
})
