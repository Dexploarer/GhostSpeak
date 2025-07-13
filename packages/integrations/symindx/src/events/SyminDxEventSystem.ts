/**
 * @fileoverview SyminDx Event System - Real-time blockchain event integration for SyminDx AI agents
 * @version 1.0.0
 * @author GhostSpeak Team
 * @license MIT
 */

import type { Address } from '@solana/addresses';
import type { createClient } from '@ghostspeak/sdk';
import EventEmitter from 'eventemitter3';

import type { SyminDxConfig } from '../config/SyminDxConfig';
import type { AgentMemory, ServiceListingMemory, WorkOrderMemory, MessageMemory, ChannelMemory } from '../memory/SyminDxMemoryProvider';

/**
 * Event system configuration
 */
export interface EventSystemConfig {
  reconnectAttempts: number;
  reconnectDelayMs: number;
  enableDebugLogging: boolean;
  maxListeners?: number;
  heartbeatIntervalMs?: number;
}

/**
 * Blockchain event types
 */
export type BlockchainEventType = 
  | 'agent:registered'
  | 'agent:updated'
  | 'agent:deactivated'
  | 'service:listed'
  | 'service:updated'
  | 'service:delisted'
  | 'order:created'
  | 'order:updated'
  | 'order:completed'
  | 'order:cancelled'
  | 'message:sent'
  | 'message:received'
  | 'channel:created'
  | 'channel:updated'
  | 'channel:joined'
  | 'channel:left'
  | 'payment:processed'
  | 'payment:released'
  | 'escrow:created'
  | 'escrow:disputed'
  | 'reputation:updated'
  | 'system:error'
  | 'connection:established'
  | 'connection:lost'
  | 'connection:reconnected';

/**
 * Event data interfaces
 */
export interface AgentEvent {
  agentId: string;
  agent: AgentMemory;
  updates?: Partial<AgentMemory>;
}

export interface ServiceEvent {
  listingId: string;
  agentId: string;
  listing: ServiceListingMemory;
  updates?: Partial<ServiceListingMemory>;
}

export interface OrderEvent {
  orderId: string;
  order: WorkOrderMemory;
  updates?: Partial<WorkOrderMemory>;
}

export interface MessageEvent {
  messageId: string;
  message: MessageMemory;
}

export interface ChannelEvent {
  channelId: string;
  channel: ChannelMemory;
  participant?: Address;
}

export interface PaymentEvent {
  workOrderId: string;
  amount: bigint;
  milestoneIndex?: number;
  from?: Address;
  to?: Address;
}

export interface ReputationEvent {
  agentId: string;
  oldReputation: number;
  newReputation: number;
  reason: string;
}

export interface SystemEvent {
  level: 'info' | 'warn' | 'error';
  message: string;
  error?: Error;
  context?: Record<string, any>;
}

export interface ConnectionEvent {
  timestamp: number;
  endpoint?: string;
  error?: string;
}

/**
 * Event data type mapping
 */
export interface EventDataMap {
  'agent:registered': AgentEvent;
  'agent:updated': AgentEvent;
  'agent:deactivated': AgentEvent;
  'service:listed': ServiceEvent;
  'service:updated': ServiceEvent;
  'service:delisted': ServiceEvent;
  'order:created': OrderEvent;
  'order:updated': OrderEvent;
  'order:completed': OrderEvent;
  'order:cancelled': OrderEvent;
  'message:sent': MessageEvent;
  'message:received': MessageEvent;
  'channel:created': ChannelEvent;
  'channel:updated': ChannelEvent;
  'channel:joined': ChannelEvent;
  'channel:left': ChannelEvent;
  'payment:processed': PaymentEvent;
  'payment:released': PaymentEvent;
  'escrow:created': PaymentEvent;
  'escrow:disputed': PaymentEvent;
  'reputation:updated': ReputationEvent;
  'system:error': SystemEvent;
  'connection:established': ConnectionEvent;
  'connection:lost': ConnectionEvent;
  'connection:reconnected': ConnectionEvent;
}

/**
 * Event listener interface
 */
