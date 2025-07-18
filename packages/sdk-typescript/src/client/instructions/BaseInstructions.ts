import type { Address } from '@solana/addresses'
import type { 
  IInstruction, 
  TransactionSigner,
  TransactionMessage,
  Signature
} from '@solana/kit'
import { 
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  compileTransactionMessage
} from '@solana/kit'
import type { GhostSpeakConfig, ExtendedRpcApi, RpcSubscriptionApi } from '../../types/index.js'
import { 
  createTransactionResult, 
  logTransactionDetails, 
  detectClusterFromEndpoint,
  type TransactionResult 
} from '../../utils/transaction-urls.js'

/**
 * Base class for all instruction modules using real 2025 Web3.js v2 transaction execution
 */
export abstract class BaseInstructions {
  protected config: GhostSpeakConfig
  private _sendAndConfirmTransaction: ReturnType<typeof sendAndConfirmTransactionFactory> | null = null

  constructor(config: GhostSpeakConfig) {
    this.config = config
  }

  /**
   * Get the RPC client
   */
  protected get rpc(): ExtendedRpcApi {
    return this.config.rpc
  }

  /**
   * Get the RPC subscriptions client
   */
  protected get rpcSubscriptions(): RpcSubscriptionApi | undefined {
    return this.config.rpcSubscriptions
  }

  /**
   * Get the program ID
   */
  protected get programId(): Address {
    return this.config.programId!
  }

  /**
   * Get the commitment level
   */
  protected get commitment() {
    return this.config.commitment ?? 'confirmed'
  }

