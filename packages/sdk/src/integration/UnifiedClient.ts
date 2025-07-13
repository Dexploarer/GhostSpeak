/**
 * UnifiedClient - Integrated client for CLI and SDK operations
 * 
 * This module provides a unified interface that combines configuration,
 * state management, and SDK operations for seamless CLI/SDK integration.
 */

import { address, type Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import { createSolanaRpc } from '@solana/rpc';
import type { KeyPairSigner } from '@solana/signers';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { SharedConfig, type SharedConfiguration } from '../config/SharedConfig.js';
import { SharedStateManager } from '../state/SharedStateManager.js';
import { PodAIClient, createPodAIClient } from '../client-v2.js';
import type { IPodAIClientConfig } from '../client-v2.js';
import { AgentService } from '../services/agent.js';
import { ChannelService, ChannelVisibility } from '../services/channel.js';
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
  private rpc?: Rpc<SolanaRpcApi>;
  private signer?: KeyPairSigner;
  
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
    
    // Create RPC connection
    this.rpc = createSolanaRpc(networkConfig.rpcUrl);
    
    // Load keypair and convert to signer
    const keypair = await this.config.getKeypair();
    if (keypair) {
      // Convert legacy keypair to Web3.js v2 signer
      this.signer = await createKeyPairSignerFromBytes(keypair.secretKey);
      
      // Create SDK client with proper config
      const clientConfig: IPodAIClientConfig = {
        rpcEndpoint: networkConfig.rpcUrl,
        commitment: networkConfig.commitment || 'confirmed',
        network: networkConfig.network as any,
      };
      
      this.sdkClient = createPodAIClient(clientConfig);
    }
  }
  
  /**
   * Get or create agent service
   */
  async getAgentService(): Promise<AgentService> {
    if (!this.sdkClient) {
      throw new Error('SDK client not initialized. Please set up a wallet first.');
    }
    return this.sdkClient.agents;
  }
  
  /**
   * Get or create channel service
   */
  async getChannelService(): Promise<ChannelService> {
    if (!this.sdkClient) {
      throw new Error('SDK client not initialized. Please set up a wallet first.');
    }
    return this.sdkClient.channels;
  }
  
  /**
   * Get or create message service
   */
  async getMessageService(): Promise<MessageService> {
    if (!this.sdkClient) {
      throw new Error('SDK client not initialized. Please set up a wallet first.');
    }
    return this.sdkClient.messages;
  }
  
  /**
   * Get or create escrow service
   */
  async getEscrowService(): Promise<EscrowService> {
    if (!this.sdkClient) {
      throw new Error('SDK client not initialized. Please set up a wallet first.');
    }
    return this.sdkClient.escrow;
  }
  
  /**
   * Get or create marketplace service
   */
  async getMarketplaceService(): Promise<MarketplaceService> {
    if (!this.sdkClient) {
      throw new Error('SDK client not initialized. Please set up a wallet first.');
    }
    // Note: marketplace service may not be exposed on PodAIClient yet
    throw new Error('Marketplace service not yet available on PodAIClient');
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
      if (!this.signer) {
        throw new Error('No signer available. Please set up a wallet first.');
      }
      
      const result = await agentService.registerAgent(this.signer, {
        name,
        description: description || '',
        capabilities: capabilities?.map(c => parseInt(c) || 0) || [],
        metadata: { type },
      });
      
      // Update transaction record
      txRecord.signature = result.signature;
      await this.stateManager.addPendingTransaction(txRecord);
      
      // Save agent info to config
      await this.config.addAgent({
        address: result.agentPda,
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
      
      return {
        address: result.agentPda,
        signature: result.signature,
      };
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
      if (!this.signer) {
        throw new Error('No signer available. Please set up a wallet first.');
      }
      
      const result = await channelService.createChannel(this.signer, {
        name,
        description: description || '',
        visibility: type === 'public' ? ChannelVisibility.PUBLIC : ChannelVisibility.PRIVATE,
        maxParticipants: maxParticipants || 100,
      });
      
      // Update transaction record
      txRecord.signature = result.signature;
      await this.stateManager.addPendingTransaction(txRecord);
      
      // Save channel info to config
      await this.config.addChannel({
        address: result.channelPda,
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
      
      return {
        address: result.channelPda,
        signature: result.signature,
      };
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
      if (!this.signer) {
        throw new Error('No signer available. Please set up a wallet first.');
      }
      
      const result = await messageService.sendMessage(this.signer, {
        channelAddress: channel.address,
        content,
        messageType: options?.contentType || 'text/plain',
        metadata: options?.replyTo ? { threadId: options.replyTo } : undefined,
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
      
      return {
        messageId: result.messagePda,
        signature: result.signature,
      };
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
              participantCount: undefined, // Participant count not available in current channel structure
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
   * Get RPC connection
   */
  getRpc(): Rpc<SolanaRpcApi> | undefined {
    return this.rpc;
  }
  
  /**
   * Get signer
   */
  getSigner(): KeyPairSigner | undefined {
    return this.signer;
  }
  
  /**
   * Set signer from keypair bytes
   */
  async setSignerFromBytes(secretKey: Uint8Array): Promise<void> {
    this.signer = await createKeyPairSignerFromBytes(secretKey);
    await this.config.setWallet({
      publicKey: this.signer.address,
      privateKey: secretKey,
    });
    
    // Reinitialize connection with new signer
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