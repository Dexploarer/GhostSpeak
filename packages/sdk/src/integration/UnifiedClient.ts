/**
 * UnifiedClient - Integrated client for CLI and SDK operations
 * 
 * This module provides a unified interface that combines configuration,
 * state management, and SDK operations for seamless CLI/SDK integration.
 */

import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { address, type Address } from '@solana/addresses';
import { SharedConfig, type SharedConfiguration } from '../config/SharedConfig.js';
import { SharedStateManager } from '../state/SharedStateManager.js';
import { PodAIClient, createPodAIClient, type IMinimalClientConfig } from '../client-v2.js';
import { AgentService } from '../services/agent.js';
import { ChannelService } from '../services/channel.js';
import { MessageService } from '../services/message.js';
import { EscrowService } from '../services/escrow.js';
import { MarketplaceService } from '../services/marketplace.js';

export interface UnifiedClientOptions {
  configPath?: string;
  statePath?: string;
  autoStartSession?: boolean;
  network?: 'devnet' | 'testnet' | 'mainnet-beta';
  rpcUrl?: string;
  keypairPath?: string;
}

export class UnifiedClient {
  private config: SharedConfig;
  private stateManager: SharedStateManager;
  private sdkClient?: PodAIClient;
  private connection?: Connection;
  private keypair?: Keypair;
  
  // Service instances
  private agentService?: AgentService;
  private channelService?: ChannelService;
  private messageService?: MessageService;
  private escrowService?: EscrowService;
  private marketplaceService?: MarketplaceService;
  
  private constructor(
    config: SharedConfig,
    stateManager: SharedStateManager
  ) {
    this.config = config;
    this.stateManager = stateManager;
  }
  
  /**
   * Create and initialize a unified client
   */
  static async create(options: UnifiedClientOptions = {}): Promise<UnifiedClient> {
    // Load shared configuration
    const config = await SharedConfig.load(options.configPath);
    
    // Load shared state manager
    const stateManager = await SharedStateManager.getInstance(options.statePath);
    
    // Create client instance
    const client = new UnifiedClient(config, stateManager);
    
    // Apply options
    if (options.network || options.rpcUrl) {
      await config.setNetwork({
        network: options.network,
        rpcUrl: options.rpcUrl,
      });
    }
    
    if (options.keypairPath) {
      await config.setWallet({ keypairPath: options.keypairPath });
    }
    
    // Initialize connection
    await client.initializeConnection();
    
    // Start session if requested
    if (options.autoStartSession) {
      await stateManager.startSession();
    }
    
    return client;
  }
  
  /**
   * Initialize Solana connection and SDK client
   */
  private async initializeConnection(): Promise<void> {
    const networkConfig = this.config.getNetwork();
    
    // Create connection
    this.connection = new Connection(networkConfig.rpcUrl, {
      commitment: networkConfig.commitment || 'confirmed',
    });
    
    // Load keypair
    this.keypair = await this.config.getKeypair() || undefined;
    
    // Create SDK client if we have a keypair
    if (this.keypair) {
      const clientConfig: IMinimalClientConfig = {
        connection: this.connection,
        wallet: {
          publicKey: this.keypair.publicKey,
          signTransaction: async (tx) => {
            tx.sign([this.keypair!]);
            return tx;
          },
          signAllTransactions: async (txs) => {
            return txs.map(tx => {
              tx.sign([this.keypair!]);
              return tx;
            });
          },
        },
      };
      
      this.sdkClient = await createPodAIClient(clientConfig);
    }
  }
  
  /**
   * Get or create agent service
   */
  async getAgentService(): Promise<AgentService> {
    if (!this.agentService) {
      if (!this.sdkClient) {
        throw new Error('SDK client not initialized. Please set up a wallet first.');
      }
      this.agentService = new AgentService(this.sdkClient);
    }
    return this.agentService;
  }
  
  /**
   * Get or create channel service
   */
  async getChannelService(): Promise<ChannelService> {
    if (!this.channelService) {
      if (!this.sdkClient) {
        throw new Error('SDK client not initialized. Please set up a wallet first.');
      }
      this.channelService = new ChannelService(this.sdkClient);
    }
    return this.channelService;
  }
  
