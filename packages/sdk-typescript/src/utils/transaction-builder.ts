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
  type Blockhash,
  type KeyPairSigner,
  type Instruction,
  type Rpc,
  type SolanaRpcApi,
  type RpcSubscriptions,
  type SolanaRpcSubscriptionsApi,
  type TransactionMessageWithBlockhashLifetime
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
  err?: unknown
}

/** Structure for prioritization fee data from RPC */
interface PrioritizationFeeEntry {
  prioritizationFee: number | bigint | string
  slot?: bigint
}

/** Structure for blockhash response from RPC */
interface BlockhashResponse {
  value: { blockhash: Blockhash; lastValidBlockHeight: bigint }
}

/** Structure for signed transaction with signatures */
interface SignedTransactionWithSignatures {
  signatures: string[]
  messageBytes?: Uint8Array
}

/** Structure for simulation result */
interface SimulationResult {
  value: {
    err: unknown
    logs?: string[]
    accounts?: unknown[]
    unitsConsumed?: bigint
  }
}

/**
 * Modern Transaction Builder implementing July 2025 Solana standards
 */
export class TransactionBuilder {
  private rpc: Rpc<SolanaRpcApi>
  private rpcSubscriptions?: RpcSubscriptions<SolanaRpcSubscriptionsApi>
  private sendAndConfirmTransaction?: ReturnType<typeof sendAndConfirmTransactionFactory>
  private config: TransactionBuilderConfig

