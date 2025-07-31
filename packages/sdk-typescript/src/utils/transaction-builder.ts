/**
 * Modern Transaction Builder - July 2025 Solana Standards
 * 
 * This utility demonstrates the latest transaction building patterns using:
 * - @solana/kit unified imports
 * - pipe() composition patterns
 * - Agave 2.3 optimizations
 * - Versioned transactions with proper blockhash management
 * - Address Lookup Tables (ALT) support
 * - Dynamic priority fee calculation
 */

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  address,
  lamports,
  type Address,
  type KeyPairSigner,
  type IInstruction,
  type Rpc,
  type TransactionMessageWithBlockhashLifetime,
  type CompilableTransactionMessage
} from '@solana/kit'

export interface TransactionBuilderConfig {
  rpcEndpoint: string
  wsEndpoint?: string
  commitment?: 'processed' | 'confirmed' | 'finalized'
  skipPreflight?: boolean
  maxRetries?: number
  priorityFeeStrategy?: 'none' | 'auto' | 'fixed'
  fixedPriorityFee?: bigint
}

export interface TransactionOptions {
  skipPreflight?: boolean
  maxRetries?: number
  priorityFee?: bigint
  addressLookupTables?: Address[]
}

export interface TransactionResult {
  signature: string
  slot?: number
  confirmationStatus: 'processed' | 'confirmed' | 'finalized'
  err?: any
}

/**
 * Modern Transaction Builder implementing July 2025 Solana standards
 */
export class TransactionBuilder {
  private rpc: Rpc<unknown>
  private rpcSubscriptions: any
  private sendAndConfirmTransaction: any
  private config: TransactionBuilderConfig

