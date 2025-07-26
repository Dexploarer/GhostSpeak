import {
  type ReputationData,
  type JobPerformance,
  type ReputationCalculationResult,
  type ReputationFactors,
  type CategoryReputation,
  type PerformanceSnapshot,
  type FraudPattern,
  ReputationTier,
  BadgeType,
  REPUTATION_CONSTANTS
} from '../types/reputation-types'

/**
 * Advanced reputation calculation engine
 */
export class ReputationCalculator {
  private fraudPatterns: FraudPattern[] = []

  constructor() {
    this.initializeFraudPatterns()
  }

  /**
   * Initialize fraud detection patterns
   */
  private initializeFraudPatterns(): void {
    this.fraudPatterns = [
      {
        patternId: 'sudden_spike',
        description: 'Sudden spike in reputation without corresponding activity',
        riskScore: 80,
        detect: (data: ReputationData) => {
          if (data.performanceHistory.length < 2) return false
          const recent = data.performanceHistory[data.performanceHistory.length - 1]
          const previous = data.performanceHistory[data.performanceHistory.length - 2]
          const spike = recent.score - previous.score
          return spike > 2000 && recent.jobsCompleted === previous.jobsCompleted
        }
      },
      {
        patternId: 'perfect_scores_only',
        description: 'All jobs have perfect scores (potential manipulation)',
        riskScore: 60,
        detect: (data: ReputationData) => {
          const recentJobs = data.performanceHistory.slice(-10)
          return recentJobs.length >= 5 && recentJobs.every(job => job.avgQuality === 100)
        }
      },
      {
        patternId: 'rapid_category_switching',
        description: 'Rapid switching between unrelated categories',
        riskScore: 40,
        detect: (data: ReputationData) => {
          if (data.categoryReputations.length < 5) return false
          const recentCategories = data.categoryReputations
            .sort((a, b) => b.lastActivity - a.lastActivity)
            .slice(0, 5)
          const daysSinceOldest = (Date.now() - recentCategories[4].lastActivity) / (1000 * 60 * 60 * 24)
          return daysSinceOldest < 7 // 5 different categories in 7 days
        }
      },
      {
        patternId: 'dispute_pattern',
        description: 'High dispute rate with suspicious resolution pattern',
        riskScore: 70,
        detect: (data: ReputationData) => {
          if (data.totalJobsCompleted < 10) return false
          const disputeRate = data.disputesAgainst / data.totalJobsCompleted
          const resolutionRate = data.disputesResolved / Math.max(1, data.disputesAgainst)
          return disputeRate > 0.3 && resolutionRate > 0.9 // High disputes but almost all resolved favorably
        }
      },
      {
        patternId: 'time_manipulation',
        description: 'Completion times significantly below expected',
        riskScore: 50,
        detect: (data: ReputationData, job: JobPerformance) => {
          return job.actualDuration < job.expectedDuration * 0.1 // Less than 10% of expected time
        }
      }
    ]
  }

  /**
   * Calculate reputation update based on job performance
   */
  calculateReputation(
    currentData: ReputationData,
    jobPerformance: JobPerformance
  ): ReputationCalculationResult {
    // Apply time decay first
    const decayedData = this.applyTimeDecay(currentData)

    // Calculate job score
    const jobScore = this.calculateWeightedScore(decayedData.factors, jobPerformance)

    // Update category reputation
    const categoryUpdate = this.updateCategoryReputation(
      decayedData.categoryReputations,
      jobPerformance,
      jobScore
    )

    // Calculate new overall score
    const overallScore = this.calculateOverallScore(categoryUpdate.categories)

    // Determine tier
    const tier = this.getTierFromScore(overallScore)

    // Check for new badges
    const newBadges = this.checkBadgeAchievements(
      decayedData,
      jobPerformance,
      overallScore
    )

    // Run fraud detection
    const fraudAnalysis = this.detectFraud(decayedData, jobPerformance)

    return {
      overallScore,
      jobScore,
      categoryScore: categoryUpdate.categoryScore,
      tier,
      newBadges,
      fraudDetected: fraudAnalysis.detected,
      fraudRiskScore: fraudAnalysis.riskScore
    }
  }

  /**
   * Apply time-based reputation decay
   */
  private applyTimeDecay(data: ReputationData): ReputationData {
    const currentTime = Date.now() / 1000
    const daysSinceUpdate = (currentTime - data.lastUpdated) / 86400

    if (daysSinceUpdate <= 0) return data

    const decayFactor = REPUTATION_CONSTANTS.REPUTATION_DECAY_RATE_BPS * daysSinceUpdate
    const decayMultiplier = Math.max(0, 10000 - decayFactor) / 10000

    // Apply decay to overall score
    const decayedOverallScore = Math.floor(data.overallScore * decayMultiplier)

    // Apply decay to category scores
    const decayedCategories = data.categoryReputations.map(category => {
      const categoryDaysInactive = (currentTime - category.lastActivity) / 86400
      const categoryDecay = REPUTATION_CONSTANTS.REPUTATION_DECAY_RATE_BPS * categoryDaysInactive
      const categoryMultiplier = Math.max(0, 10000 - categoryDecay) / 10000
      
      return {
        ...category,
        score: Math.floor(category.score * categoryMultiplier)
      }
    })

    return {
      ...data,
      overallScore: decayedOverallScore,
      categoryReputations: decayedCategories
    }
  }

