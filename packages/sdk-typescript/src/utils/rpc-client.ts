/**
 * Modern RPC Client for Solana Web3.js v2
 * July 2025 Best Practices
 * 
 * This implementation uses TypeScript's advanced features and
 * leverages the new patterns from @solana/web3.js v2
 */

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  type Rpc,
  type RpcSubscriptions,
  type Address,
  type Signature,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Keep for completeness
  type Blockhash,
  type Slot,
  type Lamports,
  type GetAccountInfoApi,
  type GetMultipleAccountsApi,
  type GetProgramAccountsApi,
  type GetBalanceApi,
  type GetBlockHeightApi,
  type GetBlockProductionApi,
  type GetBlockTimeApi,
  type GetClusterNodesApi,
  type GetEpochInfoApi,
  type GetEpochScheduleApi,
  type GetFeeForMessageApi,
  type GetGenesisHashApi,
  type GetHealthApi,
  type GetIdentityApi,
  type GetInflationGovernorApi,
  type GetInflationRateApi,
  type GetLatestBlockhashApi,
  type GetLeaderScheduleApi,
  type GetMinimumBalanceForRentExemptionApi,
  type GetRecentPerformanceSamplesApi,
  type GetSignatureStatusesApi,
  type GetSlotApi,
  type GetSlotLeaderApi,
  // type GetStakeActivationApi, // Not available in current @solana/kit
  type GetSupplyApi,
  type GetTokenAccountBalanceApi,
  type GetTokenAccountsByDelegateApi,
  type GetTokenAccountsByOwnerApi,
  type GetTokenSupplyApi,
  type GetTransactionApi,
  type GetTransactionCountApi,
  type GetVersionApi,
  type GetVoteAccountsApi,
  type RequestAirdropApi,
  type SendTransactionApi,
  type SimulateTransactionApi,
  type AccountNotificationsApi,
  type LogsNotificationsApi,
  type ProgramNotificationsApi,
  type SignatureNotificationsApi,
  type SlotNotificationsApi,
  sendAndConfirmTransactionFactory,
  // type SendAndConfirmTransactionFactoryConfig, // Not available - defined inline
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future transaction building features
  type TransactionSigner,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future instruction building features
  type IInstruction,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future transaction building features
  type TransactionMessage,
  type Base64EncodedWireTransaction
} from '@solana/kit'

import type {
  Commitment,
  AccountInfo,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in generic RPC response handling
  RpcResponse,
  GetAccountInfoOptions,
  GetMultipleAccountsOptions,
  GetProgramAccountsOptions,
  SendTransactionOptions,
  SimulateTransactionOptions,
  ConfirmTransactionOptions,
  TransactionStatus,
  TransactionResponse,
  SimulatedTransactionResponse,
  ProgramAccount,
  BlockhashInfo,
  ClusterNode,
  EpochInfo,
  Version,
  Supply,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future token account features
  TokenAccountBalance,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future token features
  TokenSupply,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future voting features
  VoteAccount,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future staking features
  StakeActivation,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future governance features
  InflationGovernor,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future inflation features
  InflationRate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future epoch features
  EpochSchedule,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future identity features
  Identity,
  HealthStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future block production features
  BlockProduction,
  RecentPerformanceSample,
  ParsedAccountData
} from '../types/rpc-types.js'
import type { PoolStats } from './connection-pool.js'