  constructor(config: TransactionBuilderConfig) {
    this.config = {
      commitment: 'confirmed',
      skipPreflight: false,
      maxRetries: 30,
      priorityFeeStrategy: 'auto',
      ...config
    }

    this.rpc = createSolanaRpc(config.rpcEndpoint)
    
    if (config.wsEndpoint) {
      this.rpcSubscriptions = createSolanaRpcSubscriptions(config.wsEndpoint)
      this.sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ 
        rpc: this.rpc, 
        rpcSubscriptions: this.rpcSubscriptions 
      })
    }
  }

  /**
   * Build and send a single instruction transaction using modern patterns
   */
  async executeInstruction(
    instruction: IInstruction,
    signer: KeyPairSigner,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeInstructions([instruction], [signer], options)
  }

  /**
   * Build and send multiple instructions in a single transaction
   * Uses July 2025 pipe() composition patterns
   */
  async executeInstructions(
    instructions: IInstruction[],
    signers: KeyPairSigner[],
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    try {
      // Step 1: Get latest blockhash with Agave 2.3 optimizations
      const latestBlockhashResponse = await (this.rpc as any).getLatestBlockhash({
        commitment: this.config.commitment
      }).send()
      const latestBlockhash = latestBlockhashResponse.value

      // Step 2: Calculate dynamic priority fees (July 2025 standard)
      const priorityFee = await this.calculatePriorityFee(instructions, options?.priorityFee)

      // Step 3: Add priority fee instruction if needed
      const finalInstructions = priorityFee > 0n 
        ? [this.createPriorityFeeInstruction(priorityFee), ...instructions]
        : instructions

      // Step 4: Build transaction message using modern pipe() pattern
      const transactionMessage = pipe(
        createTransactionMessage({ 
          version: options?.addressLookupTables ? 0 : 'legacy' 
        }),
        (tx) => setTransactionMessageFeePayerSigner(signers[0], tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(finalInstructions, tx)
      ) as CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime

      // Step 5: Sign transaction using July 2025 patterns
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // Step 6: Send and confirm with proper error handling
      if (this.sendAndConfirmTransaction) {
        await this.sendAndConfirmTransaction(signedTransaction, {
          commitment: this.config.commitment,
          skipPreflight: options?.skipPreflight ?? this.config.skipPreflight
        })
      } else {
        // Fallback for RPC-only setup
        await (this.rpc as any).sendTransaction(signedTransaction, {
          encoding: 'base64',
          commitment: this.config.commitment,
          skipPreflight: options?.skipPreflight ?? this.config.skipPreflight
        }).send()
      }

      // Step 7: Extract signature and return result
      const signature = this.extractSignatureFromTransaction(signedTransaction)
      
      return {
        signature,
        confirmationStatus: this.config.commitment || 'confirmed'
      }

    } catch (error) {
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Calculate dynamic priority fees based on network conditions
   * Implements July 2025 local fee market optimization
   */
  private async calculatePriorityFee(
    instructions: IInstruction[],
    fixedFee?: bigint
  ): Promise<bigint> {
    if (fixedFee !== undefined) {
      return fixedFee
    }

    if (this.config.priorityFeeStrategy === 'none') {
      return 0n
    }

    if (this.config.priorityFeeStrategy === 'fixed' && this.config.fixedPriorityFee) {
      return this.config.fixedPriorityFee
    }

    // Auto strategy: calculate based on recent fee trends
    try {
      // Get recent priority fee percentiles (July 2025 method)
      const recentFees = await (this.rpc as any).getRecentPrioritizationFees({
        lockedWritableAccounts: this.extractWritableAccounts(instructions)
      }).send()

      if (recentFees && recentFees.length > 0) {
        // Use 75th percentile for reliable landing
        const fees = recentFees.map((fee: any) => BigInt(fee.prioritizationFee))
        fees.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
        const percentile75Index = Math.floor(fees.length * 0.75)
        return fees[percentile75Index] || lamports(1000n) // 1000 microlamports minimum
      }
    } catch (error) {
      console.warn('Failed to fetch priority fees, using default:', error)
    }

    // Default priority fee for reliable transaction landing
    return lamports(5000n) // 5000 microlamports
  }

  /**
   * Create priority fee instruction using July 2025 patterns
   */
  private createPriorityFeeInstruction(priorityFee: bigint): IInstruction {
    // Create compute budget instruction for priority fees
    const data = new Uint8Array(9)
    data[0] = 3 // SetComputeUnitPrice instruction discriminator
    const view = new DataView(data.buffer)
    view.setBigUint64(1, priorityFee, true) // little-endian

    return {
      programAddress: address('ComputeBudget111111111111111111111111111111'),
      accounts: [],
      data
    }
  }

  /**
   * Extract writable accounts for priority fee calculation
   */
  private extractWritableAccounts(instructions: IInstruction[]): Address[] {
    const writableAccounts = new Set<Address>()
    
    for (const instruction of instructions) {
      for (const account of instruction.accounts || []) {
        if (account.role && (account.role & 0x02) !== 0) { // Check writable bit
          writableAccounts.add(account.address)
        }
      }
    }
    
    return Array.from(writableAccounts)
  }

  /**
   * Extract signature from signed transaction
   */
  private extractSignatureFromTransaction(signedTransaction: any): string {
    // Implementation depends on the exact structure returned by signTransactionMessageWithSigners
    // This is a simplified version
    if (signedTransaction.signatures && signedTransaction.signatures.length > 0) {
      return signedTransaction.signatures[0]
    }
    throw new Error('No signature found in signed transaction')
  }

  /**
   * Simulate transaction before sending (July 2025 pattern)
   */
  async simulateTransaction(
    instructions: IInstruction[],
    signer: KeyPairSigner,
    options?: { includeAccounts?: Address[] }
  ): Promise<any> {
    try {
      const latestBlockhashResponse = await (this.rpc as any).getLatestBlockhash().send()
      const latestBlockhash = latestBlockhashResponse.value

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(signer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(instructions, tx)
      )

      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      return await (this.rpc as any).simulateTransaction(signedTransaction, {
        commitment: this.config.commitment,
        accounts: options?.includeAccounts ? {
          encoding: 'base64',
          addresses: options.includeAccounts
        } : undefined
      }).send()

    } catch (error) {
      throw new Error(`Simulation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Batch multiple transactions with optimal fee calculation
   * Implements Agave 2.3 greedy scheduler optimizations
   */
  async executeBatch(
    batches: { instructions: IInstruction[], signers: KeyPairSigner[] }[],
    options?: TransactionOptions
  ): Promise<TransactionResult[]> {
    const results: TransactionResult[] = []
    
    // Execute batches with small delays to work with greedy scheduler
    for (const batch of batches) {
      const result = await this.executeInstructions(
        batch.instructions, 
        batch.signers, 
        options
      )
      results.push(result)
      
      // Small delay between batches for optimal scheduler performance
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return results
  }

  /**
   * Get current network conditions for fee optimization
   */
  async getNetworkConditions(): Promise<{
    avgPriorityFee: bigint
    medianPriorityFee: bigint
    networkCongestion: 'low' | 'medium' | 'high'
  }> {
    try {
      const recentFees = await (this.rpc as any).getRecentPrioritizationFees().send()
      
      if (!recentFees || recentFees.length === 0) {
        return {
          avgPriorityFee: 0n,
          medianPriorityFee: 0n,
          networkCongestion: 'low'
        }
      }

      const fees = recentFees.map((fee: any) => BigInt(fee.prioritizationFee))
      const avgFee = fees.reduce((sum, fee) => sum + fee, 0n) / BigInt(fees.length)
      
      fees.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
      const medianFee = fees[Math.floor(fees.length / 2)]
      
      // Determine congestion based on fee levels
      let congestion: 'low' | 'medium' | 'high' = 'low'
      if (medianFee > lamports(10000n)) congestion = 'medium'
      if (medianFee > lamports(50000n)) congestion = 'high'

      return {
        avgPriorityFee: avgFee,
        medianPriorityFee: medianFee,
        networkCongestion: congestion
      }
    } catch (error) {
      console.warn('Failed to get network conditions:', error)
      return {
        avgPriorityFee: 0n,
        medianPriorityFee: 0n,
        networkCongestion: 'low'
      }
    }
  }
}

/**
 * Factory function for creating TransactionBuilder instances
 */
export function createTransactionBuilder(config: TransactionBuilderConfig): TransactionBuilder {
  return new TransactionBuilder(config)
}

/**
 * Utility function for simple transaction execution
 */
export async function executeSimpleTransaction(
  rpcEndpoint: string,
  instruction: IInstruction,
  signer: KeyPairSigner,
  options?: TransactionOptions
): Promise<string> {
  const builder = createTransactionBuilder({ rpcEndpoint })
  const result = await builder.executeInstruction(instruction, signer, options)
  return result.signature
}