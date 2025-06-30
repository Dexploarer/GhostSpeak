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

// Transaction utilities
export {
  sendTransaction,
  sendTransactionBatch,
  estimateTransactionFee,
  checkTransactionStatus,
  type SendTransactionOptions,
  type TransactionResult,
} from './utils/transaction-sender';

// Constants
export const PODAI_PROGRAM_ID = 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps';
export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

// Version info
export const VERSION = '2.0.0';
export const SDK_NAME = 'podai-sdk';