/**
 * Configuration for send and confirm transaction factory
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Future transaction factory features
interface SendAndConfirmTransactionFactoryConfig {
  rpc: unknown
  rpcSubscriptions: unknown
}

// Complete RPC API type combining all methods
export type SolanaRpcApi = Rpc<
  GetAccountInfoApi &
  GetMultipleAccountsApi &
  GetProgramAccountsApi &
  GetBalanceApi &
  GetBlockHeightApi &
  GetBlockProductionApi &
  GetBlockTimeApi &
  GetClusterNodesApi &
  GetEpochInfoApi &
  GetEpochScheduleApi &
  GetFeeForMessageApi &
  GetGenesisHashApi &
  GetHealthApi &
  GetIdentityApi &
  GetInflationGovernorApi &
  GetInflationRateApi &
  GetLatestBlockhashApi &
  GetLeaderScheduleApi &
  GetMinimumBalanceForRentExemptionApi &
  GetRecentPerformanceSamplesApi &
  GetSignatureStatusesApi &
  GetSlotApi &
  GetSlotLeaderApi &
  // GetStakeActivationApi & // Not available
  GetSupplyApi &
  GetTokenAccountBalanceApi &
  GetTokenAccountsByDelegateApi &
  GetTokenAccountsByOwnerApi &
  GetTokenSupplyApi &
  GetTransactionApi &
  GetTransactionCountApi &
  GetVersionApi &
  GetVoteAccountsApi &
  RequestAirdropApi &
  SendTransactionApi &
  SimulateTransactionApi
>

// Complete RPC Subscriptions API type
export type SolanaRpcSubscriptionsApi = RpcSubscriptions<
  AccountNotificationsApi &
  LogsNotificationsApi &
  ProgramNotificationsApi &
  SignatureNotificationsApi &
  SlotNotificationsApi
>

// Configuration options
export interface SolanaRpcClientConfig {
  endpoint: string
  wsEndpoint?: string
  commitment?: Commitment
  headers?: Record<string, string>
  httpAgent?: unknown
  disableCache?: boolean
  confirmTransactionInitialTimeout?: number
  useConnectionPool?: boolean
  poolConfig?: {
    maxConnections?: number
    minConnections?: number
    idleTimeoutMs?: number
    maxAgeMs?: number
  }
  cacheConfig?: {
    maxSize?: number
    defaultTtlMs?: number
    accountTtlMs?: number
    transactionTtlMs?: number
  }
}

// RPC options interfaces for July 2025
interface BaseRpcOptions {
  commitment?: Commitment
  minContextSlot?: bigint
}

interface AccountInfoRpcOptions extends BaseRpcOptions {
  encoding?: 'base64' | 'base64+zstd' | 'jsonParsed'
  dataSlice?: { offset: number; length: number }
}

interface SendTransactionRpcOptions extends BaseRpcOptions {
  skipPreflight?: boolean
  preflightCommitment?: Commitment
  maxRetries?: bigint
}

interface ProgramAccountsRpcOptions extends AccountInfoRpcOptions {
  filters?: (
    | Readonly<{ dataSize: bigint }>
    | Readonly<{
        memcmp: Readonly<{
          bytes: string  // Will be cast to appropriate branded type
          encoding: 'base58' | 'base64'
          offset: bigint
        }>
      }>
  )[]
}

interface TransactionRpcOptions extends BaseRpcOptions {
  encoding?: 'json' | 'jsonParsed' | 'base64'
  maxSupportedTransactionVersion?: number
}

interface RawAccountData {
  executable: boolean
  lamports: bigint | number
  owner: Address | string
  rentEpoch: bigint | number
  data: string | [string, string] | { program: string; parsed: unknown; space?: number }
  space?: bigint | number
}

interface TokenAccountInfo {
  pubkey: Address
  account: AccountInfo
}

/**
 * Modern Solana RPC Client using Web3.js v2 patterns
 * 
 * Features:
 * - Full TypeScript type safety
 * - Modern async/await patterns
 * - Built-in retry logic
 * - Subscription support
 * - Tree-shakeable design
 * - Connection pooling
 * - Automatic error handling
 * - Commitment level management
 * 
 * @example
 * ```typescript
 * const client = new SolanaRpcClient({
 *   endpoint: 'https://api.devnet.solana.com',
 *   commitment: 'confirmed'
 * })
 * 
 * const account = await client.getAccountInfo('11111111111111111111111111111111')
 * console.log(account?.lamports)
 * ```
 */
export class SolanaRpcClient {
  private readonly rpc: SolanaRpcApi
  private readonly rpcSubscriptions?: SolanaRpcSubscriptionsApi
  private readonly commitment: Commitment
  private readonly sendAndConfirmTransaction: ReturnType<typeof sendAndConfirmTransactionFactory>
  private readonly endpoint: string
  private readonly useConnectionPool: boolean
  private readonly disableCache: boolean

