/**
 * Token-2022 Extension Types
 * 
 * Comprehensive type definitions for all Token-2022 extensions
 * Based on SPL Token-2022 specification
 */

import type { Address } from '@solana/addresses'

// =====================================================
// MINT EXTENSIONS
// =====================================================

/**
 * Transfer fee configuration for a mint
 */
export interface TransferFeeConfig {
  /** Transfer fee authority */
  transferFeeConfigAuthority: Address | null
  /** Withdraw withheld authority */
  withdrawWithheldAuthority: Address | null
  /** Withheld amount */
  withheldAmount: bigint
  /** Older transfer fee */
  olderTransferFee: TransferFee
  /** Newer transfer fee */
  newerTransferFee: TransferFee
}

/**
 * Transfer fee structure
 */
export interface TransferFee {
  /** Epoch when fee takes effect */
  epoch: bigint
  /** Maximum fee in token base units */
  maximumFee: bigint
  /** Fee in basis points */
  transferFeeBasisPoints: number
}

/**
 * Interest-bearing mint configuration
 */
export interface InterestBearingConfig {
  /** Rate authority */
  rateAuthority: Address | null
  /** Initialization timestamp */
  initializationTimestamp: bigint
  /** Pre-update average rate */
  preUpdateAverageRate: number
  /** Last update timestamp */
  lastUpdateTimestamp: bigint
  /** Current rate in basis points */
  currentRate: number
}

/**
 * Mint close authority configuration
 */
export interface MintCloseAuthority {
  /** Authority that can close the mint */
  closeAuthority: Address | null
}

/**
 * Permanent delegate configuration
 */
export interface PermanentDelegate {
  /** Permanent delegate address */
  delegate: Address | null
}

/**
 * Default account state configuration
 */
export interface DefaultAccountState {
  /** Default state for new accounts */
  state: AccountState
}

/**
 * Account state enum
 */
export enum AccountState {
  Uninitialized = 0,
  Initialized = 1,
  Frozen = 2
}

/**
 * Transfer hook configuration
 */
export interface TransferHook {
  /** Authority that can update the transfer hook program */
  authority: Address | null
  /** Transfer hook program ID */
  programId: Address | null
}

/**
 * Metadata pointer configuration
 */
export interface MetadataPointer {
  /** Authority that can update the metadata pointer */
  authority: Address | null
  /** Address where metadata is stored */
  metadataAddress: Address | null
}

/**
 * Group pointer configuration
 */
export interface GroupPointer {
  /** Authority that can update the group pointer */
  authority: Address | null
  /** Group address */
  groupAddress: Address | null
}

/**
 * Group member pointer configuration
 */
export interface GroupMemberPointer {
  /** Authority that can update the group member pointer */
  authority: Address | null
  /** Member address */
  memberAddress: Address | null
}

/**
 * Confidential transfer mint configuration
 */
export interface ConfidentialTransferMint {
  /** Authority that can modify the configuration */
  authority: Address | null
  /** Auto-approve new accounts */
  autoApproveNewAccounts: boolean
  /** Optional auditor ElGamal public key */
  auditorElgamalPubkey: Uint8Array | null
}

/**
 * Transfer fee amount extension (for accounts)
 */
export interface TransferFeeAmount {
  /** Withheld amount */
  withheldAmount: bigint
}

// =====================================================
// ACCOUNT EXTENSIONS
// =====================================================

/**
 * Immutable owner configuration
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImmutableOwner {
  // No additional data - presence indicates immutable owner
}

/**
 * Non-transferable configuration
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NonTransferable {
  // No additional data - presence indicates non-transferable
}

/**
 * Memo required on transfer configuration
 */
export interface MemoTransfer {
  /** Whether memo is required for incoming transfers */
  requireIncomingTransferMemos: boolean
}

/**
 * CPI guard configuration
 */
export interface CpiGuard {
  /** Lock that prevents CPI re-entrancy */
  lockCpi: boolean
}

/**
 * Confidential transfer account configuration
 */
export interface ConfidentialTransferAccount {
  /** Account is approved for confidential transfers */
  approved: boolean
  /** ElGamal public key */
  elgamalPubkey: Uint8Array
  /** Pending balance (low 48 bits) */
  pendingBalanceLo: Uint8Array
  /** Pending balance (high 16 bits) */
  pendingBalanceHi: Uint8Array
  /** Available balance (low 48 bits) */
  availableBalanceLo: Uint8Array
  /** Available balance (high 16 bits) */
  availableBalanceHi: Uint8Array
  /** Decryptable available balance */
  decryptableAvailableBalance: bigint
  /** Allow confidential credits */
  allowConfidentialCredits: boolean
  /** Allow non-confidential credits */
  allowNonConfidentialCredits: boolean
  /** Pending balance credit counter (low 48 bits) */
  pendingBalanceCreditCounterLo: bigint
  /** Pending balance credit counter (high 16 bits) */
  pendingBalanceCreditCounterHi: bigint
  /** Maximum pending balance credit counter */
  maximumPendingBalanceCreditCounter: bigint
  /** Expected pending balance credit counter */
  expectedPendingBalanceCreditCounter: bigint
  /** Actual pending balance credit counter */
  actualPendingBalanceCreditCounter: bigint
}

/**
 * Transfer hook account configuration
 */
export interface TransferHookAccount {
  /** Whether transfer hook is active */
  transferring: boolean
}

// =====================================================
// TOKEN METADATA
// =====================================================

/**
 * Token metadata structure
 */
export interface TokenMetadata {
  /** The authority that can update the metadata */
  updateAuthority: Address | null
  /** The mint address */
  mint: Address
  /** Token name */
  name: string
  /** Token symbol */
  symbol: string
  /** Token URI for off-chain metadata */
  uri: string
  /** Additional metadata fields */
  additionalMetadata: AdditionalMetadata[]
}

