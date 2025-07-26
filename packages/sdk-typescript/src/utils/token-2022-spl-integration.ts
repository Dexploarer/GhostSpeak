/**
 * Token-2022 SPL Integration
 * 
 * Real integration with SPL Token-2022 program for production use.
 * Implements actual CPI calls to the Token-2022 program for:
 * - Mint creation with extensions
 * - Transfer fee operations
 * - Confidential transfers
 * - Interest-bearing tokens
 * - Account state management
 */

import type { Address, IInstruction, TransactionSigner } from '@solana/kit'
import { address, getAddressEncoder, getU8Encoder, getU16Encoder, getU64Encoder, getStructEncoder, getBytesEncoder, fixEncoderSize } from '@solana/kit'
import { 
  TOKEN_2022_PROGRAM_ADDRESS,
  Token2022ExtensionType
} from './token-2022-cpi.js'

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
  freezeAuthority?: Address | null
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

/**
 * Calculate the required space for a mint with extensions
 */
function calculateMintSpace(extensions: CreateMintWithExtensionsParams['extensions']): number {
  let space = 82 // Base mint size
  
  if (!extensions) return space
  
  // Add space for each extension
  if (extensions.transferFeeConfig) {
    space += 2 + 108 // Extension type (2) + TransferFeeConfig size
  }
  if (extensions.confidentialTransfers) {
    space += 2 + 97 // Extension type (2) + ConfidentialTransferMint size
  }
  if (extensions.interestBearing) {
    space += 2 + 40 // Extension type (2) + InterestBearingConfig size
  }
  if (extensions.defaultAccountState) {
    space += 2 + 1 // Extension type (2) + state byte
  }
  if (extensions.mintCloseAuthority) {
    space += 2 + 32 // Extension type (2) + authority pubkey
  }
  if (extensions.permanentDelegate) {
    space += 2 + 32 // Extension type (2) + delegate pubkey
  }
  if (extensions.transferHook) {
    space += 2 + 64 // Extension type (2) + authority + program_id
  }
  if (extensions.metadataPointer) {
    space += 2 + 64 // Extension type (2) + authority + metadata_address
  }
  
  return space
}

/**
 * Create instructions to initialize a Token-2022 mint with extensions
 */
export async function createMintWithExtensions(
  params: CreateMintWithExtensionsParams
): Promise<IInstruction[]> {
  const instructions: IInstruction[] = []
  const space = calculateMintSpace(params.extensions)
  
  // System program: Create account for mint
  const rentExemptLamports = 2039280 + (space - 82) * 6960 // Approximate rent calculation
  instructions.push({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [
      { address: params.payer.address, role: 3 }, // WritableSigner
      { address: params.mint.address, role: 3 }  // WritableSigner
    ],
    data: new Uint8Array([
      0, 0, 0, 0, // CreateAccount instruction
      ...new Uint8Array(new BigUint64Array([BigInt(rentExemptLamports)]).buffer),
      ...new Uint8Array(new BigUint64Array([BigInt(space)]).buffer),
      ...getAddressEncoder().encode(TOKEN_2022_PROGRAM_ADDRESS)
    ])
  })
  
  // Initialize extensions before mint
  if (params.extensions) {
    const ext = params.extensions
    
    // Transfer Fee Config
    if (ext.transferFeeConfig) {
      instructions.push(createInitializeTransferFeeConfigInstruction({
        mint: params.mint.address,
        ...ext.transferFeeConfig
      }))
    }
    
    // Confidential Transfers
    if (ext.confidentialTransfers) {
      instructions.push(createInitializeConfidentialTransferMintInstruction({
        mint: params.mint.address,
        ...ext.confidentialTransfers
      }))
    }
    
    // Interest Bearing
    if (ext.interestBearing) {
      instructions.push(createInitializeInterestBearingMintInstruction({
        mint: params.mint.address,
        ...ext.interestBearing
      }))
    }
    
    // Default Account State
    if (ext.defaultAccountState) {
      instructions.push(createInitializeDefaultAccountStateInstruction({
        mint: params.mint.address,
        state: ext.defaultAccountState
      }))
    }
    
    // Mint Close Authority
    if (ext.mintCloseAuthority) {
      instructions.push(createInitializeMintCloseAuthorityInstruction({
        mint: params.mint.address,
        closeAuthority: ext.mintCloseAuthority
      }))
    }
    
    // Permanent Delegate
    if (ext.permanentDelegate) {
      instructions.push(createInitializePermanentDelegateInstruction({
        mint: params.mint.address,
        delegate: ext.permanentDelegate
      }))
    }
    
    // Transfer Hook
    if (ext.transferHook) {
      instructions.push(createInitializeTransferHookInstruction({
        mint: params.mint.address,
        ...ext.transferHook
      }))
    }
    
    // Metadata Pointer
    if (ext.metadataPointer) {
      instructions.push(createInitializeMetadataPointerInstruction({
        mint: params.mint.address,
        ...ext.metadataPointer
      }))
    }
  }
  
  // Initialize mint (must be last)
  instructions.push({
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint.address, role: 2 }, // WritableNonSigner
      { address: address('SysvarRent111111111111111111111111111111111'), role: 0 } // ReadonlyNonSigner
    ],
    data: new Uint8Array([
      SPL_TOKEN_2022_INSTRUCTIONS.InitializeMint2,
      params.decimals,
      ...getAddressEncoder().encode(params.mintAuthority),
      params.freezeAuthority ? 1 : 0,
      ...(params.freezeAuthority ? getAddressEncoder().encode(params.freezeAuthority) : new Uint8Array(32))
    ])
  })
  
  return instructions
}