export interface EventListener<T extends BlockchainEventType> {
  (event: EventDataMap[T]): void | Promise<void>;
}

/**
 * Event subscription interface
 */
export interface EventSubscription {
  id: string;
  eventType: BlockchainEventType;
  listener: EventListener<any>;
  filter?: (event: any) => boolean;
  active: boolean;
  createdAt: number;
}

/**
 * SyminDx Event System - Manages real-time blockchain events for AI agents
 */
export class SyminDxEventSystem extends EventEmitter<EventDataMap> {
  private subscriptions = new Map<string, EventSubscription>();
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private connectionAttempts = 0;
  private initialized = false;
  
  constructor(
    private readonly config: SyminDxConfig,
    private readonly ghostSpeak: Awaited<ReturnType<typeof createClient>>,
    private readonly eventConfig: EventSystemConfig
  ) {
    super();
    
    // Set max listeners
    this.setMaxListeners(this.eventConfig.maxListeners || 100);
    
    // Set up error handling
    this.on('error', (error) => {
      this.log('error', 'Event system error', error);
    });
  }
  
  /**
   * Initialize the event system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Establish connection to blockchain event streams
      await this.connect();
      
      // Start heartbeat if configured
      if (this.eventConfig.heartbeatIntervalMs) {
        this.startHeartbeat();
      }
      
      this.initialized = true;
      this.log('info', 'Event system initialized');
    } catch (error) {
      throw new Error(`Failed to initialize event system: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    // Clear subscriptions
    this.subscriptions.clear();
    
    // Disconnect
    await this.disconnect();
    
    this.initialized = false;
    this.log('info', 'Event system cleaned up');
  }
  
  /**
   * Check if event system is connected
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Subscribe to blockchain events
   */
  subscribe<T extends BlockchainEventType>(
    eventType: T,
    listener: EventListener<T>,
    filter?: (event: EventDataMap[T]) => boolean
  ): string {
    const subscriptionId = this.generateId();
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      listener,
      filter,
      active: true,
      createdAt: Date.now(),
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Add listener to EventEmitter
    this.on(eventType, (event) => {
      if (subscription.active && (!filter || filter(event))) {
        try {
          listener(event);
        } catch (error) {
          this.log('error', `Error in event listener for ${eventType}`, error);
        }
      }
    });
    
    this.log('info', `Subscribed to ${eventType} with ID ${subscriptionId}`);
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      return false;
    }
    
    subscription.active = false;
    this.subscriptions.delete(subscriptionId);
    