/**
 * Additional metadata field
 */
export interface AdditionalMetadata {
  /** Field key */
  key: string
  /** Field value */
  value: string
}

// =====================================================
// GROUP EXTENSIONS
// =====================================================

/**
 * Token group configuration
 */
export interface TokenGroup {
  /** The authority that can update the group */
  updateAuthority: Address | null
  /** The mint address of the group */
  mint: Address
  /** Current group size */
  size: bigint
  /** Maximum group size */
  maxSize: bigint
}

/**
 * Token group member configuration
 */
export interface TokenGroupMember {
  /** The mint address of the member */
  mint: Address
  /** The group this member belongs to */
  group: Address
  /** Member number within the group */
  memberNumber: bigint
}

// =====================================================
// EXTENSION TYPE ENUM
// =====================================================

/**
 * All possible Token-2022 extensions
 */
export enum ExtensionType {
  Uninitialized = 0,
  TransferFeeConfig = 1,
  TransferFeeAmount = 2,
  MintCloseAuthority = 3,
  ConfidentialTransferMint = 4,
  ConfidentialTransferAccount = 5,
  DefaultAccountState = 6,
  ImmutableOwner = 7,
  MemoTransfer = 8,
  NonTransferable = 9,
  InterestBearingConfig = 10,
  CpiGuard = 11,
  PermanentDelegate = 12,
  NonTransferableAccount = 13,
  TransferHook = 14,
  TransferHookAccount = 15,
  MetadataPointer = 16,
  TokenMetadata = 17,
  GroupPointer = 18,
  GroupMemberPointer = 19,
  TokenGroup = 20,
  TokenGroupMember = 21
}

// =====================================================
// COMPOSITE TYPES
// =====================================================

/**
 * All mint extensions mapped by type
 */
export interface MintExtensions {
  transferFeeConfig?: TransferFeeConfig
  transferFeeAmount?: TransferFeeAmount
  mintCloseAuthority?: MintCloseAuthority
  confidentialTransferMint?: ConfidentialTransferMint
  defaultAccountState?: DefaultAccountState
  nonTransferable?: NonTransferable
  interestBearingConfig?: InterestBearingConfig
  permanentDelegate?: PermanentDelegate
  transferHook?: TransferHook
  metadataPointer?: MetadataPointer
  tokenMetadata?: TokenMetadata
  groupPointer?: GroupPointer
  tokenGroup?: TokenGroup
}

/**
 * All account extensions mapped by type
 */
export interface AccountExtensions {
  transferFeeAmount?: TransferFeeAmount
  confidentialTransferAccount?: ConfidentialTransferAccount
  immutableOwner?: ImmutableOwner
  memoTransfer?: MemoTransfer
  nonTransferableAccount?: NonTransferable
  cpiGuard?: CpiGuard
  transferHookAccount?: TransferHookAccount
  groupMemberPointer?: GroupMemberPointer
  tokenGroupMember?: TokenGroupMember
}

/**
 * Combined mint account data with extensions
 */
export interface MintWithExtensions {
  /** Basic mint data */
  address: Address
  mintAuthority: Address | null
  supply: bigint
  decimals: number
  isInitialized: boolean
  freezeAuthority: Address | null
  /** Extensions */
  extensions: MintExtensions
}

/**
 * Combined token account data with extensions
 */
export interface TokenAccountWithExtensions {
  /** Basic account data */
  address: Address
  mint: Address
  owner: Address
  amount: bigint
  delegate: Address | null
  state: AccountState
  isNative: boolean
  delegatedAmount: bigint
  closeAuthority: Address | null
  /** Extensions */
  extensions: AccountExtensions
}

// =====================================================
// RPC TYPES
// =====================================================

/**
 * Parsed mint account data from RPC
 */
export interface ParsedMintAccount {
  type: 'mint'
  info: {
    mintAuthority: string | null
    supply: string
    decimals: number
    isInitialized: boolean
    freezeAuthority: string | null
    extensions?: {
      extension: string
      state: Record<string, unknown>
    }[]
  }
}

/**
 * Parsed token account data from RPC
 */
export interface ParsedTokenAccount {
  type: 'account'
  info: {
    mint: string
    owner: string
    tokenAmount: {
      amount: string
      decimals: number
      uiAmount: number | null
      uiAmountString: string
    }
    delegate?: string
    state: string
    isNative: boolean
    rentExemptReserve?: string
    delegatedAmount?: {
      amount: string
      decimals: number
      uiAmount: number | null
      uiAmountString: string
    }
    closeAuthority?: string
    extensions?: {
      extension: string
      state: Record<string, unknown>
    }[]
  }
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Extension data with discriminator
 */
export interface Extension<T> {
  /** Extension type discriminator */
  extensionType: ExtensionType
  /** Extension data */
  data: T
}

/**
 * TLV (Type-Length-Value) structure for extensions
 */
export interface ExtensionTLV {
  /** Extension type (2 bytes) */
  extensionType: ExtensionType
  /** Data length (2 bytes) */
  length: number
  /** Extension data (variable length) */
  data: Uint8Array
}

/**
 * Result of parsing extensions
 */
export interface ParsedExtensions {
  /** All extensions found */
  extensions: ExtensionTLV[]
  /** Remaining data after extensions */
  remainingData: Uint8Array
}

/**
 * Token-2022 program configuration
 */
export interface Token2022Config {
  /** Program ID (default: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb) */
  programId: Address
  /** Maximum transfer fee basis points (10,000 = 100%) */
  maxTransferFeeBasisPoints: number
  /** Maximum interest rate basis points */
  maxInterestRateBasisPoints: number
}