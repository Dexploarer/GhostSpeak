/**
 * PayAI Reputation Adapter
 *
 * Fetches reputation data from PayAI payment network.
 * This is the primary reputation source with highest reliability (1.0).
 */

import type { Address } from '@solana/addresses'
import {
  BaseReputationAdapter,
  ReputationSource,
  type SourceReputationData,
  type ReputationSourceConfig,
} from './ReputationSourceAdapter.js'

/**
 * PayAI reputation record from webhook/API
 */
export interface PayAIReputationRecord {
  agentAddress: Address | string
  paymentSignature: string
  amount: bigint
  success: boolean
  responseTimeMs: number
  payerAddress: string
  timestamp: Date
  network: string
}

/**
 * PayAI aggregate metrics
 */
export interface PayAIMetrics {
  totalPayments: number
  successfulPayments: number
  failedPayments: number
  averageResponseTime: number
  totalVolume: bigint
  averageRating: number
  totalRatings: number
}

/**
 * PayAI adapter for reputation scoring
 */
export class PayAIAdapter extends BaseReputationAdapter {
  private apiEndpoint: string
  private apiKey?: string

  constructor(config: ReputationSourceConfig) {
    super(config)
    this.apiEndpoint = config.config.apiEndpoint || 'https://api.payai.network'
    this.apiKey = config.config.apiKey
  }

  get source(): ReputationSource {
    return ReputationSource.PayAI
  }

  /**
   * Fetch reputation data from PayAI
   *
   * @param agentId - Agent address
   * @returns Normalized reputation data
   */
  async fetchReputationData(agentId: string): Promise<SourceReputationData> {
    // Fetch metrics from PayAI API
    const metrics = await this.fetchPayAIMetrics(agentId)

    // Calculate score from metrics
    const score = this.calculateScore(metrics)

    // Normalize to 0-1000
    const normalizedScore = this.normalizeScore(score)

    return {
      source: this.source,
      score: normalizedScore,
      dataPoints: metrics.totalPayments,
      reliability: 1.0, // PayAI is primary source with highest reliability
      rawData: metrics,
      timestamp: new Date(),
    }
  }

  /**
   * Fetch metrics from PayAI API
   *
   * @param agentId - Agent address
   * @returns PayAI metrics
   */
  private async fetchPayAIMetrics(agentId: string): Promise<PayAIMetrics> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(`${this.apiEndpoint}/v1/agents/${agentId}/metrics`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`PayAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return this.parseMetrics(data)
  }

  /**
   * Parse metrics from API response
   */
  private parseMetrics(data: any): PayAIMetrics {
    return {
      totalPayments: Number(data.total_payments || 0),
      successfulPayments: Number(data.successful_payments || 0),
      failedPayments: Number(data.failed_payments || 0),
      averageResponseTime: Number(data.average_response_time || 0),
      totalVolume: BigInt(data.total_volume || 0),
      averageRating: Number(data.average_rating || 0),
      totalRatings: Number(data.total_ratings || 0),
    }
  }

  /**
   * Calculate reputation score from PayAI metrics
   *
   * Scoring factors:
   * - Success rate: 40%
   * - Response time: 25%
   * - Volume: 20%
   * - Average rating: 15%
   *
   * @param metrics - PayAI metrics
   * @returns Raw score (0-100)
   */
  private calculateScore(metrics: PayAIMetrics): number {
    if (metrics.totalPayments === 0) {
      return 50 // Neutral score for new agents
    }

    // 1. Success rate (40%)
    const successRate = metrics.successfulPayments / metrics.totalPayments
    const successScore = successRate * 40

    // 2. Response time (25%)
    // Fast: <500ms = 25 pts, Average: 500-2000ms = 15-20 pts, Slow: >2000ms = 0-15 pts
    let responseScore = 0
    if (metrics.averageResponseTime <= 500) {
      responseScore = 25
    } else if (metrics.averageResponseTime <= 2000) {
      responseScore = 25 - ((metrics.averageResponseTime - 500) / 1500) * 10
    } else if (metrics.averageResponseTime <= 10000) {
      responseScore = 15 - ((metrics.averageResponseTime - 2000) / 8000) * 15
    }

    // 3. Volume score (20%)
    // Logarithmic scaling: 1+ payments = 5 pts, 10+ = 10 pts, 100+ = 15 pts, 1000+ = 20 pts
    let volumeScore = 0
    if (metrics.totalPayments >= 1000) {
      volumeScore = 20
    } else if (metrics.totalPayments >= 100) {
      volumeScore = 15
    } else if (metrics.totalPayments >= 10) {
      volumeScore = 10
    } else {
      volumeScore = 5
    }

    // 4. Average rating (15%)
    // 5-star scale to 15 pts
    const ratingScore = metrics.totalRatings > 0 ? (metrics.averageRating / 5) * 15 : 7.5

    return successScore + responseScore + volumeScore + ratingScore
  }

  /**
   * Validate PayAI data
   *
   * @param data - Data to validate
   * @returns True if valid
   */
  validateData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false
    }

    const metrics = data.rawData as PayAIMetrics
    if (!metrics) {
      return false
    }

    // Check required fields
    if (typeof metrics.totalPayments !== 'number') return false
    if (typeof metrics.successfulPayments !== 'number') return false
    if (typeof metrics.failedPayments !== 'number') return false

    // Validate data consistency
    if (metrics.successfulPayments + metrics.failedPayments !== metrics.totalPayments) {
      return false
    }

    return true
  }

  /**
   * Normalize score to 0-1000 scale
   *
   * @param rawScore - Raw score (0-100)
   * @returns Normalized score (0-1000)
   */
  normalizeScore(rawScore: number): number {
    // Convert 0-100 to 0-1000
    const normalized = rawScore * 10
    return this.clampScore(normalized)
  }

  /**
   * Calculate reliability based on data quality
   *
   * PayAI has highest reliability (1.0) as it's the primary source
   *
   * @param data - Source data
   * @returns Reliability (0-1)
   */
  calculateReliability(data: any): number {
    const metrics = data.rawData as PayAIMetrics

    // Reduce reliability if very few data points
    if (metrics.totalPayments < 5) {
      return 0.7
    }

    if (metrics.totalPayments < 20) {
      return 0.85
    }

    return 1.0 // Full reliability with sufficient data
  }
}
