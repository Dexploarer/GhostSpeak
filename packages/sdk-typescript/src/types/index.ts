// Core types for GhostSpeak Protocol
import type { Address } from '@solana/addresses'
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
  SlotNotificationsApi
} from '@solana/kit'

// Import generated types and re-export for convenience
export * from '../generated/index.js'

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
export type ExtendedRpcApi = RpcApi & Rpc<GetEpochInfoApi & GetSignatureStatusesApi>

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
}

export interface RetryConfig {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
}

// Agent types
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
export interface ServiceListing {
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