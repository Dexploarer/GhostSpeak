/**
 * Reputation Simulator for Benchmarking
 *
 * Provides a deterministic simulation framework for testing reputation
 * calculations with reproducible results using seeded random number generation.
 *
 * @module tests/benchmarks/reputation/framework/ReputationSimulator
 */

import type { Address } from '@solana/kit'
import { ReputationCalculator } from '../../../../src/utils/reputation-calculator.js'
import {
  type ReputationData,
  type JobPerformance,
  type ReputationCalculationResult,
  type ReputationFactors,
  type CategoryReputation,
  ReputationTier,
  REPUTATION_CONSTANTS
} from '../../../../src/types/reputation-types.js'

/**
 * Agent behavior profile for simulation
 */
export interface AgentProfile {
  /** Agent identifier */
  agentId: string
  /** Probability of completing jobs successfully (0-1) */
  completionRate: number
  /** Average quality rating (0-100) */
  avgQuality: number
  /** Quality rating variance */
  qualityVariance: number
  /** Average delay factor (1.0 = on time, 1.5 = 50% late) */
  timelinessMultiplier: number
  /** Probability of disputes (0-1) */
  disputeRate: number
  /** Categories agent works in */
  categories: string[]
  /** Jobs per simulation period */
  jobsPerPeriod: number
}

/**
 * Attack scenario for fraud detection testing
 */
export interface AttackScenario {
  /** Scenario identifier */
  scenarioId: string
  /** Description of the attack */
  description: string
  /** Attack profile */
  profile: AgentProfile
  /** Expected fraud detection result */
  expectedFraudDetection: boolean
  /** Minimum expected fraud risk score */
  minExpectedRiskScore: number
}

/**
 * Simulation result metrics
 */
export interface SimulationMetrics {
  /** Final reputation score */
  finalScore: number
  /** Final tier */
  finalTier: ReputationTier
  /** Total jobs simulated */
  totalJobs: number
  /** Successful jobs */
  successfulJobs: number
  /** Failed jobs */
  failedJobs: number
  /** Disputes encountered */
  disputes: number
  /** Fraud detections triggered */
  fraudDetections: number
  /** Average job score */
  avgJobScore: number
  /** Score progression over time */
  scoreHistory: number[]
  /** Time taken for simulation (ms) */
  simulationTime: number
}

/**
 * Seeded Linear Congruential Generator (LCG) for reproducible randomness
 *
 * Uses the Numerical Recipes LCG parameters for good statistical properties.
 */
class SeededRNG {
  private seed: number

  constructor(seed: number) {
    this.seed = seed >>> 0 // Ensure unsigned 32-bit
  }

  /**
   * Generate next random number in range [0, 1)
   */
  next(): number {
    // LCG parameters from Numerical Recipes
    const a = 1664525
    const c = 1013904223
    const m = 0x100000000 // 2^32

    // Update seed
    this.seed = ((a * this.seed + c) >>> 0) % m

    // Return value in [0, 1)
    return this.seed / m
  }

  /**
   * Generate random integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /**
   * Generate random boolean with given probability
   */
  nextBool(probability: number): boolean {
    return this.next() < probability
  }

  /**
   * Generate normally distributed random number (Box-Muller transform)
   */
  nextGaussian(mean: number, stdDev: number): number {
    const u1 = this.next()
    const u2 = this.next()

    // Box-Muller transform
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

    return z0 * stdDev + mean
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)]
  }

  /**
   * Reset RNG to initial seed
   */
  reset(seed: number): void {
    this.seed = seed >>> 0
  }
}

/**
 * Reputation Simulator with seeded RNG for reproducible benchmarks
 */
export class ReputationSimulator {
  private calculator: ReputationCalculator
  private rng: SeededRNG
  private readonly initialSeed: number

  constructor(randomSeed?: number) {
    this.calculator = new ReputationCalculator()
    this.initialSeed = randomSeed ?? Date.now()
    this.rng = new SeededRNG(this.initialSeed)
  }

  /**
   * Reset the simulator to initial state
   */
  reset(): void {
    this.rng.reset(this.initialSeed)
  }

