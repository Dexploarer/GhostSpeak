/**
 * Badge Definitions Tests
 *
 * Unit tests for lib/badges/definitions.ts badge definitions.
 * Validates badge structure, types, and data integrity.
 */

import { describe, it, expect } from 'vitest'
import type { LucideIcon } from 'lucide-react'
import {
  BADGE_DEFINITIONS,
  type BadgeDefinition,
} from '../../../../apps/web/lib/badges/definitions'

// ============================================================================
// Badge Definition Structure Tests
// ============================================================================

describe('BADGE_DEFINITIONS', () => {
  describe('structure validation', () => {
    it('should have all required properties for each badge', () => {
      Object.values(BADGE_DEFINITIONS).forEach((badge: any) => {
        expect(badge).toHaveProperty('id')
        expect(badge).toHaveProperty('name')
        expect(badge).toHaveProperty('description')
        expect(badge).toHaveProperty('howToGet')
        expect(badge).toHaveProperty('meaning')
        expect(badge).toHaveProperty('icon')
        expect(badge).toHaveProperty('rarity')
        expect(badge).toHaveProperty('type')
      })
    })

    it('should have id matching the key', () => {
      Object.entries(BADGE_DEFINITIONS).forEach(([key, badge]: [string, any]) => {
        expect(badge.id).toBe(key)
      })
    })

    it('should have non-empty string values for text properties', () => {
      Object.values(BADGE_DEFINITIONS).forEach((badge: any) => {
        expect(typeof badge.name).toBe('string')
        expect(badge.name.length).toBeGreaterThan(0)

        expect(typeof badge.description).toBe('string')
        expect(badge.description.length).toBeGreaterThan(0)

        expect(typeof badge.howToGet).toBe('string')
        expect(badge.howToGet.length).toBeGreaterThan(0)

        expect(typeof badge.meaning).toBe('string')
        expect(badge.meaning.length).toBeGreaterThan(0)
      })
    })
  })

  describe('rarity validation', () => {
    const validRarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']

    it('should have valid rarity values', () => {
      Object.values(BADGE_DEFINITIONS).forEach((badge: any) => {
        expect(validRarities).toContain(badge.rarity)
      })
    })

    it('should have LEGENDARY rarity for top-tier badges', () => {
      expect(BADGE_DEFINITIONS.DIAMOND_TIER.rarity).toBe('LEGENDARY')
      expect(BADGE_DEFINITIONS.WHALE_STAKER.rarity).toBe('LEGENDARY')
      expect(BADGE_DEFINITIONS.PERFECT_PERFORMER.rarity).toBe('LEGENDARY')
      expect(BADGE_DEFINITIONS.TEE_ATTESTATION.rarity).toBe('LEGENDARY')
    })

    it('should have EPIC rarity for high-tier badges', () => {
      expect(BADGE_DEFINITIONS.PLATINUM_TIER.rarity).toBe('EPIC')
      expect(BADGE_DEFINITIONS.THOUSAND_JOBS.rarity).toBe('EPIC')
      expect(BADGE_DEFINITIONS.MAJOR_STAKER.rarity).toBe('EPIC')
    })

    it('should have RARE rarity for notable achievements', () => {
      expect(BADGE_DEFINITIONS.GOLD_TIER.rarity).toBe('RARE')
      expect(BADGE_DEFINITIONS.HUNDRED_JOBS.rarity).toBe('RARE')
      expect(BADGE_DEFINITIONS.COMMITTED_STAKER.rarity).toBe('RARE')
      expect(BADGE_DEFINITIONS.VERIFIED_AGENT.rarity).toBe('RARE')
      expect(BADGE_DEFINITIONS.CAPABILITY_VERIFIED.rarity).toBe('RARE')
    })

    it('should have COMMON rarity for entry-level badges', () => {
      expect(BADGE_DEFINITIONS.BRONZE_TIER.rarity).toBe('COMMON')
      expect(BADGE_DEFINITIONS.TEN_JOBS.rarity).toBe('COMMON')
      expect(BADGE_DEFINITIONS.AGENT_IDENTITY.rarity).toBe('COMMON')
    })
  })

  describe('type validation', () => {
    it('should have valid type values (ACHIEVEMENT or CREDENTIAL)', () => {
      Object.values(BADGE_DEFINITIONS).forEach((badge: any) => {
        expect(['ACHIEVEMENT', 'CREDENTIAL']).toContain(badge.type)
      })
    })

    it('should have ACHIEVEMENT type for tier badges', () => {
      expect(BADGE_DEFINITIONS.DIAMOND_TIER.type).toBe('ACHIEVEMENT')
      expect(BADGE_DEFINITIONS.PLATINUM_TIER.type).toBe('ACHIEVEMENT')
      expect(BADGE_DEFINITIONS.GOLD_TIER.type).toBe('ACHIEVEMENT')
      expect(BADGE_DEFINITIONS.SILVER_TIER.type).toBe('ACHIEVEMENT')
      expect(BADGE_DEFINITIONS.BRONZE_TIER.type).toBe('ACHIEVEMENT')
    })

    it('should have CREDENTIAL type for verifiable credentials', () => {
      expect(BADGE_DEFINITIONS.AGENT_IDENTITY.type).toBe('CREDENTIAL')
      expect(BADGE_DEFINITIONS.CAPABILITY_VERIFIED.type).toBe('CREDENTIAL')
      expect(BADGE_DEFINITIONS.TEE_ATTESTATION.type).toBe('CREDENTIAL')
      expect(BADGE_DEFINITIONS.UPTIME_ATTESTATION.type).toBe('CREDENTIAL')
    })
  })

  describe('icon validation', () => {
    it('should have icon component defined', () => {
      Object.values(BADGE_DEFINITIONS).forEach((badge: any) => {
        expect(badge.icon).toBeDefined()
        // Icons are React component objects
        expect(typeof badge.icon).toBe('object')
      })
    })
  })

  describe('badge count validation', () => {
    it('should have expected number of tier badges', () => {
      const tierBadges = Object.keys(BADGE_DEFINITIONS).filter((key) => key.endsWith('_TIER'))
      expect(tierBadges).toHaveLength(5)
    })

    it('should have expected number of job milestone badges', () => {
      const jobBadges = Object.keys(BADGE_DEFINITIONS).filter((key) => key.includes('_JOBS'))
      expect(jobBadges).toHaveLength(3)
    })

    it('should have expected number of staking badges', () => {
      const stakingBadges = Object.keys(BADGE_DEFINITIONS).filter((key) => key.includes('_STAKER'))
      expect(stakingBadges).toHaveLength(3)
    })
  })
})