  /**
   * Calculate weighted score based on job performance
   */
  private calculateWeightedScore(
    factors: ReputationFactors,
    jobPerformance: JobPerformance
  ): number {
    // Validate factors sum to 100
    const totalWeight = 
      factors.completionWeight +
      factors.qualityWeight +
      factors.timelinessWeight +
      factors.satisfactionWeight +
      factors.disputeWeight

    if (totalWeight !== 100) {
      throw new Error('Reputation factors must sum to 100')
    }

    // Calculate individual scores
    const completionScore = jobPerformance.completed 
      ? REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE 
      : 0

    const qualityScore = (jobPerformance.qualityRating * REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE) / 100

    const timelinessScore = this.calculateTimelinessScore(
      jobPerformance.expectedDuration,
      jobPerformance.actualDuration
    )

    const satisfactionScore = (jobPerformance.clientSatisfaction * REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE) / 100

    const disputeScore = this.calculateDisputeScore(jobPerformance)

    // Calculate weighted score
    const weightedScore = (
      completionScore * factors.completionWeight +
      qualityScore * factors.qualityWeight +
      timelinessScore * factors.timelinessWeight +
      satisfactionScore * factors.satisfactionWeight +
      disputeScore * factors.disputeWeight
    ) / 100

    return Math.min(weightedScore, REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE)
  }

  /**
   * Calculate timeliness score based on expected vs actual duration
   */
  private calculateTimelinessScore(expectedDuration: number, actualDuration: number): number {
    if (actualDuration <= expectedDuration) {
      return REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE
    }

    const delayRatio = ((actualDuration - expectedDuration) * 10000) / expectedDuration
    
    if (delayRatio > 5000) { // More than 50% delay
      return 0
    }

    return REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE - 
      (REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE * delayRatio / 10000)
  }

  /**
   * Calculate dispute score
   */
  private calculateDisputeScore(jobPerformance: JobPerformance): number {
    if (!jobPerformance.hadDispute) {
      return REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE
    }

    if (jobPerformance.disputeResolvedFavorably) {
      return REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE / 2 // 50% score if resolved favorably
    }

    return 0
  }

  /**
   * Update category-specific reputation
   */
  private updateCategoryReputation(
    categories: CategoryReputation[],
    jobPerformance: JobPerformance,
    jobScore: number
  ): { categories: CategoryReputation[]; categoryScore: number } {
    const existingCategoryIndex = categories.findIndex(
      c => c.category === jobPerformance.category
    )

    if (existingCategoryIndex !== -1) {
      // Update existing category
      const category = categories[existingCategoryIndex]
      const updatedCategory: CategoryReputation = {
        ...category,
        completedJobs: category.completedJobs + 1,
        qualitySum: category.qualitySum + jobPerformance.qualityRating,
        qualityCount: category.qualityCount + 1,
        totalEarnings: category.totalEarnings + jobPerformance.paymentAmount,
        lastActivity: Date.now() / 1000,
        score: Math.floor((category.score * 7 + jobScore * 3) / 10), // 70% existing, 30% new
        avgCompletionTime: Math.floor(
          (category.avgCompletionTime * category.completedJobs + jobPerformance.actualDuration) /
          (category.completedJobs + 1)
        )
      }

      const newCategories = [...categories]
      newCategories[existingCategoryIndex] = updatedCategory

      return { categories: newCategories, categoryScore: updatedCategory.score }
    } else {
      // Create new category
      if (categories.length >= REPUTATION_CONSTANTS.MAX_REPUTATION_CATEGORIES) {
        throw new Error('Maximum reputation categories reached')
      }

      const newCategory: CategoryReputation = {
        category: jobPerformance.category,
        score: jobScore,
        completedJobs: 1,
        avgCompletionTime: jobPerformance.actualDuration,
        qualitySum: jobPerformance.qualityRating,
        qualityCount: 1,
        lastActivity: Date.now() / 1000,
        totalEarnings: jobPerformance.paymentAmount
      }

      return { 
        categories: [...categories, newCategory],
        categoryScore: jobScore
      }
    }
  }

