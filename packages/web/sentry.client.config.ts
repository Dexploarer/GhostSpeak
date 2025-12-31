import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: process.env.NODE_ENV || 'development',

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysOnErrorSampleRate: 1.0,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out expected errors
  beforeSend(event, hint) {
    const error = hint.originalException

    // Don't send wallet connection errors
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message).toLowerCase()
      if (
        message.includes('user rejected') ||
        message.includes('wallet not connected') ||
        message.includes('transaction cancelled')
      ) {
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
    },
  },
})
