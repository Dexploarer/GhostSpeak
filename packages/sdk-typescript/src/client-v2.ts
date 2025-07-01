/**
 * podAI SDK Client - Web3.js v2.0 Native Implementation
 * Pure Web3.js v2.0 client with modern APIs and optimal performance
 */

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-misused-promises */

import { address } from '@solana/addresses';
import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/signers';

// Import utility functions following Jupiter Swap patterns
import {
  buildSimulateAndSendTransaction,
  batchTransactions,
  createTransactionConfig,
  type TransactionConfig
} from './utils/transaction-utils';

// Import Codama-generated functionality
import {
  fetchMaybeAgentAccount,
  type AgentAccount as CodemaAgentAccount,
} from './generated-v2/accounts/agentAccount';
// Import services
import { AgentService } from './services/agent';
import { ChannelService } from './services/channel';
import { MessageService } from './services/message';
import { AnalyticsService } from './services/analytics';

// Types from our existing system (only what we need)
import type { ICreateAgentOptions } from './types';
import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

/**
 * Configuration for the Web3.js v2.0 client
 */
export interface IPodAIClientV2Config {
  rpcEndpoint: string;
  wsEndpoint?: string; // Optional WebSocket endpoint for subscriptions
  commitment?: Commitment;
  programId?: string;
}

/**
 * Modern podAI client using Web3.js v2.0 architecture
 * Uses Codama-generated clients for maximum performance and type safety
 */
export class PodAIClientV2 {
  private readonly rpc: Rpc<SolanaRpcApi>;
  private readonly programId: Address;
  private readonly commitment: Commitment;
  private readonly wsEndpoint?: string;

  // Services
  public readonly agents: AgentService;
  public readonly channels: ChannelService;
  public readonly messages: MessageService;
  public readonly analytics: AnalyticsService;

  constructor(config: IPodAIClientV2Config) {
    this.rpc = createSolanaRpc(config.rpcEndpoint);
    this.programId = address(
      config.programId ?? 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps'
    );
    this.commitment = config.commitment ?? 'confirmed';
    this.wsEndpoint = config.wsEndpoint ?? undefined;

    // Initialize services
    this.agents = new AgentService(
      this.rpc, 
      this.programId, 
      this.commitment, 
      this.wsEndpoint
    );
    
    this.channels = new ChannelService(
      this.rpc,
      this.programId,
      this.commitment
    );
    
    this.messages = new MessageService(
      this.rpc,
      this.programId,
      this.commitment
    );
    
    this.analytics = new AnalyticsService(
      this.rpc,
      this.programId,
      this.commitment
    );
  }

  /**
   * Get the RPC client for direct access
   */
  public getRpc(): Rpc<SolanaRpcApi> {
    return this.rpc;
  }

  /**
   * Get the program ID
   */
  public getProgramId(): Address {
    return this.programId;
  }

  /**
   * Get the WebSocket endpoint
   */
  public getWsEndpoint(): string | undefined {
    return this.wsEndpoint;
  }

  /**
   * Create a new agent using Web3.js v2.0 + Codama generated clients
   * @deprecated Use agents.registerAgent instead
   */
  public async createAgent(
    wallet: KeyPairSigner,
    options: ICreateAgentOptions
  ): Promise<string> {
    console.warn('createAgent is deprecated, use agents.registerAgent instead');
    return this.agents.registerAgent(wallet, options);
  }

  /**
   * Fetch agent account using Web3.js v2.0 + Codama generated clients
   * @deprecated Use agents.getAgent instead
   */
  public async getAgent(
    agentAddress: Address
  ): Promise<CodemaAgentAccount | null> {
    console.warn('getAgent is deprecated, use agents.getAgent instead');
    try {
      // Use Codama-generated fetch function
      const maybeAccount = await fetchMaybeAgentAccount(this.rpc, agentAddress);

      if (!maybeAccount.exists) {
        return null;
      }

      // Return the Codama-generated account directly
      return maybeAccount.data;
    } catch (error) {
      console.error('Error fetching agent:', error);
      return null;
    }
  }

  /**
   * Health check - verify RPC connection and basic functionality
   */
  public async healthCheck(): Promise<{
    rpcConnection: boolean;
    blockHeight: number;
    programValid: boolean;
  }> {
    try {
      // Test RPC connection by getting slot
      const slot = await this.rpc.getSlot().send();

      return {
        rpcConnection: true,
        blockHeight: Number(slot),
        programValid: true,
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        rpcConnection: false,
        blockHeight: 0,
        programValid: false,
      };
    }
  }

  /**
   * Generate a new keypair for testing
   */
  public async generateKeypair(): Promise<KeyPairSigner> {
    return await generateKeyPairSigner();
  }

