/**
 * Token-2022 RPC Module
 * 
 * Functions to query Token-2022 mint and account data with extensions
 * Includes parsers for all Token-2022 extension types
 */

import './text-encoder-polyfill.js'
import type { Address } from '@solana/addresses'
import {
  getAddressDecoder,
  getAddressEncoder,
  // Import codecs from @solana/kit instead of @solana/codecs
  getU8Decoder,
  getU16Decoder,
  getU32Decoder,
  getU64Decoder,
  getBooleanDecoder,
  getUtf8Decoder
} from '@solana/kit'
import { 
  type Commitment
} from '../types/rpc-types.js'
import {
  createTypedRpcClient
} from '../types/rpc-client-types.js'
import {
  type MintWithExtensions,
  type TokenAccountWithExtensions,
  ExtensionType,
  type ExtensionTLV,
  type ParsedExtensions,
  type TransferFeeConfig,
  type InterestBearingConfig,
  type MintCloseAuthority,
  type PermanentDelegate,
  type DefaultAccountState,
  type TransferHook,
  type MetadataPointer,
  type GroupPointer,
  type GroupMemberPointer,
  type ConfidentialTransferMint,
  type TransferFeeAmount,
  type ImmutableOwner,
  type NonTransferable,
  type MemoTransfer,
  type CpiGuard,
  type ConfidentialTransferAccount,
  type TransferHookAccount,
  type TokenMetadata,
  type TokenGroup,
  type TokenGroupMember,
  type AccountState
} from '../types/token-2022-types.js'

// =====================================================
// CONSTANTS
// =====================================================

/** Token-2022 program ID */
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address

/** Mint account size without extensions */
const MINT_SIZE = 82

/** Token account size without extensions */
const ACCOUNT_SIZE = 165

/** Extension discriminator size */
const EXTENSION_TYPE_SIZE = 2

/** Extension length size */
const EXTENSION_LENGTH_SIZE = 2

// =====================================================
// EXTENSION PARSERS
// =====================================================

/**
 * Parse TLV (Type-Length-Value) extensions from account data
 */
function parseExtensions(data: Uint8Array, baseSize: number): ParsedExtensions {
  const extensions: ExtensionTLV[] = []
  let offset = baseSize

  while (offset + EXTENSION_TYPE_SIZE + EXTENSION_LENGTH_SIZE <= data.length) {
    // Read extension type (2 bytes, little-endian)
    const extensionType = getU16Decoder().decode(data.slice(offset, offset + 2)) as ExtensionType
    offset += EXTENSION_TYPE_SIZE

    // Check for account type discriminator (indicates end of extensions)
    const maxExtensionType = Object.values(ExtensionType).filter(val => typeof val === 'number').pop() as number
    const extensionTypeNumber = extensionType as number
    if (extensionTypeNumber === 0 || extensionTypeNumber > maxExtensionType) {
      break
    }

    // Read extension length (2 bytes, little-endian)
    const length = getU16Decoder().decode(data.slice(offset, offset + 2))
    offset += EXTENSION_LENGTH_SIZE

    // Read extension data
    const extensionData = data.slice(offset, offset + length)
    offset += length

    extensions.push({
      extensionType,
      length,
      data: extensionData
    })
  }

  return {
    extensions,
    remainingData: data.slice(offset)
  }
}

/**
 * Parse transfer fee configuration
 */
