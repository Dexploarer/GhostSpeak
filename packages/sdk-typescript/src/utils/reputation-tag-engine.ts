/**
 * Reputation Tag Engine
 *
 * Automatically assigns and manages reputation tags based on agent metrics.
 * Implements confidence scoring, evidence tracking, and tag decay mechanisms.
 *
 * Features:
 * - Auto-tagging based on performance metrics
 * - Confidence calculation with evidence counting
 * - Time-based tag decay (stale tags after 90 days)
 * - Tag validation and limits enforcement
 */

import {
  type TagScore,
  type TagCriteria,
  type TagEvaluation,
  type ReputationMetrics,
  type TagFilters,
  type TagUpdateRequest,
  type BulkTagUpdateRequest,
  type TagQueryResult,
  type TagDecayConfig,
  TagCategory,
  SkillTag,
  BehaviorTag,
  ComplianceTag,
  TAG_CONSTANTS,
  DEFAULT_TAG_DECAY,
  TagConfidenceLevel,
} from '../types/reputation-tags.js'

/**
 * Reputation Tag Engine
 *
 * Core engine for automatic tag assignment and management
 */
export class ReputationTagEngine {
  private tagCriteria: TagCriteria[] = []
  private decayConfig: TagDecayConfig

  constructor(decayConfig: TagDecayConfig = DEFAULT_TAG_DECAY) {
    this.decayConfig = decayConfig
    this.initializeTagCriteria()
  }

