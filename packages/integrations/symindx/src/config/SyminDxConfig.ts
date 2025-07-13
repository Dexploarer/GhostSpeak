/**
 * @fileoverview SyminDx Configuration - Configuration management for SyminDx GhostSpeak integration
 * @version 1.0.0
 * @author GhostSpeak Team
 * @license MIT
 */

import type { Address } from '@solana/addresses';
import type { Types } from '@ghostspeak/sdk';
import { z } from 'zod';

/**
 * Retry configuration schema
 */
const RetryConfigSchema = z.object({
  maxAttempts: z.number().min(1).max(10),
  initialDelayMs: z.number().min(100).max(10000),
  maxDelayMs: z.number().min(1000).max(60000),
  backoffMultiplier: z.number().min(1).max(5),
  jitterFactor: z.number().min(0).max(1),
});

/**
 * Circuit breaker configuration schema
 */
const CircuitBreakerConfigSchema = z.object({
  failureThreshold: z.number().min(1).max(100),
  successThreshold: z.number().min(1).max(10),
  timeoutMs: z.number().min(1000).max(300000),
  windowSizeMs: z.number().min(60000).max(3600000),
});

/**
 * Network types
 */
const NetworkSchema = z.enum(['mainnet', 'devnet', 'testnet', 'localhost']);

/**
 * SyminDx configuration schema
 */
const SyminDxConfigSchema = z.object({
  // Network configuration
  network: NetworkSchema,
  programId: z.string().min(32).max(50), // Base58 encoded address
  rpcEndpoint: z.string().url().optional(),
  
  // Agent configuration
  agentId: z.string().optional(),
  agentName: z.string().min(1).max(100).optional(),
  agentDescription: z.string().max(1000).optional(),
  agentCapabilities: z.array(z.string()).optional(),
  
  // Feature flags
  enableDebugLogging: z.boolean().default(false),
  enableCircuitBreaker: z.boolean().default(true),
  enableMemoryPersistence: z.boolean().default(false),
  enableEventSubscriptions: z.boolean().default(true),
  enableCompressionSupport: z.boolean().default(false),
  enableConfidentialTransfers: z.boolean().default(false),
  
  // Performance configuration
  retryConfig: RetryConfigSchema.optional(),
  circuitBreakerConfig: CircuitBreakerConfigSchema.optional(),
  
  // Cache configuration
  cacheConfig: z.object({
    maxSize: z.number().min(10).max(10000).default(1000),
    ttlMs: z.number().min(1000).max(3600000).default(300000),
    enableCompression: z.boolean().default(false),
  }).optional(),
  
  // Event system configuration
  eventConfig: z.object({
    maxSubscriptions: z.number().min(1).max(100).default(50),
    reconnectAttempts: z.number().min(0).max(20).default(5),
    reconnectDelayMs: z.number().min(100).max(10000).default(1000),
    heartbeatIntervalMs: z.number().min(1000).max(60000).default(30000),
  }).optional(),
  
  // Security configuration
  securityConfig: z.object({
    enableInputValidation: z.boolean().default(true),
    enableRateLimiting: z.boolean().default(true),
    maxRequestsPerMinute: z.number().min(1).max(1000).default(100),
    enableRequestSigning: z.boolean().default(false),
  }).optional(),
  
  // Environment-specific overrides
  environmentOverrides: z.record(z.string(), z.any()).optional(),
});

/**
 * Type definitions
 */
export type SyminDxConfigInput = z.input<typeof SyminDxConfigSchema>;
export type SyminDxConfigOutput = z.output<typeof SyminDxConfigSchema>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;

/**
 * Default configurations for different environments
 */
