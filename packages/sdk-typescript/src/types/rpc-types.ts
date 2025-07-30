/**
 * RPC Type Definitions for Solana Web3.js v2
 * July 2025 Best Practices
 * 
 * These types leverage TypeScript's advanced features for type safety
 * and use modern patterns from @solana/web3.js v2
 */

import type {
  Address,
  Signature,
  TransactionError,
  Blockhash,
  Slot,
  Epoch,
  Lamports,
  TransactionVersion,
  Base58EncodedBytes,
  Base64EncodedBytes
} from '@solana/kit'

// Re-export common types
export type { Address, Signature, Blockhash, Slot, Epoch, Lamports, Base58EncodedBytes, Base64EncodedBytes }

// Commitment levels with proper typing
export type Commitment = 'processed' | 'confirmed' | 'finalized'

// Account info with proper data types
export interface AccountInfo<TData = Buffer | ParsedAccountData> {
  /** Indicates if the account contains a program */
  executable: boolean
  /** Number of lamports in the account */
  lamports: Lamports
  /** Public key of the program this account has been assigned to */
  owner: Address
  /** Epoch at which this account will next owe rent */
  rentEpoch: Epoch
  /** The account data */
  data: TData
  /** Size of the account data */
  space?: bigint
}

// Parsed account data for token accounts and other programs
export interface ParsedAccountData {
  program: string
  parsed: unknown
  space: bigint
}

// RPC Response wrapper with context
export interface RpcResponse<T> {
  context: {
    slot: Slot
    apiVersion?: string
  }
  value: T
}

// Transaction status
export interface TransactionStatus {
  slot: Slot
  confirmations: number | null
  err: TransactionError | null
  confirmationStatus?: Commitment
}

// Type alias for backwards compatibility
export type SignatureStatus = TransactionStatus

// Block production info
export interface BlockProduction {
  byIdentity: Record<string, [number, number]>
  range: {
    firstSlot: Slot
    lastSlot: Slot
  }
}

// Supply info
export interface Supply {
  total: Lamports
  circulating: Lamports
  nonCirculating: Lamports
  nonCirculatingAccounts: Address[]
}

// Vote account info
export interface VoteAccount {
  votePubkey: Address
  nodePubkey: Address
  activatedStake: Lamports
  epochVoteAccount: boolean
  commission: number
  lastVote: Slot
  epochCredits: [Epoch, bigint, bigint][]
}

// Token account info
export interface TokenAccountInfo {
  mint: Address
  owner: Address
  amount: bigint
  delegate?: Address
  state: 'initialized' | 'frozen'
  isNative: boolean
  rentExemptReserve?: Lamports
  delegatedAmount?: bigint
  closeAuthority?: Address
}

// Transaction details
export interface TransactionResponse {
  slot: Slot
  transaction: {
    signatures: Signature[]
    message: {
      accountKeys: Address[]
      header: {
        numRequiredSignatures: number
        numReadonlySignedAccounts: number
        numReadonlyUnsignedAccounts: number
      }
      instructions: CompiledInstruction[]
      recentBlockhash: Blockhash
      addressTableLookups?: AddressTableLookup[]
    }
  }
  meta: TransactionMeta | null
  blockTime?: number | null
  version?: TransactionVersion
}

// Compiled instruction
export interface CompiledInstruction {
  programIdIndex: number
  accounts: number[]
  data: string
}

// Address table lookup
export interface AddressTableLookup {
  accountKey: Address
  writableIndexes: number[]
  readonlyIndexes: number[]
}

// Transaction meta
export interface TransactionMeta {
  err: TransactionError | null
  fee: Lamports
  preBalances: Lamports[]
  postBalances: Lamports[]
  innerInstructions?: CompiledInnerInstruction[]
  preTokenBalances?: TokenBalance[]
  postTokenBalances?: TokenBalance[]
  logMessages?: string[]
  rewards?: Reward[]
  loadedAddresses?: {
    writable: Address[]
    readonly: Address[]
  }
  returnData?: {
    programId: Address
    data: [string, 'base64']
  }
  computeUnitsConsumed?: bigint
}

// Inner instruction
export interface CompiledInnerInstruction {
  index: number
  instructions: CompiledInstruction[]
}