  constructor(config: SolanaRpcClientConfig) {
    this.commitment = config.commitment ?? 'confirmed'
    this.endpoint = config.endpoint
    this.useConnectionPool = config.useConnectionPool ?? false
    this.disableCache = config.disableCache ?? false
    
    // Create RPC client with proper typing
    this.rpc = createSolanaRpc(config.endpoint) as SolanaRpcApi
    
    // Create subscription client if WebSocket endpoint provided
    if (config.wsEndpoint) {
      this.rpcSubscriptions = createSolanaRpcSubscriptions(config.wsEndpoint) as SolanaRpcSubscriptionsApi
    }

    // Create send and confirm transaction helper
    const factoryConfig = {
      rpc: this.rpc,
      rpcSubscriptions: this.rpcSubscriptions ?? (null as never)
    }
    this.sendAndConfirmTransaction = sendAndConfirmTransactionFactory(factoryConfig)
    
    // Initialize connection pool if enabled
    if (this.useConnectionPool) {
      this.initializeConnectionPool(config)
    }
  }

  /**
   * Get account information for a specific address
   * 
   * @param address - The account address to fetch
   * @param options - Optional parameters for the request
   * @returns Promise resolving to account info or null if not found
   * 
   * @example
   * ```typescript
   * const account = await client.getAccountInfo('11111111111111111111111111111111', {
   *   commitment: 'finalized',
   *   encoding: 'base64'
   * })
   * 
   * if (account) {
   *   console.log(`Balance: ${account.lamports} lamports`)
   *   console.log(`Owner: ${account.owner}`)
   * }
   * ```
   */
  async getAccountInfo(
    address: Address,
    options?: GetAccountInfoOptions
  ): Promise<AccountInfo | null> {
    // Use connection pool if enabled
    if (this.useConnectionPool && !this.disableCache) {
      return this.getAccountInfoWithPool(address, options)
    }

    const rpcOptions: AccountInfoRpcOptions = {
      commitment: options?.commitment ?? this.commitment,
      ...(options?.dataSlice && { dataSlice: options.dataSlice }),
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }
    
    // Add encoding only for non-parsed requests, filtering out unsupported base58
    if (options?.encoding !== 'jsonParsed') {
      rpcOptions.encoding = (options?.encoding === 'base58') ? 'base64' : (options?.encoding ?? 'base64')
    }
    
    const result = await this.rpc.getAccountInfo(address, rpcOptions).send()

    if (!result.value) return null

    return this.parseAccountInfo(result.value)
  }

  /**
   * Get multiple accounts in a single batch request
   * 
   * @param addresses - Array of account addresses to fetch
   * @param options - Optional parameters for the request
   * @returns Promise resolving to array of account info (null for non-existent accounts)
   * 
   * @example
   * ```typescript
   * const addresses = ['11111111111111111111111111111111', 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA']
   * const accounts = await client.getMultipleAccounts(addresses)
   * 
   * accounts.forEach((account, index) => {
   *   if (account) {
   *     console.log(`Account ${index}: ${account.lamports} lamports`)
   *   }
   * })
   * ```
   */
  async getMultipleAccounts(
    addresses: Address[],
    options?: GetMultipleAccountsOptions
  ): Promise<(AccountInfo | null)[]> {
    const result = await this.rpc.getMultipleAccounts(addresses, {
      commitment: options?.commitment ?? this.commitment,
      encoding: options?.encoding ?? 'base64',
      ...(options?.dataSlice && { dataSlice: options.dataSlice }),
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }).send()

return result.value.map((account: unknown) => 
      account && this.isValidAccountData(account) ? this.parseAccountInfo(account as RawAccountData) : null
    )
  }

