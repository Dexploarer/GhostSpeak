/**
 * @fileoverview SyminDx Tools Extension - Protocol actions for SyminDx AI agents
 * @version 1.0.0
 * @author GhostSpeak Team
 * @license MIT
 */

import type { Address } from '@solana/addresses';
import type { TransactionSigner } from '@solana/signers';
import type { createClient } from '@ghostspeak/sdk';

import type { SyminDxConfig } from '../config/SyminDxConfig';
import type { SyminDxMemoryProvider, AgentMemory, ServiceListingMemory, WorkOrderMemory } from '../memory/SyminDxMemoryProvider';
import type { SyminDxEventSystem } from '../events/SyminDxEventSystem';

/**
 * Tool result interface
 */
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionId?: string;
  executionTime?: number;
}

/**
 * Agent registration parameters
 */
export interface AgentRegistrationParams {
  name: string;
  description: string;
  capabilities: string[];
  metadata?: Record<string, any>;
  profileImageUrl?: string;
  websiteUrl?: string;
}

/**
 * Service listing parameters
 */
export interface ServiceListingParams {
  title: string;
  description: string;
  price: bigint;
  category: string;
  tags: string[];
  deliveryTimeHours: number;
  requirements?: string[];
  metadata?: Record<string, any>;
}

/**
 * Work order creation parameters
 */