// Token balance
export interface TokenBalance {
  accountIndex: number
  mint: Address
  uiTokenAmount: {
    uiAmount: number | null
    decimals: number
    amount: string
    uiAmountString?: string
  }
  owner?: Address
  programId?: Address
}

// Reward
export interface Reward {
  pubkey: Address
  lamports: Lamports
  postBalance: Lamports
  rewardType: 'fee' | 'rent' | 'voting' | 'staking'
  commission?: number
}

// Blockhash info
export interface BlockhashInfo {
  blockhash: Blockhash
  lastValidBlockHeight: bigint
}

// Performance sample
export interface PerfSample {
  slot: Slot
  numTransactions: bigint
  numSlots: bigint
  samplePeriodSecs: number
}

// Epoch info
export interface EpochInfo {
  epoch: Epoch
  slotIndex: bigint
  slotsInEpoch: bigint
  absoluteSlot: Slot
  blockHeight?: bigint
  transactionCount?: bigint
}

// Leader schedule
export type LeaderSchedule = Record<string, Slot[]>

// Cluster nodes
export interface ClusterNode {
  pubkey: Address
  gossip?: string
  tpu?: string
  rpc?: string
  version?: string
  featureSet?: number
  shredVersion?: number
}

// Version info
export interface Version {
  'solana-core': string
  'feature-set': number
}

// Simulation result
export interface SimulatedTransactionResponse {
  err: TransactionError | null
  logs: string[] | null
  accounts?: (AccountInfo | null)[] | null
  unitsConsumed?: bigint
  returnData?: {
    programId: Address
    data: [string, 'base64']
  } | null
}

// Fee calculator (deprecated but still in some responses)
export interface FeeCalculator {
  lamportsPerSignature: Lamports
}

// Epoch schedule
export interface EpochSchedule {
  slotsPerEpoch: bigint
  leaderScheduleSlotOffset: bigint
  warmup: boolean
  firstNormalEpoch: Epoch
  firstNormalSlot: Slot
}

// Inflation info
export interface InflationGovernor {
  initial: number
  terminal: number
  taper: number
  foundation: number
  foundationTerm: number
}

export interface InflationRate {
  total: number
  validator: number
  foundation: number
  epoch: Epoch
}

// Stake activation
export interface StakeActivation {
  state: 'active' | 'inactive' | 'activating' | 'deactivating'
  active: Lamports
  inactive: Lamports
}

// Program account
export interface ProgramAccount<T = Buffer> {
  pubkey: Address
  account: AccountInfo<T>
}

// Logs response
export interface LogsResponse {
  signature: Signature
  err: TransactionError | null
  logs: string[]
}

// Signature info
export interface SignatureInfo {
  signature: Signature
  slot: Slot
  err: TransactionError | null
  memo: string | null
  blockTime?: number | null
}

// Address signature info  
export interface AddressSignatureInfo extends SignatureInfo {
  confirmationStatus?: Commitment
}

// Token supply
export interface TokenSupply {
  amount: string
  decimals: number
  uiAmount: number | null
  uiAmountString?: string
}

// Token account balance
export interface TokenAccountBalance {
  amount: string
  decimals: number
  uiAmount: number | null
  uiAmountString?: string
}

// Identity
export interface Identity {
  identity: Address
}

// Snapshot slot info
export interface SnapshotSlotInfo {
  full: Slot
  incremental?: Slot
}

// Health status
export type HealthStatus = 'ok' | { error: string }

// Prioritization fee
export interface PrioritizationFee {
  slot: Slot
  prioritizationFee: Lamports
}

// Recent performance samples
export interface RecentPerformanceSample {
  slot: Slot
  numTransactions: bigint
  numSlots: bigint
  samplePeriodSecs: number
}

// Transaction confirmation
export interface TransactionConfirmation {
  signature: Signature
  blockhash: Blockhash
  lastValidBlockHeight: bigint
  confirmationStatus: Commitment
}

// Modern RPC method options
export interface GetAccountInfoOptions {
  commitment?: Commitment
  encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed'
  dataSlice?: {
    offset: number
    length: number
  }
  minContextSlot?: Slot
}

export interface GetMultipleAccountsOptions {
  commitment?: Commitment
  encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed'
  dataSlice?: {
    offset: number
    length: number
  }
  minContextSlot?: Slot
}

