/**
 * Reputation Benchmarking Framework - Types
 *
 * Defines types for testing and comparing reputation strategies
 */

import type { ReputationData, JobPerformance } from '../../../../src/types/reputation-types'

/**
 * Agent behavior profile for simulation
 */
export interface AgentBehaviorProfile {
  /** Agent identifier */
  agentId: string
  /** Behavior type */
  behaviorType: AgentBehaviorType
  /** Job completion rate (0-1) */
  completionRate: number
  /** Quality score (0-100) */
  qualityScore: number
  /** Timeliness factor (0-2, where 1.0 = on time) */
  timelinessFactor: number
  /** Dispute rate (0-1) */
  disputeRate: number
  /** Client satisfaction (0-100) */
  clientSatisfaction: number
}

/**
 * Types of agent behavior
 */
export enum AgentBehaviorType {
  /** Consistently good performance */
  Honest = 'honest',
  /** Malicious actor gaming reputation */
  Gaming = 'gaming',
  /** Fake agent for sybil attacks */
  Sybil = 'sybil',
  /** Colluding with other agents */
  Colluding = 'colluding',
  /** Good to some, bad to others */
  Selective = 'selective',
  /** Rapidly changing quality */
  Volatile = 'volatile',
  /** Abandons account to wash reputation */
  Washing = 'washing',
}

/**
 * Attack scenario configuration
 */
export interface AttackScenario {
  /** Scenario name */
  name: string
  /** Description */
  description: string
  /** Number of attackers */
  attackerCount: number
  /** Number of honest agents */
  honestAgentCount: number
  /** Number of simulation rounds */
  rounds: number
  /** Attack strategy */
  attackStrategy: AttackStrategy
  /** Attacker behavior profiles */
  attackerProfiles: AgentBehaviorProfile[]
  /** Honest agent behavior profiles */
  honestProfiles: AgentBehaviorProfile[]
}

/**
 * Attack strategies
 */
export type AttackStrategy =
  | 'sybil-coordinated'
  | 'reputation-gaming'
  | 'collusion-network'
  | 'selective-service'
  | 'rapid-registration-spam'
  | 'reputation-washing'

/**
 * Reputation calculation strategy interface
 */
export interface ReputationStrategy {
  /** Strategy name */
  name: string
  /** Strategy description */
  description: string
  /** Calculate reputation for a job */
  calculateReputation(
    currentData: ReputationData,
    jobPerformance: JobPerformance
  ): number
  /** Detect fraud in reputation data */
  detectFraud?(data: ReputationData, job: JobPerformance): boolean
}

/**
 * Benchmark results for a single strategy
 */
export interface StrategyBenchmarkResult {
  /** Strategy tested */
  strategyName: string
  /** Scenario tested */
  scenarioName: string
  /** Attack resistance score (0-100) */
  attackResistanceScore: number
  /** Gaming detection accuracy (0-1) */
  gamingDetectionAccuracy: number
  /** False positive rate (0-1) */
  falsePositiveRate: number
  /** Convergence time (rounds) */
  convergenceTime: number
  /** Resource efficiency (operations/second) */
  resourceEfficiency: number
  /** Final honest agent reputation (avg) */
  honestAgentAvgReputation: number
  /** Final attacker reputation (avg) */
  attackerAvgReputation: number
  /** Reputation separation (honest - attacker) */
  reputationSeparation: number
}

/**
 * Comprehensive benchmark results
 */
export interface BenchmarkResults {
  /** Results per strategy */
  strategies: StrategyBenchmarkResult[]
  /** Best performing strategy */
  bestStrategy: string
  /** Summary metrics */
  summary: {
    totalStrategies: number
    totalScenarios: number
    avgAttackResistance: number
    avgDetectionAccuracy: number
    avgFalsePositiveRate: number
  }
  /** Execution metadata */
  metadata: {
    executionTime: number
    timestamp: number
    environment: string
  }
}

/**
 * Simulation round result
 */
export interface SimulationRound {
  /** Round number */
  round: number
  /** Agent states after round */
  agentStates: Map<string, ReputationData>
  /** Jobs executed this round */
  jobsExecuted: number
  /** Fraud detected this round */
  fraudDetected: number
  /** Average reputation (honest) */
  honestAvgReputation: number
  /** Average reputation (attackers) */
  attackerAvgReputation: number
}

/**
 * Complete simulation result
 */
export interface SimulationResult {
  /** Scenario that was run */
  scenario: AttackScenario
  /** Strategy used */
  strategy: ReputationStrategy
  /** Rounds executed */
  rounds: SimulationRound[]
  /** Final metrics */
  metrics: StrategyBenchmarkResult
  /** Success indicator */
  success: boolean
  /** Error (if failed) */
  error?: string
}

/**
 * Job simulation parameters
 */
export interface JobSimulationParams {
  /** Category for the job */
  category: string
  /** Expected duration (seconds) */
  expectedDuration: number
  /** Payment amount */
  paymentAmount: number
  /** Quality rating (0-100) */
  qualityRating: number
  /** Whether job was completed */
  completed: boolean
  /** Had dispute */
  hadDispute: boolean
  /** Dispute resolved favorably */
  disputeResolvedFavorably: boolean
}

/**
 * Metrics collector configuration
 */
export interface MetricsCollectorConfig {
  /** Track convergence time */
  trackConvergence: boolean
  /** Track resource usage */
  trackResourceUsage: boolean
  /** Track fraud detection */
  trackFraudDetection: boolean
  /** Sampling rate (1.0 = all rounds) */
  samplingRate: number
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Operations per second */
  operationsPerSecond: number
  /** Memory usage (bytes) */
  memoryUsage: number
  /** CPU time (ms) */
  cpuTime: number
  /** Wall clock time (ms) */
  wallClockTime: number
}
