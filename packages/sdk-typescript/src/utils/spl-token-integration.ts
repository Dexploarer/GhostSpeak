/**
 * Official SPL Token-2022 Integration
 * 
 * This module provides integration with the official @solana/spl-token library
 * for Token-2022 functionality. It replaces custom implementations with
 * battle-tested, official SDK functions.
 */

import {
  // Core functions
  createInitializeMint2Instruction,
  createTransferCheckedInstruction,
  createTransferCheckedWithFeeInstruction,
  
  // Extension functions
  createInitializeTransferFeeConfigInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializeDefaultAccountStateInstruction,
  createInitializeMintCloseAuthorityInstruction,
  createInitializePermanentDelegateInstruction,
  
  // Constants and types
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  
  // Extension types
  ExtensionType,
  
  // Helper functions
  getMintLen,
  getExtensionTypes,
  getTransferFeeConfig,
  
  // Account utilities
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  
  // Layout types for decoding
  
} from '@solana/spl-token'

import {
  getBase58Encoder,
  getBase58Decoder
} from '@solana/kit'

import type { 
  Address, 
  IInstruction, 
  TransactionSigner,
  IAccountMeta,
  Commitment
} from '@solana/kit'
import { address } from '@solana/kit'
import { 
  getU8Encoder,
  getU32Encoder,
  getU64Encoder, 
  getStructEncoder, 
  getBytesEncoder,
  fixEncoderSize,
  getAddressEncoder
} from '@solana/kit'
// Note: @solana/spl-token still uses some v1 types internally
// This is a compatibility layer until SPL Token fully migrates to v2

// Import types for SPL Token compatibility
// These are only used internally for SPL Token calls

// Create a PublicKey compatibility class for SPL Token
class PublicKey {
  private _address: string

  constructor(value: string | Address | Uint8Array | number[]) {
    if (typeof value === 'string') {
      this._address = value
    } else if (typeof value === 'object' && 'address' in value) {
      this._address = (value as any).address
    } else if (value instanceof Uint8Array) {
      // Convert Uint8Array to base58
      this._address = getBase58Encoder().encode(value) as string
    } else if (Array.isArray(value)) {
      // Convert number array to base58
      this._address = getBase58Encoder().encode(new Uint8Array(value)) as string
    } else {
      throw new Error('Invalid public key input')
    }
  }

  toString(): string {
    return this._address
  }

  toBase58(): string {
    return this._address
  }

  toBuffer(): Buffer {
    return Buffer.from(getBase58Decoder().decode(this._address))
  }

  toBytes(): Uint8Array {
    return getBase58Decoder().decode(this._address) as Uint8Array
  }

  equals(pubkey: PublicKey): boolean {
    return this._address === pubkey._address
  }
}

// Create a mock Connection type for SPL Token compatibility
type Connection = any

// Re-export everything for convenience
export * from '@solana/spl-token'

// =====================================================
// CONSTANTS
// =====================================================

export const TOKEN_2022_PROGRAM_ADDRESS = address(TOKEN_2022_PROGRAM_ID.toString())

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
// HELPER TYPES AND INTERFACES
// =====================================================

export interface CreateMintWithExtensionsParams {
  /** The mint to be created */
  mint: TransactionSigner
  /** Number of decimals */
  decimals: number
  /** Mint authority */
  mintAuthority: Address
  /** Freeze authority (optional) */
  freezeAuthority?: Address
  /** Payer for the transaction */
  payer: TransactionSigner
  /** Extensions to enable */
  extensions?: {
    /** Transfer fee configuration */
    transferFeeConfig?: {
      transferFeeBasisPoints: number
      maximumFee: bigint
      transferFeeConfigAuthority?: Address
      withdrawWithheldAuthority?: Address
    }
    /** Confidential transfer configuration */
    confidentialTransfers?: {
      authority?: Address
      autoApproveNewAccounts?: boolean
      auditorElgamalPubkey?: Uint8Array
    }
    /** Interest bearing configuration */
    interestBearing?: {
      rateAuthority: Address
      rate: number
    }
    /** Default account state */
    defaultAccountState?: 'initialized' | 'frozen'
    /** Mint close authority */
    mintCloseAuthority?: Address
    /** Permanent delegate */
    permanentDelegate?: Address
    /** Transfer hook */
    transferHook?: {
      authority: Address
      programId: Address
    }
    /** Metadata pointer */
    metadataPointer?: {
      authority?: Address
      metadataAddress?: Address
    }
  }
}