  /**
   * Initialize all tag assignment criteria
   */
  private initializeTagCriteria(): void {
    this.tagCriteria = [
      // ========================================
      // BEHAVIOR TAGS
      // ========================================

      // Fast Responder: avg response time < 60s
      {
        tag: BehaviorTag.FastResponder,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          if (metrics.responseTimeCount === 0n) {
            return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
          }

          const avgResponseTime = metrics.avgResponseTime
          const evidenceCount = Number(metrics.responseTimeCount)

          if (avgResponseTime < 60000) {
            // < 60 seconds
            const confidence = Math.min(
              10000,
              10000 - Math.floor((avgResponseTime / 60000) * 2000)
            ) // 100% at 0s, 80% at 60s
            return {
              shouldAssign: true,
              confidence,
              evidenceCount,
              reason: `Average response time ${avgResponseTime}ms`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount }
        },
      },

      // Quick Responder: avg < 5 minutes
      {
        tag: BehaviorTag.QuickResponder,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          if (metrics.responseTimeCount === 0n) {
            return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
          }

          const avgResponseTime = metrics.avgResponseTime
          const evidenceCount = Number(metrics.responseTimeCount)

          if (avgResponseTime < 300000) {
            // < 5 minutes
            const confidence = Math.min(
              10000,
              10000 - Math.floor((avgResponseTime / 300000) * 3000)
            )
            return {
              shouldAssign: true,
              confidence,
              evidenceCount,
              reason: `Average response time ${avgResponseTime}ms`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount }
        },
      },

      // Dispute Free: 0 disputes in last 90 days
      {
        tag: BehaviorTag.DisputeFree,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          const totalPayments = Number(metrics.successfulPayments + metrics.failedPayments)

          if (totalPayments < 10) {
            return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
          }

          if (metrics.totalDisputes === 0) {
            const confidence = Math.min(10000, 7000 + totalPayments * 10) // Scale with volume
            return {
              shouldAssign: true,
              confidence,
              evidenceCount: totalPayments,
              reason: `0 disputes over ${totalPayments} transactions`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount: totalPayments }
        },
      },

      // Low Dispute: <1% dispute rate
      {
        tag: BehaviorTag.LowDispute,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          const totalPayments = Number(metrics.successfulPayments + metrics.failedPayments)

          if (totalPayments < 100) {
            return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
          }

          const disputeRate = (metrics.totalDisputes / totalPayments) * 100

          if (disputeRate < 1) {
            const confidence = Math.min(
              10000,
              10000 - Math.floor(disputeRate * 1000)
            )
            return {
              shouldAssign: true,
              confidence,
              evidenceCount: totalPayments,
              reason: `${disputeRate.toFixed(2)}% dispute rate`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount: totalPayments }
        },
      },

      // High Volume: >1000 transactions
      {
        tag: BehaviorTag.HighVolume,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          const totalPayments = Number(metrics.successfulPayments)

          if (totalPayments >= 1000) {
            const confidence = Math.min(10000, 6000 + Math.floor(totalPayments / 100))
            return {
              shouldAssign: true,
              confidence,
              evidenceCount: totalPayments,
              reason: `${totalPayments} successful transactions`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount: totalPayments }
        },
      },

      // Very High Volume: >10000 transactions
      {
        tag: BehaviorTag.VeryHighVolume,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          const totalPayments = Number(metrics.successfulPayments)

          if (totalPayments >= 10000) {
            const confidence = Math.min(10000, 8000 + Math.floor(totalPayments / 1000))
            return {
              shouldAssign: true,
              confidence,
              evidenceCount: totalPayments,
              reason: `${totalPayments} successful transactions`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount: totalPayments }
        },
      },

      // Top Rated: avg rating > 4.8
      {
        tag: BehaviorTag.TopRated,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          if (metrics.totalRatingsCount < 10) {
            return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
          }

          const avgRating = metrics.avgRating / 20 // Convert 0-100 scale to 0-5
          const evidenceCount = metrics.totalRatingsCount

          if (avgRating > 4.8) {
            const confidence = Math.min(
              10000,
              Math.floor((avgRating - 4.8) * 50000) + 8000
            )
            return {
              shouldAssign: true,
              confidence,
              evidenceCount,
              reason: `Average rating ${avgRating.toFixed(2)}/5.0`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount }
        },
      },

      // High Quality: avg rating > 4.5
      {
        tag: BehaviorTag.HighQuality,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          if (metrics.totalRatingsCount < 5) {
            return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
          }

          const avgRating = metrics.avgRating / 20 // Convert to 0-5 scale
          const evidenceCount = metrics.totalRatingsCount

          if (avgRating > 4.5) {
            const confidence = Math.min(
              10000,
              Math.floor((avgRating - 4.5) * 20000) + 7000
            )
            return {
              shouldAssign: true,
              confidence,
              evidenceCount,
              reason: `Average rating ${avgRating.toFixed(2)}/5.0`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount }
        },
      },

      // Consistent Quality: low variance in ratings
      {
        tag: BehaviorTag.ConsistentQuality,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          if (metrics.totalRatingsCount < 20) {
            return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
          }

          const avgRating = metrics.avgRating / 20
          const evidenceCount = metrics.totalRatingsCount

          // Assume consistency if high average (actual variance calculation would require more data)
          if (avgRating > 4.3) {
            const confidence = Math.min(
              10000,
              Math.floor((avgRating - 4.0) * 10000) + 5000
            )
            return {
              shouldAssign: true,
              confidence,
              evidenceCount,
              reason: `Consistent high ratings (${avgRating.toFixed(2)}/5.0)`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount }
        },
      },

      // Perfect Record: 100% success rate
      {
        tag: BehaviorTag.PerfectRecord,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          const totalPayments = Number(metrics.successfulPayments + metrics.failedPayments)

          if (totalPayments < 50) {
            return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
          }

          const successRate = metrics.successRate / 100 // Convert basis points to percentage

          if (successRate === 100 && metrics.failedPayments === 0n) {
            const confidence = Math.min(10000, 8000 + Math.floor(totalPayments / 10))
            return {
              shouldAssign: true,
              confidence,
              evidenceCount: totalPayments,
              reason: `100% success rate over ${totalPayments} transactions`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount: totalPayments }
        },
      },

      // High Resolution: >90% disputes resolved favorably
      {
        tag: BehaviorTag.HighResolution,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          if (metrics.totalDisputes < 5) {
            return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
          }

          const resolutionRate = (metrics.disputesResolved / metrics.totalDisputes) * 100
          const evidenceCount = metrics.totalDisputes

          if (resolutionRate > 90) {
            const confidence = Math.min(
              10000,
              Math.floor((resolutionRate - 90) * 1000) + 8000
            )
            return {
              shouldAssign: true,
              confidence,
              evidenceCount,
              reason: `${resolutionRate.toFixed(1)}% disputes resolved favorably`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount }
        },
      },

      // Long Term Active: active >1 year
      {
        tag: BehaviorTag.LongTermActive,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          const currentTime = Math.floor(Date.now() / 1000)
          const ageSeconds = currentTime - metrics.createdAt
          const ageYears = ageSeconds / (365 * 24 * 60 * 60)

          if (ageYears >= 1) {
            const confidence = Math.min(10000, Math.floor(ageYears * 2000) + 6000)
            return {
              shouldAssign: true,
              confidence,
              evidenceCount: Math.floor(ageYears),
              reason: `Active for ${ageYears.toFixed(1)} years`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
        },
      },

      // Multi-Year: active >3 years
      {
        tag: BehaviorTag.MultiYear,
        category: TagCategory.Behavior,
        minConfidence: TAG_CONSTANTS.MIN_TAG_CONFIDENCE,
        evaluate: (metrics: ReputationMetrics): TagEvaluation => {
          const currentTime = Math.floor(Date.now() / 1000)
          const ageSeconds = currentTime - metrics.createdAt
          const ageYears = ageSeconds / (365 * 24 * 60 * 60)

          if (ageYears >= 3) {
            const confidence = Math.min(10000, Math.floor(ageYears * 1000) + 7000)
            return {
              shouldAssign: true,
              confidence,
              evidenceCount: Math.floor(ageYears),
              reason: `Active for ${ageYears.toFixed(1)} years`,
            }
          }

          return { shouldAssign: false, confidence: 0, evidenceCount: 0 }
        },
      },
    ]
  }

  /**
   * Calculate tags for an agent based on their metrics
   */
  async calculateTags(metrics: ReputationMetrics): Promise<TagScore[]> {
    const tagScores: TagScore[] = []
    const currentTime = Math.floor(Date.now() / 1000)

    // Evaluate all tag criteria
    for (const criteria of this.tagCriteria) {
      const evaluation = criteria.evaluate(metrics)

      if (evaluation.shouldAssign && evaluation.confidence >= criteria.minConfidence) {
        tagScores.push({
          tagName: criteria.tag,
          confidence: evaluation.confidence,
          evidenceCount: evaluation.evidenceCount,
          lastUpdated: currentTime,
        })
      }
    }

    return tagScores
  }

  /**
   * Apply decay to existing tags based on age
   */
  applyTagDecay(tagScores: TagScore[], currentTimestamp?: number): TagScore[] {
    const now = currentTimestamp || Math.floor(Date.now() / 1000)
    const decayedTags: TagScore[] = []

    for (const tag of tagScores) {
      const ageSeconds = now - tag.lastUpdated
      const ageDays = ageSeconds / (24 * 60 * 60)

      // Calculate decay
      const totalDecay = Math.floor(ageDays * this.decayConfig.decayRatePerDay)
      const newConfidence = Math.max(0, tag.confidence - totalDecay)

      // Keep tag if above minimum confidence and not too old
      if (
        newConfidence >= this.decayConfig.minConfidence &&
        ageSeconds <= this.decayConfig.maxAgeSeconds
      ) {
        decayedTags.push({
          ...tag,
          confidence: newConfidence,
        })
      }
    }

    return decayedTags
  }

  /**
   * Merge new tags with existing tags, updating confidence scores
   */
  mergeTags(existingTags: TagScore[], newTags: TagScore[]): TagScore[] {
    const tagMap = new Map<string, TagScore>()

    // Add existing tags
    for (const tag of existingTags) {
      tagMap.set(tag.tagName, tag)
    }

    // Update or add new tags
    for (const tag of newTags) {
      const existing = tagMap.get(tag.tagName)

      if (existing) {
        // Update if new tag has higher confidence or more evidence
        if (
          tag.confidence > existing.confidence ||
          tag.evidenceCount > existing.evidenceCount
        ) {
          tagMap.set(tag.tagName, tag)
        }
      } else {
        tagMap.set(tag.tagName, tag)
      }
    }

    return Array.from(tagMap.values())
  }

  /**
   * Filter tags based on criteria
   */
  filterTags(tags: TagScore[], filters: TagFilters): TagScore[] {
    let filtered = [...tags]
    const currentTime = Math.floor(Date.now() / 1000)

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter((tag) => this.getTagCategory(tag.tagName) === filters.category)
    }

    // Filter by minimum confidence
    if (filters.minConfidence !== undefined) {
      filtered = filtered.filter((tag) => tag.confidence >= filters.minConfidence!)
    }

    // Filter by age
    if (filters.maxAge !== undefined) {
      filtered = filtered.filter((tag) => {
        const age = currentTime - tag.lastUpdated
        return age <= filters.maxAge!
      })
    }

    // Filter by active status
    if (filters.activeOnly) {
      filtered = filtered.filter((tag) => {
        const age = currentTime - tag.lastUpdated
        return (
          age <= TAG_CONSTANTS.STALE_TAG_THRESHOLD &&
          tag.confidence >= this.decayConfig.minConfidence
        )
      })
    }

    return filtered
  }

