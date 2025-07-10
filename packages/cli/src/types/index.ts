/**
 * GhostSpeak CLI Type Definitions
 * Comprehensive type system for the GhostSpeak protocol CLI
 */

import { Keypair } from '@solana/web3.js';

import type { BN } from '@coral-xyz/anchor';
import type {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';

// ============================
// Core Domain Types
// ============================

/**
 * Represents an AI agent in the GhostSpeak protocol
 */
export interface Agent {
  publicKey: PublicKey;
  owner: PublicKey;
  metadata: AgentMetadata;
  reputation: AgentReputation;
  capabilities: string[];
  status: AgentStatus;
  createdAt: BN;
  updatedAt: BN;
}

/**
 * Agent metadata stored on-chain
 */
export interface AgentMetadata {
  name: string;
  description: string;
  avatar?: string;
  category: string;
  tags: string[];
  serviceEndpoint?: string;
}

/**
 * Agent reputation metrics
 */
export interface AgentReputation {
  totalTasks: number;
  completedTasks: number;
  successRate: number;
  averageRating: number;
  totalEarned: BN;
}

/**
 * Agent status enumeration
 */
export enum AgentStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
  Banned = 'banned',
}

/**
 * Communication channel between agents
 */
export interface Channel {
  id: PublicKey;
  participants: PublicKey[];
  createdBy: PublicKey;
  metadata: ChannelMetadata;
  encryptionKey?: string;
  createdAt: BN;
  lastActivity: BN;
}

/**
 * Channel metadata
 */
export interface ChannelMetadata {
  name: string;
  description?: string;
  isPrivate: boolean;
  maxParticipants?: number;
}

/**
 * Message in a channel
 */
export interface Message {
  id: string;
  channelId: PublicKey;
  sender: PublicKey;
  content: string;
  metadata: MessageMetadata;
  timestamp: BN;
  signature: string;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  contentType: MessageContentType;
  encrypted: boolean;
  replyTo?: string;
  attachments?: MessageAttachment[];
}

/**
 * Message content types
 */
export enum MessageContentType {
  Text = 'text',
  Command = 'command',
  Task = 'task',
  Result = 'result',
  Error = 'error',
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  hash: string;
}

/**
 * Task listing in the marketplace
 */
export interface TaskListing {
  id: PublicKey;
  creator: PublicKey;
  assignee?: PublicKey;
  metadata: TaskMetadata;
  requirements: TaskRequirements;
  payment: PaymentTerms;
  status: TaskStatus;
  createdAt: BN;
  deadline?: BN;
}

/**
 * Task metadata
 */
export interface TaskMetadata {
  title: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: TaskDifficulty;
}

/**
 * Task requirements
 */
export interface TaskRequirements {
  minReputation?: number;
  requiredCapabilities?: string[];
  estimatedDuration?: number;
  deliverables: string[];
}

/**
 * Payment terms for a task
 */
export interface PaymentTerms {
  amount: BN;
  token: PublicKey;
  escrowAccount?: PublicKey;
  milestones?: PaymentMilestone[];
}

/**
 * Payment milestone
 */
export interface PaymentMilestone {
  id: string;
  description: string;
  amount: BN;
  deadline?: BN;
  completed: boolean;
}

/**
 * Task status enumeration
 */
export enum TaskStatus {
  Open = 'open',
  Assigned = 'assigned',
  InProgress = 'in_progress',
  UnderReview = 'under_review',
  Completed = 'completed',
  Disputed = 'disputed',
  Cancelled = 'cancelled',
}

/**
 * Task difficulty levels
 */
export enum TaskDifficulty {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
  Expert = 'expert',
}

// ============================
// Transaction Types
// ============================

/**
 * Transaction result from blockchain operations
 */
export interface TransactionResult {
  signature: string;
  transaction: Transaction | VersionedTransaction;
  slot?: number;
  confirmationStatus?: TransactionConfirmationStatus;
  error?: TransactionError;
}

/**
 * Transaction confirmation status
 */
export enum TransactionConfirmationStatus {
  Processed = 'processed',
  Confirmed = 'confirmed',
  Finalized = 'finalized',
}

/**
 * Transaction error information
 */
export interface TransactionError {
  code: string;
  message: string;
  logs?: string[];
}

// ============================
// Wallet & Account Types
// ============================

/**
 * Wallet information
 */
export interface WalletInfo {
  publicKey: PublicKey;
  balance: BN;
  isSystemProgram: boolean;
  executable: boolean;
  owner: PublicKey;
  rentEpoch?: number;
}

/**
 * Token account information
 */
export interface TokenAccountInfo {
  address: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  amount: BN;
  decimals: number;
  isNative: boolean;
  delegatedAmount?: BN;
  delegate?: PublicKey;
  state: TokenAccountState;
}

/**
 * Token account states
 */
export enum TokenAccountState {
  Uninitialized = 'uninitialized',
  Initialized = 'initialized',
  Frozen = 'frozen',
}

// ============================
// SPL Token 2022 Types
// ============================

/**
 * SPL Token 2022 configuration
 */
export interface SplToken2022Config {
  mint: PublicKey;
  decimals: number;
  transferFeeConfig?: TransferFeeConfig;
  interestBearingConfig?: InterestBearingConfig;
  nonTransferableConfig?: NonTransferableConfig;
  permanentDelegate?: PublicKey;
  transferHook?: TransferHookConfig;
  metadataPointer?: MetadataPointerConfig;
}

/**
 * Transfer fee configuration
 */
export interface TransferFeeConfig {
  transferFeeBasisPoints: number;
  maximumFee: BN;
  transferFeeAuthority?: PublicKey;
  withdrawWithheldAuthority?: PublicKey;
}

