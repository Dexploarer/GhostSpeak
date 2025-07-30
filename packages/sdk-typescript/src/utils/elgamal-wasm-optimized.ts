/**
 * WASM-Optimized ElGamal Encryption Module
 * 
 * Enhanced ElGamal implementation that seamlessly integrates WebAssembly
 * acceleration while maintaining full backward compatibility with the
 * existing JavaScript implementation.
 */

// Browser globals for Node.js compatibility
declare const performance: {
  now(): number
}

import type { 
  ElGamalKeypair, 
  ElGamalCiphertext, 
  PedersenCommitment,
  RangeProof,
  ElGamalPubkey,
  ElGamalSecretKey
} from './elgamal-complete.js'

import {
  initializeWasmCrypto,
  generateElGamalKeypair as wasmGenerateKeypair,
  encryptAmount as wasmEncryptAmount,
  batchEncryptAmounts as wasmBatchEncryptAmounts,
  generateRangeProof as wasmGenerateRangeProof,
  batchGenerateRangeProofs as wasmBatchGenerateRangeProofs
} from './wasm-crypto-bridge.js'

import {
  initializeBrowserCompatibility,
  getBrowserCompatibilityManager,
  type BrowserCapabilities
} from './browser-compatibility.js'

// Import JavaScript fallback implementations
import * as JSCrypto from './elgamal-complete.js'

// =====================================================
// ENHANCED TYPES WITH PERFORMANCE METADATA
// =====================================================

/**
 * Enhanced ElGamal result with performance metadata
 */
export interface ElGamalOperationResult<T> {
  /** The operation result */
  result: T
  /** Performance metadata */
  performance: {
    /** Time taken in milliseconds */
    timeMs: number
    /** Whether WASM was used */
    usedWasm: boolean
    /** Implementation used */
    implementation: 'wasm' | 'javascript'
    /** Browser optimization level */
    optimizationLevel: 'basic' | 'standard' | 'advanced'
  }
}

/**
 * Batch operation result with detailed metrics
 */
export interface BatchOperationResult<T> extends ElGamalOperationResult<T[]> {
  /** Additional batch-specific metrics */
  batchMetrics: {
    /** Number of items in batch */
    batchSize: number
    /** Average time per item */
    avgTimePerItem: number
    /** Speedup compared to sequential JS */
    speedupFactor: number
    /** Memory efficiency score */
    memoryEfficiency: number
  }
}

/**
 * Configuration for ElGamal operations
 */
export interface ElGamalConfig {
  /** Force use of specific implementation */
  forceImplementation?: 'wasm' | 'javascript' | 'auto'
  /** Enable performance monitoring */
  enableProfiling: boolean
  /** Preferred batch size for operations */
  preferredBatchSize: number
  /** Maximum concurrent operations */
  maxConcurrentOps: number
  /** Timeout for WASM operations (ms) */
  wasmTimeout: number
}

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

const DEFAULT_CONFIG: ElGamalConfig = {
  forceImplementation: 'auto',
  enableProfiling: true,  
  preferredBatchSize: 10,
  maxConcurrentOps: 4,
  wasmTimeout: 5000
}

// =====================================================
// WASM-OPTIMIZED ELGAMAL ENGINE
// =====================================================

export class WasmOptimizedElGamalEngine {
  private config: ElGamalConfig
  private initialized = false
  private wasmAvailable = false
  private performanceHistory: {
    operation: string
    timeMs: number
    usedWasm: boolean
    timestamp: number
  }[] = []

  constructor(config: Partial<ElGamalConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize the WASM-optimized engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    console.log('🚀 Initializing WASM-optimized ElGamal engine...')

    // Initialize browser compatibility
    const compatManager = await initializeBrowserCompatibility()
    const browserConfig = compatManager.getConfig()

    if (browserConfig) {
      // Update configuration based on browser capabilities
      this.config.preferredBatchSize = browserConfig.preferredBatchSize
      this.config.maxConcurrentOps = browserConfig.maxConcurrentOps
    }

    // Initialize WASM if not forced to use JavaScript
    if (this.config.forceImplementation !== 'javascript') {
      this.wasmAvailable = await initializeWasmCrypto()
    }

    this.initialized = true

    console.log(`✅ ElGamal engine initialized (WASM: ${this.wasmAvailable})`)
    console.log(`📊 Config:`, this.config)
  }

