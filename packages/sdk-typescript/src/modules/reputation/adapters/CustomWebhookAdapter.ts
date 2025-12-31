/**
 * Custom Webhook Reputation Adapter
 *
 * Allows external reputation sources to integrate via webhook endpoints.
 * Reliability: 0.5 (untrusted external source, requires signature verification)
 *
 * Security features:
 * - HMAC signature verification
 * - Schema validation
 * - Rate limiting per source
 * - Timestamp validation (prevent replay attacks)
 */

import * as crypto from 'crypto'
import {
  BaseReputationAdapter,
  ReputationSource,
  type SourceReputationData,
  type ReputationSourceConfig,
} from './ReputationSourceAdapter.js'

/**
 * Custom webhook response schema
 */
export interface WebhookReputationResponse {
  agentId: string
  score: number // Should be 0-100 or 0-1000 (normalized by adapter)
  dataPoints: number
  metadata: Record<string, any>
  timestamp: string
  signature?: string
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  webhookUrl: string
  secret: string
  timeout: number
  maxRetries: number
  scoreScale: 'percentage' | 'thousand' // 0-100 or 0-1000
}

/**
 * Custom webhook adapter for reputation scoring
 */
export class CustomWebhookAdapter extends BaseReputationAdapter {
  private webhookUrl: string
  private secret: string
  private timeout: number
  private maxRetries: number
  private scoreScale: 'percentage' | 'thousand'
  private lastRequestTime = 0
  private readonly MIN_REQUEST_INTERVAL = 1000 // 1 second rate limit

  constructor(config: ReputationSourceConfig) {
    super(config)

    const webhookConfig = config.config as WebhookConfig
    this.webhookUrl = webhookConfig.webhookUrl
    this.secret = webhookConfig.secret
    this.timeout = webhookConfig.timeout || 10000
    this.maxRetries = webhookConfig.maxRetries || 3
    this.scoreScale = webhookConfig.scoreScale || 'percentage'

    if (!this.webhookUrl) {
      throw new Error('Webhook URL is required')
    }

    if (!this.secret) {
      throw new Error('Webhook secret is required for signature verification')
    }
  }

  get source(): ReputationSource {
    return ReputationSource.CustomWebhook
  }

  /**
   * Fetch reputation data from custom webhook
   *
   * @param agentId - Agent identifier
   * @returns Normalized reputation data
   */
  async fetchReputationData(agentId: string): Promise<SourceReputationData> {
    // Rate limiting
    this.enforceRateLimit()

    // Fetch data from webhook
    const response = await this.fetchWithRetry(agentId)

    // Verify signature
    if (!this.verifySignature(response)) {
      throw new Error('Invalid webhook signature')
    }

    // Validate response schema
    if (!this.validateWebhookResponse(response)) {
      throw new Error('Invalid webhook response schema')
    }

    // Validate timestamp (prevent replay attacks)
    this.validateTimestamp(response.timestamp)

    // Normalize score
    const normalizedScore = this.normalizeScore(response.score)

    // Calculate reliability
    const reliability = this.calculateReliability(response)

    return {
      source: this.source,
      score: normalizedScore,
      dataPoints: response.dataPoints,
      reliability,
      rawData: response,
      timestamp: new Date(response.timestamp),
    }
  }

  /**
   * Fetch data from webhook with retry logic
   */
  private async fetchWithRetry(agentId: string, attempt = 1): Promise<WebhookReputationResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (attempt < this.maxRetries) {
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000)
        return this.fetchWithRetry(agentId, attempt + 1)
      }

      throw error
    }
  }

  /**
   * Verify HMAC signature
   */
  private verifySignature(response: WebhookReputationResponse): boolean {
    if (!response.signature) {
      return false
    }

    // Create payload without signature
    const { signature, ...payload } = response
    const payloadString = JSON.stringify(payload)

    // Calculate expected signature
    const hmac = crypto.createHmac('sha256', this.secret)
    hmac.update(payloadString)
    const expectedSignature = hmac.digest('hex')

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(response.signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Validate webhook response schema
   */
  private validateWebhookResponse(response: any): boolean {
    if (!response || typeof response !== 'object') {
      return false
    }

    // Check required fields
    if (typeof response.agentId !== 'string') return false
    if (typeof response.score !== 'number') return false
    if (typeof response.dataPoints !== 'number') return false
    if (typeof response.timestamp !== 'string') return false

    // Validate score range
    if (this.scoreScale === 'percentage') {
      if (response.score < 0 || response.score > 100) return false
    } else {
      if (response.score < 0 || response.score > 1000) return false
    }

    // Validate data points
    if (response.dataPoints < 0) return false

    return true
  }

  /**
   * Validate timestamp to prevent replay attacks
   * Rejects timestamps older than 5 minutes
   */
  private validateTimestamp(timestamp: string): void {
    const responseTime = new Date(timestamp).getTime()
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes

    if (Math.abs(now - responseTime) > maxAge) {
      throw new Error('Webhook response timestamp too old (possible replay attack)')
    }
  }

  /**
   * Enforce rate limiting
   */
  private enforceRateLimit(): void {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      throw new Error('Rate limit exceeded for webhook source')
    }

    this.lastRequestTime = now
  }

  /**
   * Validate webhook data
   *
   * @param data - Data to validate
   * @returns True if valid
   */
  validateData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false
    }

    const response = data.rawData as WebhookReputationResponse
    return this.validateWebhookResponse(response)
  }

  /**
   * Normalize score to 0-1000 scale
   *
   * @param rawScore - Raw score from webhook
   * @returns Normalized score (0-1000)
   */
  normalizeScore(rawScore: number): number {
    let normalized: number

    if (this.scoreScale === 'percentage') {
      // Convert 0-100 to 0-1000
      normalized = rawScore * 10
    } else {
      // Already 0-1000
      normalized = rawScore
    }

    return this.clampScore(normalized)
  }

  /**
   * Calculate reliability based on data quality
   *
   * Custom webhooks have low base reliability (0.5) as they're untrusted
   * Reliability increases with more data points
   *
   * @param response - Webhook response
   * @returns Reliability (0-1)
   */
  calculateReliability(response: WebhookReputationResponse): number {
    let reliability = 0.5 // Base reliability for custom webhooks

    // Increase reliability with more data points
    if (response.dataPoints >= 100) {
      reliability = 0.7
    } else if (response.dataPoints >= 50) {
      reliability = 0.6
    } else if (response.dataPoints >= 20) {
      reliability = 0.55
    }

    // Reduce reliability if timestamp is old
    const age = Date.now() - new Date(response.timestamp).getTime()
    const oneDay = 24 * 60 * 60 * 1000

    if (age > oneDay * 7) {
      // Data older than 7 days
      reliability *= 0.8
    }

    return reliability
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