function parseTransferFeeConfig(data: Uint8Array): TransferFeeConfig {
  let offset = 0
  
  // Transfer fee config authority (32 bytes, optional)
  const transferFeeConfigAuthority = data.slice(offset, offset + 32)
  const hasAuthority = transferFeeConfigAuthority.some(b => b !== 0)
  offset += 32

  // Withdraw withheld authority (32 bytes, optional)
  const withdrawWithheldAuthority = data.slice(offset, offset + 32)
  const hasWithdrawAuthority = withdrawWithheldAuthority.some(b => b !== 0)
  offset += 32

  // Withheld amount (8 bytes)
  const withheldAmount = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // Older transfer fee
  const olderEpoch = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8
  const olderMaximumFee = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8
  const olderTransferFeeBasisPoints = getU16Decoder().decode(data.slice(offset, offset + 2))
  offset += 2

  // Newer transfer fee
  const newerEpoch = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8
  const newerMaximumFee = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8
  const newerTransferFeeBasisPoints = getU16Decoder().decode(data.slice(offset, offset + 2))

  return {
    transferFeeConfigAuthority: hasAuthority ? getAddressDecoder().decode(transferFeeConfigAuthority) : null,
    withdrawWithheldAuthority: hasWithdrawAuthority ? getAddressDecoder().decode(withdrawWithheldAuthority) : null,
    withheldAmount,
    olderTransferFee: {
      epoch: olderEpoch,
      maximumFee: olderMaximumFee,
      transferFeeBasisPoints: olderTransferFeeBasisPoints
    },
    newerTransferFee: {
      epoch: newerEpoch,
      maximumFee: newerMaximumFee,
      transferFeeBasisPoints: newerTransferFeeBasisPoints
    }
  }
}

/**
 * Parse interest-bearing configuration
 */
function parseInterestBearingConfig(data: Uint8Array): InterestBearingConfig {
  let offset = 0

  // Rate authority (32 bytes, optional)
  const rateAuthority = data.slice(offset, offset + 32)
  const hasAuthority = rateAuthority.some(b => b !== 0)
  offset += 32

  // Initialization timestamp (8 bytes)
  const initializationTimestamp = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // Pre-update average rate (2 bytes)
  const preUpdateAverageRate = getU16Decoder().decode(data.slice(offset, offset + 2))
  offset += 2

  // Last update timestamp (8 bytes)
  const lastUpdateTimestamp = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // Current rate (2 bytes)
  const currentRate = getU16Decoder().decode(data.slice(offset, offset + 2))

  return {
    rateAuthority: hasAuthority ? getAddressDecoder().decode(rateAuthority) : null,
    initializationTimestamp,
    preUpdateAverageRate,
    lastUpdateTimestamp,
    currentRate
  }
}

/**
 * Parse confidential transfer mint configuration
 */
function parseConfidentialTransferMint(data: Uint8Array): ConfidentialTransferMint {
  let offset = 0

  // Authority (32 bytes, optional)
  const authority = data.slice(offset, offset + 32)
  const hasAuthority = authority.some(b => b !== 0)
  offset += 32

  // Auto-approve new accounts (1 byte)
  const autoApproveNewAccounts = getBooleanDecoder().decode(data.slice(offset, offset + 1))
  offset += 1

  // Auditor ElGamal pubkey (32 bytes, optional)
  const auditorElgamalPubkey = data.slice(offset, offset + 32)
  const hasAuditor = auditorElgamalPubkey.some(b => b !== 0)

  return {
    authority: hasAuthority ? getAddressDecoder().decode(authority) : null,
    autoApproveNewAccounts,
    auditorElgamalPubkey: hasAuditor ? auditorElgamalPubkey : null
  }
}

/**
 * Parse confidential transfer account configuration
 */
function parseConfidentialTransferAccount(data: Uint8Array): ConfidentialTransferAccount {
  let offset = 0

  // Approved (1 byte)
  const approved = getBooleanDecoder().decode(data.slice(offset, offset + 1))
  offset += 1

  // ElGamal pubkey (32 bytes)
  const elgamalPubkey = data.slice(offset, offset + 32)
  offset += 32

  // Pending balance low (64 bytes - ElGamal ciphertext)
  const pendingBalanceLo = data.slice(offset, offset + 64)
  offset += 64

  // Pending balance high (64 bytes - ElGamal ciphertext)
  const pendingBalanceHi = data.slice(offset, offset + 64)
  offset += 64

  // Available balance low (64 bytes - ElGamal ciphertext)
  const availableBalanceLo = data.slice(offset, offset + 64)
  offset += 64

  // Available balance high (64 bytes - ElGamal ciphertext)
  const availableBalanceHi = data.slice(offset, offset + 64)
  offset += 64

  // Decryptable available balance (8 bytes)
  const decryptableAvailableBalance = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // Allow confidential credits (1 byte)
  const allowConfidentialCredits = getBooleanDecoder().decode(data.slice(offset, offset + 1))
  offset += 1

  // Allow non-confidential credits (1 byte)
  const allowNonConfidentialCredits = getBooleanDecoder().decode(data.slice(offset, offset + 1))
  offset += 1

  // Pending balance credit counter low (8 bytes)
  const pendingBalanceCreditCounterLo = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // Pending balance credit counter high (8 bytes)
  const pendingBalanceCreditCounterHi = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // Maximum pending balance credit counter (8 bytes)
  const maximumPendingBalanceCreditCounter = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // Expected pending balance credit counter (8 bytes)
  const expectedPendingBalanceCreditCounter = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // Actual pending balance credit counter (8 bytes)
  const actualPendingBalanceCreditCounter = getU64Decoder().decode(data.slice(offset, offset + 8))

  return {
    approved,
    elgamalPubkey,
    pendingBalanceLo,
    pendingBalanceHi,
    availableBalanceLo,
    availableBalanceHi,
    decryptableAvailableBalance,
    allowConfidentialCredits,
    allowNonConfidentialCredits,
    pendingBalanceCreditCounterLo,
    pendingBalanceCreditCounterHi,
    maximumPendingBalanceCreditCounter,
    expectedPendingBalanceCreditCounter,
    actualPendingBalanceCreditCounter
  }
}