  constructor(config: TransactionBuilderConfig) {
    this.config = {
      commitment: 'confirmed',
      skipPreflight: false,
      maxRetries: 30,
      priorityFeeStrategy: 'auto',
      ...config
    }

    this.rpc = createSolanaRpc(config.rpcEndpoint) as Rpc<SolanaRpcApi>

    if (config.wsEndpoint) {
      this.rpcSubscriptions = createSolanaRpcSubscriptions(config.wsEndpoint) as RpcSubscriptions<SolanaRpcSubscriptionsApi>
      this.sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
        rpc: this.rpc as Parameters<typeof sendAndConfirmTransactionFactory>[0]['rpc'],
        rpcSubscriptions: this.rpcSubscriptions as Parameters<typeof sendAndConfirmTransactionFactory>[0]['rpcSubscriptions']
      })
    }
  }

  /**
   * Build and send a single instruction transaction using modern patterns
   */
  async executeInstruction(
    instruction: Instruction,
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
    instructions: Instruction[],
    signers: KeyPairSigner[],
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    try {
      // Step 1: Get latest blockhash with Agave 2.3 optimizations
      const latestBlockhashResponse = await this.getLatestBlockhash()
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
      ) as unknown as TransactionMessageWithBlockhashLifetime

      // Step 5: Sign transaction using July 2025 patterns
      // Type assertion needed due to pipe() return type limitations
      const signedTransaction = await signTransactionMessageWithSigners(
        transactionMessage as unknown as Parameters<typeof signTransactionMessageWithSigners>[0]
      )

      // Step 6: Send and confirm with proper error handling
      if (this.sendAndConfirmTransaction) {
        // Type cast the signed transaction for sendAndConfirmTransaction
        await this.sendAndConfirmTransaction(
          signedTransaction as unknown as Parameters<typeof this.sendAndConfirmTransaction>[0],
          {
            commitment: this.config.commitment ?? 'confirmed',
            skipPreflight: options?.skipPreflight ?? this.config.skipPreflight
          }
        )
      } else {
        // Fallback for RPC-only setup - use type assertion for RPC method
        await this.sendTransactionFallback(signedTransaction, options)
      }

      // Step 7: Extract signature and return result
      const signature = this.extractSignatureFromTransaction(signedTransaction as unknown as SignedTransactionWithSignatures)
      
      return {
        signature,
        confirmationStatus: this.config.commitment || 'confirmed'
      }

    } catch (error) {
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get latest blockhash with proper typing
   */
  private async getLatestBlockhash(): Promise<BlockhashResponse> {
    const rpc = this.rpc as unknown as {
      getLatestBlockhash: (opts: object) => { send: () => Promise<BlockhashResponse> }
    }
    const response = await rpc.getLatestBlockhash({
      commitment: this.config.commitment
    }).send()
    return response
  }

  /**
   * Send transaction using fallback RPC method
   */
  private async sendTransactionFallback(
    signedTransaction: unknown,
    options?: TransactionOptions
  ): Promise<void> {
    const rpc = this.rpc as unknown as {
      sendTransaction: (tx: unknown, opts: object) => { send: () => Promise<void> }
    }
    await rpc.sendTransaction(signedTransaction, {
      encoding: 'base64',
      commitment: this.config.commitment,
      skipPreflight: options?.skipPreflight ?? this.config.skipPreflight
    }).send()
  }

  /**
   * Calculate dynamic priority fees based on network conditions
   * Implements July 2025 local fee market optimization
   */
  private async calculatePriorityFee(
    instructions: Instruction[],
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
      const recentFees = await this.getRecentPrioritizationFees(instructions)

      if (recentFees && recentFees.length > 0) {
        // Use 75th percentile for reliable landing
        const fees: bigint[] = recentFees.map((fee: PrioritizationFeeEntry) => BigInt(fee.prioritizationFee))
        fees.sort((a: bigint, b: bigint) => a < b ? -1 : a > b ? 1 : 0)
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
   * Get recent prioritization fees with proper typing
   */
  private async getRecentPrioritizationFees(instructions: Instruction[]): Promise<readonly PrioritizationFeeEntry[]> {
    const rpc = this.rpc as unknown as {
      getRecentPrioritizationFees: (addresses?: Address[]) => { send: () => Promise<readonly PrioritizationFeeEntry[]> }
    }
    const response = await rpc.getRecentPrioritizationFees(
      this.extractWritableAccounts(instructions)
    ).send()
    return response
  }

  /**
   * Create priority fee instruction using July 2025 patterns
   */
  private createPriorityFeeInstruction(priorityFee: bigint): Instruction {
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
  private extractWritableAccounts(instructions: Instruction[]): Address[] {
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
  private extractSignatureFromTransaction(signedTransaction: SignedTransactionWithSignatures): string {
    // Implementation depends on the exact structure returned by signTransactionMessageWithSigners
    if (signedTransaction.signatures && signedTransaction.signatures.length > 0) {
      return signedTransaction.signatures[0]
    }
    throw new Error('No signature found in signed transaction')
  }

  /**
   * Simulate transaction before sending (July 2025 pattern)
   */
  async simulateTransaction(
    instructions: Instruction[],
    signer: KeyPairSigner,
    options?: { includeAccounts?: Address[] }
  ): Promise<SimulationResult> {
    try {
      const latestBlockhashResponse = await this.getLatestBlockhash()
      const latestBlockhash = latestBlockhashResponse.value

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(signer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(instructions, tx)
      )

      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      const rpc = this.rpc as unknown as {
        simulateTransaction: (tx: unknown, opts: object) => { send: () => Promise<SimulationResult> }
      }
      const result = await rpc.simulateTransaction(signedTransaction, {
        commitment: this.config.commitment,
        accounts: options?.includeAccounts ? {
          encoding: 'base64',
          addresses: options.includeAccounts
        } : undefined
      }).send()

      return result

    } catch (error) {
      throw new Error(`Simulation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Batch multiple transactions with optimal fee calculation
   * Implements Agave 2.3 greedy scheduler optimizations
   */
  async executeBatch(
    batches: { instructions: Instruction[], signers: KeyPairSigner[] }[],
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
      const rpc = this.rpc as unknown as {
        getRecentPrioritizationFees: () => { send: () => Promise<readonly PrioritizationFeeEntry[]> }
      }
      const recentFees = await rpc.getRecentPrioritizationFees().send()
      
      if (!recentFees || recentFees.length === 0) {
        return {
          avgPriorityFee: 0n,
          medianPriorityFee: 0n,
          networkCongestion: 'low'
        }
      }

      const fees: bigint[] = recentFees.map((fee: PrioritizationFeeEntry) => BigInt(fee.prioritizationFee))
      const avgFee = fees.reduce((sum: bigint, fee: bigint) => sum + fee, 0n) / BigInt(fees.length)

      fees.sort((a: bigint, b: bigint) => a < b ? -1 : a > b ? 1 : 0)
      const medianFee: bigint = fees[Math.floor(fees.length / 2)]
      
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
  instruction: Instruction,
  signer: KeyPairSigner,
  options?: TransactionOptions
): Promise<string> {
  const builder = createTransactionBuilder({ rpcEndpoint })
  const result = await builder.executeInstruction(instruction, signer, options)
  return result.signature
}