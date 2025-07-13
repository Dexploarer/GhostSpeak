/**
 * @fileoverview SyminDx Memory Provider - Blockchain state management for SyminDx AI agents
 * @version 1.0.0
 * @author GhostSpeak Team
 * @license MIT
 */

import type { Address } from '@solana/addresses';
import type { createClient } from '@ghostspeak/sdk';
import EventEmitter from 'eventemitter3';

import type { SyminDxConfig } from '../config/SyminDxConfig';

/**
 * Memory entry interface
 */
interface MemoryEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Agent memory interface
 */
export interface AgentMemory {
  id: string;
  name?: string;
  owner: Address;
  capabilities: string[];
  reputation: number;
  isActive: boolean;
  lastActivity: number;
  metadata?: Record<string, any>;
}

/**
 * Channel memory interface
 */
export interface ChannelMemory {
  id: string;
  name: string;
  participants: Address[];
  isPrivate: boolean;
  messageCount: number;
  lastMessage: number;
  metadata?: Record<string, any>;
}

/**
 * Message memory interface
 */
export interface MessageMemory {
  id: string;
  channelId: string;
  sender: Address;
  recipient?: Address;
  content: string;
  timestamp: number;
  messageType: string;
  isEncrypted: boolean;
}

/**
 * Service listing memory interface
 */
export interface ServiceListingMemory {
  id: string;
  agentId: string;
  title: string;
  description: string;
  price: bigint;
  category: string;
  isActive: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Work order memory interface
 */
export interface WorkOrderMemory {
  id: string;
  serviceListingId: string;
  client: Address;
  agent: Address;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
  totalAmount: bigint;
  escrowAmount: bigint;
  deadline: number;
  milestones?: Array<{
    description: string;
    amount: bigint;
    completed: boolean;
  }>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Memory provider configuration
 */
export interface MemoryProviderConfig {
  maxCacheSize: number;
  ttlMs: number;
  enablePersistence: boolean;
  enableCompression?: boolean;
  persistenceKey?: string;
  cleanupIntervalMs?: number;
}

/**
 * Memory provider events
 */
export interface MemoryProviderEvents {
  'cache:hit': { key: string; category: string };
  'cache:miss': { key: string; category: string };
  'cache:set': { key: string; category: string; size: number };
  'cache:delete': { key: string; category: string };
  'cache:clear': { category?: string };
  'cache:cleanup': { removed: number; remaining: number };
  'persistence:save': { success: boolean; error?: string };
  'persistence:load': { success: boolean; error?: string };
}

/**
 * SyminDx Memory Provider - Manages blockchain state and caching for AI agents
 */
export class SyminDxMemoryProvider extends EventEmitter<MemoryProviderEvents> {
  private cache = new Map<string, MemoryEntry>();
  private initialized = false;
  private cleanupTimer?: NodeJS.Timeout;
  
  constructor(
    private readonly config: SyminDxConfig,
    private readonly ghostSpeak: Awaited<ReturnType<typeof createClient>>,
    private readonly memoryConfig: MemoryProviderConfig
  ) {
    super();
  }
  
  /**
   * Initialize the memory provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Load persisted data if enabled
      if (this.memoryConfig.enablePersistence) {
        await this.loadPersistedData();
      }
      
      // Start cleanup timer
      if (this.memoryConfig.cleanupIntervalMs) {
        this.cleanupTimer = setInterval(
          () => this.cleanup(),
          this.memoryConfig.cleanupIntervalMs
        );
      }
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize memory provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    // Save data if persistence is enabled
    if (this.memoryConfig.enablePersistence && this.initialized) {
      await this.persistData();
    }
    
    this.initialized = false;
  }
  
  /**
   * Check if memory provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    return this.initialized && this.cache.size >= 0;
  }
  
  // Agent memory management
  
  /**
   * Store agent information in memory
   */
  async setAgent(agentId: string, agent: AgentMemory): Promise<void> {
    const key = this.getKey('agent', agentId);
    this.set(key, agent, 'agent');
  }
  
  /**
   * Get agent information from memory
   */
  async getAgent(agentId: string): Promise<AgentMemory | null> {
    const key = this.getKey('agent', agentId);
    return this.get<AgentMemory>(key, 'agent');
  }
  