  /**
   * Get program accounts
   */
  async getProgramAccounts(
    programId: Address,
    options?: GetProgramAccountsOptions
  ): Promise<ProgramAccount<Buffer | ParsedAccountData>[]> {
    const rpcOptions: ProgramAccountsRpcOptions = {
      commitment: options?.commitment ?? this.commitment,
      ...(options?.dataSlice && { dataSlice: options.dataSlice }),
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot }),
      ...(options?.filters && { 
        filters: options.filters.map(f => {
          if ('dataSize' in f) {
            return { dataSize: BigInt(f.dataSize) } as const
          }
          if ('memcmp' in f) {
            return {
              memcmp: {
                bytes: f.memcmp.bytes, // Base58 encoded bytes
                encoding: 'base58' as const,
                offset: BigInt(f.memcmp.offset)
              }
            } as const
          }
          return f
        })
      })
    }
    
    // Add encoding only for non-parsed requests, filtering out unsupported base58
    if (options?.encoding !== 'jsonParsed') {
      rpcOptions.encoding = (options?.encoding === 'base58') ? 'base64' : (options?.encoding ?? 'base64')
    }
    
    // @ts-expect-error Type mismatch between our options and RPC method expectations
    const result = await this.rpc.getProgramAccounts(programId, rpcOptions).send()

    return result.value.map((item) => ({
      pubkey: item.pubkey,
      account: this.parseAccountInfo(item.account) as AccountInfo // Type assertion for parsed account
    }))
  }

  /**
   * Get balance
   */
  async getBalance(
    address: Address,
    options?: { commitment?: Commitment; minContextSlot?: Slot }
  ): Promise<Lamports> {
    const result = await this.rpc.getBalance(address, {
      commitment: options?.commitment ?? this.commitment,
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }).send()

    return result.value
  }

  /**
   * Get latest blockhash
   */
  async getLatestBlockhash(
    options?: { commitment?: Commitment; minContextSlot?: Slot }
  ): Promise<BlockhashInfo> {
    const result = await this.rpc.getLatestBlockhash({
      commitment: options?.commitment ?? this.commitment,
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }).send()

    return result.value
  }

  /**
   * Send a transaction to the Solana network
   * 
   * @param transaction - The transaction to send (as base64 encoded wire format)
   * @param options - Optional parameters for sending
   * @returns Promise resolving to the transaction signature
   * 
   * @example
   * ```typescript
   * const wireTransaction = getBase64EncodedWireTransaction(signedTransaction)
   * const signature = await client.sendTransaction(wireTransaction, {
   *   skipPreflight: false,
   *   preflightCommitment: 'processed'
   * })
   * 
   * console.log(`Transaction sent: ${signature}`)
   * ```
   */
  async sendTransaction(
    transaction: Base64EncodedWireTransaction | Uint8Array | string,
    options?: SendTransactionOptions
  ): Promise<Signature> {
    const rpcOptions: SendTransactionRpcOptions = {
      skipPreflight: options?.skipPreflight ?? false,
      preflightCommitment: options?.preflightCommitment ?? this.commitment,
      ...(options?.maxRetries && { maxRetries: BigInt(options.maxRetries) }),
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }
    
    // Note: sendTransaction doesn't support encoding options in @solana/kit
    // Transactions should already be in the correct format
    
    return this.rpc.sendTransaction(transaction as Base64EncodedWireTransaction, rpcOptions).send()
  }

  /**
   * Simulate a transaction without sending it to the network
   * 
   * @param transaction - The transaction to simulate
   * @param options - Optional parameters for simulation
   * @returns Promise resolving to simulation result
   * 
   * @example
   * ```typescript
   * const wireTransaction = getBase64EncodedWireTransaction(signedTransaction)
   * const simulation = await client.simulateTransaction(wireTransaction, {
   *   commitment: 'processed',
   *   replaceRecentBlockhash: true
   * })
   * 
   * if (simulation.err) {
   *   console.error('Transaction would fail:', simulation.err)
   * } else {
   *   console.log(`Compute units: ${simulation.unitsConsumed}`)
   * }
   * ```
   */
  async simulateTransaction(
    transaction: Base64EncodedWireTransaction | Uint8Array | string,
    options?: SimulateTransactionOptions
  ): Promise<SimulatedTransactionResponse> {
    const result = await this.rpc.simulateTransaction(transaction as Base64EncodedWireTransaction, {
      sigVerify: false,
      commitment: options?.commitment ?? this.commitment,
      encoding: 'base64' as const,
      replaceRecentBlockhash: false,
      ...(options?.accounts && { accounts: options.accounts }),
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }).send()

    return result.value as unknown as SimulatedTransactionResponse
  }


  /**
   * Get signature statuses
   */
  async getSignatureStatuses(
    signatures: Signature[],
    options?: ConfirmTransactionOptions
  ): Promise<(TransactionStatus | null)[]> {
    const result = await this.rpc.getSignatureStatuses(signatures, {
      ...(options?.searchTransactionHistory && { 
        searchTransactionHistory: options.searchTransactionHistory 
      })
    }).send()

    return [...result.value] as (TransactionStatus | null)[]
  }

  /**
   * Get transaction
   */
  async getTransaction(
    signature: Signature,
    options?: {
      commitment?: Commitment
      maxSupportedTransactionVersion?: number
      encoding?: 'json' | 'jsonParsed' | 'base64'
    }
  ): Promise<TransactionResponse | null> {
    const rpcOptions: TransactionRpcOptions = {
      commitment: options?.commitment ?? this.commitment,
      encoding: 'json' as const
    }
    
    if (options?.maxSupportedTransactionVersion !== undefined) {
      rpcOptions.maxSupportedTransactionVersion = options.maxSupportedTransactionVersion
    }
    
    // @ts-expect-error Type mismatch between our options and RPC method expectations
    const result = await this.rpc.getTransaction(signature, rpcOptions).send()

    return result as unknown as TransactionResponse | null
  }

  /**
   * Get slot
   */
  async getSlot(
    options?: { commitment?: Commitment; minContextSlot?: Slot }
  ): Promise<Slot> {
    return this.rpc.getSlot({
      commitment: options?.commitment ?? this.commitment,
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }).send()
  }

  /**
   * Get block height
   */
  async getBlockHeight(
    options?: { commitment?: Commitment; minContextSlot?: Slot }
  ): Promise<bigint> {
    return this.rpc.getBlockHeight({
      commitment: options?.commitment ?? this.commitment,
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }).send()
  }

  /**
   * Get epoch info
   */
  async getEpochInfo(
    options?: { commitment?: Commitment; minContextSlot?: Slot }
  ): Promise<EpochInfo> {
    const result = await this.rpc.getEpochInfo({
      commitment: options?.commitment ?? this.commitment,
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }).send()
    
    return { ...result, transactionCount: result.transactionCount ?? undefined } as EpochInfo
  }

  /**
   * Get cluster nodes
   */
  async getClusterNodes(): Promise<ClusterNode[]> {
    const result = await this.rpc.getClusterNodes().send()
    return [...result] as ClusterNode[]
  }

  /**
   * Get version
   */
  async getVersion(): Promise<Version> {
    return this.rpc.getVersion().send()
  }

  /**
   * Get health
   */
  async getHealth(): Promise<HealthStatus> {
    return this.rpc.getHealth().send()
  }

  /**
   * Request airdrop
   */
  async requestAirdrop(
    address: Address,
    lamports: Lamports,
    options?: { commitment?: Commitment }
  ): Promise<Signature> {
    return this.rpc.requestAirdrop(address, lamports, {
      commitment: options?.commitment ?? this.commitment
    }).send()
  }

  /**
   * Get minimum balance for rent exemption
   */
  async getMinimumBalanceForRentExemption(
    dataSize: bigint,
    options?: { commitment?: Commitment }
  ): Promise<Lamports> {
    return this.rpc.getMinimumBalanceForRentExemption(dataSize, {
      commitment: options?.commitment ?? this.commitment
    }).send()
  }

  /**
   * Get fee for message
   */
  async getFeeForMessage(
    message: string,
    options?: { commitment?: Commitment; minContextSlot?: Slot }
  ): Promise<Lamports | null> {
    // @ts-expect-error Message parameter type expects specific branded type
    const result = await this.rpc.getFeeForMessage(message, {
      commitment: options?.commitment ?? this.commitment,
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }).send()

    return result.value
  }

  /**
   * Helper to validate if an object is valid account data
   */
  private isValidAccountData(account: unknown): account is RawAccountData {
    const acc = account as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return acc !== null && typeof acc === 'object' && 
           'executable' in acc && 'lamports' in acc && 'owner' in acc && 'rentEpoch' in acc && 'data' in acc
  }

  /**
   * Helper method to parse account info from RPC response
   */
  private parseAccountInfo(account: RawAccountData): AccountInfo {
    // Handle different data encodings
    let data: Buffer | ParsedAccountData
    
    if (account.data) {
      if (Array.isArray(account.data)) {
        // Base64 encoded data [data, encoding]
        data = Buffer.from(account.data[0], 'base64')
      } else if (typeof account.data === 'string') {
        // Base58 or base64 string
        data = Buffer.from(account.data, 'base64')
      } else if (account.data.parsed) {
        // Parsed JSON data
        data = {
          program: account.data.program,
          parsed: account.data.parsed,
          space: BigInt(account.data.space ?? 0)
        }
      } else {
        data = Buffer.alloc(0)
      }
    } else {
      data = Buffer.alloc(0)
    }

    return {
      executable: account.executable,
      lamports: account.lamports as Lamports,
      owner: account.owner as Address,
      rentEpoch: BigInt(account.rentEpoch),
      data,
      space: account.space ? BigInt(account.space) : undefined
    }
  }

  /**
   * Get RPC instance for advanced usage
   */
  getRpc(): SolanaRpcApi {
    return this.rpc
  }

  /**
   * Get RPC subscriptions instance for advanced usage
   */
  getRpcSubscriptions(): SolanaRpcSubscriptionsApi | undefined {
    return this.rpcSubscriptions
  }

  // =====================================================
  // ADDITIONAL HELPER METHODS
  // =====================================================

  /**
   * Check if an account exists
   * 
   * @param address - The account address to check
   * @param options - Optional parameters
   * @returns Promise resolving to true if account exists
   * 
   * @example
   * ```typescript
   * const exists = await client.accountExists('11111111111111111111111111111111')
   * console.log(`Account exists: ${exists}`)
   * ```
   */
  async accountExists(
    address: Address,
    options?: { commitment?: Commitment }
  ): Promise<boolean> {
    const account = await this.getAccountInfo(address, options)
    return account !== null
  }

  /**
   * Get SOL balance in human-readable format
   * 
   * @param address - The account address
   * @param options - Optional parameters
   * @returns Promise resolving to balance in SOL
   * 
   * @example
   * ```typescript
   * const solBalance = await client.getSolBalance('11111111111111111111111111111111')
   * console.log(`Balance: ${solBalance} SOL`)
   * ```
   */
  async getSolBalance(
    address: Address,
    options?: { commitment?: Commitment; minContextSlot?: Slot }
  ): Promise<number> {
    const lamports = await this.getBalance(address, options)
    return Number(lamports) / 1000000000 // Convert lamports to SOL
  }

  /**
   * Wait for account to have minimum balance
   * 
   * @param address - The account address to monitor
   * @param minBalance - Minimum balance in lamports
   * @param options - Optional parameters
   * @returns Promise resolving when balance requirement is met
   * 
   * @example
   * ```typescript
   * await client.waitForBalance('11111111111111111111111111111111', BigInt(1000000000))
   * console.log('Account has at least 1 SOL')
   * ```
   */
  async waitForBalance(
    address: Address,
    minBalance: bigint,
    options?: {
      commitment?: Commitment
      timeoutMs?: number
      intervalMs?: number
    }
  ): Promise<void> {
    const {
      commitment = this.commitment,
      timeoutMs = 30000,
      intervalMs = 1000
    } = options ?? {}

    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const balance = await this.getBalance(address, { commitment })
      if (balance >= minBalance) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }

    throw new Error(`Timeout waiting for balance ${minBalance} on ${address}`)
  }

  /**
   * Get token accounts for an owner
   * 
   * @param owner - The owner address
   * @param mint - Optional mint address to filter by
   * @param options - Optional parameters
   * @returns Promise resolving to token accounts
   * 
   * @example
   * ```typescript
   * const tokenAccounts = await client.getTokenAccountsByOwner(
   *   '11111111111111111111111111111111',
   *   'So11111111111111111111111111111111111111112' // Wrapped SOL
   * )
   * ```
   */
  async getTokenAccountsByOwner(
    owner: Address,
    mint?: Address,
    options?: {
      commitment?: Commitment
      minContextSlot?: Slot
      encoding?: 'base64' | 'jsonParsed'
    }
  ): Promise<TokenAccountInfo[]> {
    const filters = mint ? { mint } : { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address }
    
    const result = await this.rpc.getTokenAccountsByOwner(owner, filters, {
      commitment: options?.commitment ?? this.commitment,
      encoding: options?.encoding ?? 'base64',
      ...(options?.minContextSlot && { minContextSlot: options.minContextSlot })
    }).send()

    return result.value.map(item => ({
      pubkey: item.pubkey,
      account: this.parseAccountInfo(item.account as RawAccountData)
    }))
  }

  /**
   * Get recent performance samples
   * 
   * @param limit - Number of samples to return
   * @returns Promise resolving to performance samples
   * 
   * @example
   * ```typescript
   * const samples = await client.getRecentPerformanceSamples(10)
   * console.log('Recent TPS:', samples[0]?.samplePeriodSecs)
   * ```
   */
  async getRecentPerformanceSamples(
    limit?: number
  ): Promise<RecentPerformanceSample[]> {
    return [...await this.rpc.getRecentPerformanceSamples(
      limit
    ).send()] as RecentPerformanceSample[]
  }

  /**
   * Get supply information
   * 
   * @param options - Optional parameters
   * @returns Promise resolving to supply information
   * 
   * @example
   * ```typescript
   * const supply = await client.getSupply()
   * console.log(`Total supply: ${supply.total} lamports`)
   * console.log(`Circulating supply: ${supply.circulating} lamports`)
   * ```
   */
  async getSupply(
    options?: { commitment?: Commitment; excludeNonCirculatingAccountsList?: boolean }
  ): Promise<Supply> {
    const rpcConfig = {
      commitment: options?.commitment ?? this.commitment,
      ...(options?.excludeNonCirculatingAccountsList && {
        excludeNonCirculatingAccountsList: true
      })
    }
    
    // @ts-expect-error RPC method may have different parameter expectations
    const result = await this.rpc.getSupply(rpcConfig).send()

    return result.value as Supply
  }

  /**
   * Get transaction with automatic retry
   * 
   * @param signature - Transaction signature
   * @param options - Optional parameters
   * @returns Promise resolving to transaction data
   * 
   * @example
   * ```typescript
   * const tx = await client.getTransactionWithRetry('5VfykQ...', {
   *   maxRetries: 3,
   *   commitment: 'confirmed'
   * })
   * ```
   */
  async getTransactionWithRetry(
    signature: Signature,
    options?: {
      commitment?: Commitment
      maxSupportedTransactionVersion?: number
      encoding?: 'json' | 'jsonParsed' | 'base64'
      maxRetries?: number
      retryDelayMs?: number
    }
  ): Promise<TransactionResponse | null> {
    const {
      maxRetries = 3,
      retryDelayMs = 1000,
      ...txOptions
    } = options ?? {}

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const transaction = await this.getTransaction(signature, txOptions)
        if (transaction) {
          return transaction
        }
        
        // If not found, wait and retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs))
        }
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, retryDelayMs))
      }
    }

    return null
  }

  /**
   * Estimate compute units for a transaction
   * 
   * @param transaction - The transaction to estimate
   * @param options - Optional parameters
   * @returns Promise resolving to estimated compute units
   * 
   * @example
   * ```typescript
   * const wireTransaction = getBase64EncodedWireTransaction(signedTransaction)
   * const computeUnits = await client.estimateComputeUnits(wireTransaction)
   * console.log(`Estimated compute units: ${computeUnits}`)
   * ```
   */
  async estimateComputeUnits(
    transaction: Base64EncodedWireTransaction | Uint8Array | string,
    options?: SimulateTransactionOptions
  ): Promise<bigint | null> {
    const simulation = await this.simulateTransaction(transaction, options)
    return simulation.unitsConsumed ?? null
  }

  /**
   * Check if a transaction signature is valid format
   * 
   * @param signature - The signature to validate
   * @returns True if signature format is valid
   * 
   * @example
   * ```typescript
   * const isValid = client.isValidSignature('5VfykQ...')
   * console.log(`Signature valid: ${isValid}`)
   * ```
   */
  isValidSignature(signature: string): boolean {
    try {
      // Solana signatures are 88 characters in base58
      return signature.length === 88 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(signature)
    } catch {
      return false
    }
  }

  /**
   * Check if an address is valid format
   * 
   * @param address - The address to validate
   * @returns True if address format is valid
   * 
   * @example
   * ```typescript
   * const isValid = client.isValidAddress('11111111111111111111111111111111')
   * console.log(`Address valid: ${isValid}`)
   * ```
   */
  isValidAddress(address: string): boolean {
    try {
      // Solana addresses: 32-44 characters (standard) or up to 88 characters (ATAs/PDAs)
      return address.length >= 32 && address.length <= 88 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)
    } catch {
      return false
    }
  }

  // =====================================================
  // CONNECTION POOL INTEGRATION
  // =====================================================

  /**
   * Initialize connection pool
   */
  private initializeConnectionPool(config: SolanaRpcClientConfig): void {
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      // Browser environment - connection pooling handled by browser
      console.warn('Connection pooling not supported in browser environment')
      return
    }

    // Import connection pool dynamically to avoid browser issues
    import('./connection-pool.js').then(({ getGlobalConnectionPool }) => {
      getGlobalConnectionPool(config.poolConfig, config.cacheConfig)
    }).catch(console.error)
  }

  /**
   * Get account info using connection pool
   */
  private async getAccountInfoWithPool(
    address: Address,
    options?: GetAccountInfoOptions
  ): Promise<AccountInfo | null> {
    try {
      const { getGlobalConnectionPool } = await import('./connection-pool.js')
      const pool = getGlobalConnectionPool()
      return await pool.getCachedAccountInfo(this.endpoint, address)
    } catch (error) {
      console.warn('Connection pool error, falling back to direct connection:', error)
      return this.getAccountInfo(address, options)
    }
  }

  /**
   * Get cached transaction using connection pool
   */
  async getCachedTransaction(signature: Signature): Promise<TransactionResponse | null> {
    if (!this.useConnectionPool) {
      return this.getTransaction(signature)
    }

    try {
      const { getGlobalConnectionPool } = await import('./connection-pool.js')
      const pool = getGlobalConnectionPool()
      return await pool.getCachedTransaction(this.endpoint, signature) as TransactionResponse | null
    } catch (error) {
      console.warn('Connection pool error, falling back to direct connection:', error)
      return this.getTransaction(signature)
    }
  }

  /**
   * Get connection pool statistics
   */
  async getPoolStats(): Promise<PoolStats | null> {
    if (!this.useConnectionPool) {
      return null
    }

    try {
      const { getGlobalConnectionPool } = await import('./connection-pool.js')
      const pool = getGlobalConnectionPool()
      return pool.getStats()
    } catch (error) {
      console.warn('Could not get pool stats:', error)
      return null
    }
  }

  /**
   * Clear connection pool cache
   */
  async clearPoolCache(): Promise<void> {
    if (!this.useConnectionPool) {
      return
    }

    try {
      const { getGlobalConnectionPool } = await import('./connection-pool.js')
      const pool = getGlobalConnectionPool()
      pool.clearCache()
    } catch (error) {
      console.warn('Could not clear pool cache:', error)
    }
  }
}

/**
 * Factory function to create RPC client
 */
export function createSolanaRpcClient(
  endpoint: string,
  options?: Partial<SolanaRpcClientConfig>
): SolanaRpcClient {
  return new SolanaRpcClient({
    endpoint,
    ...options
  })
}

/**
 * Helper to create RPC client with subscriptions
 */
export function createSolanaRpcClientWithSubscriptions(
  endpoint: string,
  wsEndpoint: string,
  options?: Partial<SolanaRpcClientConfig>
): SolanaRpcClient {
  return new SolanaRpcClient({
    endpoint,
    wsEndpoint,
    ...options
  })
}