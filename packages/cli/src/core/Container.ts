/**
 * Dependency injection container for service management
 */

export class Container {
  private static instance: Container | undefined
  private services = new Map<string, unknown>()
  private factories = new Map<string, () => unknown>()
  private singletonCache = new Map<string, unknown>()
  private creationTime = new Map<string, number>()

  /**
   * Get singleton instance
   */
  static getInstance(): Container {
    return (Container.instance ??= new Container())
  }

  /**
   * Register a service factory
   */
  register<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory)
  }

  /**
   * Register a singleton service instance
   */
  registerSingleton<T>(token: string, instance: T): void {
    this.services.set(token, instance)
  }

  /**
   * Resolve a service by token with enhanced caching
   */
  resolve<T>(token: string): T {
    // Check singleton cache first for best performance
    if (this.singletonCache.has(token)) {
      return this.singletonCache.get(token) as T
    }

    // Check if singleton instance exists
    if (this.services.has(token)) {
      const instance = this.services.get(token) as T
      this.singletonCache.set(token, instance)
      return instance
    }

    // Check if factory exists
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!
      const startTime = Date.now()
      const instance = factory()
      const endTime = Date.now()
      
      // Cache as singleton with performance tracking
      this.services.set(token, instance)
      this.singletonCache.set(token, instance)
      this.creationTime.set(token, endTime - startTime)
      
      return instance as T
    }

    throw new Error(`Service not registered: ${token}`)
  }

  /**
   * Get a service by token (alias for resolve)
   */
  get<T>(token: string): T {
    return this.resolve<T>(token)
  }

  /**
   * Check if a service is registered
   */
  has(token: string): boolean {
    return this.services.has(token) || this.factories.has(token)
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear()
    this.factories.clear()
    this.singletonCache.clear()
    this.creationTime.clear()
  }

  /**
   * Get performance metrics for service creation
   */
  getPerformanceMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {}
    this.creationTime.forEach((time, token) => {
      metrics[token] = time
    })
    return metrics
  }

  /**
   * Warm up services by pre-creating frequently used ones
   */
  warmUp(tokens: string[]): void {
    tokens.forEach(token => {
      try {
        this.resolve(token)
      } catch {
        // Ignore errors during warm-up
      }
    })
  }

  /**
   * Get all registered service tokens
   */
  getRegisteredTokens(): string[] {
    return [
      ...Array.from(this.services.keys()),
      ...Array.from(this.factories.keys())
    ]
  }
}

// Global container instance
export const container = new Container()

// Service tokens for type safety
export const ServiceTokens = {
  AGENT_SERVICE: 'AgentService',
  MARKETPLACE_SERVICE: 'MarketplaceService', 
  WALLET_SERVICE: 'WalletService',
  BLOCKCHAIN_SERVICE: 'BlockchainService',
  STORAGE_SERVICE: 'StorageService'
} as const

export type ServiceToken = typeof ServiceTokens[keyof typeof ServiceTokens]