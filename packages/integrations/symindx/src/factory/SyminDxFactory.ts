/**
 * @fileoverview SyminDx Factory - Creates and configures SyminDx extensions for GhostSpeak Protocol
 * @version 1.0.0
 * @author GhostSpeak Team
 * @license MIT
 */

import type { Rpc } from '@solana/rpc';
import type { TransactionSigner } from '@solana/signers';
import type { Address } from '@solana/addresses';
import { createClient, Constants, Types } from '@ghostspeak/sdk';

import { SyminDxConfig, type SyminDxConfigInput, validateConfig } from '../config/SyminDxConfig';
import { SyminDxMemoryProvider } from '../memory/SyminDxMemoryProvider';
import { SyminDxToolsExtension } from '../tools/SyminDxToolsExtension';
import { SyminDxEventSystem } from '../events/SyminDxEventSystem';

/**
 * SyminDx Extension interface for the GhostSpeak Protocol
 * Provides AI agents with blockchain capabilities through a unified interface
 */
export interface ISyminDxExtension {
  /** Configuration instance */
  readonly config: SyminDxConfig;
  
  /** Memory provider for blockchain state management */
  readonly memory: SyminDxMemoryProvider;
  
  /** Tools extension for protocol actions */
  readonly tools: SyminDxToolsExtension;
  
  /** Event system for real-time blockchain events */
  readonly events: SyminDxEventSystem;
  
  /** GhostSpeak SDK client instance */
  readonly ghostSpeak: Awaited<ReturnType<typeof createClient>>;
  
  /** Initialize the extension */
  initialize(): Promise<void>;
  
  /** Cleanup resources */
  cleanup(): Promise<void>;
  
  /** Get extension health status */
  getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    errors?: string[];
  }>;
}

/**
 * SyminDx Extension implementation
 */
export class SyminDxExtension implements ISyminDxExtension {
  public readonly config: SyminDxConfig;
  public readonly memory: SyminDxMemoryProvider;
  public readonly tools: SyminDxToolsExtension;
  public readonly events: SyminDxEventSystem;
  public readonly ghostSpeak: Awaited<ReturnType<typeof createClient>>;
  
  private initialized = false;
  
