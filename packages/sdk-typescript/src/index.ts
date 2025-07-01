/**
 * podAI Protocol SDK - Web3.js v2.0 Native Implementation
 *
 * Modern TypeScript SDK for podAI Protocol on Solana
 * Uses Codama-generated clients for maximum performance and type safety
 */

// Web3.js v2.0 Client (Production Ready)
export {
  PodAIClientV2,
  createPodAIClientV2,
  createDevnetClient,
  createMainnetClient,
  isValidAddress,
  type IPodAIClientV2Config,
} from './client-v2';

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
} from './types';

// Re-export generated v2 types for advanced usage
export * from './generated-v2';

// Services - Complete TypeScript SDK with full feature parity
export {
  AgentService,
  AgentRegistrationBuilder,
  type IAgentConfig,
  type IAgentUpdateResult,
  type IAgentFilter,
  type IAgentStats,
} from './services/agent';

export { ChannelService } from './services/channel';

export {
  MessageService,
  MessageSendBuilder,
  type IMessageSendResult,
  type IMessageReadResult,
  type IMessageFilter,
  type IMessageConfig,
} from './services/message';

export {
  EscrowService,
  EscrowCreationBuilder,
  EscrowTransactionType,
  type IEscrowCreationResult,
  type IEscrowDepositResult,
  type IEscrowWithdrawResult,
  type IEscrowAccount,
  type IEscrowConfig,
} from './services/escrow';

export {
  WorkDeliveryService,
  type IWorkOutput,
  type IWorkDeliverable,
} from './services/work-delivery';

export {
  SplToken2022Service,
  type ITokenExtensions,
  type IToken2022Account,
} from './services/spl-token-2022';

export {
  ConfidentialTransferService,
  type IConfidentialMintConfig,
  type IConfidentialAccountConfig,
} from './services/confidential-transfer';

export {
  CompressionService,
  type ICompressionConfig,
  type ICompressionProof,
} from './services/compression';

export {
  AnalyticsService,
  type IAnalyticsData,
  type INetworkMetrics,
} from './services/analytics';

export {
  MarketplaceService,
  type IServiceListing,
  type IJobPosting,
  type IMarketplaceConfig,
} from './services/marketplace';

export {
  AgentReplicationService,
  type IReplicationTemplate,
  type IReplicationRecord,
  type IAgentCustomization,
  type IReplicationConfig,
} from './services/agent-replication';

// Transaction utilities (Jupiter Swap patterns)
export {
  buildTransaction,
  simulateTransaction,
  sendAndConfirmTransaction,
  buildSimulateAndSendTransaction,
  batchTransactions,
  retryTransaction,
  createTransactionConfig,
  type ITransactionConfig,
  type ISimulationResult,
  type ITransactionResult,
} from './utils/transaction-utils';

// Examples
export * from './examples/jupiter-patterns-example';

// Constants
export const PODAI_PROGRAM_ID = 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps';
export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

// Version info
export const VERSION = '2.0.0';
export const SDK_NAME = 'podai-sdk';
