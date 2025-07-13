/**
 * @fileoverview SyminDx Integration for GhostSpeak Protocol
 * @version 1.0.0
 * @author GhostSpeak Team
 * @license MIT
 * 
 * @description
 * Complete integration package for SyminDx AI agents to interact with the GhostSpeak Protocol.
 * Provides factory patterns, memory management, tools extensions, and event systems for
 * seamless blockchain integration.
 * 
 * @example
 * ```typescript
 * import { createSyminDxExtension } from '@ghostspeak/symindx-integration';
 * 
 * const extension = await createSyminDxExtension({
 *   network: 'devnet',
 *   programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK',
 *   agentName: 'My AI Agent',
 *   agentDescription: 'An intelligent agent for automated tasks',
 *   agentCapabilities: ['text_generation', 'data_processing'],
 * });
 * 
 * await extension.initialize();
 * ```
 */

// Main factory and extension classes
export {
  SyminDxFactory,
  SyminDxExtension,
  createSyminDxExtension,
  type ISyminDxExtension,
  type SyminDxFactoryOptions,
} from './factory/SyminDxFactory';

// Configuration management
export {
  SyminDxConfig,
  validateConfig,
  createConfigFromEnvironment,
  createConfigForEnvironment,
  DEFAULT_CONFIGS,
  type SyminDxConfigInput,
  type SyminDxConfigOutput,
  type RetryConfig,
  type CircuitBreakerConfig,
  SyminDxConfigSchema,
  RetryConfigSchema,
  CircuitBreakerConfigSchema,
} from './config/SyminDxConfig';

// Memory provider
export {
  SyminDxMemoryProvider,
  type MemoryEntry,
  type MemoryProviderConfig,
  type MemoryProviderEvents,
  type AgentMemory,
  type ChannelMemory,
  type MessageMemory,
  type ServiceListingMemory,
  type WorkOrderMemory,
} from './memory/SyminDxMemoryProvider';

// Tools extension
export {
  SyminDxToolsExtension,
  type ToolResult,
  type AgentRegistrationParams,
  type ServiceListingParams,
  type WorkOrderParams,
  type MessageParams,
  type ChannelParams,
  type PaymentParams,
} from './tools/SyminDxToolsExtension';

// Event system
export {
  SyminDxEventSystem,
  type EventSystemConfig,
  type BlockchainEventType,
  type EventDataMap,
  type EventListener,
  type EventSubscription,
  type AgentEvent,
  type ServiceEvent,
  type OrderEvent,
  type MessageEvent,
  type ChannelEvent,
  type PaymentEvent,
  type ReputationEvent,
  type SystemEvent,
  type ConnectionEvent,
} from './events/SyminDxEventSystem';

/**
 * Package version
 */
export const VERSION = '1.0.0';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
  name: '@ghostspeak/symindx-integration',
  version: VERSION,
  description: 'SyminDx platform integration for GhostSpeak Protocol',
  features: [
    'AI agent registration and management',
    'Service marketplace integration',
    'Real-time blockchain events',
    'Memory management and caching',
    'Payment processing and escrow',
    'Inter-agent communication',
    'Work order management',
    'Configuration management',
  ],
  requirements: {
    'ghostspeak-sdk': '^1.0.5',
    'solana-web3js': '^2.0.0',
    'node': '>=18.0.0',
  },
} as const;

/**
 * Utility functions for common operations
 */
export const Utils = {
  /**
   * Create a development-ready SyminDx extension
   */
  async createDevelopmentExtension(overrides?: Partial<import('./config/SyminDxConfig').SyminDxConfigInput>) {
    return SyminDxFactory.createForDevelopment(overrides);
  },
  
  /**
   * Create a production-ready SyminDx extension
   */
  async createProductionExtension(config: import('./config/SyminDxConfig').SyminDxConfigInput) {
    return SyminDxFactory.createForProduction(config);
  },
  
  /**
   * Validate configuration before creating extension
   */
  validateConfiguration(config: import('./config/SyminDxConfig').SyminDxConfigInput) {
    return validateConfig(config);
  },
  
  /**
   * Get package information
   */
  getPackageInfo() {
    return PACKAGE_INFO;
  },
} as const;

/**
 * Constants for common operations
 */
export const Constants = {
  /**
   * Default event types for subscription
   */
  COMMON_EVENT_TYPES: [
    'agent:registered',
    'agent:updated',
    'service:listed',
    'order:created',
    'message:sent',
    'payment:processed',
  ] as const,
  
  /**
   * Common agent capabilities
   */
  AGENT_CAPABILITIES: [
    'text_generation',
    'code_analysis',
    'data_processing',
    'image_generation',
    'translation',
    'sentiment_analysis',
    'summarization',
    'question_answering',
    'content_moderation',
    'recommendation',
  ] as const,
  
  /**
   * Service categories
   */
  SERVICE_CATEGORIES: [
    'ai_services',
    'data_analysis',
    'content_creation',
    'automation',
    'consultation',
    'development',
    'design',
    'marketing',
    'research',
    'other',
  ] as const,
  
  /**
   * Work order statuses
   */
  ORDER_STATUSES: [
    'pending',
    'active',
    'completed',
    'cancelled',
    'disputed',
  ] as const,
  
  /**
   * Message types
   */
  MESSAGE_TYPES: [
    'text',
    'media',
    'system',
    'encrypted',
  ] as const,
} as const;

/**
 * Helper functions for type safety
 */
export const TypeHelpers = {
  /**
   * Type guard for agent capabilities
   */
  isValidCapability(capability: string): capability is typeof Constants.AGENT_CAPABILITIES[number] {
    return Constants.AGENT_CAPABILITIES.includes(capability as any);
  },
  
  /**
   * Type guard for service categories
   */
  isValidServiceCategory(category: string): category is typeof Constants.SERVICE_CATEGORIES[number] {
    return Constants.SERVICE_CATEGORIES.includes(category as any);
  },
  
  /**
   * Type guard for order statuses
   */
  isValidOrderStatus(status: string): status is typeof Constants.ORDER_STATUSES[number] {
    return Constants.ORDER_STATUSES.includes(status as any);
  },
  
  /**
   * Type guard for message types
   */
  isValidMessageType(type: string): type is typeof Constants.MESSAGE_TYPES[number] {
    return Constants.MESSAGE_TYPES.includes(type as any);
  },
} as const;

/**
 * Re-export important types from dependencies for convenience
 */
export type { Address } from '@solana/addresses';
export type { Rpc } from '@solana/rpc';
export type { TransactionSigner } from '@solana/signers';

/**
 * Default export for convenient importing
 */
export default {
  // Main classes
  SyminDxFactory,
  SyminDxExtension,
  SyminDxConfig,
  SyminDxMemoryProvider,
  SyminDxToolsExtension,
  SyminDxEventSystem,
  
  // Factory functions
  createSyminDxExtension,
  createConfigFromEnvironment,
  createConfigForEnvironment,
  
  // Validation
  validateConfig,
  
  // Utilities
  Utils,
  Constants,
  TypeHelpers,
  
  // Package info
  VERSION,
  PACKAGE_INFO,
} as const;