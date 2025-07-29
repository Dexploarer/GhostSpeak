/**
 * Dependency injection container for service management
 */

export class Container {
  private static instance: Container
  private services = new Map<string, unknown>()
  private factories = new Map<string, () => unknown>()

  /**
   * Get singleton instance
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
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
   * Resolve a service by token
   */
  resolve<T>(token: string): T {
    // Check if singleton instance exists
    if (this.services.has(token)) {
      return this.services.get(token) as T
    }

    // Check if factory exists
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!
      const instance = factory()
      // Cache as singleton
      this.services.set(token, instance)
      return instance as T
    }

    throw new Error(`Service not registered: ${token}`)
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