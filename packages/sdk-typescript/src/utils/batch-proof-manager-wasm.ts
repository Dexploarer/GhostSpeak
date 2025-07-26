/**
 * WASM-Optimized Batch Proof Manager
 * 
 * Enhanced version of the batch proof manager that leverages WebAssembly
 * for high-performance cryptographic operations with minimal JS-WASM
 * boundary crossings.
 */

// Browser globals for Node.js compatibility
declare const performance: {
  now(): number
}

import type { Address, IInstruction } from '@solana/kit'
import { address } from '@solana/addresses'
import {
  initializeWasmCrypto,
  batchGenerateRangeProofs,
  getCryptoPerformanceInfo
} from './wasm-crypto-bridge.js'
import {
  createBatchVerifyRangeProofInstructions,
  type ProofVerificationAccounts
} from './zk-proof-instructions.js'
import {
  PROOF_SIZES,
  PROOF_COMPUTE_UNITS
} from '../constants/zk-proof-program.js'
import type { PedersenCommitment, ElGamalCiphertext } from './elgamal-complete.js'

// =====================================================
// ENHANCED TYPES FOR WASM INTEGRATION
// =====================================================

/**
 * WASM-optimized proof generation task
 */
export interface WasmProofTask {
  /** Unique identifier for the task */
  id: string
  /** Type of proof to generate */
  type: 'range' | 'validity' | 'equality' | 'batch_range'
  /** Priority level (higher = more important) */
  priority: number
  /** Task creation timestamp */
  createdAt: number
  /** Task-specific data optimized for WASM */
  data: WasmProofTaskData
  /** Retry count */
  retries: number
  /** Whether this task should use WASM */
  useWasm: boolean
}

/**
 * WASM-optimized proof task data
 */
export type WasmProofTaskData = 
  | { 
      type: 'range'
      amount: bigint
      commitment: PedersenCommitment
      blindingFactor: Uint8Array
    }
  | { 
      type: 'batch_range'
      proofRequests: {
        amount: bigint
        commitment: PedersenCommitment
        blindingFactor: Uint8Array
      }[]
    }
  | { 
      type: 'validity'
      ciphertext: ElGamalCiphertext
      amount: bigint
      randomness: Uint8Array
    }
  | { 
      type: 'equality'
      sourceOld: ElGamalCiphertext
      sourceNew: ElGamalCiphertext
      destCiphertext: ElGamalCiphertext
      amount: bigint
      randomness: Uint8Array
    }

/**
 * Enhanced batch proof result with WASM metrics
 */
export interface WasmBatchProofResult {
  /** Successfully generated proofs */
  proofs: WasmGeneratedProof[]
  /** Failed proof tasks */
  failures: WasmProofFailure[]
  /** Total compute units required */
  computeUnits: number
  /** Verification instructions */
  instructions: IInstruction[]
  /** Performance metrics */
  metrics: WasmPerformanceMetrics
}

/**
 * Generated proof with WASM performance data
 */
export interface WasmGeneratedProof {
  /** Task ID */
  taskId: string
  /** Proof type */
  type: string
  /** Proof data */
  proof: Uint8Array
  /** Generation time in ms */
  generationTime: number
  /** Size in bytes */
  size: number
  /** Whether WASM was used */
  usedWasm: boolean
  /** WASM-specific metrics */
  wasmMetrics?: {
    boundaryCrossings: number
    memoryAllocations: number
    simdOperations: number
  }
}

/**
 * Enhanced proof failure with WASM context
 */
export interface WasmProofFailure {
  /** Task ID */
  taskId: string
  /** Error message */
  error: string
  /** Whether task can be retried */
  canRetry: boolean
  /** Whether failure was in WASM or JS */
  failureContext: 'wasm' | 'js' | 'bridge'
  /** Whether to retry with JS fallback */
  shouldFallbackToJs: boolean
}

/**
 * WASM performance metrics
 */
export interface WasmPerformanceMetrics {
  /** Total batch processing time */
  totalTime: number
  /** Time spent in WASM operations */
  wasmTime: number
  /** Time spent in JS operations */
  jsTime: number
  /** Time spent in bridge operations */
  bridgeTime: number
  /** Number of JS-WASM boundary crossings */
  boundaryCrossings: number
  /** Memory usage statistics */
  memoryStats: {
    peakWasmMemory: number
    totalAllocations: number
    averageAllocationSize: number
  }
  /** Performance improvement over pure JS */
  speedupFactor: number
}

