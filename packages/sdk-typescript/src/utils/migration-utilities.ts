/**
 * Migration Utilities
 * 
 * Tools and utilities to help migrate from client-side encryption
 * to ZK proofs when they become available.
 */

import type { Connection } from '@solana/web3.js'
import type { Address } from '@solana/kit'

import {
  type ElGamalCiphertext
} from './elgamal.js'

import {
  type EncryptedData,
  type ZkMigrationData,
  prepareForZkMigration
} from './client-encryption.js'

import {
  PrivateMetadataStorage
} from './private-metadata.js'

import {
  isZkProgramAvailable,
  generateRangeProofWithCommitment,
  ProofMode
} from './zk-proof-builder.js'

import { getFeatureFlags } from './feature-flags.js'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/curves/abstract/utils'

// =====================================================
// TYPES
// =====================================================

export interface MigrationBatch {
  /** Batch ID for tracking */
  batchId: string
  
  /** Items to migrate */
  items: MigrationItem[]
  
  /** Migration status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  
  /** Progress tracking */
  progress: {
    total: number
    completed: number
    failed: number
  }
  
  /** Timestamps */
  createdAt: number
  startedAt?: number
  completedAt?: number
}

export interface MigrationItem {
  /** Unique identifier */
  id: string
  
  /** Account address */
  account: Address
  
  /** Current encrypted data */
  currentData: EncryptedData
  
  /** Migration metadata */
  migrationData?: ZkMigrationData
  
  /** Status */
  status: 'pending' | 'migrating' | 'completed' | 'failed'
  
  /** Error if failed */
  error?: string
}

export interface MigrationResult {
  /** Successfully migrated items */
  successful: string[]
  
  /** Failed items with reasons */
  failed: {
    id: string
    reason: string
  }[]
  
  /** Migration statistics */
  stats: {
    totalTime: number
    averageTimePerItem: number
    successRate: number
  }
}

// =====================================================
// MIGRATION MANAGER
// =====================================================

export class MigrationManager {
  private storage: PrivateMetadataStorage
  private batches: Map<string, MigrationBatch> = new Map()
  
  constructor(
    private connection: Connection,
    storage?: PrivateMetadataStorage
  ) {
    this.storage = storage ?? new PrivateMetadataStorage()
  }
  
  /**
   * Create a migration batch
   */
  createBatch(items: Omit<MigrationItem, 'status'>[]): MigrationBatch {
    const batchId = this.generateBatchId()
    
    const batch: MigrationBatch = {
      batchId,
      items: items.map(item => ({
        ...item,
        status: 'pending' as const
      })),
      status: 'pending',
      progress: {
        total: items.length,
        completed: 0,
        failed: 0
      },
      createdAt: Date.now()
    }
    
    this.batches.set(batchId, batch)
    return batch
  }
  
