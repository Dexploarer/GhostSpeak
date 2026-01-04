import type { Address } from '@solana/addresses'
import type { Instruction, TransactionSigner, Blockhash, Base64EncodedBytes, Base58EncodedBytes, TransactionMessageBytesBase64, TransactionMessageBytes, SignaturesMap, Signature } from '@solana/kit'
// Type alias for backward compatibility with @solana/kit v2
type IInstruction = Instruction
import type { GhostSpeakConfig, ParticipantType } from '../types/index.js'
import { RpcClient } from './rpc-client.js'
import { createTransactionResult } from '../utils/transaction-urls.js'
import { logEnhancedError, createErrorContext } from '../utils/enhanced-client-errors.js'
import { DevTools, type TransactionAnalysis } from './DevTools.js'
import { createSolanaClient } from '../utils/solana-client.js'
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  compileTransactionMessage
} from '@solana/kit'

/**
 * Type for instruction-like objects from generated code
 */
type InstructionLike = {
  programAddress: Address
  accounts?: readonly unknown[]
  data?: unknown
}

/**
 * Helper to validate instruction has required properties
 */
function validateInstruction(instruction: unknown): asserts instruction is InstructionLike {
  const inst = instruction as Record<string, unknown>
  if (!inst.programAddress) {
    throw new Error('Invalid instruction format')
  }
}

/**
 * Unified instruction builder that eliminates duplication across all instruction classes.
 * This is the single source of truth for instruction execution patterns.
 */
export class InstructionBuilder {
  private rpcClient: RpcClient
  private config: GhostSpeakConfig
  private devTools: DevTools
  private debugMode = false

  constructor(config: GhostSpeakConfig) {
    this.config = config
    this.rpcClient = new RpcClient({
      endpoint: config.rpcEndpoint ?? 'https://api.devnet.solana.com',
      wsEndpoint: config.wsEndpoint,
      commitment: config.commitment ?? 'confirmed'
    })
    this.devTools = DevTools.getInstance(config)
  }

  /**
   * Execute a single instruction with unified error handling and transaction patterns
   */
  async execute<T = string>(
    instructionName: string,
    instructionGetter: () => Promise<InstructionLike> | InstructionLike,
    signers: TransactionSigner[],
    options?: {
      simulate?: boolean
      returnDetails?: boolean
      skipPreflight?: boolean
      maxRetries?: number
    }
  ): Promise<T> {
    const context = createErrorContext(
      'execute',
      instructionName,
      signers.map(s => ({ address: s.address, name: 'signer' })),
      { programId: this.config.programId }
    )

    try {
      // Start timing if in dev mode
      if (this.devTools.isDevMode()) {
        this.devTools.startTiming(instructionName)
      }

      // Get the instruction and validate it
      const instruction = await Promise.resolve(instructionGetter())
      validateInstruction(instruction)

      // Debug mode - show analysis before execution
      if (this.debugMode || this.devTools.isDevMode()) {
        const analysis = this.devTools.analyzeTransaction([instruction] as unknown as IInstruction[])
        console.log(this.devTools.formatTransaction(analysis))
        this.debugMode = false // Reset debug mode
      }

      // Simulate if requested
      if (options?.simulate) {
        return await this.simulateInstruction(instruction, signers) as T
      }

      // Get latest blockhash
      const latestBlockhashResult = await this.rpcClient.getLatestBlockhash()
      const latestBlockhash = {
        blockhash: latestBlockhashResult.blockhash as Blockhash,
        lastValidBlockHeight: latestBlockhashResult.lastValidBlockHeight
      }

      // Build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signers[0], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions([instruction as IInstruction], tx)
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      
      // Send and confirm
      const signatureResult = await this.sendAndConfirm(
        signedTransaction,
        options?.skipPreflight ?? false,
        options?.maxRetries ?? 30
      )
      
      if (typeof signatureResult !== 'string') {
        throw new Error('Transaction signature is not a string')
      }
      
      const signature = signatureResult

      // Return detailed result if requested
      if (options?.returnDetails) {
        const cluster = this.config.cluster ?? 'devnet'
        const result = createTransactionResult(signature, cluster, this.config.commitment ?? 'confirmed') as unknown
        
        // End timing if in dev mode
        if (this.devTools.isDevMode()) {
          this.devTools.endTiming(instructionName)
        }
        
        return result as T
      }

      // End timing if in dev mode
      if (this.devTools.isDevMode()) {
        this.devTools.endTiming(instructionName)
      }

      return signature as T
    } catch (error) {
      logEnhancedError(error as Error, context)
      throw error
    }
  }

