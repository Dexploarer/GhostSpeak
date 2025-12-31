/**
 * SDK Type Definitions for GhostSpeak - Regenerated for Current Architecture
 * Comprehensive TypeScript interfaces for GhostSpeak SDK responses
 * Only includes types for modules that actually exist in the codebase
 */

import type { Address } from '@solana/addresses'

// ===== AGENT TYPES =====

export interface Agent {
  id: string
  address: Address
  name: string
  description: string
  capabilities: string[]
  owner: Address
  isActive: boolean
  reputationScore: number
  metadata?: {
    image?: string
    website?: string
    contact?: string
    version?: string
  }
  stats?: {
    totalJobs: number
    completedJobs: number
    successRate: number
    averageRating: number
    totalEarnings: number
  }
  createdAt?: Date
  updatedAt?: Date
}

export interface AgentCredentials {
  agentId: string
  name: string
  address: Address
  keypair?: Uint8Array
  merkleTree?: Address
  isCompressed: boolean
  metadata: {
    name: string
    description: string
    capabilities: string[]
    image?: string
  }
}

export interface AgentAnalytics {
  agentId: string
  period: {
    start: Date
    end: Date
  }
  metrics: {
    totalJobs: number
    completedJobs: number
    failedJobs: number
    successRate: number
    averageRating: number
    totalEarnings: number
    responseTime: number
  }
  topClients: Array<{
    address: Address
    jobCount: number
    totalPaid: number
  }>
  popularCapabilities: Array<{
    capability: string
    requestCount: number
    successRate: number
  }>
  earnings: {
    daily: Array<{ date: string; amount: number }>
    weekly: Array<{ week: string; amount: number }>
    monthly: Array<{ month: string; amount: number }>
  }
}

// ===== GOVERNANCE TYPES =====

export interface Multisig {
  address: Address
  name: string
  creator: Address
  members: Address[]
  threshold: number
  pendingProposals?: number
  totalProposals?: number
  createdAt?: Date
}

export interface Proposal {
  address: Address
  title: string
  description: string
  type: string
  creator: Address
  multisig: Address
  status: 'active' | 'passed' | 'failed' | 'executed'
  votesFor?: number
  votesAgainst?: number
  votesAbstain?: number
  threshold: number
  deadline?: bigint
  createdAt?: Date
  executedAt?: Date
}

// ===== AUCTION TYPES =====

export interface Auction {
  id: string
  address: Address
  item: string
  description: string
  seller: Address
  startingPrice: number
  currentBid?: number
  highestBidder?: Address
  type: 'english' | 'dutch' | 'sealed'
  status: 'active' | 'ended' | 'cancelled'
  endTime: Date
  createdAt: Date
}

export interface Bid {
  bidder: Address
  amount: number
  timestamp: Date
}

// ===== DISPUTE TYPES =====

export interface Dispute {
  id: string
  address: Address
  claimant: Address
  respondent: Address
  reason: string
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'in_review' | 'resolved' | 'escalated'
  arbitrator?: Address
  resolution?: string
  createdAt: Date
  resolvedAt?: Date
}

export interface Evidence {
  id: string
  dispute: Address
  submitter: Address
  type: string
  data: string
  description?: string
  timestamp: Date
}

// ===== A2A (AGENT-TO-AGENT) TYPES =====

export interface A2AConnection {
  id: string
  address: Address
  initiator: Address
  target: Address
  connectionType: string
  status: 'pending' | 'accepted' | 'rejected'
  metadata?: Record<string, unknown>
  createdAt: Date
}

// ===== REPUTATION TYPES =====

export interface ReputationData {
  address: Address
  score: number
  level: number
  badges: string[]
  metrics: {
    totalJobs: number
    completedJobs: number
    failedJobs: number
    successRate: number
    averageRating: number
    responseTime: number
    disputeCount: number
  }
  staking?: {
    staked: number
    locked: number
    penalties: number
  }
  history: Array<{
    action: string
    impact: number
    timestamp: Date
    reason?: string
  }>
}

// ===== TOKEN TYPES =====

export interface TokenAccount {
  address: Address
  mint: Address
  owner: Address
  amount: bigint
  decimals: number
  isNative: boolean
  programId: Address
}

export interface TokenMint {
  address: Address
  supply: bigint
  decimals: number
  mintAuthority?: Address
  freezeAuthority?: Address
  isInitialized: boolean
  programId: Address
}

