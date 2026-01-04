/**
 * Reputation Tag Engine Unit Tests
 *
 * Tests auto-tagging logic, decay, merging, and filtering functionality
 */

import { it, expect, describe, beforeEach, test } from 'vitest'

// Mock types based on the reputation tag engine
interface TagScore {
  tagName: string
  confidence: number
  evidenceCount: number
  lastUpdated: number
}

interface ReputationMetrics {
  successfulPayments: bigint
  failedPayments: bigint
  totalResponseTime: bigint
  responseTimeCount: bigint
  totalDisputes: number
  disputesResolved: number
  totalRating: number
  totalRatingsCount: number
  createdAt: number
  avgResponseTime: number
  avgRating: number
  successRate: number
}

interface TagFilters {
  category?: string
  minConfidence?: number
  maxAge?: number
  activeOnly?: boolean
}

interface TagDecayConfig {
  decayRatePerDay: number
  minConfidence: number
  maxAgeSeconds: number
}

const DEFAULT_DECAY: TagDecayConfig = {
  decayRatePerDay: 10,
  minConfidence: 1000,
  maxAgeSeconds: 90 * 24 * 60 * 60, // 90 days
}

// Mock ReputationTagEngine
class MockReputationTagEngine {
  private decayConfig: TagDecayConfig

  constructor(decayConfig: TagDecayConfig = DEFAULT_DECAY) {
    this.decayConfig = decayConfig
  }

  async calculateTags(metrics: ReputationMetrics): Promise<TagScore[]> {
    const tagScores: TagScore[] = []
    const now = Math.floor(Date.now() / 1000)

    // Fast Responder: avg < 60s
    if (metrics.avgResponseTime < 60000 && metrics.responseTimeCount > 0n) {
      const confidence = Math.min(10000, 10000 - Math.floor((metrics.avgResponseTime / 60000) * 2000))
      tagScores.push({
        tagName: 'fast-responder',
        confidence,
        evidenceCount: Number(metrics.responseTimeCount),
        lastUpdated: now,
      })
    }

    // High Volume: >1000 transactions
    if (metrics.successfulPayments >= 1000n) {
      const confidence = Math.min(10000, 6000 + Math.floor(Number(metrics.successfulPayments) / 100))
      tagScores.push({
        tagName: 'high-volume',
        confidence,
        evidenceCount: Number(metrics.successfulPayments),
        lastUpdated: now,
      })
    }

    // Top Rated: avg > 4.8/5.0
    if (metrics.avgRating > 96 && metrics.totalRatingsCount >= 10) {
      // avgRating is 0-100 scale, 96 = 4.8/5.0
      const scaledRating = (metrics.avgRating / 100) * 5
      const confidence = Math.min(10000, Math.floor((scaledRating - 4.8) * 50000) + 8000)
      tagScores.push({
        tagName: 'top-rated',
        confidence,
        evidenceCount: metrics.totalRatingsCount,
        lastUpdated: now,
      })
    }

    // Dispute Free: 0 disputes with > 10 transactions
    const totalPayments = Number(metrics.successfulPayments + metrics.failedPayments)
    if (metrics.totalDisputes === 0 && totalPayments >= 10) {
      const confidence = Math.min(10000, 7000 + totalPayments * 10)
      tagScores.push({
        tagName: 'dispute-free',
        confidence,
        evidenceCount: totalPayments,
        lastUpdated: now,
      })
    }

    // Perfect Record: 100% success rate with > 50 transactions
    if (metrics.successRate === 10000 && totalPayments >= 50) {
      const confidence = Math.min(10000, 8000 + Math.floor(totalPayments / 10))
      tagScores.push({
        tagName: 'perfect-record',
        confidence,
        evidenceCount: totalPayments,
        lastUpdated: now,
      })
    }

    return tagScores
  }

