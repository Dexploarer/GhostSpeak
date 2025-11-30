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

import bs58 from 'bs58'

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

  constructor(value: string | Address | Uint8Array | number[] | { address: string } | PublicKey) {
    if (typeof value === 'string') {
      this._address = value
    } else if (typeof value === 'object' && 'address' in value) {
      this._address = (value as any).address
    } else if (value instanceof Uint8Array) {
      this._address = bs58.encode(value)
    } else if (Array.isArray(value)) {
      this._address = bs58.encode(new Uint8Array(value))
    } else if (value instanceof PublicKey) {
      this._address = value.toBase58()
    } else {
      this._address = '' // Fallback
    }
  }

  toString(): string {
    return this._address
  }

  toBase58(): string {
    return this._address
  }

  toBuffer(): Buffer {
    return Buffer.from(bs58.decode(this._address))
  }

  toBytes(): Uint8Array {
    return bs58.decode(this._address)
  }

  equals(pubkey: PublicKey): boolean {
    return this._address === pubkey._address
  }

  toJSON(): string {
    return this._address
  }

  get [Symbol.toStringTag](): string {
    return 'PublicKey'
  }

  // Mock encode for compatibility
  encode(): Buffer {
    return this.toBuffer()
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
      owner: toAddress(TOKEN_2022_PROGRAM_ID as any)
    })
  }
  instructions.push(createAccountInstruction)

  // Initialize extensions before mint
  if (params.extensions?.transferFeeConfig) {
    const config = params.extensions.transferFeeConfig
    instructions.push(convertToIInstruction(
      createInitializeTransferFeeConfigInstruction(
        new PublicKey(params.mint.address) as any,
        new PublicKey(config.transferFeeConfigAuthority ?? params.mintAuthority) as any,
        new PublicKey(config.withdrawWithheldAuthority ?? params.mintAuthority) as any,
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
        new PublicKey(params.mint.address) as any,
        new PublicKey(config.rateAuthority) as any,
        config.rate,
        TOKEN_2022_PROGRAM_ID as any
      )
    ))
  }

  if (params.extensions?.defaultAccountState) {
    instructions.push(convertToIInstruction(
      createInitializeDefaultAccountStateInstruction(
        new PublicKey(params.mint.address) as any,
        params.extensions.defaultAccountState === 'frozen' ? 1 : 0,
        TOKEN_2022_PROGRAM_ID as any
      )
    ))
  }

  if (params.extensions?.mintCloseAuthority) {
    instructions.push(convertToIInstruction(
      createInitializeMintCloseAuthorityInstruction(
        new PublicKey(params.mint.address) as any,
        new PublicKey(params.extensions.mintCloseAuthority) as any,
        TOKEN_2022_PROGRAM_ID as any
      )
    ))
  }

  if (params.extensions?.permanentDelegate) {
    instructions.push(convertToIInstruction(
      createInitializePermanentDelegateInstruction(
        new PublicKey(params.mint.address) as any,
        new PublicKey(params.extensions.permanentDelegate) as any,
        TOKEN_2022_PROGRAM_ID as any
      )
    ))
  }

  // Initialize mint
  instructions.push(convertToIInstruction(
    createInitializeMint2Instruction(
      new PublicKey(params.mint.address) as any,
      params.decimals,
      new PublicKey(params.mintAuthority) as any,
      params.freezeAuthority ? new PublicKey(params.freezeAuthority) as any : null,
      TOKEN_2022_PROGRAM_ID as any
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
    mintPubkey as any,
    undefined,
    TOKEN_2022_PROGRAM_ID as any
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
        new PublicKey(params.source) as any,
        mintPubkey as any,
        new PublicKey(params.destination) as any,
        new PublicKey(params.authority.address) as any,
        BigInt(params.amount),
        params.decimals,
        fee,
        params.multiSigners?.map(s => new PublicKey(s.address) as any) ?? [],
        TOKEN_2022_PROGRAM_ID as any
      )
    )
  } else {
    // No transfer fee, use regular transfer
    return convertToIInstruction(
      createTransferCheckedInstruction(
        new PublicKey(params.source) as any,
        mintPubkey as any,
        new PublicKey(params.destination) as any,
        new PublicKey(params.authority.address) as any,
        BigInt(params.amount),
        params.decimals,
        params.multiSigners?.map(s => new PublicKey(s.address) as any) ?? [],
        TOKEN_2022_PROGRAM_ID as any
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
      mintPubkey as any,
      commitment,
      TOKEN_2022_PROGRAM_ID as any
    )
    // mintInfo exists, use Token 2022
    programId = TOKEN_2022_PROGRAM_ID
  } catch {
    // Try regular token program
    try {
      await getMint(connection, mintPubkey as any, commitment, TOKEN_PROGRAM_ID as any)
    } catch {
      throw new Error('Invalid mint')
    }
  }

  // Get associated token address
  const associatedToken = getAssociatedTokenAddressSync(
    mintPubkey as any,
    ownerPubkey as any,
    allowOwnerOffCurve,
    programId as any
  )

  // Check if account exists
  try {
    await getAccount(
      connection,
      associatedToken as any,
      commitment,
      programId as any
    )
    return { address: address(associatedToken.toBase58()) }
  } catch {
    // Account doesn't exist, create instruction
    const instruction = createAssociatedTokenAccountIdempotentInstruction(
      new PublicKey(payer.address) as any,
      associatedToken as any,
      ownerPubkey as any,
      mintPubkey as any,
      programId as any
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
function convertToIInstruction(instruction: any): IInstruction {
  const accounts: IAccountMeta[] = instruction.keys.map((key: any) => ({
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
function toAddress(pubkey: any): Address {
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
      new PublicKey(mint) as any,
      undefined,
      TOKEN_2022_PROGRAM_ID as any
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
    new PublicKey(mint) as any,
    undefined,
    TOKEN_2022_PROGRAM_ID as any
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
      mintPubkey as any,
      undefined,
      TOKEN_2022_PROGRAM_ID as any
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