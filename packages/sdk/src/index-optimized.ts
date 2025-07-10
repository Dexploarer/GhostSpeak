/**
 * Optimized SDK Entry Point with Code Splitting and Tree Shaking
 * Provides the best possible bundle size for production applications
 */

// Core types (always included)
export type { Address } from '@solana/addresses';
export type { Rpc } from '@solana/rpc';
export type { TransactionSigner } from '@solana/signers';

// Essential utilities (always included)
export {
  safeBigIntToU64,
  safeNumberToBigInt,
  TimestampUtils,
  TokenAmountUtils,
  type BigIntLike,
  type TimestampLike,
  toTimestamp,
} from './utils/bigint-serialization';

export {
  PDAUtils,
  ProtocolValidator,
  SDKHelpers,
  PROTOCOL_CONSTANTS,
} from './utils/sdk-utilities';

// Import for internal use
import {
  PDAUtils,
  ProtocolValidator,
  SDKHelpers,
  PROTOCOL_CONSTANTS,
} from './utils/sdk-utilities';

import {
  TimestampUtils,
  TokenAmountUtils,
} from './utils/bigint-serialization';

export {
  DEFAULT_RETRY_CONFIGS,
  ErrorType,
  EnhancedTransactionError,
  classifyError,
} from './utils/enhanced-transaction-helpers';

// Import for internal use
import {
  DEFAULT_RETRY_CONFIGS,
  ErrorType,
  EnhancedTransactionError,
  classifyError,
} from './utils/enhanced-transaction-helpers';

// Core instruction types (lightweight)
export type {
  IInstruction,
  IInstructionWithData,
  IInstructionWithAccounts,
  IAccountMeta,
  AccountRole,
} from './utils/instruction-compat';

// Lazy-loaded modules
export const LazyModules = {
  /**
   * Lazy load agent-related functionality
   */
  get agent() {
    return import('./services/agent').then(m => m.default || m);
  },

  /**
   * Lazy load channel-related functionality
   */
  get channel() {
    return import('./services/channel').then(m => m.default || m);
  },

  /**
   * Lazy load messaging functionality
   */
  get message() {
    return import('./services/message').then(m => m.default || m);
  },

  /**
   * Lazy load escrow functionality
   */
  get escrow() {
    return import('./services/escrow').then(m => m.default || m);
  },

  /**
   * Lazy load marketplace functionality
   */
  get marketplace() {
    return import('./services/marketplace').then(m => m.default || m);
  },

  /**
   * Lazy load analytics functionality
   */
  get analytics() {
    return import('./services/analytics').then(m => m.default || m);
  },

  /**
   * Lazy load reputation functionality
   */
  get reputation() {
    return import('./services/reputation').then(m => m.default || m);
  },

  /**
   * Lazy load compression functionality
   */
  get compression() {
    return import('./services/compression').then(m => m.default || m);
  },

  /**
   * Lazy load confidential transfers
   */
  get confidentialTransfer() {
    return import('./services/confidential-transfer').then(m => m.default || m);
  },

  /**
   * Lazy load SPL Token 2022 functionality
   */
  get splToken2022() {
    return import('./services/spl-token-2022').then(m => m.default || m);
  },

  /**
   * Lazy load ZK compression
   */
  get zkCompression() {
    return import('./services/zk-compression').then(m => m.default || m);
  },

  /**
   * Lazy load compressed NFTs
   */
  get compressedNfts() {
    return import('./services/compressed-nfts').then(m => m.default || m);
  },

  /**
   * Lazy load MEV protection
   */
  get mevProtection() {
    return import('./services/mev-protection').then(m => m.default || m);
  },

  /**
   * Lazy load cross-platform bridge
   */
  get crossPlatformBridge() {
    return import('./services/cross-platform-bridge').then(m => m.default || m);
  },

  /**
   * Lazy load real-time communication
   */
  get realtimeCommunication() {
    return import('./services/realtime-communication').then(m => m.default || m);
  },

  /**
   * Lazy load offline sync
   */
  get offlineSync() {
    return import('./services/offline-sync').then(m => m.default || m);
  },

  /**
   * Lazy load enhanced transaction helpers
   */
  get transactionHelpers() {
    return import('./utils/enhanced-transaction-helpers').then(m => ({
      ResilientTransactionSender: m.ResilientTransactionSender,
      CircuitBreaker: m.CircuitBreaker,
      withRetry: m.withRetry,
      TransactionUtils: m.TransactionUtils,
      initializeGlobalTransactionSender: m.initializeGlobalTransactionSender,
      getGlobalTransactionSender: m.getGlobalTransactionSender,
    }));
  },

  /**
   * Lazy load query utilities
   */
  get queryUtils() {
    return import('./utils/sdk-utilities').then(m => ({
      QueryUtils: m.QueryUtils,
      TransactionBuilder: m.TransactionBuilder,
      AccountParser: m.AccountParser,
    }));
  },

  /**
   * Lazy load generated instructions
   */
  get instructions() {
    return import('./generated-v2/instructions').then(m => m);
  },

  /**
   * Lazy load generated accounts
   */
  get accounts() {
    return import('./generated-v2/accounts').then(m => m);
  },

  /**
   * Lazy load generated types
   */
  get types() {
    return import('./generated-v2/types').then(m => m);
  },
};

