import { address } from '@solana/addresses';

import type { Address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';

/**
 * PoD Protocol Program ID on Solana Devnet
 */
export const PROGRAM_ID = address(
  '4ufTpHynyoWzSL3d2EL4PU1hSra1tKvQrQiBwJ82x385'
);

/**
 * Message types supported by PoD Protocol
 */
export enum MessageType {
  TEXT = 0,
  IMAGE = 1,
  CODE = 2,
  FILE = 3,
}

/**
 * Message status in the delivery lifecycle
 */
export enum MessageStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Channel visibility options
 */
export enum ChannelVisibility {
  PUBLIC = 0,
  PRIVATE = 1,
  RESTRICTED = 2,
}

/**
 * Agent account data structure
 */
export interface IAgentAccount {
  /** Agent's wallet public key */
  pubkey: Address;
  /** Bitmask representing agent capabilities */
  capabilities: number;
  /** URI to agent metadata (IPFS, Arweave, etc.) */
  metadataUri: string;
  /** Agent reputation score */
  reputation: number;
  /** Last update timestamp */
  lastUpdated: number;
  /** Number of invitations sent in current window */
  invitesSent: number;
  /** Timestamp of last invitation window */
  lastInviteAt: number;
  /** PDA bump seed */
  bump: number;
}

/**
 * Message account data structure
 */
export interface IMessageAccount {
  /** Message account public key */
  pubkey: Address;
  /** Sender's public key */
  sender: Address;
  /** Recipient's public key */
  recipient: Address;
  /** SHA-256 hash of message payload */
  payloadHash: Uint8Array;
  /** Original message payload (for display) */
  payload: string;
  /** Type of message */
  messageType: MessageType;
  /** Creation timestamp */
  timestamp: number;
  /** Creation timestamp (alias for compatibility) */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Current delivery status */
  status: MessageStatus;
  /** PDA bump seed */
  bump: number;
}

/**
 * Channel account data structure
 */
export interface IChannelAccount {
  /** Channel account public key */
  pubkey: Address;
  /** Channel creator's public key */
  creator: Address;
  /** Channel name */
  name: string;
  /** Channel description */
  description: string;
  /** Channel visibility setting */
  visibility: ChannelVisibility;
  /** Maximum number of participants allowed */
  maxMembers: number;
  /** Current number of participants */
  memberCount: number;
  /** Current number of participants (alias for compatibility) */
  currentParticipants: number;
  /** Legacy alias for maxMembers */
  maxParticipants: number;
  /** Legacy alias for memberCount */
  participantCount: number;
  /** Fee per message in lamports */
  feePerMessage: number;
  /** Total escrow balance in lamports */
  escrowBalance: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last updated timestamp */
  lastUpdated: number;
  /** Whether channel is active */
  isActive: boolean;
  /** Whether channel requires approval to join */
  requiresApproval?: boolean;
  /** PDA bump seed */
  bump: number;
}

/**
 * Escrow account data structure
 */
export interface IEscrowAccount {
  /** Associated channel public key */
  channel: Address;
  /** Depositor's public key */
  depositor: Address;
  /** Deposited amount in lamports */
  balance: number;
  /** Deposited amount in lamports (alias for compatibility) */
  amount: number;
  /** Deposit timestamp */
  createdAt: number;
  /** Last updated timestamp */
  lastUpdated: number;
  /** PDA bump seed */
  bump: number;
}

/**
 * Agent capabilities as bitmask values
 */
export const AGENT_CAPABILITIES = {
  TEXT: 1,
  IMAGE: 2,
  CODE: 4,
  ANALYSIS: 8,
  TRADING: 16,
  DATA_PROCESSING: 32,
  CONTENT_GENERATION: 64,
  CUSTOM1: 128,
  CUSTOM2: 256,
} as const;

/**
 * Error types returned by PoD Protocol program
 */
export enum PodComError {
  INVALID_METADATA_URI_LENGTH = 6000,
  UNAUTHORIZED = 6001,
  MESSAGE_EXPIRED = 6002,
  INVALID_MESSAGE_STATUS_TRANSITION = 6003,
  INSUFFICIENT_ACCOUNTS = 6004,
  INVALID_ACCOUNT_DATA = 6005,
  INVALID_INSTRUCTION_DATA = 6006,
}

/**
 * SDK Error codes
 */
export enum ErrorCode {
  PROGRAM_ERROR = 'PROGRAM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  ACCOUNT_ERROR = 'ACCOUNT_ERROR',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ACCOUNT_DATA = 'INVALID_ACCOUNT_DATA',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
}

/**
 * Configuration for PoD Protocol SDK
 */
export interface IPodComConfig {
  /** Solana cluster endpoint */
  endpoint?: string;
  /** Program ID (defaults to devnet) */
  programId?: Address;
  /** Default commitment level */
  commitment?: 'processed' | 'confirmed' | 'finalized';
  /** IPFS configuration for off-chain storage */
  ipfs?: {
    /** Disable IPFS functionality completely */
    disabled?: boolean;
    /** IPFS node URL - defaults to Infura public gateway */
    url?: string;
    /** IPFS API endpoint - defaults to /api/v0 */
    apiPath?: string;
    /** Authorization headers for private IPFS nodes */
    headers?: Record<string, string>;
    /** Timeout for IPFS operations in milliseconds */
    timeout?: number;
    /** Gateway URL for retrieving content */
    gatewayUrl?: string;
  };
  /** ZK Compression configuration for Light Protocol integration */
  zkCompression?: {
    /** Light Protocol Solana RPC endpoint */
    lightRpcUrl?: string;
    /** Light Protocol compression RPC endpoint */
    compressionRpcUrl?: string;
    /** Light Protocol prover endpoint */
    proverUrl?: string;
    /** Photon indexer endpoint */
    photonIndexerUrl?: string;
    /** Maximum batch size for compression operations */
    maxBatchSize?: number;
    /** Enable automatic batching */
    enableBatching?: boolean;
    /** Batch timeout in milliseconds */
    batchTimeout?: number;
    /** Light system program public key */
    lightSystemProgram?: Address;
    /** Nullifier queue public key */
    nullifierQueuePubkey?: Address;
    /** CPI authority PDA */
    cpiAuthorityPda?: Address;
    /** Compressed Token program */
    compressedTokenProgram?: Address;
    /** Registered Program ID */
    registeredProgramId?: Address;
    /** No-op Program */
    noopProgram?: Address;
    /** Account Compression authority */
    accountCompressionAuthority?: Address;
    /** Account Compression program */
    accountCompressionProgram?: Address;
  };
  /** Jito RPC URL for bundle transactions */
  jitoRpcUrl?: string;
  /** Session keys configuration */
  sessionKeys?: {
    /** Default session duration in hours */
    defaultDurationHours?: number;
    /** Maximum uses per session */
    defaultMaxUses?: number;
    /** Auto-cleanup expired sessions */
    autoCleanup?: boolean;
  };
}

/**
 * Options for creating a new agent
 */
export interface ICreateAgentOptions {
  /** Agent capabilities bitmask */
  capabilities: number;
  /** Metadata URI */
  metadataUri: string;
}

/**
 * Options for updating an agent
 */
export interface IUpdateAgentOptions {
  /** New capabilities (optional) */
  capabilities?: number;
  /** New metadata URI (optional) */
  metadataUri?: string;
}

/**
 * Options for updating a channel
 */
export interface IUpdateChannelOptions {
  /** New name (optional) */
  name?: string;
  /** New description (optional) */
  description?: string;
  /** New visibility (optional) */
  visibility?: ChannelVisibility;
  /** New max members (optional) */
  maxMembers?: number;
}

/**
 * Options for sending a message
 */
export interface ISendMessageOptions {
  /** Recipient's public key */
  recipient: Address;
  /** Message payload (will be hashed) */
  payload: string | Uint8Array;
  /** Message type */
  messageType: MessageType;
  /** Custom message type value (for Custom type) */
  customValue?: number;
  /** Message content for display */
  content?: string;
  /** Expiration in days */
  expirationDays?: number;
}

/**
 * Options for creating a channel
 */
export interface ICreateChannelOptions {
  /** Channel name */
  name: string;
  /** Channel description */
  description: string;
  /** Channel visibility */
  visibility: ChannelVisibility;
  /** Maximum participants */
  maxMembers: number;
  /** Legacy alias for maxMembers */
  maxParticipants?: number;
  /** Fee per message in lamports */
  feePerMessage: number;
}

/**
 * Options for depositing to escrow
 */
export interface IDepositEscrowOptions {
  /** Channel public key */
  channel: Address;
  /** Amount to deposit in lamports */
  amount: number;
}

/**
 * Options for withdrawing from escrow
 */
export interface IWithdrawEscrowOptions {
  /** Channel public key */
  channel: Address;
  /** Amount to withdraw in lamports */
  amount: number;
}

/**
 * Options for broadcasting a message to a channel
 */
export interface IBroadcastMessageOptions {
  /** Channel public key */
  channelPDA: Address;
  /** Message content */
  content: string;
  /** Message type (defaults to TEXT) */
  messageType?: MessageType;
  /** Optional reply-to message */
  replyTo?: Address;
}

// Analytics interfaces
export interface IAgentMetrics {
  agentAddress: Address;
  messagesSent: number;
  messagesReceived: number;
  channelsJoined: number;
  averageResponseTime: number;
  reputation: number;
  lastActive: number;
  totalInteractions: number;
  successRate: number;
  peakActivityHours: number[];
}

export interface IMessageMetrics {
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  averageDeliveryTime: number;
  deliveryRate: number;
  messageVolume: number;
  peakHours: number[];
  timeframe: string;
}

export interface IChannelMetrics {
  totalChannels: number;
  activeChannels: number;
  totalMembers: number;
  averageMembers: number;
  messageActivity: number;
  growthRate: number;
  mostActiveChannels: Address[];
}

export interface INetworkMetrics {
  totalValueLocked: number;
  activeEscrows: number;
  networkHealth: number;
  averageTps: number;
  blockTime: number;
  currentSlot: number;
  activeNodes: number;
  consensusHealth: number;
  messageVolume24h: number;
  activeAgents24h: number;
  peakUsageHours: number[];
}

export interface IPerformanceMetrics {
  avgConfirmationTime: number;
  avgTransactionFee: number;
  successRate: number;
  throughput: number;
  errorRate: number;
  networkLatency: number;
  resourceUtilization: number;
  queueDepth: number;
}

// Discovery interfaces
export interface IAgentSearchFilters {
  capabilities?: number[];
  minReputation?: number;
  maxReputation?: number;
  metadataContains?: string;
  lastActiveAfter?: number;
  lastActiveBefore?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'recent' | 'popular' | 'reputation';
  sortOrder?: 'asc' | 'desc';
}

export interface IMessageSearchFilters {
  sender?: Address;
  recipient?: Address;
  messageType?: MessageType | MessageType[];
  status?: MessageStatus[];
  limit?: number;
  offset?: number;
  payloadContains?: string;
  createdAfter?: number;
  createdBefore?: number;
  content?: string;
  dateFrom?: number;
  dateTo?: number;
  sortBy?: 'relevance' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

export interface IChannelSearchFilters {
  creator?: Address;
  visibility?: ChannelVisibility | ChannelVisibility[];
  minMembers?: number;
  maxMembers?: number;
  minParticipants?: number;
  maxParticipants?: number;
  maxFeePerMessage?: number;
  hasEscrow?: boolean;
  limit?: number;
  offset?: number;
  nameContains?: string;
  descriptionContains?: string;
  createdAfter?: number;
  createdBefore?: number;
  sortBy?: 'popular' | 'recent' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface IRecommendationOptions {
  limit?: number;
}

export interface INetworkStatistics {
  totalAgents: number;
  totalMessages: number;
  totalChannels: number;
  activeAgents24h: number;
  messageVolume24h: number;
  averageReputation: number;
  networkHealth: number;
}

// Migration interfaces
export interface IMigrationStatus {
  isComplete: boolean;
  version: string;
  compatibility: string;
  features: {
    rpc: boolean;
    address: boolean;
    transactions: boolean;
    programs: boolean;
  };
  lastChecked: number;
  error?: string;
}

export type V2FeatureMap = Record<
  string,
  {
    available: boolean;
    description: string;
  }
>;

// ============================================================================
// MESSAGE SERVICE TYPES
// ============================================================================

/**
 * Message options for sending messages
 */
export interface IMessageOptions {
  /** Message payload (string or bytes) */
  payload?: string | Uint8Array;
  /** Message type */
  messageType?: MessageType;
  /** Expiration in days */
  expirationDays?: number;
  /** Custom message value */
  customValue?: number;
  /** Message content for display */
  content?: string;
}

/**
 * Message interface for service layer
 */
export interface IMessage {
  /** Message account public key */
  pubkey: Address;
  /** Sender's public key */
  sender: Address;
  /** Recipient's public key */
  recipient: Address;
  /** SHA-256 hash of message payload */
  payloadHash: Uint8Array;
  /** Original message payload */
  payload: string;
  /** Type of message */
  messageType: MessageType;
  /** Creation timestamp */
  timestamp: number;
  /** Creation timestamp (alias for compatibility) */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Current delivery status */
  status: IMessageStatus;
  /** PDA bump seed */
  bump: number;
}

/**
 * Message status interface
 */
export interface IMessageStatus {
  /** Status value */
  value: number;
  /** Status name */
  name: string;
  /** Whether message is active */
  isActive: boolean;
}

// ============================================================================
// COMPRESSION SERVICE TYPES
// ============================================================================

/**
 * Compression algorithms supported
 */
export enum CompressionAlgorithm {
  LZ4 = 'lz4',
  ZSTD = 'zstd',
  GZIP = 'gzip',
  DEFLATE = 'deflate'
}

/**
 * Compression levels
 */
export enum CompressionLevel {
  FASTEST = 1,
  FAST = 2,
  BALANCED = 3,
  BEST = 4,
  MAXIMUM = 5
}

/**
 * Compression options
 */
export interface ICompressionOptions {
  /** Compression algorithm to use */
  algorithm?: CompressionAlgorithm;
  /** Compression level */
  level?: CompressionLevel;
  /** Maximum size before compression */
  maxSize?: number;
  /** Whether to verify compression */
  verify?: boolean;
}

/**
 * Compression result
 */
export interface ICompressionResult {
  /** Compressed data */
  compressedData: Uint8Array;
  /** Original size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Size savings in bytes */
  savings: number;
  /** Compression ratio as percentage */
  compressionRatio: number;
  /** Algorithm used */
  algorithm: CompressionAlgorithm;
  /** Level used */
  level: CompressionLevel;
  /** Instruction for on-chain compression (optional) */
  instruction?: any;
}

/**
 * Decompression result
 */
export interface IDecompressionResult {
  /** Decompressed data */
  decompressedData: Uint8Array;
  /** Original compressed size */
  originalSize: number;
  /** Decompressed size */
  decompressedSize: number;
}

/**
 * Merkle proof interface
 */
export interface IMerkleProof {
  /** Proof elements */
  proof: Uint8Array[];
  /** Leaf index */
  leafIndex: number;
  /** Proof path */
  path: number[];
}

// ============================================================================
// WORK DELIVERY TYPES
// ============================================================================

/**
 * Work status enum
 */
export enum WorkStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

/**
 * Work type enum
 */
export enum WorkType {
  TEXT_GENERATION = 'text_generation',
  CODE_REVIEW = 'code_review',
  DATA_ANALYSIS = 'data_analysis',
  TRANSLATION = 'translation',
  CUSTOM = 'custom'
}

/**
 * Work delivery options
 */
export interface IWorkDeliveryOptions {
  /** Work requirements */
  requirements?: string;
  /** Deadline timestamp */
  deadline?: number;
  /** Reward amount */
  reward?: number;
  /** Priority level */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Work progress interface
 */
export interface IWorkProgress {
  /** Work ID */
  workId: string;
  /** Current status */
  status: WorkStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Started timestamp */
  startedAt: number;
  /** Last updated timestamp */
  lastUpdated: number;
  /** Agent address */
  agentAddress?: Address;
  /** Milestones completed */
  milestones: string[];
  /** Quality score */
  qualityScore?: number;
  /** Feedback */
  feedback?: string;
  /** Deadline */
  deadline?: number;
}

/**
 * Work completion interface
 */
export interface IWorkCompletion {
  /** Work result */
  result: string;
  /** Quality score (1-10) */
  quality: number;
  /** Feedback */
  feedback?: string;
}

/**
 * Work verification interface
 */
export interface IWorkVerification {
  /** Work ID */
  workId: string;
  /** Whether work is completed */
  isCompleted: boolean;
  /** Whether work is verified */
  isVerified: boolean;
  /** Quality score */
  qualityScore?: number;
  /** Feedback */
  feedback?: string;
  /** Completion timestamp */
  completedAt?: number;
  /** Verification timestamp */
  verificationTimestamp: number;
}

// ============================================================================
// MARKETPLACE TYPES
// ============================================================================

/**
 * Marketplace listing status
 */
export enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

/**
 * Marketplace listing interface
 */
export interface IMarketplaceListing {
  /** Listing ID */
  listingId: string;
  /** Seller address */
  seller: Address;
  /** Agent address */
  agentAddress: Address;
  /** Price in lamports */
  price: number;
  /** Status */
  status: ListingStatus;
  /** Created timestamp */
  createdAt: number;
  /** Expires timestamp */
  expiresAt: number;
  /** Description */
  description?: string;
}

/**
 * Marketplace transaction interface
 */
export interface IMarketplaceTransaction {
  /** Transaction ID */
  transactionId: string;
  /** Listing ID */
  listingId: string;
  /** Buyer address */
  buyer: Address;
  /** Seller address */
  seller: Address;
  /** Agent address */
  agentAddress: Address;
  /** Price in lamports */
  price: number;
  /** Transaction timestamp */
  timestamp: number;
  /** Transaction signature */
  signature: string;
}

// ============================================================================
// ESCROW TYPES
// ============================================================================

/**
 * Escrow status enum
 */
export enum EscrowStatus {
  PENDING = 'pending',
  FUNDED = 'funded',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed'
}

/**
 * Escrow interface
 */
export interface IEscrow {
  /** Escrow ID */
  escrowId: string;
  /** Buyer address */
  buyer: Address;
  /** Seller address */
  seller: Address;
  /** Amount in lamports */
  amount: number;
  /** Status */
  status: EscrowStatus;
  /** Created timestamp */
  createdAt: number;
  /** Released timestamp */
  releasedAt?: number;
  /** Dispute timestamp */
  disputedAt?: number;
  /** Escrow account address */
  escrowAccount: Address;
}

// ============================================================================
// AGENT REPLICATION TYPES
// ============================================================================

/**
 * Replication status enum
 */
export enum ReplicationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Agent replication interface
 */
export interface IAgentReplication {
  /** Replication ID */
  replicationId: string;
  /** Source agent address */
  sourceAgent: Address;
  /** Target agent address */
  targetAgent: Address;
  /** Status */
  status: ReplicationStatus;
  /** Started timestamp */
  startedAt: number;
  /** Completed timestamp */
  completedAt?: number;
  /** Progress percentage */
  progress: number;
  /** Error message */
  error?: string;
}

// ============================================================================
// BUSINESS LOGIC TYPES
// ============================================================================

/**
 * Business rule type enum
 */
export enum BusinessRuleType {
  PRICING = 'pricing',
  ACCESS_CONTROL = 'access_control',
  RATE_LIMITING = 'rate_limiting',
  QUALITY_CONTROL = 'quality_control'
}

/**
 * Business rule interface
 */
export interface IBusinessRule {
  /** Rule ID */
  ruleId: string;
  /** Rule type */
  type: BusinessRuleType;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule conditions */
  conditions: Record<string, any>;
  /** Rule actions */
  actions: Record<string, any>;
  /** Whether rule is active */
  isActive: boolean;
  /** Created timestamp */
  createdAt: number;
  /** Updated timestamp */
  updatedAt: number;
}

// ============================================================================
// COMPRESSED NFT TYPES
// ============================================================================

/**
 * Compressed NFT metadata interface
 */
export interface ICompressedNFTMetadata {
  /** NFT name */
  name: string;
  /** NFT symbol */
  symbol: string;
  /** NFT description */
  description: string;
  /** NFT image URI */
  image: string;
  /** NFT attributes */
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  /** NFT properties */
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    category: string;
  };
}

/**
 * Compressed NFT interface
 */
export interface ICompressedNFT {
  /** NFT asset ID */
  assetId: string;
  /** Tree address */
  treeAddress: Address;
  /** Leaf index */
  leafIndex: number;
  /** Metadata URI */
  metadataUri: string;
  /** Whether NFT is compressed */
  compressed: boolean;
  /** Owner address */
  owner: Address;
  /** Created timestamp */
  createdAt: number;
}

// ============================================================================
// MEV PROTECTION TYPES
// ============================================================================

/**
 * MEV protection strategy enum
 */
export enum MEVProtectionStrategy {
  PRIVATE_MEMPOOL = 'private_mempool',
  COMMIT_REVEAL = 'commit_reveal',
  FRAGMENTATION = 'fragmentation',
  DECOY_TRANSACTIONS = 'decoy_transactions',
  ADAPTIVE = 'adaptive'
}

/**
 * MEV protection configuration
 */
export interface IMEVProtectionConfig {
  /** Protection strategy */
  strategy: MEVProtectionStrategy;
  /** Protection level (1-10) */
  level: number;
  /** Maximum transaction value to protect */
  maxValue: number;
  /** Whether to enable automatic protection */
  autoProtect: boolean;
  /** Custom protection parameters */
  parameters?: Record<string, any>;
}

/**
 * MEV protection result
 */
export interface IMEVProtectionResult {
  /** Whether protection was applied */
  protected: boolean;
  /** Protection strategy used */
  strategy: MEVProtectionStrategy;
  /** Protection cost in lamports */
  cost: number;
  /** Estimated savings */
  savings: number;
  /** Transaction signature */
  signature: string;
  /** Protection metadata */
  metadata?: Record<string, any>;
}

// Re-export common types
export type { Address, KeyPairSigner };

// Client interface with proper types
export interface IPodAIClientV2 {
  getRpc(): Rpc<SolanaRpcApi>;
  getProgramId(): Address;
  getCommitment(): Commitment;  
  getWsEndpoint(): string | undefined;
}