/**
 * Interest bearing token configuration
 */
export interface InterestBearingConfig {
  rateAuthority?: PublicKey;
  initializationTimestamp: BN;
  preUpdateAverageRate: number;
  lastUpdateTimestamp: BN;
  currentRate: number;
}

/**
 * Non-transferable token configuration
 */
export interface NonTransferableConfig {
  enabled: boolean;
}

/**
 * Transfer hook configuration
 */
export interface TransferHookConfig {
  authority?: PublicKey;
  programId?: PublicKey;
}

/**
 * Metadata pointer configuration
 */
export interface MetadataPointerConfig {
  authority?: PublicKey;
  metadataAddress?: PublicKey;
}

/**
 * Confidential transfer configuration
 */
export interface ConfidentialTransferConfig {
  mint: PublicKey;
  auditorPublicKey?: PublicKey;
  enableBalanceCredits: boolean;
  aproveNewAccounts: boolean;
  auditorConfigured: boolean;
}

// ============================
// ZK Compression Types
// ============================

/**
 * Compressed NFT configuration
 */
export interface CompressedNFTConfig {
  name: string;
  symbol: string;
  uri: string;
  creators?: NFTCreator[];
  sellerFeeBasisPoints: number;
  collection?: PublicKey;
  uses?: NFTUses;
  isMutable: boolean;
  primarySaleHappened: boolean;
}

/**
 * NFT creator information
 */
export interface NFTCreator {
  address: PublicKey;
  verified: boolean;
  share: number;
}

/**
 * NFT usage configuration
 */
export interface NFTUses {
  useMethod: NFTUseMethod;
  remaining: number;
  total: number;
}

/**
 * NFT use methods
 */
export enum NFTUseMethod {
  Burn = 'burn',
  Multiple = 'multiple',
  Single = 'single',
}

/**
 * Merkle tree configuration for compressed NFTs
 */
export interface MerkleTreeConfig {
  maxDepth: number;
  maxBufferSize: number;
  canopyDepth?: number;
  address?: PublicKey;
  authority?: PublicKey;
  creationSlot?: number;
}

/**
 * Proof data for compressed NFTs
 */
export interface CompressedProof {
  root: Buffer;
  proof: Buffer[];
  nodeIndex: number;
  leaf: Buffer;
  treeId: PublicKey;
}

// ============================
// CLI Configuration Types
// ============================

/**
 * CLI configuration
 */
export interface CLIConfig {
  network: NetworkType;
  walletPath?: string;
  commitment?: CommitmentLevel;
  skipPreflight?: boolean;
  maxRetries?: number;
  programId?: PublicKey;
}

/**
 * Network types
 */
export enum NetworkType {
  Mainnet = 'mainnet-beta',
  Devnet = 'devnet',
  Testnet = 'testnet',
  Localnet = 'localnet',
}

/**
 * Commitment levels
 */
export enum CommitmentLevel {
  Processed = 'processed',
  Confirmed = 'confirmed',
  Finalized = 'finalized',
}

/**
 * Development tools configuration
 */
export interface DevToolsConfig {
  enableLogging: boolean;
  logLevel: LogLevel;
  enableMetrics: boolean;
  metricsEndpoint?: string;
  enableProfiling: boolean;
}

/**
 * Log levels
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

// ============================
// API Response Types
// ============================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

/**
 * API error information
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  timestamp: number;
  requestId: string;
  version: string;
  computeUnits?: number;
}

// ============================
// Event Types
// ============================

/**
 * Base event interface
 */
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: BN;
  blockSlot: number;
  signature: string;
}

/**
 * Agent created event
 */
export interface AgentCreatedEvent extends BaseEvent {
  type: EventType.AgentCreated;
  data: {
    agent: PublicKey;
    owner: PublicKey;
    metadata: AgentMetadata;
  };
}

/**
 * Task created event
 */
export interface TaskCreatedEvent extends BaseEvent {
  type: EventType.TaskCreated;
  data: {
    task: PublicKey;
    creator: PublicKey;
    metadata: TaskMetadata;
    payment: PaymentTerms;
  };
}

/**
 * Message sent event
 */
export interface MessageSentEvent extends BaseEvent {
  type: EventType.MessageSent;
  data: {
    channel: PublicKey;
    sender: PublicKey;
    messageId: string;
  };
}

/**
 * Event types enumeration
 */
export enum EventType {
  AgentCreated = 'agent_created',
  AgentUpdated = 'agent_updated',
  TaskCreated = 'task_created',
  TaskAssigned = 'task_assigned',
  TaskCompleted = 'task_completed',
  MessageSent = 'message_sent',
  ChannelCreated = 'channel_created',
  PaymentProcessed = 'payment_processed',
}

// ============================
// Utility Types
// ============================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMetadata;
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Filter parameters for queries
 */
export interface FilterParams {
  search?: string;
  tags?: string[];
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: BN;
  maxAmount?: BN;
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================
// Type Guards
// ============================

/**
 * Type guard for Agent
 */
export function isAgent(obj: unknown): obj is Agent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'publicKey' in obj &&
    'owner' in obj &&
    'metadata' in obj
  );
}

/**
 * Type guard for TaskListing
 */
export function isTaskListing(obj: unknown): obj is TaskListing {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'creator' in obj &&
    'metadata' in obj &&
    'payment' in obj
  );
}

/**
 * Type guard for Message
 */
export function isMessage(obj: unknown): obj is Message {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'channelId' in obj &&
    'sender' in obj &&
    'content' in obj
  );
}

// ============================
// Re-export commonly used types
// ============================

export type { PublicKey, Keypair } from '@solana/web3.js';
export type { BN } from '@coral-xyz/anchor';
