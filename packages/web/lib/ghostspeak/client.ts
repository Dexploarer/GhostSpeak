'use client'

/**
 * GhostSpeak SDK Client - Real blockchain integration
 *
 * Provides access to SDK modules for agent, credentials, reputation,
 * governance, and multisig operations.
 * 
 * Payment facilitation is delegated to PayAI via PayAIClient.
 *
 * Uses the browser-safe SDK entry point to avoid server-only dependencies.
 */

import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'

// Import from browser-safe SDK entry point
import {
  AgentModule,
  GovernanceModule,
  ReputationModule,
  MultisigModule,
  CredentialsModule,
  StakingModule,
  PayAIClient,
  GHOSTSPEAK_PROGRAM_ID,
  type GhostSpeakConfig,
} from '@ghostspeak/sdk/browser'

// Network configurations
export const NETWORK_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
} as const

export type NetworkType = keyof typeof NETWORK_ENDPOINTS

/**
 * GhostSpeak client interface with all SDK modules
 *
 * Core Pillars:
 * - agents: Identity Registry for AI agents
 * - credentials: Verifiable Credentials (VCs) module
 * - reputation: Performance-based trust layer
 * - staking: GHOST token staking for reputation boost
 * - payai: PayAI integration for payment events
 */
export interface GhostSpeakClient {
  programId: Address
  rpcUrl: string
  agents: AgentModule
  credentials: typeof CredentialsModule
  reputation: ReputationModule
  staking: StakingModule
  governanceModule: GovernanceModule
  multisigModule: MultisigModule
  payai: PayAIClient
}

// Client singleton cache
const clientCache = new Map<string, GhostSpeakClient>()

/**
 * Create a GhostSpeak client instance for the specified network
 */
export function createGhostSpeakClient(
  network: NetworkType = 'devnet',
  customRpcUrl?: string
): GhostSpeakClient {
  const rpcUrl = customRpcUrl ?? NETWORK_ENDPOINTS[network]
  const cacheKey = rpcUrl

  // Return cached client if available
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!
  }

  const config: GhostSpeakConfig = {
    programId: GHOSTSPEAK_PROGRAM_ID,
    rpcEndpoint: rpcUrl,
    cluster: network === 'mainnet' ? 'mainnet-beta' : network,
  } as GhostSpeakConfig

  const client: GhostSpeakClient = {
    programId: GHOSTSPEAK_PROGRAM_ID,
    rpcUrl,
    // Core Pillars
    agents: new AgentModule(config),
    credentials: CredentialsModule,
    reputation: new ReputationModule(config),
    staking: new StakingModule(config),
    // Governance
    governanceModule: new GovernanceModule(config),
    multisigModule: new MultisigModule(config),
    // PayAI Integration
    payai: new PayAIClient({ rpcUrl }),
  }

  // Cache the client
  clientCache.set(cacheKey, client)

  return client
}

/**
 * Get the current network from environment
 */
export function getCurrentNetwork(): NetworkType {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK
  if (network === 'mainnet' || network === 'testnet' || network === 'devnet') {
    return network
  }
  return 'devnet' // Default to devnet
}

/**
 * Get the GhostSpeak client configured from environment variables
 */
export function getGhostSpeakClient(): GhostSpeakClient {
  const network = getCurrentNetwork()
  const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  return createGhostSpeakClient(network, customRpc)
}

// Re-export types
export type { Address, TransactionSigner }