/**
 * Parse token metadata
 */
function parseTokenMetadata(data: Uint8Array): TokenMetadata {
  let offset = 0

  // Update authority (33 bytes - 1 byte option + 32 bytes pubkey)
  const hasUpdateAuthority = data[offset] === 1
  offset += 1
  const updateAuthority = hasUpdateAuthority ? getAddressDecoder().decode(data.slice(offset, offset + 32)) : null
  offset += 32

  // Mint (32 bytes)
  const mint = getAddressDecoder().decode(data.slice(offset, offset + 32))
  offset += 32

  // Name length (4 bytes) and name
  const nameLength = getU32Decoder().decode(data.slice(offset, offset + 4))
  offset += 4
  const name = getUtf8Decoder().decode(data.slice(offset, offset + nameLength))
  offset += nameLength

  // Symbol length (4 bytes) and symbol
  const symbolLength = getU32Decoder().decode(data.slice(offset, offset + 4))
  offset += 4
  const symbol = getUtf8Decoder().decode(data.slice(offset, offset + symbolLength))
  offset += symbolLength

  // URI length (4 bytes) and URI
  const uriLength = getU32Decoder().decode(data.slice(offset, offset + 4))
  offset += 4
  const uri = getUtf8Decoder().decode(data.slice(offset, offset + uriLength))
  offset += uriLength

  // Additional metadata count (4 bytes)
  const additionalMetadataCount = getU32Decoder().decode(data.slice(offset, offset + 4))
  offset += 4

  const additionalMetadata = []
  for (let i = 0; i < additionalMetadataCount; i++) {
    // Key length and key
    const keyLength = getU32Decoder().decode(data.slice(offset, offset + 4))
    offset += 4
    const key = getUtf8Decoder().decode(data.slice(offset, offset + keyLength))
    offset += keyLength

    // Value length and value
    const valueLength = getU32Decoder().decode(data.slice(offset, offset + 4))
    offset += 4
    const value = getUtf8Decoder().decode(data.slice(offset, offset + valueLength))
    offset += valueLength

    additionalMetadata.push({ key, value })
  }

  return {
    updateAuthority,
    mint,
    name,
    symbol,
    uri,
    additionalMetadata
  }
}

/**
 * Parse extension based on type
 */