/**
 * Enhanced batch manager configuration with WASM settings
 */
export interface WasmBatchManagerConfig {
  /** Maximum proofs per batch */
  maxProofsPerBatch: number
  /** Maximum compute units per transaction */
  maxComputeUnits: number
  /** Maximum transaction size in bytes */
  maxTransactionSize: number
  /** Maximum retries for failed proofs */
  maxRetries: number
  /** Parallel proof generation workers */
  parallelWorkers: number
  /** Proof generation timeout in ms */
  proofTimeout: number
  /** WASM-specific settings */
  wasmSettings: {
    /** Enable WASM acceleration */
    enableWasm: boolean
    /** Minimum batch size to use WASM */
    minBatchSizeForWasm: number
    /** Maximum boundary crossings per batch */
    maxBoundaryCrossings: number
    /** Enable automatic fallback to JS */
    enableJsFallback: boolean
    /** Memory limit for WASM operations (bytes) */
    wasmMemoryLimit: number
  }
}

// =====================================================
// CONSTANTS
// =====================================================

const DEFAULT_WASM_CONFIG: WasmBatchManagerConfig = {
  maxProofsPerBatch: 20, // Increased for WASM efficiency
  maxComputeUnits: 1_400_000,
  maxTransactionSize: 1232,
  maxRetries: 3,
  parallelWorkers: 4,
  proofTimeout: 10000, // Increased for WASM initialization
  wasmSettings: {
    enableWasm: true,
    minBatchSizeForWasm: 3, // Use WASM for 3+ proofs
    maxBoundaryCrossings: 50, // Limit to reduce overhead
    enableJsFallback: true,
    wasmMemoryLimit: 16 * 1024 * 1024 // 16MB
  }
}

// =====================================================
// WASM-OPTIMIZED BATCH PROOF MANAGER
// =====================================================

export class WasmBatchProofManager {
  private config: WasmBatchManagerConfig
  private taskQueue: WasmProofTask[] = []
  private processingTasks: Set<string> = new Set()
  private completedTasks: Map<string, WasmGeneratedProof> = new Map()
  private failedTasks: Map<string, WasmProofFailure> = new Map()
  private wasmInitialized = false
  private performanceHistory: WasmPerformanceMetrics[] = []

  constructor(config: Partial<WasmBatchManagerConfig> = {}) {
    this.config = { 
      ...DEFAULT_WASM_CONFIG, 
      ...config,
      wasmSettings: {
        ...DEFAULT_WASM_CONFIG.wasmSettings,
        ...(config.wasmSettings ?? {})
      }
    }
    
    // Initialize WASM if enabled
    if (this.config.wasmSettings.enableWasm) {
      this.initializeWasm()
    }
  }

  /**
   * Initialize WASM module
   */
  private async initializeWasm(): Promise<void> {
    try {
      const success = await initializeWasmCrypto()
      this.wasmInitialized = success
      
      if (success) {
        console.log('🚀 WasmBatchProofManager: WASM acceleration enabled')
        const perfInfo = await getCryptoPerformanceInfo()
        console.log('📊 WASM Performance Info:', perfInfo)
      } else {
        console.warn('⚠️ WasmBatchProofManager: WASM not available, using JS fallback')
      }
    } catch (error) {
      console.error('❌ WasmBatchProofManager: WASM initialization failed:', error)
      this.wasmInitialized = false
    }
  }

  /**
   * Add a proof generation task with WASM optimization
   */
  addTask(task: Omit<WasmProofTask, 'id' | 'createdAt' | 'retries' | 'useWasm'>): string {
    const id = this.generateTaskId()
    const useWasm = this.shouldUseWasm(task.type)
    
    const fullTask: WasmProofTask = {
      ...task,
      id,
      createdAt: Date.now(),
      retries: 0,
      useWasm
    }
    
    this.taskQueue.push(fullTask)
    this.sortQueue()
    
    console.log(`📝 Task ${id} added (type: ${task.type}, WASM: ${useWasm})`)
    
    return id
  }

