/**
 * Token-2022 SPL Integration
 * 
 * Real integration with SPL Token-2022 program for production use.
 * This module now properly uses the official @solana/spl-token library
 * instead of custom implementations, ensuring compatibility and
 * access to all Token-2022 features.
 */

import type { Address, IInstruction, TransactionSigner } from '@solana/kit'
import { getU8Encoder, getU16Encoder, getU64Encoder, getStructEncoder, getBytesEncoder, fixEncoderSize, address } from '@solana/kit'
import type { Rpc } from '@solana/kit'

// Import from the new official SPL Token integration
import {
  createMintWithExtensions as createMintWithExtensionsOfficial,
  transferWithFee as transferWithFeeOfficial,
  getOrCreateAssociatedTokenAccount as getOrCreateAssociatedTokenAccountOfficial,
  isToken2022 as isToken2022Official,
  getMintExtensions as getMintExtensionsOfficial,
  calculateTransferAmountWithFee as calculateTransferAmountWithFeeOfficial,
  configureConfidentialAccount as configureConfidentialAccountOfficial,
  depositConfidential as depositConfidentialOfficial,
  withdrawConfidential as withdrawConfidentialOfficial,
  transferConfidential as transferConfidentialOfficial,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType
} from './spl-token-integration.js'

// Re-export TOKEN_PROGRAM_ID from the official integration
export { TOKEN_PROGRAM_ID } from './spl-token-integration.js'

// Keep the existing TOKEN_2022_PROGRAM_ADDRESS for backward compatibility
export const TOKEN_2022_PROGRAM_ADDRESS = address(TOKEN_2022_PROGRAM_ID.toString())

// Re-map extension types for backward compatibility
export { ExtensionType as Token2022ExtensionType }

// SPL Token-2022 instruction discriminators
export const SPL_TOKEN_2022_INSTRUCTIONS = {
  // Basic instructions
  InitializeMint: 0,
  InitializeAccount: 1,
  InitializeMultisig: 2,
  Transfer: 3,
  Approve: 4,
  Revoke: 5,
  SetAuthority: 6,
  MintTo: 7,
  Burn: 8,
  CloseAccount: 9,
  FreezeAccount: 10,
  ThawAccount: 11,
  TransferChecked: 12,
  ApproveChecked: 13,
  MintToChecked: 14,
  BurnChecked: 15,
  InitializeAccount2: 16,
  SyncNative: 17,
  InitializeAccount3: 18,
  InitializeMultisig2: 19,
  InitializeMint2: 20,
  GetAccountDataSize: 21,
  InitializeImmutableOwner: 22,
  AmountToUiAmount: 23,
  UiAmountToAmount: 24,
  
  // Extension instructions (starting at 25)
  InitializeMintCloseAuthority: 25,
  TransferFeeExtension: 26,
  ConfidentialTransferExtension: 27,
  DefaultAccountStateExtension: 28,
  Reallocate: 29,
  MemoTransferExtension: 30,
  CreateNativeMint: 31,
  InitializeNonTransferableMint: 32,
  InterestBearingMintExtension: 33,
  CpiGuardExtension: 34,
  InitializePermanentDelegate: 35,
  TransferHookExtension: 36,
  ConfidentialTransferFeeExtension: 37,
  WithdrawExcessLamports: 38,
  MetadataPointerExtension: 39,
  GroupPointerExtension: 40,
  GroupMemberPointerExtension: 41
} as const

// Extension instruction sub-types
export const EXTENSION_INSTRUCTIONS = {
  TransferFee: {
    InitializeTransferFeeConfig: 0,
    TransferCheckedWithFee: 1,
    WithdrawWithheldTokensFromMint: 2,
    WithdrawWithheldTokensFromAccounts: 3,
    HarvestWithheldTokensToMint: 4,
    SetTransferFee: 5
  },
  ConfidentialTransfer: {
    InitializeConfidentialTransferMint: 0,
    UpdateConfidentialTransferMint: 1,
    ConfigureAccount: 2,
    ApproveAccount: 3,
    EmptyAccount: 4,
    Deposit: 5,
    Withdraw: 6,
    Transfer: 7,
    ApplyPendingBalance: 8,
    EnableConfidentialCredits: 9,
    DisableConfidentialCredits: 10,
    EnableNonConfidentialCredits: 11,
    DisableNonConfidentialCredits: 12
  },
  InterestBearing: {
    InitializeInterestBearingMint: 0,
    UpdateRate: 1
  },
  DefaultAccountState: {
    Initialize: 0,
    Update: 1
  }
} as const