export const DEFAULT_CONFIGS = {
  development: {
    network: 'devnet' as const,
    enableDebugLogging: true,
    enableCircuitBreaker: true,
    enableMemoryPersistence: false,
    retryConfig: {
      maxAttempts: 3,
      initialDelayMs: 500,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    cacheConfig: {
      maxSize: 500,
      ttlMs: 60000, // 1 minute
      enableCompression: false,
    },
    eventConfig: {
      maxSubscriptions: 25,
      reconnectAttempts: 3,
      reconnectDelayMs: 1000,
      heartbeatIntervalMs: 15000,
    },
    securityConfig: {
      enableInputValidation: true,
      enableRateLimiting: false,
      maxRequestsPerMinute: 1000,
      enableRequestSigning: false,
    },
  },
  production: {
    network: 'mainnet' as const,
    enableDebugLogging: false,
    enableCircuitBreaker: true,
    enableMemoryPersistence: true,
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
    cacheConfig: {
      maxSize: 2000,
      ttlMs: 300000, // 5 minutes
      enableCompression: true,
    },
    eventConfig: {
      maxSubscriptions: 50,
      reconnectAttempts: 10,
      reconnectDelayMs: 2000,
      heartbeatIntervalMs: 30000,
    },
    securityConfig: {
      enableInputValidation: true,
      enableRateLimiting: true,
      maxRequestsPerMinute: 100,
      enableRequestSigning: true,
    },
  },
  testing: {
    network: 'testnet' as const,
    enableDebugLogging: true,
    enableCircuitBreaker: false,
    enableMemoryPersistence: false,
    retryConfig: {
      maxAttempts: 2,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 1.5,
      jitterFactor: 0.05,
    },
    cacheConfig: {
      maxSize: 100,
      ttlMs: 10000, // 10 seconds
      enableCompression: false,
    },
    eventConfig: {
      maxSubscriptions: 10,
      reconnectAttempts: 1,
      reconnectDelayMs: 500,
      heartbeatIntervalMs: 5000,
    },
    securityConfig: {
      enableInputValidation: true,
      enableRateLimiting: false,
      maxRequestsPerMinute: 1000,
      enableRequestSigning: false,
    },
  },
} as const;

/**
 * Environment variable mapping
 */
const ENV_VAR_MAPPING = {
  SYMINDX_NETWORK: 'network',
  SYMINDX_PROGRAM_ID: 'programId',
  SYMINDX_RPC_ENDPOINT: 'rpcEndpoint',
  SYMINDX_AGENT_ID: 'agentId',
  SYMINDX_AGENT_NAME: 'agentName',
  SYMINDX_AGENT_DESCRIPTION: 'agentDescription',
  SYMINDX_DEBUG_LOGGING: 'enableDebugLogging',
  SYMINDX_CIRCUIT_BREAKER: 'enableCircuitBreaker',
  SYMINDX_MEMORY_PERSISTENCE: 'enableMemoryPersistence',
  SYMINDX_EVENT_SUBSCRIPTIONS: 'enableEventSubscriptions',
  SYMINDX_COMPRESSION_SUPPORT: 'enableCompressionSupport',
  SYMINDX_CONFIDENTIAL_TRANSFERS: 'enableConfidentialTransfers',
} as const;

/**
 * SyminDx Configuration class
 */
export class SyminDxConfig {
  private readonly config: SyminDxConfigOutput;
  
  constructor(input: SyminDxConfigInput) {
    // Merge with environment variables
    const envOverrides = this.loadFromEnvironment();
    const mergedInput = { ...input, ...envOverrides };
    
    // Validate configuration
    this.config = SyminDxConfigSchema.parse(mergedInput);
  }
  
  /**
   * Get network configuration
   */
  get network(): Types.Network {
    return this.config.network;
  }
  
  /**
   * Get program ID
   */
  get programId(): Address {
    return this.config.programId as Address;
  }
  
  /**
   * Get RPC endpoint
   */
  get rpcEndpoint(): string | undefined {
    return this.config.rpcEndpoint;
  }
  
  /**
   * Get agent configuration
   */
  get agent(): {
    id?: string;
    name?: string;
    description?: string;
    capabilities?: string[];
  } {
    return {
      id: this.config.agentId,
      name: this.config.agentName,
      description: this.config.agentDescription,
      capabilities: this.config.agentCapabilities,
    };
  }
  
  /**
   * Get feature flags
   */
  get features(): {
    debugLogging: boolean;
    circuitBreaker: boolean;
    memoryPersistence: boolean;
    eventSubscriptions: boolean;
    compressionSupport: boolean;
    confidentialTransfers: boolean;
  } {
    return {
      debugLogging: this.config.enableDebugLogging,
      circuitBreaker: this.config.enableCircuitBreaker,
      memoryPersistence: this.config.enableMemoryPersistence,
      eventSubscriptions: this.config.enableEventSubscriptions,
      compressionSupport: this.config.enableCompressionSupport,
      confidentialTransfers: this.config.enableConfidentialTransfers,
    };
  }
  
  /**
   * Get retry configuration
   */
  get retryConfig(): RetryConfig {
    return this.config.retryConfig || DEFAULT_CONFIGS.development.retryConfig;
  }
  
  /**
   * Get circuit breaker configuration
   */
  get circuitBreakerConfig(): CircuitBreakerConfig | undefined {
    return this.config.circuitBreakerConfig;
  }
  
  /**
   * Get cache configuration
   */
  get cacheConfig(): {
    maxSize: number;
    ttlMs: number;
    enableCompression: boolean;
  } {
    return this.config.cacheConfig || DEFAULT_CONFIGS.development.cacheConfig;
  }
  
  /**
   * Get event configuration
   */
  get eventConfig(): {
    maxSubscriptions: number;
    reconnectAttempts: number;
    reconnectDelayMs: number;
    heartbeatIntervalMs: number;
  } {
    return this.config.eventConfig || DEFAULT_CONFIGS.development.eventConfig;
  }
  
  /**
   * Get security configuration
   */
  get securityConfig(): {
    enableInputValidation: boolean;
    enableRateLimiting: boolean;
    maxRequestsPerMinute: number;
    enableRequestSigning: boolean;
  } {
    return this.config.securityConfig || DEFAULT_CONFIGS.development.securityConfig;
  }
  
  /**
   * Get environment-specific overrides
   */
  get environmentOverrides(): Record<string, any> {
    return this.config.environmentOverrides || {};
  }
  
  /**
   * Check if debug logging is enabled
   */
  get enableDebugLogging(): boolean {
    return this.config.enableDebugLogging;
  }
  
  /**
   * Check if circuit breaker is enabled
   */
  get enableCircuitBreaker(): boolean {
    return this.config.enableCircuitBreaker;
  }
  
  /**
   * Get the full configuration object
   */
  get raw(): SyminDxConfigOutput {
    return { ...this.config };
  }
  
  /**
   * Update configuration with new values
   */
  update(updates: Partial<SyminDxConfigInput>): SyminDxConfig {
    const mergedConfig = { ...this.config, ...updates };
    return new SyminDxConfig(mergedConfig);
  }
  
  /**
   * Export configuration to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  /**
   * Export configuration for environment variables
   */
  toEnvironmentVariables(): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    Object.entries(ENV_VAR_MAPPING).forEach(([envVar, configKey]) => {
      const value = this.getNestedValue(configKey);
      if (value !== undefined) {
        envVars[envVar] = String(value);
      }
    });
    
    return envVars;
  }
  
  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): Partial<SyminDxConfigInput> {
    const config: any = {};
    
    Object.entries(ENV_VAR_MAPPING).forEach(([envVar, configKey]) => {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(config, configKey, this.parseEnvironmentValue(value));
      }
    });
    
    return config;
  }
  
  /**
   * Parse environment variable value
   */
  private parseEnvironmentValue(value: string): any {
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Try to parse as number
    const numValue = Number(value);
    if (!isNaN(numValue)) return numValue;
    
    // Try to parse as JSON array
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through to string
      }
    }
    
    return value;
  }
  
  /**
   * Get nested value from configuration
   */
  private getNestedValue(path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }
  
  /**
   * Set nested value in configuration
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((o, key) => {
      if (!(key in o)) o[key] = {};
      return o[key];
    }, obj);
    target[lastKey] = value;
  }
}

/**
 * Validation function for configuration input
 */
export function validateConfig(input: SyminDxConfigInput): void {
  try {
    SyminDxConfigSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Create configuration from environment
 */
export function createConfigFromEnvironment(
  baseConfig?: Partial<SyminDxConfigInput>
): SyminDxConfig {
  return new SyminDxConfig(baseConfig || {});
}

/**
 * Create configuration for specific environment
 */
export function createConfigForEnvironment(
  environment: keyof typeof DEFAULT_CONFIGS,
  overrides?: Partial<SyminDxConfigInput>
): SyminDxConfig {
  const baseConfig = DEFAULT_CONFIGS[environment];
  return new SyminDxConfig({ ...baseConfig, ...overrides });
}

/**
 * Schema exports for external validation
 */
export { SyminDxConfigSchema, RetryConfigSchema, CircuitBreakerConfigSchema };

/**
 * Default export
 */
export default SyminDxConfig;