/**
 * Multi-Source Reputation Aggregator
 *
 * Aggregates reputation data from multiple sources (PayAI, GitHub, custom webhooks)
 * with weighted scoring, conflict detection, and reliability-based adjustments.
 *
 * Based on MUSCLE multi-source oracle pattern with reputation-based source selection.
 */

import type { Address } from '@solana/addresses'
import type {
  ReputationSource,
  ReputationSourceAdapter,
  ReputationSourceConfig,
  SourceReputationData,
} from './adapters/ReputationSourceAdapter.js'

/**
 * Aggregated reputation result
 */
export interface AggregatedReputation {
  /** Agent address */
  agentId: Address | string
  /** Weighted aggregate score (0-1000) */
  aggregateScore: number
  /** Individual source scores */
  sourceScores: SourceScoreBreakdown[]
  /** Whether conflicts were detected */
  hasConflicts: boolean
  /** Conflict descriptions */
  conflicts: string[]
  /** Total number of data points across all sources */
  totalDataPoints: number
  /** Timestamp of aggregation */
  timestamp: Date
}

/**
 * Individual source score breakdown
 */
export interface SourceScoreBreakdown {
  /** Source identifier */
  source: ReputationSource
  /** Raw score from source (0-1000) */
  score: number
  /** Source weight (0-10000 basis points) */
  weight: number
  /** Source reliability (0-10000 basis points) */
  reliability: number
  /** Number of data points */
  dataPoints: number
  /** Weighted contribution to final score */
  contribution: number
  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Multi-source reputation aggregator
 */
export class MultiSourceAggregator {
  private adapters: Map<ReputationSource, ReputationSourceAdapter> = new Map()
  private configs: Map<ReputationSource, ReputationSourceConfig> = new Map()

  /** Conflict threshold (30% variance) */
  private readonly CONFLICT_THRESHOLD = 300 // 30% of 1000 scale

  /**
   * Create a new multi-source aggregator
   */
  constructor() {
    // Initialize empty - sources are added via addSource()
  }

  /**
   * Add a reputation source
   *
   * @param adapter - Reputation source adapter
   * @param config - Source configuration
   */
  addSource(adapter: ReputationSourceAdapter, config: ReputationSourceConfig): void {
    if (!config.enabled) {
      return
    }

    this.adapters.set(adapter.source, adapter)
    this.configs.set(adapter.source, config)
  }

  /**
   * Remove a reputation source
   *
   * @param source - Source to remove
   */
  removeSource(source: ReputationSource): void {
    this.adapters.delete(source)
    this.configs.delete(source)
  }

  /**
   * Update source weight
   *
   * @param source - Source to update
   * @param weight - New weight in basis points (0-10000)
   */
  updateSourceWeight(source: ReputationSource, weight: number): void {
    const config = this.configs.get(source)
    if (config) {
      config.weight = weight
    }
  }

  /**
   * Update source reliability
   *
   * @param source - Source to update
   * @param reliability - New reliability in basis points (0-10000)
   */
  updateSourceReliability(source: ReputationSource, reliability: number): void {
    const config = this.configs.get(source)
    if (config) {
      config.reliability = reliability
    }
  }

  /**
   * Aggregate reputation from all sources
   *
   * @param agentId - Agent identifier
   * @returns Aggregated reputation data
   */
  async aggregateReputation(agentId: Address | string): Promise<AggregatedReputation> {
    const sourceDataList: SourceReputationData[] = []

    // Fetch data from all enabled sources
    for (const [source, adapter] of this.adapters.entries()) {
      try {
        const data = await adapter.fetchReputationData(agentId.toString())
        if (adapter.validateData(data)) {
          sourceDataList.push(data)
        }
      } catch (error) {
        console.warn(`Failed to fetch reputation from ${source}:`, error)
        // Continue with other sources on error (graceful degradation)
      }
    }

    // Calculate weighted aggregate score
    const aggregateScore = this.calculateWeightedScore(sourceDataList)

    // Detect conflicts
    const { hasConflicts, conflicts } = this.detectConflicts(sourceDataList)

    // Build source breakdowns
    const sourceScores = this.buildSourceBreakdowns(sourceDataList)

    // Calculate total data points
    const totalDataPoints = sourceDataList.reduce((sum, data) => sum + data.dataPoints, 0)

    return {
      agentId,
      aggregateScore,
      sourceScores,
      hasConflicts,
      conflicts,
      totalDataPoints,
      timestamp: new Date(),
    }
  }

