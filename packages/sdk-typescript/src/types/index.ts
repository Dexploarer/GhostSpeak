// Core types for GhostSpeak Protocol
import type { Address } from '@solana/addresses'
import type { Agent, ServiceListing } from '../generated/index.js'
import type { IPFSConfig } from './ipfs-types.js'
import type { 
  Rpc,
  RpcSubscriptions,
  GetLatestBlockhashApi,
  SendTransactionApi,
  GetAccountInfoApi,
  SimulateTransactionApi,
  GetFeeForMessageApi,
  GetProgramAccountsApi,
  GetEpochInfoApi,
  GetSignatureStatusesApi,
  SignatureNotificationsApi,
  SlotNotificationsApi,
  GetMultipleAccountsApi
} from '@solana/kit'

// Import generated types and re-export for convenience
export * from '../generated/index.js'

// Export IPFS types
export * from './ipfs-types.js'

// Export RPC client types
export * from './rpc-client-types.js'

// Export Token-2022 types (excluding conflicting types)
export {
  // Mint extensions
  type TransferFeeConfig,
  type TransferFee,
  type InterestBearingConfig,
  type MintCloseAuthority,
  type PermanentDelegate,
  type DefaultAccountState,
  AccountState,
  type TransferHook,
  type MetadataPointer,
  type GroupPointer,
  type GroupMemberPointer,
  type ConfidentialTransferMint,
  type TransferFeeAmount,
  // Account extensions
  type ImmutableOwner,
  type NonTransferable,
  type MemoTransfer,
  type CpiGuard,
  type ConfidentialTransferAccount,
  type TransferHookAccount,
  // Token metadata
  type TokenMetadata,
  type AdditionalMetadata,
  // Group extensions
  type TokenGroup,
  type TokenGroupMember,
  // Composite types
  type MintExtensions,
  type AccountExtensions,
  type MintWithExtensions,
  type TokenAccountWithExtensions,
  // RPC types
  type ParsedMintAccount,
  type ParsedTokenAccount,
  // Utility types
  type ExtensionTLV,
  type ParsedExtensions
} from './token-2022-types.js'

// Export reputation types
export * from './reputation-types.js'

// Modern RPC API types using 2025 Web3.js v2 patterns
export type RpcApi = Rpc<
  GetLatestBlockhashApi &
  SendTransactionApi &
  GetAccountInfoApi &
  SimulateTransactionApi &
  GetFeeForMessageApi &
  GetProgramAccountsApi
>

// Add missing API types for full RPC support
export type ExtendedRpcApi = RpcApi & Rpc<GetEpochInfoApi & GetSignatureStatusesApi & GetMultipleAccountsApi>

// RPC Subscription types
export type RpcSubscriptionApi = RpcSubscriptions<SignatureNotificationsApi & SlotNotificationsApi>

export type Commitment = 'processed' | 'confirmed' | 'finalized'

// Program ID - import from generated
export { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS as GHOSTSPEAK_PROGRAM_ID } from '../generated/programs/index.js'

// Configuration types
export interface GhostSpeakConfig {
  programId?: Address
  rpc: ExtendedRpcApi
  rpcSubscriptions?: RpcSubscriptionApi
  commitment?: Commitment
  transactionTimeout?: number
  defaultFeePayer?: Address
  retryConfig?: RetryConfig
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'
  rpcEndpoint?: string
  /** Token 2022 configuration options */
  token2022?: Token2022Config
  /** IPFS configuration for large content storage */
  ipfsConfig?: IPFSConfig
}

export interface Token2022Config {
  /** Enable Token 2022 features by default */
  enabled?: boolean
  /** Default behavior for transfer fees */
  defaultExpectTransferFees?: boolean
  /** Maximum transfer fee slippage (basis points) */
  maxFeeSlippageBasisPoints?: number
  /** Enable confidential transfers by default */
  enableConfidentialTransfers?: boolean
  /** Default Token 2022 program address (for custom deployments) */
  programAddress?: Address
  /** Cache token program detection results for this many seconds */
  tokenProgramCacheTtl?: number
}

export interface RetryConfig {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
}

// Agent types
export interface AgentWithAddress {
  address: Address
  data: Agent
}

// Service listing types
export interface ServiceListingWithAddress {
  address: Address
  data: ServiceListing
}

export interface AgentRegistrationData {
  name: string
  description: string
  capabilities: string[]
  metadataUri: string
  serviceEndpoint: string
}

export interface AgentAccount {
  owner: Address
  name: string
  description: string
  capabilities: string[]
  metadataUri: string
  serviceEndpoint: string
  isActive: boolean
  registeredAt: bigint
  reputation: number
  totalEarnings: bigint
  totalJobs: number
  successRate: number
  bump: number
}

// Marketplace types
export interface ServiceListingData {
  id: string
  agent: Address
  title: string
  description: string
  price: bigint
  currency: Address
  category: string
  isActive: boolean
  createdAt: bigint
}

export interface JobPosting {
  id: string
  poster: Address
  title: string
  description: string
  budget: bigint
  currency: Address
  deadline: bigint
  requirements: string[]
  isActive: boolean
  createdAt: bigint
}

