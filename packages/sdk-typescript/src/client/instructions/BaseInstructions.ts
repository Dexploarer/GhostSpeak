import type { Address } from '@solana/addresses'
import type { 
  IInstruction, 
  TransactionSigner,
  Rpc,
  GetLatestBlockhashApi,
  SendTransactionApi,
  GetAccountInfoApi,
  SimulateTransactionApi,
  GetFeeForMessageApi,
  GetProgramAccountsApi,
  GetEpochInfoApi,
  GetSignatureStatusesApi,
  RpcSubscriptions,
  SignatureNotificationsApi,
  SlotNotificationsApi,
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
import type { GhostSpeakConfig } from '../../types/index.js'
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
  protected get rpc(): Rpc<GetLatestBlockhashApi & SendTransactionApi & GetAccountInfoApi & SimulateTransactionApi & GetFeeForMessageApi & GetProgramAccountsApi & GetEpochInfoApi & GetSignatureStatusesApi> {
    return this.config.rpc as any
  }

  /**
   * Get the RPC subscriptions client
   */
  protected get rpcSubscriptions(): RpcSubscriptions<SignatureNotificationsApi & SlotNotificationsApi> | undefined {
    return this.config.rpcSubscriptions as any
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
    return this.config.commitment || 'confirmed'
  }

  /**
   * Get or create the send and confirm transaction function using factory pattern
   */
  private getSendAndConfirmTransaction() {
    if (!this._sendAndConfirmTransaction) {
      this._sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
        rpc: this.rpc as any,
        rpcSubscriptions: this.rpcSubscriptions as any
      })
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
      console.log(`📤 Sending REAL transaction with ${instructions.length} instructions`)
      console.log(`🔐 Using ${signers.length} signers`)
      console.log(`📍 Program ID: ${this.programId}`)
      console.log(`🌐 Commitment: ${this.commitment}`)
      
      // Step 1: Get latest blockhash using real RPC call
      console.log('🔗 Fetching latest blockhash...')
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send()
      console.log(`✅ Got blockhash: ${latestBlockhash.blockhash}`)

      // Step 2: Build transaction message using pipe pattern (2025 standard)
      console.log('🏗️ Building transaction message...')
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signers[0], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      )
      console.log('✅ Transaction message built')

      // Step 3: Sign transaction using 2025 pattern
      console.log('✍️ Signing transaction...')
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      console.log('✅ Transaction signed')

      // Step 4: Send and confirm using factory pattern
      console.log('📡 Sending transaction to blockchain...')
      const sendAndConfirmTransaction = this.getSendAndConfirmTransaction()
      const result = await sendAndConfirmTransaction(signedTransaction as any, {
        commitment: this.commitment,
        skipPreflight: false
      })

      // Extract signature from the transaction or result
      const signature = (result as any)?.signature || Object.values(signedTransaction.signatures || {})[0] || 'unknown_signature'
      
      // Detect cluster from RPC endpoint
      const rpcEndpoint = this.config.rpc?.toString() || 'mainnet-beta'
      const cluster = detectClusterFromEndpoint(rpcEndpoint)
      
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
        tx => setTransactionMessageFeePayer(feePayer || this.config.defaultFeePayer!, tx),
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
      return BigInt(fee || 0)
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
  ): Promise<any> {
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
      console.log(`   Compute units: ${simulation.unitsConsumed || 'N/A'}`)
      console.log(`   Logs: ${simulation.logs?.length || 0} entries`)
      
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
    console.log(`   Accounts: ${instruction.accounts?.length || 0}`)
    console.log(`   Data size: ${instruction.data?.length || 0} bytes`)
  }
}