/**
 * Service interface definitions for dependency injection and testing
 */

import type { Address } from '@solana/addresses'
import type { KeyPairSigner } from '@solana/kit'

// Standardized Error Types
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestion?: string,
    public canRetry: boolean = false
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, suggestion?: string) {
    super(message, 'VALIDATION_ERROR', suggestion, false)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', `Check that the ${resource.toLowerCase()} ID is correct`, false)
    this.name = 'NotFoundError'
  }
}

export class NetworkError extends ServiceError {
  constructor(message: string, suggestion?: string) {
    super(message, 'NETWORK_ERROR', suggestion || 'Check your network connection and try again', true)
    this.name = 'NetworkError'
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 'Make sure you have permission to perform this action', false)
    this.name = 'UnauthorizedError'
  }
}

// Core business types
export interface Agent {
  id: string
  address: Address
  name: string
  description: string
  capabilities: string[]
  owner: Address
  isActive: boolean
  reputationScore: number
  createdAt: bigint
  updatedAt: bigint
  metadata?: Record<string, unknown>
}

export interface ServiceListing {
  id: string
  agentId: string
  title: string
  description: string
  category: string
  priceInSol: number
  isActive: boolean
  createdAt: bigint
  metadata?: Record<string, unknown>
}

export interface Purchase {
  id: string
  listingId: string
  buyerAddress: Address
  sellerAddress: Address
  amount: bigint
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: bigint
}

export interface WalletInfo {
  address: Address
  name: string
  network: string
  balance?: bigint
  metadata: Record<string, unknown>
}

// Service interfaces
export interface IAgentService {
  register(params: RegisterAgentParams): Promise<Agent>
  list(params: ListAgentsParams): Promise<Agent[]>
  getById(agentId: string): Promise<Agent | null>
  update(agentId: string, updates: UpdateAgentParams): Promise<Agent>
  deactivate(agentId: string): Promise<void>
  getAnalytics(agentId: string): Promise<AgentAnalytics>
}

export interface IMarketplaceService {
  createListing(params: CreateListingParams): Promise<ServiceListing>
  getListings(params: GetListingsParams): Promise<ServiceListing[]>
  searchListings(criteria: SearchCriteria): Promise<ServiceListing[]>
  purchaseService(params: PurchaseParams): Promise<Purchase>
  updateListing(listingId: string, updates: UpdateListingParams): Promise<ServiceListing>
  deleteListing(listingId: string): Promise<void>
}

export interface IWalletService {
  createWalletInterface(name: string, network: string): Promise<{ wallet: WalletInfo; mnemonic: string }>
  importWalletInterface(name: string, mnemonic: string, network: string): Promise<WalletInfo>
  listWalletsInterface(): Promise<WalletInfo[]>
  getActiveWalletInterface(): WalletInfo | null
  setActiveWalletInterface(name: string): Promise<void>
  getBalanceInterface(address: Address): Promise<bigint>
  signTransaction(signer: KeyPairSigner, transaction: unknown): Promise<string>
}

export interface IBlockchainService {
  getClient(network: string): Promise<unknown>
  sendTransaction(signature: string): Promise<string>
  confirmTransaction(signature: string): Promise<boolean>
  getAccountInfo(address: Address): Promise<unknown>
  requestAirdrop(address: Address, amount: number): Promise<string>
}

// Parameter types
export interface RegisterAgentParams {
  name: string
  description: string
  capabilities: string[]
  category?: string
  pricing?: {
    hourlyRate?: number
    fixedRate?: number
  }
  metadata?: Record<string, unknown>
}

export interface ListAgentsParams {
  owner?: Address
  category?: string
  isActive?: boolean
  limit?: number
  offset?: number
}

export interface UpdateAgentParams {
  name?: string
  description?: string
  capabilities?: string[]
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export interface CreateListingParams {
  agentId: string
  title: string
  description: string
  category: string
  priceInSol: number
  metadata?: Record<string, unknown>
}

export interface GetListingsParams {
  category?: string
  agentId?: string
  isActive?: boolean
  minPrice?: number
  maxPrice?: number
  limit?: number
  offset?: number
}

export interface SearchCriteria {
  query: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'rating' | 'created'
  sortOrder?: 'asc' | 'desc'
}

export interface PurchaseParams {
  listingId: string
  buyerAddress: Address
  amount: bigint
  escrowDuration?: number
}

export interface UpdateListingParams {
  title?: string
  description?: string
  priceInSol?: number
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export interface AgentAnalytics {
  totalJobs: number
  completedJobs: number
  averageRating: number
  totalEarnings: bigint
  responseTime: number
  successRate: number
  categories: string[]
}

// Service dependencies
export interface AgentServiceDependencies {
  blockchainService: IBlockchainService
  walletService: IWalletService
  storageService: IStorageService
}

export interface MarketplaceServiceDependencies {
  blockchainService: IBlockchainService
  walletService: IWalletService
  agentService: IAgentService
}

export interface IStorageService {
  save<T>(key: string, data: T): Promise<void>
  load<T>(key: string): Promise<T | null>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}