function parseExtension(extensionType: ExtensionType, data: Uint8Array): unknown {
  switch (extensionType) {
    case ExtensionType.TransferFeeConfig:
      return parseTransferFeeConfig(data)
    
    case ExtensionType.TransferFeeAmount:
      return { withheldAmount: getU64Decoder().decode(data) }
    
    case ExtensionType.MintCloseAuthority: {
      const closeAuthority = data.some(b => b !== 0) ? getAddressDecoder().decode(data) : null
      return { closeAuthority }
    }
    
    case ExtensionType.ConfidentialTransferMint:
      return parseConfidentialTransferMint(data)
    
    case ExtensionType.ConfidentialTransferAccount:
      return parseConfidentialTransferAccount(data)
    
    case ExtensionType.DefaultAccountState:
      return { state: getU8Decoder().decode(data) as AccountState }
    
    case ExtensionType.ImmutableOwner:
      return {} // No additional data
    
    case ExtensionType.MemoTransfer:
      return { requireIncomingTransferMemos: getBooleanDecoder().decode(data) }
    
    case ExtensionType.NonTransferable:
    case ExtensionType.NonTransferableAccount:
      return {} // No additional data
    
    case ExtensionType.InterestBearingConfig:
      return parseInterestBearingConfig(data)
    
    case ExtensionType.CpiGuard:
      return { lockCpi: getBooleanDecoder().decode(data) }
    
    case ExtensionType.PermanentDelegate: {
      const delegate = data.some(b => b !== 0) ? getAddressDecoder().decode(data) : null
      return { delegate }
    }
    
    case ExtensionType.TransferHook: {
      const authority = data.slice(0, 32).some(b => b !== 0) ? getAddressDecoder().decode(data.slice(0, 32)) : null
      const programId = data.slice(32, 64).some(b => b !== 0) ? getAddressDecoder().decode(data.slice(32, 64)) : null
      return { authority, programId }
    }
    
    case ExtensionType.TransferHookAccount:
      return { transferring: getBooleanDecoder().decode(data) }
    
    case ExtensionType.MetadataPointer:
    case ExtensionType.GroupPointer:
    case ExtensionType.GroupMemberPointer: {
      const pointerAuthority = data.slice(0, 32).some(b => b !== 0) ? getAddressDecoder().decode(data.slice(0, 32)) : null
      const pointerAddress = data.slice(32, 64).some(b => b !== 0) ? getAddressDecoder().decode(data.slice(32, 64)) : null
      return { authority: pointerAuthority, [`${extensionType === ExtensionType.MetadataPointer ? 'metadata' : extensionType === ExtensionType.GroupPointer ? 'group' : 'member'}Address`]: pointerAddress }
    }
    
    case ExtensionType.TokenMetadata:
      return parseTokenMetadata(data)
    
    case ExtensionType.TokenGroup:
    case ExtensionType.TokenGroupMember:
      // Complex parsing for group extensions - simplified for now
      return {}
    
    default:
      return {}
  }
}

// =====================================================
// MINT QUERIES
// =====================================================

/**
 * Get mint account with extensions
 */
export async function getMintWithExtensions(
  rpc: unknown,
  mint: Address,
  commitment?: Commitment
): Promise<MintWithExtensions | null> {
  // Get account info
  const typedRpc = createTypedRpcClient(rpc)
  const response = await typedRpc.getAccountInfo(mint, { commitment, encoding: 'base64' })
  const accountInfo = response.value
  
  if (!accountInfo?.data) {
    return null
  }

  // Decode account data
  let data: Uint8Array
  if (Array.isArray(accountInfo.data)) {
    data = new Uint8Array(Buffer.from(accountInfo.data[0], 'base64'))
  } else if (typeof accountInfo.data === 'string') {
    data = new Uint8Array(Buffer.from(accountInfo.data, 'base64'))
  } else {
    throw new Error('Unexpected data format')
  }
  
  // Check if this is a Token-2022 mint
  if (accountInfo.owner !== TOKEN_2022_PROGRAM_ID) {
    throw new Error('Not a Token-2022 mint')
  }

  // Parse basic mint data
  let offset = 0
  
  // COption<Pubkey> for mint authority (1 + 32 bytes)
  const hasMintAuthority = data[offset] === 1
  offset += 1
  const mintAuthority = hasMintAuthority ? getAddressDecoder().decode(data.slice(offset, offset + 32)) : null
  offset += 32

  // Supply (8 bytes)
  const supply = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // Decimals (1 byte)
  const decimals = data[offset]
  offset += 1

  // Is initialized (1 byte)
  const isInitialized = data[offset] === 1
  offset += 1

  // COption<Pubkey> for freeze authority (1 + 32 bytes)
  const hasFreezeAuthority = data[offset] === 1
  offset += 1
  const freezeAuthority = hasFreezeAuthority ? getAddressDecoder().decode(data.slice(offset, offset + 32)) : null

  // Parse extensions if present
  const extensions: MintWithExtensions['extensions'] = {}
  
  if (data.length > MINT_SIZE) {
    const parsed = parseExtensions(data, MINT_SIZE)
    
    for (const ext of parsed.extensions) {
      const extensionData = parseExtension(ext.extensionType, ext.data)
      
      switch (ext.extensionType) {
        case ExtensionType.TransferFeeConfig:
          extensions.transferFeeConfig = extensionData as TransferFeeConfig
          break
        case ExtensionType.MintCloseAuthority:
          extensions.mintCloseAuthority = extensionData as MintCloseAuthority
          break
        case ExtensionType.ConfidentialTransferMint:
          extensions.confidentialTransferMint = extensionData as ConfidentialTransferMint
          break
        case ExtensionType.DefaultAccountState:
          extensions.defaultAccountState = extensionData as DefaultAccountState
          break
        case ExtensionType.NonTransferable:
          extensions.nonTransferable = extensionData as NonTransferable
          break
        case ExtensionType.InterestBearingConfig:
          extensions.interestBearingConfig = extensionData as InterestBearingConfig
          break
        case ExtensionType.PermanentDelegate:
          extensions.permanentDelegate = extensionData as PermanentDelegate
          break
        case ExtensionType.TransferHook:
          extensions.transferHook = extensionData as TransferHook
          break
        case ExtensionType.MetadataPointer:
          extensions.metadataPointer = extensionData as MetadataPointer
          break
        case ExtensionType.TokenMetadata:
          extensions.tokenMetadata = extensionData as TokenMetadata
          break
        case ExtensionType.GroupPointer:
          extensions.groupPointer = extensionData as GroupPointer
          break
        case ExtensionType.TokenGroup:
          extensions.tokenGroup = extensionData as TokenGroup
          break
      }
    }
  }

  return {
    address: mint,
    mintAuthority,
    supply,
    decimals,
    isInitialized,
    freezeAuthority,
    extensions
  }
}

