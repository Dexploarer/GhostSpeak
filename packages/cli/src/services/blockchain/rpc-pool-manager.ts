/**
 * RPC Pool Manager for GhostSpeak Blockchain Services
 * 
 * Integrates the connection pooling system with blockchain services
 * for optimal RPC performance and reliability.
 */

import type { SolanaRpcApi } from '@solana/kit'
import type { Address } from '@solana/addresses'
import { ConnectionPoolManager, type NetworkType, type PooledConnection } from '../../core/connection-pool'
import { EventBus } from '../../core/event-system'

/**
 * RPC operation types for performance tracking
 */
export type RpcOperationType = 
  | 'getAccountInfo'
  | 'getBalance'
  | 'getLatestBlockhash'
  | 'sendTransaction'
  | 'confirmTransaction'
  | 'getProgramAccounts'
  | 'getMultipleAccounts'
  | 'simulateTransaction'
  | 'getTransaction'
  | 'getTransactionHistory'

/**
 * RPC operation metadata
 */
export interface RpcOperation {
  type: RpcOperationType
  network: NetworkType
  startTime: number
  endTime?: number
  success?: boolean
  error?: Error
  cacheHit?: boolean
}

/**
 * Performance metrics for RPC operations
 */
export interface RpcPerformanceMetrics {
  totalOperations: number
  averageResponseTime: number
  operationsByType: Record<RpcOperationType, number>
  errorRate: number
  cacheHitRate: number
  networkDistribution: Record<NetworkType, number>
}

/**
 * High-performance RPC client with connection pooling
 */
export class PooledRpcClient {
  private network: NetworkType
  private poolManager = ConnectionPoolManager.getInstance()
  private eventBus = EventBus.getInstance()
  private metrics: RpcPerformanceMetrics = {
    totalOperations: 0,
    averageResponseTime: 0,
    operationsByType: {} as Record<RpcOperationType, number>,
    errorRate: 0,
    cacheHitRate: 0,
    networkDistribution: {} as Record<NetworkType, number>
  }
  private operations: RpcOperation[] = []

  constructor(network: NetworkType) {
    this.network = network
  }

  /**
   * Get account information
   */
  async getAccountInfo(address: Address, options?: {
    commitment?: 'processed' | 'confirmed' | 'finalized'
    encoding?: 'base58' | 'base64' | 'jsonParsed'
  }): Promise<any> {
    return this.executeRpcCall('getAccountInfo', async (connection) => {
      return connection.call('getAccountInfo', [address, options])
    })
  }

  /**
   * Get account balance
   */
  async getBalance(address: Address, commitment?: 'processed' | 'confirmed' | 'finalized'): Promise<number> {
    return this.executeRpcCall('getBalance', async (connection) => {
      return connection.call('getBalance', [address, { commitment }])
    })
  }

  /**
   * Get latest blockhash
   */
  async getLatestBlockhash(commitment?: 'processed' | 'confirmed' | 'finalized'): Promise<any> {
    return this.executeRpcCall('getLatestBlockhash', async (connection) => {
      return connection.call('getLatestBlockhash', [{ commitment }])
    })
  }

  /**
   * Send transaction
   */
  async sendTransaction(
    transaction: string,
    options?: {
      skipPreflight?: boolean
      preflightCommitment?: 'processed' | 'confirmed' | 'finalized'
      maxRetries?: number
    }
  ): Promise<string> {
    return this.executeRpcCall('sendTransaction', async (connection) => {
      return connection.call('sendTransaction', [transaction, options])
    })
  }

  /**
   * Confirm transaction
   */
  async confirmTransaction(
    signature: string,
    commitment?: 'processed' | 'confirmed' | 'finalized'
  ): Promise<any> {
    return this.executeRpcCall('confirmTransaction', async (connection) => {
      return connection.call('getSignatureStatus', [signature, { commitment }])
    })
  }

