/**
 * Ghost Score Calculator Tests
 *
 * Unit tests for the Ghost Score reputation algorithm implementation.
 * Tests core calculation functions, time decay, tier calculations, and badge assignments.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateTimeDecayFactor,
  calculateTier,
  calculateGhostScore,
  SOURCE_WEIGHTS,
  DECAY_HALF_LIVES,
  TIER_THRESHOLDS,
  type SourceScore,
} from '../convex/ghostScoreCalculator'

// ============================================================================
// Time Decay Tests
// ============================================================================

describe('calculateTimeDecayFactor', () => {
  beforeEach(() => {
    // Freeze time at a specific timestamp for consistent tests
    const mockDate = new Date('2024-01-15T00:00:00Z')
    vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return 1.0 for data updated now', () => {
    const now = Date.now()
    const decayFactor = calculateTimeDecayFactor(now, 30)
    expect(decayFactor).toBeCloseTo(1.0, 2)
  })

  it('should return approximately 0.5 at half-life', () => {
    // 30 days ago = half-life for payment activity
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const decayFactor = calculateTimeDecayFactor(thirtyDaysAgo, 30)
    expect(decayFactor).toBeCloseTo(0.5, 1)
  })

  it('should never decay below 0.1 (minimum floor)', () => {
    // Very old data (2 years ago)
    const twoYearsAgo = Date.now() - 730 * 24 * 60 * 60 * 1000
    const decayFactor = calculateTimeDecayFactor(twoYearsAgo, 30)
    expect(decayFactor).toBeGreaterThanOrEqual(0.1)
  })

  it('should apply correct decay rate for staking commitment (90 day half-life)', () => {
    // 90 days ago = half-life for staking
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
    const decayFactor = calculateTimeDecayFactor(ninetyDaysAgo, DECAY_HALF_LIVES.stakingCommitment)
    expect(decayFactor).toBeCloseTo(0.5, 1)
  })

  it('should apply slower decay for credentials (365 day half-life)', () => {
    // 365 days ago = half-life for credentials
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
    const decayFactor = calculateTimeDecayFactor(
      oneYearAgo,
      DECAY_HALF_LIVES.credentialVerifications
    )
    expect(decayFactor).toBeCloseTo(0.5, 1)
  })

  it('should apply fast decay for API quality (14 day half-life)', () => {
    // 14 days ago = half-life for API quality
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
    const decayFactor = calculateTimeDecayFactor(twoWeeksAgo, DECAY_HALF_LIVES.apiQualityMetrics)
    expect(decayFactor).toBeCloseTo(0.5, 1)
  })
})

// ============================================================================
// Tier Calculation Tests
// ============================================================================

describe('calculateTier', () => {
  it('should return DIAMOND for score >= 9500', () => {
    expect(calculateTier(9500)).toBe('DIAMOND')
    expect(calculateTier(9750)).toBe('DIAMOND')
    expect(calculateTier(10000)).toBe('DIAMOND')
  })

  it('should return PLATINUM for score 9000-9499', () => {
    expect(calculateTier(9000)).toBe('PLATINUM')
    expect(calculateTier(9250)).toBe('PLATINUM')
    expect(calculateTier(9499)).toBe('PLATINUM')
  })

  it('should return GOLD for score 7500-8999', () => {
    expect(calculateTier(7500)).toBe('GOLD')
    expect(calculateTier(8000)).toBe('GOLD')
    expect(calculateTier(8999)).toBe('GOLD')
  })

  it('should return SILVER for score 5000-7499', () => {
    expect(calculateTier(5000)).toBe('SILVER')
    expect(calculateTier(6000)).toBe('SILVER')
    expect(calculateTier(7499)).toBe('SILVER')
  })

  it('should return BRONZE for score 2000-4999', () => {
    expect(calculateTier(2000)).toBe('BRONZE')
    expect(calculateTier(3500)).toBe('BRONZE')
    expect(calculateTier(4999)).toBe('BRONZE')
  })

  it('should return NEWCOMER for score < 2000', () => {
    expect(calculateTier(0)).toBe('NEWCOMER')
    expect(calculateTier(1000)).toBe('NEWCOMER')
    expect(calculateTier(1999)).toBe('NEWCOMER')
  })

  it('should handle edge cases at tier boundaries', () => {
    expect(calculateTier(TIER_THRESHOLDS.DIAMOND - 1)).toBe('PLATINUM')
    expect(calculateTier(TIER_THRESHOLDS.PLATINUM - 1)).toBe('GOLD')
    expect(calculateTier(TIER_THRESHOLDS.GOLD - 1)).toBe('SILVER')
    expect(calculateTier(TIER_THRESHOLDS.SILVER - 1)).toBe('BRONZE')
    expect(calculateTier(TIER_THRESHOLDS.BRONZE - 1)).toBe('NEWCOMER')
  })
})

// ============================================================================
// Ghost Score Calculation Tests
// ============================================================================

describe('calculateGhostScore', () => {
  /**
   * Creates a mock source score for testing
   */
  const createMockSource = (
    rawScore: number,
    weight: number,
    confidence: number,
    dataPoints: number,
    timeDecayFactor: number
  ): SourceScore => ({
    rawScore,
    weight,
    confidence,
    dataPoints,
    timeDecayFactor,
    lastUpdated: Date.now(),
  })

  describe('basic score calculation', () => {
    it('should calculate score from single source', () => {
      const sources = {
        paymentActivity: createMockSource(5000, 0.3, 1.0, 100, 1.0),
      }

      const result = calculateGhostScore(sources)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeInstanceOf(Array)
    })

    it('should calculate weighted score from multiple sources', () => {
      const sources = {
        paymentActivity: createMockSource(8000, SOURCE_WEIGHTS.paymentActivity, 0.9, 50, 1.0),
        stakingCommitment: createMockSource(6000, SOURCE_WEIGHTS.stakingCommitment, 0.8, 10, 1.0),
        credentialVerifications: createMockSource(
          7000,
          SOURCE_WEIGHTS.credentialVerifications,
          0.7,
          5,
          1.0
        ),
        userReviews: createMockSource(5000, SOURCE_WEIGHTS.userReviews, 0.6, 20, 1.0),
        onChainActivity: createMockSource(5000, SOURCE_WEIGHTS.onChainActivity, 0.5, 1, 1.0),
        governanceParticipation: createMockSource(
          0,
          SOURCE_WEIGHTS.governanceParticipation,
          0,
          0,
          1.0
        ),
        apiQualityMetrics: createMockSource(5000, SOURCE_WEIGHTS.apiQualityMetrics, 0.5, 30, 1.0),
        endorsementGraph: createMockSource(0, SOURCE_WEIGHTS.endorsementGraph, 0, 0, 1.0),
      }

      const result = calculateGhostScore(sources)
      expect(result.score).toBeGreaterThan(0)
      // Score should be weighted towards higher confidence sources
      expect(result.score).toBeLessThanOrEqual(10000)
    })

    it('should return zero score for empty sources', () => {
      const sources = {} as Record<string, SourceScore>
      const result = calculateGhostScore(sources)
      expect(result.score).toBe(0)
      expect(result.confidence).toEqual([0, 0])
    })

    it('should return zero score for sources with no confidence', () => {
      const sources = {
        paymentActivity: createMockSource(5000, 0.3, 0, 0, 1.0),
      }

      const result = calculateGhostScore(sources)
      expect(result.score).toBe(0)
    })
  })

  describe('time decay application', () => {
    it('should apply time decay to reduce older data scores', () => {
      const freshSource = createMockSource(5000, 0.3, 1.0, 100, 1.0)
      const staleSource = createMockSource(5000, 0.3, 1.0, 100, 0.5)

      const freshResult = calculateGhostScore({ paymentActivity: freshSource })
      const staleResult = calculateGhostScore({ paymentActivity: staleSource })

      // Fresh data should have equal or higher score
      expect(freshResult.score).toBeGreaterThanOrEqual(staleResult.score)
    })
  })

  describe('confidence interval calculation', () => {
    it('should have valid confidence interval bounds', () => {
      const sources = {
        paymentActivity: createMockSource(5000, 0.3, 1.0, 100, 1.0),
        stakingCommitment: createMockSource(5000, 0.2, 1.0, 100, 1.0),
        credentialVerifications: createMockSource(5000, 0.15, 1.0, 100, 1.0),
        userReviews: createMockSource(5000, 0.15, 1.0, 100, 1.0),
        onChainActivity: createMockSource(5000, 0.1, 1.0, 100, 1.0),
        governanceParticipation: createMockSource(5000, 0.05, 1.0, 100, 1.0),
        apiQualityMetrics: createMockSource(5000, 0.03, 1.0, 100, 1.0),
        endorsementGraph: createMockSource(5000, 0.02, 1.0, 100, 1.0),
      }

      const result = calculateGhostScore(sources)
      const [lower, upper] = result.confidence

      expect(lower).toBeGreaterThanOrEqual(0)
      expect(upper).toBeLessThanOrEqual(10000)
      expect(lower).toBeLessThanOrEqual(upper)
    })

    it('should have wider intervals for low confidence sources', () => {
      const lowConfidenceSources = {
        paymentActivity: createMockSource(5000, 0.3, 0.1, 1, 1.0),
      }

      const highConfidenceSources = {
        paymentActivity: createMockSource(5000, 0.3, 1.0, 100, 1.0),
      }

      const lowConfidenceResult = calculateGhostScore(lowConfidenceSources)
      const highConfidenceResult = calculateGhostScore(highConfidenceSources)

      const lowConfidenceInterval =
        lowConfidenceResult.confidence[1] - lowConfidenceResult.confidence[0]
      const highConfidenceInterval =
        highConfidenceResult.confidence[1] - highConfidenceResult.confidence[0]

      // Low confidence should have wider interval
      expect(lowConfidenceInterval).toBeGreaterThan(highConfidenceInterval)
    })
  })

  describe('score bounds', () => {
    it('should never exceed 10000', () => {
      const sources = {
        paymentActivity: createMockSource(10000, 0.3, 1.0, 100, 1.0),
        stakingCommitment: createMockSource(10000, 0.2, 1.0, 100, 1.0),
        credentialVerifications: createMockSource(10000, 0.15, 1.0, 100, 1.0),
        userReviews: createMockSource(10000, 0.15, 1.0, 100, 1.0),
        onChainActivity: createMockSource(10000, 0.1, 1.0, 100, 1.0),
        governanceParticipation: createMockSource(10000, 0.05, 1.0, 100, 1.0),
        apiQualityMetrics: createMockSource(10000, 0.03, 1.0, 100, 1.0),
        endorsementGraph: createMockSource(10000, 0.02, 1.0, 100, 1.0),
      }

      const result = calculateGhostScore(sources)
      expect(result.score).toBeLessThanOrEqual(10000)
    })

    it('should never be negative', () => {
      const sources = {
        paymentActivity: createMockSource(0, 0.3, 1.0, 100, 1.0),
      }

      const result = calculateGhostScore(sources)
      expect(result.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('outlier detection', () => {
    it('should handle sources with very different scores', () => {
      const sources = {
        paymentActivity: createMockSource(9000, 0.3, 1.0, 100, 1.0),
        stakingCommitment: createMockSource(1000, 0.2, 1.0, 100, 1.0),
        credentialVerifications: createMockSource(5000, 0.15, 1.0, 100, 1.0),
        userReviews: createMockSource(8500, 0.15, 1.0, 100, 1.0),
        onChainActivity: createMockSource(5000, 0.1, 1.0, 100, 1.0),
        governanceParticipation: createMockSource(5000, 0.05, 1.0, 100, 1.0),
        apiQualityMetrics: createMockSource(5000, 0.03, 1.0, 100, 1.0),
        endorsementGraph: createMockSource(5000, 0.02, 1.0, 100, 1.0),
      }

      const result = calculateGhostScore(sources)
      expect(result.score).toBeGreaterThan(0)
      // Result should be somewhere between min and max
      expect(result.score).toBeLessThanOrEqual(9000)
    })
  })
})

// ============================================================================
// Source Weights Validation Tests
// ============================================================================

describe('SOURCE_WEIGHTS', () => {
  it('should have valid weights (0-1 range)', () => {
    Object.values(SOURCE_WEIGHTS).forEach((weight: any) => {
      expect(weight).toBeGreaterThanOrEqual(0)
      expect(weight).toBeLessThanOrEqual(1)
    })
  })

  it('should sum to approximately 1.0', () => {
    const total = Object.values(SOURCE_WEIGHTS).reduce((sum, w) => sum + w, 0)
    expect(total).toBeCloseTo(1.0, 2)
  })

  it('should have payment activity as highest weight', () => {
    const paymentWeight = SOURCE_WEIGHTS.paymentActivity
    Object.entries(SOURCE_WEIGHTS).forEach(([key, weight]: [string, any]) => {
      if (key !== 'paymentActivity') {
        expect(paymentWeight).toBeGreaterThan(weight)
      }
    })
  })
})

// ============================================================================
// Decay Half-Lives Validation Tests
// ============================================================================

describe('DECAY_HALF_LIVES', () => {
  it('should have positive half-lives for all sources', () => {
    Object.values(DECAY_HALF_LIVES).forEach((halfLife: any) => {
      expect(halfLife).toBeGreaterThan(0)
    })
  })

  it('should have reasonable half-life ranges (days)', () => {
    Object.values(DECAY_HALF_LIVES).forEach((halfLife: any) => {
      expect(halfLife).toBeLessThanOrEqual(365)
    })
  })
})

// ============================================================================
// Tier Thresholds Validation Tests
// ============================================================================

describe('TIER_THRESHOLDS', () => {
  it('should have ascending thresholds', () => {
    const thresholds = Object.values(TIER_THRESHOLDS)
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1])
    }
  })

  it('should have NEWCOMER threshold at 0', () => {
    expect(TIER_THRESHOLDS.NEWCOMER).toBe(0)
  })

  it('should have valid tier boundary progression', () => {
    expect(TIER_THRESHOLDS.BRONZE).toBe(2000)
    expect(TIER_THRESHOLDS.SILVER).toBe(5000)
    expect(TIER_THRESHOLDS.GOLD).toBe(7500)
    expect(TIER_THRESHOLDS.PLATINUM).toBe(9000)
    expect(TIER_THRESHOLDS.DIAMOND).toBe(9500)
  })
})
