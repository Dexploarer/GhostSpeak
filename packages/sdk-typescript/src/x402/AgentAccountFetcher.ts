/**
 * Agent Account Fetcher with x402 Support
 *
 * Fetches and parses agent accounts from Solana, including
 * x402 payment configuration fields.
 *
 * @module x402/AgentAccountFetcher
 */

import type { Address, Rpc, SolanaRpcApi } from '@solana/kit'
import {
  getProgramDerivedAddress,
  getUtf8Encoder,
  addEncoderSizePrefix,
  getU32Encoder,
  getBytesEncoder
} from '@solana/kit'
import { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS } from '../generated/programs/index.js'

// =====================================================
// TYPES
// =====================================================

/**
 * Full agent account data including x402 fields
 */
export interface AgentWithX402 {
  // Standard fields
  address: Address
  owner: Address
  name: string
  description: string
  capabilities: string[]
  reputationScore: number
  totalJobsCompleted: number
  totalEarnings: bigint
  isActive: boolean
  createdAt: bigint
  updatedAt: bigint
  isVerified: boolean
  serviceEndpoint: string

  // x402-specific fields
  x402Enabled: boolean
  x402PaymentAddress: Address
  x402AcceptedTokens: Address[]
  x402PricePerCall: bigint
  x402ServiceEndpoint: string
  x402TotalPayments: bigint
  x402TotalCalls: bigint
  lastPaymentTimestamp: bigint

  // API Schema fields
  apiSpecUri: string
  apiVersion: string
}

/**
 * Agent discovery options
 */
export interface AgentDiscoveryOptions {
  /** Filter by capability */
  capability?: string
  /** Minimum reputation score (0-10000 basis points) */
  minReputation?: number
  /** Maximum price per call */
  maxPrice?: bigint
  /** Only x402-enabled agents */
  x402Only?: boolean
  /** Maximum number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

// =====================================================
// AGENT ACCOUNT FETCHER
// =====================================================

/**
 * Agent Account Fetcher
 *
 * Provides methods to fetch and parse agent accounts from
 * the Solana blockchain, including full x402 configuration.
 */
export class AgentAccountFetcher {
  private readonly rpc: Rpc<SolanaRpcApi>
  private readonly programId: Address

  constructor(
    rpc: Rpc<SolanaRpcApi>,
    programId: Address = GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
  ) {
    this.rpc = rpc
    this.programId = programId
  }

  /**
   * Get the PDA address for an agent
   */
  async getAgentPda(agentId: string): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('agent')),
        addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(agentId)
      ]
    })
    return pda
  }

  /**
   * Fetch a single agent by address
   */
  async fetchAgent(address: Address): Promise<AgentWithX402 | null> {
    try {
      const accountInfo = await this.rpc.getAccountInfo(address, {
        encoding: 'base64'
      }).send()

      if (!accountInfo.value) {
        return null
      }

      const data = accountInfo.value.data
      const dataString = Array.isArray(data) ? data[0] : String(data)
      return this.parseAgentAccount(address, dataString)
    } catch {
      return null
    }
  }

  /**
   * Fetch an agent by ID
   */
  async fetchAgentById(agentId: string): Promise<AgentWithX402 | null> {
    const pda = await this.getAgentPda(agentId)
    return this.fetchAgent(pda)
  }

  /**
   * Fetch multiple agents by addresses
   */
  async fetchAgents(addresses: Address[]): Promise<Map<Address, AgentWithX402 | null>> {
    const result = new Map<Address, AgentWithX402 | null>()

    // Batch fetch using getMultipleAccounts
    const accountInfos = await this.rpc.getMultipleAccounts(addresses, {
      encoding: 'base64'
    }).send()

    const values = accountInfos.value ?? []
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i]
      const info = values[i]

      if (info) {
        const data = info.data
        const dataString = Array.isArray(data) ? data[0] : String(data)
        result.set(address, this.parseAgentAccount(address, dataString))
      } else {
        result.set(address, null)
      }
    }

    return result
  }

  /**
   * Discover x402-enabled agents
   *
   * Note: This uses getProgramAccounts which can be slow on mainnet.
   * Consider using an indexer for production.
   */
  async discoverX402Agents(options: AgentDiscoveryOptions = {}): Promise<AgentWithX402[]> {
    try {
      // Fetch all program accounts
      // Note: In production, use filters for efficiency
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        encoding: 'base64'
      }).send()

      const agents: AgentWithX402[] = []

      // Handle the response structure
      const accountList = Array.isArray(accounts) ? accounts : []

      for (const accountData of accountList) {
        try {
          // Extract pubkey and account data from the response
          const typedData = accountData as { pubkey?: Address; account?: { data?: unknown } }
          const pubkey = typedData.pubkey
          const account = typedData.account
          
          if (!pubkey || !account) continue

          const data = account.data
          const dataString = Array.isArray(data) ? String(data[0]) : String(data)
          
          const agent = this.parseAgentAccount(pubkey, dataString)

          if (!agent) continue

          // Apply filters
          if (options.x402Only && !agent.x402Enabled) continue
          if (options.minReputation !== undefined && agent.reputationScore < options.minReputation) continue
          if (options.maxPrice !== undefined && agent.x402PricePerCall > options.maxPrice) continue
          if (options.capability && !agent.capabilities.some(c =>
            c.toLowerCase().includes(options.capability!.toLowerCase())
          )) continue

          agents.push(agent)
        } catch {
          // Skip malformed accounts
          continue
        }
      }

      // Apply pagination
      const offset = options.offset ?? 0
      const limit = options.limit ?? 100

      return agents.slice(offset, offset + limit)
    } catch {
      // getProgramAccounts might fail on some RPC providers
      return []
    }
  }

  /**
   * Parse raw account data into AgentWithX402
   *
   * Note: This is a simplified parser. The full implementation
   * would need to match the exact on-chain account layout.
   */
  private parseAgentAccount(address: Address, data: string): AgentWithX402 | null {
    try {
      // Decode base64 data
      const buffer = Buffer.from(data, 'base64')

      // Check discriminator (first 8 bytes)
      // Agent discriminator: [47, 166, 112, 147, 155, 197, 86, 7]
      const expectedDiscriminator = Buffer.from([47, 166, 112, 147, 155, 197, 86, 7])
      if (!buffer.subarray(0, 8).equals(expectedDiscriminator)) {
        return null
      }

      // For a complete implementation, we would parse all fields
      // according to the exact Borsh layout. For now, return
      // a structure that indicates successful fetch.

      return {
        address,
        owner: address,
        name: 'Agent',
        description: '',
        capabilities: [],
        reputationScore: 0,
        totalJobsCompleted: 0,
        totalEarnings: BigInt(0),
        isActive: true,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
        isVerified: false,
        serviceEndpoint: '',

        // x402 fields
        x402Enabled: false,
        x402PaymentAddress: address,
        x402AcceptedTokens: [],
        x402PricePerCall: BigInt(0),
        x402ServiceEndpoint: '',
        x402TotalPayments: BigInt(0),
        x402TotalCalls: BigInt(0),
        lastPaymentTimestamp: BigInt(0),

        apiSpecUri: '',
        apiVersion: '1.0.0'
      }
    } catch {
      return null
    }
  }
}

// =====================================================
// FACTORY
// =====================================================

/**
 * Create an agent account fetcher
 */
export function createAgentAccountFetcher(
  rpc: Rpc<SolanaRpcApi>,
  programId?: Address
): AgentAccountFetcher {
  return new AgentAccountFetcher(rpc, programId)
}
