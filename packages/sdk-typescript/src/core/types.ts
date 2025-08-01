/**
 * Comprehensive Type System for GhostSpeak SDK
 * 
 * All types are exported as individual named exports using ES2015 module syntax
 * for better tree-shaking and compatibility with ESLint rules.
 */

import type { Address } from '@solana/addresses'
import type { TransactionSigner as _TransactionSigner, Signature } from '@solana/kit'

// =====================================================
// CORE TYPES
// =====================================================

/**
 * Transaction result with success/failure handling
 */
export type Result<T> = 
  | {
      success: true
      data: T
      signature: Signature
      explorer: string
    }
  | {
      success: false
      error: SDKError
    }

/**
 * Generic transaction interface
 */
export interface Transaction<T> {
  execute(): Promise<Result<T>>
  simulate(): Promise<SimulationResult>
  getCost(): Promise<bigint>
  debug(): this
}

/**
 * Simulation result
 */
export interface SimulationResult {
  success: boolean
  logs: string[]
  unitsConsumed?: bigint
  error?: string
}

// =====================================================
// ENTITY TYPES
// =====================================================

/**
 * Agent entity
 */
export interface Agent {
  address: Address
  type: AgentType
  owner: Address
  metadata: AgentMetadata
  reputation: Reputation
  isActive: boolean
  isVerified: boolean
  createdAt: Date
}

/**
 * Agent types
 */
export enum AgentType {
  General = 0,
  Specialized = 1,
  Oracle = 2,
  Validator = 3
}

/**
 * Agent metadata
 */
export interface AgentMetadata {
  name: string
  description: string
  capabilities: string[]
  avatar?: string
  website?: string
  socialLinks?: Record<string, string>
}

/**
 * Reputation data
 */
export interface Reputation {
  score: number
  jobsCompleted: number
  successRate: number
  totalEarnings: bigint
  ratings: Rating[]
}

/**
 * Rating entry
 */
export interface Rating {
  from: Address
  score: number
  comment?: string
  timestamp: Date
}

// =====================================================
// ESCROW TYPES
// =====================================================

/**
 * Escrow entity
 */
export interface Escrow {
  address: Address
  buyer: Address
  seller: Address
  amount: bigint
  status: EscrowStatus
  description: string
  milestones?: Milestone[]
  createdAt: Date
  completedAt?: Date
}

/**
 * Escrow status
 */
export enum EscrowStatus {
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Disputed = 'disputed',
  Refunded = 'refunded'
}

/**
 * Milestone for escrow
 */
export interface Milestone {
  amount: bigint
  description: string
  completed: boolean
  completedAt?: Date
}

// =====================================================
// CHANNEL TYPES
// =====================================================

/**
 * Channel entity
 */
export interface Channel {
  address: Address
  name: string
  description: string
  type: ChannelType
  creator: Address
  members: Address[]
  isPrivate: boolean
  maxMembers: number
  messageCount: number
  createdAt: Date
}

/**
 * Channel types
 */
export enum ChannelType {
  Public = 'public',
  Private = 'private',
  Direct = 'direct',
  Group = 'group'
}

/**
 * Message entity
 */
export interface Message {
  address: Address
  channel: Address
  sender: Address
  content: string
  type: MessageType
  attachments?: Attachment[]
  reactions?: Reaction[]
  replyTo?: Address
  editedAt?: Date
  timestamp: Date
}

/**
 * Message types
 */
export enum MessageType {
  Text = 'text',
  Image = 'image',
  File = 'file',
  Code = 'code',
  System = 'system'
}

/**
 * Message attachment
 */
export interface Attachment {
  uri: string
  mimeType: string
  size: number
  name: string
}

/**
 * Message reaction
 */
export interface Reaction {
  emoji: string
  users: Address[]
}

// =====================================================
// TOKEN-2022 TYPES
// =====================================================

/**
 * Confidential balance
 */
export interface ConfidentialBalance {
  encrypted: Uint8Array
  decrypted?: bigint
}

/**
 * Transfer with proof
 */
export interface ConfidentialTransfer {
  from: Address
  to: Address
  encryptedAmount: Uint8Array
  proof: TransferProof
}

/**
 * Transfer proof data
 */
export interface TransferProof {
  rangeProof: Uint8Array
  validityProof: Uint8Array
  equalityProof: Uint8Array
}

// =====================================================
// ERROR TYPES
// =====================================================

/**
 * SDK error with context
 */
export interface SDKError {
  code: ErrorCode
  message: string
  context?: Record<string, unknown>
  solution?: string
  instruction?: string
}

/**
 * Error codes
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Transaction errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  
  // Account errors
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ACCOUNT = 'INVALID_ACCOUNT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  
  // Program errors
  PROGRAM_ERROR = 'PROGRAM_ERROR',
  INSTRUCTION_ERROR = 'INSTRUCTION_ERROR',
  
  // H2A errors removed - use A2A communication instead
  
  // Other
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// =====================================================
// BUILDER TYPES
// =====================================================

/**
 * Agent creation parameters
 */
export interface AgentCreationParams {
  name: string
  capabilities: string[]
  type?: AgentType
  metadata?: Partial<AgentMetadata>
  compressed?: boolean
}

