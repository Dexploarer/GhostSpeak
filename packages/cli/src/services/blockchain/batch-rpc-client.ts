/**
 * Batched RPC Client for GhostSpeak Blockchain Services
 * 
 * Provides a high-level interface for batched RPC operations
 * with automatic optimization and request combining.
 */

import type { Address } from '@solana/addresses'
import { requestBatcher, type RequestBatcher } from '../../core/request-batcher'
import { rpcPoolManager } from './rpc-pool-manager'
import { EventBus } from '../../core/event-system'
import type { NetworkType } from '../../core/connection-pool'

/**
 * Batch operation configuration
 */
export interface BatchConfig {
  /** Enable automatic batching */
  autoBatch: boolean
  /** Maximum batch size */
  maxBatchSize: number
  /** Batch timeout in milliseconds */
  batchTimeout: number
  /** Minimum requests before batching */
  minBatchSize: number
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T = any> {
  /** Operation success status */
  success: boolean
  /** Result data */
  data?: T
  /** Error if operation failed */
  error?: Error
  /** Request ID for tracking */
  requestId: string
  /** Execution time in milliseconds */
  executionTime: number
}

/**
 * Batched RPC client with intelligent request optimization
 */
export class BatchedRpcClient {
  private network: NetworkType
  private batcher: RequestBatcher
  private eventBus = EventBus.getInstance()
  private config: BatchConfig = {
    autoBatch: true,
    maxBatchSize: 100,
    batchTimeout: 50,
    minBatchSize: 2
  }

  constructor(network: NetworkType, config?: Partial<BatchConfig>) {
    this.network = network
    this.batcher = requestBatcher
    
    if (config) {
      this.config = { ...this.config, ...config }
    }
    
    // Configure batcher with our settings
    this.batcher.configure({
      maxBatchSize: this.config.maxBatchSize,
      maxWaitTime: this.config.batchTimeout,
      minBatchSize: this.config.minBatchSize,
      intelligentBatching: true
    })
  }

  /**
   * Get account information with batching
   */
  async getAccountInfo(
    address: Address,
    options?: {
      commitment?: 'processed' | 'confirmed' | 'finalized'
      encoding?: 'base58' | 'base64' | 'jsonParsed'
    }
  ): Promise<any> {
    if (this.config.autoBatch) {
      return this.batcher.getAccountInfo(this.network, address, options)
    } else {
      const rpcClient = rpcPoolManager.getClient(this.network)
      return rpcClient.getAccountInfo(address, options)
    }
  }

  /**
   * Get account balance with batching
   */
  async getBalance(
    address: Address,
    commitment?: 'processed' | 'confirmed' | 'finalized'
  ): Promise<number> {
    if (this.config.autoBatch) {
      return this.batcher.getBalance(this.network, address, commitment)
    } else {
      const rpcClient = rpcPoolManager.getClient(this.network)
      return rpcClient.getBalance(address, commitment)
    }
  }

  /**
   * Get multiple accounts (already optimized, but can be batched with other operations)
   */
  async getMultipleAccounts(
    addresses: Address[],
    options?: {
      commitment?: 'processed' | 'confirmed' | 'finalized'
      encoding?: 'base58' | 'base64' | 'jsonParsed'
    }
  ): Promise<any[]> {
    if (this.config.autoBatch && addresses.length <= 20) {
      // Small requests can be batched
      return this.batcher.getMultipleAccounts(this.network, addresses, options)
    } else {
      // Large requests should be executed directly
      const rpcClient = rpcPoolManager.getClient(this.network)
      return rpcClient.getMultipleAccounts(addresses, options)
    }
  }

  /**
   * Get program accounts with batching
   */
  async getProgramAccounts(
    programId: Address,
    options?: {
      commitment?: 'processed' | 'confirmed' | 'finalized'
      encoding?: 'base58' | 'base64' | 'jsonParsed'
      filters?: any[]
      dataSlice?: { offset: number; length: number }
    }
  ): Promise<any[]> {
    if (this.config.autoBatch) {
      return this.batcher.getProgramAccounts(this.network, programId, options)
    } else {
      const rpcClient = rpcPoolManager.getClient(this.network)
      return rpcClient.getProgramAccounts(programId, options)
    }
  }