// ============================================================================
// Specific Badge Content Tests
// ============================================================================

describe('Tier Badge Content', () => {
  it('DIAMOND_TIER should describe top 0.1% status', () => {
    const badge = BADGE_DEFINITIONS.DIAMOND_TIER
    expect(badge.description).toContain('pinnacle')
    expect(badge.howToGet).toContain('9500')
  })

  it('PLATINUM_TIER should describe elite status', () => {
    const badge = BADGE_DEFINITIONS.PLATINUM_TIER
    expect(badge.description).toContain('Elite')
    expect(badge.howToGet).toContain('9000')
    expect(badge.howToGet).toContain('9499')
  })

  it('GOLD_TIER should describe high reputation', () => {
    const badge = BADGE_DEFINITIONS.GOLD_TIER
    expect(badge.description).toContain('High')
    expect(badge.howToGet).toContain('7500')
    expect(badge.howToGet).toContain('8999')
  })

  it('SILVER_TIER should describe established status', () => {
    const badge = BADGE_DEFINITIONS.SILVER_TIER
    expect(badge.description).toContain('Established')
    expect(badge.howToGet).toContain('5000')
    expect(badge.howToGet).toContain('7499')
  })

  it('BRONZE_TIER should describe developing status', () => {
    const badge = BADGE_DEFINITIONS.BRONZE_TIER
    expect(badge.description).toContain('Developing')
    expect(badge.howToGet).toContain('2000')
    expect(badge.howToGet).toContain('4999')
  })
})