// =====================================================
// MINT CREATION WITH EXTENSIONS
// =====================================================

/**
 * Parameters for creating a Token-2022 mint with extensions
 */
export interface CreateMintWithExtensionsParams {
  /** Mint keypair */
  mint: TransactionSigner
  /** Decimal places */
  decimals: number
  /** Mint authority */
  mintAuthority: Address
  /** Freeze authority (optional) */
  freezeAuthority?: Address
  /** Extensions to enable */
  extensions?: {
    transferFeeConfig?: {
      transferFeeBasisPoints: number
      maximumFee: bigint
      transferFeeConfigAuthority: Address
      withdrawWithheldAuthority: Address
    }
    confidentialTransfers?: {
      authority: Address
      autoApproveNewAccounts: boolean
      auditorElgamalPubkey?: Uint8Array
    }
    interestBearing?: {
      rateAuthority: Address
      rate: number // basis points per year
    }
    defaultAccountState?: 'initialized' | 'frozen'
    mintCloseAuthority?: Address
    permanentDelegate?: Address
    transferHook?: {
      authority: Address
      programId: Address
    }
    metadataPointer?: {
      authority: Address
      metadataAddress: Address
    }
  }
  /** Transaction payer */
  payer: TransactionSigner
}

// Export the official implementations
export {
  getOrCreateAssociatedTokenAccountOfficial as getOrCreateAssociatedTokenAccount,
  isToken2022Official as isToken2022,
  getMintExtensionsOfficial as getMintExtensions,
  calculateTransferAmountWithFeeOfficial as calculateTransferAmountWithFee,
  configureConfidentialAccountOfficial as configureConfidentialAccount,
  depositConfidentialOfficial as depositConfidential,
  withdrawConfidentialOfficial as withdrawConfidential,
  transferConfidentialOfficial as transferConfidential
}

/**
 * Create instructions to initialize a Token-2022 mint with extensions
 * Now uses the official @solana/spl-token implementation
 */
export async function createMintWithExtensions(
  rpc: Rpc<unknown>,
  params: CreateMintWithExtensionsParams
): Promise<IInstruction[]> {
  // SPL Token still uses Connection v1, so we delegate to spl-token-integration.ts
  // which handles the compatibility layer
  return createMintWithExtensionsOfficial(rpc as unknown as Connection, params)
}

// =====================================================
// TRANSFER FEE INSTRUCTIONS
// =====================================================

/**
 * Transfer tokens with fee support
 * Delegates to the official SPL Token implementation
 */
export async function transferWithFee(
  rpc: Rpc<unknown>,
  params: {
    source: Address
    destination: Address
    authority: TransactionSigner
    mint: Address
    amount: bigint
    decimals: number
    multiSigners?: TransactionSigner[]
  }
): Promise<IInstruction> {
  return transferWithFeeOfficial(rpc as unknown as Connection, params)
}

// These functions are now delegated to the official implementation
// The custom implementations below are kept for backward compatibility
// but should be considered deprecated

/**
 * Create instruction for transfer with fee
 */
export function createTransferCheckedWithFeeInstruction(params: {
  source: Address
  mint: Address
  destination: Address
  authority: TransactionSigner
  amount: bigint
  decimals: number
  fee: bigint
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['amount', getU64Encoder()],
    ['decimals', getU8Encoder()],
    ['fee', getU64Encoder()]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.TransferFeeExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.TransferFee.TransferCheckedWithFee,
    amount: params.amount,
    decimals: params.decimals,
    fee: params.fee
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.source, role: 2 }, // WritableNonSigner
      { address: params.mint, role: 0 }, // ReadonlyNonSigner
      { address: params.destination, role: 2 }, // WritableNonSigner
      { address: params.authority.address, role: 1 } // ReadonlySigner
    ],
    data: new Uint8Array(data)
  }
}