/**
 * Get multiple mints with extensions
 */
export async function getMultipleMintsWithExtensions(
  rpc: unknown,
  mints: Address[],
  commitment?: Commitment
): Promise<(MintWithExtensions | null)[]> {
  const typedRpc = createTypedRpcClient(rpc)
  const response = await typedRpc.getMultipleAccounts(mints, { commitment, encoding: 'base64' })
  const accountInfos = response.value
  
  return Promise.all(accountInfos.map(async (info, index) => {
    if (!info?.data) return null
    
    try {
      // Process each account info
      return await getMintWithExtensions(rpc, mints[index], commitment)
    } catch {
      return null
    }
  }))
}

/**
 * Check if a mint has a specific extension
 */
export async function mintHasExtension(
  rpc: unknown,
  mint: Address,
  extensionType: ExtensionType,
  commitment?: Commitment
): Promise<boolean> {
  const mintData = await getMintWithExtensions(rpc, mint, commitment)
  if (!mintData) return false

  switch (extensionType) {
    case ExtensionType.TransferFeeConfig:
      return Boolean(mintData.extensions.transferFeeConfig)
    case ExtensionType.MintCloseAuthority:
      return Boolean(mintData.extensions.mintCloseAuthority)
    case ExtensionType.ConfidentialTransferMint:
      return Boolean(mintData.extensions.confidentialTransferMint)
    case ExtensionType.DefaultAccountState:
      return Boolean(mintData.extensions.defaultAccountState)
    case ExtensionType.NonTransferable:
      return Boolean(mintData.extensions.nonTransferable)
    case ExtensionType.InterestBearingConfig:
      return Boolean(mintData.extensions.interestBearingConfig)
    case ExtensionType.PermanentDelegate:
      return Boolean(mintData.extensions.permanentDelegate)
    case ExtensionType.TransferHook:
      return Boolean(mintData.extensions.transferHook)
    case ExtensionType.MetadataPointer:
      return Boolean(mintData.extensions.metadataPointer)
    case ExtensionType.TokenMetadata:
      return Boolean(mintData.extensions.tokenMetadata)
    case ExtensionType.GroupPointer:
      return Boolean(mintData.extensions.groupPointer)
    case ExtensionType.TokenGroup:
      return Boolean(mintData.extensions.tokenGroup)
    default:
      return false
  }
}