  /**
   * Get all cached agents
   */
  async getAllAgents(): Promise<AgentMemory[]> {
    return this.getAllByCategory<AgentMemory>('agent');
  }
  
  /**
   * Remove agent from memory
   */
  async removeAgent(agentId: string): Promise<void> {
    const key = this.getKey('agent', agentId);
    this.delete(key, 'agent');
  }
  
  /**
   * Update agent activity timestamp
   */
  async updateAgentActivity(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId);
    if (agent) {
      agent.lastActivity = Date.now();
      await this.setAgent(agentId, agent);
    }
  }
  
  // Channel memory management
  
  /**
   * Store channel information in memory
   */
  async setChannel(channelId: string, channel: ChannelMemory): Promise<void> {
    const key = this.getKey('channel', channelId);
    this.set(key, channel, 'channel');
  }
  
  /**
   * Get channel information from memory
   */
  async getChannel(channelId: string): Promise<ChannelMemory | null> {
    const key = this.getKey('channel', channelId);
    return this.get<ChannelMemory>(key, 'channel');
  }
  
  /**
   * Get all cached channels
   */
  async getAllChannels(): Promise<ChannelMemory[]> {
    return this.getAllByCategory<ChannelMemory>('channel');
  }
  
  /**
   * Remove channel from memory
   */
  async removeChannel(channelId: string): Promise<void> {
    const key = this.getKey('channel', channelId);
    this.delete(key, 'channel');
  }
  
  // Message memory management
  
  /**
   * Store message in memory
   */
  async setMessage(messageId: string, message: MessageMemory): Promise<void> {
    const key = this.getKey('message', messageId);
    this.set(key, message, 'message');
  }
  
  /**
   * Get message from memory
   */
  async getMessage(messageId: string): Promise<MessageMemory | null> {
    const key = this.getKey('message', messageId);
    return this.get<MessageMemory>(key, 'message');
  }
  
  /**
   * Get messages for a channel
   */
  async getChannelMessages(channelId: string): Promise<MessageMemory[]> {
    const allMessages = this.getAllByCategory<MessageMemory>('message');
    return allMessages.filter(msg => msg.channelId === channelId);
  }
  
  /**
   * Remove message from memory
   */
  async removeMessage(messageId: string): Promise<void> {
    const key = this.getKey('message', messageId);
    this.delete(key, 'message');
  }
  
  // Service listing memory management
  
  /**
   * Store service listing in memory
   */
  async setServiceListing(listingId: string, listing: ServiceListingMemory): Promise<void> {
    const key = this.getKey('service', listingId);
    this.set(key, listing, 'service');
  }
  
  /**
   * Get service listing from memory
   */
  async getServiceListing(listingId: string): Promise<ServiceListingMemory | null> {
    const key = this.getKey('service', listingId);
    return this.get<ServiceListingMemory>(key, 'service');
  }
  
  /**
   * Get all service listings
   */
  async getAllServiceListings(): Promise<ServiceListingMemory[]> {
    return this.getAllByCategory<ServiceListingMemory>('service');
  }
  
  /**
   * Get service listings by agent
   */
  async getAgentServiceListings(agentId: string): Promise<ServiceListingMemory[]> {
    const allListings = await this.getAllServiceListings();
    return allListings.filter(listing => listing.agentId === agentId);
  }
  
  /**
   * Remove service listing from memory
   */
  async removeServiceListing(listingId: string): Promise<void> {
    const key = this.getKey('service', listingId);
    this.delete(key, 'service');
  }
  
  // Work order memory management
  
  /**
   * Store work order in memory
   */
  async setWorkOrder(orderId: string, order: WorkOrderMemory): Promise<void> {
    const key = this.getKey('order', orderId);
    this.set(key, order, 'order');
  }
  
  /**
   * Get work order from memory
   */
  async getWorkOrder(orderId: string): Promise<WorkOrderMemory | null> {
    const key = this.getKey('order', orderId);
    return this.get<WorkOrderMemory>(key, 'order');
  }
  
  /**
   * Get all work orders
   */
  async getAllWorkOrders(): Promise<WorkOrderMemory[]> {
    return this.getAllByCategory<WorkOrderMemory>('order');
  }
  
