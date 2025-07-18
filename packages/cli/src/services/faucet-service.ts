/**
 * Faucet Service - Enhanced faucet functionality with rate limiting and multiple sources
 */

import { address } from '@solana/kit'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export interface FaucetConfig {
  rateLimitMinutes: number
  maxDailyRequests: number
  defaultAmount: number
  cacheDir: string
}

export interface FaucetRequest {
  walletAddress: string
  network: 'devnet' | 'testnet'
  source: string
  timestamp: number
  amount: number
  signature?: string
}

export interface FaucetStatus {
  canRequest: boolean
  timeUntilNext?: number
  dailyRequestsUsed: number
  dailyRequestsLimit: number
  lastRequest?: FaucetRequest
}

export class FaucetService {
  private config: FaucetConfig
  private cacheFile: string

  constructor(config?: Partial<FaucetConfig>) {
    this.config = {
      rateLimitMinutes: 60, // 1 hour between requests
      maxDailyRequests: 10, // Max 10 requests per day
      defaultAmount: 1,
      cacheDir: path.join(os.homedir(), '.ghostspeak', 'faucet'),
      ...config
    }
    
    this.cacheFile = path.join(this.config.cacheDir, 'requests.json')
  }

  /**
   * Initialize faucet service (create cache directory)
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.config.cacheDir, { recursive: true })
    } catch (error) {
      console.warn('Warning: Failed to create faucet cache directory:', error)
    }
  }

  /**
   * Load request history from cache
   */
  private async loadRequestHistory(): Promise<FaucetRequest[]> {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf8')
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  /**
   * Save request to cache
   */
  private async saveRequest(request: FaucetRequest): Promise<void> {
    try {
      const history = await this.loadRequestHistory()
      history.push(request)
      
      // Keep only last 100 requests to prevent unbounded growth
      const recentHistory = history.slice(-100)
      
      await fs.writeFile(this.cacheFile, JSON.stringify(recentHistory, null, 2))
    } catch (error) {
      console.warn('Warning: Failed to save request history:', error)
    }
  }

  /**
   * Check if a wallet can request SOL from a specific source
   */
  async checkFaucetStatus(
    walletAddress: string, 
    source: string, 
    network: 'devnet' | 'testnet'
  ): Promise<FaucetStatus> {
    const history = await this.loadRequestHistory()
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    const rateLimitTime = now - (this.config.rateLimitMinutes * 60 * 1000)

    // Filter requests for this wallet, source, and network
    const relevantRequests = history.filter(req => 
      req.walletAddress === walletAddress &&
      req.source === source &&
      req.network === network
    )

    // Check daily limit
    const dailyRequests = relevantRequests.filter(req => req.timestamp > oneDayAgo)
    const dailyRequestsUsed = dailyRequests.length

    // Check rate limit
    const recentRequests = relevantRequests.filter(req => req.timestamp > rateLimitTime)
    const hasRecentRequest = recentRequests.length > 0

    // Find last request
    const lastRequest = relevantRequests.sort((a, b) => b.timestamp - a.timestamp)[0]

    if (dailyRequestsUsed >= this.config.maxDailyRequests) {
      return {
        canRequest: false,
        dailyRequestsUsed,
        dailyRequestsLimit: this.config.maxDailyRequests,
        lastRequest
      }
    }

    if (hasRecentRequest) {
      const lastRequestTime = recentRequests[0].timestamp
      const timeUntilNext = Math.ceil((lastRequestTime + (this.config.rateLimitMinutes * 60 * 1000) - now) / 60000)
      
      return {
        canRequest: false,
        timeUntilNext,
        dailyRequestsUsed,
        dailyRequestsLimit: this.config.maxDailyRequests,
        lastRequest
      }
    }

    return {
      canRequest: true,
      dailyRequestsUsed,
      dailyRequestsLimit: this.config.maxDailyRequests,
      lastRequest
    }
  }

  /**
   * Record a successful faucet request
   */
  async recordRequest(
    walletAddress: string,
    network: 'devnet' | 'testnet',
    source: string,
    amount: number,
    signature?: string
  ): Promise<void> {
    const request: FaucetRequest = {
      walletAddress,
      network,
      source,
      timestamp: Date.now(),
      amount,
      signature
    }

    await this.saveRequest(request)
  }

  /**
   * Get faucet request statistics
   */
  async getStatistics(walletAddress?: string): Promise<{
    totalRequests: number
    successfulRequests: number
    totalSOLReceived: number
    requestsBySource: Record<string, number>
    requestsByNetwork: Record<string, number>
  }> {
    const history = await this.loadRequestHistory()
    const relevantRequests = walletAddress 
      ? history.filter(req => req.walletAddress === walletAddress)
      : history

    const successfulRequests = relevantRequests.filter(req => req.signature)
    const totalSOLReceived = relevantRequests.reduce((sum, req) => sum + req.amount, 0)

    const requestsBySource: Record<string, number> = {}
    const requestsByNetwork: Record<string, number> = {}

    relevantRequests.forEach(req => {
      requestsBySource[req.source] = (requestsBySource[req.source] || 0) + 1
      requestsByNetwork[req.network] = (requestsByNetwork[req.network] || 0) + 1
    })

    return {
      totalRequests: relevantRequests.length,
      successfulRequests: successfulRequests.length,
      totalSOLReceived,
      requestsBySource,
      requestsByNetwork
    }
  }

  /**
   * Clean old request history
   */
  async cleanOldRequests(daysToKeep: number = 30): Promise<number> {
    const history = await this.loadRequestHistory()
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
    
    const filteredHistory = history.filter(req => req.timestamp > cutoffTime)
    const removedCount = history.length - filteredHistory.length

    if (removedCount > 0) {
      await fs.writeFile(this.cacheFile, JSON.stringify(filteredHistory, null, 2))
    }

    return removedCount
  }

  /**
   * Get available faucet sources with their status
   */
  getAvailableSources(): {
    name: string
    id: string
    description: string
    networks: ('devnet' | 'testnet')[]
    rateLimit: string
    typicalAmount: string
  }[] {
    return [
      {
        name: 'Solana Official',
        id: 'solana',
        description: 'Official Solana faucet with reliable service',
        networks: ['devnet', 'testnet'],
        rateLimit: '1 hour',
        typicalAmount: '1-2 SOL'
      },
      {
        name: 'Alchemy',
        id: 'alchemy',
        description: 'Alchemy-powered faucet with good uptime',
        networks: ['devnet', 'testnet'],
        rateLimit: '1 hour',
        typicalAmount: '1 SOL'
      },
      {
        name: 'RPC Airdrop',
        id: 'rpc',
        description: 'Direct RPC airdrop (fallback method)',
        networks: ['devnet', 'testnet'],
        rateLimit: '1 hour',
        typicalAmount: '1 SOL'
      }
    ]
  }
}

/**
 * Advanced Solana faucet implementations with better error handling
 */
export class EnhancedSolanaFaucets {
  /**
   * Try multiple Solana faucet endpoints
   */
  static async requestFromSolanaFaucetWithFallbacks(
    walletAddress: string,
    network: 'devnet' | 'testnet',
    amount: number = 1
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    const endpoints = [
      // Primary endpoints
      `https://faucet.solana.com`,
      // Fallback endpoints
      `https://api.${network}.solana.com`,
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}/airdrop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pubkey: walletAddress,
            lamports: amount * 1_000_000_000,
            cluster: network
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.signature) {
            return { success: true, signature: data.signature }
          }
        }
      } catch (error) {
        console.warn(`Faucet endpoint ${endpoint} failed:`, error)
        continue
      }
    }

    return { success: false, error: 'All Solana faucet endpoints failed' }
  }

  /**
   * Enhanced Alchemy faucet with multiple API versions
   */
  static async requestFromAlchemyFaucetEnhanced(
    walletAddress: string,
    network: 'devnet' | 'testnet'
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    const endpoints = [
      // Alchemy v1 API
      `https://solana-${network}-faucet.alchemy.com/api/faucet`,
      // Alchemy v2 API (if available)
      `https://api.alchemy.com/v2/solana-${network}/faucet`,
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: walletAddress,
            network: network
          })
        })

        if (response.ok) {
          const data = await response.json()
          const signature = data.txHash || data.signature || data.transactionHash
          if (signature) {
            return { success: true, signature }
          }
        }
      } catch (error) {
        console.warn(`Alchemy endpoint ${endpoint} failed:`, error)
        continue
      }
    }

    return { success: false, error: 'All Alchemy faucet endpoints failed' }
  }
}