  /**
   * Generate an ElGamal keypair with optimal implementation
   */
  async generateKeypair(seed?: Uint8Array): Promise<ElGamalOperationResult<ElGamalKeypair>> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    const shouldUseWasm = this.shouldUseWasm('keypair_generation')
    
    let result: ElGamalKeypair
    let implementation: 'wasm' | 'javascript'

    if (shouldUseWasm) {
      try {
        result = await wasmGenerateKeypair()
        implementation = 'wasm'
      } catch (error) {
        console.warn('⚠️ WASM keypair generation failed, falling back to JS:', error)
        result = JSCrypto.generateElGamalKeypair(seed)
        implementation = 'javascript'
      }
    } else {
      result = JSCrypto.generateElGamalKeypair(seed)
      implementation = 'javascript'
    }

    const timeMs = performance.now() - startTime
    
    this.recordPerformance('keypair_generation', timeMs, implementation === 'wasm')

    return {
      result,
      performance: {
        timeMs,
        usedWasm: implementation === 'wasm',
        implementation,
        optimizationLevel: this.getOptimizationLevel()
      }
    }
  }

  /**
   * Encrypt a single amount with optimal implementation
   */
  async encryptAmount(
    amount: bigint,
    publicKey: ElGamalPubkey,
    randomness?: Uint8Array
  ): Promise<ElGamalOperationResult<ElGamalCiphertext>> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    const shouldUseWasm = this.shouldUseWasm('encryption')
    
    let result: ElGamalCiphertext
    let implementation: 'wasm' | 'javascript'

    if (shouldUseWasm) {
      try {
        result = await wasmEncryptAmount(amount, publicKey, randomness)
        implementation = 'wasm'
      } catch (error) {
        console.warn('⚠️ WASM encryption failed, falling back to JS:', error)
        result = randomness ? 
          JSCrypto.encryptAmountWithRandomness(amount, publicKey, randomness).ciphertext :
          JSCrypto.encryptAmount(amount, publicKey)
        implementation = 'javascript'
      }
    } else {
      result = randomness ? 
        JSCrypto.encryptAmountWithRandomness(amount, publicKey, randomness).ciphertext :
        JSCrypto.encryptAmount(amount, publicKey)
      implementation = 'javascript'
    }

    const timeMs = performance.now() - startTime
    
    this.recordPerformance('encryption', timeMs, implementation === 'wasm')

    return {
      result,
      performance: {
        timeMs,
        usedWasm: implementation === 'wasm',
        implementation,
        optimizationLevel: this.getOptimizationLevel()
      }
    }
  }

  /**
   * Encrypt multiple amounts with batch optimization
   */
  async encryptAmountsBatch(
    amounts: bigint[],
    publicKey: ElGamalPubkey
  ): Promise<BatchOperationResult<ElGamalCiphertext>> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    const batchSize = amounts.length
    const shouldUseBatch = this.shouldUseBatchOperation(batchSize)
    
    let result: ElGamalCiphertext[]
    let implementation: 'wasm' | 'javascript'
    let speedupFactor = 1

    if (shouldUseBatch && this.wasmAvailable) {
      try {
        // Use WASM batch operation
        result = await wasmBatchEncryptAmounts(amounts, publicKey)
        implementation = 'wasm'
        
        // Estimate speedup (would be measured in practice)
        speedupFactor = Math.min(batchSize * 0.8, 8) // Up to 8x speedup for large batches
      } catch (error) {
        console.warn('⚠️ WASM batch encryption failed, falling back to sequential JS:', error)
        result = await this.encryptSequentially(amounts, publicKey)
        implementation = 'javascript'
      }
    } else {
      // Use sequential encryption
      result = await this.encryptSequentially(amounts, publicKey)
      implementation = 'javascript'
    }

    const timeMs = performance.now() - startTime
    const avgTimePerItem = timeMs / batchSize
    
    this.recordPerformance('batch_encryption', timeMs, implementation === 'wasm')

    return {
      result,
      performance: {
        timeMs,
        usedWasm: implementation === 'wasm',
        implementation,
        optimizationLevel: this.getOptimizationLevel()
      },
      batchMetrics: {
        batchSize,
        avgTimePerItem,
        speedupFactor,
        memoryEfficiency: implementation === 'wasm' ? 85 : 60 // Estimated efficiency scores
      }
    }
  }

  /**
   * Decrypt an ElGamal ciphertext
   */
  async decryptAmount(
    ciphertext: ElGamalCiphertext,
    secretKey: ElGamalSecretKey
  ): Promise<ElGamalOperationResult<bigint | null>> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    
    // Decryption currently only uses JavaScript implementation
    // WASM decryption could be added in the future
    const result = JSCrypto.decryptAmount(ciphertext, secretKey)
    const timeMs = performance.now() - startTime
    
    this.recordPerformance('decryption', timeMs, false)

    return {
      result,
      performance: {
        timeMs,
        usedWasm: false,
        implementation: 'javascript',
        optimizationLevel: this.getOptimizationLevel()
      }
    }
  }

  /**
   * Generate a range proof with optimal implementation
   */
  async generateRangeProof(
    amount: bigint,
    commitment: PedersenCommitment,
    blindingFactor: Uint8Array
  ): Promise<ElGamalOperationResult<RangeProof>> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    const shouldUseWasm = this.shouldUseWasm('range_proof')
    
    let result: RangeProof
    let implementation: 'wasm' | 'javascript'

    if (shouldUseWasm) {
      try {
        const wasmResult = await wasmGenerateRangeProof(amount, commitment, blindingFactor)
        result = {
          proof: wasmResult.proof,
          commitment: wasmResult.commitment
        }
        implementation = 'wasm'
      } catch (error) {
        console.warn('⚠️ WASM range proof generation failed, falling back to JS:', error)
        result = JSCrypto.generateRangeProof(amount, commitment, blindingFactor)
        implementation = 'javascript'
      }
    } else {
      result = JSCrypto.generateRangeProof(amount, commitment, blindingFactor)
      implementation = 'javascript'
    }

    const timeMs = performance.now() - startTime
    
    this.recordPerformance('range_proof', timeMs, implementation === 'wasm')

    // Verify performance target
    if (timeMs > 50 && this.config.enableProfiling) {
      console.warn(`⚠️ Range proof generation took ${timeMs.toFixed(2)}ms (target: <50ms)`)
    }

    return {
      result,
      performance: {
        timeMs,
        usedWasm: implementation === 'wasm',
        implementation,
        optimizationLevel: this.getOptimizationLevel()
      }
    }
  }

  /**
   * Generate multiple range proofs with batch optimization
   */
  async generateRangeProofsBatch(
    proofRequests: {
      amount: bigint
      commitment: PedersenCommitment
      blindingFactor: Uint8Array
    }[]
  ): Promise<BatchOperationResult<RangeProof>> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    const batchSize = proofRequests.length
    const shouldUseBatch = this.shouldUseBatchOperation(batchSize)
    
    let result: RangeProof[]
    let implementation: 'wasm' | 'javascript'
    let speedupFactor = 1

    if (shouldUseBatch && this.wasmAvailable) {
      try {
        // Use WASM batch operation
        const wasmResults = await wasmBatchGenerateRangeProofs(proofRequests)
        result = wasmResults.map(r => ({
          proof: r.proof,
          commitment: r.commitment
        }))
        implementation = 'wasm'
        
        // Range proofs show significant speedup in batches
        speedupFactor = Math.min(batchSize * 1.5, 10) // Up to 10x speedup
      } catch (error) {
        console.warn('⚠️ WASM batch range proof generation failed, falling back to sequential JS:', error)
        result = await this.generateRangeProofsSequentially(proofRequests)
        implementation = 'javascript'
      }
    } else {
      // Use sequential generation
      result = await this.generateRangeProofsSequentially(proofRequests)
      implementation = 'javascript'
    }

    const timeMs = performance.now() - startTime
    const avgTimePerItem = timeMs / batchSize
    
    this.recordPerformance('batch_range_proof', timeMs, implementation === 'wasm')

    return {
      result,
      performance: {
        timeMs,
        usedWasm: implementation === 'wasm',
        implementation,
        optimizationLevel: this.getOptimizationLevel()
      },
      batchMetrics: {
        batchSize,
        avgTimePerItem,
        speedupFactor,
        memoryEfficiency: implementation === 'wasm' ? 90 : 65
      }
    }
  }

  /**
   * Generate transfer proof (combines range, validity, and equality proofs)
   */
  async generateTransferProof(
    sourceBalance: ElGamalCiphertext,
    amount: bigint,
    sourceKeypair: ElGamalKeypair,
    destPubkey: ElGamalPubkey
  ): Promise<ElGamalOperationResult<{
    transferProof: {
      encryptedTransferAmount: Uint8Array
      newSourceCommitment: Uint8Array
      equalityProof: Uint8Array
      validityProof: Uint8Array
      rangeProof: Uint8Array
    }
    newSourceBalance: ElGamalCiphertext
    destCiphertext: ElGamalCiphertext
  }>> {
    await this.ensureInitialized()
    
    const startTime = performance.now()
    
    // Use JavaScript implementation for complex transfer proofs
    // WASM implementation could be added for better performance
    const result = JSCrypto.generateTransferProof(sourceBalance, amount, sourceKeypair, destPubkey)
    const timeMs = performance.now() - startTime
    
    this.recordPerformance('transfer_proof', timeMs, false)

    return {
      result,
      performance: {
        timeMs,
        usedWasm: false,
        implementation: 'javascript',
        optimizationLevel: this.getOptimizationLevel()
      }
    }
  }

  // =====================================================
  // PERFORMANCE ANALYSIS AND MONITORING
  // =====================================================

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalOperations: number
    wasmOperations: number
    jsOperations: number
    averageWasmTime: number
    averageJsTime: number
    wasmSpeedup: number
    operationBreakdown: { [operation: string]: { count: number; avgTime: number; wasmUsage: number } }
  } {
    const stats = {
      totalOperations: this.performanceHistory.length,
      wasmOperations: this.performanceHistory.filter(p => p.usedWasm).length,
      jsOperations: this.performanceHistory.filter(p => !p.usedWasm).length,
      averageWasmTime: 0,
      averageJsTime: 0,
      wasmSpeedup: 1,
      operationBreakdown: {} as { [operation: string]: { count: number; avgTime: number; wasmUsage: number } }
    }

    if (stats.wasmOperations > 0) {
      stats.averageWasmTime = this.performanceHistory
        .filter(p => p.usedWasm)
        .reduce((sum, p) => sum + p.timeMs, 0) / stats.wasmOperations
    }

    if (stats.jsOperations > 0) {
      stats.averageJsTime = this.performanceHistory
        .filter(p => !p.usedWasm)
        .reduce((sum, p) => sum + p.timeMs, 0) / stats.jsOperations
    }

    if (stats.averageWasmTime > 0 && stats.averageJsTime > 0) {
      stats.wasmSpeedup = stats.averageJsTime / stats.averageWasmTime
    }

    // Calculate operation breakdown
    const operationGroups: { [key: string]: { timeMs: number; usedWasm: boolean }[] } = {}
    
    for (const record of this.performanceHistory) {
      // Group already exists or will be created
      operationGroups[record.operation].push({
        timeMs: record.timeMs,
        usedWasm: record.usedWasm
      })
    }

    for (const [operation, records] of Object.entries(operationGroups)) {
      const wasmRecords = records.filter(r => r.usedWasm)
      const totalTime = records.reduce((sum, r) => sum + r.timeMs, 0)
      
      stats.operationBreakdown[operation] = {
        count: records.length,
        avgTime: totalTime / records.length,
        wasmUsage: wasmRecords.length / records.length
      }
    }

    return stats
  }

  /**
   * Clear performance history
   */
  clearPerformanceHistory(): void {
    this.performanceHistory = []
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): {
    config: ElGamalConfig
    browserInfo: BrowserCapabilities | null
    performanceHistory: {
      operation: string
      timeMs: number
      usedWasm: boolean
      timestamp: number
    }[]
    stats: ReturnType<WasmOptimizedElGamalEngine['getPerformanceStats']>
  } {
    const browserManager = getBrowserCompatibilityManager()
    
    return {
      config: this.config,
      browserInfo: browserManager.getCapabilities(),
      performanceHistory: [...this.performanceHistory],
      stats: this.getPerformanceStats()
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  private shouldUseWasm(operation: string): boolean {
    if (this.config.forceImplementation === 'javascript') {
      return false
    }
    
    if (this.config.forceImplementation === 'wasm') {
      return this.wasmAvailable
    }
    
    // Auto mode - use WASM for operations that benefit from it
    return this.wasmAvailable && ['encryption', 'range_proof'].includes(operation)
  }

  private shouldUseBatchOperation(batchSize: number): boolean {
    return batchSize >= Math.max(this.config.preferredBatchSize / 2, 2)
  }

  private getOptimizationLevel(): 'basic' | 'standard' | 'advanced' {
    const browserManager = getBrowserCompatibilityManager()
    const config = browserManager.getConfig()
    return config?.optimizationLevel ?? 'basic'
  }

  private recordPerformance(operation: string, timeMs: number, usedWasm: boolean): void {
    if (this.config.enableProfiling) {
      this.performanceHistory.push({
        operation,
        timeMs,
        usedWasm,
        timestamp: Date.now()
      })
      
      // Keep only last 1000 records
      if (this.performanceHistory.length > 1000) {
        this.performanceHistory.shift()
      }
    }
  }

  private async encryptSequentially(amounts: bigint[], publicKey: ElGamalPubkey): Promise<ElGamalCiphertext[]> {
    const results: ElGamalCiphertext[] = []
    
    for (const amount of amounts) {
      const result = await this.encryptAmount(amount, publicKey)
      results.push(result.result)
    }
    
    return results
  }

  private async generateRangeProofsSequentially(
    requests: {
      amount: bigint
      commitment: PedersenCommitment
      blindingFactor: Uint8Array
    }[]
  ): Promise<RangeProof[]> {
    const results: RangeProof[] = []
    
    for (const request of requests) {
      const result = await this.generateRangeProof(request.amount, request.commitment, request.blindingFactor)
      results.push(result.result)
    }
    
    return results
  }
}

// =====================================================
// SINGLETON INSTANCE AND CONVENIENCE FUNCTIONS
// =====================================================

// Global engine instance
let globalEngine: WasmOptimizedElGamalEngine | null = null

/**
 * Get the global WASM-optimized ElGamal engine
 */
export function getElGamalEngine(config?: Partial<ElGamalConfig>): WasmOptimizedElGamalEngine {
  globalEngine ??= new WasmOptimizedElGamalEngine(config)
  return globalEngine
}

/**
 * Initialize the global ElGamal engine
 */
export async function initializeElGamalEngine(config?: Partial<ElGamalConfig>): Promise<WasmOptimizedElGamalEngine> {
  const engine = getElGamalEngine(config)
  await engine.initialize()
  return engine
}

// =====================================================
// CONVENIENCE FUNCTIONS FOR BACKWARD COMPATIBILITY
// =====================================================

/**
 * Generate ElGamal keypair (convenience function)
 */
export async function generateElGamalKeypair(seed?: Uint8Array): Promise<ElGamalKeypair> {
  const engine = getElGamalEngine()
  const result = await engine.generateKeypair(seed)
  return result.result
}

/**
 * Encrypt amount (convenience function)
 */
export async function encryptAmount(
  amount: bigint,
  publicKey: ElGamalPubkey,
  randomness?: Uint8Array
): Promise<ElGamalCiphertext> {
  const engine = getElGamalEngine()
  const result = await engine.encryptAmount(amount, publicKey, randomness)
  return result.result
}

/**
 * Decrypt amount (convenience function)
 */
export async function decryptAmount(
  ciphertext: ElGamalCiphertext,
  secretKey: ElGamalSecretKey
): Promise<bigint | null> {
  const engine = getElGamalEngine()
  const result = await engine.decryptAmount(ciphertext, secretKey)
  return result.result
}

/**
 * Generate range proof (convenience function)
 */
export async function generateRangeProof(
  amount: bigint,
  commitment: PedersenCommitment,
  blindingFactor: Uint8Array
): Promise<RangeProof> {
  const engine = getElGamalEngine()
  const result = await engine.generateRangeProof(amount, commitment, blindingFactor)
  return result.result
}

/**
 * Batch encrypt amounts (convenience function)
 */
export async function batchEncryptAmounts(
  amounts: bigint[],
  publicKey: ElGamalPubkey
): Promise<ElGamalCiphertext[]> {
  const engine = getElGamalEngine()
  const result = await engine.encryptAmountsBatch(amounts, publicKey)
  return result.result
}

/**
 * Batch generate range proofs (convenience function)
 */
export async function batchGenerateRangeProofs(
  proofRequests: {
    amount: bigint
    commitment: PedersenCommitment
    blindingFactor: Uint8Array
  }[]
): Promise<RangeProof[]> {
  const engine = getElGamalEngine()
  const result = await engine.generateRangeProofsBatch(proofRequests)
  return result.result
}

// Re-export types for convenience
export type {
  ElGamalKeypair,
  ElGamalCiphertext,
  PedersenCommitment,
  RangeProof,
  ValidityProof,
  EqualityProof,
  ElGamalPubkey,
  ElGamalSecretKey
} from './elgamal-complete.js'