/**
 * Reputation Benchmarking Framework Tests
 *
 * Tests the reputation simulation and fraud detection with reproducible results
 * using seeded random number generation.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { ReputationSimulator, type AgentProfile } from './framework/ReputationSimulator.js'
import { ReputationTier } from '../../../src/types/reputation-types.js'

describe('Reputation Benchmarking Framework', () => {
  // Fixed seed for reproducibility - all simulator random operations use this seeded RNG
  const simulator = new ReputationSimulator(42)

  beforeAll(() => {
    // Reset to ensure clean state
    simulator.reset()
  })

  describe('Seeded RNG Reproducibility', () => {
    it('should produce identical results with same seed', () => {
      const sim1 = new ReputationSimulator(12345)
      const sim2 = new ReputationSimulator(12345)

      const profile: AgentProfile = {
        agentId: 'test_agent',
        completionRate: 0.9,
        avgQuality: 85,
        qualityVariance: 10,
        timelinessMultiplier: 1.0,
        disputeRate: 0.05,
        categories: ['defi'],
        jobsPerPeriod: 10
      }

      const result1 = sim1.simulateAgentProgression(profile, 5)
      const result2 = sim2.simulateAgentProgression(profile, 5)

      expect(result1.finalScore).toBe(result2.finalScore)
      expect(result1.successfulJobs).toBe(result2.successfulJobs)
      expect(result1.failedJobs).toBe(result2.failedJobs)
    })

    it('should produce different results with different seeds', () => {
      const sim1 = new ReputationSimulator(11111)
      const sim2 = new ReputationSimulator(99999)

      const profile: AgentProfile = {
        agentId: 'test_agent',
        completionRate: 0.5, // High variance to show difference
        avgQuality: 50,
        qualityVariance: 30,
        timelinessMultiplier: 1.0,
        disputeRate: 0.2,
        categories: ['defi'],
        jobsPerPeriod: 20
      }

      const result1 = sim1.simulateAgentProgression(profile, 5)
      const result2 = sim2.simulateAgentProgression(profile, 5)

      // With different seeds and high variance, results should differ
      expect(result1.scoreHistory).not.toEqual(result2.scoreHistory)
    })

    it('should reset to initial state', () => {
      const sim = new ReputationSimulator(42)

      const profile: AgentProfile = {
        agentId: 'test_agent',
        completionRate: 0.9,
        avgQuality: 85,
        qualityVariance: 10,
        timelinessMultiplier: 1.0,
        disputeRate: 0.05,
        categories: ['defi'],
        jobsPerPeriod: 10
      }

      const result1 = sim.simulateAgentProgression(profile, 3)
      sim.reset()
      const result2 = sim.simulateAgentProgression(profile, 3)

      expect(result1.finalScore).toBe(result2.finalScore)
    })
  })

  describe('Agent Progression Simulation', () => {
    it('should simulate legitimate agent progression', () => {
      simulator.reset()

      const legitimateProfile: AgentProfile = {
        agentId: 'legit_agent',
        completionRate: 0.92,
        avgQuality: 82,
        qualityVariance: 10,
        timelinessMultiplier: 1.05,
        disputeRate: 0.05,
        categories: ['defi', 'nft'],
        jobsPerPeriod: 15
      }

      const result = simulator.simulateAgentProgression(legitimateProfile, 10)

      // Legitimate agent should maintain reasonable reputation
      expect(result.finalScore).toBeGreaterThan(0)
      expect(result.totalJobs).toBe(150) // 10 periods * 15 jobs
      expect(result.simulationTime).toBeGreaterThan(0)
      expect(result.scoreHistory.length).toBe(11) // Initial + 10 periods
    })

    it('should show progression for expert agent', () => {
      simulator.reset()

      const expertProfile: AgentProfile = {
        agentId: 'expert_agent',
        completionRate: 0.98,
        avgQuality: 92,
        qualityVariance: 3,
        timelinessMultiplier: 0.85,
        disputeRate: 0.01,
        categories: ['defi'],
        jobsPerPeriod: 25
      }

      const result = simulator.simulateAgentProgression(expertProfile, 10)

      // Expert agent should achieve high reputation
      expect(result.finalTier).toBe(ReputationTier.Gold)
      expect(result.successfulJobs).toBeGreaterThan(result.failedJobs * 10)
    })

    it('should track struggling agent correctly', () => {
      simulator.reset()

      const strugglingProfile: AgentProfile = {
        agentId: 'struggling_agent',
        completionRate: 0.65,
        avgQuality: 60,
        qualityVariance: 20,
        timelinessMultiplier: 1.4,
        disputeRate: 0.15,
        categories: ['data'],
        jobsPerPeriod: 8
      }

      const result = simulator.simulateAgentProgression(strugglingProfile, 10)

      // Struggling agent should have lower reputation
      expect(result.failedJobs).toBeGreaterThan(0)
      expect(result.disputes).toBeGreaterThan(0)
    })
  })

  describe('Attack Scenario Detection', () => {
    it('should have predefined attack scenarios', () => {
      const scenarios = ReputationSimulator.getAttackScenarios()

      expect(scenarios.length).toBeGreaterThanOrEqual(5)

      // Verify scenario structure
      for (const scenario of scenarios) {
        expect(scenario.scenarioId).toBeDefined()
        expect(scenario.description).toBeDefined()
        expect(scenario.profile).toBeDefined()
        expect(typeof scenario.expectedFraudDetection).toBe('boolean')
      }
    })

    it('should run attack scenario', () => {
      simulator.reset()

      const scenario = ReputationSimulator.getAttackScenarios()[0]
      const result = simulator.runAttackScenario(scenario, 5)

      expect(result.metrics).toBeDefined()
      expect(typeof result.fraudDetected).toBe('boolean')
      expect(result.fraudDetectionRate).toBeGreaterThanOrEqual(0)
      expect(result.fraudDetectionRate).toBeLessThanOrEqual(1)
    })

    it('should run all scenarios and generate summary', () => {
      simulator.reset()

      const { results, summary } = simulator.runAllScenarios(5)

      expect(results.size).toBeGreaterThan(0)
      expect(summary.totalScenarios).toBeGreaterThan(0)
      expect(summary.passRate).toBeGreaterThanOrEqual(0)
      expect(summary.passRate).toBeLessThanOrEqual(1)

      // Log summary for benchmarking visibility
      console.log('Attack Scenario Summary:')
      console.log(`  Total: ${summary.totalScenarios}`)
      console.log(`  Passed: ${summary.passedScenarios}`)
      console.log(`  Failed: ${summary.failedScenarios}`)
      console.log(`  Pass Rate: ${(summary.passRate * 100).toFixed(1)}%`)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should simulate 1000 jobs efficiently', () => {
      simulator.reset()

      const profile: AgentProfile = {
        agentId: 'perf_test_agent',
        completionRate: 0.9,
        avgQuality: 80,
        qualityVariance: 10,
        timelinessMultiplier: 1.0,
        disputeRate: 0.05,
        categories: ['defi'],
        jobsPerPeriod: 100
      }

      const result = simulator.simulateAgentProgression(profile, 10)

      expect(result.totalJobs).toBe(1000)
      // Should complete in reasonable time (less than 5 seconds)
      expect(result.simulationTime).toBeLessThan(5000)

      console.log(`Performance: 1000 jobs in ${result.simulationTime.toFixed(2)}ms`)
    })

    it('should handle multiple categories efficiently', () => {
      simulator.reset()

      const multiCategoryProfile: AgentProfile = {
        agentId: 'multi_category_agent',
        completionRate: 0.88,
        avgQuality: 78,
        qualityVariance: 12,
        timelinessMultiplier: 1.1,
        disputeRate: 0.08,
        categories: ['defi', 'nft', 'gaming', 'social', 'data'],
        jobsPerPeriod: 50
      }

      const result = simulator.simulateAgentProgression(multiCategoryProfile, 10)

      expect(result.totalJobs).toBe(500)
      expect(result.simulationTime).toBeLessThan(3000)

      console.log(`Multi-category: 500 jobs across 5 categories in ${result.simulationTime.toFixed(2)}ms`)
    })
  })
})
