/**
 * Reputation Benchmark Simulator
 *
 * Core engine for testing reputation strategies against attack scenarios
 */

import { ReputationCalculator } from '../../../../src/utils/reputation-calculator.js'
import type { ReputationData, JobPerformance } from '../../../../src/types/reputation-types'
import type {
  AttackScenario,
  SimulationResult,
  SimulationRound,
  AgentBehaviorProfile,
  ReputationStrategy,
  StrategyBenchmarkResult,
  JobSimulationParams,
  AgentBehaviorType
} from './types.js'

/**
 * Reputation Simulator
 *
 * Simulates agent interactions and tests reputation strategy effectiveness
 * against various attack scenarios.
 */
export class ReputationSimulator {
  private calculator: ReputationCalculator
  private randomSeed: number

  constructor(randomSeed?: number) {
    this.calculator = new ReputationCalculator()
    this.randomSeed = randomSeed ?? Date.now()
  }

  /**
   * Run a complete simulation of an attack scenario
   */
  async runScenario(
    scenario: AttackScenario,
    strategy?: ReputationStrategy
  ): Promise<SimulationResult> {
    const startTime = performance.now()

    try {
      // Initialize agent states
      const agentStates = this.initializeAgents(scenario)

      // Run simulation rounds
      const rounds: SimulationRound[] = []

      for (let round = 0; round < scenario.rounds; round++) {
        const roundResult = await this.executeRound(
          round,
          scenario,
          agentStates,
          strategy
        )
        rounds.push(roundResult)
      }

      // Calculate final metrics
      const metrics = this.calculateMetrics(scenario, rounds, performance.now() - startTime)

      return {
        scenario,
        strategy: strategy ?? this.getDefaultStrategy(),
        rounds,
        metrics,
        success: true
      }
    } catch (error) {
      return {
        scenario,
        strategy: strategy ?? this.getDefaultStrategy(),
        rounds: [],
        metrics: this.getEmptyMetrics(scenario.name, strategy?.name ?? 'default'),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Initialize agent states for simulation
   */
  private initializeAgents(scenario: AttackScenario): Map<string, ReputationData> {
    const agents = new Map<string, ReputationData>()

    // Initialize honest agents
    for (const profile of scenario.honestProfiles) {
      agents.set(profile.agentId, this.createInitialReputationData(profile))
    }

    // Initialize attackers
    for (const profile of scenario.attackerProfiles) {
      agents.set(profile.agentId, this.createInitialReputationData(profile))
    }

    return agents
  }

  /**
   * Create initial reputation data for an agent
   */
  private createInitialReputationData(profile: AgentBehaviorProfile): ReputationData {
    return {
      agentAddress: profile.agentId,
      overallScore: 5000, // Start at 50%
      factors: {
        completionWeight: 20,
        qualityWeight: 30,
        timelinessWeight: 20,
        satisfactionWeight: 20,
        disputeWeight: 10
      },
      totalJobsCompleted: 0,
      totalEarnings: BigInt(0),
      avgResponseTime: 0,
      avgCompletionTime: 0,
      performanceHistory: [],
      categoryReputations: [],
      badges: [],
      tier: 0, // Start at None tier
      lastUpdated: Date.now() / 1000,
      disputesAgainst: 0,
      disputesResolved: 0,
      slashHistory: []
    }
  }

  /**
   * Execute a single simulation round
   */
  private async executeRound(
    roundNumber: number,
    scenario: AttackScenario,
    agentStates: Map<string, ReputationData>,
    strategy?: ReputationStrategy
  ): Promise<SimulationRound> {
    let jobsExecuted = 0
    let fraudDetected = 0

    // Generate jobs for this round (each agent gets 1-3 jobs)
    const allProfiles = [...scenario.honestProfiles, ...scenario.attackerProfiles]

    for (const profile of allProfiles) {
      const jobCount = this.randomInt(1, 3)

      for (let i = 0; i < jobCount; i++) {
        const job = this.generateJob(profile, scenario)
        const agentData = agentStates.get(profile.agentId)!

        // Calculate reputation update
        let newScore: number
        if (strategy) {
          newScore = strategy.calculateReputation(agentData, job)
        } else {
          const result = this.calculator.calculateReputation(agentData, job)
          newScore = result.overallScore

          if (result.fraudDetected) {
            fraudDetected++
          }
        }

        // Update agent state
        agentData.overallScore = newScore
        agentData.totalJobsCompleted++
        agentData.totalEarnings += BigInt(job.paymentAmount)
        agentData.lastUpdated = Date.now() / 1000

        if (job.hadDispute) {
          agentData.disputesAgainst++
          if (job.disputeResolvedFavorably) {
            agentData.disputesResolved++
          }
        }

        jobsExecuted++
      }
    }

    // Calculate round metrics
    const honestStates = scenario.honestProfiles.map(p => agentStates.get(p.agentId)!)
    const attackerStates = scenario.attackerProfiles.map(p => agentStates.get(p.agentId)!)

    const honestAvg = honestStates.reduce((sum, s) => sum + s.overallScore, 0) / honestStates.length
    const attackerAvg = attackerStates.reduce((sum, s) => sum + s.overallScore, 0) / attackerStates.length

    return {
      round: roundNumber,
      agentStates: new Map(agentStates),
      jobsExecuted,
      fraudDetected,
      honestAvgReputation: honestAvg,
      attackerAvgReputation: attackerAvg
    }
  }

  /**
   * Generate a job based on agent behavior profile
   */
  private generateJob(profile: AgentBehaviorProfile, scenario: AttackScenario): JobPerformance {
    const baseParams: JobSimulationParams = {
      category: this.randomCategory(),
      expectedDuration: this.randomInt(3600, 86400), // 1 hour to 1 day
      paymentAmount: this.randomInt(1000, 100000),
      qualityRating: profile.qualityScore,
      completed: Math.random() < profile.completionRate,
      hadDispute: Math.random() < profile.disputeRate,
      disputeResolvedFavorably: Math.random() < 0.5
    }

    // Adjust behavior based on attack strategy
    const adjustedParams = this.adjustJobForStrategy(baseParams, profile, scenario.attackStrategy)

    return {
      jobId: `job-${Date.now()}-${Math.random()}`,
      agentAddress: profile.agentId,
      category: adjustedParams.category,
      completed: adjustedParams.completed,
      qualityRating: adjustedParams.qualityRating,
      expectedDuration: adjustedParams.expectedDuration,
      actualDuration: Math.floor(adjustedParams.expectedDuration * profile.timelinessFactor),
      clientSatisfaction: profile.clientSatisfaction,
      paymentAmount: adjustedParams.paymentAmount,
      hadDispute: adjustedParams.hadDispute,
      disputeResolvedFavorably: adjustedParams.disputeResolvedFavorably,
      timestamp: Date.now() / 1000
    }
  }

  /**
   * Adjust job parameters based on attack strategy
   */
  private adjustJobForStrategy(
    params: JobSimulationParams,
    profile: AgentBehaviorProfile,
    strategy: string
  ): JobSimulationParams {
    switch (strategy) {
      case 'sybil-coordinated':
        // Sybil agents give each other perfect ratings
        if (profile.behaviorType === 'sybil') {
          return { ...params, qualityRating: 100, disputeRate: 0, completed: true }
        }
        break

      case 'reputation-gaming':
        // Gaming agents try to inflate scores artificially
        if (profile.behaviorType === 'gaming') {
          return {
            ...params,
            qualityRating: Math.min(100, params.qualityRating + 20),
            disputeResolvedFavorably: true
          }
        }
        break

      case 'selective-service':
        // Selective agents are good to some, bad to others
        if (profile.behaviorType === 'selective') {
          const isGoodTarget = Math.random() < 0.5
          return {
            ...params,
            qualityRating: isGoodTarget ? 90 : 20,
            completed: isGoodTarget
          }
        }
        break

      case 'reputation-washing':
        // Washers start fresh when reputation drops
        if (profile.behaviorType === 'washing') {
          // Simulate abandoning low-rep accounts by resetting
          return { ...params, qualityRating: Math.random() < 0.3 ? 10 : 80 }
        }
        break
    }

    return params
  }

  /**
   * Calculate final benchmark metrics
   */
  private calculateMetrics(
    scenario: AttackScenario,
    rounds: SimulationRound[],
    executionTime: number
  ): StrategyBenchmarkResult {
    const finalRound = rounds[rounds.length - 1]

    const honestReps = scenario.honestProfiles.map(p =>
      finalRound.agentStates.get(p.agentId)!.overallScore
    )
    const attackerReps = scenario.attackerProfiles.map(p =>
      finalRound.agentStates.get(p.agentId)!.overallScore
    )

    const honestAvg = honestReps.reduce((sum, r) => sum + r, 0) / honestReps.length
    const attackerAvg = attackerReps.reduce((sum, r) => sum + r, 0) / attackerReps.length
    const separation = honestAvg - attackerAvg

    // Attack resistance: higher separation = better resistance
    const attackResistanceScore = Math.min(100, Math.max(0, separation / 100))

    // Gaming detection: how many fraudulent activities were detected
    const totalFraudDetected = rounds.reduce((sum, r) => sum + r.fraudDetected, 0)
    const totalJobs = rounds.reduce((sum, r) => sum + r.jobsExecuted, 0)
    const gamingDetectionAccuracy = totalFraudDetected / (scenario.attackerCount * scenario.rounds)

    // False positive rate: honest agents incorrectly flagged
    const falsePositiveRate = 0 // TODO: Implement based on fraud detection logs

    // Convergence time: rounds until separation stabilizes
    const convergenceTime = this.calculateConvergenceTime(rounds)

    // Resource efficiency
    const resourceEfficiency = totalJobs / (executionTime / 1000)

    return {
      strategyName: 'current-ema',
      scenarioName: scenario.name,
      attackResistanceScore,
      gamingDetectionAccuracy,
      falsePositiveRate,
      convergenceTime,
      resourceEfficiency,
      honestAgentAvgReputation: honestAvg,
      attackerAvgReputation: attackerAvg,
      reputationSeparation: separation
    }
  }

  /**
   * Calculate convergence time (rounds until stabilization)
   */
  private calculateConvergenceTime(rounds: SimulationRound[]): number {
    if (rounds.length < 10) return rounds.length

    // Check when separation stops changing significantly
    for (let i = 10; i < rounds.length; i++) {
      const recent = rounds.slice(i - 10, i)
      const separations = recent.map(r => r.honestAvgReputation - r.attackerAvgReputation)
      const variance = this.calculateVariance(separations)

      // Converged if variance < 100
      if (variance < 100) {
        return i
      }
    }

    return rounds.length
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
  }

  /**
   * Get default reputation strategy
   */
  private getDefaultStrategy(): ReputationStrategy {
    return {
      name: 'current-ema',
      description: 'Current EMA-based reputation calculation',
      calculateReputation: (data, job) => {
        return this.calculator.calculateReputation(data, job).overallScore
      }
    }
  }

  /**
   * Get empty metrics for failed simulations
   */
  private getEmptyMetrics(scenarioName: string, strategyName: string): StrategyBenchmarkResult {
    return {
      strategyName,
      scenarioName,
      attackResistanceScore: 0,
      gamingDetectionAccuracy: 0,
      falsePositiveRate: 0,
      convergenceTime: 0,
      resourceEfficiency: 0,
      honestAgentAvgReputation: 0,
      attackerAvgReputation: 0,
      reputationSeparation: 0
    }
  }

  /**
   * Random integer between min and max (inclusive)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Random job category
   */
  private randomCategory(): string {
    const categories = [
      'data_processing',
      'content_generation',
      'code_review',
      'translation',
      'analysis'
    ]
    return categories[this.randomInt(0, categories.length - 1)]
  }
}