export interface TransferWithFeeParams {
  /** Source token account */
  source: Address
  /** Destination token account */
  destination: Address
  /** Authority for the source account */
  authority: TransactionSigner
  /** Mint address */
  mint: Address
  /** Amount to transfer (before fees) */
  amount: bigint
  /** Number of decimals */
  decimals: number
  /** Additional signers */
  multiSigners?: TransactionSigner[]
}

// =====================================================
// HIGH-LEVEL FUNCTIONS
// =====================================================

/**
 * Create a Token-2022 mint with extensions using the official SPL Token library
 */
export async function createMintWithExtensions(
  connection: Connection,
  params: CreateMintWithExtensionsParams
): Promise<IInstruction[]> {
  const instructions: IInstruction[] = []
  
  // Calculate required extensions
  const extensions: ExtensionType[] = []
  if (params.extensions?.transferFeeConfig) {
    extensions.push(ExtensionType.TransferFeeConfig)
  }
  if (params.extensions?.confidentialTransfers) {
    extensions.push(ExtensionType.ConfidentialTransferMint)
  }
  if (params.extensions?.interestBearing) {
    extensions.push(ExtensionType.InterestBearingConfig)
  }
  if (params.extensions?.defaultAccountState) {
    extensions.push(ExtensionType.DefaultAccountState)
  }
  if (params.extensions?.mintCloseAuthority) {
    extensions.push(ExtensionType.MintCloseAuthority)
  }
  if (params.extensions?.permanentDelegate) {
    extensions.push(ExtensionType.PermanentDelegate)
  }
  if (params.extensions?.transferHook) {
    extensions.push(ExtensionType.TransferHook)
  }
  if (params.extensions?.metadataPointer) {
    extensions.push(ExtensionType.MetadataPointer)
  }
  
  // Calculate space needed
  const mintLen = getMintLen(extensions)
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen)
  
  // Create account instruction
  const createAccountInstruction: IInstruction = {
    programAddress: address('11111111111111111111111111111111'), // System program
    accounts: [
      { address: params.payer.address, role: 3 }, // WritableSigner
      { address: params.mint.address, role: 3 }, // WritableSigner
    ],
    data: getStructEncoder([
      ['instruction', getU32Encoder()],
      ['lamports', getU64Encoder()],
      ['space', getU64Encoder()],
      ['owner', fixEncoderSize(getAddressEncoder(), 32)]
    ]).encode({
      instruction: 0, // CreateAccount
      lamports: BigInt(lamports),
      space: BigInt(mintLen),
      owner: toAddress(TOKEN_2022_PROGRAM_ID)
    })
  }
  instructions.push(createAccountInstruction)
  
  // Initialize extensions before mint
  if (params.extensions?.transferFeeConfig) {
    const config = params.extensions.transferFeeConfig
    instructions.push(convertToIInstruction(
      createInitializeTransferFeeConfigInstruction(
        new PublicKey(params.mint.address),
        new PublicKey(config.transferFeeConfigAuthority ?? params.mintAuthority),
        new PublicKey(config.withdrawWithheldAuthority ?? params.mintAuthority),
        config.transferFeeBasisPoints,
        BigInt(config.maximumFee),
        TOKEN_2022_PROGRAM_ID
      )
    ))
  }
  
  // Note: Confidential transfer initialization is not directly exposed in @solana/spl-token
  // It requires using raw instructions
  if (params.extensions?.confidentialTransfers) {
    console.warn('Confidential transfer initialization requires manual instruction building')
  }
  
  if (params.extensions?.interestBearing) {
    const config = params.extensions.interestBearing
    instructions.push(convertToIInstruction(
      createInitializeInterestBearingMintInstruction(
        new PublicKey(params.mint.address),
        new PublicKey(config.rateAuthority),
        config.rate,
        TOKEN_2022_PROGRAM_ID
      )
    ))
  }
  
  if (params.extensions?.defaultAccountState) {
    instructions.push(convertToIInstruction(
      createInitializeDefaultAccountStateInstruction(
        new PublicKey(params.mint.address),
        params.extensions.defaultAccountState === 'frozen' ? 1 : 0,
        TOKEN_2022_PROGRAM_ID
      )
    ))
  }
  
  if (params.extensions?.mintCloseAuthority) {
    instructions.push(convertToIInstruction(
      createInitializeMintCloseAuthorityInstruction(
        new PublicKey(params.mint.address),
        new PublicKey(params.extensions.mintCloseAuthority),
        TOKEN_2022_PROGRAM_ID
      )
    ))
  }
  
  if (params.extensions?.permanentDelegate) {
    instructions.push(convertToIInstruction(
      createInitializePermanentDelegateInstruction(
        new PublicKey(params.mint.address),
        new PublicKey(params.extensions.permanentDelegate),
        TOKEN_2022_PROGRAM_ID
      )
    ))
  }
  
  // Initialize mint
  instructions.push(convertToIInstruction(
    createInitializeMint2Instruction(
      new PublicKey(params.mint.address),
      params.decimals,
      new PublicKey(params.mintAuthority),
      params.freezeAuthority ? new PublicKey(params.freezeAuthority) : null,
      TOKEN_2022_PROGRAM_ID
    )
  ))
  
  return instructions
}