  /**
   * Calculate weighted aggregate score
   *
   * Formula: Σ(score × weight × reliability) / Σ(weight × reliability)
   *
   * @param sourceDataList - Data from all sources
   * @returns Weighted aggregate score (0-1000)
   */
  calculateWeightedScore(sourceDataList: SourceReputationData[]): number {
    if (sourceDataList.length === 0) {
      return 0
    }

    let totalContribution = 0
    let totalNormalization = 0

    for (const data of sourceDataList) {
      const config = this.configs.get(data.source)
      if (!config) continue

      const weight = config.weight / 10000 // Convert to 0-1
      const reliability = data.reliability // Already 0-1

      const contribution = data.score * weight * reliability
      const normalization = weight * reliability

      totalContribution += contribution
      totalNormalization += normalization
    }

    if (totalNormalization === 0) {
      return 0
    }

    return Math.round(totalContribution / totalNormalization)
  }

  /**
   * Detect conflicts between sources
   *
   * Flags conflicts if max_score - min_score > 30%
   *
   * @param sourceDataList - Data from all sources
   * @returns Conflict detection result
   */
  detectConflicts(sourceDataList: SourceReputationData[]): {
    hasConflicts: boolean
    conflicts: string[]
  } {
    if (sourceDataList.length < 2) {
      return { hasConflicts: false, conflicts: [] }
    }

    const scores = sourceDataList.map((d) => d.score)
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    const variance = maxScore - minScore

    const conflicts: string[] = []

    if (variance > this.CONFLICT_THRESHOLD) {
      const maxSource = sourceDataList.find((d) => d.score === maxScore)?.source
      const minSource = sourceDataList.find((d) => d.score === minScore)?.source

      conflicts.push(
        `High variance detected: ${variance} (${((variance / 1000) * 100).toFixed(1)}%) ` +
          `between ${maxSource} (${maxScore}) and ${minSource} (${minScore})`
      )

      return { hasConflicts: true, conflicts }
    }

    return { hasConflicts: false, conflicts: [] }
  }

  /**
   * Build source score breakdowns
   *
   * @param sourceDataList - Data from all sources
   * @returns Source score breakdowns
   */
  private buildSourceBreakdowns(sourceDataList: SourceReputationData[]): SourceScoreBreakdown[] {
    return sourceDataList.map((data) => {
      const config = this.configs.get(data.source)
      if (!config) {
        throw new Error(`No config found for source: ${data.source}`)
      }

      const weight = config.weight
      const reliability = data.reliability * 10000 // Convert to basis points

      // Calculate weighted contribution
      const contribution =
        (data.score * (weight / 10000) * (reliability / 10000)) /
        this.calculateNormalizationFactor(sourceDataList)

      return {
        source: data.source,
        score: data.score,
        weight,
        reliability: Math.round(reliability),
        dataPoints: data.dataPoints,
        contribution: Math.round(contribution),
        lastUpdated: data.timestamp,
      }
    })
  }

  /**
   * Calculate normalization factor for weighted scoring
   */
  private calculateNormalizationFactor(sourceDataList: SourceReputationData[]): number {
    let total = 0

    for (const data of sourceDataList) {
      const config = this.configs.get(data.source)
      if (!config) continue

      const weight = config.weight / 10000
      const reliability = data.reliability

      total += weight * reliability
    }

    return total || 1 // Avoid division by zero
  }

  /**
   * Get detailed source breakdown for an agent
   *
   * @param agentId - Agent identifier
   * @returns Source breakdowns with full details
   */
  async getSourceBreakdown(agentId: Address | string): Promise<SourceScoreBreakdown[]> {
    const result = await this.aggregateReputation(agentId)
    return result.sourceScores
  }

  /**
   * Get list of registered sources
   */
  getRegisteredSources(): ReputationSource[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * Get source configuration
   *
   * @param source - Source identifier
   * @returns Source configuration or undefined
   */
  getSourceConfig(source: ReputationSource): ReputationSourceConfig | undefined {
    return this.configs.get(source)
  }

  /**
   * Enable a source
   *
   * @param source - Source to enable
   */
  enableSource(source: ReputationSource): void {
    const config = this.configs.get(source)
    if (config) {
      config.enabled = true
    }
  }

  /**
   * Disable a source
   *
   * @param source - Source to disable
   */
  disableSource(source: ReputationSource): void {
    const config = this.configs.get(source)
    if (config) {
      config.enabled = false
    }
  }

  /**
   * Check if source is enabled
   *
   * @param source - Source to check
   * @returns True if enabled
   */
  isSourceEnabled(source: ReputationSource): boolean {
    const config = this.configs.get(source)
    return config?.enabled ?? false
  }
}
