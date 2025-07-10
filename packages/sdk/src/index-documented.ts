/**
 * @fileoverview GhostSpeak SDK - Production-ready TypeScript SDK for the GhostSpeak Protocol
 * @version 1.0.5
 * @author GhostSpeak Team
 * @license MIT
 * 
 * @description
 * The GhostSpeak SDK provides a comprehensive TypeScript interface for interacting with the
 * GhostSpeak Protocol on Solana. It includes AI agent management, messaging, marketplace
 * functionality, and advanced blockchain features like ZK compression and confidential transfers.
 * 
 * @example
 * ```typescript
 * import { createOptimizedClient, PDAUtils, TimestampUtils } from '@ghostspeak/sdk/optimized';
 * import { createRpc } from '@solana/rpc';
 * 
 * const rpc = createRpc('https://api.devnet.solana.com');
 * const client = createOptimizedClient(rpc);
 * 
 * // Load agent functionality on demand
 * const agentService = await client.loadModule('agent');
 * ```
 * 
 * @see {@link https://github.com/Prompt-or-Die/ghostspeak} - GitHub Repository
 * @see {@link https://ghostspeak.gitbook.io/} - Documentation
 */

// Re-export optimized version with comprehensive documentation
export * from './index-optimized';

/**
 * @namespace Core
 * @description Core SDK utilities and types
 */
export namespace Core {
  export type { Address } from '@solana/addresses';
  export type { Rpc } from '@solana/rpc';
  export type { TransactionSigner } from '@solana/signers';
  
  export {
    safeBigIntToU64,
    safeNumberToBigInt,
    TimestampUtils,
    TokenAmountUtils,
    type BigIntLike,
    type TimestampLike,
    toTimestamp,
  } from './utils/bigint-serialization';
}

/**
 * @namespace Protocol
 * @description Protocol-specific utilities and constants
 */
export namespace Protocol {
  export {
    PDAUtils,
    ProtocolValidator,
    SDKHelpers,
    PROTOCOL_CONSTANTS,
  } from './utils/sdk-utilities';
  
  export {
    DEFAULT_RETRY_CONFIGS,
    ErrorType,
    EnhancedTransactionError,
    classifyError,
  } from './utils/enhanced-transaction-helpers';
}

/**
 * @namespace Instructions
 * @description Generated instruction builders and types
 */
export namespace Instructions {
  export type {
    IInstruction,
    IInstructionWithData,
    IInstructionWithAccounts,
    IAccountMeta,
    AccountRole,
  } from './utils/instruction-compat';
}

/**
 * @namespace Utils
 * @description Utility functions and helpers
 */
export namespace Utils {
  export {
    AccountResolver,
    InstructionBuilder,
    InstructionDataEncoder,
    ParameterValidator,
    InstructionParser,
    type ResolvedAccount,
  } from './utils/instruction-builder-fixes';
  
  export {
    ResilientTransactionSender,
    CircuitBreaker,
    withRetry,
    TransactionUtils,
    initializeGlobalTransactionSender,
    getGlobalTransactionSender,
    type RetryConfig,
    type CircuitBreakerConfig,
  } from './utils/enhanced-transaction-helpers';
}

/**
 * Client factory with comprehensive options
 * 
 * @example
 * ```typescript
 * import { createClient } from '@ghostspeak/sdk';
 * import { createRpc } from '@solana/rpc';
 * 
 * const rpc = createRpc('https://api.devnet.solana.com');
 * const client = createClient(rpc, {
 *   retryConfig: DEFAULT_RETRY_CONFIGS.CRITICAL,
 *   enableCircuitBreaker: true,
 *   preloadModules: ['agent', 'channel']
 * });
 * ```
 */
export interface ClientOptions {
  /** Retry configuration for RPC calls */
  retryConfig?: RetryConfig;
  /** Whether to enable circuit breaker protection */
  enableCircuitBreaker?: boolean;
  /** Circuit breaker configuration */
  circuitBreakerConfig?: CircuitBreakerConfig;
  /** Modules to preload on client creation */
  preloadModules?: string[];
  /** Enable development mode features */
  developmentMode?: boolean;
}

/**
 * Create a GhostSpeak client with comprehensive configuration options
 * 
 * @param rpc - Solana RPC client instance
 * @param options - Client configuration options
 * @returns Configured GhostSpeak client
 * 
 * @example
 * ```typescript
 * const client = createClient(rpc, {
 *   retryConfig: DEFAULT_RETRY_CONFIGS.STANDARD,
 *   enableCircuitBreaker: true,
 *   preloadModules: ['agent', 'message']
 * });
 * ```
 */
export async function createClient(
  rpc: Core.Rpc<any>,
  options: ClientOptions = {}
): Promise<OptimizedClient> {
  const client = createOptimizedClient(rpc);
  
  // Initialize global transaction sender if circuit breaker is enabled
  if (options.enableCircuitBreaker) {
    Utils.initializeGlobalTransactionSender(rpc, options.circuitBreakerConfig);
  }
  
  // Preload specified modules
  if (options.preloadModules?.length) {
    await client.preloadModules(options.preloadModules as any);
  }
  
  return client;
}