/**
 * Feature flags for conditional loading
 */
export class FeatureFlags {
  private static features = new Set<string>();

  /**
   * Enable a feature
   */
  static enable(feature: string): void {
    this.features.add(feature);
  }

  /**
   * Disable a feature
   */
  static disable(feature: string): void {
    this.features.delete(feature);
  }

  /**
   * Check if feature is enabled
   */
  static isEnabled(feature: string): boolean {
    return this.features.has(feature);
  }

  /**
   * Get all enabled features
   */
  static getEnabled(): string[] {
    return Array.from(this.features);
  }
}

/**
 * Bundle analyzer for optimization
 */
export class BundleAnalyzer {
  /**
   * Get bundle size information
   */
  static getBundleInfo(): {
    coreSize: number;
    lazyModules: string[];
    estimatedFullSize: number;
  } {
    // This would be populated by build tools
    return {
      coreSize: 0, // KB
      lazyModules: Object.keys(LazyModules),
      estimatedFullSize: 0, // KB
    };
  }
}

/**
 * Optimized client factory with minimal footprint
 */
export class OptimizedClient {
  private rpc: Rpc<any>;
  private loadedModules = new Map<string, any>();

  constructor(rpc: Rpc<any>) {
    this.rpc = rpc;
  }

  /**
   * Load module on demand
   */
  async loadModule<T>(name: keyof typeof LazyModules): Promise<T> {
    if (this.loadedModules.has(name)) {
      return this.loadedModules.get(name);
    }

    const module = await LazyModules[name];
    this.loadedModules.set(name, module);
    return module;
  }

  /**
   * Check if module is loaded
   */
  isModuleLoaded(name: keyof typeof LazyModules): boolean {
    return this.loadedModules.has(name);
  }

  /**
   * Preload specific modules
   */
  async preloadModules(names: (keyof typeof LazyModules)[]): Promise<void> {
    await Promise.all(names.map(name => this.loadModule(name)));
  }

  /**
   * Get RPC instance
   */
  getRpc(): Rpc<any> {
    return this.rpc;
  }

  /**
   * Get loaded modules count
   */
  getLoadedModulesCount(): number {
    return this.loadedModules.size;
  }
}

/**
 * Factory function for creating optimized client
 */
export function createOptimizedClient(rpc: Rpc<any>): OptimizedClient {
  return new OptimizedClient(rpc);
}

/**
 * Tree-shakeable export structure
 */
export const TreeShakeableExports = {
  // Core utilities (small)
  utils: {
    PDAUtils,
    ProtocolValidator,
    SDKHelpers,
    TimestampUtils,
    TokenAmountUtils,
  },
  
  // Constants (tiny)
  constants: {
    PROTOCOL_CONSTANTS,
    DEFAULT_RETRY_CONFIGS,
  },
  
  // Error handling (small)
  errors: {
    ErrorType,
    EnhancedTransactionError,
    classifyError,
  },
  
  // Lazy modules (loaded on demand)
  lazy: LazyModules,
  
  // Feature management
  features: FeatureFlags,
  
  // Bundle optimization
  bundle: BundleAnalyzer,
  
  // Client factory
  client: {
    create: createOptimizedClient,
    OptimizedClient,
  },
} as const;

// Default export for tree shaking
export default TreeShakeableExports;

/**
 * Version information
 */
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 5,
  prerelease: null,
  build: null,
  full: '1.0.5',
} as const;

/**
 * SDK metadata
 */
export const SDK_METADATA = {
  name: '@ghostspeak/sdk',
  version: VERSION.full,
  description: 'TypeScript SDK for GhostSpeak Protocol on Solana',
  features: [
    'tree-shaking',
    'code-splitting',
    'lazy-loading',
    'circuit-breakers',
    'retry-logic',
    'bigint-support',
    'web3js-v2',
  ],
  bundleOptimizations: [
    'minimal-core',
    'lazy-modules',
    'tree-shakeable',
    'external-dependencies',
  ],
} as const;