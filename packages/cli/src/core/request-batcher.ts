/**
 * Request Batching System for GhostSpeak CLI
 * 
 * Provides intelligent request batching for multi-operation commands
 * to optimize network usage and improve performance.
 * 
 * @example
 * ```typescript
 * const batcher = RequestBatcher.getInstance()
 * 
 * // Batch multiple account requests
 * const accounts = await batcher.batchAccountRequests([
 *   address1, address2, address3
 * ])
 * 
 * // Execute with automatic batching
 * const results = await batcher.executeBatch()
 * ```
 */

import { EventEmitter } from 'events'
import type { Address } from '@solana/addresses'
import { rpcPoolManager, type PooledRpcClient } from '../services/blockchain/rpc-pool-manager'
import { EventBus } from './event-system'
import type { NetworkType } from './connection-pool'

/**
 * Batch request types
 */
export type BatchRequestType = 
  | 'getAccountInfo'
  | 'getBalance'
  | 'getMultipleAccounts'
  | 'getProgramAccounts'
  | 'getSignaturesForAddress'
  | 'getTransaction'

/**
 * Base batch request interface
 */
export interface BatchRequest {
  id: string
  type: BatchRequestType
  priority: 'low' | 'medium' | 'high'
  timestamp: Date
  resolve: (result: any) => void
  reject: (error: Error) => void
}

/**
 * Account info batch request
 */
export interface AccountInfoRequest extends BatchRequest {
  type: 'getAccountInfo'
  address: Address
  options?: {
    commitment?: 'processed' | 'confirmed' | 'finalized'
    encoding?: 'base58' | 'base64' | 'jsonParsed'
  }
}

/**
 * Balance batch request
 */
export interface BalanceRequest extends BatchRequest {
  type: 'getBalance'
  address: Address
  commitment?: 'processed' | 'confirmed' | 'finalized'
}

/**
 * Multiple accounts batch request
 */
export interface MultipleAccountsRequest extends BatchRequest {
  type: 'getMultipleAccounts'
  addresses: Address[]
  options?: {
    commitment?: 'processed' | 'confirmed' | 'finalized'
    encoding?: 'base58' | 'base64' | 'jsonParsed'
  }
}

/**
 * Program accounts batch request
 */
export interface ProgramAccountsRequest extends BatchRequest {
  type: 'getProgramAccounts'
  programId: Address
  options?: {
    commitment?: 'processed' | 'confirmed' | 'finalized'
    encoding?: 'base58' | 'base64' | 'jsonParsed'
    filters?: any[]
    dataSlice?: { offset: number; length: number }
  }
}

/**
 * Transaction signatures batch request
 */
export interface SignaturesRequest extends BatchRequest {
  type: 'getSignaturesForAddress'
  address: Address
  options?: {
    limit?: number
    before?: string
    until?: string
    commitment?: 'processed' | 'confirmed' | 'finalized'
  }
}

/**
 * Transaction batch request
 */
export interface TransactionRequest extends BatchRequest {
  type: 'getTransaction'
  signature: string
  options?: {
    commitment?: 'processed' | 'confirmed' | 'finalized'
    encoding?: 'json' | 'jsonParsed' | 'base58' | 'base64'
    maxSupportedTransactionVersion?: number
  }
}

/**
 * Union type for all batch requests
 */
export type AnyBatchRequest = 
  | AccountInfoRequest
  | BalanceRequest
  | MultipleAccountsRequest
  | ProgramAccountsRequest
  | SignaturesRequest
  | TransactionRequest

/**
 * Batch configuration
 */
export interface BatchConfig {
  /** Maximum batch size */
  maxBatchSize: number
  /** Maximum wait time before executing batch (ms) */
  maxWaitTime: number
  /** Minimum requests before batching */
  minBatchSize: number
  /** Priority threshold for immediate execution */
  priorityThreshold: 'low' | 'medium' | 'high'
  /** Enable intelligent batching */
  intelligentBatching: boolean
}

/**
 * Batch execution result
 */
export interface BatchResult {
  /** Batch ID */
  batchId: string
  /** Number of requests in batch */
  requestCount: number
  /** Successful requests */
  successful: number
  /** Failed requests */
  failed: number
  /** Execution time in milliseconds */
  executionTime: number
  /** Network used */
  network: NetworkType
  /** Batch type optimization used */
  optimization: string
}

/**
 * Request batcher for optimizing RPC calls
 */
