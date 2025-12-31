/**
 * Reputation Test Fixtures
 *
 * Reusable test data for reputation tests
 */

export interface TestTagScore {
  tagName: string
  confidence: number
  evidenceCount: number
  lastUpdated: number
}

export interface TestSourceScore {
  source: string
  score: number
  weight: number
  dataPoints: number
  reliability: number
  lastUpdated: number
}

export interface TestReputationMetrics {
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

/**
 * Create mock reputation metrics
 */
export function createMockReputationMetrics(overrides: Partial<TestReputationMetrics> = {}): TestReputationMetrics {
  const successfulPayments = overrides.successfulPayments || 100n
  const failedPayments = overrides.failedPayments || 5n
  const totalPayments = Number(successfulPayments + failedPayments)

  const totalResponseTime = overrides.totalResponseTime || 5000000n
  const responseTimeCount = overrides.responseTimeCount || 100n

  const totalRating = overrides.totalRating || 450
  const totalRatingsCount = overrides.totalRatingsCount || 100

  return {
    successfulPayments,
    failedPayments,
    totalResponseTime,
    responseTimeCount,
    totalDisputes: overrides.totalDisputes || 2,
    disputesResolved: overrides.disputesResolved || 2,
    totalRating,
    totalRatingsCount,
    createdAt: overrides.createdAt || Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60,
    avgResponseTime: responseTimeCount > 0n ? Number(totalResponseTime) / Number(responseTimeCount) : 0,
    avgRating: totalRatingsCount > 0 ? (totalRating * 100) / (totalRatingsCount * 5) : 0,
    successRate: totalPayments > 0 ? Number((successfulPayments * 10000n) / BigInt(totalPayments)) : 0,
  }
}

/**
 * Create mock tag score
 */
export function createMockTagScore(overrides: Partial<TestTagScore> = {}): TestTagScore {
  return {
    tagName: overrides.tagName || 'fast-responder',
    confidence: overrides.confidence || 8000,
    evidenceCount: overrides.evidenceCount || 100,
    lastUpdated: overrides.lastUpdated || Math.floor(Date.now() / 1000),
  }
}

/**
 * Create mock source score
 */
export function createMockSourceScore(overrides: Partial<TestSourceScore> = {}): TestSourceScore {
  return {
    source: overrides.source || 'payai',
    score: overrides.score || 800,
    weight: overrides.weight || 5000,
    dataPoints: overrides.dataPoints || 100,
    reliability: overrides.reliability || 9000,
    lastUpdated: overrides.lastUpdated || Math.floor(Date.now() / 1000),
  }
}

/**
 * Common skill tags for testing
 */
export const COMMON_SKILL_TAGS = [
  'code-generation',
  'defi-expert',
  'nft-specialist',
  'data-analysis',
  'web3-development',
]

/**
 * Common behavior tags for testing
 */
export const COMMON_BEHAVIOR_TAGS = [
  'fast-responder',
  'quick-responder',
  'high-volume',
  'very-high-volume',
  'top-rated',
  'high-quality',
  'dispute-free',
  'low-dispute',
  'perfect-record',
  'consistent-quality',
]

/**
 * Common compliance tags for testing
 */
export const COMMON_COMPLIANCE_TAGS = [
  'kyc-verified',
  'audited-code',
  'security-reviewed',
  'compliant',
]

/**
 * Reputation sources for testing
 */
export const REPUTATION_SOURCES = [
  'payai',
  'github',
  'custom-webhook',
]