// =====================================================
// TRANSFER FEE INSTRUCTIONS
// =====================================================

/**
 * Create instruction to initialize transfer fee config
 */
function createInitializeTransferFeeConfigInstruction(params: {
  mint: Address
  transferFeeBasisPoints: number
  maximumFee: bigint
  transferFeeConfigAuthority: Address
  withdrawWithheldAuthority: Address
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['transferFeeBasisPoints', getU16Encoder()],
    ['maximumFee', getU64Encoder()],
    ['transferFeeConfigAuthority', fixEncoderSize(getBytesEncoder(), 32)],
    ['withdrawWithheldAuthority', fixEncoderSize(getBytesEncoder(), 32)]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.TransferFeeExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.TransferFee.InitializeTransferFeeConfig,
    transferFeeBasisPoints: params.transferFeeBasisPoints,
    maximumFee: params.maximumFee,
    transferFeeConfigAuthority: getAddressEncoder().encode(params.transferFeeConfigAuthority),
    withdrawWithheldAuthority: getAddressEncoder().encode(params.withdrawWithheldAuthority)
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 2 } // WritableNonSigner
    ],
    data: new Uint8Array(data)
  }
}

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

/**
 * Create instruction to initialize confidential transfer mint
 */
function createInitializeConfidentialTransferMintInstruction(params: {
  mint: Address
  authority: Address
  autoApproveNewAccounts: boolean
  auditorElgamalPubkey?: Uint8Array
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['authority', fixEncoderSize(getBytesEncoder(), 32)],
    ['autoApproveNewAccounts', getU8Encoder()],
    ['auditorElgamalPubkey', fixEncoderSize(getBytesEncoder(), 32)]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.ConfidentialTransferExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.ConfidentialTransfer.InitializeConfidentialTransferMint,
    authority: getAddressEncoder().encode(params.authority),
    autoApproveNewAccounts: params.autoApproveNewAccounts ? 1 : 0,
    auditorElgamalPubkey: params.auditorElgamalPubkey ?? new Uint8Array(32)
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 2 } // WritableNonSigner
    ],
    data: new Uint8Array(data)
  }
}

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

/**
 * Create instruction to initialize interest bearing mint
 */
function createInitializeInterestBearingMintInstruction(params: {
  mint: Address
  rateAuthority: Address
  rate: number // basis points per year
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['rateAuthority', fixEncoderSize(getBytesEncoder(), 32)],
    ['rate', getU16Encoder()]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.InterestBearingMintExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.InterestBearing.InitializeInterestBearingMint,
    rateAuthority: getAddressEncoder().encode(params.rateAuthority),
    rate: params.rate
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 2 } // WritableNonSigner
    ],
    data: new Uint8Array(data)
  }
}

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

/**
 * Create instruction to initialize default account state
 */
function createInitializeDefaultAccountStateInstruction(params: {
  mint: Address
  state: 'initialized' | 'frozen'
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionInstruction', getU8Encoder()],
    ['state', getU8Encoder()]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.DefaultAccountStateExtension,
    extensionInstruction: EXTENSION_INSTRUCTIONS.DefaultAccountState.Initialize,
    state: params.state === 'frozen' ? 2 : 1
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 2 } // WritableNonSigner
    ],
    data: new Uint8Array(data)
  }
}

// =====================================================
// OTHER EXTENSION INSTRUCTIONS
// =====================================================

/**
 * Create instruction to initialize mint close authority
 */
function createInitializeMintCloseAuthorityInstruction(params: {
  mint: Address
  closeAuthority: Address
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['closeAuthority', fixEncoderSize(getBytesEncoder(), 32)]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.InitializeMintCloseAuthority,
    closeAuthority: getAddressEncoder().encode(params.closeAuthority)
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 2 } // WritableNonSigner
    ],
    data: new Uint8Array(data)
  }
}

/**
 * Create instruction to initialize permanent delegate
 */
function createInitializePermanentDelegateInstruction(params: {
  mint: Address
  delegate: Address
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['delegate', fixEncoderSize(getBytesEncoder(), 32)]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.InitializePermanentDelegate,
    delegate: getAddressEncoder().encode(params.delegate)
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 2 } // WritableNonSigner
    ],
    data: new Uint8Array(data)
  }
}

/**
 * Create instruction to initialize transfer hook
 */
function createInitializeTransferHookInstruction(params: {
  mint: Address
  authority: Address
  programId: Address
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['authority', fixEncoderSize(getBytesEncoder(), 32)],
    ['programId', fixEncoderSize(getBytesEncoder(), 32)]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.TransferHookExtension,
    authority: getAddressEncoder().encode(params.authority),
    programId: getAddressEncoder().encode(params.programId)
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 2 } // WritableNonSigner
    ],
    data: new Uint8Array(data)
  }
}

/**
 * Create instruction to initialize metadata pointer
 */
function createInitializeMetadataPointerInstruction(params: {
  mint: Address
  authority: Address
  metadataAddress: Address
}): IInstruction {
  const dataEncoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['authority', fixEncoderSize(getBytesEncoder(), 32)],
    ['metadataAddress', fixEncoderSize(getBytesEncoder(), 32)]
  ])
  
  const data = dataEncoder.encode({
    instruction: SPL_TOKEN_2022_INSTRUCTIONS.MetadataPointerExtension,
    authority: getAddressEncoder().encode(params.authority),
    metadataAddress: getAddressEncoder().encode(params.metadataAddress)
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 2 } // WritableNonSigner
    ],
    data: new Uint8Array(data)
  }
}

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
  extensionType: Token2022ExtensionType
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
  extensionType: Token2022ExtensionType,
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