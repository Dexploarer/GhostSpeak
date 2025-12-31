'use client'

import posthog from 'posthog-js'

export class Analytics {
  private static instance: Analytics
  private initialized = false

  private constructor() {}

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics()
    }
    return Analytics.instance
  }

  initialize() {
    if (this.initialized) return
    if (typeof window === 'undefined') return

    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

    if (!apiKey) {
      console.warn('PostHog API key not found - analytics disabled')
      return
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug()
        }
      },
      capture_pageview: false, // We'll manually track pageviews
      persistence: 'localStorage',
      autocapture: false, // Manual tracking for better control
    })

    this.initialized = true
  }

  // User identification
  identify(userId: string, traits?: Record<string, any>) {
    if (!this.initialized) return
    posthog.identify(userId, traits)
  }

  reset() {
    if (!this.initialized) return
    posthog.reset()
  }

  // Core events
  trackPageView(pageName?: string) {
    if (!this.initialized) return
    posthog.capture('$pageview', {
      page_name: pageName,
    })
  }

  // User events
  trackSignup(method: 'wallet' | 'email', walletAddress?: string) {
    if (!this.initialized) return
    posthog.capture('user_signed_up', {
      method,
      wallet_address: walletAddress,
    })
  }

  trackLogin(method: 'wallet' | 'email', walletAddress?: string) {
    if (!this.initialized) return
    posthog.capture('user_logged_in', {
      method,
      wallet_address: walletAddress,
    })
  }

  // B2C Ghost Score events
  trackAgentVerification(
    agentAddress: string,
    verificationLevel: 'basic' | 'verified' | 'elite'
  ) {
    if (!this.initialized) return
    posthog.capture('agent_verified', {
      agent_address: agentAddress,
      verification_level: verificationLevel,
    })
  }

  trackGhostScoreView(agentAddress: string, score: number) {
    if (!this.initialized) return
    posthog.capture('ghost_score_viewed', {
      agent_address: agentAddress,
      score,
    })
  }

  trackCredentialIssued(
    agentAddress: string,
    credentialType: string,
    issuer: string
  ) {
    if (!this.initialized) return
    posthog.capture('credential_issued', {
      agent_address: agentAddress,
      credential_type: credentialType,
      issuer,
    })
  }

  // B2B API events
  trackApiKeyCreated(tier: 'freemium' | 'starter' | 'professional' | 'enterprise') {
    if (!this.initialized) return
    posthog.capture('api_key_created', {
      tier,
    })
  }

  trackApiRequest(endpoint: string, statusCode: number, duration: number) {
    if (!this.initialized) return
    posthog.capture('api_request', {
      endpoint,
      status_code: statusCode,
      duration_ms: duration,
    })
  }

  trackApiError(endpoint: string, errorType: string, errorMessage: string) {
    if (!this.initialized) return
    posthog.capture('api_error', {
      endpoint,
      error_type: errorType,
      error_message: errorMessage,
    })
  }

  trackRateLimitHit(endpoint: string, tier: string) {
    if (!this.initialized) return
    posthog.capture('rate_limit_hit', {
      endpoint,
      tier,
    })
  }

  // Payment events
  trackSubscriptionCreated(
    tier: 'freemium' | 'starter' | 'professional' | 'enterprise',
    amount: number
  ) {
    if (!this.initialized) return
    posthog.capture('subscription_created', {
      tier,
      amount,
    })
  }

  trackSubscriptionUpgraded(fromTier: string, toTier: string, amount: number) {
    if (!this.initialized) return
    posthog.capture('subscription_upgraded', {
      from_tier: fromTier,
      to_tier: toTier,
      amount,
    })
  }

  trackPaymentSucceeded(amount: number, currency: string, paymentMethod: string) {
    if (!this.initialized) return
    posthog.capture('payment_succeeded', {
      amount,
      currency,
      payment_method: paymentMethod,
    })
  }

  trackPaymentFailed(amount: number, currency: string, errorMessage: string) {
    if (!this.initialized) return
    posthog.capture('payment_failed', {
      amount,
      currency,
      error_message: errorMessage,
    })
  }

  // PayAI Integration events
  trackPayAIWebhook(eventType: string, amount: number, success: boolean) {
    if (!this.initialized) return
    posthog.capture('payai_webhook_received', {
      event_type: eventType,
      amount,
      success,
    })
  }

  trackPayAITransactionOnChain(txHash: string, amount: number) {
    if (!this.initialized) return
    posthog.capture('payai_transaction_on_chain', {
      transaction_hash: txHash,
      amount,
    })
  }

  // Agent events
  trackAgentCreated(agentAddress: string, agentType: string) {
    if (!this.initialized) return
    posthog.capture('agent_created', {
      agent_address: agentAddress,
      agent_type: agentType,
    })
  }

  trackAgentUpdated(agentAddress: string, fieldsUpdated: string[]) {
    if (!this.initialized) return
    posthog.capture('agent_updated', {
      agent_address: agentAddress,
      fields_updated: fieldsUpdated,
    })
  }

  // Engagement events
  trackFeatureUsed(featureName: string, metadata?: Record<string, any>) {
    if (!this.initialized) return
    posthog.capture('feature_used', {
      feature_name: featureName,
      ...metadata,
    })
  }

  trackButtonClick(buttonName: string, location: string) {
    if (!this.initialized) return
    posthog.capture('button_clicked', {
      button_name: buttonName,
      location,
    })
  }

  // Error tracking (supplement to Sentry)
  trackError(errorName: string, errorMessage: string, context?: Record<string, any>) {
    if (!this.initialized) return
    posthog.capture('error_occurred', {
      error_name: errorName,
      error_message: errorMessage,
      ...context,
    })
  }

  // Custom events
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.initialized) return
    posthog.capture(eventName, properties)
  }

  // Feature flags
  isFeatureEnabled(flagKey: string): boolean {
    if (!this.initialized) return false
    return posthog.isFeatureEnabled(flagKey) || false
  }

  getFeatureFlag(flagKey: string): string | boolean | undefined {
    if (!this.initialized) return undefined
    return posthog.getFeatureFlag(flagKey)
  }
}

// Export singleton instance
export const analytics = Analytics.getInstance()

// Export convenience functions
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  analytics.track(eventName, properties)
}

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  analytics.identify(userId, traits)
}