  /**
   * Get transaction signatures for address with batching
   */
  async getSignaturesForAddress(
    address: Address,
    options?: {
      limit?: number
      before?: string
      until?: string
      commitment?: 'processed' | 'confirmed' | 'finalized'
    }
  ): Promise<any[]> {
    if (this.config.autoBatch) {
      return this.batcher.getSignaturesForAddress(this.network, address, options)
    } else {
      const rpcClient = rpcPoolManager.getClient(this.network)
      return rpcClient.getTransactionHistory(address, options)
    }
  }

  /**
   * Get transaction details with batching
   */
  async getTransaction(
    signature: string,
    options?: {
      commitment?: 'processed' | 'confirmed' | 'finalized'
      encoding?: 'json' | 'jsonParsed' | 'base58' | 'base64'
      maxSupportedTransactionVersion?: number
    }
  ): Promise<any> {
    if (this.config.autoBatch) {
      return this.batcher.getTransaction(this.network, signature, options)
    } else {
      const rpcClient = rpcPoolManager.getClient(this.network)
      return rpcClient.getTransaction(signature, options)
    }
  }

  /**
   * Batch multiple operations together
   */
  async batchOperations<T = any>(
    operations: Array<{
      type: 'getAccountInfo' | 'getBalance' | 'getTransaction'
      params: any[]
    }>
  ): Promise<BatchOperationResult<T>[]> {
    const startTime = Date.now()
    const results: BatchOperationResult<T>[] = []
    
    // Execute operations in parallel
    const promises = operations.map(async (operation, index) => {
      const requestId = `batch_op_${Date.now()}_${index}`
      const opStartTime = Date.now()
      
      try {
        let result: any
        
        switch (operation.type) {
          case 'getAccountInfo':
            result = await this.getAccountInfo(operation.params[0], operation.params[1])
            break
          case 'getBalance':
            result = await this.getBalance(operation.params[0], operation.params[1])
            break
          case 'getTransaction':
            result = await this.getTransaction(operation.params[0], operation.params[1])
            break
          default:
            throw new Error(`Unsupported operation type: ${operation.type}`)
        }
        
        return {
          success: true,
          data: result,
          requestId,
          executionTime: Date.now() - opStartTime
        } as BatchOperationResult<T>
        
      } catch (error) {
        return {
          success: false,
          error: error as Error,
          requestId,
          executionTime: Date.now() - opStartTime
        } as BatchOperationResult<T>
      }
    })
    
    const operationResults = await Promise.all(promises)
    results.push(...operationResults)
    
    // Emit batch completion event
    this.eventBus.emit('batch_rpc:operations_completed', {
      network: this.network,
      operationCount: operations.length,
      successCount: results.filter(r => r.success).length,
      totalTime: Date.now() - startTime
    })
    
    return results
  }

  /**
   * Execute all pending batches
   */
  async flush(): Promise<void> {
    await this.batcher.flush(this.network)
  }

  /**
   * Get batch statistics
   */
  getBatchStats() {
    return this.batcher.getStats()
  }

  /**
   * Update configuration
   */
  configure(config: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Update batcher configuration
    this.batcher.configure({
      maxBatchSize: this.config.maxBatchSize,
      maxWaitTime: this.config.batchTimeout,
      minBatchSize: this.config.minBatchSize
    })
    
    this.eventBus.emit('batch_rpc:configured', {
      network: this.network,
      config: this.config
    })
  }
}

/**
 * Factory for creating batched RPC clients
 */
export class BatchRpcClientFactory {
  private static clients = new Map<NetworkType, BatchedRpcClient>()
  