  /**
   * Get or create the send and confirm transaction function using factory pattern
   */
  private getSendAndConfirmTransaction() {
    if (!this._sendAndConfirmTransaction) {
      // Only pass rpcSubscriptions if they exist and are valid
      if (this.rpcSubscriptions) {
        const factoryConfig = { rpc: this.rpc, rpcSubscriptions: this.rpcSubscriptions }
        try {
          this._sendAndConfirmTransaction = sendAndConfirmTransactionFactory(factoryConfig)
        } catch {
          // Fallback to RPC-only mode if subscriptions fail  
          this._sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ 
            rpc: this.rpc, 
            rpcSubscriptions: this.rpcSubscriptions 
          })
        }
      } else {
        // Use RPC-only mode when no subscriptions available
        this._sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ 
          rpc: this.rpc,
          rpcSubscriptions: undefined
        } as any)
      }
    }
    return this._sendAndConfirmTransaction
  }

  /**
   * Send a transaction with instructions and signers using REAL Web3.js v2 patterns
   * Returns transaction result with verification URLs
   */
  protected async sendTransaction(
    instructions: IInstruction[],
    signers: TransactionSigner[]
  ): Promise<Signature> {
    return this.sendTransactionWithDetails(instructions, signers).then(result => result.signature)
  }

  /**
   * Send a transaction and return complete result with verification URLs
   */
  protected async sendTransactionWithDetails(
    instructions: IInstruction[],
    signers: TransactionSigner[]
  ): Promise<TransactionResult> {
    try {
      // Validate instructions
      for (let i = 0; i < instructions.length; i++) {
        const instruction = instructions[i]
        if (!instruction) {
          throw new Error(`Instruction at index ${i} is undefined`)
        }
        if (!instruction.programAddress) {
          throw new Error(`Instruction at index ${i} has no programAddress`)
        }
        if (!instruction.accounts) {
          throw new Error(`Instruction at index ${i} has no accounts array`)
        }
        if (!Array.isArray(instruction.accounts)) {
          throw new Error(`Instruction at index ${i} accounts is not an array`)
        }
      }
      
      // Step 1: Get latest blockhash using real RPC call
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send()

      // Step 2: Build transaction message using pipe pattern (2025 standard)
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signers[0], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      )

      // Step 3: Sign transaction using 2025 pattern
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // Step 4: Send and confirm using factory pattern
      
      let result: unknown
      let signature: Signature
      
      // If no subscriptions available, use polling method with exponential backoff
      if (!this.rpcSubscriptions) {
        
        // Send transaction first
        const transactionSignature = await this.rpc.sendTransaction(signedTransaction as any, {
          skipPreflight: false,
          preflightCommitment: this.commitment
        }).send()
        
        // Poll for confirmation with exponential backoff and better error handling
        let confirmed = false
        let attempts = 0
        const maxAttempts = 30
        const baseDelay = 1000 // 1 second
        let currentDelay = baseDelay
        
        while (!confirmed && attempts < maxAttempts) {
          try {
            const status = await this.rpc.getSignatureStatuses([transactionSignature]).send()
            
            if (status.value[0]) {
              const confirmationStatus = status.value[0].confirmationStatus
              const err = status.value[0].err
              
              // Check for transaction errors
              if (err) {
                throw new Error(`Transaction failed: ${JSON.stringify(err)}`)
              }
              
              // Check for confirmation
              if (confirmationStatus === this.commitment || 
                  (this.commitment === 'confirmed' && confirmationStatus === 'finalized')) {
                confirmed = true
                console.log('✅ Transaction confirmed!')
                break
              }
            }
            
            // Transaction still pending, wait with exponential backoff
            attempts++
            console.log(`⏳ Waiting for confirmation... (${attempts}/${maxAttempts})`)
            await new Promise(resolve => setTimeout(resolve, currentDelay))
            
            // Exponential backoff with max delay of 5 seconds
            currentDelay = Math.min(currentDelay * 1.5, 5000)
            
          } catch (statusError: unknown) {
            // Handle RPC errors gracefully
            const errorMessage = statusError instanceof Error ? statusError.message : String(statusError)
            if (errorMessage.includes('Transaction failed')) {
              throw statusError // Re-throw transaction failures
            }
            
            attempts++
            console.warn(`⚠️ Status check failed (${attempts}/${maxAttempts}): ${errorMessage}`)
            
            // Wait longer after RPC errors
            await new Promise(resolve => setTimeout(resolve, currentDelay * 2))
          }
        }
        
        if (!confirmed) {
          throw new Error(`Transaction confirmation timeout after ${maxAttempts} attempts. Signature: ${transactionSignature}`)
        }
        
        signature = transactionSignature as Signature
      } else {
        // Use subscriptions for faster confirmation
        const sendAndConfirmTransaction = this.getSendAndConfirmTransaction()
        result = await sendAndConfirmTransaction(signedTransaction as any, {
          commitment: this.commitment,
          skipPreflight: false
        })
        
        // Extract signature from the transaction or result safely
        if (result && typeof result === 'object' && 'signature' in result) {
          signature = result.signature as Signature
        } else if (signedTransaction.signatures && typeof signedTransaction.signatures === 'object') {
          const signatures = Object.values(signedTransaction.signatures)
          if (signatures.length > 0 && typeof signatures[0] === 'string') {
            signature = signatures[0] as Signature
          } else {
            throw new Error('Unable to extract transaction signature')
          }
        } else {
          throw new Error('Transaction result missing signature')
        }
      }
      
      // Detect cluster from RPC endpoint or config
      const cluster = this.config.cluster ?? 
        (this.config.rpcEndpoint ? detectClusterFromEndpoint(this.config.rpcEndpoint) : 'devnet')
      
      // Create complete transaction result with verification URLs
      const transactionResult = createTransactionResult(
        signature as Signature,
        cluster,
        this.commitment
      )
      
      // Log transaction details with clickable URLs
      logTransactionDetails(transactionResult)
      
      return transactionResult
    } catch (error) {
      console.error('❌ Transaction failed:', error)
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Estimate transaction cost using REAL RPC calls
   */
  protected async estimateTransactionCost(
    instructions: IInstruction[],
    feePayer?: Address
  ): Promise<bigint> {
    try {
      console.log(`💰 Estimating REAL cost for ${instructions.length} instructions`)
      
      // Get real blockhash for accurate fee estimation
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send()
      
      // Build transaction message for fee estimation
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(feePayer ?? this.config.defaultFeePayer!, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      )

      // Compile message to get size for fee calculation
      const compiledMessage = compileTransactionMessage(transactionMessage)
      
      // Get real fee from RPC
      const { value: fee } = await this.rpc.getFeeForMessage(compiledMessage as any, {
        commitment: this.commitment
      }).send()
      
      console.log(`💳 Real estimated fee: ${fee} lamports`)
      return BigInt(fee ?? 0)
    } catch (error) {
      console.warn('⚠️ Real fee estimation failed, using fallback:', error)
      // Fallback to reasonable estimate if RPC fails
      const baseFee = 5000n
      const perInstructionFee = 1000n
      return baseFee + (BigInt(instructions.length) * perInstructionFee)
    }
  }

  /**
   * Simulate a transaction before sending using REAL RPC simulation
   */
  protected async simulateTransaction(
    instructions: IInstruction[],
    signers: TransactionSigner[]
  ): Promise<unknown> {
    try {
      console.log(`🧪 Running REAL simulation with ${instructions.length} instructions`)
      
      // Get real blockhash
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send()
      
      // Build transaction message
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signers[0], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      )

      // Sign for simulation
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // Run real simulation
      const { value: simulation } = await this.rpc.simulateTransaction(signedTransaction as any, {
        commitment: this.commitment,
        encoding: 'base64',
        replaceRecentBlockhash: true
      }).send()

      console.log(`✅ Real simulation completed:`)
      console.log(`   Success: ${!simulation.err}`)
      console.log(`   Compute units: ${simulation.unitsConsumed ?? 'N/A'}`)
      console.log(`   Logs: ${simulation.logs?.length ?? 0} entries`)
      
      return simulation
    } catch (error) {
      console.error('❌ Real simulation failed:', error)
      throw new Error(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send multiple transactions in sequence with real blockchain execution
   */
  protected async sendTransactionBatch(
    instructionBatches: IInstruction[][],
    signers: TransactionSigner[]
  ): Promise<Signature[]> {
    console.log(`🔄 Sending REAL batch of ${instructionBatches.length} transactions`)
    const signatures: Signature[] = []
    
    for (let i = 0; i < instructionBatches.length; i++) {
      console.log(`📤 Processing REAL transaction ${i + 1}/${instructionBatches.length}`)
      try {
        const signature = await this.sendTransaction(instructionBatches[i], signers)
        signatures.push(signature)
        console.log(`✅ Batch transaction ${i + 1} confirmed: ${signature}`)
      } catch (error) {
        console.error(`❌ Batch transaction ${i + 1} failed:`, error)
        throw new Error(`Batch transaction ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    console.log(`🎉 REAL batch complete: ${signatures.length} transactions confirmed`)
    return signatures
  }

  /**
   * Build a transaction message without sending it (useful for advanced use cases)
   */
  protected async buildTransactionMessage(
    instructions: IInstruction[],
    feePayer: Address
  ): Promise<TransactionMessage> {
    console.log('🏗️ Building transaction message without sending...')
    
    const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send()
    
    const transactionMessage = await pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(feePayer, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstructions(instructions, tx)
    )
    
    console.log('✅ Transaction message built (not sent)')
    return transactionMessage
  }

  /**
   * Log instruction details for debugging
   */
  protected logInstructionDetails(instruction: IInstruction): void {
    console.log(`📋 Instruction Details:`)
    console.log(`   Program: ${instruction.programAddress}`)
    console.log(`   Accounts: ${instruction.accounts?.length ?? 0}`)
    console.log(`   Data size: ${instruction.data?.length ?? 0} bytes`)
    if (instruction.accounts) {
      instruction.accounts.forEach((account, index) => {
        console.log(`   Account ${index}: ${JSON.stringify(account)}`)
      })
    }
  }

  // =====================================================
  // COMMON ACCOUNT OPERATIONS (Reduces duplication across instruction modules)
  // =====================================================

  /**
   * Get and decode a single account using provided decoder
   * Centralizes the common pattern used across all instruction modules
   */
  protected async getDecodedAccount<T>(
    address: Address,
    decoderImportName: string,
    commitment = this.commitment
  ): Promise<T | null> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const generated = await import('../../generated/index.js')
      const decoder = (generated as any)[decoderImportName]()
      
      if (!decoder) {
        throw new Error(`Decoder ${decoderImportName} not found in generated imports`)
      }
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      return await rpcClient.getAndDecodeAccount(address, decoder, commitment)
    } catch (error) {
      console.warn(`Failed to fetch account ${address}:`, error)
      return null
    }
  }

  /**
   * Get and decode multiple accounts of the same type
   * Centralizes batch account fetching pattern
   */
  protected async getDecodedAccounts<T>(
    addresses: Address[],
    decoderImportName: string,
    commitment = this.commitment
  ): Promise<(T | null)[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const generated = await import('../../generated/index.js')
      const decoder = (generated as any)[decoderImportName]()
      
      if (!decoder) {
        throw new Error(`Decoder ${decoderImportName} not found in generated imports`)
      }
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      return await rpcClient.getAndDecodeAccounts(addresses, decoder, commitment)
    } catch (error) {
      console.warn('Failed to fetch multiple accounts:', error)
      return addresses.map(() => null)
    }
  }

  /**
   * Get and decode program accounts with optional filters
   * Centralizes program account scanning pattern
   */
  protected async getDecodedProgramAccounts<T>(
    decoderImportName: string,
    filters: unknown[] = [],
    commitment = this.commitment
  ): Promise<{ address: Address; data: T }[]> {
    try {
      const { GhostSpeakRpcClient } = await import('../../utils/rpc.js')
      const generated = await import('../../generated/index.js')
      const decoder = (generated as any)[decoderImportName]()
      
      if (!decoder) {
        throw new Error(`Decoder ${decoderImportName} not found in generated imports`)
      }
      
      const rpcClient = new GhostSpeakRpcClient(this.rpc)
      return await rpcClient.getAndDecodeProgramAccounts(
        this.programId,
        decoder,
        filters,
        commitment
      )
    } catch (error) {
      console.warn(`Failed to fetch program accounts for ${this.programId}:`, error)
      return []
    }
  }

  /**
   * Execute a single instruction with standard error handling
   * Centralizes the common instruction execution pattern
   */
  protected async executeInstruction(
    instructionGetter: () => unknown,
    signer: TransactionSigner,
    context?: string
  ): Promise<Signature> {
    try {
      const instruction = instructionGetter()
      return await this.sendTransaction(
        [instruction as unknown as IInstruction], 
        [signer]
      )
    } catch (error) {
      const operation = context ?? 'instruction execution'
      console.error(`❌ Failed to execute ${operation}:`, error)
      throw error
    }
  }

  /**
   * Execute a single instruction and return detailed results
   * Centralizes the common pattern for detailed transaction results
   */
  protected async executeInstructionWithDetails(
    instructionGetter: () => unknown,
    signer: TransactionSigner,
    context?: string
  ): Promise<TransactionResult> {
    try {
      const instruction = instructionGetter()
      return await this.sendTransactionWithDetails(
        [instruction as unknown as IInstruction], 
        [signer]
      )
    } catch (error) {
      const operation = context ?? 'instruction execution'
      console.error(`❌ Failed to execute ${operation}:`, error)
      throw error
    }
  }
}