// Core types for GhostSpeak Protocol
import type { Address } from '@solana/addresses'

// For now, use a simple placeholder interface for RPC
// This will be replaced when Codama generates the proper types
export interface RpcApi {
  getAccountInfo: (address: Address) => Promise<any>
  sendTransaction: (transaction: any) => Promise<string>
}

export type Commitment = 'processed' | 'confirmed' | 'finalized'

// Program ID
export const GHOSTSPEAK_PROGRAM_ID: Address = '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address

// Configuration types
export interface GhostSpeakConfig {
  programId?: Address
  rpc: RpcApi
  commitment?: Commitment
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