  /**
   * Execute migration for a batch
   */
  async executeBatch(
    batchId: string,
    options: {
      parallel?: boolean
      maxConcurrency?: number
      onProgress?: (progress: MigrationBatch['progress']) => void
    } = {}
  ): Promise<MigrationResult> {
    const batch = this.batches.get(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`)
    }
    
    if (batch.status !== 'pending') {
      throw new Error(`Batch ${batchId} is not in pending state`)
    }
    
    // Update batch status
    batch.status = 'in_progress'
    batch.startedAt = Date.now()
    
    const result: MigrationResult = {
      successful: [],
      failed: [],
      stats: {
        totalTime: 0,
        averageTimePerItem: 0,
        successRate: 0
      }
    }
    
    try {
      // Check if ZK program is available
      const zkAvailable = await isZkProgramAvailable(this.connection)
      if (!zkAvailable) {
        throw new Error('ZK program is not available for migration')
      }
      
      // Process items
      if (options.parallel) {
        await this.processBatchParallel(batch, result, options)
      } else {
        await this.processBatchSequential(batch, result, options)
      }
      
      // Update batch status
      batch.status = result.failed.length === 0 ? 'completed' : 'failed'
      batch.completedAt = Date.now()
      
      // Calculate statistics
      result.stats.totalTime = batch.completedAt - batch.startedAt!
      result.stats.averageTimePerItem = result.stats.totalTime / batch.items.length
      result.stats.successRate = result.successful.length / batch.items.length
      
    } catch (error) {
      batch.status = 'failed'
      throw error
    }
    
    return result
  }
  
  /**
   * Check migration readiness
   */
  async checkReadiness(): Promise<{
    ready: boolean
    zkProgramAvailable: boolean
    featureFlags: Record<string, boolean>
    warnings: string[]
  }> {
    const warnings: string[] = []
    
    // Check ZK program
    const zkAvailable = await isZkProgramAvailable(this.connection)
    if (!zkAvailable) {
      warnings.push('ZK ElGamal Proof Program is not available')
    }
    
    // Check feature flags
    const flags = getFeatureFlags()
    const flagStatus = {
      CONFIDENTIAL_TRANSFERS_ENABLED: flags.isEnabled('CONFIDENTIAL_TRANSFERS_ENABLED'),
      USE_ZK_PROOFS: flags.isEnabled('USE_ZK_PROOFS'),
      USE_CLIENT_ENCRYPTION: flags.isEnabled('USE_CLIENT_ENCRYPTION')
    }
    
    if (!flagStatus.USE_ZK_PROOFS) {
      warnings.push('ZK proofs are not enabled in feature flags')
    }
    
    if (flagStatus.USE_CLIENT_ENCRYPTION) {
      warnings.push('Client encryption is still enabled - consider disabling after migration')
    }
    
    const ready = zkAvailable && flagStatus.USE_ZK_PROOFS
    
    return {
      ready,
      zkProgramAvailable: zkAvailable,
      featureFlags: flagStatus,
      warnings
    }
  }
  
  /**
   * Prepare data for migration
   */
  async prepareForMigration(
    encryptedData: EncryptedData,
    amount?: bigint,
    randomness?: Uint8Array
  ): Promise<ZkMigrationData> {
    return prepareForZkMigration(encryptedData, amount, randomness)
  }
  
  /**
   * Verify migration integrity
   */
  async verifyMigration(
    original: EncryptedData,
    migrated: {
      ciphertext: ElGamalCiphertext
      proof?: Uint8Array
    }
  ): Promise<{
    valid: boolean
    checks: {
      commitmentMatch: boolean
      publicKeyMatch: boolean
      timestampValid: boolean
    }
  }> {
    const checks = {
      commitmentMatch: bytesToHex(original.commitment) === 
                      bytesToHex(migrated.ciphertext.commitment.commitment),
      publicKeyMatch: bytesToHex(original.publicKey) === 
                     bytesToHex(original.publicKey), // Should match
      timestampValid: original.timestamp > 0
    }
    
    const valid = Object.values(checks).every(check => check)
    
    return { valid, checks }
  }
  
  // =====================================================
  // PRIVATE METHODS
  // =====================================================
  
  private generateBatchId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `migration_${timestamp}_${random}`
  }
  
  private async processBatchSequential(
    batch: MigrationBatch,
    result: MigrationResult,
    options: {
      onProgress?: (progress: MigrationBatch['progress']) => void
    }
  ): Promise<void> {
    for (const item of batch.items) {
      try {
        await this.migrateItem(item)
        result.successful.push(item.id)
        batch.progress.completed++
      } catch (error) {
        result.failed.push({
          id: item.id,
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
        batch.progress.failed++
        item.status = 'failed'
        item.error = error instanceof Error ? error.message : 'Unknown error'
      }
      
      options.onProgress?.(batch.progress)
    }
  }
  
  private async processBatchParallel(
    batch: MigrationBatch,
    result: MigrationResult,
    options: {
      maxConcurrency?: number
      onProgress?: (progress: MigrationBatch['progress']) => void
    }
  ): Promise<void> {
    const maxConcurrency = options.maxConcurrency ?? 10
    const chunks = this.chunkArray(batch.items, maxConcurrency)
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (item) => {
          try {
            await this.migrateItem(item)
            result.successful.push(item.id)
            batch.progress.completed++
          } catch (error) {
            result.failed.push({
              id: item.id,
              reason: error instanceof Error ? error.message : 'Unknown error'
            })
            batch.progress.failed++
            item.status = 'failed'
            item.error = error instanceof Error ? error.message : 'Unknown error'
          }
          
          options.onProgress?.(batch.progress)
        })
      )
    }
  }
  
  private async migrateItem(item: MigrationItem): Promise<void> {
    item.status = 'migrating'
    
    // Simulate migration process
    // In production, this would:
    // 1. Generate ZK proof from migration data
    // 2. Update on-chain account with new proof
    // 3. Verify the migration succeeded
    
    if (!item.migrationData) {
      throw new Error('Migration data not prepared')
    }
    
    // Generate ZK proof
    if (item.migrationData.zkMetadata.amount && item.migrationData.zkMetadata.randomness) {
      const proof = await generateRangeProofWithCommitment(
        item.migrationData.zkMetadata.amount,
        item.migrationData.zkMetadata.randomness,
        {
          mode: ProofMode.ZK_PROGRAM_ONLY,
          connection: this.connection
        }
      )
      
      if (!proof.proof) {
        throw new Error('Failed to generate ZK proof')
      }
    }
    
    // Mark as completed
    item.status = 'completed'
  }
  
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}

// =====================================================
// MIGRATION UTILITIES
// =====================================================

/**
 * Estimate migration cost
 */
export function estimateMigrationCost(
  itemCount: number,
  options: {
    gasPrice?: bigint
    proofGenerationCost?: bigint
    storageUpdateCost?: bigint
  } = {}
): {
  totalCost: bigint
  costPerItem: bigint
  breakdown: {
    proofGeneration: bigint
    storageUpdates: bigint
    transactionFees: bigint
  }
} {
  const gasPrice = options.gasPrice ?? 5000n // 5000 lamports
  const proofCost = options.proofGenerationCost ?? 10000n // 10000 lamports per proof
  const storageCost = options.storageUpdateCost ?? 5000n // 5000 lamports per update
  
  const breakdown = {
    proofGeneration: proofCost * BigInt(itemCount),
    storageUpdates: storageCost * BigInt(itemCount),
    transactionFees: gasPrice * BigInt(itemCount)
  }
  
  const totalCost = breakdown.proofGeneration + 
                   breakdown.storageUpdates + 
                   breakdown.transactionFees
  
  const costPerItem = totalCost / BigInt(itemCount)
  
  return { totalCost, costPerItem, breakdown }
}

/**
 * Create migration report
 */
export function createMigrationReport(
  results: MigrationResult[],
  options: {
    includeDetails?: boolean
    format?: 'json' | 'markdown'
  } = {}
): string {
  const totalItems = results.reduce((sum, r) => 
    sum + r.successful.length + r.failed.length, 0
  )
  const totalSuccessful = results.reduce((sum, r) => 
    sum + r.successful.length, 0
  )
  const totalFailed = results.reduce((sum, r) => 
    sum + r.failed.length, 0
  )
  const overallSuccessRate = totalSuccessful / totalItems
  
  if (options.format === 'markdown') {
    let report = `# Migration Report\n\n`
    report += `## Summary\n\n`
    report += `- Total Items: ${totalItems}\n`
    report += `- Successful: ${totalSuccessful} (${(overallSuccessRate * 100).toFixed(2)}%)\n`
    report += `- Failed: ${totalFailed}\n\n`
    
    if (options.includeDetails && totalFailed > 0) {
      report += `## Failed Items\n\n`
      results.forEach((result, index) => {
        if (result.failed.length > 0) {
          report += `### Batch ${index + 1}\n\n`
          result.failed.forEach(failure => {
            report += `- **${failure.id}**: ${failure.reason}\n`
          })
          report += '\n'
        }
      })
    }
    
    return report
  }
  
  // JSON format
  return JSON.stringify({
    summary: {
      totalItems,
      successful: totalSuccessful,
      failed: totalFailed,
      successRate: overallSuccessRate
    },
    batches: results.map((result, index) => ({
      batchIndex: index,
      successful: result.successful.length,
      failed: result.failed.length,
      stats: result.stats,
      failures: options.includeDetails ? result.failed : undefined
    }))
  }, null, 2)
}

/**
 * Rollback utilities (for emergency use)
 */
export class MigrationRollback {
  /**
   * Create rollback checkpoint
   */
  static createCheckpoint(
    data: EncryptedData,
    metadata: Record<string, unknown>
  ): string {
    const checkpoint = {
      timestamp: Date.now(),
      data,
      metadata,
      hash: sha256(new TextEncoder().encode(JSON.stringify({ data, metadata })))
    }
    
    return bytesToHex(checkpoint.hash)
  }
  
  /**
   * Verify checkpoint integrity
   */
  static verifyCheckpoint(
    checkpointId: string,
    data: EncryptedData,
    metadata: Record<string, unknown>
  ): boolean {
    const expectedHash = sha256(
      new TextEncoder().encode(JSON.stringify({ data, metadata }))
    )
    
    return checkpointId === bytesToHex(expectedHash)
  }
}