  /**
   * Get work orders by agent
   */
  async getAgentWorkOrders(agentAddress: Address): Promise<WorkOrderMemory[]> {
    const allOrders = await this.getAllWorkOrders();
    return allOrders.filter(order => order.agent === agentAddress);
  }
  
  /**
   * Get work orders by client
   */
  async getClientWorkOrders(clientAddress: Address): Promise<WorkOrderMemory[]> {
    const allOrders = await this.getAllWorkOrders();
    return allOrders.filter(order => order.client === clientAddress);
  }
  
  /**
   * Remove work order from memory
   */
  async removeWorkOrder(orderId: string): Promise<void> {
    const key = this.getKey('order', orderId);
    this.delete(key, 'order');
  }
  
  // Generic cache operations
  
  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, category: string): void {
    // Check cache size limit
    if (this.cache.size >= this.memoryConfig.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }
    
    const entry: MemoryEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: this.memoryConfig.ttlMs,
      accessCount: 0,
      lastAccessed: Date.now(),
    };
    
    this.cache.set(key, entry);
    this.emit('cache:set', { key, category, size: this.cache.size });
  }
  
  /**
   * Get a value from cache
   */
  get<T>(key: string, category: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.emit('cache:miss', { key, category });
      return null;
    }
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.emit('cache:miss', { key, category });
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.emit('cache:hit', { key, category });
    return entry.value as T;
  }
  
  /**
   * Delete a value from cache
   */
  delete(key: string, category: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emit('cache:delete', { key, category });
    }
    return deleted;
  }
  
  /**
   * Clear cache by category
   */
  clearCategory(category: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${category}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.emit('cache:clear', { category });
  }
  
  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.emit('cache:clear', {});
  }
  
  /**
   * Get cache statistics
   */
  getStatistics(): {
    size: number;
    maxSize: number;
    hitRate: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};
    let totalHits = 0;
    let totalAccesses = 0;
    
    for (const [key, entry] of this.cache) {
      const category = key.split(':')[0];
      categories[category] = (categories[category] || 0) + 1;
      totalHits += entry.accessCount;
      totalAccesses += entry.accessCount;
    }
    
    return {
      size: this.cache.size,
      maxSize: this.memoryConfig.maxCacheSize,
      hitRate: totalAccesses > 0 ? totalHits / totalAccesses : 0,
      categories,
    };
  }
  
  // Private helper methods
  
  /**
   * Generate cache key
   */
  private getKey(category: string, id: string): string {
    return `${category}:${id}`;
  }
  
  /**
   * Get all entries by category
   */
  private getAllByCategory<T>(category: string): T[] {
    const results: T[] = [];
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (key.startsWith(`${category}:`)) {
        // Check TTL
        if (now - entry.timestamp <= entry.ttl) {
          results.push(entry.value as T);
        } else {
          // Remove expired entry
          this.cache.delete(key);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanupExpired(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.emit('cache:cleanup', {
        removed: keysToDelete.length,
        remaining: this.cache.size,
      });
    }
    
    return keysToDelete.length;
  }
  
  /**
   * Periodic cleanup
   */
  private cleanup(): void {
    this.cleanupExpired();
  }
  
  /**
   * Load persisted data
   */
  private async loadPersistedData(): Promise<void> {
    try {
      const key = this.memoryConfig.persistenceKey || 'symindx-memory';
      const data = localStorage?.getItem(key);
      
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          for (const [key, entry] of parsed) {
            this.cache.set(key, entry);
          }
        }
      }
      
      this.emit('persistence:load', { success: true });
    } catch (error) {
      this.emit('persistence:load', { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  /**
   * Persist data
   */
  private async persistData(): Promise<void> {
    try {
      const key = this.memoryConfig.persistenceKey || 'symindx-memory';
      const data = Array.from(this.cache.entries());
      localStorage?.setItem(key, JSON.stringify(data));
      
      this.emit('persistence:save', { success: true });
    } catch (error) {
      this.emit('persistence:save', { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
}

/**
 * Type exports
 */
export type {
  MemoryEntry,
  MemoryProviderConfig,
  MemoryProviderEvents,
};

/**
 * Default export
 */
export default SyminDxMemoryProvider;