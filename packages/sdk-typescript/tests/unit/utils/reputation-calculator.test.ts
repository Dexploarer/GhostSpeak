/**
 * Comprehensive tests for Reputation Calculator
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ReputationCalculator } from '../../../src/utils/reputation-calculator.js'
import {
  type ReputationData,
  type JobPerformance,
  type ReputationCalculationResult,
  type ReputationFactors,
  type CategoryReputation,
  type Badge,
  ReputationTier,
  BadgeType,
  REPUTATION_CONSTANTS
} from '../../../src/types/reputation-types.js'

describe('ReputationCalculator', () => {
  let calculator: ReputationCalculator
  let baseReputationData: ReputationData
  let baseJobPerformance: JobPerformance
  let baseFactors: ReputationFactors

  beforeEach(() => {
    calculator = new ReputationCalculator()
    
    baseFactors = {
      completionWeight: 20,
      qualityWeight: 30,
      timelinessWeight: 20,
      satisfactionWeight: 20,
      disputeWeight: 10
    }

    baseReputationData = {
      overallScore: 5000,
      factors: baseFactors,
      totalJobsCompleted: 10,
      categoryReputations: [],
      badges: [],
      disputesAgainst: 0,
      disputesResolved: 0,
      lastUpdated: Date.now() / 1000,
      performanceHistory: [],
      avgResponseTime: 0
    }

    baseJobPerformance = {
      completed: true,
      qualityRating: 80,
      expectedDuration: 3600, // 1 hour
      actualDuration: 3000,  // 50 minutes
      clientSatisfaction: 90,
      hadDispute: false,
      disputeResolvedFavorably: false,
      category: 'web_development',
      paymentAmount: 100
    }
  })

  describe('calculateReputation', () => {
    it('should calculate reputation for a successful job', () => {
      const result = calculator.calculateReputation(baseReputationData, baseJobPerformance)

      expect(result).toBeDefined()
      expect(result.overallScore).toBeGreaterThan(0)
      expect(result.jobScore).toBeGreaterThan(0)
      expect(result.categoryScore).toBeGreaterThan(0)
      expect(result.tier).toBe(ReputationTier.Bronze)
      expect(result.fraudDetected).toBe(false)
    })

    it('should calculate perfect score for perfect performance', () => {
      const perfectJob: JobPerformance = {
        ...baseJobPerformance,
        qualityRating: 100,
        clientSatisfaction: 100,
        actualDuration: 3000 // Under expected time
      }

      const result = calculator.calculateReputation(baseReputationData, perfectJob)

      expect(result.jobScore).toBe(REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE)
    })

    it('should penalize for incomplete jobs', () => {
      const incompleteJob: JobPerformance = {
        ...baseJobPerformance,
        completed: false
      }

      const result = calculator.calculateReputation(baseReputationData, incompleteJob)

      expect(result.jobScore).toBeLessThan(
        calculator.calculateReputation(baseReputationData, baseJobPerformance).jobScore
      )
    })

    it('should handle disputes appropriately', () => {
      const disputedJob: JobPerformance = {
        ...baseJobPerformance,
        hadDispute: true,
        disputeResolvedFavorably: false
      }

      const result = calculator.calculateReputation(baseReputationData, disputedJob)
      expect(result.jobScore).toBeLessThan(8000)

      const favorableDispute: JobPerformance = {
        ...baseJobPerformance,
        hadDispute: true,
        disputeResolvedFavorably: true
      }

      const favorableResult = calculator.calculateReputation(baseReputationData, favorableDispute)
      expect(favorableResult.jobScore).toBeGreaterThan(result.jobScore)
    })

    it('should throw error for invalid factor weights', () => {
      const invalidFactors: ReputationFactors = {
        completionWeight: 30,
        qualityWeight: 30,
        timelinessWeight: 30,
        satisfactionWeight: 20,
        disputeWeight: 10 // Sum = 120
      }

      const invalidData = { ...baseReputationData, factors: invalidFactors }

      expect(() => calculator.calculateReputation(invalidData, baseJobPerformance))
        .toThrow('Reputation factors must sum to 100')
    })
  })

  describe('Time-based decay', () => {
    it('should apply decay for old reputation scores', () => {
      const oldData: ReputationData = {
        ...baseReputationData,
        overallScore: 8000,
        lastUpdated: (Date.now() / 1000) - (30 * 86400) // 30 days ago
      }

      const result = calculator.calculateReputation(oldData, baseJobPerformance)

      expect(result.overallScore).toBeLessThan(8000)
    })

    it('should apply decay to category reputations', () => {
      const categoryData: ReputationData = {
        ...baseReputationData,
        categoryReputations: [{
          category: 'web_development',
          score: 7000,
          completedJobs: 5,
          avgCompletionTime: 3600,
          qualitySum: 400,
          qualityCount: 5,
          lastActivity: (Date.now() / 1000) - (60 * 86400), // 60 days ago
          totalEarnings: 500
        }]
      }

      const result = calculator.calculateReputation(categoryData, baseJobPerformance)

      expect(result.categoryScore).toBeLessThan(7000)
    })

    it('should not apply decay for recent updates', () => {
      const recentData: ReputationData = {
        ...baseReputationData,
        overallScore: 8000,
        lastUpdated: Date.now() / 1000 // Just now
      }

      const result = calculator.calculateReputation(recentData, baseJobPerformance)

      expect(result.overallScore).toBeGreaterThanOrEqual(8000)
    })
  })

  describe('Category reputation', () => {
    it('should create new category reputation', () => {
      const result = calculator.calculateReputation(baseReputationData, baseJobPerformance)

      expect(result.categoryScore).toBeGreaterThan(0)
    })

    it('should update existing category reputation', () => {
      const dataWithCategory: ReputationData = {
        ...baseReputationData,
        categoryReputations: [{
          category: 'web_development',
          score: 6000,
          completedJobs: 5,
          avgCompletionTime: 4000,
          qualitySum: 400,
          qualityCount: 5,
          lastActivity: Date.now() / 1000,
          totalEarnings: 500
        }]
      }

      const result = calculator.calculateReputation(dataWithCategory, baseJobPerformance)

      expect(result.categoryScore).toBeGreaterThan(6000)
    })

    it('should throw error when exceeding max categories', () => {
      const maxCategories: CategoryReputation[] = []
      for (let i = 0; i < REPUTATION_CONSTANTS.MAX_REPUTATION_CATEGORIES; i++) {
        maxCategories.push({
          category: `category_${i}`,
          score: 5000,
          completedJobs: 1,
          avgCompletionTime: 3600,
          qualitySum: 80,
          qualityCount: 1,
          lastActivity: Date.now() / 1000,
          totalEarnings: 100
        })
      }

      const fullData: ReputationData = {
        ...baseReputationData,
        categoryReputations: maxCategories
      }

      const newCategoryJob: JobPerformance = {
        ...baseJobPerformance,
        category: 'new_category'
      }

      expect(() => calculator.calculateReputation(fullData, newCategoryJob))
        .toThrow('Maximum reputation categories reached')
    })
  })

  describe('Timeliness scoring', () => {
    it('should give full score for on-time completion', () => {
      const onTimeJob: JobPerformance = {
        ...baseJobPerformance,
        expectedDuration: 3600,
        actualDuration: 3600
      }

      const result = calculator.calculateReputation(baseReputationData, onTimeJob)

      expect(result.jobScore).toBeGreaterThan(8000)
    })

    it('should give full score for early completion', () => {
      const earlyJob: JobPerformance = {
        ...baseJobPerformance,
        expectedDuration: 3600,
        actualDuration: 3000
      }

      const result = calculator.calculateReputation(baseReputationData, earlyJob)

      expect(result.jobScore).toBeGreaterThan(8000)
    })

    it('should penalize for late completion', () => {
      const lateJob: JobPerformance = {
        ...baseJobPerformance,
        expectedDuration: 3600,
        actualDuration: 4500 // 25% late
      }

      const result = calculator.calculateReputation(baseReputationData, lateJob)

      const onTimeResult = calculator.calculateReputation(baseReputationData, baseJobPerformance)
      expect(result.jobScore).toBeLessThan(onTimeResult.jobScore)
    })

    it('should give zero timeliness score for extreme delays', () => {
      const veryLateJob: JobPerformance = {
        ...baseJobPerformance,
        expectedDuration: 3600,
        actualDuration: 7200 // 100% late
      }

      const result = calculator.calculateReputation(baseReputationData, veryLateJob)

      expect(result.jobScore).toBeLessThan(5000)
    })
  })

  describe('Badge achievements', () => {
    it('should award first job badge', () => {
      const newUserData: ReputationData = {
        ...baseReputationData,
        totalJobsCompleted: 0,
        badges: []
      }

      const result = calculator.calculateReputation(newUserData, baseJobPerformance)

      expect(result.newBadges).toContain(BadgeType.FirstJob)
    })

    it('should award milestone badges', () => {
      const cases = [
        { completed: 9, expected: BadgeType.TenJobs },
        { completed: 99, expected: BadgeType.HundredJobs },
        { completed: 999, expected: BadgeType.ThousandJobs }
      ]

      for (const { completed, expected } of cases) {
        const data: ReputationData = {
          ...baseReputationData,
          totalJobsCompleted: completed,
          badges: []
        }

        const result = calculator.calculateReputation(data, baseJobPerformance)
        expect(result.newBadges).toContain(expected)
      }
    })

    it('should award perfect rating badge', () => {
      const highScoreData: ReputationData = {
        ...baseReputationData,
        overallScore: 9400,
        badges: []
      }

      const perfectJob: JobPerformance = {
        ...baseJobPerformance,
        qualityRating: 100,
        clientSatisfaction: 100
      }

      const result = calculator.calculateReputation(highScoreData, perfectJob)

      expect(result.newBadges).toContain(BadgeType.PerfectRating)
    })

    it('should award quick responder badge', () => {
      const quickData: ReputationData = {
        ...baseReputationData,
        avgResponseTime: 1800, // 30 minutes
        badges: []
      }

      const result = calculator.calculateReputation(quickData, baseJobPerformance)

      expect(result.newBadges).toContain(BadgeType.QuickResponder)
    })

    it('should award dispute resolver badge', () => {
      const disputeData: ReputationData = {
        ...baseReputationData,
        disputesResolved: 5,
        badges: []
      }

      const result = calculator.calculateReputation(disputeData, baseJobPerformance)

      expect(result.newBadges).toContain(BadgeType.DisputeResolver)
    })

    it('should not award duplicate badges', () => {
      const existingBadge: Badge = {
        badgeType: BadgeType.FirstJob,
        earnedAt: Date.now() / 1000
      }

      const dataWithBadge: ReputationData = {
        ...baseReputationData,
        totalJobsCompleted: 5,
        badges: [existingBadge]
      }

      const result = calculator.calculateReputation(dataWithBadge, baseJobPerformance)

      expect(result.newBadges).not.toContain(BadgeType.FirstJob)
    })

    it('should award category expert badge', () => {
      const expertData: ReputationData = {
        ...baseReputationData,
        categoryReputations: [{
          category: 'web_development',
          score: 9100,
          completedJobs: 50,
          avgCompletionTime: 3600,
          qualitySum: 4500,
          qualityCount: 50,
          lastActivity: Date.now() / 1000,
          totalEarnings: 5000
        }],
        badges: []
      }

      const result = calculator.calculateReputation(expertData, baseJobPerformance)

      expect(result.newBadges).toContain(BadgeType.CategoryExpert)
    })

    it('should award cross-category master badge', () => {
      const categories: CategoryReputation[] = []
      for (let i = 0; i < 5; i++) {
        categories.push({
          category: `category_${i}`,
          score: 6000,
          completedJobs: 10,
          avgCompletionTime: 3600,
          qualitySum: 800,
          qualityCount: 10,
          lastActivity: Date.now() / 1000,
          totalEarnings: 1000
        })
      }

      const multiCategoryData: ReputationData = {
        ...baseReputationData,
        categoryReputations: categories,
        badges: []
      }

      const result = calculator.calculateReputation(multiCategoryData, baseJobPerformance)

      expect(result.newBadges).toContain(BadgeType.CrossCategoryMaster)
    })
  })

  describe('Tier calculation', () => {
    it('should assign correct tiers based on score', () => {
      const tierTests = [
        { score: 500, expected: ReputationTier.None },
        { score: 3000, expected: ReputationTier.Bronze },
        { score: 5000, expected: ReputationTier.Silver },
        { score: 7500, expected: ReputationTier.Gold },
        { score: 9500, expected: ReputationTier.Platinum }
      ]

      for (const { score, expected } of tierTests) {
        const data: ReputationData = {
          ...baseReputationData,
          overallScore: score - 500 // Account for job score addition
        }

        const result = calculator.calculateReputation(data, baseJobPerformance)

        expect(result.tier).toBe(expected)
      }
    })
  })

  describe('Fraud detection', () => {
    it('should detect sudden reputation spikes', () => {
      const spikeData: ReputationData = {
        ...baseReputationData,
        performanceHistory: [
          { timestamp: Date.now() / 1000 - 86400, score: 5000, jobsCompleted: 10, avgQuality: 80 },
          { timestamp: Date.now() / 1000, score: 8000, jobsCompleted: 10, avgQuality: 80 }
        ]
      }

      const result = calculator.calculateReputation(spikeData, baseJobPerformance)

      expect(result.fraudDetected).toBe(true)
      expect(result.fraudRiskScore).toBeGreaterThan(50)
    })

    it('should detect perfect scores pattern', () => {
      const perfectHistory = []
      for (let i = 0; i < 10; i++) {
        perfectHistory.push({
          timestamp: Date.now() / 1000 - (i * 86400),
          score: 10000,
          jobsCompleted: 10 - i,
          avgQuality: 100
        })
      }

      const perfectData: ReputationData = {
        ...baseReputationData,
        performanceHistory: perfectHistory
      }

      const result = calculator.calculateReputation(perfectData, baseJobPerformance)

      expect(result.fraudDetected).toBe(true)
    })

    it('should detect rapid category switching', () => {
      const categories: CategoryReputation[] = []
      for (let i = 0; i < 5; i++) {
        categories.push({
          category: `category_${i}`,
          score: 6000,
          completedJobs: 1,
          avgCompletionTime: 3600,
          qualitySum: 80,
          qualityCount: 1,
          lastActivity: Date.now() / 1000 - (i * 86400), // Each day
          totalEarnings: 100
        })
      }

      const rapidSwitchData: ReputationData = {
        ...baseReputationData,
        categoryReputations: categories
      }

      const result = calculator.calculateReputation(rapidSwitchData, baseJobPerformance)

      expect(result.fraudRiskScore).toBeGreaterThan(0)
    })

    it('should detect suspicious dispute patterns', () => {
      const disputeData: ReputationData = {
        ...baseReputationData,
        totalJobsCompleted: 20,
        disputesAgainst: 8,
        disputesResolved: 7
      }

      const result = calculator.calculateReputation(disputeData, baseJobPerformance)

      expect(result.fraudDetected).toBe(true)
    })

    it('should detect time manipulation', () => {
      const quickJob: JobPerformance = {
        ...baseJobPerformance,
        expectedDuration: 3600,
        actualDuration: 300 // 5 minutes for 1 hour job
      }

      const result = calculator.calculateReputation(baseReputationData, quickJob)

      expect(result.fraudRiskScore).toBeGreaterThan(0)
    })

    it('should not flag legitimate activity as fraud', () => {
      const legitimateData: ReputationData = {
        ...baseReputationData,
        performanceHistory: [
          { timestamp: Date.now() / 1000 - 86400, score: 5000, jobsCompleted: 10, avgQuality: 80 },
          { timestamp: Date.now() / 1000, score: 5200, jobsCompleted: 11, avgQuality: 82 }
        ]
      }

      const result = calculator.calculateReputation(legitimateData, baseJobPerformance)

      expect(result.fraudDetected).toBe(false)
      expect(result.fraudRiskScore).toBeLessThan(50)
    })
  })

  describe('Performance snapshots', () => {
    it('should create accurate performance snapshot', () => {
      const data: ReputationData = {
        ...baseReputationData,
        totalJobsCompleted: 25,
        categoryReputations: [
          {
            category: 'web_development',
            score: 7000,
            completedJobs: 15,
            avgCompletionTime: 3600,
            qualitySum: 1200,
            qualityCount: 15,
            lastActivity: Date.now() / 1000,
            totalEarnings: 1500
          },
          {
            category: 'mobile_development',
            score: 6500,
            completedJobs: 10,
            avgCompletionTime: 4000,
            qualitySum: 850,
            qualityCount: 10,
            lastActivity: Date.now() / 1000,
            totalEarnings: 1000
          }
        ]
      }

      const snapshot = calculator.createPerformanceSnapshot(data, 7500)

      expect(snapshot.score).toBe(7500)
      expect(snapshot.jobsCompleted).toBe(25)
      expect(snapshot.avgQuality).toBe(82) // Average of 80 and 85
      expect(snapshot.timestamp).toBeCloseTo(Date.now() / 1000, 0)
    })

    it('should handle empty category reputations', () => {
      const snapshot = calculator.createPerformanceSnapshot(baseReputationData, 5000)

      expect(snapshot.avgQuality).toBe(0)
    })
  })

  describe('Reputation slashing', () => {
    it('should calculate slash amount correctly', () => {
      const { newScore, slashAmount } = calculator.calculateSlashAmount(8000, 1000) // 10% slash

      expect(slashAmount).toBe(800)
      expect(newScore).toBe(7200)
    })

    it('should throw error for excessive slash percentage', () => {
      expect(() => calculator.calculateSlashAmount(8000, 6000))
        .toThrow('Slash percentage cannot exceed 50%')
    })

    it('should throw error for low reputation slash', () => {
      expect(() => calculator.calculateSlashAmount(500, 1000))
        .toThrow('Reputation too low to slash')
    })

    it('should not allow negative scores', () => {
      const { newScore } = calculator.calculateSlashAmount(1000, 5000) // 50% slash

      expect(newScore).toBe(500)
      expect(newScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Staking bonus', () => {
    it('should calculate staking bonus', () => {
      expect(calculator.calculateStakingBonus(1000)).toBe(1)
      expect(calculator.calculateStakingBonus(5000)).toBe(5)
      expect(calculator.calculateStakingBonus(100000)).toBe(100)
    })

    it('should cap staking bonus at 5%', () => {
      expect(calculator.calculateStakingBonus(1000000)).toBe(500) // 5% max
    })

    it('should handle zero stake', () => {
      expect(calculator.calculateStakingBonus(0)).toBe(0)
    })
  })

  describe('Edge cases', () => {
    it('should handle zero values in job performance', () => {
      const zeroJob: JobPerformance = {
        ...baseJobPerformance,
        qualityRating: 0,
        clientSatisfaction: 0,
        paymentAmount: 0
      }

      const result = calculator.calculateReputation(baseReputationData, zeroJob)

      expect(result.jobScore).toBeGreaterThan(0) // Still has completion and timeliness scores
    })

    it('should handle very high payment amounts', () => {
      const highPaymentJob: JobPerformance = {
        ...baseJobPerformance,
        paymentAmount: 1000000
      }

      const result = calculator.calculateReputation(baseReputationData, highPaymentJob)

      expect(result).toBeDefined()
      expect(result.categoryScore).toBeGreaterThan(0)
    })

    it('should maintain score within valid range', () => {
      const perfectJob: JobPerformance = {
        ...baseJobPerformance,
        qualityRating: 100,
        clientSatisfaction: 100,
        actualDuration: 1800 // Half the expected time
      }

      const highScoreData: ReputationData = {
        ...baseReputationData,
        overallScore: 9900
      }

      const result = calculator.calculateReputation(highScoreData, perfectJob)

      expect(result.overallScore).toBeLessThanOrEqual(REPUTATION_CONSTANTS.MAX_REPUTATION_SCORE)
    })
  })
})