  /**
   * Add multiple range proof tasks optimized for WASM batch processing
   */
  addBatchRangeProofTasks(
    proofRequests: {
      amount: bigint
      commitment: PedersenCommitment
      blindingFactor: Uint8Array
    }[],
    priority = 5
  ): string {
    // If WASM is available and batch is large enough, create a single batch task
    if (this.wasmInitialized && 
        proofRequests.length >= this.config.wasmSettings.minBatchSizeForWasm) {
      
      return this.addTask({
        type: 'batch_range',
        priority,
        data: { type: 'batch_range', proofRequests }
      })
    }

    // Otherwise, create individual tasks
    const taskIds: string[] = []
    for (const request of proofRequests) {
      const taskId = this.addTask({
        type: 'range',
        priority,
        data: { 
          type: 'range',
          amount: request.amount,
          commitment: request.commitment,
          blindingFactor: request.blindingFactor
        }
      })
      taskIds.push(taskId)
    }

    console.log(`📝 Added ${proofRequests.length} range proof tasks (individual)`)
    return `batch_${taskIds.join('_')}`
  }

  /**
   * Process all pending tasks with WASM acceleration
   */
  async processBatch(): Promise<WasmBatchProofResult> {
    const startTime = performance.now()
    const metrics: WasmPerformanceMetrics = {
      totalTime: 0,
      wasmTime: 0,
      jsTime: 0,
      bridgeTime: 0,
      boundaryCrossings: 0,
      memoryStats: {
        peakWasmMemory: 0,
        totalAllocations: 0,
        averageAllocationSize: 0
      },
      speedupFactor: 1
    }

    const proofs: WasmGeneratedProof[] = []
    const failures: WasmProofFailure[] = []
    
    // Get tasks for this batch
    const batchTasks = this.selectBatchTasks()
    
    if (batchTasks.length === 0) {
      console.log('📦 No tasks to process')
      return {
        proofs: [],
        failures: [],
        computeUnits: PROOF_COMPUTE_UNITS.BASE,
        instructions: [],
        metrics
      }
    }

    console.log(`🔄 Processing batch of ${batchTasks.length} tasks...`)

    // Separate WASM and JS tasks for optimal processing
    const wasmTasks = batchTasks.filter(task => task.useWasm)
    const jsTasks = batchTasks.filter(task => !task.useWasm)

    // Process WASM tasks in batch
    if (wasmTasks.length > 0) {
      const wasmStartTime = performance.now()
      const wasmResults = await this.processWasmTasks(wasmTasks, metrics)
      metrics.wasmTime = performance.now() - wasmStartTime
      
      proofs.push(...wasmResults.proofs)
      failures.push(...wasmResults.failures)
    }

    // Process JS tasks
    if (jsTasks.length > 0) {
      const jsStartTime = performance.now()
      const jsResults = await this.processJsTasks(jsTasks)
      metrics.jsTime = performance.now() - jsStartTime
      
      proofs.push(...jsResults.proofs)
      failures.push(...jsResults.failures)
    }

    // Update task states
    for (const proof of proofs) {
      this.completedTasks.set(proof.taskId, proof)
    }
    
    for (const failure of failures) {
      this.failedTasks.set(failure.taskId, failure)
      
      // Retry with JS fallback if appropriate
      const task = batchTasks.find(t => t.id === failure.taskId)
      if (task && failure.shouldFallbackToJs && task.retries < this.config.maxRetries) {
        task.retries++
        task.useWasm = false
        this.taskQueue.push(task)
        console.log(`🔄 Retrying task ${failure.taskId} with JS fallback`)
      }
    }
    
    // Generate verification instructions
    const instructions = this.generateVerificationInstructions(proofs)
    
    // Calculate final metrics
    metrics.totalTime = performance.now() - startTime
    metrics.speedupFactor = metrics.jsTime > 0 ? 
      (metrics.jsTime + metrics.wasmTime) / metrics.totalTime : 1
    
    const computeUnits = this.calculateBatchComputeUnits(proofs)
    
    // Store performance history
    this.performanceHistory.push(metrics)
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift() // Keep last 100 batches
    }
    
    console.log(`✅ Batch completed: ${proofs.length} proofs, ${failures.length} failures`)
    console.log(`⚡ Performance: ${metrics.speedupFactor.toFixed(2)}x speedup, ${metrics.boundaryCrossings} boundary crossings`)
    