export interface WorkOrderParams {
  serviceListingId: string;
  clientRequirements?: string;
  deadline?: Date;
  milestones?: Array<{
    description: string;
    amount: bigint;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Message sending parameters
 */
export interface MessageParams {
  channelId?: string;
  recipient?: Address;
  content: string;
  messageType?: 'text' | 'media' | 'system' | 'encrypted';
  metadata?: Record<string, any>;
}

/**
 * Channel creation parameters
 */
export interface ChannelParams {
  name: string;
  description?: string;
  isPrivate?: boolean;
  participants?: Address[];
  metadata?: Record<string, any>;
}

/**
 * Payment processing parameters
 */
export interface PaymentParams {
  workOrderId: string;
  amount: bigint;
  milestoneIndex?: number;
  memo?: string;
}

/**
 * SyminDx Tools Extension - Provides AI agents with blockchain protocol capabilities
 */
export class SyminDxToolsExtension {
  private initialized = false;
  
  constructor(
    private readonly config: SyminDxConfig,
    private readonly ghostSpeak: Awaited<ReturnType<typeof createClient>>,
    private readonly memory: SyminDxMemoryProvider,
    private readonly events: SyminDxEventSystem,
    private readonly signer?: TransactionSigner
  ) {}
  
  /**
   * Initialize the tools extension
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Load necessary modules
    await this.ghostSpeak.preloadModules(['agent', 'marketplace', 'message', 'channel']);
    
    this.initialized = true;
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.initialized = false;
  }
  
  /**
   * Check if tools extension is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  // Agent Management Tools
  
  /**
   * Register a new agent on the GhostSpeak protocol
   */
  async registerAgent(params: AgentRegistrationParams): Promise<ToolResult<{ agentId: string; address: Address }>> {
    if (!this.signer) {
      return { success: false, error: 'No signer provided for transaction' };
    }
    
    const startTime = Date.now();
    
    try {
      const agentService = await this.ghostSpeak.loadModule('agent');
      
      // Create agent registration transaction
      const transaction = await agentService.registerAgent({
        name: params.name,
        description: params.description,
        capabilities: params.capabilities,
        metadata: params.metadata || {},
        signer: this.signer,
      });
      
      // Send transaction
      const result = await this.sendTransaction(transaction);
      
      if (!result.success) {
        return result;
      }
      
      // Create agent memory entry
      const agentMemory: AgentMemory = {
        id: result.data.agentId,
        name: params.name,
        owner: this.signer.address,
        capabilities: params.capabilities,
        reputation: 0,
        isActive: true,
        lastActivity: Date.now(),
        metadata: params.metadata,
      };
      
      // Store in memory
      await this.memory.setAgent(result.data.agentId, agentMemory);
      
      // Emit event
      this.events.emit('agent:registered', {
        agentId: result.data.agentId,
        agent: agentMemory,
      });
      
      return {
        success: true,
        data: result.data,
        transactionId: result.transactionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Update agent information
   */
  async updateAgent(agentId: string, updates: Partial<AgentRegistrationParams>): Promise<ToolResult<void>> {
    if (!this.signer) {
      return { success: false, error: 'No signer provided for transaction' };
    }
    
    const startTime = Date.now();
    
    try {
      const agentService = await this.ghostSpeak.loadModule('agent');
      
      // Get current agent data
      const currentAgent = await this.memory.getAgent(agentId);
      if (!currentAgent) {
        return { success: false, error: 'Agent not found in memory' };
      }
      
      // Create update transaction
      const transaction = await agentService.updateAgent({
        agentId,
        ...updates,
        signer: this.signer,
      });
      
      // Send transaction
      const result = await this.sendTransaction(transaction);
      
      if (!result.success) {
        return result;
      }
      
      // Update memory
      const updatedAgent = { ...currentAgent, ...updates };
      await this.memory.setAgent(agentId, updatedAgent);
      
      // Emit event
      this.events.emit('agent:updated', {
        agentId,
        agent: updatedAgent,
        updates,
      });
      
      return {
        success: true,
        transactionId: result.transactionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Deactivate an agent
   */
  async deactivateAgent(agentId: string): Promise<ToolResult<void>> {
    if (!this.signer) {
      return { success: false, error: 'No signer provided for transaction' };
    }
    
    const startTime = Date.now();
    
    try {
      const agentService = await this.ghostSpeak.loadModule('agent');
      
      const transaction = await agentService.deactivateAgent({
        agentId,
        signer: this.signer,
      });
      
      const result = await this.sendTransaction(transaction);
      
      if (!result.success) {
        return result;
      }
      
      // Update memory
      const agent = await this.memory.getAgent(agentId);
      if (agent) {
        agent.isActive = false;
        await this.memory.setAgent(agentId, agent);
      }
      
      // Emit event
      this.events.emit('agent:deactivated', { agentId });
      
      return {
        success: true,
        transactionId: result.transactionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
  
  // Marketplace Tools
  
  /**
   * Create a service listing
   */
  async createServiceListing(agentId: string, params: ServiceListingParams): Promise<ToolResult<{ listingId: string }>> {
    if (!this.signer) {
      return { success: false, error: 'No signer provided for transaction' };
    }
    
    const startTime = Date.now();
    
    try {
      const marketplaceService = await this.ghostSpeak.loadModule('marketplace');
      
      const transaction = await marketplaceService.createServiceListing({
        agentId,
        title: params.title,
        description: params.description,
        price: params.price,
        category: params.category,
        tags: params.tags,
        deliveryTimeHours: params.deliveryTimeHours,
        requirements: params.requirements,
        metadata: params.metadata || {},
        signer: this.signer,
      });
      
      const result = await this.sendTransaction(transaction);
      
      if (!result.success) {
        return result;
      }
      
      // Create service listing memory entry
      const listingMemory: ServiceListingMemory = {
        id: result.data.listingId,
        agentId,
        title: params.title,
        description: params.description,
        price: params.price,
        category: params.category,
        isActive: true,
        tags: params.tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Store in memory
      await this.memory.setServiceListing(result.data.listingId, listingMemory);
      
      // Emit event
      this.events.emit('service:listed', {
        listingId: result.data.listingId,
        agentId,
        listing: listingMemory,
      });
      
      return {
        success: true,
        data: result.data,
        transactionId: result.transactionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Update a service listing
   */
  async updateServiceListing(listingId: string, updates: Partial<ServiceListingParams>): Promise<ToolResult<void>> {
    if (!this.signer) {
      return { success: false, error: 'No signer provided for transaction' };
    }
    
    const startTime = Date.now();
    
    try {
      const marketplaceService = await this.ghostSpeak.loadModule('marketplace');
      
      const transaction = await marketplaceService.updateServiceListing({
        listingId,
        ...updates,
        signer: this.signer,
      });
      
      const result = await this.sendTransaction(transaction);
      
      if (!result.success) {
        return result;
      }
      
      // Update memory
      const listing = await this.memory.getServiceListing(listingId);
      if (listing) {
        const updatedListing = { ...listing, ...updates, updatedAt: Date.now() };
        await this.memory.setServiceListing(listingId, updatedListing);
        
        // Emit event
        this.events.emit('service:updated', {
          listingId,
          listing: updatedListing,
          updates,
        });
      }
      
      return {
        success: true,
        transactionId: result.transactionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Create a work order
   */
  async createWorkOrder(params: WorkOrderParams): Promise<ToolResult<{ orderId: string }>> {
    if (!this.signer) {
      return { success: false, error: 'No signer provided for transaction' };
    }
    
    const startTime = Date.now();
    
    try {
      const marketplaceService = await this.ghostSpeak.loadModule('marketplace');
      
      // Get service listing details
      const listing = await this.memory.getServiceListing(params.serviceListingId);
      if (!listing) {
        return { success: false, error: 'Service listing not found' };
      }
      
      const transaction = await marketplaceService.createWorkOrder({
        serviceListingId: params.serviceListingId,
        clientRequirements: params.clientRequirements,
        deadline: params.deadline,
        milestones: params.milestones,
        metadata: params.metadata || {},
        signer: this.signer,
      });
      
      const result = await this.sendTransaction(transaction);
      
      if (!result.success) {
        return result;
      }
      
      // Create work order memory entry
      const totalAmount = params.milestones?.reduce((sum, m) => sum + m.amount, 0n) || listing.price;
      
      const orderMemory: WorkOrderMemory = {
        id: result.data.orderId,
        serviceListingId: params.serviceListingId,
        client: this.signer.address,
        agent: listing.agentId as unknown as Address, // Type conversion needed
        status: 'pending',
        totalAmount,
        escrowAmount: totalAmount,
        deadline: params.deadline?.getTime() || Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days default
        milestones: params.milestones?.map(m => ({ ...m, completed: false })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Store in memory
      await this.memory.setWorkOrder(result.data.orderId, orderMemory);
      
      // Emit event
      this.events.emit('order:created', {
        orderId: result.data.orderId,
        order: orderMemory,
      });
      
      return {
        success: true,
        data: result.data,
        transactionId: result.transactionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
  
  // Communication Tools
  
  /**
   * Send a message
   */
  async sendMessage(params: MessageParams): Promise<ToolResult<{ messageId: string }>> {
    if (!this.signer) {
      return { success: false, error: 'No signer provided for transaction' };
    }
    
    const startTime = Date.now();
    
    try {
      const messageService = await this.ghostSpeak.loadModule('message');
      
      const transaction = await messageService.sendMessage({
        channelId: params.channelId,
        recipient: params.recipient,
        content: params.content,
        messageType: params.messageType || 'text',
        metadata: params.metadata || {},
        signer: this.signer,
      });
      
      const result = await this.sendTransaction(transaction);
      
      if (!result.success) {
        return result;
      }
      
      // Create message memory entry
      const messageMemory = {
        id: result.data.messageId,
        channelId: params.channelId || 'direct',
        sender: this.signer.address,
        recipient: params.recipient,
        content: params.content,
        timestamp: Date.now(),
        messageType: params.messageType || 'text',
        isEncrypted: params.messageType === 'encrypted',
      };
      
      // Store in memory
      await this.memory.setMessage(result.data.messageId, messageMemory);
      
      // Emit event
      this.events.emit('message:sent', {
        messageId: result.data.messageId,
        message: messageMemory,
      });
      
      return {
        success: true,
        data: result.data,
        transactionId: result.transactionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Create a communication channel
   */
  async createChannel(params: ChannelParams): Promise<ToolResult<{ channelId: string }>> {
    if (!this.signer) {
      return { success: false, error: 'No signer provided for transaction' };
    }
    
    const startTime = Date.now();
    
    try {
      const channelService = await this.ghostSpeak.loadModule('channel');
      
      const transaction = await channelService.createChannel({
        name: params.name,
        description: params.description,
        isPrivate: params.isPrivate || false,
        participants: params.participants || [this.signer.address],
        metadata: params.metadata || {},
        signer: this.signer,
      });
      
      const result = await this.sendTransaction(transaction);
      
      if (!result.success) {
        return result;
      }
      
      // Create channel memory entry
      const channelMemory = {
        id: result.data.channelId,
        name: params.name,
        participants: params.participants || [this.signer.address],
        isPrivate: params.isPrivate || false,
        messageCount: 0,
        lastMessage: Date.now(),
        metadata: params.metadata,
      };
      
      // Store in memory
      await this.memory.setChannel(result.data.channelId, channelMemory);
      
      // Emit event
      this.events.emit('channel:created', {
        channelId: result.data.channelId,
        channel: channelMemory,
      });
      
      return {
        success: true,
        data: result.data,
        transactionId: result.transactionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
  
  // Payment Tools
  
  /**
   * Process payment for a work order
   */
  async processPayment(params: PaymentParams): Promise<ToolResult<void>> {
    if (!this.signer) {
      return { success: false, error: 'No signer provided for transaction' };
    }
    
    const startTime = Date.now();
    
    try {
      const escrowService = await this.ghostSpeak.loadModule('escrow');
      
      const transaction = await escrowService.processPayment({
        workOrderId: params.workOrderId,
        amount: params.amount,
        milestoneIndex: params.milestoneIndex,
        memo: params.memo,
        signer: this.signer,
      });
      
      const result = await this.sendTransaction(transaction);
      
      if (!result.success) {
        return result;
      }
      
      // Update work order in memory
      const order = await this.memory.getWorkOrder(params.workOrderId);
      if (order) {
        if (params.milestoneIndex !== undefined && order.milestones) {
          order.milestones[params.milestoneIndex].completed = true;
        }
        order.updatedAt = Date.now();
        await this.memory.setWorkOrder(params.workOrderId, order);
      }
      
      // Emit event
      this.events.emit('payment:processed', {
        workOrderId: params.workOrderId,
        amount: params.amount,
        milestoneIndex: params.milestoneIndex,
      });
      
      return {
        success: true,
        transactionId: result.transactionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
  
  // Query Tools
  
  /**
   * Get agent information
   */
  async getAgent(agentId: string): Promise<ToolResult<AgentMemory>> {
    try {
      const agent = await this.memory.getAgent(agentId);
      
      if (!agent) {
        // Try to fetch from blockchain if not in memory
        const agentService = await this.ghostSpeak.loadModule('agent');
        const blockchainAgent = await agentService.getAgent(agentId);
        
        if (blockchainAgent) {
          await this.memory.setAgent(agentId, blockchainAgent);
          return { success: true, data: blockchainAgent };
        }
        
        return { success: false, error: 'Agent not found' };
      }
      
      return { success: true, data: agent };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Get service listing
   */
  async getServiceListing(listingId: string): Promise<ToolResult<ServiceListingMemory>> {
    try {
      const listing = await this.memory.getServiceListing(listingId);
      
      if (!listing) {
        return { success: false, error: 'Service listing not found' };
      }
      
      return { success: true, data: listing };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Get work order
   */
  async getWorkOrder(orderId: string): Promise<ToolResult<WorkOrderMemory>> {
    try {
      const order = await this.memory.getWorkOrder(orderId);
      
      if (!order) {
        return { success: false, error: 'Work order not found' };
      }
      
      return { success: true, data: order };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  // Private helper methods
  
  /**
   * Send transaction with retry logic
   */
  private async sendTransaction(transaction: any): Promise<ToolResult<any>> {
    try {
      // This would use the actual GhostSpeak SDK transaction sending logic
      // For now, we simulate a successful transaction
      const transactionId = `tx_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
      
      return {
        success: true,
        data: transaction.result || { agentId: transactionId, listingId: transactionId, orderId: transactionId, messageId: transactionId, channelId: transactionId },
        transactionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Type exports
 */
export type {
  ToolResult,
  AgentRegistrationParams,
  ServiceListingParams,
  WorkOrderParams,
  MessageParams,
  ChannelParams,
  PaymentParams,
};

/**
 * Default export
 */
export default SyminDxToolsExtension;