// =====================================================
// ACCOUNT QUERIES
// =====================================================

/**
 * Get token account with extensions
 */
export async function getTokenAccountWithExtensions(
  rpc: unknown,
  account: Address,
  commitment?: Commitment
): Promise<TokenAccountWithExtensions | null> {
  // Get account info
  const typedRpc = createTypedRpcClient(rpc)
  const response = await typedRpc.getAccountInfo(account, { commitment, encoding: 'base64' })
  const accountInfo = response.value
  
  if (!accountInfo?.data) {
    return null
  }

  // Decode account data
  let data: Uint8Array
  if (Array.isArray(accountInfo.data)) {
    data = new Uint8Array(Buffer.from(accountInfo.data[0], 'base64'))
  } else if (typeof accountInfo.data === 'string') {
    data = new Uint8Array(Buffer.from(accountInfo.data, 'base64'))
  } else {
    throw new Error('Unexpected data format')
  }
  
  // Check if this is a Token-2022 account
  if (accountInfo.owner !== TOKEN_2022_PROGRAM_ID) {
    throw new Error('Not a Token-2022 account')
  }

  // Parse basic account data
  let offset = 0
  
  // Mint (32 bytes)
  const mint = getAddressDecoder().decode(data.slice(offset, offset + 32))
  offset += 32

  // Owner (32 bytes)
  const owner = getAddressDecoder().decode(data.slice(offset, offset + 32))
  offset += 32

  // Amount (8 bytes)
  const amount = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // COption<Pubkey> for delegate (1 + 32 bytes)
  const hasDelegate = data[offset] === 1
  offset += 1
  const delegate = hasDelegate ? getAddressDecoder().decode(data.slice(offset, offset + 32)) : null
  offset += 32

  // State (1 byte)
  const state = data[offset] as AccountState
  offset += 1

  // COption<u64> for is_native (1 + 8 bytes)
  const isNative = data[offset] === 1
  offset += 1
  offset += 8 // Skip native amount if present

  // Delegated amount (8 bytes)
  const delegatedAmount = getU64Decoder().decode(data.slice(offset, offset + 8))
  offset += 8

  // COption<Pubkey> for close authority (1 + 32 bytes)
  const hasCloseAuthority = data[offset] === 1
  offset += 1
  const closeAuthority = hasCloseAuthority ? getAddressDecoder().decode(data.slice(offset, offset + 32)) : null

  // Parse extensions if present
  const extensions: TokenAccountWithExtensions['extensions'] = {}
  
  if (data.length > ACCOUNT_SIZE) {
    const parsed = parseExtensions(data, ACCOUNT_SIZE)
    
    for (const ext of parsed.extensions) {
      const extensionData = parseExtension(ext.extensionType, ext.data)
      
      switch (ext.extensionType) {
        case ExtensionType.TransferFeeAmount:
          extensions.transferFeeAmount = extensionData as TransferFeeAmount
          break
        case ExtensionType.ConfidentialTransferAccount:
          extensions.confidentialTransferAccount = extensionData as ConfidentialTransferAccount
          break
        case ExtensionType.ImmutableOwner:
          extensions.immutableOwner = extensionData as ImmutableOwner
          break
        case ExtensionType.MemoTransfer:
          extensions.memoTransfer = extensionData as MemoTransfer
          break
        case ExtensionType.NonTransferableAccount:
          extensions.nonTransferableAccount = extensionData as NonTransferable
          break
        case ExtensionType.CpiGuard:
          extensions.cpiGuard = extensionData as CpiGuard
          break
        case ExtensionType.TransferHookAccount:
          extensions.transferHookAccount = extensionData as TransferHookAccount
          break
        case ExtensionType.GroupMemberPointer:
          extensions.groupMemberPointer = extensionData as GroupMemberPointer
          break
        case ExtensionType.TokenGroupMember:
          extensions.tokenGroupMember = extensionData as TokenGroupMember
          break
      }
    }
  }

  return {
    address: account,
    mint,
    owner,
    amount,
    delegate,
    state,
    isNative,
    delegatedAmount,
    closeAuthority,
    extensions
  }
}

/**
 * Get all token accounts for a wallet with extensions
 */