/**
 * Transfer tokens with proper fee calculation for Token-2022
 */
export async function transferWithFee(
  connection: Connection,
  params: TransferWithFeeParams
): Promise<IInstruction> {
  // Get mint info to check for transfer fees
  const mintPubkey = new PublicKey(params.mint)
  const mintInfo = await getMint(
    connection,
    mintPubkey,
    undefined,
    TOKEN_2022_PROGRAM_ID
  )
  
  // Check if mint has transfer fee extension
  const transferFeeConfig = getTransferFeeConfig(mintInfo)
  
  if (transferFeeConfig) {
    // Calculate fee amount
    // Calculate fee amount based on transfer fee config
    const fee = calculateTransferFee(
      BigInt(params.amount),
      transferFeeConfig.newerTransferFee.transferFeeBasisPoints,
      BigInt(transferFeeConfig.newerTransferFee.maximumFee.toString())
    )
    
    // Use transfer with fee instruction
    return convertToIInstruction(
      createTransferCheckedWithFeeInstruction(
        new PublicKey(params.source),
        mintPubkey,
        new PublicKey(params.destination),
        new PublicKey(params.authority.address),
        BigInt(params.amount),
        params.decimals,
        fee,
        params.multiSigners?.map(s => new PublicKey(s.address)) ?? [],
        TOKEN_2022_PROGRAM_ID
      )
    )
  } else {
    // No transfer fee, use regular transfer
    return convertToIInstruction(
      createTransferCheckedInstruction(
        new PublicKey(params.source),
        mintPubkey,
        new PublicKey(params.destination),
        new PublicKey(params.authority.address),
        BigInt(params.amount),
        params.decimals,
        params.multiSigners?.map(s => new PublicKey(s.address)) ?? [],
        TOKEN_2022_PROGRAM_ID
      )
    )
  }
}