export class RequestBatcher extends EventEmitter {
  private static instance: RequestBatcher | null = null
  private pendingRequests = new Map<NetworkType, AnyBatchRequest[]>()
  private batchTimers = new Map<NetworkType, NodeJS.Timeout>()
  private batchIdCounter = 0
  private eventBus = EventBus.getInstance()
  private config: BatchConfig = {
    maxBatchSize: 100,
    maxWaitTime: 50, // 50ms
    minBatchSize: 2,
    priorityThreshold: 'medium',
    intelligentBatching: true
  }

  private constructor() {
    super()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RequestBatcher {
    if (!RequestBatcher.instance) {
      RequestBatcher.instance = new RequestBatcher()
    }
    return RequestBatcher.instance
  }

  /**
   * Configure batch settings
   */
  configure(config: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...config }
    this.eventBus.emit('request_batcher:configured', this.config)
  }

  /**
   * Add account info request to batch
   */
  async getAccountInfo(
    network: NetworkType,
    address: Address,
    options?: AccountInfoRequest['options']
  ): Promise<any> {
    return this.addRequest<AccountInfoRequest>({
      type: 'getAccountInfo',
      address,
      options,
      priority: 'medium'
    }, network)
  }

  /**
   * Add balance request to batch
   */
  async getBalance(
    network: NetworkType,
    address: Address,
    commitment?: 'processed' | 'confirmed' | 'finalized'
  ): Promise<number> {
    return this.addRequest<BalanceRequest>({
      type: 'getBalance',
      address,
      commitment,
      priority: 'medium'
    }, network)
  }

  /**
   * Add multiple accounts request to batch
   */
  async getMultipleAccounts(
    network: NetworkType,
    addresses: Address[],
    options?: MultipleAccountsRequest['options']
  ): Promise<any[]> {
    // If requesting many accounts, use high priority for immediate execution
    const priority = addresses.length > 10 ? 'high' : 'medium'
    
    return this.addRequest<MultipleAccountsRequest>({
      type: 'getMultipleAccounts',
      addresses,
      options,
      priority
    }, network)
  }

  /**
   * Add program accounts request to batch
   */
  async getProgramAccounts(
    network: NetworkType,
    programId: Address,
    options?: ProgramAccountsRequest['options']
  ): Promise<any[]> {
    return this.addRequest<ProgramAccountsRequest>({
      type: 'getProgramAccounts',
      programId,
      options,
      priority: 'low' // Program account queries are usually not time-critical
    }, network)
  }

  /**
   * Add signatures request to batch
   */
  async getSignaturesForAddress(
    network: NetworkType,
    address: Address,
    options?: SignaturesRequest['options']
  ): Promise<any[]> {
    return this.addRequest<SignaturesRequest>({
      type: 'getSignaturesForAddress',
      address,
      options,
      priority: 'low'
    }, network)
  }

  /**
   * Add transaction request to batch
   */
  async getTransaction(
    network: NetworkType,
    signature: string,
    options?: TransactionRequest['options']
  ): Promise<any> {
    return this.addRequest<TransactionRequest>({
      type: 'getTransaction',
      signature,
      options,
      priority: 'medium'
    }, network)
  }

  /**
   * Execute all pending batches immediately
   */
  async flush(network?: NetworkType): Promise<BatchResult[]> {
    const results: BatchResult[] = []
    
    if (network) {
      const result = await this.executeBatch(network)
      if (result) results.push(result)
    } else {
      // Flush all networks
      const networks = Array.from(this.pendingRequests.keys())
      for (const net of networks) {
        const result = await this.executeBatch(net)
        if (result) results.push(result)
      }
    }
    
    return results
  }

  /**
   * Get batch statistics
   */
  getStats(): {
    pendingRequests: Record<NetworkType, number>
    totalRequests: number
    averageBatchSize: number
  } {
    const pendingRequests: Record<string, number> = {}
    let totalRequests = 0
    
    for (const [network, requests] of this.pendingRequests) {
      pendingRequests[network] = requests.length
      totalRequests += requests.length
    }
    
    return {
      pendingRequests: pendingRequests as Record<NetworkType, number>,
      totalRequests,
      averageBatchSize: totalRequests > 0 ? totalRequests / this.pendingRequests.size : 0
    }
  }