  /**
   * Create initial reputation data for an agent
   */
  createInitialReputationData(agentId: string): ReputationData {
    return {
      agent: agentId as Address,
      overallScore: 5000, // Starting score
      tier: ReputationTier.Silver,
      categoryReputations: [],
      stakedAmount: 0,
      factors: this.getDefaultFactors(),
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      avgResponseTime: 0,
      disputesAgainst: 0,
      disputesResolved: 0,
      lastUpdated: Date.now() / 1000,
      createdAt: Date.now() / 1000,
      performanceHistory: [],
      badges: [],
      crossCategoryEnabled: true
    }
  }

  /**
   * Get default reputation factors
   */
  private getDefaultFactors(): ReputationFactors {
    return {
      completionWeight: 25,
      qualityWeight: 30,
      timelinessWeight: 20,
      satisfactionWeight: 15,
      disputeWeight: 10
    }
  }

  /**
   * Generate a job based on agent profile
   */
  generateJob(profile: AgentProfile): JobPerformance {
    const completed = this.rng.nextBool(profile.completionRate)
    const category = this.rng.pick(profile.categories)

    // Generate quality with variance
    let quality = this.rng.nextGaussian(profile.avgQuality, profile.qualityVariance)
    quality = Math.max(0, Math.min(100, quality)) // Clamp to 0-100

    // Generate timeliness
    const expectedDuration = this.rng.nextInt(3600, 86400) // 1 hour to 1 day
    const actualDuration = Math.floor(expectedDuration * profile.timelinessMultiplier)

    // Generate dispute
    const hadDispute = this.rng.nextBool(profile.disputeRate)
    const disputeResolvedFavorably = hadDispute ? this.rng.nextBool(0.5) : false

    // Generate satisfaction (correlated with quality)
    let satisfaction = quality + this.rng.nextGaussian(0, 10)
    satisfaction = Math.max(0, Math.min(100, satisfaction))

    // Generate payment
    const paymentAmount = this.rng.nextInt(1000, 100000)

    return {
      completed,
      qualityRating: Math.floor(quality),
      expectedDuration,
      actualDuration,
      clientSatisfaction: Math.floor(satisfaction),
      hadDispute,
      disputeResolvedFavorably,
      category,
      paymentAmount
    }
  }

  /**
   * Simulate reputation progression for an agent
   */
  simulateAgentProgression(
    profile: AgentProfile,
    periods: number
  ): SimulationMetrics {
    const startTime = performance.now()

    let reputationData = this.createInitialReputationData(profile.agentId)
    const scoreHistory: number[] = [reputationData.overallScore]
    let totalJobScore = 0
    let fraudDetections = 0
    let successfulJobs = 0
    let failedJobs = 0
    let disputes = 0

    for (let period = 0; period < periods; period++) {
      for (let job = 0; job < profile.jobsPerPeriod; job++) {
        const jobPerformance = this.generateJob(profile)

        // Calculate reputation update
        const result = this.calculator.calculateReputation(
          reputationData,
          jobPerformance
        )

        // Update metrics
        totalJobScore += result.jobScore
        if (result.fraudDetected) fraudDetections++
        if (jobPerformance.completed) successfulJobs++
        else failedJobs++
        if (jobPerformance.hadDispute) disputes++

        // Update reputation data
        reputationData = this.updateReputationData(
          reputationData,
          jobPerformance,
          result
        )
      }

      scoreHistory.push(reputationData.overallScore)
    }

    const totalJobs = periods * profile.jobsPerPeriod
    const simulationTime = performance.now() - startTime

    return {
      finalScore: reputationData.overallScore,
      finalTier: reputationData.tier,
      totalJobs,
      successfulJobs,
      failedJobs,
      disputes,
      fraudDetections,
      avgJobScore: totalJobs > 0 ? totalJobScore / totalJobs : 0,
      scoreHistory,
      simulationTime
    }
  }

  /**
   * Update reputation data after job completion
   */
  private updateReputationData(
    data: ReputationData,
    job: JobPerformance,
    result: ReputationCalculationResult
  ): ReputationData {
    const updatedCategories = this.updateCategoryReputation(
      data.categoryReputations,
      job,
      result.categoryScore
    )

    return {
      ...data,
      overallScore: result.overallScore,
      tier: result.tier,
      categoryReputations: updatedCategories,
      totalJobsCompleted: data.totalJobsCompleted + (job.completed ? 1 : 0),
      totalJobsFailed: data.totalJobsFailed + (job.completed ? 0 : 1),
      disputesAgainst: data.disputesAgainst + (job.hadDispute ? 1 : 0),
      disputesResolved: data.disputesResolved + (job.disputeResolvedFavorably ? 1 : 0),
      lastUpdated: Date.now() / 1000,
      performanceHistory: this.updatePerformanceHistory(
        data.performanceHistory,
        result.overallScore,
        data.totalJobsCompleted + 1
      )
    }
  }

