/**
 * Modern PodAI Client for Web3.js v2 (2025)
 * Follows Rust SDK architecture patterns
 */

import { AgentService } from './services/agent';
import { ChannelService } from './services/channel';
import { MessageService } from './services/message';
import { EscrowService } from './services/escrow';
import { AuctionService } from './services/auction';
import { BulkDealsService } from './services/bulk-deals';
import { ReputationService } from './services/reputation';
import { RealtimeCommunicationService } from './services/realtime-communication';
import type { Address } from '@solana/addresses';
import { createSolanaRpc } from '@solana/rpc';
import { createSolanaRpcSubscriptions } from '@solana/rpc-subscriptions';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { RpcSubscriptions, SolanaRpcSubscriptionsApi } from '@solana/rpc-subscriptions';
import type { Commitment } from '@solana/rpc-types';

/**
 * Client configuration interface
 */
export interface IPodAIClientConfig {
  rpcEndpoint: string;
  programId?: string;
  commitment?: Commitment;
  wsEndpoint?: string | undefined;
}

/**
 * Modern PodAI Client using Web3.js v2 patterns
 */
export class PodAIClient {
  private readonly rpc: Rpc<SolanaRpcApi>;
  private readonly rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
  private readonly programId: Address;
  private readonly commitment: Commitment;
  private readonly wsEndpoint?: string | undefined;
  private readonly rpcEndpoint: string;

  // Service instances
  private _agentService?: AgentService;
  private _channelService?: ChannelService;
  private _messageService?: MessageService;
  private _escrowService?: EscrowService;
  private _auctionService?: AuctionService;
  private _bulkDealsService?: BulkDealsService;
  private _reputationService?: ReputationService;

  constructor(config: IPodAIClientConfig) {
    // Store the RPC endpoint
    this.rpcEndpoint = config.rpcEndpoint;
    
    // Initialize RPC connection
    this.rpc = createSolanaRpc(config.rpcEndpoint);
    
    // Initialize RPC subscriptions - use WebSocket endpoint if provided, otherwise derive from RPC endpoint
    const wsEndpoint = config.wsEndpoint ?? config.rpcEndpoint.replace('https://', 'wss://').replace('http://', 'ws://');
    this.rpcSubscriptions = createSolanaRpcSubscriptions(wsEndpoint);
    
    // Set program ID
    this.programId = this.parseAddress(
      config.programId ?? '4ufTpHynyoWzSL3d2EL4PU1hSra1tKvQrQiBwJ82x385'
    );
    
    // Set commitment level
    this.commitment = config.commitment ?? 'confirmed';
    
    // Set WebSocket endpoint
    this.wsEndpoint = config.wsEndpoint;

    console.log('🚀 PodAI Client initialized successfully');
    console.log(`📡 RPC Endpoint: ${config.rpcEndpoint}`);
    console.log(`🔗 WS Endpoint: ${wsEndpoint}`);
    console.log(`🎯 Program ID: ${String(this.programId)}`);
    console.log(`⚙️ Commitment: ${this.commitment}`);
  }

  /**
   * Get Agent Service (lazy-loaded)
   */
  public get agents(): AgentService {
    if (!this._agentService) {
      this._agentService = new AgentService(
      this.rpc,
        this.rpcSubscriptions,
      this.programId,
      this.commitment
    );
    }
    return this._agentService;
  }

  /**
   * Get Channel Service (lazy-loaded)
   */
  public get channels(): ChannelService {
    if (!this._channelService) {
      this._channelService = new ChannelService(
      this.rpc,
        this.rpcSubscriptions,
      this.programId,
      this.commitment
    );
    }
    return this._channelService;
  }

  /**
   * Get Message Service (lazy-loaded)
   */
  public get messages(): MessageService {
    if (!this._messageService) {
      this._messageService = new MessageService(
        this.rpc,
        this.rpcSubscriptions,
        this.programId,
        this.commitment
      );
    }
    return this._messageService;
  }

  /**
   * Get Escrow Service (lazy-loaded)
   */
  public get escrow(): EscrowService {
    if (!this._escrowService) {
      this._escrowService = new EscrowService(
        this.rpc,
        this.programId,
        this.commitment
      );
    }
    return this._escrowService;
  }

  /**
   * Get Auction Service (lazy-loaded)
   */
  public get auctions(): AuctionService {
    if (!this._auctionService) {
      this._auctionService = new AuctionService(
        this.rpc,
        this.programId,
        this.commitment
      );
    }
    return this._auctionService;
  }

