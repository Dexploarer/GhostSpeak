import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
// Use string type for signature since @solana/rpc-types doesn't export Signature in v2
type Signature = string
import type { GhostSpeakConfig } from '../types/index.js'
import { InstructionBuilder } from './InstructionBuilder.js'
import type { TransactionResult } from '../utils/transaction-urls.js'

/**
 * Base class for all instruction modules using the unified InstructionBuilder.
 * This replaces the old BaseInstructions class with a much simpler pattern.
 */
export abstract class BaseModule {
  protected builder: InstructionBuilder
  protected config: GhostSpeakConfig
  private _debugMode = false

  constructor(config: GhostSpeakConfig) {
    this.config = config
    this.builder = new InstructionBuilder(config)
  }

  /**
   * Enable debug mode for next operation
   */
  debug(): this {
    this._debugMode = true
    this.builder.enableDebug()
    return this
  }

  /**
   * Execute a single instruction
   */
  protected async execute(
    instructionName: string,
    instructionGetter: () => Promise<unknown> | unknown,
    signers: TransactionSigner[]
  ): Promise<string> {
    return this.builder.execute(
      instructionName,
      instructionGetter as never,
      signers
    ) as Promise<string>
  }

  /**
   * Execute a single instruction with detailed result
   */
  protected async executeWithDetails(
    instructionName: string,
    instructionGetter: () => Promise<unknown> | unknown,
    signers: TransactionSigner[]
  ): Promise<TransactionResult> {
    return this.builder.execute(
      instructionName,
      instructionGetter as never,
      signers,
      { returnDetails: true }
    )
  }

  /**
   * Execute multiple instructions in a batch
   */
  protected async executeBatch(
    batchName: string,
    instructionGetters: (() => Promise<unknown> | unknown)[],
    signers: TransactionSigner[]
  ): Promise<Signature> {
    return this.builder.executeBatch(
      batchName,
      instructionGetters as never[],
      signers
    )
  }

  /**
   * Simulate an instruction
   */
  protected async simulate(
    instructionName: string,
    instructionGetter: () => Promise<unknown> | unknown,
    signers: TransactionSigner[]
  ): Promise<unknown> {
    return this.builder.execute(
      instructionName,
      instructionGetter as never,
      signers,
      { simulate: true }
    )
  }

  /**
   * Simulate an instruction (public accessor)
   */
  public async simulateInstruction(
    instructionName: string,
    instructionGetter: () => Promise<unknown> | unknown,
    signers: TransactionSigner[]
  ): Promise<unknown> {
    return this.simulate(instructionName, instructionGetter, signers)
  }

  /**
   * Estimate transaction cost
   */
  protected async estimateCost(
    instructionGetters: (() => Promise<unknown> | unknown)[]
  ): Promise<bigint> {
    return this.builder.estimateCost(instructionGetters as never[])
  }

  /**
   * Get cost estimation for an instruction
   */
  async getCost(
    instructionName: string,
    instructionGetter: () => Promise<unknown> | unknown
  ): Promise<bigint> {
    return this.builder.estimateCost([instructionGetter as never])
  }

  /**
   * Get human-readable explanation
   */
  async explain(
    instructionName: string,
    instructionGetter: () => Promise<unknown> | unknown
  ): Promise<string> {
    return this.builder.explain(instructionName, [instructionGetter as never])
  }

  /**
   * Debug analyze without executing
   */
  async analyze(
    instructionName: string,
    instructionGetter: () => Promise<unknown> | unknown
  ): Promise<unknown> {
    return this.builder.debug(instructionName, [instructionGetter as never])
  }

  /**
   * Get decoded account
   */
  protected async getAccount<T>(
    address: Address,
    decoderImportName: string
  ): Promise<T | null> {
    return this.builder.getAccount<T>(address, decoderImportName)
  }

  /**
   * Get multiple decoded accounts
   */
  protected async getAccounts<T>(
    addresses: Address[],
    decoderImportName: string
  ): Promise<(T | null)[]> {
    return this.builder.getAccounts<T>(addresses, decoderImportName)
  }

  /**
   * Get program accounts
   */
  protected async getProgramAccounts<T>(
    decoderImportName: string,
    filters?: ({ dataSize: bigint } | { memcmp: { offset: bigint; bytes: string; encoding?: 'base58' | 'base64' } })[]
  ): Promise<{ address: Address; data: T }[]> {
    return this.builder.getProgramAccounts<T>(decoderImportName, filters)
  }

  /**
   * Get program ID
   */
  protected get programId(): Address {
    return this.config.programId!
  }

  /**
   * Get program ID (public accessor)
   */
  public getProgramId(): Address {
    return this.config.programId!
  }

  /**
   * Get commitment level
   */
  protected get commitment() {
    return this.config.commitment ?? 'confirmed'
  }

  /**
   * Get commitment level (public accessor)
   */
  public getCommitment() {
    return this.config.commitment ?? 'confirmed'
  }
}