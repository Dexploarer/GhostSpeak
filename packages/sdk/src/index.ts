/**
 * GhostSpeak Protocol SDK - Web3.js v2.0 Native Implementation
 *
 * Optimized for minimal bundle size (<50KB target)
 * Tree-shakeable exports for maximum efficiency
 */

// ===== MINIMAL CLIENT (Essential) =====
export {
  createMinimalClient,
  type IMinimalClientConfig,
} from './client-minimal';

// ===== DYNAMIC IMPORTS (Tree-shakeable) =====
export const createFullClient = async () => {
  const { PodAIClient, createPodAIClient } = await import('./client-v2');
  return { PodAIClient, createPodAIClient };
};

export const loadAdvancedServices = async () => {
  const [
    { AgentService },
    { ChannelService },
    { MessageService },
    { EscrowService },
    { MarketplaceService },
  ] = await Promise.all([
    import('./services/agent'),
    import('./services/channel'),
    import('./services/message'),
    import('./services/escrow'),
    import('./services/marketplace'),
  ]);
  return { AgentService, ChannelService, MessageService, EscrowService, MarketplaceService };
};

export const loadOptionalServices = async () => {
  const [{ AuctionService }, { BulkDealsService }, { ReputationService }] =
    await Promise.all([
      import('./services/auction'),
      import('./services/bulk-deals'),
      import('./services/reputation'),
    ]);
  return { AuctionService, BulkDealsService, ReputationService };
};

export const loadAnalytics = async () => {
  const { AnalyticsService } = await import('./services/analytics');
  return { AnalyticsService };
};

// ===== FIXED INSTRUCTION BUILDERS (Enhanced Codec Support) =====
export {
  FixedInstructionBuilder,
  InstructionFactory,
  createVerifyAgentInstruction,
  createCreateChannelInstruction,
  createSendMessageInstruction,
  createCreateServiceListingInstruction,
  createPurchaseServiceInstruction,
} from './utils/instruction-wrappers';

// ===== ENHANCED CODEC UTILITIES =====
export {
  codecs,
  isValidBase58Address,
  createAddress,
  toBigInt,
  type EnhancedCodec,
  type EnhancedEncoder,
} from './utils/codec-compat';

// ===== INSTRUCTION INPUT TYPES =====
export type {
  VerifyAgentInput,
  CreateChannelInput,
  SendMessageInput,
  CreateServiceListingInput,
  PurchaseServiceInput,
} from './utils/instruction-wrappers';

// ===== SECURITY MODULES (Tree-shakeable) =====
export const loadSecurityModules = async () => {
  const [
    { InputValidator, ValidationError },
    { SecurityMiddleware, securityMiddleware },
    { AccessControlManager, accessControl, ChannelType, PermissionLevel },
  ] = await Promise.all([
    import('./utils/input-validator'),
    import('./utils/security-middleware'),
    import('./utils/access-control'),
  ]);
  return { 
    InputValidator, 
    ValidationError, 
    SecurityMiddleware, 
    securityMiddleware,
    AccessControlManager,
    accessControl,
    ChannelType,
    PermissionLevel,
  };
};

export const loadMarketplace = async () => {
  const { MarketplaceImpl, ServiceListingStatus, OrderStatus } = await import('./services/marketplace-impl');
  return { MarketplaceImpl, ServiceListingStatus, OrderStatus };
};

// ===== ESSENTIAL TYPES =====
export type { Address } from '@solana/addresses';
export type { Commitment } from '@solana/rpc-types';
export type { Rpc, SolanaRpcApi } from '@solana/rpc';
export type { KeyPairSigner } from '@solana/signers';

// ===== BASIC TYPES =====
export interface IAgent {
  readonly address: Address;
  readonly name: string;
  readonly capabilities: readonly string[];
}

export interface IChannel {
  readonly address: Address;
  readonly name: string;
  readonly participants: readonly Address[];
}

export interface IMessage {
  readonly id: string;
  readonly content: string;
  readonly sender: Address;
  readonly timestamp: number;
}

// ===== UTILITIES (Essential only) =====
export const lamportsToSol = (lamports: bigint): number => {
  return Number(lamports) / 1_000_000_000;
};

export const solToLamports = (sol: number): bigint => {
  return BigInt(Math.round(sol * 1_000_000_000));
};

// ===== SECURITY UTILITIES =====
export {
  secureToBigIntLE,
  secureToBigIntBE,
  secureToBufferLE,
  secureToBufferBE,
  SecureBigIntBuffer,
  AuditedBigIntBuffer,
  type SecurityAuditEntry
} from './utils/secure-bigint-buffer';

export {
  safeBigIntToU64,
  safeNumberToBigInt,
  getFlexibleU64Encoder,
  getFlexibleU64Decoder,
  getFlexibleU64Codec,
  TimestampUtils,
  TokenAmountUtils,
  IdUtils,
  SerializationValidator,
  type BigIntLike,
  type TimestampLike,
  toTimestamp
} from './utils/bigint-serialization';

// ===== TRANSACTION HELPERS =====
export { sendAndConfirmTransactionFactory } from './utils/transaction-helpers';
export { address, isAddress } from '@solana/addresses';

// ===== ACCOUNT TYPES =====
export type { AgentAccount } from './generated-v2/accounts/agentAccount';

// ===== OBSERVABILITY (Optional - Tree-shakeable) =====
export const loadObservability = async () => {
  const { initializeObservability, getObservability, withObservability, observed } = await import('./observability');
  return { initializeObservability, getObservability, withObservability, observed };
};

export const createDashboard = async () => {
  const { createDashboardServer } = await import('./observability/dashboard');
  return { createDashboardServer };
};

// ===== CONSTANTS =====
export const GHOSTSPEAK_PROGRAM_ID =
  '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP' as const; // GhostSpeak Protocol Program ID
export const DEVNET_RPC = 'https://api.devnet.solana.com' as const;
export const VERSION = '1.0.0' as const;
export const SDK_NAME = '@ghostspeak/sdk' as const;
