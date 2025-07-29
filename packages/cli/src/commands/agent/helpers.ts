/**
 * Shared utilities for agent commands
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { Address } from '@solana/addresses'
import type { AgentCredentials } from '../../utils/agentWallet.js'

/**
 * Store a pending information request for an agent
 */
export async function storePendingInfoRequest(
  agentAddress: string, 
  request: string, 
  requesterAddress: Address
): Promise<void> {
  const requestsDir = join(homedir(), '.ghostspeak', 'pending-requests')
  
  if (!existsSync(requestsDir)) {
    mkdirSync(requestsDir, { recursive: true })
  }
  
  const requestData = {
    agentAddress,
    request,
    requesterAddress: requesterAddress.toString(),
    timestamp: Date.now(),
    status: 'pending'
  }
  
  const requestFile = join(requestsDir, `${agentAddress}-${Date.now()}.json`)
  writeFileSync(requestFile, JSON.stringify(requestData, null, 2))
}

/**
 * Get pending information requests for an agent
 */
export function getPendingInfoRequests(agentAddress: string): any[] {
  const requestsDir = join(homedir(), '.ghostspeak', 'pending-requests')
  
  if (!existsSync(requestsDir)) {
    return []
  }
  
  try {
    const fs = require('fs')
    const files = fs.readdirSync(requestsDir)
    const requests = []
    
    for (const file of files) {
      if (file.startsWith(agentAddress)) {
        const requestData = JSON.parse(readFileSync(join(requestsDir, file), 'utf-8'))
        requests.push(requestData)
      }
    }
    
    return requests.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

/**
 * Format agent analytics for display
 */
export function formatAnalytics(analytics: any): string[] {
  return [
    `Total Earnings: ${analytics.totalEarnings || 0} SOL`,
    `Jobs Completed: ${analytics.jobsCompleted || 0}`,
    `Success Rate: ${((analytics.successRate || 0) * 100).toFixed(1)}%`,
    `Average Rating: ${(analytics.averageRating || 0).toFixed(1)}/5.0`,
    `Total Transactions: ${analytics.totalTransactions || 0}`,
    `Unique Clients: ${analytics.uniqueClients || 0}`
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
  pricing?: any
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
export function formatAgentInfo(agent: any): {
  name: string
  address: string
  description: string
  capabilities: string
  status: string
  created: string
} {
  return {
    name: agent.name || 'Unknown',
    address: agent.address ? agent.address.toString().slice(0, 8) + '...' + agent.address.toString().slice(-8) : 'Unknown',
    description: agent.description || 'No description',
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
  } catch {
    return false
  }
}