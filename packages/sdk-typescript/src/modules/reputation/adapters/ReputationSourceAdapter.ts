/**
 * Reputation Source Adapter Interface
 *
 * Base interface for all reputation data sources (PayAI, GitHub, custom webhooks, etc.)
 * Each adapter normalizes external data to a standard format for aggregation.
 */

import type { Address } from '@solana/addresses'

/**
 * Supported reputation sources
 */
export enum ReputationSource {
  PayAI = 'payai',
  DirectSolana = 'direct-solana',
  GitHub = 'github',
  Twitter = 'twitter',
  CustomWebhook = 'custom-webhook',
  OnChainHistory = 'onchain-history',
}

/**
 * Configuration for a reputation source
 */
export interface ReputationSourceConfig {
  /** Source identifier */
  source: ReputationSource
  /** Weight in basis points (0-10000) */
  weight: number
  /** Reliability score in basis points (0-10000) */
  reliability: number
  /** Source-specific configuration (API keys, URLs, etc.) */
  config: Record<string, any>
  /** Whether this source is enabled */
  enabled: boolean
}

/**
 * Normalized reputation data from a source
 */
export interface SourceReputationData {
  /** Source identifier */
  source: ReputationSource
  /** Reputation score (0-1000) */
  score: number
  /** Number of data points contributing to score */
  dataPoints: number
  /** Reliability of this data (0-1) */
  reliability: number
  /** Raw data from source (for debugging/audit) */
  rawData: any
  /** Timestamp when data was fetched */
  timestamp: Date
}

/**
 * Base interface for reputation source adapters
 */
export interface ReputationSourceAdapter {
  /** Source identifier */
  readonly source: ReputationSource

  /**
   * Fetch reputation data for an agent
   *
   * @param agentId - Agent identifier (public key or external ID)
   * @returns Normalized reputation data
   */
  fetchReputationData(agentId: string): Promise<SourceReputationData>

  /**
   * Validate raw data from source
   *
   * @param data - Raw data to validate
   * @returns True if data is valid
   */
  validateData(data: any): boolean

  /**
   * Normalize raw score to 0-1000 scale
   *
   * @param rawScore - Raw score from source
   * @returns Normalized score (0-1000)
   */
  normalizeScore(rawScore: any): number

  /**
   * Calculate reliability score for this data point
   *
   * @param data - Source data
   * @returns Reliability (0-1)
   */
  calculateReliability(data: any): number
}

/**
 * Abstract base class for reputation adapters
 */
export abstract class BaseReputationAdapter implements ReputationSourceAdapter {
  protected config: ReputationSourceConfig

  constructor(config: ReputationSourceConfig) {
    this.config = config
  }

  abstract get source(): ReputationSource
  abstract fetchReputationData(agentId: string): Promise<SourceReputationData>
  abstract validateData(data: any): boolean
  abstract normalizeScore(rawScore: any): number

  /**
   * Default reliability calculation uses configured reliability
   */
  calculateReliability(_data: any): number {
    return this.config.reliability / 10000 // Convert basis points to 0-1
  }

  /**
   * Check if adapter is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Get adapter weight in basis points
   */
  getWeight(): number {
    return this.config.weight
  }

  /**
   * Validate score is in valid range (0-1000)
   */
  protected validateScoreRange(score: number): boolean {
    return score >= 0 && score <= 1000
  }

  /**
   * Clamp score to valid range
   */
  protected clampScore(score: number): number {
    return Math.max(0, Math.min(1000, score))
  }
}