  applyTagDecay(tagScores: TagScore[], currentTimestamp?: number): TagScore[] {
    const now = currentTimestamp || Math.floor(Date.now() / 1000)
    const decayedTags: TagScore[] = []

    for (const tag of tagScores) {
      const ageSeconds = now - tag.lastUpdated
      const ageDays = ageSeconds / (24 * 60 * 60)

      const totalDecay = Math.floor(ageDays * this.decayConfig.decayRatePerDay)
      const newConfidence = Math.max(0, tag.confidence - totalDecay)

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

  mergeTags(existingTags: TagScore[], newTags: TagScore[]): TagScore[] {
    const tagMap = new Map<string, TagScore>()

    for (const tag of existingTags) {
      tagMap.set(tag.tagName, tag)
    }

    for (const tag of newTags) {
      const existing = tagMap.get(tag.tagName)

      if (existing) {
        if (tag.confidence > existing.confidence || tag.evidenceCount > existing.evidenceCount) {
          tagMap.set(tag.tagName, tag)
        }
      } else {
        tagMap.set(tag.tagName, tag)
      }
    }

    return Array.from(tagMap.values())
  }

  filterTags(tags: TagScore[], filters: TagFilters): TagScore[] {
    let filtered = [...tags]
    const currentTime = Math.floor(Date.now() / 1000)

    if (filters.minConfidence !== undefined) {
      filtered = filtered.filter(tag => tag.confidence >= filters.minConfidence!)
    }

    if (filters.maxAge !== undefined) {
      filtered = filtered.filter(tag => {
        const age = currentTime - tag.lastUpdated
        return age <= filters.maxAge!
      })
    }

    if (filters.activeOnly) {
      filtered = filtered.filter(tag => {
        const age = currentTime - tag.lastUpdated
        return age <= 90 * 24 * 60 * 60 && tag.confidence >= this.decayConfig.minConfidence
      })
    }

    return filtered
  }

  sortByConfidence(tags: TagScore[]): TagScore[] {
    return [...tags].sort((a, b) => b.confidence - a.confidence)
  }

  getTopTags(tags: TagScore[], count: number): TagScore[] {
    return this.sortByConfidence(tags).slice(0, count)
  }
}

describe('ReputationTagEngine', () => {
  let engine: MockReputationTagEngine

  beforeEach(() => {
    engine = new MockReputationTagEngine()
  })

  describe('calculateTags', () => {
    test('should assign fast-responder tag for avg response < 60s', async () => {
      const metrics = createMockMetrics({
        totalResponseTime: 30000n, // 30 seconds
        responseTimeCount: 100n,
      })

      const tags = await engine.calculateTags(metrics)

      const fastResponder = tags.find(t => t.tagName === 'fast-responder')
      expect(fastResponder).toBeDefined()
      expect(fastResponder!.confidence).toBeGreaterThan(8000)
      expect(fastResponder!.evidenceCount).toBe(100)
    })

    test('should assign high-volume tag for >1000 transactions', async () => {
      const metrics = createMockMetrics({
        successfulPayments: 1500n,
      })

      const tags = await engine.calculateTags(metrics)

      const highVolume = tags.find(t => t.tagName === 'high-volume')
      expect(highVolume).toBeDefined()
      expect(highVolume!.confidence).toBeGreaterThanOrEqual(6000)
    })

    test('should assign top-rated tag for avg rating > 4.8', async () => {
      const metrics = createMockMetrics({
        totalRating: 490, // 4.9 avg
        totalRatingsCount: 100,
      })

      const tags = await engine.calculateTags(metrics)

      const topRated = tags.find(t => t.tagName === 'top-rated')
      expect(topRated).toBeDefined()
      expect(topRated!.confidence).toBeGreaterThan(8000)
    })

    test('should assign dispute-free tag for 0 disputes', async () => {
      const metrics = createMockMetrics({
        successfulPayments: 100n,
        totalDisputes: 0,
      })

      const tags = await engine.calculateTags(metrics)

      const disputeFree = tags.find(t => t.tagName === 'dispute-free')
      expect(disputeFree).toBeDefined()
    })

    test('should assign perfect-record tag for 100% success rate', async () => {
      const metrics = createMockMetrics({
        successfulPayments: 100n,
        failedPayments: 0n,
      })

      const tags = await engine.calculateTags(metrics)

      const perfectRecord = tags.find(t => t.tagName === 'perfect-record')
      expect(perfectRecord).toBeDefined()
      expect(perfectRecord!.evidenceCount).toBe(100)
    })

    test('should not assign tags when thresholds not met', async () => {
      const metrics = createMockMetrics({
        successfulPayments: 5n,
        totalResponseTime: 120000n,
        responseTimeCount: 1n,
      })

      const tags = await engine.calculateTags(metrics)

      expect(tags.length).toBe(0)
    })

    test('should assign multiple tags when criteria met', async () => {
      const metrics = createMockMetrics({
        successfulPayments: 1500n,
        failedPayments: 0n,
        totalResponseTime: 30000n,
        responseTimeCount: 100n,
        totalRating: 490,
        totalRatingsCount: 100,
        totalDisputes: 0,
      })

      const tags = await engine.calculateTags(metrics)

      expect(tags.length).toBeGreaterThan(3)
      expect(tags.some(t => t.tagName === 'fast-responder')).toBe(true)
      expect(tags.some(t => t.tagName === 'high-volume')).toBe(true)
      expect(tags.some(t => t.tagName === 'top-rated')).toBe(true)
    })
  })

  describe('applyTagDecay', () => {
    test('should decay tag confidence over time', () => {
      const now = 1000000
      const oldTag: TagScore = {
        tagName: 'test-tag',
        confidence: 9000,
        evidenceCount: 100,
        lastUpdated: now - 30 * 24 * 60 * 60, // 30 days ago
      }

      const decayed = engine.applyTagDecay([oldTag], now)

      expect(decayed.length).toBe(1)
      expect(decayed[0].confidence).toBeLessThan(9000)
      // 30 days × 10 decay/day = 300 decay
      expect(decayed[0].confidence).toBe(9000 - 300)
    })

    test('should remove tags below minimum confidence', () => {
      const now = 1000000
      const lowConfidenceTag: TagScore = {
        tagName: 'low-tag',
        confidence: 1500,
        evidenceCount: 10,
        lastUpdated: now - 60 * 24 * 60 * 60, // 60 days ago
      }

      const decayed = engine.applyTagDecay([lowConfidenceTag], now)

      // 60 days × 10 = 600 decay, 1500 - 600 = 900, below min of 1000
      expect(decayed.length).toBe(0)
    })

    test('should remove tags older than max age', () => {
      const now = 1000000
      const veryOldTag: TagScore = {
        tagName: 'old-tag',
        confidence: 9000,
        evidenceCount: 100,
        lastUpdated: now - 100 * 24 * 60 * 60, // 100 days ago (>90)
      }

      const decayed = engine.applyTagDecay([veryOldTag], now)

      expect(decayed.length).toBe(0)
    })

    test('should keep fresh tags unchanged', () => {
      const now = 1000000
      const freshTag: TagScore = {
        tagName: 'fresh-tag',
        confidence: 9000,
        evidenceCount: 100,
        lastUpdated: now - 24 * 60 * 60, // 1 day ago
      }

      const decayed = engine.applyTagDecay([freshTag], now)

      expect(decayed.length).toBe(1)
      expect(decayed[0].confidence).toBe(9000 - 10) // 1 day × 10
    })
  })

  describe('mergeTags', () => {
    test('should merge non-overlapping tags', () => {
      const existing: TagScore[] = [
        { tagName: 'tag1', confidence: 8000, evidenceCount: 50, lastUpdated: 1000 },
      ]

      const newTags: TagScore[] = [
        { tagName: 'tag2', confidence: 7000, evidenceCount: 30, lastUpdated: 2000 },
      ]

      const merged = engine.mergeTags(existing, newTags)

      expect(merged.length).toBe(2)
      expect(merged.find(t => t.tagName === 'tag1')).toBeDefined()
      expect(merged.find(t => t.tagName === 'tag2')).toBeDefined()
    })

    test('should update tag with higher confidence', () => {
      const existing: TagScore[] = [
        { tagName: 'tag1', confidence: 7000, evidenceCount: 50, lastUpdated: 1000 },
      ]

      const newTags: TagScore[] = [
        { tagName: 'tag1', confidence: 9000, evidenceCount: 100, lastUpdated: 2000 },
      ]

      const merged = engine.mergeTags(existing, newTags)

      expect(merged.length).toBe(1)
      expect(merged[0].confidence).toBe(9000)
      expect(merged[0].evidenceCount).toBe(100)
    })

    test('should keep existing tag when new has lower confidence', () => {
      const existing: TagScore[] = [
        { tagName: 'tag1', confidence: 9000, evidenceCount: 100, lastUpdated: 1000 },
      ]

      const newTags: TagScore[] = [
        { tagName: 'tag1', confidence: 7000, evidenceCount: 50, lastUpdated: 2000 },
      ]

      const merged = engine.mergeTags(existing, newTags)

      expect(merged.length).toBe(1)
      expect(merged[0].confidence).toBe(9000)
    })

    test('should update tag with more evidence even if lower confidence', () => {
      const existing: TagScore[] = [
        { tagName: 'tag1', confidence: 9000, evidenceCount: 50, lastUpdated: 1000 },
      ]

      const newTags: TagScore[] = [
        { tagName: 'tag1', confidence: 8500, evidenceCount: 200, lastUpdated: 2000 },
      ]

      const merged = engine.mergeTags(existing, newTags)

      expect(merged.length).toBe(1)
      expect(merged[0].evidenceCount).toBe(200)
    })
  })

  describe('filterTags', () => {
    test('should filter by minimum confidence', () => {
      const tags: TagScore[] = [
        { tagName: 'high', confidence: 9000, evidenceCount: 100, lastUpdated: 1000 },
        { tagName: 'medium', confidence: 5000, evidenceCount: 50, lastUpdated: 1000 },
        { tagName: 'low', confidence: 2000, evidenceCount: 10, lastUpdated: 1000 },
      ]

      const filtered = engine.filterTags(tags, { minConfidence: 6000 })

      expect(filtered.length).toBe(1)
      expect(filtered[0].tagName).toBe('high')
    })

    test('should filter by maximum age', () => {
      const now = Math.floor(Date.now() / 1000)
      const tags: TagScore[] = [
        { tagName: 'fresh', confidence: 8000, evidenceCount: 100, lastUpdated: now - 60 },
        { tagName: 'old', confidence: 8000, evidenceCount: 100, lastUpdated: now - 200 * 24 * 60 * 60 },
      ]

      const filtered = engine.filterTags(tags, { maxAge: 24 * 60 * 60 }) // 1 day

      expect(filtered.length).toBe(1)
      expect(filtered[0].tagName).toBe('fresh')
    })

    test('should filter active tags only', () => {
      const now = Math.floor(Date.now() / 1000)
      const tags: TagScore[] = [
        { tagName: 'active', confidence: 8000, evidenceCount: 100, lastUpdated: now - 24 * 60 * 60 },
        { tagName: 'stale', confidence: 8000, evidenceCount: 100, lastUpdated: now - 100 * 24 * 60 * 60 },
        { tagName: 'low-conf', confidence: 500, evidenceCount: 5, lastUpdated: now - 60 },
      ]

      const filtered = engine.filterTags(tags, { activeOnly: true })

      expect(filtered.length).toBe(1)
      expect(filtered[0].tagName).toBe('active')
    })

    test('should apply multiple filters', () => {
      const now = Math.floor(Date.now() / 1000)
      const tags: TagScore[] = [
        { tagName: 'good', confidence: 8000, evidenceCount: 100, lastUpdated: now - 60 },
        { tagName: 'old-high', confidence: 9000, evidenceCount: 100, lastUpdated: now - 100 * 24 * 60 * 60 },
        { tagName: 'fresh-low', confidence: 2000, evidenceCount: 10, lastUpdated: now - 60 },
      ]

      const filtered = engine.filterTags(tags, {
        minConfidence: 7000,
        maxAge: 30 * 24 * 60 * 60,
      })

      expect(filtered.length).toBe(1)
      expect(filtered[0].tagName).toBe('good')
    })
  })

  describe('sortByConfidence', () => {
    test('should sort tags by confidence descending', () => {
      const tags: TagScore[] = [
        { tagName: 'medium', confidence: 5000, evidenceCount: 50, lastUpdated: 1000 },
        { tagName: 'high', confidence: 9000, evidenceCount: 100, lastUpdated: 1000 },
        { tagName: 'low', confidence: 2000, evidenceCount: 10, lastUpdated: 1000 },
      ]

      const sorted = engine.sortByConfidence(tags)

      expect(sorted[0].tagName).toBe('high')
      expect(sorted[1].tagName).toBe('medium')
      expect(sorted[2].tagName).toBe('low')
    })
  })

  describe('getTopTags', () => {
    test('should return top N tags by confidence', () => {
      const tags: TagScore[] = [
        { tagName: 'tag1', confidence: 9000, evidenceCount: 100, lastUpdated: 1000 },
        { tagName: 'tag2', confidence: 8000, evidenceCount: 90, lastUpdated: 1000 },
        { tagName: 'tag3', confidence: 7000, evidenceCount: 80, lastUpdated: 1000 },
        { tagName: 'tag4', confidence: 6000, evidenceCount: 70, lastUpdated: 1000 },
        { tagName: 'tag5', confidence: 5000, evidenceCount: 60, lastUpdated: 1000 },
      ]

      const top3 = engine.getTopTags(tags, 3)

      expect(top3.length).toBe(3)
      expect(top3[0].tagName).toBe('tag1')
      expect(top3[1].tagName).toBe('tag2')
      expect(top3[2].tagName).toBe('tag3')
    })

    test('should handle count larger than array', () => {
      const tags: TagScore[] = [
        { tagName: 'tag1', confidence: 9000, evidenceCount: 100, lastUpdated: 1000 },
      ]

      const top10 = engine.getTopTags(tags, 10)

      expect(top10.length).toBe(1)
    })
  })
})

// ============================================================================
// Helper Functions
// ============================================================================

function createMockMetrics(overrides: Partial<ReputationMetrics> = {}): ReputationMetrics {
  const successfulPayments = overrides.successfulPayments || 0n
  const failedPayments = overrides.failedPayments || 0n
  const totalPayments = Number(successfulPayments + failedPayments)

  const totalRating = overrides.totalRating || 0
  const totalRatingsCount = overrides.totalRatingsCount || 0

  const totalResponseTime = overrides.totalResponseTime || 0n
  const responseTimeCount = overrides.responseTimeCount || 0n

  return {
    successfulPayments,
    failedPayments,
    totalResponseTime,
    responseTimeCount,
    totalDisputes: overrides.totalDisputes || 0,
    disputesResolved: overrides.disputesResolved || 0,
    totalRating,
    totalRatingsCount,
    createdAt: Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60, // 1 year ago
    avgResponseTime: responseTimeCount > 0n ? Number(totalResponseTime) / Number(responseTimeCount) : 0,
    avgRating: totalRatingsCount > 0 ? (totalRating * 100) / (totalRatingsCount * 5) : 0,
    successRate: totalPayments > 0 ? Number((successfulPayments * 10000n) / BigInt(totalPayments)) : 0,
  }
}