  /**
   * Get program accounts
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
    return this.executeRpcCall('getProgramAccounts', async (connection) => {
      return connection.call('getProgramAccounts', [programId, options])
    })
  }

  /**
   * Get multiple accounts (batched operation)
   */
  async getMultipleAccounts(
    addresses: Address[],
    options?: {
      commitment?: 'processed' | 'confirmed' | 'finalized'
      encoding?: 'base58' | 'base64' | 'jsonParsed'
    }
  ): Promise<any[]> {
    return this.executeRpcCall('getMultipleAccounts', async (connection) => {
      return connection.call('getMultipleAccounts', [addresses, options])
    })
  }

  /**
   * Simulate transaction
   */
  async simulateTransaction(
    transaction: string,
    options?: {
      commitment?: 'processed' | 'confirmed' | 'finalized'
      sigVerify?: boolean
      replaceRecentBlockhash?: boolean
    }
  ): Promise<any> {
    return this.executeRpcCall('simulateTransaction', async (connection) => {
      return connection.call('simulateTransaction', [transaction, options])
    })
  }

  /**
   * Get transaction details
   */
  async getTransaction(
    signature: string,
    options?: {
      commitment?: 'processed' | 'confirmed' | 'finalized'
      encoding?: 'json' | 'jsonParsed' | 'base58' | 'base64'
      maxSupportedTransactionVersion?: number
    }
  ): Promise<any> {
    return this.executeRpcCall('getTransaction', async (connection) => {
      return connection.call('getTransaction', [signature, options])
    })
  }

  /**
   * Get transaction history for address
   */
  async getTransactionHistory(
    address: Address,
    options?: {
      limit?: number
      before?: string
      until?: string
      commitment?: 'processed' | 'confirmed' | 'finalized'
    }
  ): Promise<any[]> {
    return this.executeRpcCall('getTransactionHistory', async (connection) => {
      return connection.call('getSignaturesForAddress', [address, options])
    })
  }

  /**
   * Get performance metrics
   */
  getMetrics(): RpcPerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get recent operations
   */
  getRecentOperations(limit = 100): RpcOperation[] {
    return this.operations.slice(-limit)
  }

  /**
   * Clear metrics and operation history
   */
  clearMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      averageResponseTime: 0,
      operationsByType: {} as Record<RpcOperationType, number>,
      errorRate: 0,
      cacheHitRate: 0,
      networkDistribution: {} as Record<NetworkType, number>
    }
    this.operations = []
  }

  /**
   * Execute RPC call with performance tracking
   */
  private async executeRpcCall<T>(
    operationType: RpcOperationType,
    operation: (connection: PooledConnection) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    const rpcOperation: RpcOperation = {
      type: operationType,
      network: this.network,
      startTime
    }

    try {
      // Get connection from pool
      const connection = await this.poolManager.getConnection(this.network)
      
      // Execute operation
      const result = await operation(connection)
      
      // Track successful operation
      rpcOperation.endTime = Date.now()
      rpcOperation.success = true
      
      this.recordOperation(rpcOperation)
      
      return result

    } catch (_) {
      // Track failed operation
      rpcOperation.endTime = Date.now()
      rpcOperation.success = false
      rpcOperation.error = _error as Error
      
      this.recordOperation(rpcOperation)
      
      // Emit error event for monitoring
      this.eventBus.emit('rpc:operation_failed', {
        operation: rpcOperation,
        error
      })
      
      throw _error
    }
  }

  /**
   * Record operation for metrics tracking
   */
  private recordOperation(operation: RpcOperation): void {
    this.operations.push(operation)
    
    // Keep only recent operations
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000)
    }

    // Update metrics
    this.updateMetrics(operation)
    
    // Emit operation event
    this.eventBus.emit('rpc:operation_completed', operation)
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(operation: RpcOperation): void {
    this.metrics.totalOperations++
    
    // Update operation type counter
    this.metrics.operationsByType[operation.type] = 
      (this.metrics.operationsByType[operation.type] || 0) + 1
    
    // Update network distribution
    this.metrics.networkDistribution[operation.network] = 
      (this.metrics.networkDistribution[operation.network] || 0) + 1
    
    // Update response time
    if (operation.endTime) {
      const responseTime = operation.endTime - operation.startTime
      const currentAvg = this.metrics.averageResponseTime
      const totalOps = this.metrics.totalOperations
      
      this.metrics.averageResponseTime = totalOps > 1
        ? ((currentAvg * (totalOps - 1)) + responseTime) / totalOps
        : responseTime
    }
    
    // Update error rate
    const recentOperations = this.operations.slice(-100) // Last 100 operations
    const errorCount = recentOperations.filter(op => !op.success).length
    this.metrics.errorRate = (errorCount / recentOperations.length) * 100
  }
}