/**
 * Create instruction to withdraw withheld fees from token accounts
 */
export function createWithdrawWithheldTokensFromAccountsInstruction(params: {
  mint: Address
  destination: Address
  withdrawWithheldAuthority: TransactionSigner
  sources: Address[]
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['numAccounts', getU8Encoder()]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.TransferFeeExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.TransferFee.WithdrawWithheldTokensFromAccounts,
    numAccounts: params.sources.length
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 0 }, // ReadonlyNonSigner
      { address: params.destination, role: 2 }, // WritableNonSigner
      { address: params.withdrawWithheldAuthority.address, role: 1 }, // ReadonlySigner
      ...params.sources.map(source => ({ address: source, role: 2 })) // WritableNonSigner
    ],
    data: new Uint8Array(data)
  }
}

// =====================================================
// CONFIDENTIAL TRANSFER INSTRUCTIONS
// =====================================================

// DEPRECATED: Use official SPL Token functions for confidential transfers
// This function is kept for backward compatibility only

/**
 * Create instruction to configure account for confidential transfers
 */
export function createConfigureAccountInstruction(params: {
  account: Address
  mint: Address
  elgamalPubkey: Uint8Array
  decryptableZeroBalance: Uint8Array
  maximumPendingBalanceCreditCounter: bigint
  authority: TransactionSigner
  multisigSigners: TransactionSigner[]
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['elgamalPubkey', fixEncoderSize(getBytesEncoder(), 32)],
    ['decryptableZeroBalance', fixEncoderSize(getBytesEncoder(), 16)],
    ['maximumPendingBalanceCreditCounter', getU64Encoder()]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.ConfidentialTransferExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.ConfidentialTransfer.ConfigureAccount,
    elgamalPubkey: params.elgamalPubkey,
    decryptableZeroBalance: params.decryptableZeroBalance,
    maximumPendingBalanceCreditCounter: params.maximumPendingBalanceCreditCounter
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.account, role: 2 }, // WritableNonSigner
      { address: params.mint, role: 0 }, // ReadonlyNonSigner
      { address: params.authority.address, role: 1 }, // ReadonlySigner
      ...params.multisigSigners.map(signer => ({ address: signer.address, role: 1 })) // ReadonlySigner
    ],
    data: new Uint8Array(data)
  }
}

/**
 * Create instruction to deposit tokens into confidential balance
 */
export function createDepositInstruction(params: {
  account: Address
  mint: Address
  amount: bigint
  decimals: number
  authority: TransactionSigner
  multisigSigners: TransactionSigner[]
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['amount', getU64Encoder()],
    ['decimals', getU8Encoder()]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.ConfidentialTransferExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.ConfidentialTransfer.Deposit,
    amount: params.amount,
    decimals: params.decimals
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.account, role: 2 }, // WritableNonSigner
      { address: params.mint, role: 0 }, // ReadonlyNonSigner
      { address: params.authority.address, role: 1 }, // ReadonlySigner
      ...params.multisigSigners.map(signer => ({ address: signer.address, role: 1 })) // ReadonlySigner
    ],
    data: new Uint8Array(data)
  }
}

/**
 * Create instruction for confidential transfer
 */
export function createConfidentialTransferInstruction(params: {
  source: Address
  destination: Address
  mint: Address
  newSourceDecryptableAvailableBalance: Uint8Array // AES encrypted
  authority: TransactionSigner
  multisigSigners: TransactionSigner[]
  proofInstructionOffset: number
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['newSourceDecryptableAvailableBalance', fixEncoderSize(getBytesEncoder(), 16)],
    ['proofInstructionOffset', getU16Encoder()]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.ConfidentialTransferExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.ConfidentialTransfer.Transfer,
    newSourceDecryptableAvailableBalance: params.newSourceDecryptableAvailableBalance,
    proofInstructionOffset: params.proofInstructionOffset
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.source, role: 2 }, // WritableNonSigner
      { address: params.destination, role: 2 }, // WritableNonSigner
      { address: params.mint, role: 0 }, // ReadonlyNonSigner
      { address: params.authority.address, role: 1 }, // ReadonlySigner
      ...params.multisigSigners.map(signer => ({ address: signer.address, role: 1 })) // ReadonlySigner
    ],
    data: new Uint8Array(data)
  }
}