  constructor(
    config: SyminDxConfig,
    ghostSpeak: Awaited<ReturnType<typeof createClient>>,
    memory: SyminDxMemoryProvider,
    tools: SyminDxToolsExtension,
    events: SyminDxEventSystem
  ) {
    this.config = config;
    this.ghostSpeak = ghostSpeak;
    this.memory = memory;
    this.tools = tools;
    this.events = events;
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Initialize components in dependency order
      await this.memory.initialize();
      await this.events.initialize();
      await this.tools.initialize();
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize SyminDx extension: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    // Cleanup in reverse order
    await this.tools.cleanup?.();
    await this.events.cleanup?.();
    await this.memory.cleanup?.();
    
    this.initialized = false;
  }
  
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    errors?: string[];
  }> {
    const checks: Record<string, boolean> = {};
    const errors: string[] = [];
    
    try {
      // Check RPC connection
      const rpc = this.ghostSpeak.getRpc();
      await rpc.getSlot().send();
      checks.rpcConnection = true;
    } catch (error) {
      checks.rpcConnection = false;
      errors.push(`RPC connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      // Check memory provider
      checks.memoryProvider = await this.memory.isHealthy();
    } catch (error) {
      checks.memoryProvider = false;
      errors.push(`Memory provider check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      // Check event system
      checks.eventSystem = this.events.isConnected();
    } catch (error) {
      checks.eventSystem = false;
      errors.push(`Event system check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Check tools extension
    checks.toolsExtension = this.tools.isInitialized();
    
    // Check initialization
    checks.initialized = this.initialized;
    
    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      checks,
      ...(errors.length > 0 && { errors }),
    };
  }
}

/**
 * Factory options for creating SyminDx extensions
 */
export interface SyminDxFactoryOptions {
  /** Configuration for the extension */
  config: SyminDxConfigInput;
  
  /** Optional RPC client (will be created if not provided) */
  rpc?: Rpc<any>;
  
  /** Optional transaction signer */
  signer?: TransactionSigner;
  
  /** Whether to auto-initialize the extension */
  autoInitialize?: boolean;
  
  /** Custom memory provider configuration */
  memoryConfig?: {
    maxCacheSize?: number;
    ttlMs?: number;
    enablePersistence?: boolean;
  };
  
  /** Custom event system configuration */
  eventConfig?: {
    reconnectAttempts?: number;
    reconnectDelayMs?: number;
    enableDebugLogging?: boolean;
  };
}

/**
 * SyminDx Factory - Main factory class for creating SyminDx extensions
 */
export class SyminDxFactory {
  /**
   * Create a new SyminDx extension with the specified configuration
   */
  static async create(options: SyminDxFactoryOptions): Promise<SyminDxExtension> {
    // Validate and create configuration
    const config = new SyminDxConfig(options.config);
    
    // Create or use provided RPC client
    const rpc = options.rpc || this.createRpcClient(config.network, config.rpcEndpoint);
    
    // Create GhostSpeak client
    const ghostSpeak = await createClient(rpc, {
      retryConfig: {
        maxAttempts: config.retryConfig.maxAttempts,
        initialDelayMs: config.retryConfig.initialDelayMs,
        maxDelayMs: config.retryConfig.maxDelayMs,
        backoffMultiplier: config.retryConfig.backoffMultiplier,
        jitterFactor: config.retryConfig.jitterFactor,
      },
      enableCircuitBreaker: config.enableCircuitBreaker,
      circuitBreakerConfig: config.circuitBreakerConfig,
      preloadModules: ['agent', 'marketplace', 'message', 'channel'],
    });
    
    // Create memory provider
    const memory = new SyminDxMemoryProvider(config, ghostSpeak, {
      maxCacheSize: options.memoryConfig?.maxCacheSize ?? 1000,
      ttlMs: options.memoryConfig?.ttlMs ?? 300000, // 5 minutes
      enablePersistence: options.memoryConfig?.enablePersistence ?? false,
    });
    
    // Create event system
    const events = new SyminDxEventSystem(config, ghostSpeak, {
      reconnectAttempts: options.eventConfig?.reconnectAttempts ?? 5,
      reconnectDelayMs: options.eventConfig?.reconnectDelayMs ?? 1000,
      enableDebugLogging: options.eventConfig?.enableDebugLogging ?? false,
    });
    
    // Create tools extension
    const tools = new SyminDxToolsExtension(config, ghostSpeak, memory, events, options.signer);
    
    // Create extension instance
    const extension = new SyminDxExtension(config, ghostSpeak, memory, tools, events);
    
    // Auto-initialize if requested
    if (options.autoInitialize !== false) {
      await extension.initialize();
    }
    
    return extension;
  }
  
  /**
   * Create a preconfigured SyminDx extension for development
   */
  static async createForDevelopment(overrides?: Partial<SyminDxConfigInput>): Promise<SyminDxExtension> {
    return this.create({
      config: {
        network: 'devnet',
        programId: Constants.PROGRAM_IDS.DEVNET as Address,
        enableDebugLogging: true,
        enableCircuitBreaker: true,
        retryConfig: {
          maxAttempts: 3,
          initialDelayMs: 500,
          maxDelayMs: 5000,
          backoffMultiplier: 2,
          jitterFactor: 0.1,
        },
        ...overrides,
      },
      autoInitialize: true,
      memoryConfig: {
        maxCacheSize: 500,
        ttlMs: 60000, // 1 minute for development
        enablePersistence: false,
      },
      eventConfig: {
        reconnectAttempts: 3,
        reconnectDelayMs: 1000,
        enableDebugLogging: true,
      },
    });
  }
  
  /**
   * Create a preconfigured SyminDx extension for production
   */
  static async createForProduction(config: SyminDxConfigInput): Promise<SyminDxExtension> {
    return this.create({
      config: {
        enableDebugLogging: false,
        enableCircuitBreaker: true,
        retryConfig: {
          maxAttempts: 5,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2,
          jitterFactor: 0.1,
        },
        circuitBreakerConfig: {
          failureThreshold: 10,
          successThreshold: 3,
          timeoutMs: 120000,
          windowSizeMs: 600000,
        },
        ...config,
      },
      autoInitialize: true,
      memoryConfig: {
        maxCacheSize: 2000,
        ttlMs: 300000, // 5 minutes
        enablePersistence: true,
      },
      eventConfig: {
        reconnectAttempts: 10,
        reconnectDelayMs: 2000,
        enableDebugLogging: false,
      },
    });
  }
  
  /**
   * Create RPC client based on network configuration
   */
  private static createRpcClient(network: Types.Network, customEndpoint?: string): Rpc<any> {
    const { createRpc } = require('@solana/rpc');
    
    let endpoint: string;
    if (customEndpoint) {
      endpoint = customEndpoint;
    } else {
      switch (network) {
        case 'mainnet':
          endpoint = Constants.RPC_ENDPOINTS.MAINNET;
          break;
        case 'devnet':
          endpoint = Constants.RPC_ENDPOINTS.DEVNET;
          break;
        case 'testnet':
          endpoint = Constants.RPC_ENDPOINTS.TESTNET;
          break;
        case 'localhost':
          endpoint = Constants.RPC_ENDPOINTS.LOCALHOST;
          break;
        default:
          throw new Error(`Unsupported network: ${network}`);
      }
    }
    
    return createRpc(endpoint);
  }
  
  /**
   * Validate factory options
   */
  static validateOptions(options: SyminDxFactoryOptions): void {
    validateConfig(options.config);
    
    if (options.memoryConfig?.maxCacheSize !== undefined && options.memoryConfig.maxCacheSize <= 0) {
      throw new Error('Memory cache size must be positive');
    }
    
    if (options.memoryConfig?.ttlMs !== undefined && options.memoryConfig.ttlMs <= 0) {
      throw new Error('Memory TTL must be positive');
    }
    
    if (options.eventConfig?.reconnectAttempts !== undefined && options.eventConfig.reconnectAttempts < 0) {
      throw new Error('Reconnect attempts must be non-negative');
    }
    
    if (options.eventConfig?.reconnectDelayMs !== undefined && options.eventConfig.reconnectDelayMs <= 0) {
      throw new Error('Reconnect delay must be positive');
    }
  }
}

/**
 * Convenience function to create a SyminDx extension with minimal configuration
 */
export async function createSyminDxExtension(
  config: SyminDxConfigInput,
  options?: Omit<SyminDxFactoryOptions, 'config'>
): Promise<SyminDxExtension> {
  return SyminDxFactory.create({
    config,
    ...options,
  });
}

/**
 * Type exports for external use
 */
export type { SyminDxConfigInput, SyminDxFactoryOptions };

/**
 * Default export
 */
export default SyminDxFactory;