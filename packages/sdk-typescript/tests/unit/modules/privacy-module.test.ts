/**
 * Privacy Module Tests
 *
 * Tests for privacy settings management, access control,
 * and privacy-filtered reputation display.
 *
 * NOTE: The PrivacyModule uses placeholder instruction getters because
 * privacy instructions haven't been generated via Codama yet.
 * These tests focus on helper functions and module structure.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PrivacyModule } from '../../../src/modules/privacy/PrivacyModule.js'
import {
  PrivacyMode,
  VisibilityLevel,
  ReputationTier,
  ScoreRange,
  PrivacyPresets,
  PRIVACY_CONSTANTS,
} from '../../../src/types/privacy-types.js'
import {
  calculateVisibleScore,
  getReputationTier,
  getScoreRange,
  canViewerAccess,
  filterMetricsByVisibility,
  getDefaultMetricVisibility,
  validatePrivacySettings,
} from '../../../src/modules/privacy/privacy-helpers.js'
import type { Address } from '@solana/addresses'

describe('PrivacyModule', () => {
  let privacyModule: PrivacyModule
  const testProgramId = 'GHosT3wqDfNq9bKz8dNEQ1F5mLuN7bKdNYx3Z1111111' as Address
  const testAgentAddress = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' as Address

  beforeEach(() => {
    privacyModule = new PrivacyModule({
      programId: testProgramId,
      network: 'devnet',
    })
  })

  describe('constructor', () => {
    it('should create module with config', () => {
      expect(privacyModule).toBeDefined()
    })
  })

  describe('getAvailablePresets', () => {
    it('should return all privacy presets', () => {
      const presets = privacyModule.getAvailablePresets()

      expect(presets).toHaveProperty('CONSERVATIVE')
      expect(presets).toHaveProperty('BALANCED')
      expect(presets).toHaveProperty('OPEN')
    })

    it('should have correct mode for conservative preset', () => {
      const presets = privacyModule.getAvailablePresets()
      expect(presets.CONSERVATIVE.mode).toBe(PrivacyMode.TierOnly)
    })

    it('should have correct mode for balanced preset', () => {
      const presets = privacyModule.getAvailablePresets()
      expect(presets.BALANCED.mode).toBe(PrivacyMode.Custom)
    })

    it('should have correct mode for open preset', () => {
      const presets = privacyModule.getAvailablePresets()
      expect(presets.OPEN.mode).toBe(PrivacyMode.Public)
    })
  })

  describe('getDefaultVisibility', () => {
    it('should return public visibility for Public mode', () => {
      const visibility = privacyModule.getDefaultVisibility(PrivacyMode.Public)

      expect(visibility.showScore).toBe(VisibilityLevel.Public)
      expect(visibility.showJobsCompleted).toBe(VisibilityLevel.Public)
      expect(visibility.showEarnings).toBe(VisibilityLevel.Public)
    })

    it('should return ZKProof visibility for Confidential mode', () => {
      const visibility = privacyModule.getDefaultVisibility(PrivacyMode.Confidential)

      expect(visibility.showScore).toBe(VisibilityLevel.ZKProof)
      expect(visibility.showEarnings).toBe(VisibilityLevel.ZKProof)
    })
  })

  describe('getTier', () => {
    // Thresholds: Bronze=2000, Silver=5000, Gold=7500, Platinum=9000
    it('should return None for score 0', () => {
      expect(privacyModule.getTier(0)).toBe(ReputationTier.None)
    })

    it('should return None for scores below Bronze threshold (2000)', () => {
      expect(privacyModule.getTier(1)).toBe(ReputationTier.None)
      expect(privacyModule.getTier(1999)).toBe(ReputationTier.None)
    })

    it('should return Bronze for scores 2000-4999', () => {
      expect(privacyModule.getTier(2000)).toBe(ReputationTier.Bronze)
      expect(privacyModule.getTier(4999)).toBe(ReputationTier.Bronze)
    })

    it('should return Silver for scores 5000-7499', () => {
      expect(privacyModule.getTier(5000)).toBe(ReputationTier.Silver)
      expect(privacyModule.getTier(7499)).toBe(ReputationTier.Silver)
    })

    it('should return Gold for scores 7500-8999', () => {
      expect(privacyModule.getTier(7500)).toBe(ReputationTier.Gold)
      expect(privacyModule.getTier(8999)).toBe(ReputationTier.Gold)
    })

    it('should return Platinum for scores 9000+', () => {
      expect(privacyModule.getTier(9000)).toBe(ReputationTier.Platinum)
      expect(privacyModule.getTier(10000)).toBe(ReputationTier.Platinum)
    })
  })

  describe('getRange', () => {
    // Ranges: VeryLow=0-2000, Low=2000-5000, Medium=5000-7500, High=7500-9000, VeryHigh=9000-10000
    it('should return VeryLow for scores 0-1999', () => {
      expect(privacyModule.getRange(0)).toBe(ScoreRange.VeryLow)
      expect(privacyModule.getRange(1999)).toBe(ScoreRange.VeryLow)
    })

    it('should return Low for scores 2000-4999', () => {
      expect(privacyModule.getRange(2000)).toBe(ScoreRange.Low)
      expect(privacyModule.getRange(4999)).toBe(ScoreRange.Low)
    })

    it('should return Medium for scores 5000-7499', () => {
      expect(privacyModule.getRange(5000)).toBe(ScoreRange.Medium)
      expect(privacyModule.getRange(7499)).toBe(ScoreRange.Medium)
    })

    it('should return High for scores 7500-8999', () => {
      expect(privacyModule.getRange(7500)).toBe(ScoreRange.High)
      expect(privacyModule.getRange(8999)).toBe(ScoreRange.High)
    })

    it('should return VeryHigh for scores 9000+', () => {
      expect(privacyModule.getRange(9000)).toBe(ScoreRange.VeryHigh)
      expect(privacyModule.getRange(10000)).toBe(ScoreRange.VeryHigh)
    })
  })

  describe('validateSettings', () => {
    it('should validate valid settings', () => {
      const settings = {
        agent: testAgentAddress,
        mode: PrivacyMode.Public,
        metricVisibility: getDefaultMetricVisibility(PrivacyMode.Public),
        authorizedViewers: [],
        autoGrantClients: false,
        updatedAt: Date.now(),
      }

      const result = privacyModule.validateSettings(settings)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('getPrivacySettings', () => {
    it('should return default public settings', async () => {
      const settings = await privacyModule.getPrivacySettings(testAgentAddress)

      expect(settings).not.toBeNull()
      expect(settings?.mode).toBe(PrivacyMode.Public)
      expect(settings?.authorizedViewers).toEqual([])
      expect(settings?.autoGrantClients).toBe(false)
    })
  })
})

describe('Privacy Helper Functions', () => {
  const testAgentAddress = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' as Address
  const testViewerAddress = 'Viewer111111111111111111111111111111111111' as Address

  describe('calculateVisibleScore', () => {
    it('should show exact score in Public mode', () => {
      const result = calculateVisibleScore(7500, PrivacyMode.Public, false)

      expect(result.exactScore).toBe(7500)
      expect(result.tier).toBeDefined()
      expect(result.scoreRange).toBeDefined()
    })

    it('should only show tier in TierOnly mode', () => {
      const result = calculateVisibleScore(9500, PrivacyMode.TierOnly, false)

      expect(result.exactScore).toBeUndefined()
      expect(result.tier).toBe(ReputationTier.Platinum)
    })

    it('should only show scoreRange in RangeOnly mode', () => {
      const result = calculateVisibleScore(7500, PrivacyMode.RangeOnly, false)

      expect(result.exactScore).toBeUndefined()
      expect(result.scoreRange).toBe(ScoreRange.High)
    })

    it('should show exact score if viewer has access', () => {
      const result = calculateVisibleScore(7500, PrivacyMode.TierOnly, true)

      expect(result.exactScore).toBe(7500)
    })

    it('should hide all in Confidential mode without access', () => {
      const result = calculateVisibleScore(7500, PrivacyMode.Confidential, false)

      expect(result.exactScore).toBeUndefined()
      expect(result.tier).toBeUndefined()
      expect(result.scoreRange).toBeUndefined()
    })
  })

  describe('getReputationTier', () => {
    it('should map score 0 to None', () => {
      expect(getReputationTier(0)).toBe(ReputationTier.None)
    })

    it('should map score 1500 to None (below Bronze)', () => {
      expect(getReputationTier(1500)).toBe(ReputationTier.None)
    })

    it('should map score 3000 to Bronze', () => {
      expect(getReputationTier(3000)).toBe(ReputationTier.Bronze)
    })

    it('should map score 6000 to Silver', () => {
      expect(getReputationTier(6000)).toBe(ReputationTier.Silver)
    })

    it('should map score 8500 to Gold', () => {
      expect(getReputationTier(8500)).toBe(ReputationTier.Gold)
    })

    it('should map score 9500 to Platinum', () => {
      expect(getReputationTier(9500)).toBe(ReputationTier.Platinum)
    })
  })

  describe('getScoreRange', () => {
    it('should map score 500 to VeryLow', () => {
      expect(getScoreRange(500)).toBe(ScoreRange.VeryLow)
    })

    it('should map score 3000 to Low', () => {
      expect(getScoreRange(3000)).toBe(ScoreRange.Low)
    })

    it('should map score 6000 to Medium', () => {
      expect(getScoreRange(6000)).toBe(ScoreRange.Medium)
    })

    it('should map score 8000 to High', () => {
      expect(getScoreRange(8000)).toBe(ScoreRange.High)
    })

    it('should map score 9500 to VeryHigh', () => {
      expect(getScoreRange(9500)).toBe(ScoreRange.VeryHigh)
    })
  })

  describe('canViewerAccess', () => {
    it('should grant access if viewer is agent owner', () => {
      const settings = {
        agent: testAgentAddress,
        mode: PrivacyMode.Confidential,
        metricVisibility: getDefaultMetricVisibility(PrivacyMode.Confidential),
        authorizedViewers: [],
        autoGrantClients: false,
        updatedAt: Date.now(),
      }

      // Viewer is the agent owner
      expect(canViewerAccess(testAgentAddress, settings, testAgentAddress)).toBe(true)
    })

    it('should grant access if viewer is in authorized list', () => {
      const settings = {
        agent: testAgentAddress,
        mode: PrivacyMode.Confidential,
        metricVisibility: getDefaultMetricVisibility(PrivacyMode.Confidential),
        authorizedViewers: [testViewerAddress],
        autoGrantClients: false,
        updatedAt: Date.now(),
      }

      expect(canViewerAccess(testViewerAddress, settings, testAgentAddress)).toBe(true)
    })

    it('should deny access if viewer is not authorized', () => {
      const settings = {
        agent: testAgentAddress,
        mode: PrivacyMode.Confidential,
        metricVisibility: getDefaultMetricVisibility(PrivacyMode.Confidential),
        authorizedViewers: [],
        autoGrantClients: false,
        updatedAt: Date.now(),
      }

      expect(canViewerAccess(testViewerAddress, settings, testAgentAddress)).toBe(false)
    })
  })

  describe('filterMetricsByVisibility', () => {
    const mockData = {
      agent: testAgentAddress,
      overallScore: 7500,
      totalJobsCompleted: 100,
      totalJobsFailed: 5,
      avgResponseTime: 250,
      disputesAgainst: 2,
      disputesResolved: 2,
      totalEarnings: 50000,
      avgRating: 4.5,
      badges: ['FirstJob', 'TenJobs'],
    }

    it('should show exactScore with full access', () => {
      const visibility = getDefaultMetricVisibility(PrivacyMode.Public)
      const result = filterMetricsByVisibility(mockData, visibility, true)

      expect(result.exactScore).toBe(7500)
      expect(result.totalJobsCompleted).toBe(100)
      expect(result.totalEarnings).toBe(50000)
    })

    it('should hide private metrics without access', () => {
      const visibility = {
        ...getDefaultMetricVisibility(PrivacyMode.Public),
        showEarnings: VisibilityLevel.Private,
      }
      const result = filterMetricsByVisibility(mockData, visibility, false)

      expect(result.totalEarnings).toBeUndefined()
    })
  })

  describe('getDefaultMetricVisibility', () => {
    it('should return all Public for Public mode', () => {
      const visibility = getDefaultMetricVisibility(PrivacyMode.Public)

      expect(visibility.showScore).toBe(VisibilityLevel.Public)
      expect(visibility.showJobsCompleted).toBe(VisibilityLevel.Public)
      expect(visibility.showSuccessRate).toBe(VisibilityLevel.Public)
      expect(visibility.showResponseTime).toBe(VisibilityLevel.Public)
      expect(visibility.showDisputes).toBe(VisibilityLevel.Public)
      expect(visibility.showEarnings).toBe(VisibilityLevel.Public)
      expect(visibility.showRatings).toBe(VisibilityLevel.Public)
      expect(visibility.showBadges).toBe(VisibilityLevel.Public)
    })

    it('should return all ZKProof for Confidential mode', () => {
      const visibility = getDefaultMetricVisibility(PrivacyMode.Confidential)

      expect(visibility.showScore).toBe(VisibilityLevel.ZKProof)
      expect(visibility.showJobsCompleted).toBe(VisibilityLevel.ZKProof)
      expect(visibility.showEarnings).toBe(VisibilityLevel.ZKProof)
    })
  })

  describe('validatePrivacySettings', () => {
    it('should validate correct settings', () => {
      const settings = {
        agent: testAgentAddress,
        mode: PrivacyMode.Custom,
        metricVisibility: getDefaultMetricVisibility(PrivacyMode.Custom),
        authorizedViewers: [],
        autoGrantClients: true,
        updatedAt: Date.now(),
      }

      const result = validatePrivacySettings(settings)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})

describe('PrivacyMode enum', () => {
  it('should have all expected modes', () => {
    expect(PrivacyMode.Public).toBe('Public')
    expect(PrivacyMode.TierOnly).toBe('TierOnly')
    expect(PrivacyMode.RangeOnly).toBe('RangeOnly')
    expect(PrivacyMode.Custom).toBe('Custom')
    expect(PrivacyMode.Confidential).toBe('Confidential')
  })
})

describe('VisibilityLevel enum', () => {
  it('should have all expected levels', () => {
    expect(VisibilityLevel.Public).toBe('Public')
    expect(VisibilityLevel.Private).toBe('Private')
    expect(VisibilityLevel.ZKProof).toBe('ZKProof')
  })
})

describe('PrivacyPresets', () => {
  it('should have CONSERVATIVE preset', () => {
    expect(PrivacyPresets.CONSERVATIVE).toBeDefined()
    expect(PrivacyPresets.CONSERVATIVE.name).toBe('Conservative')
    expect(PrivacyPresets.CONSERVATIVE.mode).toBe(PrivacyMode.TierOnly)
  })

  it('should have BALANCED preset', () => {
    expect(PrivacyPresets.BALANCED).toBeDefined()
    expect(PrivacyPresets.BALANCED.name).toBe('Balanced')
    expect(PrivacyPresets.BALANCED.mode).toBe(PrivacyMode.Custom)
  })

  it('should have OPEN preset', () => {
    expect(PrivacyPresets.OPEN).toBeDefined()
    expect(PrivacyPresets.OPEN.name).toBe('Open')
    expect(PrivacyPresets.OPEN.mode).toBe(PrivacyMode.Public)
  })

  it('should have autoGrantClients enabled for balanced and open', () => {
    expect(PrivacyPresets.CONSERVATIVE.autoGrantClients).toBe(false)
    expect(PrivacyPresets.BALANCED.autoGrantClients).toBe(true)
    expect(PrivacyPresets.OPEN.autoGrantClients).toBe(true)
  })
})

describe('PRIVACY_CONSTANTS', () => {
  it('should have correct tier thresholds', () => {
    expect(PRIVACY_CONSTANTS.TIER_THRESHOLDS.BRONZE).toBe(2000)
    expect(PRIVACY_CONSTANTS.TIER_THRESHOLDS.SILVER).toBe(5000)
    expect(PRIVACY_CONSTANTS.TIER_THRESHOLDS.GOLD).toBe(7500)
    expect(PRIVACY_CONSTANTS.TIER_THRESHOLDS.PLATINUM).toBe(9000)
  })

  it('should have correct score ranges', () => {
    expect(PRIVACY_CONSTANTS.SCORE_RANGES.VERY_LOW.min).toBe(0)
    expect(PRIVACY_CONSTANTS.SCORE_RANGES.LOW.min).toBe(2000)
    expect(PRIVACY_CONSTANTS.SCORE_RANGES.MEDIUM.min).toBe(5000)
    expect(PRIVACY_CONSTANTS.SCORE_RANGES.HIGH.min).toBe(7500)
    expect(PRIVACY_CONSTANTS.SCORE_RANGES.VERY_HIGH.min).toBe(9000)
  })

  it('should have max authorized viewers limit', () => {
    expect(PRIVACY_CONSTANTS.MAX_AUTHORIZED_VIEWERS).toBe(100)
  })
})