  /**
   * Get Bulk Deals Service (lazy-loaded)
   */
  public get bulkDeals(): BulkDealsService {
    if (!this._bulkDealsService) {
      this._bulkDealsService = new BulkDealsService(
        this.rpc,
        this.programId,
        this.commitment
      );
    }
    return this._bulkDealsService;
  }

  /**
   * Get Reputation Service (lazy-loaded)
   */
  public get reputation(): ReputationService {
    if (!this._reputationService) {
      this._reputationService = new ReputationService(
        this.rpc,
        this.programId,
        this.commitment
      );
    }
    return this._reputationService;
  }

  /**
   * Get RPC client
   */
  public getRpc(): Rpc<SolanaRpcApi> {
    return this.rpc;
  }

  /**
   * Get RPC subscriptions client
   */
  public getRpcSubscriptions(): RpcSubscriptions<SolanaRpcSubscriptionsApi> {
    return this.rpcSubscriptions;
  }

  /**
   * Get program ID
   */
  public getProgramId(): Address {
    return this.programId;
  }

  /**
   * Get commitment level
   */
  public getCommitment(): Commitment {
    return this.commitment;
  }

  /**
   * Get WebSocket endpoint
   */
  public getWsEndpoint(): string | undefined {
    return this.wsEndpoint;
  }

  /**
   * Check if connected to cluster
   */
  public async isConnected(): Promise<boolean> {
    try {
      const health = await this.rpc.getHealth().send();
      return health === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Get cluster information
   */
  public async getClusterInfo(): Promise<{
    cluster: string;
    blockHeight: number;
    health: string;
  }> {
    try {
      const [health, blockHeight] = await Promise.all([
        this.rpc.getHealth().send(),
        this.rpc.getBlockHeight({ commitment: this.commitment }).send(),
      ]);

      return {
        cluster: this.detectCluster(),
        blockHeight: Number(blockHeight),
        health,
      };
    } catch (error) {
      throw new Error(`Failed to get cluster info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get account balance in SOL
   */
  public async getBalance(address: Address): Promise<number> {
    try {
      const balanceResult = await this.rpc
        .getBalance(address, { commitment: this.commitment })
        .send();
      
      // Convert lamports to SOL
      return Number(balanceResult.value) / 1_000_000_000;
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Airdrop SOL to an address (devnet only)
   */
  public async airdrop(address: Address, solAmount: number): Promise<string> {
    try {
      const lamports = BigInt(Math.floor(solAmount * 1_000_000_000));

      const signature = await this.rpc
        .requestAirdrop(address, lamports as any)
        .send();

      console.log(`💰 Airdropped ${solAmount} SOL to ${address}`);
      return signature;
    } catch (error) {
      throw new Error(`Airdrop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  public async confirmTransaction(
    signature: string,
    timeout: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.rpc
          .getSignatureStatuses([signature as any])
          .send();

        const signatureStatus = status.value[0];
        if (signatureStatus?.confirmationStatus === this.commitment) {
          return !signatureStatus.err;
      }
      } catch {
        // Continue trying
      }

      // Wait 1 second before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Parse address string to Address type
   */
  private parseAddress(addressString: string): Address {
    try {
      return addressString as Address;
    } catch (error) {
      throw new Error(`Invalid address string: ${addressString}. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Detect cluster from RPC endpoint
   */
  private detectCluster(): string {
    if (this.rpcEndpoint.includes('devnet')) return 'devnet';
    if (this.rpcEndpoint.includes('testnet')) return 'testnet';
    if (this.rpcEndpoint.includes('mainnet') || this.rpcEndpoint.includes('api.mainnet')) return 'mainnet-beta';
    if (this.rpcEndpoint.includes('localhost') || this.rpcEndpoint.includes('127.0.0.1')) return 'localnet';
    
    return 'devnet'; // Default to devnet if can't detect
  }
}

/**
 * Create a PodAI client instance
 */
export function createPodAIClient(config: IPodAIClientConfig): PodAIClient {
  return new PodAIClient(config);
}

/**
 * Create a devnet client instance
 */
export function createDevnetClient(programId?: string): PodAIClient {
  return new PodAIClient({
    rpcEndpoint: 'https://api.devnet.solana.com',
    ...(programId && { programId }),
    commitment: 'confirmed',
  });
}

/**
 * Create a localnet client instance
 */
export function createLocalnetClient(programId?: string): PodAIClient {
  return new PodAIClient({
    rpcEndpoint: 'http://127.0.0.1:8899',
    ...(programId && { programId }),
    commitment: 'confirmed',
  });
}

/**
 * Create a mainnet client instance
 */
export function createMainnetClient(programId?: string): PodAIClient {
  return new PodAIClient({
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    ...(programId && { programId }),
    commitment: 'confirmed',
  });
} 