/**
 * Comprehensive TypeScript interfaces for GhostSpeak SDK responses
 * Used to eliminate unsafe member access and assignment warnings
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

// ===== AUCTION TYPES =====

export interface Auction {
  id: string
  address: Address
  title: string
  description: string
  creator: Address
  startingPrice: number
  currentPrice: number
  reservePrice?: number
  currentWinner?: Address
  totalBids: number
  auctionType: 'standard' | 'dutch' | 'sealed'
  status: 'active' | 'ended' | 'cancelled'
  startTime: Date
  endTime: Date
  auctionEndTime: Date
  metadata?: {
    image?: string
    category?: string
    tags?: string[]
  }
  bids?: Bid[]
}

export interface Bid {
  id: string
  auctionId: string
  bidder: Address
  amount: number
  timestamp: Date
  status: 'active' | 'outbid' | 'winning' | 'refunded'
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

// ===== ESCROW TYPES =====

export interface Escrow {
  id: string
  address: Address
  payer: Address
  payee: Address
  amount: number
  status: 'pending' | 'funded' | 'completed' | 'disputed' | 'refunded'
  workOrder?: Address
  milestones?: EscrowMilestone[]
  dispute?: EscrowDispute
  createdAt: Date
  updatedAt?: Date
}

export interface EscrowMilestone {
  id: string
  title: string
  description: string
  amount: number
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
  dueDate?: Date
  completedAt?: Date
}

export interface EscrowDispute {
  id: string
  initiator: Address
  reason: string
  status: 'open' | 'in_review' | 'resolved'
  arbitrator?: Address
  resolution?: string
  createdAt: Date
  resolvedAt?: Date
}

// ===== WORK ORDER TYPES =====

export interface WorkOrder {
  id: string
  address: Address
  title: string
  description: string
  client: Address
  agent?: Address
  budget: number
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  requirements: string[]
  deliverables: string[]
  deadline?: Date
  escrow?: Address
  createdAt: Date
  updatedAt?: Date
}

// ===== CHANNEL TYPES =====

export interface Channel {
  id: string
  address: Address
  name: string
  description?: string
  participants: Address[]
  isPrivate: boolean
  metadata?: {
    image?: string
    category?: string
  }
  stats?: {
    messageCount: number
    participantCount: number
    lastActivity: Date
  }
  createdAt: Date
}

export interface ChannelMessage {
  id: string
  channelId: string
  sender: Address
  content: string
  messageType: 'text' | 'file' | 'reaction' | 'system'
  replyTo?: string
  attachments?: string[]
  reactions?: Array<{
    emoji: string
    users: Address[]
    count: number
  }>
  timestamp: Date
  editedAt?: Date
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

// ===== MARKETPLACE TYPES =====

export interface MarketplaceListing {
  id: string
  address: Address
  seller: Address
  title: string
  description: string
  price: number
  category: string
  tags: string[]
  status: 'active' | 'sold' | 'cancelled' | 'expired'
  metadata?: {
    image?: string
    files?: string[]
  }
  stats?: {
    views: number
    favorites: number
    inquiries: number
  }
  createdAt: Date
  updatedAt?: Date
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
  signTransaction(transaction: any): Promise<any>
  sendTransaction(transaction: any): Promise<string>
}

export interface BlockchainService {
  getAccountInfo(address: Address): Promise<AccountInfo | null>
  getBalance(address: Address): Promise<number>
  getTransaction(signature: string): Promise<TransactionDetails | null>
  getTransactionHistory(address: Address, options?: any): Promise<TransactionSignature[]>
  sendTransaction(transaction: any): Promise<string>
}

export interface SDKService {
  agents: {
    list(): Promise<Agent[]>
    get(id: string): Promise<Agent | null>
    search(query: string): Promise<Agent[]>
    register(data: Partial<Agent>): Promise<Agent>
    update(id: string, data: Partial<Agent>): Promise<Agent>
  }
  auctions: {
    list(): Promise<Auction[]>
    get(id: string): Promise<Auction | null>
    create(data: Partial<Auction>): Promise<Auction>
    bid(auctionId: string, amount: number): Promise<Bid>
  }
  governance: {
    listMultisigs(options?: any): Promise<Multisig[]>
    listProposals(): Promise<Proposal[]>
    createProposal(signer: any, data: any): Promise<string>
    vote(signer: any, data: any): Promise<string>
    grantRole(data: any): Promise<string>
    revokeRole(data: any): Promise<string>
  }
  marketplace: {
    list(): Promise<MarketplaceListing[]>
    get(id: string): Promise<MarketplaceListing | null>
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

export interface AuctionCommandOptions extends BaseCommandOptions {
  title?: string
  description?: string
  startingPrice?: string
  reservePrice?: string
  duration?: string
  amount?: string
  active?: boolean
  myBids?: boolean
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
  details?: any
  transaction?: string
}

export interface ValidationError extends Error {
  field: string
  value: any
  constraint: string
}