  /**
   * Add request to batch queue
   */
  private async addRequest<T extends AnyBatchRequest>(
    request: Omit<T, 'id' | 'timestamp' | 'resolve' | 'reject'>,
    network: NetworkType
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const batchRequest: AnyBatchRequest = {
        ...request,
        id: this.generateRequestId(),
        timestamp: new Date(),
        resolve,
        reject
      } as AnyBatchRequest

      // Add to pending requests
      if (!this.pendingRequests.has(network)) {
        this.pendingRequests.set(network, [])
      }
      
      this.pendingRequests.get(network)!.push(batchRequest)
      
      // Check if immediate execution is needed
      if (this.shouldExecuteImmediately(network, batchRequest)) {
        this.executeBatch(network)
      } else {
        this.scheduleBatchExecution(network)
      }
    })
  }

  /**
   * Check if batch should be executed immediately
   */
  private shouldExecuteImmediately(network: NetworkType, request: AnyBatchRequest): boolean {
    const requests = this.pendingRequests.get(network) || []
    
    // Execute if high priority request
    if (request.priority === 'high') {
      return true
    }
    
    // Execute if batch is full
    if (requests.length >= this.config.maxBatchSize) {
      return true
    }
    
    // Execute if priority threshold is met
    const highPriorityCount = requests.filter(r => r.priority === 'high').length
    if (highPriorityCount > 0 && request.priority === this.config.priorityThreshold) {
      return true
    }
    
    return false
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatchExecution(network: NetworkType): void {
    // Clear existing timer
    const existingTimer = this.batchTimers.get(network)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    
    // Schedule new execution
    const timer = setTimeout(() => {
      this.executeBatch(network)
    }, this.config.maxWaitTime)
    
    this.batchTimers.set(network, timer)
  }

  /**
   * Execute batch for network
   */
  private async executeBatch(network: NetworkType): Promise<BatchResult | null> {
    const requests = this.pendingRequests.get(network) || []
    
    if (requests.length === 0) {
      return null
    }
    
    // Clear timer and requests
    const timer = this.batchTimers.get(network)
    if (timer) {
      clearTimeout(timer)
      this.batchTimers.delete(network)
    }
    
    this.pendingRequests.set(network, [])
    
    const batchId = this.generateBatchId()
    const startTime = Date.now()
    let successful = 0
    let failed = 0
    
    this.eventBus.emit('request_batcher:batch_started', {
      batchId,
      network,
      requestCount: requests.length
    })
    
    try {
      // Group requests by type for optimization
      const groupedRequests = this.groupRequestsByType(requests)
      
      // Execute batches in parallel
      const batchPromises = Object.entries(groupedRequests).map(([type, reqs]) => 
        this.executeBatchByType(network, type as BatchRequestType, reqs)
      )
      
      const results = await Promise.allSettled(batchPromises)
      
      // Process results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          successful += result.value.successful
          failed += result.value.failed
        } else {
          failed += 1
        }
      }
      
    } catch {
      // Handle batch execution error
      for (const request of requests) {
        request.reject(_error as Error)
      }
      failed = requests.length
    }
    
    const executionTime = Date.now() - startTime
    const batchResult: BatchResult = {
      batchId,
      requestCount: requests.length,
      successful,
      failed,
      executionTime,
      network,
      optimization: this.config.intelligentBatching ? 'intelligent' : 'standard'
    }
    
    this.eventBus.emit('request_batcher:batch_completed', batchResult)
    
    return batchResult
  }

  /**
   * Group requests by type for batching optimization
   */
  private groupRequestsByType(requests: AnyBatchRequest[]): Record<string, AnyBatchRequest[]> {
    const grouped: Record<string, AnyBatchRequest[]> = {}
    
    for (const request of requests) {
      if (!grouped[request.type]) {
        grouped[request.type] = []
      }
      grouped[request.type].push(request)
    }
    
    return grouped
  }

  /**
   * Execute batch by request type
   */
  private async executeBatchByType(
    network: NetworkType,
    type: BatchRequestType,
    requests: AnyBatchRequest[]
  ): Promise<{ successful: number; failed: number }> {
    const rpcClient = rpcPoolManager.getClient(network)
    let successful = 0
    let failed = 0
    
    try {
      switch (type) {
        case 'getAccountInfo':
          await this.executeAccountInfoBatch(rpcClient, requests as AccountInfoRequest[])
          successful = requests.length
          break
          
        case 'getBalance':
          await this.executeBalanceBatch(rpcClient, requests as BalanceRequest[])
          successful = requests.length
          break
          
        case 'getMultipleAccounts':
          await this.executeMultipleAccountsBatch(rpcClient, requests as MultipleAccountsRequest[])
          successful = requests.length
          break
          
        case 'getProgramAccounts':
          await this.executeProgramAccountsBatch(rpcClient, requests as ProgramAccountsRequest[])
          successful = requests.length
          break
          
        case 'getSignaturesForAddress':
          await this.executeSignaturesBatch(rpcClient, requests as SignaturesRequest[])
          successful = requests.length
          break
          
        case 'getTransaction':
          await this.executeTransactionBatch(rpcClient, requests as TransactionRequest[])
          successful = requests.length
          break
          
        default:
          throw new Error(`Unsupported batch type: ${type}`)
      }
      
    } catch {
      // Fail all requests in this batch
      for (const request of requests) {
        request.reject(_error as Error)
      }
      failed = requests.length
    }
    
    return { successful, failed }
  }

  /**
   * Execute account info batch with optimization
   */
  private async executeAccountInfoBatch(
    rpcClient: PooledRpcClient,
    requests: AccountInfoRequest[]
  ): Promise<void> {
    if (requests.length === 1) {
      // Single request - execute directly
      const request = requests[0]
      try {
        const result = await rpcClient.getAccountInfo(request.address, request.options)
        request.resolve(result)
      } catch (_error) {
        request.reject(_error as Error)
      }
    } else {
      // Multiple requests - use getMultipleAccounts for efficiency
      const addresses = requests.map(req => req.address)
      const commonOptions = requests[0].options // Assume same options for batch
      
      try {
        const results = await rpcClient.getMultipleAccounts(addresses, commonOptions)
        
        // Resolve individual requests
        for (let i = 0; i < requests.length; i++) {
          requests[i].resolve(results[i])
        }
      } catch {
        // Fail all requests
        for (const request of requests) {
          request.reject(_error as Error)
        }
      }
    }
  }

  /**
   * Execute balance batch
   */
  private async executeBalanceBatch(
    rpcClient: PooledRpcClient,
    requests: BalanceRequest[]
  ): Promise<void> {
    // Execute balance requests in parallel with limited concurrency
    const concurrencyLimit = 10
    
    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const batch = requests.slice(i, i + concurrencyLimit)
      
      const promises = batch.map(async (request) => {
        try {
          const result = await rpcClient.getBalance(request.address, request.commitment)
          request.resolve(result)
        } catch (_error) {
          request.reject(_error as Error)
        }
      })
      
      await Promise.all(promises)
    }
  }

  /**
   * Execute multiple accounts batch
   */
  private async executeMultipleAccountsBatch(
    rpcClient: PooledRpcClient,
    requests: MultipleAccountsRequest[]
  ): Promise<void> {
    // Execute each request individually (already optimized)
    const promises = requests.map(async (request) => {
      try {
        const result = await rpcClient.getMultipleAccounts(request.addresses, request.options)
        request.resolve(result)
      } catch (_error) {
        request.reject(_error as Error)
      }
    })
    
    await Promise.all(promises)
  }

  /**
   * Execute program accounts batch
   */
  private async executeProgramAccountsBatch(
    rpcClient: PooledRpcClient,
    requests: ProgramAccountsRequest[]
  ): Promise<void> {
    // Execute in sequence to avoid overwhelming the RPC
    for (const request of requests) {
      try {
        const result = await rpcClient.getProgramAccounts(request.programId, request.options)
        request.resolve(result)
      } catch (_error) {
        request.reject(_error as Error)
      }
    }
  }

  /**
   * Execute signatures batch
   */
  private async executeSignaturesBatch(
    rpcClient: PooledRpcClient,
    requests: SignaturesRequest[]
  ): Promise<void> {
    // Execute in parallel with limited concurrency
    const concurrencyLimit = 5
    
    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const batch = requests.slice(i, i + concurrencyLimit)
      
      const promises = batch.map(async (request) => {
        try {
          const result = await rpcClient.getTransactionHistory(request.address, request.options)
          request.resolve(result)
        } catch (_error) {
          request.reject(_error as Error)
        }
      })
      
      await Promise.all(promises)
    }
  }

  /**
   * Execute transaction batch
   */
  private async executeTransactionBatch(
    rpcClient: PooledRpcClient,
    requests: TransactionRequest[]
  ): Promise<void> {
    // Execute in parallel with limited concurrency
    const concurrencyLimit = 10
    
    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const batch = requests.slice(i, i + concurrencyLimit)
      
      const promises = batch.map(async (request) => {
        try {
          const result = await rpcClient.getTransaction(request.signature, request.options)
          request.resolve(result)
        } catch (_error) {
          request.reject(_error as Error)
        }
      })
      
      await Promise.all(promises)
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${++this.batchIdCounter}`
  }
}

// Export singleton instance
export const requestBatcher = RequestBatcher.getInstance()