export async function getTokenAccountsByOwnerWithExtensions(
  rpc: unknown,
  owner: Address,
  mint?: Address,
  commitment?: Commitment
): Promise<TokenAccountWithExtensions[]> {
  const filters = [
    {
      dataSize: 165 // Minimum Token-2022 account size
    },
    {
      memcmp: {
        offset: 32, // Owner offset
        bytes: Buffer.from(getAddressEncoder().encode(owner)).toString('base64')
      }
    }
  ]

  if (mint) {
    filters.push({
      memcmp: {
        offset: 0, // Mint offset
        bytes: Buffer.from(getAddressEncoder().encode(mint)).toString('base64')
      }
    })
  }

  const typedRpc = createTypedRpcClient(rpc)
  const response = await typedRpc.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    commitment,
    encoding: 'base64',
    filters
  })
  const accounts = response.value

  const results: TokenAccountWithExtensions[] = []
  
  for (const account of accounts) {
    try {
      const parsed = await getTokenAccountWithExtensions(rpc, account.pubkey, commitment)
      if (parsed) {
        results.push(parsed)
      }
    } catch {
      // Skip invalid accounts
    }
  }

  return results
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate required account size for extensions
 */
export function getAccountSizeForExtensions(
  baseSize: number,
  extensions: ExtensionType[]
): number {
  let size = baseSize

  for (const extension of extensions) {
    size += EXTENSION_TYPE_SIZE + EXTENSION_LENGTH_SIZE

    // Add extension-specific sizes
    switch (extension) {
      case ExtensionType.TransferFeeConfig:
        size += 108 // 32 + 32 + 8 + 18 + 18
        break
      case ExtensionType.TransferFeeAmount:
        size += 8
        break
      case ExtensionType.MintCloseAuthority:
      case ExtensionType.PermanentDelegate:
        size += 32
        break
      case ExtensionType.ConfidentialTransferMint:
        size += 65 // 32 + 1 + 32
        break
      case ExtensionType.ConfidentialTransferAccount:
        size += 402 // Large extension with ciphertexts
        break
      case ExtensionType.DefaultAccountState:
      case ExtensionType.MemoTransfer:
      case ExtensionType.CpiGuard:
      case ExtensionType.TransferHookAccount:
        size += 1
        break
      case ExtensionType.ImmutableOwner:
      case ExtensionType.NonTransferable:
      case ExtensionType.NonTransferableAccount:
        size += 0 // No additional data
        break
      case ExtensionType.InterestBearingConfig:
        size += 52 // 32 + 8 + 2 + 8 + 2
        break
      case ExtensionType.TransferHook:
      case ExtensionType.MetadataPointer:
      case ExtensionType.GroupPointer:
      case ExtensionType.GroupMemberPointer:
        size += 64 // 32 + 32
        break
      case ExtensionType.TokenMetadata:
        size += 256 // Variable, using reasonable default
        break
      case ExtensionType.TokenGroup:
      case ExtensionType.TokenGroupMember:
        size += 128 // Variable, using reasonable default
        break
    }
  }

  // Add account type discriminator
  size += 1

  return size
}

/**
 * Check if a token is Token-2022
 */
export async function isToken2022(
  rpc: unknown,
  mint: Address,
  commitment?: Commitment
): Promise<boolean> {
  const typedRpc = createTypedRpcClient(rpc)
  const response = await typedRpc.getAccountInfo(mint, { commitment })
  const accountInfo = response.value
  return accountInfo?.owner === TOKEN_2022_PROGRAM_ID
}

/**
 * Get token program for a mint (Token or Token-2022)
 */
export async function getTokenProgramForMint(
  rpc: unknown,
  mint: Address,
  commitment?: Commitment
): Promise<Address> {
  const typedRpc = createTypedRpcClient(rpc)
  const response = await typedRpc.getAccountInfo(mint, { commitment })
  const accountInfo = response.value
  
  if (!accountInfo) {
    throw new Error('Mint account not found')
  }

  // Check if it's Token-2022
  if (accountInfo.owner === TOKEN_2022_PROGRAM_ID) {
    return TOKEN_2022_PROGRAM_ID
  }

  // Check if it's legacy Token program
  if (accountInfo.owner === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address) {
    return 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address
  }

  throw new Error('Unknown token program')
}