  /**
   * Update category reputations
   */
  private updateCategoryReputation(
    categories: CategoryReputation[],
    job: JobPerformance,
    categoryScore: number
  ): CategoryReputation[] {
    const existingIndex = categories.findIndex(c => c.category === job.category)

    if (existingIndex >= 0) {
      const existing = categories[existingIndex]
      const updated: CategoryReputation = {
        ...existing,
        score: categoryScore,
        completedJobs: existing.completedJobs + (job.completed ? 1 : 0),
        qualitySum: existing.qualitySum + job.qualityRating,
        qualityCount: existing.qualityCount + 1,
        lastActivity: Date.now() / 1000,
        totalEarnings: existing.totalEarnings + job.paymentAmount,
        avgCompletionTime: Math.floor(
          (existing.avgCompletionTime * existing.completedJobs + job.actualDuration) /
          (existing.completedJobs + 1)
        )
      }
      const newCategories = [...categories]
      newCategories[existingIndex] = updated
      return newCategories
    }

    // New category
    if (categories.length >= REPUTATION_CONSTANTS.MAX_REPUTATION_CATEGORIES) {
      return categories // Skip if max categories reached
    }

    return [
      ...categories,
      {
        category: job.category,
        score: categoryScore,
        completedJobs: job.completed ? 1 : 0,
        avgCompletionTime: job.actualDuration,
        qualitySum: job.qualityRating,
        qualityCount: 1,
        lastActivity: Date.now() / 1000,
        totalEarnings: job.paymentAmount
      }
    ]
  }

  /**
   * Update performance history
   */
  private updatePerformanceHistory(
    history: { timestamp: number; score: number; jobsCompleted: number; avgQuality: number }[],
    newScore: number,
    jobsCompleted: number
  ): { timestamp: number; score: number; jobsCompleted: number; avgQuality: number }[] {
    const newSnapshot = {
      timestamp: Date.now() / 1000,
      score: newScore,
      jobsCompleted,
      avgQuality: 0 // Simplified for simulation
    }

    const updated = [...history, newSnapshot]

    // Limit history size
    if (updated.length > REPUTATION_CONSTANTS.MAX_PERFORMANCE_HISTORY) {
      return updated.slice(-REPUTATION_CONSTANTS.MAX_PERFORMANCE_HISTORY)
    }

    return updated
  }

  /**
   * Run attack scenario for fraud detection testing
   */
  runAttackScenario(scenario: AttackScenario, periods: number): {
    metrics: SimulationMetrics
    fraudDetected: boolean
    fraudDetectionRate: number
    passedExpectation: boolean
  } {
    const metrics = this.simulateAgentProgression(scenario.profile, periods)

    const fraudDetectionRate = metrics.totalJobs > 0
      ? metrics.fraudDetections / metrics.totalJobs
      : 0

    const fraudDetected = metrics.fraudDetections > 0
    const passedExpectation = fraudDetected === scenario.expectedFraudDetection

    return {
      metrics,
      fraudDetected,
      fraudDetectionRate,
      passedExpectation
    }
  }