export interface GetProgramAccountsOptions {
  commitment?: Commitment
  encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed'
  dataSlice?: {
    offset: number
    length: number
  }
  minContextSlot?: Slot
  filters?: (
    | { dataSize: bigint }
    | { 
        memcmp: { 
          offset: bigint
          bytes: Base58EncodedBytes
          encoding: 'base58'
        } 
      }
    | { 
        memcmp: { 
          offset: bigint
          bytes: Base64EncodedBytes
          encoding: 'base64'
        } 
      }
  )[]
  withContext?: boolean
}

export interface SendTransactionOptions {
  skipPreflight?: boolean
  preflightCommitment?: Commitment
  encoding?: 'base58' | 'base64'
  maxRetries?: number
  minContextSlot?: Slot
}

export interface SimulateTransactionOptions {
  sigVerify?: boolean
  commitment?: Commitment
  encoding?: 'base58' | 'base64'
  replaceRecentBlockhash?: boolean
  accounts?: {
    encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed'
    addresses: Address[]
  }
  minContextSlot?: Slot
}

export interface ConfirmTransactionOptions {
  commitment?: Commitment
  searchTransactionHistory?: boolean
}

// Type guards
export function isAccountInfo(value: unknown): value is AccountInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'executable' in value &&
    'lamports' in value &&
    'owner' in value &&
    'rentEpoch' in value &&
    'data' in value
  )
}

export function isTransactionError(value: unknown): value is TransactionError {
  return value !== null && typeof value === 'object' && 'InstructionError' in value
}

export function isParsedAccountData(data: unknown): data is ParsedAccountData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'program' in data &&
    'parsed' in data &&
    'space' in data
  )
}

// Helper types for RPC responses
export type GetAccountInfoResponse = RpcResponse<AccountInfo | null>
export type GetMultipleAccountsResponse = RpcResponse<(AccountInfo | null)[]>
export type GetProgramAccountsResponse = ProgramAccount[]
export type GetBalanceResponse = RpcResponse<Lamports>
export type GetBlockHeightResponse = bigint
export type GetBlockProductionResponse = RpcResponse<BlockProduction>
export type GetBlockTimeResponse = number | null
export type GetClusterNodesResponse = ClusterNode[]
export type GetEpochInfoResponse = EpochInfo
export type GetEpochScheduleResponse = EpochSchedule
export type GetFeeForMessageResponse = RpcResponse<Lamports | null>
export type GetGenesisHashResponse = Blockhash
export type GetHealthResponse = HealthStatus
export type GetIdentityResponse = Identity
export type GetInflationGovernorResponse = InflationGovernor
export type GetInflationRateResponse = InflationRate
export type GetLatestBlockhashResponse = RpcResponse<BlockhashInfo>
export type GetLeaderScheduleResponse = LeaderSchedule | null
export type GetMaxRetransmitSlotResponse = Slot
export type GetMinimumBalanceForRentExemptionResponse = Lamports
export type GetRecentPerformanceSamplesResponse = RecentPerformanceSample[]
export type GetSignatureStatusesResponse = RpcResponse<(TransactionStatus | null)[]>
export type GetSlotResponse = Slot
export type GetSlotLeaderResponse = Address
export type GetStakeActivationResponse = StakeActivation
export type GetSupplyResponse = RpcResponse<Supply>
export type GetTokenAccountBalanceResponse = RpcResponse<TokenAccountBalance>
export type GetTokenAccountsByDelegateResponse = RpcResponse<ProgramAccount<ParsedAccountData>[]>
export type GetTokenAccountsByOwnerResponse = RpcResponse<ProgramAccount<ParsedAccountData>[]>
export type GetTokenSupplyResponse = RpcResponse<TokenSupply>
export type GetTransactionResponse = TransactionResponse | null
export type GetTransactionCountResponse = bigint
export type GetVersionResponse = Version
export interface GetVoteAccountsResponse {
  current: VoteAccount[]
  delinquent: VoteAccount[]
}
export type RequestAirdropResponse = Signature
export type SendTransactionResponse = Signature
export type SimulateTransactionResponse = RpcResponse<SimulatedTransactionResponse>