// Escrow types
export interface EscrowAccount {
  buyer: Address
  seller: Address
  agent: Address
  amount: bigint
  currency: Address
  status: EscrowStatus
  createdAt: bigint
  completedAt?: bigint
}

export enum EscrowStatus {
  Active = 'Active',
  Completed = 'Completed',
  Disputed = 'Disputed',
  Cancelled = 'Cancelled'
}

// A2A Protocol types
export interface A2ASession {
  sessionId: bigint
  initiator: Address
  responder: Address
  sessionType: string
  metadata: string
  isActive: boolean
  createdAt: bigint
  expiresAt: bigint
}

export interface A2AMessage {
  messageId: bigint
  session: Address
  sender: Address
  content: string
  messageType: string
  sentAt: bigint
}

// Pricing models
export enum PricingModel {
  Fixed = 'Fixed',
  Hourly = 'Hourly',
  PerTask = 'PerTask',
  Subscription = 'Subscription',
  Auction = 'Auction'
}

// Error types
export class GhostSpeakError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'GhostSpeakError'
  }
}

// Instruction parameters types
export interface RegisterAgentParams {
  agentData: AgentRegistrationData
}

export interface CreateServiceListingParams {
  title: string
  description: string
  price: bigint
  currency: Address
  category: string
}

export interface CreateJobPostingParams {
  title: string
  description: string
  budget: bigint
  currency: Address
  deadline: bigint
  requirements: string[]
}

export interface CreateEscrowParams {
  seller: Address
  agent: Address
  amount: bigint
  currency: Address
}

export interface CreateA2ASessionParams {
  responder: Address
  sessionType: string
  metadata: string
  expiresAt: bigint
}

export interface SendA2AMessageParams {
  session: Address
  content: string
  messageType: string
}

// RPC Response Types (to replace 'any' usage)
export interface RpcResponse<T> {
  value: T | null
}

export interface RpcAccountInfo {
  executable: boolean
  lamports: bigint
  owner: Address
  rentEpoch: bigint
  space: bigint
  data: string | Uint8Array
}

export interface RpcProgramAccount {
  pubkey: Address
  account: RpcAccountInfo
}

export interface RpcProgramAccountsResponse {
  value: RpcProgramAccount[] | null
}

export interface RpcAccountInfoResponse {
  value: RpcAccountInfo | null
}

export interface RpcMultipleAccountsResponse {
  value: (RpcAccountInfo | null)[]
}

// Transaction Builder Response Types
export interface TransactionResponse {
  signature: string
  confirmationStatus?: Commitment
  err?: unknown | null
}

export interface SimulatedTransactionResponse {
  value: {
    err?: unknown | null
    logs?: string[]
    unitsConsumed?: number
  }
}

// Modern RPC Client Interface (replacement for 'any' rpc parameter)
export interface SolanaRpcClient {
  getAccountInfo(
    address: Address, 
    options?: { commitment?: Commitment; encoding?: string }
  ): Promise<RpcAccountInfoResponse>
  
  getMultipleAccounts(
    addresses: Address[], 
    options?: { commitment?: Commitment; encoding?: string }
  ): Promise<RpcMultipleAccountsResponse>
  
  getProgramAccounts(
    programId: Address,
    options?: {
      commitment?: Commitment
      encoding?: string
      filters?: unknown[]
    }
  ): Promise<RpcProgramAccountsResponse>
  
  sendTransaction(
    transaction: unknown,
    options?: { commitment?: Commitment }
  ): Promise<TransactionResponse>
  
  simulateTransaction(
    transaction: unknown,
    options?: { commitment?: Commitment }
  ): Promise<SimulatedTransactionResponse>
}

// Emergency Configuration Interface for Governance
export interface EmergencyConfig {
  emergencyDelay?: bigint
  emergencyThreshold?: number
  emergencySigners?: Address[]
  canEmergencyPause?: boolean
  emergencyContact?: string
}

// IPFS Message Content Types
export interface IPFSReference {
  type: 'ipfs_reference'
  ipfsUri: string
  ipfsHash: string
  originalSize: number
  contentPreview: string
  uploadedAt: number
}

// Type guard for IPFS reference
export function isIPFSReference(data: unknown): data is IPFSReference {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    obj.type === 'ipfs_reference' &&
    typeof obj.ipfsUri === 'string' &&
    typeof obj.ipfsHash === 'string' &&
    typeof obj.originalSize === 'number' &&
    typeof obj.contentPreview === 'string' &&
    typeof obj.uploadedAt === 'number'
  )
}

// Message metadata type
export interface MessageMetadata {
  ipfsHash: string
  originalSize: number
  contentPreview: string
  uploadedAt: number
}

// Resolved message content type
export interface ResolvedMessageContent {
  resolvedContent: string
  isIPFS: boolean
  metadata?: MessageMetadata
}

// IPFS Upload Response
export interface IPFSUploadResponse {
  IpfsHash: string
  PinSize?: number
  Timestamp?: string
}

// Type guard for IPFS upload response
export function isIPFSUploadResponse(data: unknown): data is IPFSUploadResponse {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return typeof obj.IpfsHash === 'string'
}

// Attachment upload result type
export interface AttachmentUploadResult {
  filename: string
  contentType: string
  ipfsHash: string
  ipfsUri: string
  size: number
}