/**
 * @namespace Constants
 * @description Protocol constants and configuration values
 */
export namespace Constants {
  /** Default Solana RPC endpoints */
  export const RPC_ENDPOINTS = {
    MAINNET: 'https://api.mainnet-beta.solana.com',
    DEVNET: 'https://api.devnet.solana.com',
    TESTNET: 'https://api.testnet.solana.com',
    LOCALHOST: 'http://localhost:8899',
  } as const;
  
  /** Program IDs for different networks */
  export const PROGRAM_IDS = {
    DEVNET: '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP',
    TESTNET: '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP',
    MAINNET: '', // To be deployed
  } as const;
  
  /** Common account sizes for rent calculation */
  export const ACCOUNT_SIZES = PROTOCOL_CONSTANTS.ACCOUNT_SIZES;
  
  /** Token and fee constants */
  export const FEES = {
    DEFAULT_MESSAGE_FEE: PROTOCOL_CONSTANTS.DEFAULT_FEE_PER_MESSAGE,
    MIN_ESCROW_AMOUNT: PROTOCOL_CONSTANTS.MIN_ESCROW_AMOUNT,
  } as const;
}

/**
 * @namespace Types
 * @description Common type definitions and interfaces
 */
export namespace Types {
  /** Agent capability types */
  export type AgentCapability = 
    | 'text_generation'
    | 'code_analysis'
    | 'data_processing'
    | 'image_generation'
    | 'translation'
    | 'sentiment_analysis'
    | 'summarization'
    | 'question_answering'
    | 'content_moderation'
    | 'recommendation';
  
  /** Message types */
  export type MessageType = 'text' | 'media' | 'system' | 'encrypted';
  
  /** Channel visibility types */
  export type ChannelVisibility = 'public' | 'private' | 'restricted';
  
  /** Transaction status types */
  export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled';
  
  /** Escrow status types */
  export type EscrowStatus = 'created' | 'funded' | 'released' | 'cancelled' | 'disputed';
  
  /** Network types */
  export type Network = 'mainnet' | 'devnet' | 'testnet' | 'localhost';
}

/**
 * @namespace Errors
 * @description Error types and error handling utilities
 */
export namespace Errors {
  export { ErrorType, EnhancedTransactionError, classifyError } from './utils/enhanced-transaction-helpers';
  
  /** SDK-specific error codes */
  export enum SDKErrorCode {
    INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
    MODULE_NOT_FOUND = 'MODULE_NOT_FOUND',
    NETWORK_ERROR = 'NETWORK_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    TRANSACTION_ERROR = 'TRANSACTION_ERROR',
    ACCOUNT_ERROR = 'ACCOUNT_ERROR',
    PROGRAM_ERROR = 'PROGRAM_ERROR',
  }
  
  /** Base SDK error class */
  export class SDKError extends Error {
    constructor(
      public readonly code: SDKErrorCode,
      message: string,
      public readonly cause?: Error
    ) {
      super(message);
      this.name = 'SDKError';
    }
  }
}

// Re-export important types for convenience
import type { RetryConfig, CircuitBreakerConfig } from './utils/enhanced-transaction-helpers';
import { OptimizedClient, createOptimizedClient, DEFAULT_RETRY_CONFIGS, PROTOCOL_CONSTANTS } from './index-optimized';

export type { RetryConfig, CircuitBreakerConfig };

/**
 * @example Basic Usage
 * ```typescript
 * import { createClient, Constants, Types } from '@ghostspeak/sdk';
 * import { createRpc } from '@solana/rpc';
 * 
 * // Create RPC client
 * const rpc = createRpc(Constants.RPC_ENDPOINTS.DEVNET);
 * 
 * // Create GhostSpeak client
 * const client = await createClient(rpc, {
 *   enableCircuitBreaker: true,
 *   preloadModules: ['agent', 'channel']
 * });
 * 
 * // Use the client
 * const agentService = await client.loadModule('agent');
 * ```
 * 
 * @example Advanced Configuration
 * ```typescript
 * import { 
 *   createClient, 
 *   Utils, 
 *   Protocol,
 *   Core 
 * } from '@ghostspeak/sdk';
 * 
 * const client = await createClient(rpc, {
 *   retryConfig: {
 *     maxAttempts: 5,
 *     initialDelayMs: 1000,
 *     maxDelayMs: 30000,
 *     backoffMultiplier: 2,
 *     jitterFactor: 0.1,
 *   },
 *   circuitBreakerConfig: {
 *     failureThreshold: 10,
 *     successThreshold: 3,
 *     timeoutMs: 120000,
 *     windowSizeMs: 600000,
 *   },
 *   enableCircuitBreaker: true,
 *   developmentMode: process.env.NODE_ENV === 'development'
 * });
 * ```
 */

// Export SDK metadata and version
export { VERSION, SDK_METADATA } from './index-optimized';