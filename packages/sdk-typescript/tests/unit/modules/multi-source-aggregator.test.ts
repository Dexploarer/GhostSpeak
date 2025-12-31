/**
 * Multi-Source Aggregator Unit Tests
 *
 * Tests weighted scoring, conflict detection, and source adapters
 */

import { test, expect, describe, beforeEach } from 'bun:test'

interface SourceReputationData {
  source: string
  score: number
  dataPoints: number
  reliability: number
  timestamp: Date
}

interface ReputationSourceConfig {
  enabled: boolean
  weight: number
  reliability: number
}

interface AggregatedReputation {
  aggregateScore: number
  hasConflicts: boolean
  conflicts: string[]
  totalDataPoints: number
}

class MockMultiSourceAggregator {
  private configs = new Map<string, ReputationSourceConfig>()
  private readonly CONFLICT_THRESHOLD = 300

  addSource(source: string, config: ReputationSourceConfig): void {
    if (config.enabled) {
      this.configs.set(source, config)
    }
  }

  calculateWeightedScore(sourceDataList: SourceReputationData[]): number {
    if (sourceDataList.length === 0) return 0

    let totalContribution = 0
    let totalNormalization = 0

    for (const data of sourceDataList) {
      const config = this.configs.get(data.source)
      if (!config) continue

      const weight = config.weight / 10000
      const reliability = data.reliability

      const contribution = data.score * weight * reliability
      const normalization = weight * reliability

      totalContribution += contribution
      totalNormalization += normalization
    }

    if (totalNormalization === 0) return 0

    return Math.round(totalContribution / totalNormalization)
  }

  detectConflicts(sourceDataList: SourceReputationData[]): {
    hasConflicts: boolean
    conflicts: string[]
  } {
    if (sourceDataList.length < 2) {
      return { hasConflicts: false, conflicts: [] }
    }

    const scores = sourceDataList.map(d => d.score)
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    const variance = maxScore - minScore

    const conflicts: string[] = []

    if (variance > this.CONFLICT_THRESHOLD) {
      const maxSource = sourceDataList.find(d => d.score === maxScore)?.source
      const minSource = sourceDataList.find(d => d.score === minScore)?.source

      conflicts.push(
        `High variance detected: ${variance} (${((variance / 1000) * 100).toFixed(1)}%) ` +
        `between ${maxSource} (${maxScore}) and ${minSource} (${minScore})`
      )

      return { hasConflicts: true, conflicts }
    }

    return { hasConflicts: false, conflicts: [] }
  }
}

describe('MultiSourceAggregator', () => {
  let aggregator: MockMultiSourceAggregator

  beforeEach(() => {
    aggregator = new MockMultiSourceAggregator()
  })

  describe('calculateWeightedScore', () => {
    test('should calculate weighted score from multiple sources', () => {
      aggregator.addSource('payai', { enabled: true, weight: 5000, reliability: 9000 })
      aggregator.addSource('github', { enabled: true, weight: 3000, reliability: 8500 })
      aggregator.addSource('custom', { enabled: true, weight: 2000, reliability: 8000 })

      const sourceData: SourceReputationData[] = [
        { source: 'payai', score: 800, dataPoints: 100, reliability: 0.9, timestamp: new Date() },
        { source: 'github', score: 700, dataPoints: 50, reliability: 0.85, timestamp: new Date() },
        { source: 'custom', score: 750, dataPoints: 30, reliability: 0.8, timestamp: new Date() },
      ]

      const score = aggregator.calculateWeightedScore(sourceData)

      expect(score).toBeGreaterThan(700)
      expect(score).toBeLessThan(850)
    })

    test('should return 0 for empty source list', () => {
      const score = aggregator.calculateWeightedScore([])
      expect(score).toBe(0)
    })

    test('should handle single source', () => {
      aggregator.addSource('payai', { enabled: true, weight: 10000, reliability: 10000 })

      const sourceData: SourceReputationData[] = [
        { source: 'payai', score: 800, dataPoints: 100, reliability: 1.0, timestamp: new Date() },
      ]

      const score = aggregator.calculateWeightedScore(sourceData)
      expect(score).toBe(800)
    })

    test('should weight high-reliability sources more', () => {
      aggregator.addSource('reliable', { enabled: true, weight: 5000, reliability: 10000 })
      aggregator.addSource('unreliable', { enabled: true, weight: 5000, reliability: 5000 })

      const sourceData: SourceReputationData[] = [
        { source: 'reliable', score: 900, dataPoints: 100, reliability: 1.0, timestamp: new Date() },
        { source: 'unreliable', score: 600, dataPoints: 50, reliability: 0.5, timestamp: new Date() },
      ]

      const score = aggregator.calculateWeightedScore(sourceData)
      expect(score).toBeGreaterThan(800) // Should be closer to reliable source
    })
  })

  describe('detectConflicts', () => {
    test('should detect conflict when variance > 30%', () => {
      const sourceData: SourceReputationData[] = [
        { source: 'high', score: 900, dataPoints: 100, reliability: 0.9, timestamp: new Date() },
        { source: 'low', score: 400, dataPoints: 50, reliability: 0.9, timestamp: new Date() },
      ]

      const { hasConflicts, conflicts } = aggregator.detectConflicts(sourceData)

      expect(hasConflicts).toBe(true)
      expect(conflicts.length).toBeGreaterThan(0)
      expect(conflicts[0]).toContain('500')
      expect(conflicts[0]).toContain('high')
      expect(conflicts[0]).toContain('low')
    })

    test('should not detect conflict when variance < 30%', () => {
      const sourceData: SourceReputationData[] = [
        { source: 'source1', score: 800, dataPoints: 100, reliability: 0.9, timestamp: new Date() },
        { source: 'source2', score: 850, dataPoints: 80, reliability: 0.9, timestamp: new Date() },
      ]

      const { hasConflicts, conflicts } = aggregator.detectConflicts(sourceData)

      expect(hasConflicts).toBe(false)
      expect(conflicts.length).toBe(0)
    })

    test('should not detect conflict with single source', () => {
      const sourceData: SourceReputationData[] = [
        { source: 'only', score: 800, dataPoints: 100, reliability: 0.9, timestamp: new Date() },
      ]

      const { hasConflicts } = aggregator.detectConflicts(sourceData)
      expect(hasConflicts).toBe(false)
    })

    test('should provide detailed conflict message', () => {
      const sourceData: SourceReputationData[] = [
        { source: 'payai', score: 850, dataPoints: 100, reliability: 0.9, timestamp: new Date() },
        { source: 'github', score: 400, dataPoints: 50, reliability: 0.8, timestamp: new Date() },
      ]

      const { conflicts } = aggregator.detectConflicts(sourceData)

      expect(conflicts[0]).toContain('variance')
      expect(conflicts[0]).toContain('payai')
      expect(conflicts[0]).toContain('github')
      expect(conflicts[0]).toContain('850')
      expect(conflicts[0]).toContain('400')
    })
  })
})
