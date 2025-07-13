import { Address } from '@solana/addresses';
import { 
  GhostSpeakPluginState, 
  AgentInfo, 
  ServiceListing, 
  JobPosting, 
  WorkOrder, 
  ChannelInfo, 
  PaymentInfo,
  IAgentRuntime
} from './types';

/**
 * Global state manager for the GhostSpeak ElizaOS plugin
 */
export class GhostSpeakStateManager {
  private state: GhostSpeakPluginState;
  private listeners: Map<string, Set<(state: GhostSpeakPluginState) => void>>;

  constructor() {
    this.state = this.createInitialState();
    this.listeners = new Map();
  }

  private createInitialState(): GhostSpeakPluginState {
    return {
      isInitialized: false,
      currentAgent: undefined,
      connectedWallet: undefined,
      networkStatus: 'disconnected',
      lastSync: 0,
      cache: {
        agents: new Map(),
        services: new Map(),
        jobs: new Map(),
        workOrders: new Map(),
        channels: new Map(),
        payments: new Map(),
      },
    };
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<GhostSpeakPluginState> {
    return { ...this.state };
  }

  /**
   * Initialize the state manager
   */
  async initialize(runtime: IAgentRuntime, walletAddress?: Address): Promise<void> {
    this.state.isInitialized = true;
    this.state.connectedWallet = walletAddress;
    this.state.networkStatus = 'connected';
    this.state.lastSync = Date.now();
    
    this.notifyListeners('initialize');
  }

  /**
   * Set current agent
   */
  setCurrentAgent(agent: AgentInfo): void {
    this.state.currentAgent = agent;
    this.state.cache.agents.set(agent.id.toString(), agent);
    this.notifyListeners('agent_updated');
  }

  /**
   * Update network status
   */
  setNetworkStatus(status: 'connected' | 'disconnected' | 'error'): void {
    this.state.networkStatus = status;
    this.notifyListeners('network_status');
  }

  /**
   * Cache management
   */
  cacheAgent(agent: AgentInfo): void {
    this.state.cache.agents.set(agent.id.toString(), agent);
    this.notifyListeners('cache_updated');
  }

  cacheService(service: ServiceListing): void {
    this.state.cache.services.set(service.id.toString(), service);
    this.notifyListeners('cache_updated');
  }

  cacheJob(job: JobPosting): void {
    this.state.cache.jobs.set(job.id.toString(), job);
    this.notifyListeners('cache_updated');
  }

  cacheWorkOrder(workOrder: WorkOrder): void {
    this.state.cache.workOrders.set(workOrder.id.toString(), workOrder);
    this.notifyListeners('cache_updated');
  }

  cacheChannel(channel: ChannelInfo): void {
    this.state.cache.channels.set(channel.id.toString(), channel);
    this.notifyListeners('cache_updated');
  }

  cachePayment(payment: PaymentInfo): void {
    this.state.cache.payments.set(payment.id.toString(), payment);
    this.notifyListeners('cache_updated');
  }

  /**
   * Cache retrieval
   */
  getAgent(id: string): AgentInfo | undefined {
    return this.state.cache.agents.get(id);
  }

  getService(id: string): ServiceListing | undefined {
    return this.state.cache.services.get(id);
  }

  getJob(id: string): JobPosting | undefined {
    return this.state.cache.jobs.get(id);
  }

  getWorkOrder(id: string): WorkOrder | undefined {
    return this.state.cache.workOrders.get(id);
  }

  getChannel(id: string): ChannelInfo | undefined {
    return this.state.cache.channels.get(id);
  }

  getPayment(id: string): PaymentInfo | undefined {
    return this.state.cache.payments.get(id);
  }

  /**
   * Cache queries
   */
  getAllAgents(): AgentInfo[] {
    return Array.from(this.state.cache.agents.values());
  }

  getActiveServices(): ServiceListing[] {
    return Array.from(this.state.cache.services.values()).filter(s => s.isActive);
  }

  getActiveJobs(): JobPosting[] {
    return Array.from(this.state.cache.jobs.values()).filter(j => j.isActive);
  }

  getPendingWorkOrders(): WorkOrder[] {
    return Array.from(this.state.cache.workOrders.values()).filter(w => w.status === 'pending');
  }

  getChannelsForAgent(agentId: string): ChannelInfo[] {
    return Array.from(this.state.cache.channels.values()).filter(c => 
      c.participants.some(p => p.toString() === agentId)
    );
  }

  getRecentPayments(limit: number = 10): PaymentInfo[] {
    return Array.from(this.state.cache.payments.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Search and filter methods
   */
  searchServices(query: string, category?: string): ServiceListing[] {
    const services = this.getActiveServices();
    const searchTerm = query.toLowerCase();
    
    return services.filter(service => {
      const matchesQuery = service.title.toLowerCase().includes(searchTerm) ||
                          service.description.toLowerCase().includes(searchTerm);
      const matchesCategory = !category || service.category === category;
      
      return matchesQuery && matchesCategory;
    });
  }

  searchJobs(query: string, category?: string): JobPosting[] {
    const jobs = this.getActiveJobs();
    const searchTerm = query.toLowerCase();
    
    return jobs.filter(job => {
      const matchesQuery = job.title.toLowerCase().includes(searchTerm) ||
                          job.description.toLowerCase().includes(searchTerm);
      const matchesCategory = !category || job.category === category;
      
      return matchesQuery && matchesCategory;
    });
  }

  getAgentsByReputation(minReputation: number = 0): AgentInfo[] {
    return this.getAllAgents()
      .filter(agent => agent.reputation >= minReputation)
      .sort((a, b) => b.reputation - a.reputation);
  }

  /**
   * Update last sync timestamp
   */
  updateLastSync(): void {
    this.state.lastSync = Date.now();
    this.notifyListeners('sync_updated');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.state.cache = {
      agents: new Map(),
      services: new Map(),
      jobs: new Map(),
      workOrders: new Map(),
      channels: new Map(),
      payments: new Map(),
    };
    this.notifyListeners('cache_cleared');
  }

  /**
   * Clear specific cache type
   */
  clearAgentsCache(): void {
    this.state.cache.agents.clear();
    this.notifyListeners('cache_updated');
  }

  clearServicesCache(): void {
    this.state.cache.services.clear();
    this.notifyListeners('cache_updated');
  }

  clearJobsCache(): void {
    this.state.cache.jobs.clear();
    this.notifyListeners('cache_updated');
  }

  /**
   * Event listener management
   */
  addListener(event: string, callback: (state: GhostSpeakPluginState) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  removeListener(event: string, callback: (state: GhostSpeakPluginState) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private notifyListeners(event: string): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(this.getState());
        } catch (error) {
          console.error(`Error in state listener for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    agents: number;
    services: number;
    jobs: number;
    workOrders: number;
    channels: number;
    payments: number;
    lastSync: number;
    memoryUsage: number;
  } {
    return {
      agents: this.state.cache.agents.size,
      services: this.state.cache.services.size,
      jobs: this.state.cache.jobs.size,
      workOrders: this.state.cache.workOrders.size,
      channels: this.state.cache.channels.size,
      payments: this.state.cache.payments.size,
      lastSync: this.state.lastSync,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private estimateMemoryUsage(): number {
    try {
      // Rough estimation of memory usage
      const jsonString = JSON.stringify(this.state);
      return jsonString.length * 2; // Approximate bytes (UTF-16)
    } catch {
      return 0;
    }
  }

  /**
   * Export state for persistence
   */
  exportState(): string {
    try {
      return JSON.stringify({
        ...this.state,
        cache: {
          agents: Array.from(this.state.cache.agents.entries()),
          services: Array.from(this.state.cache.services.entries()),
          jobs: Array.from(this.state.cache.jobs.entries()),
          workOrders: Array.from(this.state.cache.workOrders.entries()),
          channels: Array.from(this.state.cache.channels.entries()),
          payments: Array.from(this.state.cache.payments.entries()),
        },
      });
    } catch (error) {
      throw new Error(`Failed to export state: ${error}`);
    }
  }

  /**
   * Import state from persistence
   */
  importState(stateJson: string): void {
    try {
      const importedState = JSON.parse(stateJson);
      
      this.state = {
        ...importedState,
        cache: {
          agents: new Map(importedState.cache.agents),
          services: new Map(importedState.cache.services),
          jobs: new Map(importedState.cache.jobs),
          workOrders: new Map(importedState.cache.workOrders),
          channels: new Map(importedState.cache.channels),
          payments: new Map(importedState.cache.payments),
        },
      };
      
      this.notifyListeners('state_imported');
    } catch (error) {
      throw new Error(`Failed to import state: ${error}`);
    }
  }
}

// Global state instance
export const ghostSpeakState = new GhostSpeakStateManager();