    this.log('info', `Unsubscribed from ${subscription.eventType} with ID ${subscriptionId}`);
    return true;
  }
  
  /**
   * Get active subscriptions
   */
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active);
  }
  
  /**
   * Get subscription count by event type
   */
  getSubscriptionCounts(): Record<BlockchainEventType, number> {
    const counts = {} as Record<BlockchainEventType, number>;
    
    for (const subscription of this.subscriptions.values()) {
      if (subscription.active) {
        counts[subscription.eventType] = (counts[subscription.eventType] || 0) + 1;
      }
    }
    
    return counts;
  }
  
  /**
   * Emit blockchain event
   */
  emitBlockchainEvent<T extends BlockchainEventType>(
    eventType: T,
    eventData: EventDataMap[T]
  ): void {
    this.emit(eventType, eventData);
    this.log('debug', `Emitted ${eventType} event`, eventData);
  }
  
  // Connection management
  
  /**
   * Connect to blockchain event streams
   */
  private async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    try {
      // This would establish WebSocket connections to Solana RPC for real-time events
      // For now, we simulate the connection
      this.connected = true;
      this.connectionAttempts = 0;
      
      this.emitBlockchainEvent('connection:established', {
        timestamp: Date.now(),
        endpoint: this.config.rpcEndpoint,
      });
      
      this.log('info', 'Connected to blockchain event streams');
    } catch (error) {
      this.connected = false;
      this.connectionAttempts++;
      
      this.emitBlockchainEvent('connection:lost', {
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });
      
      this.log('error', 'Failed to connect to blockchain event streams', error);
      
      // Schedule reconnection if attempts remaining
      if (this.connectionAttempts <= this.eventConfig.reconnectAttempts) {
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }
  
  /**
   * Disconnect from blockchain event streams
   */
  private async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    this.connected = false;
    
    this.emitBlockchainEvent('connection:lost', {
      timestamp: Date.now(),
    });
    
    this.log('info', 'Disconnected from blockchain event streams');
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    const delay = this.eventConfig.reconnectDelayMs * Math.pow(2, this.connectionAttempts - 1);
    
    this.reconnectTimer = setTimeout(async () => {
      this.log('info', `Attempting to reconnect (attempt ${this.connectionAttempts})`);
      
      try {
        await this.connect();
        
        this.emitBlockchainEvent('connection:reconnected', {
          timestamp: Date.now(),
          endpoint: this.config.rpcEndpoint,
        });
        
        this.log('info', 'Successfully reconnected to blockchain event streams');
      } catch (error) {
        this.log('error', 'Reconnection attempt failed', error);
      }
    }, delay);
  }
  
  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        // Send heartbeat to verify connection
        this.verifyConnection();
      } else {
        // Attempt to reconnect if not connected
        this.connect().catch(error => {
          this.log('error', 'Heartbeat reconnection failed', error);
        });
      }
    }, this.eventConfig.heartbeatIntervalMs!);
  }
  
  /**
   * Verify connection health
   */
  private async verifyConnection(): Promise<void> {
    try {
      // This would ping the RPC endpoint or check WebSocket connection
      // For now, we simulate a health check
      const rpc = this.ghostSpeak.getRpc();
      await rpc.getSlot().send();
      
      this.log('debug', 'Connection heartbeat successful');
    } catch (error) {
      this.log('warn', 'Connection heartbeat failed', error);
      
      // Mark as disconnected and attempt reconnection
      this.connected = false;
      this.scheduleReconnect();
    }
  }
  
  // Event simulation methods (for testing and development)
  
  /**
   * Simulate agent registration event
   */
  simulateAgentRegistered(agentId: string, agent: AgentMemory): void {
    this.emitBlockchainEvent('agent:registered', { agentId, agent });
  }
  
  /**
   * Simulate service listing event
   */
  simulateServiceListed(listingId: string, agentId: string, listing: ServiceListingMemory): void {
    this.emitBlockchainEvent('service:listed', { listingId, agentId, listing });
  }
  
  /**
   * Simulate work order creation event
   */
  simulateOrderCreated(orderId: string, order: WorkOrderMemory): void {
    this.emitBlockchainEvent('order:created', { orderId, order });
  }
  
  /**
   * Simulate message event
   */
  simulateMessageSent(messageId: string, message: MessageMemory): void {
    this.emitBlockchainEvent('message:sent', { messageId, message });
  }
  
  /**
   * Simulate payment event
   */
  simulatePaymentProcessed(workOrderId: string, amount: bigint, milestoneIndex?: number): void {
    this.emitBlockchainEvent('payment:processed', { workOrderId, amount, milestoneIndex });
  }
  
  /**
   * Simulate system error
   */
  simulateSystemError(message: string, error?: Error): void {
    this.emitBlockchainEvent('system:error', {
      level: 'error',
      message,
      error,
      context: { timestamp: Date.now() },
    });
  }
  
  // Utility methods
  
  /**
   * Generate unique subscription ID
   */
  private generateId(): string {
    return `sub_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
  }
  
  /**
   * Log message with proper formatting
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.eventConfig.enableDebugLogging && level === 'debug') {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const prefix = `[SyminDx Events ${timestamp}]`;
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix} DEBUG: ${message}`, data || '');
        break;
      case 'info':
        console.log(`${prefix} INFO: ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} WARN: ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ERROR: ${message}`, data || '');
        break;
    }
  }
}

/**
 * Type exports
 */
export type {
  EventSystemConfig,
  BlockchainEventType,
  EventDataMap,
  EventListener,
  EventSubscription,
};

/**
 * Default export
 */
export default SyminDxEventSystem;