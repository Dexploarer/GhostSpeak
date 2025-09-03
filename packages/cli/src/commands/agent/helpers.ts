/**
 * Shared utilities for agent commands
 */

import { promises as fs, existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { Address } from '@solana/addresses'
import type { AgentAnalytics } from '@ghostspeak/sdk'
import chalk from 'chalk'
// AgentCredentials type imported but not used directly in current implementation

/**
 * Store a pending information request for an agent (non-blocking async)
 */
export async function storePendingInfoRequest(
  agentAddress: string, 
  request: string, 
  requesterAddress: Address
): Promise<void> {
  const requestsDir = join(homedir(), '.ghostspeak', 'pending-requests')
  
  try {
    await fs.access(requestsDir)
  } catch (_) {
    await fs.mkdir(requestsDir, { recursive: true })
  }
  
  const requestData = {
    agentAddress,
    request,
    requesterAddress: requesterAddress.toString(),
    timestamp: Date.now(),
    status: 'pending'
  }
  
  const requestFile = join(requestsDir, `${agentAddress}-${Date.now()}.json`)
  
  // Use setImmediate to prevent blocking main thread
  await new Promise<void>((resolve, reject) => {
    setImmediate(async () => {
      try {
        await fs.writeFile(requestFile, JSON.stringify(requestData, null, 2))
        resolve()
      } catch (_) {
        reject(_error)
      }
    })
  })
}

/**
 * Get pending information requests for an agent
 */
interface InfoRequest {
  type: string
  agentAddress: string
  requestedBy: string
  timestamp: number
  status: string
}

export function getPendingInfoRequests(agentAddress: string): InfoRequest[] {
  const requestsDir = join(homedir(), '.ghostspeak', 'pending-requests')
  
  if (!existsSync(requestsDir)) {
    return []
  }
  
  try {
    const files = readdirSync(requestsDir) as string[]
    const requests: InfoRequest[] = []
    
    for (const file of files) {
      if (typeof file === 'string' && file.startsWith(agentAddress)) {
        const requestData = JSON.parse(readFileSync(join(requestsDir, file), 'utf-8')) as InfoRequest
        requests.push(requestData)
      }
    }
    
    return requests.sort((a, b) => b.timestamp - a.timestamp)
  } catch (_) {
    return []
  }
}

/**
 * Format agent analytics for display
 */
export function formatAnalytics(analytics: AgentAnalytics): string[] {
  return [
    `Total Earnings: ${analytics.totalEarnings} SOL`,
    `Jobs Completed: ${analytics.completedJobs}`,
    `Success Rate: ${(analytics.successRate * 100).toFixed(1)}%`,
    `Average Rating: ${analytics.averageRating.toFixed(1)}/5.0`,
    `Total Transactions: ${analytics.totalJobs}`,
    `Active Jobs: ${analytics.activeJobs}`
  ]
}

/**
 * Validate agent registration parameters
 */
export function validateAgentParams(params: {
  name?: string
  description?: string
  capabilities?: string[]
  category?: string
  pricing?: {
    amount: number
    currency?: string
  }
}): string | null {
  if (!params.name || params.name.length < 3) {
    return 'Agent name must be at least 3 characters long'
  }
  
  if (!params.description || params.description.length < 10) {
    return 'Agent description must be at least 10 characters long'
  }
  
  if (!params.capabilities || params.capabilities.length === 0) {
    return 'Agent must have at least one capability'
  }
  
  if (params.capabilities.some(cap => cap.length < 2)) {
    return 'Each capability must be at least 2 characters long'
  }
  
  return null
}

/**
 * Format agent display information
 */
interface AgentData {
  name?: string
  address?: { toString(): string }
  description?: string
  capabilities?: string[]
  isActive?: boolean
  createdAt?: number | bigint
}

export function formatAgentInfo(agent: AgentData): {
  name: string
  address: string
  description: string
  capabilities: string
  status: string
  created: string
} {
  return {
    name: agent.name ?? 'Unknown',
    address: agent.address ? agent.address.toString().slice(0, 8) + '...' + agent.address.toString().slice(-8) : 'Unknown',
    description: agent.description ?? 'No description',
    capabilities: Array.isArray(agent.capabilities) ? agent.capabilities.join(', ') : 'None',
    status: agent.isActive ? 'Active' : 'Inactive',
    created: agent.createdAt ? new Date(Number(agent.createdAt)).toLocaleDateString() : 'Unknown'
  }
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

/**
 * Type for a newly registered agent's data.
 */
export interface RegisteredAgent {
  name: string;
  description: string;
  capabilities: string[];
  id: string;
  address: {
    toString(): string;
  };
}

/**
 * Displays the information for a newly registered agent.
 * @param agent The agent data to display.
 */
export function displayRegisteredAgentInfo(agent: RegisteredAgent): void {
  console.log('\n' + chalk.green('🎉 Your agent has been registered!'))
  console.log(chalk.gray(`Name: ${agent.name}`))
  console.log(chalk.gray(`Description: ${agent.description}`))
  console.log(chalk.gray(`Capabilities: ${agent.capabilities.join(', ')}`))
  console.log(chalk.gray(`Agent ID: ${agent.id}`))
  console.log(chalk.gray(`Agent Address: ${agent.address.toString()}`))
  console.log('')
  console.log(chalk.yellow('💡 Agent data stored locally'))
  console.log(chalk.yellow('💡 Use your agent ID for future operations:'))
  console.log(chalk.gray(`   ${agent.id}`))
}