/**
 * Get or create associated token account with Token-2022 support
 */
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: TransactionSigner,
  mint: Address,
  owner: Address,
  allowOwnerOffCurve = false,
  commitment?: Commitment
): Promise<{ address: Address; instruction?: IInstruction }> {
  const mintPubkey = new PublicKey(mint)
  const ownerPubkey = new PublicKey(owner)
  
  // Determine if this is a Token-2022 mint
  let programId = TOKEN_PROGRAM_ID
  try {
    await getMint(
      connection,
      mintPubkey,
      commitment,
      TOKEN_2022_PROGRAM_ID
    )
    // mintInfo exists, use Token 2022
    programId = TOKEN_2022_PROGRAM_ID
  } catch {
    // Try regular token program
    try {
      await getMint(connection, mintPubkey, commitment, TOKEN_PROGRAM_ID)
    } catch {
      throw new Error('Invalid mint')
    }
  }
  
  // Get associated token address
  const associatedToken = getAssociatedTokenAddressSync(
    mintPubkey,
    ownerPubkey,
    allowOwnerOffCurve,
    programId
  )
  
  // Check if account exists
  try {
    await getAccount(
      connection,
      associatedToken,
      commitment,
      programId
    )
    return { address: address(associatedToken.toBase58()) }
  } catch {
    // Account doesn't exist, create instruction
    const instruction = createAssociatedTokenAccountIdempotentInstruction(
      new PublicKey(payer.address),
      associatedToken,
      ownerPubkey,
      mintPubkey,
      programId
    )
    
    return {
      address: address(associatedToken.toBase58()),
      instruction: convertToIInstruction(instruction)
    }
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Convert web3.js instruction to IInstruction format
 */
function convertToIInstruction(instruction: {
  programId: PublicKey
  keys: {
    pubkey: PublicKey
    isSigner: boolean
    isWritable: boolean
  }[]
  data: Uint8Array
}): IInstruction {
  const accounts: IAccountMeta[] = instruction.keys.map((key) => ({
    address: address(key.pubkey.toBase58()),
    role: (key.isSigner ? 1 : 0) + (key.isWritable ? 2 : 0)
  }))
  
  return {
    programAddress: address(instruction.programId.toBase58()),
    accounts,
    data: instruction.data
  }
}

/**
 * Convert PublicKey to Address type
 */
function toAddress(pubkey: PublicKey): Address {
  return address(pubkey.toBase58())
}

/**
 * Check if a mint is Token-2022
 */
export async function isToken2022(
  connection: Connection,
  mint: Address
): Promise<boolean> {
  try {
    await getMint(
      connection,
      new PublicKey(mint),
      undefined,
      TOKEN_2022_PROGRAM_ID
    )
    return true
  } catch {
    return false
  }
}

/**
 * Get mint extensions
 */
export async function getMintExtensions(
  connection: Connection,
  mint: Address
): Promise<ExtensionType[]> {
  const mintInfo = await getMint(
    connection,
    new PublicKey(mint),
    undefined,
    TOKEN_2022_PROGRAM_ID
  )
  
  return getExtensionTypes(mintInfo.tlvData)
}

/**
 * Calculate transfer amount including fees
 */
export async function calculateTransferAmountWithFee(
  connection: Connection,
  mint: Address,
  amount: bigint,
  includesFee = false
): Promise<{ amount: bigint; fee: bigint }> {
  const mintPubkey = new PublicKey(mint)
  
  try {
    const mintInfo = await getMint(
      connection,
      mintPubkey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    )
    
    const transferFeeConfig = getTransferFeeConfig(mintInfo)
    if (transferFeeConfig) {
      const fee = calculateTransferFee(
        amount,
        transferFeeConfig.newerTransferFee.transferFeeBasisPoints,
        BigInt(transferFeeConfig.newerTransferFee.maximumFee.toString())
      )
      return {
        amount: includesFee ? amount - fee : amount,
        fee
      }
    }
  } catch {
    // No transfer fee
  }
  
  return { amount, fee: 0n }
}

// =====================================================
// CONFIDENTIAL TRANSFER HELPERS
// =====================================================

// =====================================================
// CONFIDENTIAL TRANSFER HELPERS
// =====================================================

/**
 * Note: Confidential transfer instructions are not directly exported by @solana/spl-token
 * These functions provide placeholders for the functionality.
 * In production, you would need to use raw instruction building or a specialized library.
 */

/**
 * Configure account for confidential transfers
 */
export async function configureConfidentialAccount(
  account: Address,
  mint: Address,
  elgamalPubkey: Uint8Array,
  decryptableZeroBalance: Uint8Array,
  maximumPendingBalanceCredits: bigint,
  proofInstructionOffset: number,
  authority: TransactionSigner
): Promise<IInstruction> {
  // Create the SPL Token instruction directly
  const instructionType = 30 // ConfigureAccountWithFee instruction for Token-2022
  const extensionType = 4 // ConfidentialTransfer extension
  
  // Instruction data layout:
  // - instruction type: u8
  // - extension type: u8  
  // - elgamal pubkey: [u8; 32]
  // - decryptable zero balance: [u8; 64]
  // - maximum pending balance credit counter: u64
  // - proof instruction offset: i8
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['extensionType', getU8Encoder()],
    ['elgamalPubkey', fixEncoderSize(getBytesEncoder(), 32)],
    ['decryptableZeroBalance', fixEncoderSize(getBytesEncoder(), 64)],
    ['maximumPendingBalanceCredits', getU64Encoder()],
    ['proofInstructionOffset', getU8Encoder()]
  ])
  
  const data = encoder.encode({
    instruction: instructionType,
    extensionType,
    elgamalPubkey,
    decryptableZeroBalance,
    maximumPendingBalanceCredits,
    proofInstructionOffset
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: account, role: 2 }, // Writable
      { address: mint, role: 0 }, // Readonly
      { address: authority.address, role: 3 } // WritableSigner
    ],
    data
  }
}