  /**
   * Get or create message service
   */
  async getMessageService(): Promise<MessageService> {
    if (!this.messageService) {
      if (!this.sdkClient) {
        throw new Error('SDK client not initialized. Please set up a wallet first.');
      }
      this.messageService = new MessageService(this.sdkClient);
    }
    return this.messageService;
  }
  
  /**
   * Get or create escrow service
   */
  async getEscrowService(): Promise<EscrowService> {
    if (!this.escrowService) {
      if (!this.sdkClient) {
        throw new Error('SDK client not initialized. Please set up a wallet first.');
      }
      this.escrowService = new EscrowService(this.sdkClient);
    }
    return this.escrowService;
  }
  
  /**
   * Get or create marketplace service
   */
  async getMarketplaceService(): Promise<MarketplaceService> {
    if (!this.marketplaceService) {
      if (!this.sdkClient) {
        throw new Error('SDK client not initialized. Please set up a wallet first.');
      }
      this.marketplaceService = new MarketplaceService(this.sdkClient);
    }
    return this.marketplaceService;
  }
  
  /**
   * Register a new agent
   */
  async registerAgent(
    name: string,
    type: string,
    description?: string,
    capabilities?: string[]
  ): Promise<{ address: Address; signature: string }> {
    const agentService = await this.getAgentService();
    
    // Start tracking transaction
    const txRecord = {
      signature: 'pending',
      type: 'agent_registration',
      timestamp: new Date(),
      details: { name, type },
    };
    
    try {
      // Register agent through SDK
      const result = await agentService.createAgent({
        name,
        type,
        description,
        capabilities,
      });
      
      // Update transaction record
      txRecord.signature = result.signature;
      await this.stateManager.addPendingTransaction(txRecord);
      
      // Save agent info to config
      await this.config.addAgent({
        address: result.address,
        name,
        type,
        description,
        capabilities,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
      
      // Update state
      await this.stateManager.setActiveAgent(name);
      await this.stateManager.incrementStats('totalAgentsCreated');
      await this.stateManager.updateTransactionStatus(result.signature, 'confirmed');
      
      return result;
    } catch (error) {
      if (txRecord.signature !== 'pending') {
        await this.stateManager.updateTransactionStatus(txRecord.signature, 'failed');
      }
      throw error;
    }
  }
  
  /**
   * Create a new channel
   */
  async createChannel(
    name: string,
    type: 'public' | 'private',
    description?: string,
    maxParticipants?: number
  ): Promise<{ address: Address; signature: string }> {
    const channelService = await this.getChannelService();
    
    // Start tracking transaction
    const txRecord = {
      signature: 'pending',
      type: 'channel_creation',
      timestamp: new Date(),
      details: { name, type },
    };
    
    try {
      // Create channel through SDK
      const result = await channelService.createChannel({
        name,
        description,
        visibility: type === 'public' ? 'public' : 'private',
        maxParticipants,
      });
      
      // Update transaction record
      txRecord.signature = result.signature;
      await this.stateManager.addPendingTransaction(txRecord);
      
      // Save channel info to config
      await this.config.addChannel({
        address: result.address,
        name,
        type,
        description,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
      
      // Update state
      await this.stateManager.setActiveChannel(name);
      await this.stateManager.incrementStats('totalChannelsCreated');
      await this.stateManager.updateTransactionStatus(result.signature, 'confirmed');
      
      return result;
    } catch (error) {
      if (txRecord.signature !== 'pending') {
        await this.stateManager.updateTransactionStatus(txRecord.signature, 'failed');
      }
      throw error;
    }
  }
  
  /**
   * Send a message
   */
  async sendMessage(
    channelName: string,
    content: string,
    options?: {
      contentType?: string;
      encrypted?: boolean;
      replyTo?: string;
    }
  ): Promise<{ messageId: string; signature: string }> {
    const messageService = await this.getMessageService();
    
    // Get channel info
    const channel = this.config.getChannel(channelName);
    if (!channel) {
      throw new Error(`Channel "${channelName}" not found`);
    }
    
    // Start tracking transaction
    const txRecord = {
      signature: 'pending',
      type: 'message_send',
      timestamp: new Date(),
      details: { channelName, contentLength: content.length },
    };
    
    try {
      // Send message through SDK
      const result = await messageService.sendMessage({
        channelAddress: channel.address,
        content,
        contentType: options?.contentType,
        encrypted: options?.encrypted,
        replyTo: options?.replyTo,
      });
      
      // Update transaction record
      txRecord.signature = result.signature;
      await this.stateManager.addPendingTransaction(txRecord);
      
      // Update state
      await this.stateManager.incrementStats('totalMessagessSent');
      await this.stateManager.updateTransactionStatus(result.signature, 'confirmed');
      
      // Update channel last used
      channel.lastUsed = new Date();
      await this.config.addChannel(channel);
      
      return result;
    } catch (error) {
      if (txRecord.signature !== 'pending') {
        await this.stateManager.updateTransactionStatus(txRecord.signature, 'failed');
      }
      throw error;
    }
  }
  
  /**
   * List agents
   */
  async listAgents(): Promise<Array<{
    name: string;
    address: Address;
    type: string;
    description?: string;
    onChain: boolean;
  }>> {
    // Get local agents from config
    const localAgents = this.config.listAgents();
    
    // If we have SDK client, check on-chain status
    if (this.sdkClient) {
      const agentService = await this.getAgentService();
      const results = await Promise.all(
        localAgents.map(async (agent) => {
          try {
            const onChainAgent = await agentService.getAgent(agent.address);
            return {
              name: agent.name,
              address: agent.address,
              type: agent.type,
              description: agent.description,
              onChain: !!onChainAgent,
            };
          } catch {
            return {
              name: agent.name,
              address: agent.address,
              type: agent.type,
              description: agent.description,
              onChain: false,
            };
          }
        })
      );
      return results;
    }
    
    // Return local agents with unknown on-chain status
    return localAgents.map(agent => ({
      name: agent.name,
      address: agent.address,
      type: agent.type,
      description: agent.description,
      onChain: false,
    }));
  }
  
  /**
   * List channels
   */
  async listChannels(): Promise<Array<{
    name: string;
    address: Address;
    type: 'public' | 'private';
    description?: string;
    participantCount?: number;
    onChain: boolean;
  }>> {
    // Get local channels from config
    const localChannels = this.config.listChannels();
    
    // If we have SDK client, check on-chain status
    if (this.sdkClient) {
      const channelService = await this.getChannelService();
      const results = await Promise.all(
        localChannels.map(async (channel) => {
          try {
            const onChainChannel = await channelService.getChannel(channel.address);
            return {
              name: channel.name,
              address: channel.address,
              type: channel.type,
              description: channel.description,
              participantCount: onChainChannel?.participants?.length,
              onChain: !!onChainChannel,
            };
          } catch {
            return {
              name: channel.name,
              address: channel.address,
              type: channel.type,
              description: channel.description,
              onChain: false,
            };
          }
        })
      );
      return results;
    }
    
    // Return local channels with unknown on-chain status
    return localChannels.map(channel => ({
      name: channel.name,
      address: channel.address,
      type: channel.type,
      description: channel.description,
      onChain: false,
    }));
  }
  
  /**
   * Get configuration
   */
  getConfig(): SharedConfiguration {
    return this.config.get();
  }
  
  /**
   * Update configuration
   */
  async updateConfig(updates: any): Promise<void> {
    await this.config.update(updates);
  }
  
  /**
   * Get current session
   */
  getCurrentSession() {
    return this.stateManager.getCurrentSession();
  }
  
  /**
   * Get runtime state
   */
  getState() {
    return this.stateManager.getState();
  }
  
  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (event: any) => void): () => void {
    this.stateManager.on('stateChange', listener);
    return () => {
      this.stateManager.off('stateChange', listener);
    };
  }
  
  /**
   * Get connection
   */
  getConnection(): Connection | undefined {
    return this.connection;
  }
  
  /**
   * Get keypair
   */
  getKeypair(): Keypair | undefined {
    return this.keypair;
  }
  
  /**
   * Set keypair
   */
  async setKeypair(keypair: Keypair): Promise<void> {
    this.keypair = keypair;
    await this.config.setWallet({
      publicKey: keypair.publicKey.toBase58(),
      privateKey: keypair.secretKey,
    });
    
    // Reinitialize connection with new keypair
    await this.initializeConnection();
  }
  
  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    // Clean up old sessions
    await this.stateManager.cleanupOldSessions();
  }
}

export default UnifiedClient;