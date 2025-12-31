/**
 * Service interface definitions for dependency injection and testing
 */

import type { Address } from '@solana/addresses'
import type { KeyPairSigner } from '@solana/kit'
import type { LoggerService as Logger } from '../core/logger'

// Standardized Error Types
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestion?: string,
    public canRetry = false
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
    super(message, 'NETWORK_ERROR', suggestion ?? 'Check your network connection and try again', true)
    this.name = 'NetworkError'
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = 'Unauthorized access') {
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
  configurePayAI(agentId: string, params: PayAIConfigParams): Promise<Agent>
}

export interface PayAIConfigParams {
  enabled: boolean
  pricePerCall: number
  apiKey: string
  webhookUrl?: string
}


export interface IWalletService {
  createWalletInterface(name: string, network: string): Promise<{ wallet: WalletInfo; mnemonic: string }>
  importWalletInterface(name: string, mnemonic: string, network: string): Promise<WalletInfo>
  listWalletsInterface(): Promise<WalletInfo[]>
  getActiveWalletInterface(): WalletInfo | null
  setActiveWalletInterface(name: string): Promise<void>
  getBalanceInterface(address: Address): Promise<bigint>
  getActiveSigner(): Promise<KeyPairSigner | null>
  signTransaction(signer: KeyPairSigner, transaction: unknown): Promise<string>
}

export interface IBlockchainService {
  getClient(network: string): Promise<unknown>
  sendTransaction(serializedTransaction: string): Promise<string>
  confirmTransaction(signature: string): Promise<boolean>
  getAccountInfo(address: Address): Promise<{
    address: string;
    balance: bigint;
    owner: string;
    executable: boolean;
    rentEpoch: bigint;
    data?: Uint8Array;
  } | null>
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
  merkleTree?: string
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
  logger: Logger
  blockchainService: IBlockchainService
  walletService: IWalletService
  storageService: IStorageService
}


export interface IStorageService {
  save<T>(key: string, data: T): Promise<void>
  load<T>(key: string): Promise<T | null>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}