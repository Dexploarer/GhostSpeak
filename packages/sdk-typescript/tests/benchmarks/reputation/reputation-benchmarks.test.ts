/**
 * Reputation Benchmarking Tests
 *
 * Validates that reputation strategies can resist common attack vectors
 */

import { describe, it, expect } from 'vitest'
import { ReputationSimulator } from './framework/ReputationSimulator.js'
import {
  HONEST_BASELINE,
  SYBIL_ATTACK,
  REPUTATION_GAMING,
  SELECTIVE_SERVICE,
  QUICK_SCENARIOS
} from './scenarios/index.js'

describe('Reputation Benchmarking Framework', () => {
  const simulator = new ReputationSimulator(42) // Fixed seed for reproducibility

  describe('Framework Functionality', () => {
    it('should successfully run honest baseline scenario', async () => {
      const result = await simulator.runScenario(HONEST_BASELINE)

      expect(result.success).toBe(true)
      expect(result.rounds).toHaveLength(HONEST_BASELINE.rounds)
      expect(result.metrics.honestAgentAvgReputation).toBeGreaterThan(4000) // >40%

      console.log('\n📊 Honest Baseline Results:')
      console.log(`  Average Reputation: ${result.metrics.honestAgentAvgReputation}`)
      console.log(`  Convergence Time: ${result.metrics.convergenceTime} rounds`)
      console.log(`  Resource Efficiency: ${result.metrics.resourceEfficiency.toFixed(2)} ops/sec`)
    })

    it('should detect sybil attacks', async () => {
      const result = await simulator.runScenario(SYBIL_ATTACK)

      expect(result.success).toBe(true)

      // Honest agents should have higher reputation than sybil attackers
      const separation = result.metrics.reputationSeparation
      expect(separation).toBeGreaterThan(500) // At least 5% separation

      console.log('\n🛡️  Sybil Attack Results:')
      console.log(`  Honest Avg: ${result.metrics.honestAgentAvgReputation.toFixed(0)}`)
      console.log(`  Attacker Avg: ${result.metrics.attackerAvgReputation.toFixed(0)}`)
      console.log(`  Separation: ${separation.toFixed(0)} (${(separation / 100).toFixed(1)}%)`)
      console.log(`  Attack Resistance: ${result.metrics.attackResistanceScore.toFixed(1)}/100`)
    })

    it('should resist reputation gaming', async () => {
      const result = await simulator.runScenario(REPUTATION_GAMING)

      expect(result.success).toBe(true)

      // Gamers should have lower reputation than honest agents
      const separation = result.metrics.reputationSeparation
      expect(separation).toBeGreaterThan(300) // At least 3% separation

      console.log('\n🎮 Reputation Gaming Results:')
      console.log(`  Honest Avg: ${result.metrics.honestAgentAvgReputation.toFixed(0)}`)
      console.log(`  Gamer Avg: ${result.metrics.attackerAvgReputation.toFixed(0)}`)
      console.log(`  Separation: ${separation.toFixed(0)}`)
      console.log(`  Detection Accuracy: ${(result.metrics.gamingDetectionAccuracy * 100).toFixed(1)}%`)
    })

    it('should identify selective service attacks', async () => {
      const result = await simulator.runScenario(SELECTIVE_SERVICE)

      expect(result.success).toBe(true)

      // Selective service is harder to detect but should still show some separation
      const separation = result.metrics.reputationSeparation
      expect(separation).toBeGreaterThan(200) // At least 2% separation

      console.log('\n🎭 Selective Service Attack Results:')
      console.log(`  Honest Avg: ${result.metrics.honestAgentAvgReputation.toFixed(0)}`)
      console.log(`  Selective Avg: ${result.metrics.attackerAvgReputation.toFixed(0)}`)
      console.log(`  Separation: ${separation.toFixed(0)}`)
      console.log(`  Attack Resistance: ${result.metrics.attackResistanceScore.toFixed(1)}/100`)
    })
  })

  describe('Performance Requirements', () => {
    it('should converge within reasonable time', async () => {
      const result = await simulator.runScenario(HONEST_BASELINE)

      // Should converge within 80% of total rounds
      const maxConvergenceTime = HONEST_BASELINE.rounds * 0.8
      expect(result.metrics.convergenceTime).toBeLessThan(maxConvergenceTime)

      console.log('\n⏱️  Convergence Performance:')
      console.log(`  Convergence Time: ${result.metrics.convergenceTime} rounds`)
      console.log(`  Target: <${maxConvergenceTime} rounds`)
    })

    it('should process efficiently', async () => {
      const result = await simulator.runScenario(HONEST_BASELINE)

      // Should process at least 100 operations per second
      expect(result.metrics.resourceEfficiency).toBeGreaterThan(100)

      console.log('\n⚡ Resource Efficiency:')
      console.log(`  Operations/sec: ${result.metrics.resourceEfficiency.toFixed(2)}`)
      console.log(`  Target: >100 ops/sec`)
    })
  })

  describe('Quick Scenarios (CI/CD)', () => {
    it('should run all quick scenarios successfully', async () => {
      console.log('\n🚀 Running Quick Scenarios for CI/CD:')

      for (const scenario of QUICK_SCENARIOS) {
        const result = await simulator.runScenario(scenario)

        expect(result.success).toBe(true)
        expect(result.rounds).toHaveLength(scenario.rounds)

        console.log(`\n  ✅ ${scenario.name}:`)
        console.log(`     Separation: ${result.metrics.reputationSeparation.toFixed(0)}`)
        console.log(`     Resistance: ${result.metrics.attackResistanceScore.toFixed(1)}/100`)
      }
    })
  })

  describe('Comparison Metrics', () => {
    it('should provide comprehensive metrics for strategy comparison', async () => {
      const result = await simulator.runScenario(SYBIL_ATTACK)

      // Verify all metrics are present and valid
      expect(result.metrics.attackResistanceScore).toBeGreaterThanOrEqual(0)
      expect(result.metrics.attackResistanceScore).toBeLessThanOrEqual(100)
      expect(result.metrics.gamingDetectionAccuracy).toBeGreaterThanOrEqual(0)
      expect(result.metrics.gamingDetectionAccuracy).toBeLessThanOrEqual(1)
      expect(result.metrics.falsePositiveRate).toBeGreaterThanOrEqual(0)
      expect(result.metrics.falsePositiveRate).toBeLessThanOrEqual(1)
      expect(result.metrics.convergenceTime).toBeGreaterThan(0)
      expect(result.metrics.resourceEfficiency).toBeGreaterThan(0)

      console.log('\n📈 Comprehensive Metrics:')
      console.log(`  Attack Resistance: ${result.metrics.attackResistanceScore.toFixed(1)}/100`)
      console.log(`  Detection Accuracy: ${(result.metrics.gamingDetectionAccuracy * 100).toFixed(1)}%`)
      console.log(`  False Positive Rate: ${(result.metrics.falsePositiveRate * 100).toFixed(1)}%`)
      console.log(`  Convergence Time: ${result.metrics.convergenceTime} rounds`)
      console.log(`  Resource Efficiency: ${result.metrics.resourceEfficiency.toFixed(2)} ops/sec`)
      console.log(`  Reputation Separation: ${result.metrics.reputationSeparation.toFixed(0)}`)
    })
  })
})
