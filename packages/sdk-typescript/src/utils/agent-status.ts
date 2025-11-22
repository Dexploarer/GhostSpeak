/**
 * Agent Status Utilities for Proof-of-Agent Verification
 *
 * Provides functions to determine agent activity status based on x402 payment history.
 * Uses snake_case field names to match the AgentDiscoveryClient.Agent interface.
 *
 * @module utils/agent-status
 */

import type { Agent } from '../x402/AgentDiscoveryClient.js'

/**
 * Agent status enumeration
 */
export enum AgentStatus {
  /** Agent has never completed a paid x402 transaction */
  Unverified = 'unverified',
  /** Agent has received payment within the activity threshold */
  Active = 'active',
  /** Agent has payment history but no recent activity */
  Inactive = 'inactive',
  /** Agent is inactive beyond recovery threshold (deprecated - use Inactive) */
  Dead = 'dead'
}

/**
 * Configuration options for agent status checks
 */
export interface AgentStatusConfig {
  /** Activity threshold in seconds (default: 30 days) */
  activityThresholdSeconds?: number
  /** Current timestamp in seconds (default: Date.now() / 1000) */
  currentTimestamp?: number
}

/** Default activity threshold: 30 days in seconds */
const DEFAULT_ACTIVITY_THRESHOLD = 30 * 24 * 60 * 60

/**
 * Get the current timestamp in seconds
 */
function getCurrentTimestamp(config: AgentStatusConfig): number {
  return config.currentTimestamp ?? Math.floor(Date.now() / 1000)
}

/**
 * Get the activity threshold in seconds
 */
function getActivityThreshold(config: AgentStatusConfig): number {
  return config.activityThresholdSeconds ?? DEFAULT_ACTIVITY_THRESHOLD
}

/**
 * Check if an agent is verified (has completed at least 1 paid x402 transaction)
 *
 * @param agent - Agent object with x402_total_calls field
 * @returns true if agent has at least 1 x402 call
 *
 * @example
 * ```typescript
 * const agent = await discoveryClient.getAgent(address)
 * if (isAgentVerified(agent)) {
 *   console.log('Agent has completed paid work')
 * }
 * ```
 */
export function isAgentVerified(
  agent: Pick<Agent, 'x402_total_calls'>
): boolean {
  return agent.x402_total_calls > 0n
}

/**
 * Check if an agent is active (received payment within threshold)
 *
 * @param agent - Agent object with x402_total_calls and last_payment_timestamp fields
 * @param config - Optional configuration for thresholds
 * @returns true if agent is verified AND has recent activity
 *
 * @example
 * ```typescript
 * const agent = await discoveryClient.getAgent(address)
 * if (isAgentActive(agent)) {
 *   console.log('Agent is actively providing services')
 * }
 * ```
 */
export function isAgentActive(
  agent: Pick<Agent, 'x402_total_calls' | 'last_payment_timestamp'>,
  config: AgentStatusConfig = {}
): boolean {
  if (!isAgentVerified(agent)) {
    return false
  }

  const currentTimestamp = getCurrentTimestamp(config)
  const threshold = getActivityThreshold(config)
  const lastPayment = Number(agent.last_payment_timestamp)
  const timeSinceLastPayment = currentTimestamp - lastPayment

  return timeSinceLastPayment <= threshold
}

/**
 * Check if an agent is inactive (has payment history but no recent activity)
 *
 * @param agent - Agent object with x402_total_calls and last_payment_timestamp fields
 * @param config - Optional configuration for thresholds
 * @returns true if agent is verified but has not had recent activity
 *
 * @example
 * ```typescript
 * const agent = await discoveryClient.getAgent(address)
 * if (isAgentInactive(agent)) {
 *   console.log('Agent has gone dormant')
 * }
 * ```
 */
export function isAgentInactive(
  agent: Pick<Agent, 'x402_total_calls' | 'last_payment_timestamp'>,
  config: AgentStatusConfig = {}
): boolean {
  if (!isAgentVerified(agent)) {
    return false // Unverified agents are not "inactive", just unverified
  }

  const currentTimestamp = getCurrentTimestamp(config)
  const threshold = getActivityThreshold(config)
  const lastPayment = Number(agent.last_payment_timestamp)
  const timeSinceLastPayment = currentTimestamp - lastPayment

  return timeSinceLastPayment > threshold
}

/**
 * Check if an agent is dead (alias for isAgentInactive for backwards compatibility)
 *
 * @deprecated Use isAgentInactive instead. "Dead" and "Inactive" are semantically identical.
 *
 * @param agent - Agent object with x402_total_calls and last_payment_timestamp fields
 * @param config - Optional configuration for thresholds
 * @returns true if agent is verified but has not had recent activity
 */
export function isAgentDead(
  agent: Pick<Agent, 'x402_total_calls' | 'last_payment_timestamp'>,
  config: AgentStatusConfig = {}
): boolean {
  return isAgentInactive(agent, config)
}

/**
 * Get the comprehensive status of an agent
 *
 * @param agent - Agent object with x402_total_calls and last_payment_timestamp fields
 * @param config - Optional configuration for thresholds
 * @returns AgentStatus enum value
 *
 * @example
 * ```typescript
 * const agent = await discoveryClient.getAgent(address)
 * const status = getAgentStatus(agent)
 * switch (status) {
 *   case AgentStatus.Active:
 *     console.log('Agent is actively serving')
 *     break
 *   case AgentStatus.Inactive:
 *     console.log('Agent has gone dormant')
 *     break
 *   case AgentStatus.Unverified:
 *     console.log('Agent has not completed paid work')
 *     break
 * }
 * ```
 */