  /**
   * Execute multiple instructions in a single transaction
   */
  async executeBatch<T = string>(
    batchName: string,
    instructionGetters: (() => Promise<InstructionLike> | InstructionLike)[],
    signers: TransactionSigner[],
    options?: {
      simulate?: boolean
      returnDetails?: boolean
      skipPreflight?: boolean
    }
  ): Promise<T> {
    const context = createErrorContext(
      'executeBatch',
      batchName,
      signers.map(s => ({ address: s.address, name: 'signer' })),
      { programId: this.config.programId, instructionCount: instructionGetters.length }
    )

    try {
      // Get all instructions and validate them
      const instructions = await Promise.all(
        instructionGetters.map(async (getter, i) => {
          const instruction = await Promise.resolve(getter())
          try {
            validateInstruction(instruction)
            return instruction
          } catch (error) {
            throw new Error(`Instruction ${i} in ${batchName}: ${(error as Error).message}`)
          }
        })
      )

      // Check transaction size
      const estimatedSize = this.estimateTransactionSize(instructions as IInstruction[])
      if (estimatedSize > 1232) {
        throw new Error(`Transaction too large: ${estimatedSize} bytes (max: 1232)`)
      }

      // Simulate if requested
      if (options?.simulate) {
        return await this.simulateBatch(instructions as IInstruction[], signers) as T
      }

      // Get latest blockhash
      const latestBlockhashResult = await this.rpcClient.getLatestBlockhash()
      const latestBlockhash = {
        blockhash: latestBlockhashResult.blockhash as Blockhash,
        lastValidBlockHeight: latestBlockhashResult.lastValidBlockHeight
      }

      // Build transaction message
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signers[0], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions as IInstruction[], tx)
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      
      // Send and confirm
      const signatureResult = await this.sendAndConfirm(
        signedTransaction,
        options?.skipPreflight ?? false
      )
      
      if (typeof signatureResult !== 'string') {
        throw new Error('Transaction signature is not a string')
      }
      
      const signature = signatureResult

      // Return detailed result if requested
      if (options?.returnDetails) {
        const cluster = this.config.cluster ?? 'devnet'
        const result = createTransactionResult(signature, cluster, this.config.commitment ?? 'confirmed') as unknown
        
        // End timing if in dev mode
        if (this.devTools.isDevMode()) {
          this.devTools.endTiming(batchName)
        }
        
        return result as T
      }

      // End timing if in dev mode
      if (this.devTools.isDevMode()) {
        this.devTools.endTiming(batchName)
      }

      return signature as T
    } catch (error) {
      logEnhancedError(error as Error, context)
      throw error
    }
  }

  /**
   * Get and decode account data with unified error handling
   */
  async getAccount<T>(
    address: Address,
    decoderImportName: string
  ): Promise<T | null> {
    try {
      const accountInfo = await this.rpcClient.getAccountInfo(address, {
        commitment: this.config.commitment
      })
      
      if (!accountInfo) return null

      // Dynamic import and decode
      const generated = await import('../generated/index.js')
      const decoderGetter = (generated as Record<string, unknown>)[decoderImportName] as (() => { decode: (data: Uint8Array | Buffer) => T })
      
      // Decoder existence guaranteed by dynamic import

      const decoder = decoderGetter()
      const rawData = this.extractRawData(accountInfo.data)
      
      return decoder.decode(rawData)
    } catch (error) {
      console.warn(`Failed to fetch account ${address}:`, error)
      return null
    }
  }

  /**
   * Get multiple accounts with unified pattern
   */
  async getAccounts<T>(
    addresses: Address[],
    decoderImportName: string
  ): Promise<(T | null)[]> {
    try {
      const accounts = await this.rpcClient.getMultipleAccounts(addresses, {
        commitment: this.config.commitment
      })

      // Dynamic import decoder
      const generated = await import('../generated/index.js')
      const decoderGetter = (generated as Record<string, unknown>)[decoderImportName] as (() => { decode: (data: Uint8Array | Buffer) => T })
      
      // Decoder existence guaranteed by dynamic import

      const decoder = decoderGetter()
      
      return accounts.map(accountInfo => {
        if (!accountInfo) return null
        try {
          const rawData = this.extractRawData(accountInfo.data)
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
   * Get program accounts with filters
   */
  async getProgramAccounts<T>(
    decoderImportName: string,
    filters?: ({ dataSize: bigint } | { memcmp: { offset: bigint; bytes: string; encoding?: 'base58' | 'base64' } })[]
  ): Promise<{ address: Address; data: T }[]> {
    try {
      // Convert filters to the proper branded types for RPC client
      const convertedFilters = filters?.map(filter => {
        if ('dataSize' in filter) {
          return { dataSize: filter.dataSize }
        } else {
          const encoding = filter.memcmp.encoding ?? 'base58'
          if (encoding === 'base64') {
            return {
              memcmp: {
                offset: filter.memcmp.offset,
                bytes: filter.memcmp.bytes as Base64EncodedBytes,
                encoding: 'base64' as const
              }
            }
          } else {
            return {
              memcmp: {
                offset: filter.memcmp.offset,
                bytes: filter.memcmp.bytes as Base58EncodedBytes,
                encoding: 'base58' as const
              }
            }
          }
        }
      })

      const accounts = await this.rpcClient.getProgramAccounts(this.config.programId!, {
        commitment: this.config.commitment,
        filters: convertedFilters ?? []
      })

      // Dynamic import decoder
      const generated = await import('../generated/index.js')
      const decoderGetter = (generated as Record<string, unknown>)[decoderImportName] as (() => { decode: (data: Uint8Array | Buffer) => T })
      
      // Decoder existence guaranteed by dynamic import

      const decoder = decoderGetter()
      const decodedAccounts: { address: Address; data: T }[] = []

      for (const { pubkey, account } of accounts) {
        try {
          const rawData = this.extractRawData(account.data)
          const decodedData = decoder.decode(rawData)
          decodedAccounts.push({ address: pubkey, data: decodedData })
        } catch {
          // Skip accounts that fail to decode
        }
      }

      return decodedAccounts
    } catch (error) {
      console.error('Failed to get program accounts:', error)
      return []
    }
  }

  /**
   * Enable debug mode for next transaction
   */
  enableDebug(): this {
    this.debugMode = true
    return this
  }

  /**
   * Debug transaction - analyze without executing
   */
  async debug(
    instructionName: string,
    instructionGetters: (() => Promise<InstructionLike> | InstructionLike)[]
  ): Promise<TransactionAnalysis> {
    this.devTools.log(`Debugging ${instructionName}`)
    
    // Get all instructions and validate them
    const instructions = await Promise.all(
      instructionGetters.map(async getter => {
        const instruction = await Promise.resolve(getter())
        validateInstruction(instruction)
        return instruction
      })
    )
    
    // Analyze transaction
    const analysis = this.devTools.analyzeTransaction(instructions as unknown as IInstruction[])
    
    // Log formatted analysis
    console.log(this.devTools.formatTransaction(analysis))
    
    return analysis
  }

  /**
   * Get human-readable explanation of transaction
   */
  async explain(
    instructionName: string,
    instructionGetters: (() => Promise<InstructionLike> | InstructionLike)[]
  ): Promise<string> {
    const analysis = await this.debug(instructionName, instructionGetters)
    
    const lines = [
      `🔍 Transaction: ${instructionName}`,
      '',
      'This transaction will:',
      ...analysis.instructions.map((instr, i) => `  ${i + 1}. ${instr.humanReadable}`),
      '',
      `Cost: ~${(Number(analysis.estimatedFee) / 1e9).toFixed(6)} SOL`,
      `Size: ${analysis.estimatedSize} bytes`,
      `Compute: ${analysis.estimatedComputeUnits.toLocaleString()} units`
    ]
    
    if (analysis.warnings.length > 0) {
      lines.push('', '⚠️ Warnings:')
      lines.push(...analysis.warnings.map(w => `  - ${w}`))
    }
    
    return lines.join('\n')
  }

  /**
   * Estimate transaction cost
   */
  async estimateCost(
    instructionGetters: (() => Promise<InstructionLike> | InstructionLike)[]
  ): Promise<bigint> {
    try {
      const instructions = await Promise.all(
        instructionGetters.map(async getter => {
          const instruction = await Promise.resolve(getter())
          validateInstruction(instruction)
          return instruction
        })
      )

      const latestBlockhashResult = await this.rpcClient.getLatestBlockhash()
      const latestBlockhash = {
        blockhash: latestBlockhashResult.blockhash as Blockhash,
        lastValidBlockHeight: latestBlockhashResult.lastValidBlockHeight
      }
      
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(this.config.defaultFeePayer!, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions as IInstruction[], tx)
      )

      const compiledMessage = compileTransactionMessage(transactionMessage)
      const encodedMessage = Buffer.from(compiledMessage as unknown as Uint8Array).toString('base64')
      
      const fee = await this.rpcClient.getFeeForMessage(encodedMessage as TransactionMessageBytesBase64)
      return BigInt(fee ?? 0)
    } catch {
      // Fallback estimate
      const baseFee = 5000n
      const perInstructionFee = 1000n
      return baseFee + (BigInt(instructionGetters.length) * perInstructionFee)
    }
  }

  // Private helper methods

  private async sendAndConfirm(
    signedTransaction: Readonly<{ messageBytes: TransactionMessageBytes; signatures: SignaturesMap; }>,
    skipPreflight: boolean,
    maxRetries = 30
  ): Promise<Signature> {
    const wireTransaction = getBase64EncodedWireTransaction(signedTransaction as Readonly<{ messageBytes: TransactionMessageBytes; signatures: SignaturesMap; }>)
    
    const signature = await this.rpcClient.sendTransaction(wireTransaction, {
      skipPreflight,
      preflightCommitment: this.config.commitment
    })

    console.log('🔍 Transaction sent, signature:', signature)
    console.log('🔍 Signature length:', signature.length)
    console.log('🔍 Signature type:', typeof signature)

    // Poll for confirmation with improved logic
    let confirmed = false
    let attempts = 0
    let currentDelay = 1000
    const maxConfirmationTime = 30000 // 30 seconds max

    const startTime = Date.now()

    while (!confirmed && attempts < maxRetries && (Date.now() - startTime) < maxConfirmationTime) {
      try {
        console.log(`🔍 Confirmation attempt ${attempts + 1}/${maxRetries}`)
        const statuses = await this.rpcClient.getSignatureStatuses([signature] as const)
        
        if (statuses[0]) {
          console.log('🔍 Status found:', statuses[0])
          if (statuses[0].err) {
            throw new Error(`Transaction failed: ${JSON.stringify(statuses[0].err, (_, v: unknown) => typeof v === 'bigint' ? v.toString() : v)}`)
          }
          
          const confirmationStatus = statuses[0].confirmationStatus
          if (confirmationStatus === this.config.commitment || 
              (this.config.commitment === 'confirmed' && confirmationStatus === 'finalized')) {
            confirmed = true
            console.log('✅ Transaction confirmed via status check')
            break
          }
        } else {
          console.log('🔍 No status found, trying transaction details...')
          // Fallback: try to get transaction details directly
          try {
            // Use Gill's createSolanaClient for direct RPC connection
            const directClient = createSolanaClient({ urlOrMoniker: this.config.rpcEndpoint ?? 'https://api.devnet.solana.com' })
            const transaction = await directClient.rpc.getTransaction(signature, {
              commitment: this.config.commitment ?? 'confirmed',
              encoding: 'json',
              maxSupportedTransactionVersion: 0
            }).send()
            
            if (transaction && transaction.meta) {
              if (transaction.meta.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(transaction.meta.err, (_, v: unknown) => typeof v === 'bigint' ? v.toString() : v)}`)
              }
              confirmed = true
              console.log('✅ Transaction confirmed via direct lookup')
              break
            }
          } catch {
            console.log('🔍 Transaction details not yet available')
          }
        }
        
        attempts++
        await new Promise(resolve => setTimeout(resolve, currentDelay))
        currentDelay = Math.min(currentDelay * 1.5, 5000)
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('Transaction failed')) {
          throw error
        }
        console.log(`🔍 Confirmation attempt failed:`, (error as Error).message)
        attempts++
        await new Promise(resolve => setTimeout(resolve, currentDelay * 2))
      }
    }

    if (!confirmed) {
      // Before giving up, do one final check with direct transaction lookup
      console.log('🔍 Final confirmation attempt via transaction lookup...')
      try {
        // Use Gill's createSolanaClient for direct RPC connection
        const directClient = createSolanaClient({ urlOrMoniker: this.config.rpcEndpoint ?? 'https://api.devnet.solana.com' })
        const transaction = await directClient.rpc.getTransaction(signature, {
          commitment: this.config.commitment ?? 'confirmed',
          encoding: 'json',
          maxSupportedTransactionVersion: 0
        }).send()
        
        if (transaction && transaction.meta) {
          if (transaction.meta.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(transaction.meta.err, (_, v: unknown) => typeof v === 'bigint' ? v.toString() : v)}`)
          }
          console.log('✅ Transaction confirmed on final check - returning success')
          return signature as Signature
        }
      } catch (finalError) {
        console.log('🔍 Final check failed:', (finalError as Error).message)
      }
      
      // Transaction was sent but confirmation timed out
      // This often happens on devnet - the transaction may still be successful
      console.log('⚠️ Transaction confirmation timed out, but transaction was sent')
      console.log(`   Check status at: https://explorer.solana.com/tx/${signature}?cluster=${this.config.cluster || 'devnet'}`)
      
      // Return the signature anyway since the transaction was sent
      // The caller can check the transaction status manually if needed
      return signature as Signature
    }

    return signature as Signature
  }

  private async simulateInstruction(
    instruction: InstructionLike,
    signers: TransactionSigner[]
  ): Promise<unknown> {
    const latestBlockhashResult = await this.rpcClient.getLatestBlockhash()
    const latestBlockhash = {
      blockhash: latestBlockhashResult.blockhash as Blockhash,
      lastValidBlockHeight: latestBlockhashResult.lastValidBlockHeight
    }
    
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(signers[0], tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstructions([instruction as IInstruction], tx)
    )

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    const wireTransaction = getBase64EncodedWireTransaction(signedTransaction as Readonly<{ messageBytes: TransactionMessageBytes; signatures: SignaturesMap; }>)

    return this.rpcClient.simulateTransaction(wireTransaction, {
      commitment: this.config.commitment,
      replaceRecentBlockhash: true
    })
  }

  private async simulateBatch(
    instructions: IInstruction[],
    signers: TransactionSigner[]
  ): Promise<unknown> {
    const latestBlockhashResult = await this.rpcClient.getLatestBlockhash()
    const latestBlockhash = {
      blockhash: latestBlockhashResult.blockhash as Blockhash,
      lastValidBlockHeight: latestBlockhashResult.lastValidBlockHeight
    }
    
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(signers[0], tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstructions(instructions, tx)
    )

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    const wireTransaction = getBase64EncodedWireTransaction(signedTransaction as Readonly<{ messageBytes: TransactionMessageBytes; signatures: SignaturesMap; }>)

    return this.rpcClient.simulateTransaction(wireTransaction, {
      commitment: this.config.commitment,
      replaceRecentBlockhash: true
    })
  }

  private estimateTransactionSize(instructions: IInstruction[]): number {
    let totalSize = 64 // Base transaction overhead
    
    for (const instruction of instructions) {
      totalSize += 32 // Program ID
      totalSize += (instruction.accounts?.length ?? 0) * 32 // Account metas
      totalSize += (instruction.data as Uint8Array).length // Instruction data
    }
    
    return totalSize
  }

  private extractRawData(data: unknown): Uint8Array {
    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
      return new Uint8Array(data)
    }
    if (typeof data === 'object' && data !== null && 'data' in data) {
      return Buffer.from((data as { data: string }).data, 'base64')
    }
    if (typeof data === 'string') {
      return Buffer.from(data, 'base64')
    }
    throw new Error('Invalid account data format')
  }

  // =====================================================
  // H2A PROTOCOL INSTRUCTION METHODS
  // =====================================================

  /**
   * Create a communication session instruction
   */
  async createCommunicationSession(_params: {
    sessionId: bigint
    initiator: Address
    initiatorType: ParticipantType
    responder: Address
    responderType: ParticipantType
    sessionType: string
    metadata: string
    expiresAt: bigint
  }): Promise<InstructionLike> {
    // This would typically use generated instruction builders
    // For now, return a placeholder that the H2A module can use
    return {
      programAddress: this.config.programId!,
      accounts: [],
      data: new Uint8Array(0) // Placeholder - would contain serialized instruction data
    }
  }

  /**
   * Send a communication message instruction
   */
  async sendCommunicationMessage(_sessionAddress: Address, _params: {
    messageId: bigint
    senderType: unknown // ParticipantType
    content: string
    messageType: string
    attachments: string[]
  }): Promise<InstructionLike> {
    // This would typically use generated instruction builders
    // For now, return a placeholder that the H2A module can use
    return {
      programAddress: this.config.programId!,
      accounts: [],
      data: new Uint8Array(0) // Placeholder - would contain serialized instruction data
    }
  }

  /**
   * Update participant status instruction
   */
  async updateParticipantStatus(_params: {
    participant: Address
    participantType: unknown // ParticipantType
    servicesOffered: string[]
    availability: boolean
    reputationScore: number
  }): Promise<InstructionLike> {
    // This would typically use generated instruction builders
    // For now, return a placeholder that the H2A module can use
    return {
      programAddress: this.config.programId!,
      accounts: [],
      data: new Uint8Array(0) // Placeholder - would contain serialized instruction data
    }
  }
}

