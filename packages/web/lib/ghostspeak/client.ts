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

import { address, type Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { createSolanaRpc } from '@solana/rpc'

// Import from browser-safe SDK entry point
import {
  AgentModule,
  GhostModule,
  GovernanceModule,
  ReputationModule,
  MultisigModule,
  CredentialsModule,
  StakingModule,
  PayAIClient,
  SASAttestationHelper,
  GHOSTSPEAK_PROGRAM_ID,
} from '@ghostspeak/sdk/browser'

// SDK doesn't export GhostSpeakConfig, define locally
interface GhostSpeakConfig {
  programId: Address
  rpcEndpoint: string
  cluster: 'mainnet-beta' | 'testnet' | 'devnet'
  rpc: any
}

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
 * - ghosts: External agent claiming with SAS attestations
 * - credentials: Verifiable Credentials (VCs) module
 * - reputation: Performance-based trust layer
 * - staking: GHOST token staking for reputation boost
 * - payai: PayAI integration for payment events
 */
export interface GhostSpeakClient {
  programId: Address
  rpcUrl: string
  agents: InstanceType<typeof AgentModule>
  ghosts: InstanceType<typeof GhostModule>
  credentials: InstanceType<typeof CredentialsModule>
  reputation: InstanceType<typeof ReputationModule>
  staking: InstanceType<typeof StakingModule>
  governanceModule: InstanceType<typeof GovernanceModule>
  multisigModule: InstanceType<typeof MultisigModule>
  payai: InstanceType<typeof PayAIClient>
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

  const rpc = createSolanaRpc(rpcUrl)

  const config: GhostSpeakConfig = {
    programId: GHOSTSPEAK_PROGRAM_ID,
    rpcEndpoint: rpcUrl,
    cluster: network === 'mainnet' ? 'mainnet-beta' : network,
    rpc,
  } as GhostSpeakConfig

  // Convert program ID to Address type (SDK exports it as Address but TypeScript might need explicit typing)
  const programIdAddress: Address =
    typeof GHOSTSPEAK_PROGRAM_ID === 'string'
      ? address(GHOSTSPEAK_PROGRAM_ID)
      : (GHOSTSPEAK_PROGRAM_ID as Address)

  const client: GhostSpeakClient = {
    programId: GHOSTSPEAK_PROGRAM_ID,
    rpcUrl,
    // Core Pillars
    agents: new AgentModule(config),
    ghosts: new GhostModule(config),
    credentials: new CredentialsModule(programIdAddress), // CredentialsModule expects programId
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