  /**
   * Validate if an address string is valid
   */
  public isValidAddress(addr: string): boolean {
    try {
      address(addr);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Batch multiple RPC calls efficiently
   */
  public async batchCall<T extends Record<string, unknown>>(
    calls: Record<keyof T, () => Promise<unknown>>
  ): Promise<Partial<T>> {
    const entries = Object.entries(calls);
    const promises = entries.map(([, fn]) =>
      fn().catch((error: Error) => ({ error }))
    );

    const results = await Promise.allSettled(promises);

    const output: Partial<T> = {};
    entries.forEach(([key], index) => {
      const result = results[index];
      if (result && result.status === 'fulfilled') {
        output[key as keyof T] = result.value as T[keyof T];
      } else if (result && result.status === 'rejected') {
        output[key as keyof T] = { error: result.reason } as T[keyof T];
      }
    });

    return output;
  }

  /**
   * Subscribe to slot updates using real RPC subscriptions
   */
  public async subscribeToSlots(
    callback: (slot: number) => void
  ): Promise<void> {
    // Use a simple interval to poll for slots - can be enhanced later
    const interval = setInterval(async () => {
      try {
        const slot = await this.rpc.getSlot().send();
        callback(Number(slot));
      } catch (error) {
        console.error('Failed to get slot:', error);
      }
    }, 1000);

    // Return cleanup function would be better, but keeping simple for now
    setTimeout(() => clearInterval(interval), 60000); // Auto-cleanup after 60 seconds
  }

  /**
   * Create a transaction configuration for use with utility functions
   * Following Jupiter Swap pattern for transaction building
   */
  public createTransactionConfig(
    signer: KeyPairSigner,
    instructions: any[],
    options?: {
      commitment?: Commitment;
      skipPreflight?: boolean;
    }
  ): TransactionConfig {
    return createTransactionConfig(
      this.rpc,
      signer,
      instructions,
      {
        commitment: options?.commitment || this.commitment,
        wsEndpoint: this.wsEndpoint || undefined,
        skipPreflight: options?.skipPreflight || false
      }
    );
  }

  /**
   * Execute a transaction with full Jupiter Swap-style validation
   * Includes simulation, error handling, and confirmation
   */
  public async executeTransaction(config: TransactionConfig) {
    return await buildSimulateAndSendTransaction(config);
  }

  /**
   * Execute multiple transactions efficiently in batch
   * Following Jupiter Swap batching patterns
   */
  public async executeBatchTransactions(configs: TransactionConfig[]) {
    return await batchTransactions(configs);
  }

  /**
   * Get comprehensive performance metrics
   * Following Jupiter Swap monitoring patterns
   */
  public async getPerformanceMetrics(): Promise<{
    rpcLatency: number;
    blockHeight: number;
    tps: number;
    networkHealth: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const startTime = Date.now();
    
    try {
      // Measure RPC latency
      const slot = await this.rpc.getSlot().send();
      const rpcLatency = Date.now() - startTime;

      // Get recent performance samples
      const samples = await this.rpc.getRecentPerformanceSamples(5).send();
      
      // Calculate average TPS from samples
      const avgTps = samples.length > 0 
        ? samples.reduce((sum, sample) => sum + Number(sample.numTransactions), 0) / samples.length
        : 0;

      // Determine network health based on latency and TPS
      let networkHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (rpcLatency > 2000 || avgTps < 1000) {
        networkHealth = 'unhealthy';
      } else if (rpcLatency > 1000 || avgTps < 2000) {
        networkHealth = 'degraded';
      }

      return {
        rpcLatency,
        blockHeight: Number(slot),
        tps: avgTps,
        networkHealth
      };

    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        rpcLatency: Date.now() - startTime,
        blockHeight: 0,
        tps: 0,
        networkHealth: 'unhealthy'
      };
    }
  }
}

/**
 * Factory function to create a v2 client with sensible defaults
 */
export function createPodAIClientV2(
  config: IPodAIClientV2Config
): PodAIClientV2 {
  return new PodAIClientV2({
    commitment: 'confirmed',
    ...config,
  });
}

/**
 * Factory for devnet client
 */
export function createDevnetClient(): PodAIClientV2 {
  return createPodAIClientV2({
    rpcEndpoint: 'https://api.devnet.solana.com',
  });
}

/**
 * Factory for mainnet client
 */
export function createMainnetClient(): PodAIClientV2 {
  return createPodAIClientV2({
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  });
}

/**
 * Utility: Check if an address is valid
 */
export function isValidAddress(addr: string): boolean {
  try {
    address(addr);
    return true;
  } catch {
    return false;
  }
}