// ===== BLOCKCHAIN SERVICE TYPES =====

export interface AccountInfo {
  address: Address
  balance: number
  owner: Address
  data?: Uint8Array
  executable: boolean
  rentEpoch: number
}

export interface TransactionSignature {
  signature: string
  slot: number
  blockTime?: number
  confirmationStatus: 'processed' | 'confirmed' | 'finalized'
  err?: string
}

export interface TransactionDetails {
  signature: string
  slot: number
  blockTime?: number
  fee: number
  status: 'success' | 'failed'
  logs?: string[]
  meta?: {
    fee: number
    preBalances: number[]
    postBalances: number[]
    err?: string
  }
}

// ===== SERVICE INTERFACES =====

export interface WalletService {
  getActiveSigner(): Promise<import('@solana/kit').KeyPairSigner | null>
  getBalance(address: Address): Promise<number>
  signTransaction(transaction: unknown): Promise<unknown>
  sendTransaction(transaction: unknown): Promise<string>
}

export interface BlockchainService {
  getAccountInfo(address: Address): Promise<AccountInfo | null>
  getBalance(address: Address): Promise<number>
  getTransaction(signature: string): Promise<TransactionDetails | null>
  getTransactionHistory(address: Address, options?: Record<string, unknown>): Promise<TransactionSignature[]>
  sendTransaction(transaction: unknown): Promise<string>
}

export interface SDKService {
  agents: {
    list(): Promise<Agent[]>
    get(id: string): Promise<Agent | null>
    search(query: string): Promise<Agent[]>
    register(data: Partial<Agent>): Promise<Agent>
    update(id: string, data: Partial<Agent>): Promise<Agent>
  }
  governance: {
    listMultisigs(options?: Record<string, unknown>): Promise<Multisig[]>
    listProposals(): Promise<Proposal[]>
    createProposal(signer: unknown, data: unknown): Promise<string>
    vote(signer: unknown, data: unknown): Promise<string>
    grantRole(data: unknown): Promise<string>
    revokeRole(data: unknown): Promise<string>
  }
  auctions: {
    list(): Promise<Auction[]>
    get(id: string): Promise<Auction | null>
    create(data: Partial<Auction>): Promise<Auction>
    bid(auctionId: string, amount: number): Promise<Bid>
  }
  disputes: {
    list(): Promise<Dispute[]>
    get(id: string): Promise<Dispute | null>
    file(data: Partial<Dispute>): Promise<Dispute>
    submitEvidence(disputeId: string, evidence: Partial<Evidence>): Promise<Evidence>
  }
  a2a: {
    connect(targetAgent: Address, type: string): Promise<A2AConnection>
    listConnections(): Promise<A2AConnection[]>
    acceptConnection(connectionId: string): Promise<A2AConnection>
  }
}

// ===== COMMAND OPTION TYPES =====

export interface BaseCommandOptions {
  network?: string
  verbose?: boolean
  output?: 'json' | 'table' | 'yaml'
}

export interface AgentCommandOptions extends BaseCommandOptions {
  name?: string
  description?: string
  capabilities?: string
  image?: string
  mine?: boolean
  query?: string
}

export interface GovernanceCommandOptions extends BaseCommandOptions {
  name?: string
  members?: string
  threshold?: string
  title?: string
  description?: string
  type?: string
  proposal?: string
  choice?: 'yes' | 'no' | 'abstain'
  user?: string
  role?: string
  action?: 'grant' | 'revoke'
}

export interface AuctionCommandOptions extends BaseCommandOptions {
  item?: string
  startingPrice?: string
  type?: 'english' | 'dutch' | 'sealed'
  duration?: string
}

export interface DisputeCommandOptions extends BaseCommandOptions {
  reason?: string
  severity?: 'low' | 'medium' | 'high'
  evidenceType?: string
}

export interface DeployCommandOptions extends BaseCommandOptions {
  programPath: string
  keypair?: string
  upgrade?: boolean
  programId?: string
  skipVerification?: boolean
}

// ===== ERROR TYPES =====

export interface SDKError extends Error {
  code?: string
  details?: Record<string, unknown>
  transaction?: string
}

export interface ValidationError extends Error {
  field: string
  value: unknown
  constraint: string
}