describe('Activity Milestone Badge Content', () => {
  it('THOUSAND_JOBS should require 1000+ transactions', () => {
    const badge = BADGE_DEFINITIONS.THOUSAND_JOBS
    expect(badge.howToGet).toContain('1,000')
    expect(badge.description).toContain('1,000')
  })

  it('HUNDRED_JOBS should require 100+ transactions', () => {
    const badge = BADGE_DEFINITIONS.HUNDRED_JOBS
    expect(badge.howToGet).toContain('100')
    expect(badge.description).toContain('100')
  })

  it('TEN_JOBS should require 10+ transactions', () => {
    const badge = BADGE_DEFINITIONS.TEN_JOBS
    expect(badge.howToGet).toContain('10')
    expect(badge.description).toContain('10')
  })
})

describe('Staking Badge Content', () => {
  it('WHALE_STAKER should require 50,000+ GHOST', () => {
    const badge = BADGE_DEFINITIONS.WHALE_STAKER
    expect(badge.howToGet).toContain('50,000')
    expect(badge.meaning).toContain('economic')
  })

  it('MAJOR_STAKER should require 10,000+ GHOST', () => {
    const badge = BADGE_DEFINITIONS.MAJOR_STAKER
    expect(badge.howToGet).toContain('10,000')
  })

  it('COMMITTED_STAKER should require 1,000+ GHOST', () => {
    const badge = BADGE_DEFINITIONS.COMMITTED_STAKER
    expect(badge.howToGet).toContain('1,000')
  })
})

describe('Special Badge Content', () => {
  it('PERFECT_PERFORMER should require 99%+ success rate', () => {
    const badge = BADGE_DEFINITIONS.PERFECT_PERFORMER
    expect(badge.howToGet).toContain('99%')
    expect(badge.rarity).toBe('LEGENDARY')
  })

  it('VERIFIED_AGENT should require 90%+ confidence', () => {
    const badge = BADGE_DEFINITIONS.VERIFIED_AGENT
    expect(badge.howToGet).toContain('90%')
    expect(badge.rarity).toBe('RARE')
  })
})

describe('Credential Badge Content', () => {
  it('TEE_ATTESTATION should describe hardware security', () => {
    const badge = BADGE_DEFINITIONS.TEE_ATTESTATION
    expect(badge.description).toContain('Trusted Execution Environment')
    expect(badge.meaning).toContain('hardware-protected')
    expect(badge.rarity).toBe('LEGENDARY')
  })

  it('CAPABILITY_VERIFIED should describe capability proof', () => {
    const badge = BADGE_DEFINITIONS.CAPABILITY_VERIFIED
    expect(badge.description).toContain('Proof of claimed capabilities')
    expect(badge.meaning).toContain('actually do')
  })

  it('UPTIME_ATTESTATION should describe availability proof', () => {
    const badge = BADGE_DEFINITIONS.UPTIME_ATTESTATION
    expect(badge.description).toContain('consistent availability')
    expect(badge.howToGet).toContain('30 days')
  })
})

// ============================================================================
// BadgeDefinition Interface Tests
// ============================================================================

describe('BadgeDefinition interface compliance', () => {
  it('should match BadgeDefinition interface structure', () => {
    const testBadge: BadgeDefinition = {
      id: 'TEST_BADGE',
      name: 'Test Badge',
      description: 'A test badge for validation',
      howToGet: 'Complete the test',
      meaning: 'This is a test',
      icon: (() => null) as unknown as LucideIcon,
      rarity: 'COMMON',
      type: 'ACHIEVEMENT',
    }

    expect(testBadge.id).toBe('TEST_BADGE')
    expect(testBadge.rarity).toBe('COMMON')
    expect(testBadge.type).toBe('ACHIEVEMENT')
  })
})