  /**
   * Calculate overall score from category reputations
   */
  private calculateOverallScore(categories: CategoryReputation[]): number {
    if (categories.length === 0) return 5000 // Default starting score

    let weightedSum = 0
    let totalWeight = 0

    for (const category of categories) {
      const weight = category.completedJobs
      weightedSum += category.score * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? Math.floor(weightedSum / totalWeight) : 5000
  }

  /**
   * Get reputation tier from score
   */
  private getTierFromScore(score: number): ReputationTier {
    if (score >= REPUTATION_CONSTANTS.PLATINUM_TIER_THRESHOLD) {
      return ReputationTier.Platinum
    } else if (score >= REPUTATION_CONSTANTS.GOLD_TIER_THRESHOLD) {
      return ReputationTier.Gold
    } else if (score >= REPUTATION_CONSTANTS.SILVER_TIER_THRESHOLD) {
      return ReputationTier.Silver
    } else if (score >= REPUTATION_CONSTANTS.BRONZE_TIER_THRESHOLD) {
      return ReputationTier.Bronze
    } else {
      return ReputationTier.None
    }
  }

  /**
   * Check for badge achievements
   */
  private checkBadgeAchievements(
    data: ReputationData,
    jobPerformance: JobPerformance,
    newScore: number
  ): BadgeType[] {
    const newBadges: BadgeType[] = []
    const existingBadges = new Set(data.badges.map(b => b.badgeType))

    const newTotalJobs = data.totalJobsCompleted + (jobPerformance.completed ? 1 : 0)

    // Job count badges
    if (!existingBadges.has(BadgeType.FirstJob) && newTotalJobs >= 1) {
      newBadges.push(BadgeType.FirstJob)
    }
    if (!existingBadges.has(BadgeType.TenJobs) && newTotalJobs >= 10) {
      newBadges.push(BadgeType.TenJobs)
    }
    if (!existingBadges.has(BadgeType.HundredJobs) && newTotalJobs >= 100) {
      newBadges.push(BadgeType.HundredJobs)
    }
    if (!existingBadges.has(BadgeType.ThousandJobs) && newTotalJobs >= 1000) {
      newBadges.push(BadgeType.ThousandJobs)
    }

    // Perfect rating badge
    if (!existingBadges.has(BadgeType.PerfectRating) && newScore >= 9500) {
      newBadges.push(BadgeType.PerfectRating)
    }

    // Quick responder badge
    if (!existingBadges.has(BadgeType.QuickResponder) && 
        data.avgResponseTime > 0 && data.avgResponseTime < 3600) {
      newBadges.push(BadgeType.QuickResponder)
    }

    // Dispute resolver badge
    if (!existingBadges.has(BadgeType.DisputeResolver) && data.disputesResolved >= 5) {
      newBadges.push(BadgeType.DisputeResolver)
    }

    // Category expert badge
    if (!existingBadges.has(BadgeType.CategoryExpert)) {
      const hasExpertCategory = data.categoryReputations.some(c => c.score >= 9000)
      if (hasExpertCategory) {
        newBadges.push(BadgeType.CategoryExpert)
      }
    }

    // Cross-category master badge
    if (!existingBadges.has(BadgeType.CrossCategoryMaster) && 
        data.categoryReputations.length >= 5) {
      newBadges.push(BadgeType.CrossCategoryMaster)
    }

    return newBadges
  }

  /**
   * Detect potential fraud patterns
   */
  private detectFraud(
    data: ReputationData,
    jobPerformance: JobPerformance
  ): { detected: boolean; riskScore: number; patterns: string[] } {
    let totalRiskScore = 0
    const detectedPatterns: string[] = []

    for (const pattern of this.fraudPatterns) {
      if (pattern.detect(data, jobPerformance)) {
        totalRiskScore += pattern.riskScore
        detectedPatterns.push(pattern.patternId)
      }
    }

    // Normalize risk score to 0-100
    const normalizedRiskScore = Math.min(100, totalRiskScore)

    return {
      detected: normalizedRiskScore >= 50, // Threshold for fraud detection
      riskScore: normalizedRiskScore,
      patterns: detectedPatterns
    }
  }

  /**
   * Create performance snapshot
   */
  createPerformanceSnapshot(
    data: ReputationData,
    newScore: number
  ): PerformanceSnapshot {
    const avgQuality = data.categoryReputations.length > 0
      ? data.categoryReputations.reduce((sum, cat) => {
          return sum + (cat.qualityCount > 0 ? cat.qualitySum / cat.qualityCount : 0)
        }, 0) / data.categoryReputations.length
      : 0

    return {
      timestamp: Date.now() / 1000,
      score: newScore,
      jobsCompleted: data.totalJobsCompleted,
      avgQuality: Math.floor(avgQuality)
    }
  }

  /**
   * Calculate reputation slash amount
   */
  calculateSlashAmount(
    currentScore: number,
    slashPercentage: number
  ): { newScore: number; slashAmount: number } {
    if (slashPercentage > 5000) {
      throw new Error('Slash percentage cannot exceed 50%')
    }

    if (currentScore < REPUTATION_CONSTANTS.MIN_REPUTATION_FOR_SLASH) {
      throw new Error('Reputation too low to slash')
    }

    const slashAmount = Math.floor((currentScore * slashPercentage) / 10000)
    const newScore = Math.max(0, currentScore - slashAmount)

    return { newScore, slashAmount }
  }

  /**
   * Calculate staking bonus
   */
  calculateStakingBonus(stakeAmount: number): number {
    // Max 5% bonus for staking
    return Math.min(500, Math.floor(stakeAmount / 1000))
  }
}