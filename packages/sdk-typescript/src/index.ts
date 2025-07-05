/**
 * podAI Protocol SDK - Web3.js v2.0 Native Implementation
 *
 * Modern TypeScript SDK for podAI Protocol on Solana
 * REAL IMPLEMENTATION - No Mocks or Stubs
 */

// ===== WORKING CORE CLIENT =====
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

// ===== WORKING TYPES =====
export type {
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
} from './types';

// ===== WORKING SERVICES =====
export { AgentService } from './services/agent';
export { ChannelService } from './services/channel';
export { MessageService } from './services/message';
export { EscrowService } from './services/escrow';

// ===== WORKING UTILITIES =====
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

// ===== CONSTANTS =====
export const PODAI_PROGRAM_ID = 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps';
export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
export const VERSION = '2.0.4';
export const SDK_NAME = 'podai-sdk';

// ===== STATUS FLAGS =====
export const WEB3JS_VERSION = 'v2.0';
export const IMPLEMENTATION_STATUS = {
  CORE_CLIENT: 'WORKING ✅',
  AGENT_SERVICE: 'WORKING ✅', 
  CHANNEL_SERVICE: 'WORKING ✅',
  MESSAGE_SERVICE: 'WORKING ✅',
  ESCROW_SERVICE: 'WORKING ✅',
  REAL_RPC_CONNECTIONS: 'WORKING ✅',
  MOCK_DATA: 'ELIMINATED ✅',
} as const;
