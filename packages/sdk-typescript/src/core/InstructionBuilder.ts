import type { Address } from '@solana/addresses'
import type { _IInstruction as IInstruction, TransactionSigner, Blockhash } from '@solana/kit'
import type { GhostSpeakConfig } from '../types/index.js'
import { RpcClient } from './rpc-client.js'
import { _createTransactionResult as createTransactionResult } from '../utils/transaction-urls.js'
import { logEnhancedError, createErrorContext } from '../utils/enhanced-client-errors.js'
import { DevTools, type TransactionAnalysis } from './DevTools.js'
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
  async execute<T = Signature>(
    instructionName: string,
    instructionGetter: () => Promise<IInstruction> | IInstruction,
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

      // Get the instruction
      const instruction = await Promise.resolve(instructionGetter())
      
      // Validate instruction
      if (!instruction.programAddress) {
        throw new Error(`Instruction ${instructionName} has no programAddress`)
      }
      if (!instruction.accounts || !Array.isArray(instruction.accounts)) {
        throw new Error(`Instruction ${instructionName} has invalid accounts`)
      }

      // Debug mode - show analysis before execution
      if (this.debugMode || this.devTools.isDevMode()) {
        const analysis = this.devTools.analyzeTransaction([instruction])
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
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signers[0], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions([instruction], tx)
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      
      // Send and confirm
      const signature = await this.sendAndConfirm(
        signedTransaction,
        options?.skipPreflight ?? false,
        options?.maxRetries ?? 30
      ) as string

      // Return detailed result if requested
      if (options?.returnDetails) {
        const cluster = this.config.cluster ?? 'devnet'
        const result = createTransactionResult(signature, cluster, this.config.commitment ?? 'confirmed')
        
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
  async executeBatch<T = Signature>(
    batchName: string,
    instructionGetters: (() => Promise<IInstruction> | IInstruction)[],
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
      // Get all instructions
      const instructions = await Promise.all(
        instructionGetters.map(getter => Promise.resolve(getter()))
      )

      // Validate all instructions
      instructions.forEach((instruction, i) => {
        if (!instruction.programAddress) {
          throw new Error(`Instruction ${i} in ${batchName} has no programAddress`)
        }
        if (!instruction.accounts || !Array.isArray(instruction.accounts)) {
          throw new Error(`Instruction ${i} in ${batchName} has invalid accounts`)
        }
      })

      // Check transaction size
      const estimatedSize = this.estimateTransactionSize(instructions)
      if (estimatedSize > 1232) {
        throw new Error(`Transaction too large: ${estimatedSize} bytes (max: 1232)`)
      }

      // Simulate if requested
      if (options?.simulate) {
        return await this.simulateBatch(instructions, signers) as T
      }

      // Get latest blockhash
      const latestBlockhashResult = await this.rpcClient.getLatestBlockhash()
      const latestBlockhash = {
        blockhash: latestBlockhashResult.blockhash as Blockhash,
        lastValidBlockHeight: latestBlockhashResult.lastValidBlockHeight
      }

      // Build transaction message
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signers[0], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
      
      // Send and confirm
      const signature = await this.sendAndConfirm(
        signedTransaction,
        options?.skipPreflight ?? false
      ) as string

      // Return detailed result if requested
      if (options?.returnDetails) {
        const cluster = this.config.cluster ?? 'devnet'
        const result = createTransactionResult(signature, cluster, this.config.commitment ?? 'confirmed')
        
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
      
      if (!decoderGetter) {
        throw new Error(`Decoder ${decoderImportName} not found`)
      }

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
      
      if (!decoderGetter) {
        return addresses.map(() => null)
      }

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
                bytes: filter.memcmp.bytes as import('@solana/kit').Base64EncodedBytes,
                encoding: 'base64' as const
              }
            }
          } else {
            return {
              memcmp: {
                offset: filter.memcmp.offset,
                bytes: filter.memcmp.bytes as import('@solana/kit').Base58EncodedBytes,
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
      
      if (!decoderGetter) {
        return []
      }

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
    instructionGetters: (() => Promise<IInstruction> | IInstruction)[]
  ): Promise<TransactionAnalysis> {
    this.devTools.log(`Debugging ${instructionName}`)
    
    // Get all instructions
    const instructions = await Promise.all(
      instructionGetters.map(getter => Promise.resolve(getter()))
    )
    
    // Analyze transaction
    const analysis = this.devTools.analyzeTransaction(instructions)
    
    // Log formatted analysis
    console.log(this.devTools.formatTransaction(analysis))
    
    return analysis
  }

  /**
   * Get human-readable explanation of transaction
   */
  async explain(
    instructionName: string,
    instructionGetters: (() => Promise<IInstruction> | IInstruction)[]
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
    instructionGetters: (() => Promise<IInstruction> | IInstruction)[]
  ): Promise<bigint> {
    try {
      const instructions = await Promise.all(
        instructionGetters.map(getter => Promise.resolve(getter()))
      )

      const latestBlockhashResult = await this.rpcClient.getLatestBlockhash()
      const latestBlockhash = {
        blockhash: latestBlockhashResult.blockhash as Blockhash,
        lastValidBlockHeight: latestBlockhashResult.lastValidBlockHeight
      }
      
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(this.config.defaultFeePayer!, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(instructions, tx)
      )

      const compiledMessage = compileTransactionMessage(transactionMessage)
      const encodedMessage = Buffer.from(compiledMessage as unknown as Uint8Array).toString('base64')
      
      const fee = await this.rpcClient.getFeeForMessage(encodedMessage as import('@solana/kit').TransactionMessageBytesBase64)
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
    signedTransaction: unknown,
    skipPreflight: boolean,
    maxRetries = 30
  ): Promise<Signature> {
    const wireTransaction = getBase64EncodedWireTransaction(signedTransaction as any)
    
    const signature = await this.rpcClient.sendTransaction(wireTransaction, {
      skipPreflight,
      preflightCommitment: this.config.commitment
    })

    // Poll for confirmation
    let confirmed = false
    let attempts = 0
    let currentDelay = 1000

    while (!confirmed && attempts < maxRetries) {
      try {
        const statuses = await this.rpcClient.getSignatureStatuses([signature as Signature])
        
        if (statuses[0]) {
          if (statuses[0].err) {
            throw new Error(`Transaction failed: ${JSON.stringify(statuses[0].err)}`)
          }
          
          const confirmationStatus = statuses[0].confirmationStatus
          if (confirmationStatus === this.config.commitment || 
              (this.config.commitment === 'confirmed' && confirmationStatus === 'finalized')) {
            confirmed = true
            break
          }
        }
        
        attempts++
        await new Promise(resolve => setTimeout(resolve, currentDelay))
        currentDelay = Math.min(currentDelay * 1.5, 5000)
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('Transaction failed')) {
          throw error
        }
        attempts++
        await new Promise(resolve => setTimeout(resolve, currentDelay * 2))
      }
    }

    if (!confirmed) {
      throw new Error(`Transaction timeout after ${maxRetries} attempts. Signature: ${signature}`)
    }

    return signature as Signature
  }

  private async simulateInstruction(
    instruction: IInstruction,
    signers: TransactionSigner[]
  ): Promise<unknown> {
    const latestBlockhashResult = await this.rpcClient.getLatestBlockhash()
    const latestBlockhash = {
      blockhash: latestBlockhashResult.blockhash as Blockhash,
      lastValidBlockHeight: latestBlockhashResult.lastValidBlockHeight
    }
    
    const transactionMessage = await pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(signers[0], tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstructions([instruction], tx)
    )

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    const wireTransaction = getBase64EncodedWireTransaction(signedTransaction as any)

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
    
    const transactionMessage = await pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(signers[0], tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstructions(instructions, tx)
    )

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    const wireTransaction = getBase64EncodedWireTransaction(signedTransaction as any)

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
      totalSize += instruction.data?.length ?? 0 // Instruction data
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
}