// =====================================================
// INTEREST BEARING INSTRUCTIONS
// =====================================================

// DEPRECATED: Use official SPL Token functions for interest bearing mints
// This function is kept for backward compatibility only

/**
 * Create instruction to update interest rate
 */
export function createUpdateRateInstruction(params: {
  mint: Address
  rateAuthority: TransactionSigner
  rate: number // basis points per year
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['rate', getU16Encoder()]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.InterestBearingMintExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.InterestBearing.UpdateRate,
    rate: params.rate
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 2 }, // WritableNonSigner
      { address: params.rateAuthority.address, role: 1 } // ReadonlySigner
    ],
    data: new Uint8Array(data)
  }
}

// =====================================================
// DEFAULT ACCOUNT STATE INSTRUCTIONS
// =====================================================

// DEPRECATED: Use official SPL Token functions
// All the custom instruction builders below are deprecated in favor of
// the official @solana/spl-token library functions

// =====================================================
// OTHER EXTENSION INSTRUCTIONS
// =====================================================

// All custom instruction builders removed in favor of official SPL Token library

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Create a Token-2022 account with proper space allocation for extensions
 */
export function calculateAccountSpace(extensions: {
  immutableOwner?: boolean
  transferFeeAmount?: boolean
  confidentialTransferAccount?: boolean
  memoTransfer?: boolean
  nonTransferable?: boolean
  transferHookAccount?: boolean
  cpiGuard?: boolean
}): number {
  let space = 165 // Base account size
  
  if (extensions.immutableOwner) space += 0 // No extra space, just a flag
  if (extensions.transferFeeAmount) space += 2 + 8 // Extension type + withheld amount
  if (extensions.confidentialTransferAccount) space += 2 + 286 // Extension type + CT account data
  if (extensions.memoTransfer) space += 2 + 1 // Extension type + require flag
  if (extensions.nonTransferable) space += 0 // No extra space, just a flag
  if (extensions.transferHookAccount) space += 2 + 1 // Extension type + transferring flag
  if (extensions.cpiGuard) space += 2 + 1 // Extension type + lock flag
  
  return space
}

/**
 * Check if a mint has a specific extension enabled
 */
export function hasExtension(
  mintData: Uint8Array,
  extensionType: ExtensionType
): boolean {
  if (mintData.length <= 82) return false // No extensions
  
  let offset = 82
  const view = new DataView(mintData.buffer, mintData.byteOffset, mintData.byteLength)
  
  while (offset < mintData.length - 2) {
    try {
      const type = view.getUint16(offset, true)
      if (type === Number(extensionType)) return true
      
      // Skip to next extension
      if (offset + 4 > mintData.length) break
      const length = view.getUint16(offset + 2, true)
      offset += 4 + length
    } catch {
      break
    }
  }
  
  return false
}

/**
 * Parse extension data from mint account
 */
export function parseExtension<T>(
  mintData: Uint8Array,
  extensionType: ExtensionType,
  parser: (data: Uint8Array) => T
): T | null {
  if (mintData.length <= 82) return null
  
  let offset = 82
  const view = new DataView(mintData.buffer, mintData.byteOffset, mintData.byteLength)
  
  while (offset < mintData.length - 4) {
    try {
      const type = view.getUint16(offset, true)
      const length = view.getUint16(offset + 2, true)
      
      if (type === Number(extensionType)) {
        const extData = mintData.slice(offset + 4, offset + 4 + length)
        return parser(extData)
      }
      
      offset += 4 + length
    } catch {
      break
    }
  }
  
  return null
}