/**
 * RPC Pool Manager - Factory for pooled RPC clients
 */
export class RpcPoolManager {
  private static instance: RpcPoolManager | null = null
  private clients = new Map<NetworkType, PooledRpcClient>()
  private eventBus = EventBus.getInstance()

  /**
   * Get singleton instance
   */
  static getInstance(): RpcPoolManager {
    if (!RpcPoolManager.instance) {
      RpcPoolManager.instance = new RpcPoolManager()
    }
    return RpcPoolManager.instance
  }

  /**
   * Get RPC client for network
   */
  getClient(network: NetworkType): PooledRpcClient {
    let client = this.clients.get(network)
    
    if (!client) {
      client = new PooledRpcClient(network)
      this.clients.set(network, client)
      
      this.eventBus.emit('rpc_pool:client_created', { network })
    }
    
    return client
  }

  /**
   * Get aggregated metrics for all clients
   */
  getAggregatedMetrics(): {
    overall: RpcPerformanceMetrics
    byNetwork: Record<NetworkType, RpcPerformanceMetrics>
  } {
    const byNetwork: Record<string, RpcPerformanceMetrics> = {}
    let totalOperations = 0
    let totalResponseTime = 0
    let totalErrors = 0
    const operationsByType: Record<RpcOperationType, number> = {} as Record<RpcOperationType, number>

    for (const [network, client] of this.clients) {
      const metrics = client.getMetrics()
      byNetwork[network] = metrics
      
      totalOperations += metrics.totalOperations
      totalResponseTime += metrics.averageResponseTime * metrics.totalOperations
      totalErrors += (metrics.errorRate / 100) * metrics.totalOperations
      
      // Aggregate operations by type
      for (const [type, count] of Object.entries(metrics.operationsByType)) {
        operationsByType[type as RpcOperationType] = 
          (operationsByType[type as RpcOperationType] || 0) + count
      }
    }

    const overall: RpcPerformanceMetrics = {
      totalOperations,
      averageResponseTime: totalOperations > 0 ? totalResponseTime / totalOperations : 0,
      operationsByType,
      errorRate: totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0,
      cacheHitRate: 0, // Will be calculated when cache integration is added
      networkDistribution: {} as Record<NetworkType, number>
    }

    // Calculate network distribution
    for (const [network, metrics] of Object.entries(byNetwork)) {
      overall.networkDistribution[network as NetworkType] = metrics.totalOperations
    }

    return {
      overall,
      byNetwork: byNetwork as Record<NetworkType, RpcPerformanceMetrics>
    }
  }

  /**
   * Health check all clients
   */
  async healthCheck(): Promise<Record<NetworkType, boolean>> {
    const results: Record<string, boolean> = {}
    
    const promises = Array.from(this.clients.entries()).map(async ([network, client]) => {
      try {
        await client.getLatestBlockhash()
        results[network] = true
      } catch (_) {
        results[network] = false
        this.eventBus.emit('rpc_pool:health_check_failed', { network, error })
      }
    })

    await Promise.allSettled(promises)
    
    this.eventBus.emit('rpc_pool:health_check_completed', results)
    
    return results as Record<NetworkType, boolean>
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    for (const client of this.clients.values()) {
      client.clearMetrics()
    }
    
    this.eventBus.emit('rpc_pool:metrics_cleared')
  }
}

// Export singleton instance
export const rpcPoolManager = RpcPoolManager.getInstance()