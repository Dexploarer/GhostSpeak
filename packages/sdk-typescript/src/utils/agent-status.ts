/**
 * Agent Status Utilities
 *
 * Simple proof-of-agent: Real agents do real work
 *
 * This module provides utilities for checking agent verification and activity status
 * based on x402 payment history. No staking required - agents prove legitimacy through work.
 */

import type { Agent } from '../generated/accounts'

/**
 * Agent activity status
 */
export enum AgentStatus {
  /** Never completed a paid job */
  Unverified = 'unverified',
  /** Has completed jobs and received payment in last 30 days */
  Active = 'active',
  /** Has completed jobs but no payment in 30+ days */
  Inactive = 'inactive',
  /** Never received payment (spam/dead) */
  Dead = 'dead',
}

/**
 * Agent status information with metadata
 */
export interface AgentStatusInfo {
  status: AgentStatus
  isVerified: boolean
  isActive: boolean
  isDead: boolean
  daysSinceLastPayment: number | null
  totalJobs: number
  totalPayments: bigint
}

/**
 * Configuration for agent status checks
 */
export interface AgentStatusConfig {
  /** Days without payment before considered inactive (default: 30) */
  inactivityThresholdDays?: number
  /** Current timestamp override for testing (default: now) */
  currentTimestamp?: bigint
}

const DEFAULT_INACTIVITY_THRESHOLD_DAYS = 30
const SECONDS_PER_DAY = 86400n

/**
 * Check if agent is verified (has completed at least 1 paid job)
 *
 * Simple proof-of-agent: real agents do real work
 *
 * @param agent - Agent account data
 * @returns true if agent has completed at least 1 x402 paid call
 *
 * @example
 * ```typescript
 * const verified = isAgentVerified(agent)
 * if (!verified) {
 *   console.log('Agent has not completed any paid jobs yet')
 * }
 * ```
 */
export function isAgentVerified(agent: Pick<Agent, 'x402TotalCalls'>): boolean {
  return agent.x402TotalCalls > 0
}

/**
 * Check if agent is active (received payment in last N days)
 *
 * @param agent - Agent account data with x402 fields
 * @param config - Configuration options
 * @returns true if agent received payment within threshold
 *
 * @example
 * ```typescript
 * const active = isAgentActive(agent)
 * if (!active) {
 *   console.log('Agent has not received payment recently')
 * }
 * ```
 */
export function isAgentActive(
  agent: Pick<Agent, 'x402TotalCalls' | 'lastPaymentTimestamp'>,
  config: AgentStatusConfig = {}
): boolean {
  const threshold = config.inactivityThresholdDays ?? DEFAULT_INACTIVITY_THRESHOLD_DAYS
  const currentTime = config.currentTimestamp ?? BigInt(Math.floor(Date.now() / 1000))

  // Never received payment
  if (agent.lastPaymentTimestamp === 0n) {
    return false
  }

  const daysSincePayment = (currentTime - agent.lastPaymentTimestamp) / SECONDS_PER_DAY
  return daysSincePayment < BigInt(threshold)
}

/**
 * Check if agent is dead (no payment in 30+ days but has history)
 *
 * @param agent - Agent account data
 * @param config - Configuration options
 * @returns true if agent has history but is inactive
 *
 * @example
 * ```typescript
 * const dead = isAgentDead(agent)
 * if (dead) {
 *   console.log('Agent has not been active recently')
 * }
 * ```
 */
export function isAgentDead(
  agent: Pick<Agent, 'x402TotalCalls' | 'lastPaymentTimestamp'>,
  config: AgentStatusConfig = {}
): boolean {
  return agent.x402TotalCalls > 0 && !isAgentActive(agent, config)
}

/**
 * Get comprehensive agent status information
 *
 * @param agent - Agent account data
 * @param config - Configuration options
 * @returns Detailed status information
 *
 * @example
 * ```typescript
 * const status = getAgentStatus(agent)
 * console.log(`Agent status: ${status.status}`)
 * console.log(`Days since payment: ${status.daysSinceLastPayment}`)
 * console.log(`Total jobs: ${status.totalJobs}`)
 * ```
 */
export function getAgentStatus(
  agent: Pick<Agent, 'x402TotalCalls' | 'x402TotalPayments' | 'lastPaymentTimestamp'>,
  config: AgentStatusConfig = {}
): AgentStatusInfo {
  const isVerified = isAgentVerified(agent)
  const isActive = isAgentActive(agent, config)
  const isDead = isAgentDead(agent, config)

  const currentTime = config.currentTimestamp ?? BigInt(Math.floor(Date.now() / 1000))

  let daysSinceLastPayment: number | null = null
  if (agent.lastPaymentTimestamp > 0n) {
    daysSinceLastPayment = Number((currentTime - agent.lastPaymentTimestamp) / SECONDS_PER_DAY)
  }

  let status: AgentStatus
  if (!isVerified) {
    status = AgentStatus.Unverified
  } else if (isActive) {
    status = AgentStatus.Active
  } else {
    // isDead is true here (verified and not active)
    status = AgentStatus.Inactive
  }

  return {
    status,
    isVerified,
    isActive,
    isDead,
    daysSinceLastPayment,
    totalJobs: agent.x402TotalCalls,
    totalPayments: agent.x402TotalPayments,
  }
}

/**
 * Filter agents by activity status
 *
 * @param agents - Array of agent accounts
 * @param options - Filter options
 * @returns Filtered array of agents
 *
 * @example
 * ```typescript
 * // Only show active, verified agents
 * const activeAgents = filterAgentsByStatus(allAgents, {
 *   excludeUnverified: true,
 *   excludeInactive: true
 * })
 * ```
 */
export function filterAgentsByStatus<T extends Pick<Agent, 'x402TotalCalls' | 'lastPaymentTimestamp'>>(
  agents: T[],
  options: {
    excludeUnverified?: boolean
    excludeInactive?: boolean
    excludeDead?: boolean
    config?: AgentStatusConfig
  } = {}
): T[] {
  return agents.filter(agent => {
    if (options.excludeUnverified && !isAgentVerified(agent)) {
      return false
    }
    if (options.excludeInactive && !isAgentActive(agent, options.config)) {
      return false
    }
    if (options.excludeDead && isAgentDead(agent, options.config)) {
      return false
    }
    return true
  })
}

/**
 * Sort agents by activity (most recent first)
 *
 * @param agents - Array of agent accounts
 * @returns Sorted array (most recently active first)
 *
 * @example
 * ```typescript
 * const sortedAgents = sortAgentsByActivity(agents)
 * // sortedAgents[0] is the most recently active agent
 * ```
 */
export function sortAgentsByActivity<T extends Pick<Agent, 'lastPaymentTimestamp'>>(
  agents: T[]
): T[] {
  return [...agents].sort((a, b) => {
    // Most recent first
    if (a.lastPaymentTimestamp > b.lastPaymentTimestamp) return -1
    if (a.lastPaymentTimestamp < b.lastPaymentTimestamp) return 1
    return 0
  })
}