  /**
   * Get or create batched RPC client for network
   */
  static getClient(network: NetworkType, config?: Partial<BatchConfig>): BatchedRpcClient {
    let client = this.clients.get(network)
    
    if (!client) {
      client = new BatchedRpcClient(network, config)
      this.clients.set(network, client)
    } else if (config) {
      // Update existing client configuration
      client.configure(config)
    }
    
    return client
  }
  
  /**
   * Clear all clients
   */
  static clearClients(): void {
    this.clients.clear()
  }
  
  /**
   * Get all active clients
   */
  static getActiveClients(): Record<NetworkType, BatchedRpcClient> {
    const result: Record<string, BatchedRpcClient> = {}
    
    for (const [network, client] of this.clients) {
      result[network] = client
    }
    
    return result as Record<NetworkType, BatchedRpcClient>
  }
}

/**
 * Utility functions for batch operations
 */
export class BatchUtils {
  /**
   * Optimize account requests by combining similar operations
   */
  static optimizeAccountRequests(requests: Array<{
    address: Address
    type: 'info' | 'balance'
    options?: any
  }>): Array<{
    type: 'getMultipleAccounts' | 'getBalance'
    addresses: Address[]
    options?: any
  }> {
    // Group by operation type and options
    const infoRequests = requests.filter(r => r.type === 'info')
    const balanceRequests = requests.filter(r => r.type === 'balance')
    
    const optimized = []
    
    // Convert info requests to getMultipleAccounts
    if (infoRequests.length > 0) {
      // Group by similar options
      const groupedByOptions = new Map<string, Address[]>()
      
      for (const request of infoRequests) {
        const optionsKey = JSON.stringify(request.options || {})
        if (!groupedByOptions.has(optionsKey)) {
          groupedByOptions.set(optionsKey, [])
        }
        groupedByOptions.get(optionsKey)!.push(request.address)
      }
      
      // Create batched requests
      for (const [optionsKey, addresses] of groupedByOptions) {
        optimized.push({
          type: 'getMultipleAccounts' as const,
          addresses,
          options: JSON.parse(optionsKey)
        })
      }
    }
    
    // Balance requests stay individual (can't be easily batched)
    for (const request of balanceRequests) {
      optimized.push({
        type: 'getBalance' as const,
        addresses: [request.address],
        options: request.options
      })
    }
    
    return optimized
  }
  
  /**
   * Calculate optimal batch size based on request complexity
   */
  static getOptimalBatchSize(requestType: string, networkLoad: number): number {
    const baseSizes = {
      'getAccountInfo': 50,
      'getBalance': 100,
      'getMultipleAccounts': 20,
      'getProgramAccounts': 5,
      'getTransaction': 30
    }
    
    const baseSize = baseSizes[requestType as keyof typeof baseSizes] || 50
    
    // Adjust based on network load (0-1 scale)
    const loadFactor = Math.max(0.3, 1 - networkLoad)
    
    return Math.floor(baseSize * loadFactor)
  }
  
  /**
   * Estimate request priority based on operation type and context
   */
  static estimateRequestPriority(
    requestType: string,
    context?: {
      userInitiated?: boolean
      realTime?: boolean
      background?: boolean
    }
  ): 'low' | 'medium' | 'high' {
    // User-initiated requests get higher priority
    if (context?.userInitiated) {
      return 'high'
    }
    
    // Real-time data requests get high priority
    if (context?.realTime) {
      return 'high'
    }
    
    // Background requests get low priority
    if (context?.background) {
      return 'low'
    }
    
    // Default priorities by request type
    const typePriorities = {
      'getBalance': 'high',
      'getAccountInfo': 'medium',
      'getTransaction': 'medium',
      'getProgramAccounts': 'low',
      'getSignaturesForAddress': 'low'
    }
    
    return typePriorities[requestType as keyof typeof typePriorities] || 'medium'
  }
}

// Export singleton factory
export const batchRpcClientFactory = BatchRpcClientFactory