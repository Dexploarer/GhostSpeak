/**
 * podAI Protocol SDK - Web3.js v2.0 Native Implementation
 *
 * Modern TypeScript SDK for podAI Protocol on Solana
 * Uses Codama-generated clients for maximum performance and type safety
 */

// Modern Web3.js v2.0 Client (Production Ready)
export {
  PodAIClient,
  createPodAIClient,
  createDevnetClient,
  createLocalnetClient,
  createMainnetClient,
  type IPodAIClientConfig,
} from './client-v2';

// Alias for backwards compatibility
export { createPodAIClient as createPodAIClientV2 } from './client-v2';

// Types and Interfaces
export type {
  // Core types from types.ts
  IAgentAccount,
  IChannelAccount,
  IMessageAccount,
  ICreateAgentOptions,
  ICreateChannelOptions,
  ISendMessageOptions,
  IBroadcastMessageOptions,
  MessageType,
  ChannelVisibility,
  PodComError,
  IPodComConfig,
  IMessage,
  IMessageOptions,
  IMessageStatus,
  INetworkMetrics,
  IMarketplaceListing,
  // Add more as needed from types.ts
} from './types';

// Re-export generated v2 types for advanced usage
export * from './generated-v2';

// Modern Services - Clean Web3.js v2 Implementation
export { AgentService } from './services/agent';
export {
  ChannelService,
  ChannelVisibility as ChannelVisibilityEnum,
} from './services/channel';

export { MessageService } from './services/message';
// export type {
//   IMessage,
//   IMessageSendResult,
//   IMessageOptions,
//   IMessageStatus,
//   IMessageType,
// } from './services/message';

export { EscrowService } from './services/escrow';

export {
  ConfidentialTransferService,
  type IConfidentialMintConfig,
  type IConfidentialAccountConfig,
} from './services/confidential-transfer';

export { CompressionService } from './services/compression';
// export type { ICompressionConfig } from './services/compression'; // Not implemented yet
// export type { ICompressionProof } from './services/compression'; // Not implemented yet

// Remove duplicate and invalid type exports from './services/analytics' and './services/marketplace'
// export {
//   AnalyticsService,
//   type IAnalyticsData,
//   type INetworkMetrics,
// } from './services/analytics';
//
// export {
//   MarketplaceService,
//   type IServiceListing,
//   type IJobPosting,
//   type IMarketplaceConfig,
// } from './services/marketplace';

export {
  AgentReplicationService,
  type IReplicationTemplate,
  type IReplicationRecord,
  type IAgentCustomization,
  type IReplicationConfig,
} from './services/agent-replication';

// Modern Transaction utilities (Web3.js v2 patterns)
export {
  sendTransaction,
  buildSimulateAndSendTransaction,
  batchTransactions,
  retryTransaction,
  createTransactionConfig,
  lamportsToSol,
  solToLamports,
  type ITransactionOptions,
  type ITransactionResult,
  type ITransactionInstruction,
} from './utils/transaction-helpers';

// Examples
export * from './examples/jupiter-patterns-example';

// Constants
export const PODAI_PROGRAM_ID = 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps';
export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

// Version info
export const VERSION = '2.0.0';
export const SDK_NAME = 'podai-sdk';