/**
 * Deposit to confidential balance
 */
export async function depositConfidential(
  account: Address,
  mint: Address,
  amount: bigint,
  decimals: number,
  proofInstructionOffset: number,
  authority: TransactionSigner
): Promise<IInstruction> {
  // SPL Token-2022 deposit instruction
  const instructionType = 31 // Deposit instruction for confidential transfers
  
  // Instruction data layout:
  // - instruction type: u8
  // - amount: u64
  // - decimals: u8
  // - proof instruction offset: i8
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['amount', getU64Encoder()],
    ['decimals', getU8Encoder()],
    ['proofInstructionOffset', getU8Encoder()]
  ])
  
  const data = encoder.encode({
    instruction: instructionType,
    amount,
    decimals,
    proofInstructionOffset
  })
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: account, role: 2 }, // Writable source account
      { address: mint, role: 0 }, // Readonly mint
      { address: authority.address, role: 3 } // WritableSigner
    ],
    data
  }
}

/**
 * Withdraw from confidential balance
 */
export async function withdrawConfidential(
  account: Address,
  mint: Address,
  amount: bigint,
  decimals: number,
  newDecryptableAvailableBalance: Uint8Array,
  proofInstructionOffset: number,
  authority: TransactionSigner
): Promise<IInstruction> {
  // SPL Token-2022 withdraw instruction
  const instructionType = 32 // Withdraw instruction for confidential transfers
  
  // Instruction data layout:
  // - instruction type: u8
  // - amount: u64
  // - decimals: u8
  // - new decryptable available balance: [u8; 64]
  // - proof instruction offset: i8
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['amount', getU64Encoder()],
    ['decimals', getU8Encoder()],
    ['newDecryptableAvailableBalance', fixEncoderSize(getBytesEncoder(), 64)],
    ['proofInstructionOffset', getU8Encoder()]
  ])

  const data = encoder.encode({
    instruction: instructionType,
    amount,
    decimals,
    newDecryptableAvailableBalance,
    proofInstructionOffset
  })

  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: account, role: 2 }, // Writable
      { address: mint, role: 0 }, // Readonly
      { address: authority.address, role: 3 } // WritableSigner
    ],
    data
  }
}

/**
 * Transfer confidential tokens
 */
export async function transferConfidential(
  source: Address,
  destination: Address,
  mint: Address,
  newSourceDecryptableAvailableBalance: Uint8Array,
  proofInstructionOffset: number,
  authority: TransactionSigner
): Promise<IInstruction> {
  // SPL Token-2022 confidential transfer instruction
  const instructionType = 33 // Transfer instruction for confidential transfers
  
  // Instruction data layout:
  // - instruction type: u8
  // - new source decryptable balance: [u8; 64]
  // - proof instruction offset: i8
  const encoder = getStructEncoder([
    ['instruction', getU8Encoder()],
    ['newSourceDecryptableBalance', fixEncoderSize(getBytesEncoder(), 64)],
    ['proofInstructionOffset', getU8Encoder()]
  ])

  const data = encoder.encode({
    instruction: instructionType,
    newSourceDecryptableBalance: newSourceDecryptableAvailableBalance,
    proofInstructionOffset
  })

  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: source, role: 2 }, // Writable source
      { address: destination, role: 2 }, // Writable destination
      { address: mint, role: 0 }, // Readonly
      { address: authority.address, role: 3 } // WritableSigner
    ],
    data
  }
}

// Export for backward compatibility
/**
 * Helper function to calculate transfer fee
 */
function calculateTransferFee(
  amount: bigint,
  feeBasisPoints: number,
  maximumFee: bigint
): bigint {
  const fee = (amount * BigInt(feeBasisPoints)) / 10000n
  return fee > maximumFee ? maximumFee : fee
}

export {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType
}