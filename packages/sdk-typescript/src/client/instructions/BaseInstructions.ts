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
  compileTransactionMessage,
  getBase64EncodedWireTransaction
} from '@solana/kit'
import type { GhostSpeakConfig, ExtendedRpcApi, RpcSubscriptionApi } from '../../types/index.js'
import { 
  createTransactionResult, 
  logTransactionDetails, 
  detectClusterFromEndpoint,
  type TransactionResult 
} from '../../utils/transaction-urls.js'
import { SimpleRpcClient } from '../../utils/simple-rpc-client.js'
import type { EncodedAccount } from '@solana/kit'

// Simulation result interface matching Solana RPC response
interface SimulationResult {
  value: {
    err: unknown | null
    logs: string[] | null
    unitsConsumed?: bigint
  }
}

/**
 * Base class for all instruction modules using real 2025 Web3.js v2 transaction execution
 */
export abstract class BaseInstructions {
  protected config: GhostSpeakConfig
  private _sendAndConfirmTransaction: ReturnType<typeof sendAndConfirmTransactionFactory> | null = null
  private _rpcClient: SimpleRpcClient | null = null

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
   * Get or create the Solana RPC client instance
   */
  protected getRpcClient(): SimpleRpcClient {
    this._rpcClient ??= new SimpleRpcClient({
      endpoint: this.config.rpcEndpoint ?? 'https://api.devnet.solana.com',
      wsEndpoint: this.config.rpcSubscriptions ? undefined : undefined, // WebSocket endpoint from config if available
      commitment: this.config.commitment ?? 'confirmed'
    })
    return this._rpcClient
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
          rpcSubscriptions: null as never
        })
      }
    }
    return this._sendAndConfirmTransaction
  }

  /**
   * Calculate estimated transaction size for validation
   */
  protected estimateTransactionSize(instructions: IInstruction[]): number {
    let totalSize = 64 // Base transaction overhead
    
    for (const instruction of instructions) {
      totalSize += 32 // Program ID
      totalSize += (instruction.accounts?.length ?? 0) * 32 // Account metas
      totalSize += instruction.data?.length ?? 0 // Instruction data
    }
    
    return totalSize
  }

  /**
   * Send a transaction with instructions and signers using REAL Web3.js v2 patterns
   * Returns transaction result with verification URLs
   */
  protected async sendTransaction(
    instructions: IInstruction[],
    signers: TransactionSigner[]
  ): Promise<Signature> {
    // Check transaction size before sending
    const estimatedSize = this.estimateTransactionSize(instructions)
    if (estimatedSize > 1232) {
      console.warn(`⚠️ Transaction size (${estimatedSize} bytes) may exceed Solana limit (1232 bytes)`)
    }
    
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
      const rpcClient = this.getRpcClient()
      const latestBlockhash = await rpcClient.getLatestBlockhash()

      // Step 2: Build transaction message using pipe pattern (2025 standard)
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signers[0], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      )

      // Step 3: Sign transaction using 2025 pattern
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      
      // Debug: Log instruction data
      console.log('📝 Debug - Instruction data:')
      instructions.forEach((instr, idx) => {
        console.log(`   Instruction ${idx}: data length = ${instr.data?.length ?? 0} bytes`)
        if (instr.data) {
          // Log first 50 bytes of data in hex
          const hexData = Buffer.from(instr.data as Uint8Array).toString('hex').substring(0, 100)
          console.log(`   Data (hex): ${hexData}...`)
        }
      })

      // Step 4: Send and confirm using factory pattern
      
      let result: unknown
      let signature: Signature
      
      // If no subscriptions available, use polling method with exponential backoff
      if (!this.rpcSubscriptions) {
        
        // Convert signed transaction to wire format
        const wireTransaction = getBase64EncodedWireTransaction(signedTransaction)
        
        // Debug: Log the wire transaction
        console.log('🔍 Debug - Wire transaction:')
        console.log(`   Base64 length: ${wireTransaction.length}`)
        console.log(`   First 100 chars: ${wireTransaction.substring(0, 100)}`)
        
        // Send transaction first
        const transactionSignature = await rpcClient.sendTransaction(wireTransaction, {
          skipPreflight: false,
          preflightCommitment: this.commitment
        })
        
        // Poll for confirmation with exponential backoff and better error handling
        let confirmed = false
        let attempts = 0
        const maxAttempts = 30
        const baseDelay = 1000 // 1 second
        let currentDelay = baseDelay
        
        while (!confirmed && attempts < maxAttempts) {
          try {
            const statuses = await rpcClient.getSignatureStatuses([transactionSignature as Signature])
            
            if (statuses[0]) {
              const confirmationStatus = statuses[0].confirmationStatus
              const err = statuses[0].err
              
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
        result = await sendAndConfirmTransaction(signedTransaction, {
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
      const rpcClient = this.getRpcClient()
      const latestBlockhash = await rpcClient.getLatestBlockhash()
      
      // Build transaction message for fee estimation
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(feePayer ?? this.config.defaultFeePayer!, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      )

      // Compile and encode message for fee calculation
      const compiledMessage = compileTransactionMessage(transactionMessage)
      const encodedMessage = Buffer.from(compiledMessage as unknown as Uint8Array).toString('base64')
      
      // Get real fee from RPC
      const fee = await rpcClient.getFeeForMessage(encodedMessage)
      
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
      const rpcClient = this.getRpcClient()
      const latestBlockhash = await rpcClient.getLatestBlockhash()
      
      // Build transaction message
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signers[0], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      )

      // Sign for simulation
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      
      // Convert to wire format for simulation
      const wireTransaction = getBase64EncodedWireTransaction(signedTransaction)

      // Run real simulation
      const simulation = await rpcClient.simulateTransaction(wireTransaction, {
        commitment: this.commitment,
        replaceRecentBlockhash: true
      })

      console.log(`✅ Real simulation completed:`)
      console.log(`   Success: ${!(simulation as SimulationResult).value.err}`)
      console.log(`   Compute units: ${(simulation as SimulationResult).value.unitsConsumed ?? 'N/A'}`)
      console.log(`   Logs: ${(simulation as SimulationResult).value.logs?.length ?? 0} entries`)
      
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
    
    const rpcClient = this.getRpcClient()
    const latestBlockhash = await rpcClient.getLatestBlockhash()
    
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
      const generated = await import('../../generated/index.js')
      const decoderGetter = (generated as Record<string, unknown>)[decoderImportName] as (() => { decode: (data: Uint8Array | Buffer) => T }) | undefined
      
      if (!decoderGetter || typeof decoderGetter !== 'function') {
        console.warn(`Decoder ${decoderImportName} not found in generated decoders`)
        return null
      }
      
      const rpcClient = this.getRpcClient()
      const accountInfo = await rpcClient.getAccountInfo(address, { commitment })
      
      if (!accountInfo) return null
      
      // Decode the account data
      const decoder = decoderGetter()
      // Handle parsed data vs raw data
      const rawData = Buffer.isBuffer(accountInfo.data) || accountInfo.data instanceof Uint8Array
        ? accountInfo.data
        : Buffer.from((accountInfo.data as { data?: string }).data ?? accountInfo.data as unknown as string, 'base64')
      
      return decoder.decode(rawData)
    } catch (error) {
      // Check if this is a discriminator validation error that should be handled by safe decoding
      if (error instanceof Error && error.message.includes('expected 8 bytes, got')) {
        // Rethrow discriminator errors so they can be caught by safe decoding fallback
        throw error
      }
      
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
      const generated = await import('../../generated/index.js')
      const decoderGetter = (generated as Record<string, unknown>)[decoderImportName] as (() => { decode: (data: Uint8Array | Buffer) => T }) | undefined
      
      if (!decoderGetter || typeof decoderGetter !== 'function') {
        console.warn(`Decoder ${decoderImportName} not found in generated decoders`)
        return addresses.map(() => null)
      }
      
      const rpcClient = this.getRpcClient()
      const accounts = await rpcClient.getMultipleAccounts(addresses, { commitment })
      
      // Decode each account
      const decoder = decoderGetter()
      return accounts.map(accountInfo => {
        if (!accountInfo) return null
        try {
          // Handle parsed data vs raw data
          const rawData = Buffer.isBuffer(accountInfo.data) || accountInfo.data instanceof Uint8Array
            ? accountInfo.data
            : Buffer.from((accountInfo.data as { data?: string }).data ?? accountInfo.data as unknown as string, 'base64')
          
          return decoder.decode(rawData)
        } catch {
          return null
        }
      })
    } catch (error) {
      console.warn('Failed to fetch multiple accounts:', error)
      return addresses.map(() => null)
    }
  }

  /**
   * Get and decode program accounts with optional filters
   * Centralizes program account scanning pattern
   * NOTE: Temporarily simplified due to RPC client complexity
   */
  protected async getDecodedProgramAccounts<T>(
    decoderImportName: string,
    filters: unknown[] = [],
    commitment = this.commitment
  ): Promise<{ address: Address; data: T }[]> {
    try {
      console.log(`Getting program accounts with decoder: ${decoderImportName}`)
      console.log(`Filters: ${JSON.stringify(filters)}`)
      console.log(`Commitment: ${commitment}`)
      
      // Ensure RPC client is initialized
      const rpcClient = this.getRpcClient()
      
      // Get all program accounts from the blockchain
      const accounts = await rpcClient.getProgramAccounts(this.config.programId!, {
        commitment,
        filters: filters as { memcmp?: { offset: number; bytes: string } | { dataSize: number } }[]
      })
      
      console.log(`Found ${Array.isArray(accounts) ? accounts.length : 0} program accounts`)
      
      // Import the decoder and decode each account
      try {
        const generated = await import('../../generated/index.js')
        const decoderGetter = (generated as Record<string, unknown>)[decoderImportName] as (() => { decode: (data: Uint8Array | Buffer) => T }) | undefined
        
        if (!decoderGetter || typeof decoderGetter !== 'function') {
          console.warn(`Decoder ${decoderImportName} not found in generated decoders`)
          return []
        }
        
        const decoder = decoderGetter()
        const decodedAccounts: { address: Address; data: T }[] = []
        
        for (const { pubkey, account } of accounts) {
          try {
            // Handle parsed data vs raw data
            const rawData = Buffer.isBuffer(account.data) || account.data instanceof Uint8Array
              ? account.data
              : Buffer.from((account.data as { data?: string }).data ?? account.data as unknown as string, 'base64')
            
            const decodedData = decoder.decode(rawData)
            decodedAccounts.push({ address: pubkey, data: decodedData })
          } catch (decodeError) {
            console.warn(`Failed to decode account ${pubkey}:`, decodeError)
            // Skip accounts that fail to decode rather than failing the entire operation
          }
        }
        
        console.log(`Successfully decoded ${decodedAccounts.length}/${accounts.length} program accounts`)
        return decodedAccounts
      } catch (decoderError) {
        console.warn(`Failed to load decoder ${decoderImportName}:`, decoderError)
        return []
      }
    } catch (error) {
      console.error(`Failed to get program accounts:`, error)
      throw new Error(`Failed to get program accounts: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  /**
   * Get raw account data without decoding (for discriminator validation)
   */
  protected async getRawAccount(
    address: Address,
    commitment = this.commitment
  ): Promise<EncodedAccount | null> {
    try {
      const rpcClient = this.getRpcClient()
      const accountInfo = await rpcClient.getAccountInfo(address, { commitment })
      
      if (!accountInfo) {
        return null
      }
      
      // Convert account info to EncodedAccount format
      const data = Buffer.isBuffer(accountInfo.data) || accountInfo.data instanceof Uint8Array
        ? accountInfo.data
        : Buffer.from((accountInfo.data as { data?: string }).data ?? accountInfo.data as unknown as string, 'base64')
      
      return {
        exists: true,
        address,
        data: new Uint8Array(data),
        owner: accountInfo.owner,
        executable: accountInfo.executable ?? false,
        lamports: BigInt(accountInfo.lamports ?? 0),
        programAddress: accountInfo.owner,
        space: data.length
      } as unknown as EncodedAccount
    } catch (error) {
      console.warn(`Failed to fetch raw account ${address}:`, error)
      return null
    }
  }

  /**
   * Get all program accounts without filtering (for recovery operations)
   */
  protected async getAllProgramAccounts(
    commitment = this.commitment
  ): Promise<EncodedAccount[]> {
    try {
      const rpcClient = this.getRpcClient()
      const accounts = await rpcClient.getProgramAccounts(this.config.programId!, {
        commitment
      })
      
      return accounts.map(({ pubkey, account }) => ({
        exists: true,
        address: pubkey,
        data: Buffer.isBuffer(account.data) || account.data instanceof Uint8Array
          ? new Uint8Array(account.data)
          : new Uint8Array(Buffer.from((account.data as { data?: string }).data ?? account.data as unknown as string, 'base64')),
        owner: account.owner,
        executable: account.executable ?? false,
        lamports: BigInt(account.lamports ?? 0),
        programAddress: account.owner,
        space: Buffer.isBuffer(account.data) || account.data instanceof Uint8Array
          ? account.data.length
          : Buffer.from((account.data as { data?: string }).data ?? account.data as unknown as string, 'base64').length
      } as unknown as EncodedAccount))
    } catch (error) {
      console.error('Failed to get all program accounts:', error)
      return []
    }
  }
}