/**
 * Escrow creation parameters
 */
export interface EscrowCreationParams {
  buyer: Address
  seller: Address
  amount: bigint
  description: string
  milestones?: Milestone[]
}

/**
 * Channel creation parameters
 */
export interface ChannelCreationParams {
  name: string
  description: string
  type?: ChannelType
  isPrivate?: boolean
  maxMembers?: number
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number
  offset?: number
  cursor?: string
}

/**
 * Filter options
 */
export interface FilterOptions<T> {
  where?: Partial<T>
  orderBy?: keyof T
  orderDirection?: 'asc' | 'desc'
}

/**
 * Query result with pagination
 */
export interface QueryResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

// =====================================================
// EVENT TYPES
// =====================================================

/**
 * Base event interface
 */
export interface Event<T = unknown> {
  type: string
  timestamp: Date
  data: T
}

/**
 * Agent events
 */
export type AgentEvent = 
  | Event<{ agent: Agent }> & { type: 'agent.created' }
  | Event<{ agent: Agent; changes: Partial<Agent> }> & { type: 'agent.updated' }
  | Event<{ agent: Agent }> & { type: 'agent.verified' }

/**
 * Escrow events
 */
export type EscrowEvent =
  | Event<{ escrow: Escrow }> & { type: 'escrow.created' }
  | Event<{ escrow: Escrow }> & { type: 'escrow.completed' }
  | Event<{ escrow: Escrow; reason: string }> & { type: 'escrow.disputed' }

/**
 * Channel events
 */
export type ChannelEvent =
  | Event<{ channel: Channel; message: Message }> & { type: 'channel.message' }
  | Event<{ channel: Channel; member: Address }> & { type: 'channel.member.joined' }
  | Event<{ channel: Channel; member: Address }> & { type: 'channel.member.left' }

// =====================================================
// H2A PROTOCOL TYPES (Human-to-Agent Communication)
// =====================================================

/**
 * Participant type enum for distinguishing between humans and agents
 */
export enum ParticipantType {
  Human = 'Human',
  Agent = 'Agent',
}

/**
 * Unified communication session supporting H2A, A2A, and future H2H
 */
export interface CommunicationSession {
  /** Session identifier */
  sessionId: bigint
  /** Address of session initiator */
  initiator: Address
  /** Type of initiator (human or agent) */
  initiatorType: ParticipantType
  /** Address of session responder */
  responder: Address
  /** Type of responder (human or agent) */
  responderType: ParticipantType
  /** Type of communication session */
  sessionType: string
  /** Additional session metadata */
  metadata: string
  /** Whether session is currently active */
  isActive: boolean
  /** Session creation timestamp */
  createdAt: bigint
  /** Session expiration timestamp */
  expiresAt: bigint
}

/**
 * Communication message in unified sessions
 */
export interface CommunicationMessage {
  /** Message identifier */
  messageId: bigint
  /** Session this message belongs to */
  session: Address
  /** Address of message sender */
  sender: Address
  /** Type of sender (human or agent) */
  senderType: ParticipantType
  /** Message content */
  content: string
  /** Type of message */
  messageType: string
  /** File attachments (IPFS hashes) */
  attachments: string[]
  /** Message timestamp */
  sentAt: bigint
}

/**
 * Participant status for service discovery
 */
export interface ParticipantStatus {
  /** Participant address */
  participant: Address
  /** Type of participant (human or agent) */
  participantType: ParticipantType
  /** Services offered by this participant */
  servicesOffered: string[]
  /** Current availability status */
  availability: boolean
  /** Reputation score (0-100) */
  reputationScore: number
  /** Last status update timestamp */
  lastUpdated: bigint
}

/**
 * Data for creating communication sessions
 */
export interface CreateCommunicationSessionParams {
  sessionId: bigint
  initiator: Address
  initiatorType: ParticipantType
  responder: Address
  responderType: ParticipantType
  sessionType: string
  metadata: string
  expiresAt: bigint
}

/**
 * Data for sending communication messages
 */
export interface SendCommunicationMessageParams {
  messageId: bigint
  senderType: ParticipantType
  content: string
  messageType: string
  attachments?: string[]
}

/**
 * Data for updating participant status
 */
export interface UpdateParticipantStatusParams {
  participant: Address
  participantType: ParticipantType
  servicesOffered: string[]
  availability: boolean
  reputationScore: number
}

// H2A Protocol types have been removed - use A2A (Agent-to-Agent) communication instead  
// Legacy H2A types are deprecated and will be removed in future versions

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Check if result is successful
 */
export function isSuccess<T>(result: Result<T>): result is Result<T> & { success: true } {
  return result.success === true
}

/**
 * Check if result is error
 */
export function isError<T>(result: Result<T>): result is Result<T> & { success: false } {
  return result.success === false
}

/**
 * Extract data from successful result
 */
export function unwrap<T>(result: Result<T>): T {
  if (isError(result)) {
    throw new Error(result.error.message)
  }
  return result.data
}

// =====================================================
// TYPE UTILITIES
// =====================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Extract addresses from entities
 */
export type AddressOf<T> = T extends { address: Address } ? T['address'] : never

/**
 * Entity with address
 */
export type WithAddress<T> = T & { address: Address }