  /**
   * Get category for a tag
   */
  private getTagCategory(tagName: string): TagCategory {
    if (Object.values(SkillTag).includes(tagName as SkillTag)) {
      return TagCategory.Skill
    } else if (Object.values(BehaviorTag).includes(tagName as BehaviorTag)) {
      return TagCategory.Behavior
    } else if (Object.values(ComplianceTag).includes(tagName as ComplianceTag)) {
      return TagCategory.Compliance
    }
    return TagCategory.Behavior // Default
  }

  /**
   * Validate tag name length
   */
  validateTagName(tagName: string): boolean {
    return tagName.length > 0 && tagName.length <= TAG_CONSTANTS.MAX_TAG_NAME_LENGTH
  }

  /**
   * Validate confidence score
   */
  validateConfidence(confidence: number): boolean {
    return confidence >= 0 && confidence <= TAG_CONSTANTS.MAX_TAG_CONFIDENCE
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(confidence: number): string {
    if (confidence >= TagConfidenceLevel.Absolute) return 'Absolute'
    if (confidence >= TagConfidenceLevel.VeryHigh) return 'Very High'
    if (confidence >= TagConfidenceLevel.High) return 'High'
    if (confidence >= TagConfidenceLevel.Medium) return 'Medium'
    if (confidence >= TagConfidenceLevel.Low) return 'Low'
    return 'Very Low'
  }

  /**
   * Sort tags by confidence (descending)
   */
  sortByConfidence(tags: TagScore[]): TagScore[] {
    return [...tags].sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Sort tags by evidence count (descending)
   */
  sortByEvidence(tags: TagScore[]): TagScore[] {
    return [...tags].sort((a, b) => b.evidenceCount - a.evidenceCount)
  }

  /**
   * Sort tags by last updated (most recent first)
   */
  sortByRecent(tags: TagScore[]): TagScore[] {
    return [...tags].sort((a, b) => b.lastUpdated - a.lastUpdated)
  }

  /**
   * Get top N tags by confidence
   */
  getTopTags(tags: TagScore[], count: number): TagScore[] {
    return this.sortByConfidence(tags).slice(0, count)
  }

  /**
   * Categorize tags by type
   */
  categorizeTags(tags: TagScore[]): TagQueryResult {
    const skillTags: string[] = []
    const behaviorTags: string[] = []
    const complianceTags: string[] = []
    const allTags: string[] = []

    for (const tag of tags) {
      allTags.push(tag.tagName)
      const category = this.getTagCategory(tag.tagName)

      switch (category) {
        case TagCategory.Skill:
          skillTags.push(tag.tagName)
          break
        case TagCategory.Behavior:
          behaviorTags.push(tag.tagName)
          break
        case TagCategory.Compliance:
          complianceTags.push(tag.tagName)
          break
      }
    }

    return {
      allTags,
      skillTags,
      behaviorTags,
      complianceTags,
      tagScores: tags,
      lastUpdated: tags.length > 0 ? Math.max(...tags.map((t) => t.lastUpdated)) : 0,
    }
  }
}