  /**
   * Get predefined attack scenarios
   */
  static getAttackScenarios(): AttackScenario[] {
    return [
      {
        scenarioId: 'sybil_attack',
        description: 'Multiple agents with identical behavior patterns',
        profile: {
          agentId: 'sybil_agent_1',
          completionRate: 1.0,
          avgQuality: 95,
          qualityVariance: 1,
          timelinessMultiplier: 0.9,
          disputeRate: 0,
          categories: ['defi'],
          jobsPerPeriod: 50
        },
        expectedFraudDetection: true,
        minExpectedRiskScore: 50
      },
      {
        scenarioId: 'wash_trading',
        description: 'Artificial job completion for reputation farming',
        profile: {
          agentId: 'wash_trader',
          completionRate: 1.0,
          avgQuality: 100,
          qualityVariance: 0,
          timelinessMultiplier: 0.1, // Suspiciously fast
          disputeRate: 0,
          categories: ['gaming'],
          jobsPerPeriod: 100
        },
        expectedFraudDetection: true,
        minExpectedRiskScore: 60
      },
      {
        scenarioId: 'selective_disputes',
        description: 'High dispute rate but all resolved favorably',
        profile: {
          agentId: 'dispute_farmer',
          completionRate: 0.9,
          avgQuality: 85,
          qualityVariance: 5,
          timelinessMultiplier: 1.0,
          disputeRate: 0.4,
          categories: ['nft', 'defi'],
          jobsPerPeriod: 20
        },
        expectedFraudDetection: true,
        minExpectedRiskScore: 40
      },
      {
        scenarioId: 'category_hopping',
        description: 'Rapid switching between unrelated categories',
        profile: {
          agentId: 'category_hopper',
          completionRate: 0.8,
          avgQuality: 75,
          qualityVariance: 15,
          timelinessMultiplier: 1.2,
          disputeRate: 0.1,
          categories: ['defi', 'nft', 'gaming', 'social', 'data', 'ai', 'infrastructure', 'oracle'],
          jobsPerPeriod: 10
        },
        expectedFraudDetection: true,
        minExpectedRiskScore: 30
      },
      {
        scenarioId: 'legitimate_agent',
        description: 'Normal agent behavior with realistic patterns',
        profile: {
          agentId: 'legit_agent',
          completionRate: 0.92,
          avgQuality: 82,
          qualityVariance: 10,
          timelinessMultiplier: 1.05,
          disputeRate: 0.05,
          categories: ['defi', 'nft'],
          jobsPerPeriod: 15
        },
        expectedFraudDetection: false,
        minExpectedRiskScore: 0
      },
      {
        scenarioId: 'new_agent',
        description: 'New agent building reputation',
        profile: {
          agentId: 'new_agent',
          completionRate: 0.85,
          avgQuality: 75,
          qualityVariance: 12,
          timelinessMultiplier: 1.1,
          disputeRate: 0.08,
          categories: ['gaming'],
          jobsPerPeriod: 5
        },
        expectedFraudDetection: false,
        minExpectedRiskScore: 0
      },
      {
        scenarioId: 'expert_agent',
        description: 'Highly skilled agent with excellent track record',
        profile: {
          agentId: 'expert_agent',
          completionRate: 0.98,
          avgQuality: 92,
          qualityVariance: 3,
          timelinessMultiplier: 0.85,
          disputeRate: 0.01,
          categories: ['defi'],
          jobsPerPeriod: 25
        },
        expectedFraudDetection: false,
        minExpectedRiskScore: 0
      },
      {
        scenarioId: 'struggling_agent',
        description: 'Agent with performance issues but legitimate',
        profile: {
          agentId: 'struggling_agent',
          completionRate: 0.65,
          avgQuality: 60,
          qualityVariance: 20,
          timelinessMultiplier: 1.4,
          disputeRate: 0.15,
          categories: ['data', 'oracle'],
          jobsPerPeriod: 8
        },
        expectedFraudDetection: false,
        minExpectedRiskScore: 0
      }
    ]
  }

  /**
   * Run all attack scenarios and generate report
   */
  runAllScenarios(periods = 10): {
    results: Map<string, {
      metrics: SimulationMetrics
      fraudDetected: boolean
      fraudDetectionRate: number
      passedExpectation: boolean
    }>
    summary: {
      totalScenarios: number
      passedScenarios: number
      failedScenarios: number
      passRate: number
    }
  } {
    const scenarios = ReputationSimulator.getAttackScenarios()
    const results = new Map<string, {
      metrics: SimulationMetrics
      fraudDetected: boolean
      fraudDetectionRate: number
      passedExpectation: boolean
    }>()

    let passedCount = 0

    for (const scenario of scenarios) {
      this.reset() // Reset RNG for each scenario
      const result = this.runAttackScenario(scenario, periods)
      results.set(scenario.scenarioId, result)
      if (result.passedExpectation) passedCount++
    }

    return {
      results,
      summary: {
        totalScenarios: scenarios.length,
        passedScenarios: passedCount,
        failedScenarios: scenarios.length - passedCount,
        passRate: passedCount / scenarios.length
      }
    }
  }
}