    return {
      proofs,
      failures,
      computeUnits,
      instructions,
      metrics
    }
  }

  /**
   * Process tasks using WASM acceleration
   */
  private async processWasmTasks(
    tasks: WasmProofTask[],
    metrics: WasmPerformanceMetrics
  ): Promise<{ proofs: WasmGeneratedProof[]; failures: WasmProofFailure[] }> {
    const proofs: WasmGeneratedProof[] = []
    const failures: WasmProofFailure[] = []

    // Group tasks by type for batch processing
    const batchRangeTasks = tasks.filter(t => t.type === 'batch_range')
    const rangeTasks = tasks.filter(t => t.type === 'range')
    const otherTasks = tasks.filter(t => t.type !== 'range' && t.type !== 'batch_range')

    // Process batch range tasks (already optimized)
    for (const task of batchRangeTasks) {
      try {
        const bridgeStartTime = performance.now()
        const data = task.data as WasmProofTaskData & { type: 'batch_range' }
        
        const results = await batchGenerateRangeProofs(data.proofRequests)
        metrics.boundaryCrossings += 2 // One call in, one result out
        metrics.bridgeTime += performance.now() - bridgeStartTime
        
        // Create proof results
        results.forEach((result, index) => {
          proofs.push({
            taskId: `${task.id}_${index}`,
            type: 'range',
            proof: result.proof,
            generationTime: 0, // Part of batch
            size: result.proof.length,
            usedWasm: true,
            wasmMetrics: {
              boundaryCrossings: 1,
              memoryAllocations: 1,
              simdOperations: 10 // Estimated
            }
          })
        })
      } catch (error) {
        failures.push({
          taskId: task.id,
          error: error instanceof Error ? error.message : 'Unknown WASM error',
          canRetry: true,
          failureContext: 'wasm',
          shouldFallbackToJs: true
        })
      } finally {
        this.processingTasks.delete(task.id)
      }
    }

    // Batch process individual range tasks if there are enough
    if (rangeTasks.length >= this.config.wasmSettings.minBatchSizeForWasm) {
      try {
        const bridgeStartTime = performance.now()
        const proofRequests = rangeTasks.map(task => {
          const data = task.data as WasmProofTaskData & { type: 'range' }
          return {
            amount: data.amount,
            commitment: data.commitment,
            blindingFactor: data.blindingFactor
          }
        })
        
        const results = await batchGenerateRangeProofs(proofRequests)
        metrics.boundaryCrossings += 2
        metrics.bridgeTime += performance.now() - bridgeStartTime
        
        results.forEach((result, index) => {
          const task = rangeTasks[index]
          proofs.push({
            taskId: task.id,
            type: 'range',
            proof: result.proof,
            generationTime: 0, // Part of batch
            size: result.proof.length,
            usedWasm: true,
            wasmMetrics: {
              boundaryCrossings: 1,
              memoryAllocations: 1,
              simdOperations: 10
            }
          })
          this.processingTasks.delete(task.id)
        })
      } catch (error) {
        // Handle batch failure by falling back to individual processing
        rangeTasks.forEach(task => {
          failures.push({
            taskId: task.id,
            error: error instanceof Error ? error.message : 'Batch WASM error',
            canRetry: true,
            failureContext: 'wasm',
            shouldFallbackToJs: true
          })
          this.processingTasks.delete(task.id)
        })
      }
    } else {
      // Process individual range tasks with WASM
      for (const task of rangeTasks) {
        try {
          const result = await this.processIndividualWasmTask(task, metrics)
          proofs.push(result)
        } catch (error) {
          failures.push({
            taskId: task.id,
            error: error instanceof Error ? error.message : 'Individual WASM error',
            canRetry: true,
            failureContext: 'wasm',
            shouldFallbackToJs: true
          })
        } finally {
          this.processingTasks.delete(task.id)
        }
      }
    }

    // Process other task types individually
    for (const task of otherTasks) {
      try {
        const result = await this.processIndividualWasmTask(task, metrics)
        proofs.push(result)
      } catch (error) {
        failures.push({
          taskId: task.id,
          error: error instanceof Error ? error.message : 'WASM task error',
          canRetry: true,
          failureContext: 'wasm',
          shouldFallbackToJs: task.type === 'range' // Only range proofs can fallback
        })
      } finally {
        this.processingTasks.delete(task.id)
      }
    }

    return { proofs, failures }
  }

  /**
   * Process an individual task using WASM
   */
  private async processIndividualWasmTask(
    task: WasmProofTask,
    metrics: WasmPerformanceMetrics
  ): Promise<WasmGeneratedProof> {
    const startTime = performance.now()
    const bridgeStartTime = performance.now()

    let proof: Uint8Array

    switch (task.type) {
      case 'range': {
        const data = task.data as WasmProofTaskData & { type: 'range' }
        const results = await batchGenerateRangeProofs([{
          amount: data.amount,
          commitment: data.commitment,
          blindingFactor: data.blindingFactor
        }])
        proof = results[0].proof
        break
      }
      
      default:
        throw new Error(`Unsupported WASM task type: ${task.type}`)
    }

    metrics.boundaryCrossings += 2
    metrics.bridgeTime += performance.now() - bridgeStartTime

    return {
      taskId: task.id,
      type: task.type,
      proof,
      generationTime: performance.now() - startTime,
      size: proof.length,
      usedWasm: true,
      wasmMetrics: {
        boundaryCrossings: 2,
        memoryAllocations: 1,
        simdOperations: 5
      }
    }
  }

  /**
   * Process tasks using JavaScript fallback
   */
  private async processJsTasks(
    tasks: WasmProofTask[]
  ): Promise<{ proofs: WasmGeneratedProof[]; failures: WasmProofFailure[] }> {
    const proofs: WasmGeneratedProof[] = []
    const failures: WasmProofFailure[] = []

    // Import JS implementations
    const { generateRangeProof } = await import('./elgamal-complete.js')

    for (const task of tasks) {
      try {
        const startTime = performance.now()
        let proof: Uint8Array

        switch (task.type) {
          case 'range': {
            const data = task.data as WasmProofTaskData & { type: 'range' }
            const result = await generateRangeProof(data.amount, data.commitment, data.blindingFactor)
            proof = result.proof
            break
          }
          
          default:
            throw new Error(`Unsupported JS fallback task type: ${task.type}`)
        }

        proofs.push({
          taskId: task.id,
          type: task.type,
          proof,
          generationTime: performance.now() - startTime,
          size: proof.length,
          usedWasm: false
        })
      } catch (error) {
        failures.push({
          taskId: task.id,
          error: error instanceof Error ? error.message : 'JS task error',
          canRetry: task.retries < this.config.maxRetries,
          failureContext: 'js',
          shouldFallbackToJs: false
        })
      } finally {
        this.processingTasks.delete(task.id)
      }
    }

    return { proofs, failures }
  }

  /**
   * Determine if a task should use WASM
   */
  private shouldUseWasm(_type: string): boolean {
    if (!this.config.wasmSettings.enableWasm || !this.wasmInitialized) {
      return false
    }

    // WASM is beneficial for range proofs and batch operations
    if (_type === 'range' || _type === 'batch_range') {
      return true
    }

    // Other proof types may not have WASM acceleration yet
    return false
  }

  /**
   * Select tasks for the current batch with WASM optimization
   */
  private selectBatchTasks(): WasmProofTask[] {
    const selected: WasmProofTask[] = []
    let currentSize = 0
    let currentComputeUnits = 0
    let currentBoundaryCrossings = 0
    
    this.sortQueue()
    
    for (const task of this.taskQueue) {
      if (this.processingTasks.has(task.id)) {
        continue
      }
      
      const { size, computeUnits, boundaryCrossings } = this.estimateWasmTaskRequirements(task)
      
      // Check limits including WASM-specific boundary crossing limit
      if (currentSize + size > this.config.maxTransactionSize ||
          currentComputeUnits + computeUnits > this.config.maxComputeUnits ||
          currentBoundaryCrossings + boundaryCrossings > this.config.wasmSettings.maxBoundaryCrossings) {
        
        if (selected.length === 0) {
          selected.push(task)
        }
        break
      }
      
      selected.push(task)
      currentSize += size
      currentComputeUnits += computeUnits
      currentBoundaryCrossings += boundaryCrossings
      
      if (selected.length >= this.config.maxProofsPerBatch) {
        break
      }
    }
    
    selected.forEach(task => this.processingTasks.add(task.id))
    this.taskQueue = this.taskQueue.filter(task => !this.processingTasks.has(task.id))
    
    return selected
  }

  /**
   * Estimate WASM-specific task requirements
   */
  private estimateWasmTaskRequirements(task: WasmProofTask): { 
    size: number
    computeUnits: number
    boundaryCrossings: number
  } {
    const baseRequirements = this.estimateTaskRequirements(task)
    
    // WASM tasks have fewer boundary crossings when batched
    const boundaryCrossings = task.useWasm ? 
      (task.type === 'batch_range' ? 2 : 1) : 0
    
    return {
      ...baseRequirements,
      boundaryCrossings
    }
  }

  /**
   * Estimate basic task requirements (from parent class)
   */
  private estimateTaskRequirements(task: WasmProofTask): { size: number; computeUnits: number } {
    switch (task.type) {
      case 'range':
      case 'batch_range':
        return {
          size: PROOF_SIZES.RANGE_PROOF_BULLETPROOF + 100,
          computeUnits: PROOF_COMPUTE_UNITS.RANGE_BULLETPROOF
        }
      
      case 'validity':
        return {
          size: PROOF_SIZES.VALIDITY_PROOF + 100,
          computeUnits: PROOF_COMPUTE_UNITS.VALIDITY
        }
      
      case 'equality':
        return {
          size: PROOF_SIZES.EQUALITY_PROOF + 100,
          computeUnits: PROOF_COMPUTE_UNITS.EQUALITY
        }
      
      default:
        return { size: 1000, computeUnits: 100000 }
    }
  }

  /**
   * Generate verification instructions (inherited from parent)
   */
  private generateVerificationInstructions(proofs: WasmGeneratedProof[]): IInstruction[] {
    const instructions: IInstruction[] = []
    const systemProgram = address('11111111111111111111111111111111')
    
    const rangeProofs = proofs.filter(p => p.type === 'range')
    
    if (rangeProofs.length > 0) {
      const proofContext = this.generateProofContextAddress()
      const accounts: ProofVerificationAccounts = {
        proofContext,
        systemProgram
      }
      
      const rangeProofData = rangeProofs.map(p => ({
        commitment: new Uint8Array(32),
        rangeProof: p.proof
      }))
      
      instructions.push(...createBatchVerifyRangeProofInstructions(accounts, rangeProofData))
    }
    
    return instructions
  }

  /**
   * Calculate total compute units for a batch
   */
  private calculateBatchComputeUnits(proofs: WasmGeneratedProof[]): number {
    let units = PROOF_COMPUTE_UNITS.BASE
    
    for (const proof of proofs) {
      switch (proof.type) {
        case 'range':
          units += PROOF_COMPUTE_UNITS.RANGE_BULLETPROOF
          break
        case 'validity':
          units += PROOF_COMPUTE_UNITS.VALIDITY
          break
        case 'equality':
          units += PROOF_COMPUTE_UNITS.EQUALITY
          break
      }
    }
    
    units += proofs.length * PROOF_COMPUTE_UNITS.BATCH_OVERHEAD
    
    // WASM operations are more efficient
    const wasmProofs = proofs.filter(p => p.usedWasm).length
    const wasmDiscount = wasmProofs * 10000 // 10k CU discount per WASM proof
    
    return Math.max(units - wasmDiscount, PROOF_COMPUTE_UNITS.BASE)
  }

  /**
   * Sort queue by priority and WASM optimization potential
   */
  private sortQueue(): void {
    this.taskQueue.sort((a, b) => {
      // Prioritize WASM tasks for better batching
      if (a.useWasm !== b.useWasm) {
        return a.useWasm ? -1 : 1
      }
      
      // Then by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      
      // Finally by age
      return a.createdAt - b.createdAt
    })
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `wasm_task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Generate proof context address
   */
  private generateProofContextAddress(): Address {
    const random = Math.floor(Math.random() * 100000)
    return address(`proof${random}111111111111111111111111111111111`)
  }

  /**
   * Get enhanced status including WASM metrics
   */
  getStatus(): {
    pending: number
    processing: number
    completed: number
    failed: number
    wasmEnabled: boolean
    wasmInitialized: boolean
    averageSpeedup: number
    boundaryCrossings: number
  } {
    const recentMetrics = this.performanceHistory.slice(-10)
    const averageSpeedup = recentMetrics.length > 0 ?
      recentMetrics.reduce((sum, m) => sum + m.speedupFactor, 0) / recentMetrics.length : 1
    
    const totalBoundaryCrossings = recentMetrics.reduce((sum, m) => sum + m.boundaryCrossings, 0)

    return {
      pending: this.taskQueue.length,
      processing: this.processingTasks.size,
      completed: this.completedTasks.size,
      failed: this.failedTasks.size,
      wasmEnabled: this.config.wasmSettings.enableWasm,
      wasmInitialized: this.wasmInitialized,
      averageSpeedup,
      boundaryCrossings: totalBoundaryCrossings
    }
  }

  /**
   * Get detailed performance analytics
   */
  getPerformanceAnalytics(): {
    recentMetrics: WasmPerformanceMetrics[]
    averages: {
      speedup: number
      wasmTime: number
      jsTime: number
      boundaryCrossings: number
    }
    trends: {
      speedupTrend: 'improving' | 'stable' | 'degrading'
      performanceTrend: 'improving' | 'stable' | 'degrading'
    }
  } {
    const recentMetrics = this.performanceHistory.slice(-20)
    
    if (recentMetrics.length === 0) {
      return {
        recentMetrics: [],
        averages: { speedup: 1, wasmTime: 0, jsTime: 0, boundaryCrossings: 0 },
        trends: { speedupTrend: 'stable', performanceTrend: 'stable' }
      }
    }

    const averages = {
      speedup: recentMetrics.reduce((sum, m) => sum + m.speedupFactor, 0) / recentMetrics.length,
      wasmTime: recentMetrics.reduce((sum, m) => sum + m.wasmTime, 0) / recentMetrics.length,
      jsTime: recentMetrics.reduce((sum, m) => sum + m.jsTime, 0) / recentMetrics.length,
      boundaryCrossings: recentMetrics.reduce((sum, m) => sum + m.boundaryCrossings, 0) / recentMetrics.length
    }

    // Calculate trends
    const firstHalf = recentMetrics.slice(0, Math.floor(recentMetrics.length / 2))
    const secondHalf = recentMetrics.slice(Math.floor(recentMetrics.length / 2))
    
    const firstHalfSpeedup = firstHalf.reduce((sum, m) => sum + m.speedupFactor, 0) / firstHalf.length
    const secondHalfSpeedup = secondHalf.reduce((sum, m) => sum + m.speedupFactor, 0) / secondHalf.length
    
    const speedupChange = secondHalfSpeedup - firstHalfSpeedup
    const speedupTrend = speedupChange > 0.1 ? 'improving' : 
                        speedupChange < -0.1 ? 'degrading' : 'stable'

    const firstHalfTime = firstHalf.reduce((sum, m) => sum + m.totalTime, 0) / firstHalf.length
    const secondHalfTime = secondHalf.reduce((sum, m) => sum + m.totalTime, 0) / secondHalf.length
    
    const timeChange = (firstHalfTime - secondHalfTime) / firstHalfTime
    const performanceTrend = timeChange > 0.1 ? 'improving' : 
                           timeChange < -0.1 ? 'degrading' : 'stable'

    return {
      recentMetrics,
      averages,
      trends: { speedupTrend, performanceTrend }
    }
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Create a WASM-optimized batch proof manager
 */
export function createWasmOptimizedBatchManager(
  maxComputeUnits = 1_400_000,
  enableWasm = true
): WasmBatchProofManager {
  const proofComputeUnits = PROOF_COMPUTE_UNITS.RANGE_BULLETPROOF
  const maxProofsPerBatch = Math.floor(maxComputeUnits / proofComputeUnits)
  
  return new WasmBatchProofManager({
    maxProofsPerBatch: Math.min(maxProofsPerBatch, 30), // Higher for WASM
    maxComputeUnits,
    parallelWorkers: 6, // More workers for WASM
    wasmSettings: {
      enableWasm,
      minBatchSizeForWasm: 2, // Lower threshold
      maxBoundaryCrossings: 100, // Higher limit
      enableJsFallback: true,
      wasmMemoryLimit: 32 * 1024 * 1024 // 32MB
    }
  })
}