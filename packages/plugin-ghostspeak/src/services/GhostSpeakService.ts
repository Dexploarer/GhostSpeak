/**
 * GhostSpeakService - Core SDK Wrapper Service for ElizaOS
 *
 * Provides a singleton service that manages the GhostSpeak SDK client lifecycle,
 * caches agent data, and exposes module accessors for blockchain operations.
 */

import { Service, logger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { GhostSpeakClient } from '@ghostspeak/sdk';
import type { Address } from '@solana/addresses';
import { address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
import { getAgentSigner, hasWalletConfigured } from '../wallet';

/**
 * Cached agent data with expiration
 */
interface CachedAgent {
  data: AgentAccount;
  expires: number;
}

/**
 * Agent account data from blockchain
 * Matches the generated Agent type from @ghostspeak/sdk
 */
interface AgentAccount {
  name: string;
  description: string;
  agentType: number;
  isActive: boolean;
  reputationScore: number;
  totalJobsCompleted: number;
  totalEarnings: bigint;
  x402Enabled: boolean;
  x402TotalCalls: bigint;
  x402TotalPayments: bigint;
  createdAt: bigint;
  metadataUri: string;
  ghostScore: bigint;
  capabilities: string[];
}

/**
 * Cache configuration
 */
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * GhostSpeak Service
 *
 * Core service for ElizaOS plugin that wraps the GhostSpeak SDK.
 * Provides:
 * - Singleton client management
 * - Lazy signer initialization
 * - Agent data caching (60s TTL)
 * - Module accessors for all SDK operations
 */
export class GhostSpeakService extends Service {
  static serviceType = 'ghostspeak';
  capabilityDescription = 'GhostSpeak blockchain operations for AI agent reputation, credentials, and identity';

  private client: GhostSpeakClient | null = null;
  private signer: KeyPairSigner | null = null;
  private agentCache = new Map<string, CachedAgent>();

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Start the service and initialize the SDK client
   */
  static async start(runtime: IAgentRuntime): Promise<GhostSpeakService> {
    const service = new GhostSpeakService(runtime);
    await service.initialize();
    return service;
  }

  /**
   * Stop the service and cleanup
   */
  async stop(): Promise<void> {
    logger.info('Stopping GhostSpeak service');
    this.client = null;
    this.signer = null;
    this.agentCache.clear();
  }

  /**
   * Initialize the SDK client
   */
  private async initialize(): Promise<void> {
    const cluster = (process.env.SOLANA_CLUSTER as 'devnet' | 'mainnet-beta' | 'testnet') || 'devnet';
    const rpcEndpoint = process.env.SOLANA_RPC_URL;

    this.client = new GhostSpeakClient({
      cluster,
      rpcEndpoint,
    });

    // Pre-load signer if wallet is configured
    if (hasWalletConfigured(this.runtime)) {
      try {
        this.signer = await getAgentSigner(this.runtime);
        logger.info({
          address: this.signer.address,
          cluster,
        }, 'GhostSpeak service initialized with signer');
      } catch (error) {
        logger.warn({ error }, 'Failed to load wallet - read-only mode');
      }
    } else {
      logger.info({ cluster }, 'GhostSpeak service initialized (read-only mode - no wallet configured)');
    }
  }

  // =====================================================
  // CLIENT & SIGNER ACCESSORS
  // =====================================================

  /**
   * Get the SDK client (throws if not initialized)
   */
  getClient(): GhostSpeakClient {
    if (!this.client) {
      throw new Error('GhostSpeak client not initialized. Service may not have started properly.');
    }
    return this.client;
  }

  /**
   * Get or create the signer for signing transactions
   * Lazy loads the signer on first call
   */
  async getSigner(): Promise<KeyPairSigner> {
    if (!this.signer) {
      this.signer = await getAgentSigner(this.runtime);
    }
    return this.signer;
  }

  /**
   * Check if a wallet/signer is configured
   */
  hasSigner(): boolean {
    return this.signer !== null || hasWalletConfigured(this.runtime);
  }

  /**
   * Get signer address without throwing (returns null if not configured)
   */
  getSignerAddress(): Address | null {
    return this.signer?.address ?? null;
  }

  // =====================================================
  // CACHED AGENT OPERATIONS
  // =====================================================

  /**
   * Get agent account with caching (60s TTL)
   */
  async getAgent(agentAddress: Address): Promise<AgentAccount | null> {
    const cacheKey = agentAddress.toString();
    const cached = this.agentCache.get(cacheKey);

    // Return cached data if not expired
    if (cached && cached.expires > Date.now()) {
      logger.debug({ agentAddress: cacheKey }, 'Using cached agent data');
      return cached.data;
    }

    // Fetch from blockchain
    try {
      const agent = await this.getClient().agents.getAgentAccount(agentAddress);

      if (agent) {
        // Cache the result - cast to unknown first for flexible typing
        this.agentCache.set(cacheKey, {
          data: agent as unknown as AgentAccount,
          expires: Date.now() + CACHE_TTL_MS,
        });
        logger.debug({ agentAddress: cacheKey }, 'Cached agent data from blockchain');
      }

      return agent as unknown as AgentAccount | null;
    } catch (error) {
      logger.error({ error, agentAddress: cacheKey }, 'Failed to fetch agent from blockchain');
      throw error;
    }
  }

  /**
   * Invalidate cached agent data
   */
  invalidateAgentCache(agentAddress: Address): void {
    this.agentCache.delete(agentAddress.toString());
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.agentCache.clear();
    logger.debug('Cleared all cached agent data');
  }

  // =====================================================
  // MODULE ACCESSORS
  // =====================================================

  /**
   * Agent operations (registration, queries)
   */
  get agents() {
    return this.getClient().agents;
  }

  /**
   * Ghost operations (external agent claiming)
   */
  get ghosts() {
    return this.getClient().ghosts;
  }

  /**
   * Credential operations (W3C Verifiable Credentials)
   */
  credentials() {
    return this.getClient().credentials();
  }

  /**
   * DID operations (Decentralized Identifiers)
   */
  did() {
    return this.getClient().did();
  }

  /**
   * Reputation operations (Ghost Score calculation)
   */
  reputation() {
    return this.getClient().reputation();
  }

  /**
   * Privacy operations (visibility controls)
   */
  privacy() {
    return this.getClient().privacy();
  }

  /**
   * Staking operations (GHOST token staking)
   * Returns StakingModule from the SDK
   */
  staking(): unknown {
    return this.getClient().staking;
  }

  /**
   * PayAI operations (x402 payments)
   */
  payai() {
    return this.getClient().payai();
  }

  /**
   * Authorization operations (trustless pre-authorization)
   * Returns AuthorizationModule from the SDK
   */
  authorization(): unknown {
    return this.getClient().authorization;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Get the current cluster/network
   */
  getCluster(): string {
    return process.env.SOLANA_CLUSTER || 'devnet';
  }

  /**
   * Check if running on mainnet
   */
  isMainnet(): boolean {
    return this.getCluster() === 'mainnet-beta';
  }

  /**
   * Get service stats for monitoring
   */
  getStats(): {
    cacheSize: number;
    hasSigner: boolean;
    cluster: string;
    isMainnet: boolean;
  } {
    return {
      cacheSize: this.agentCache.size,
      hasSigner: this.hasSigner(),
      cluster: this.getCluster(),
      isMainnet: this.isMainnet(),
    };
  }
}

export default GhostSpeakService;