export function getAgentStatus(
  agent: Pick<Agent, 'x402_total_calls' | 'last_payment_timestamp'>,
  config: AgentStatusConfig = {}
): AgentStatus {
  if (!isAgentVerified(agent)) {
    return AgentStatus.Unverified
  }

  if (isAgentActive(agent, config)) {
    return AgentStatus.Active
  }

  return AgentStatus.Inactive
}

/**
 * Filter options for agent status filtering
 */
export interface AgentStatusFilterOptions {
  /** Exclude agents that have never completed an x402 transaction */
  excludeUnverified?: boolean
  /** Exclude agents that have not been active within the threshold */
  excludeInactive?: boolean
  /** Alias for excludeInactive for backwards compatibility */
  excludeDead?: boolean
  /** Configuration for status checks */
  config?: AgentStatusConfig
}

/**
 * Filter agents by their activity status
 *
 * @param agents - Array of agents to filter
 * @param options - Filter options
 * @returns Filtered array of agents
 *
 * @example
 * ```typescript
 * const allAgents = await discoveryClient.searchAgents()
 * const activeAgents = filterAgentsByStatus(allAgents.agents, {
 *   excludeUnverified: true,
 *   excludeInactive: true
 * })
 * ```
 */
export function filterAgentsByStatus<
  T extends Pick<Agent, 'x402_total_calls' | 'last_payment_timestamp'>
>(agents: T[], options: AgentStatusFilterOptions = {}): T[] {
  const config = options.config ?? {}
  const excludeInactive = options.excludeInactive ?? options.excludeDead ?? false

  return agents.filter((agent) => {
    // Check unverified filter
    if (options.excludeUnverified && !isAgentVerified(agent)) {
      return false
    }

    // Check inactive filter
    if (excludeInactive && isAgentInactive(agent, config)) {
      return false
    }

    return true
  })
}

/**
 * Sort agents by their activity (most recently active first)
 *
 * @param agents - Array of agents to sort
 * @returns Sorted array of agents (descending by last_payment_timestamp)
 *
 * @example
 * ```typescript
 * const agents = await discoveryClient.searchAgents()
 * const sortedAgents = sortAgentsByActivity(agents.agents)
 * // sortedAgents[0] is the agent with most recent last_payment_timestamp
 * ```
 */
export function sortAgentsByActivity<
  T extends Pick<Agent, 'last_payment_timestamp'>
>(agents: T[]): T[] {
  return [...agents].sort((a, b) => {
    const timestampA = Number(a.last_payment_timestamp)
    const timestampB = Number(b.last_payment_timestamp)
    return timestampB - timestampA // Descending order (most recent first)
  })
}

/**
 * Get time since last payment in a human-readable format
 *
 * @param agent - Agent object with last_payment_timestamp field
 * @param config - Optional configuration
 * @returns Human-readable time string (e.g., "2 days ago", "1 month ago")
 *
 * @example
 * ```typescript
 * const agent = await discoveryClient.getAgent(address)
 * console.log(`Last active: ${getTimeSinceLastPayment(agent)}`)
 * // Output: "Last active: 5 days ago"
 * ```
 */
export function getTimeSinceLastPayment(
  agent: Pick<Agent, 'last_payment_timestamp'>,
  config: AgentStatusConfig = {}
): string {
  const lastPayment = Number(agent.last_payment_timestamp)

  if (lastPayment === 0) {
    return 'Never'
  }

  const currentTimestamp = getCurrentTimestamp(config)
  const seconds = currentTimestamp - lastPayment

  if (seconds < 60) {
    return 'Just now'
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  const months = Math.floor(days / 30)
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`
  }

  const years = Math.floor(months / 12)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

/**
 * Summary statistics for a collection of agents
 */
export interface AgentStatusSummary {
  total: number
  verified: number
  active: number
  inactive: number
  unverified: number
  activePercentage: number
  verifiedPercentage: number
}

/**
 * Get summary statistics for a collection of agents
 *
 * @param agents - Array of agents to summarize
 * @param config - Optional configuration for status checks
 * @returns Summary statistics object
 *
 * @example
 * ```typescript
 * const allAgents = await discoveryClient.searchAgents()
 * const summary = getAgentStatusSummary(allAgents.agents)
 * console.log(`${summary.activePercentage}% of agents are active`)
 * ```
 */
export function getAgentStatusSummary<
  T extends Pick<Agent, 'x402_total_calls' | 'last_payment_timestamp'>
>(agents: T[], config: AgentStatusConfig = {}): AgentStatusSummary {
  const total = agents.length

  if (total === 0) {
    return {
      total: 0,
      verified: 0,
      active: 0,
      inactive: 0,
      unverified: 0,
      activePercentage: 0,
      verifiedPercentage: 0
    }
  }

  let verified = 0
  let active = 0
  let inactive = 0
  let unverified = 0

  for (const agent of agents) {
    const status = getAgentStatus(agent, config)
    switch (status) {
      case AgentStatus.Active:
        verified++
        active++
        break
      case AgentStatus.Inactive:
        verified++
        inactive++
        break
      case AgentStatus.Unverified:
        unverified++
        break
    }
  }

  return {
    total,
    verified,
    active,
    inactive,
    unverified,
    activePercentage: Math.round((active / total) * 100),
    verifiedPercentage: Math.round((verified / total) * 100)
  }
}
