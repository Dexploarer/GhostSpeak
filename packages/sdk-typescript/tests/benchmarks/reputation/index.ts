/**
 * Reputation Benchmarking Framework
 *
 * Open-source framework for testing reputation strategies against attack scenarios
 *
 * @example
 * ```typescript
 * import { ReputationSimulator, SYBIL_ATTACK } from './benchmarks/reputation'
 *
 * const simulator = new ReputationSimulator()
 * const result = await simulator.runScenario(SYBIL_ATTACK)
 *
 * console.log(`Attack resistance: ${result.metrics.attackResistanceScore}/100`)
 * console.log(`Detection accuracy: ${result.metrics.gamingDetectionAccuracy}`)
 * ```
 */

// Core framework
export { ReputationSimulator } from './framework/ReputationSimulator.js'
export * from './framework/types.js'

// Attack scenarios
export * from './scenarios/index.js'
