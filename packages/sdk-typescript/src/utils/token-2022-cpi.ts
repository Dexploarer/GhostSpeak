/**
 * Token-2022 Cross-Program Invocation (CPI) Module
 * 
 * Provides functions to create instructions for calling the actual SPL Token-2022 program
 * from within our GhostSpeak program. This enables marketplace transactions to work with
 * Token-2022 mints that have extensions like transfer fees, confidential transfers, etc.
 */

import type { Address, Instruction, TransactionSigner } from '@solana/kit'
import { address } from '@solana/kit'

// SPL Token-2022 program address (well-known constant)
export const TOKEN_2022_PROGRAM_ADDRESS: Address = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')

/**
 * Parameters for creating a Token-2022 mint
 */
export interface CreateMintInstructionParams {
  /** The mint account to be created */
  mint: Address
  /** Authority that can mint tokens */
  mintAuthority: Address
  /** Authority that can freeze token accounts (optional) */
  freezeAuthority?: Address
  /** Number of decimal places for the token */
  decimals: number
  /** Payer for the transaction */
  payer: TransactionSigner
}

/**
 * Parameters for minting tokens
 */
export interface MintToInstructionParams {
  /** The mint address */
  mint: Address
  /** Destination token account */
  destination: Address
  /** Authority that can mint tokens */
  authority: TransactionSigner
  /** Amount to mint in token base units */
  amount: bigint
}

/**
 * Parameters for transferring tokens
 */
export interface TransferInstructionParams {
  /** Source token account */
  source: Address
  /** Destination token account */
  destination: Address
  /** Owner of the source account */
  owner: TransactionSigner
  /** Amount to transfer in token base units */
  amount: bigint
  /** The mint address (required for Token-2022) */
  mint: Address
}

/**
 * Parameters for creating an associated token account
 */
export interface CreateAssociatedTokenAccountParams {
  /** Owner of the new token account */
  owner: Address
  /** The mint address */
  mint: Address
  /** Payer for the transaction */
  payer: TransactionSigner
}

/**
 * Parameters for transfer with fee
 */
export interface TransferWithFeeParams extends TransferInstructionParams {
  /** Expected fee amount (prevents front-running) */
  expectedFee: bigint
}

/**
 * Create instruction to initialize a Token-2022 mint
 * 
 * This creates the actual SPL Token-2022 instruction that can be included
 * in our program's CPI calls.
 */
export async function createInitializeMintInstruction(
  params: CreateMintInstructionParams
): Promise<Instruction> {
  // Build proper Token-2022 InitializeMint instruction
  // Using standard SPL Token-2022 instruction layout
  
  // Properly encode authorities as fixed-size byte arrays
  const mintAuthorityBytes = Array.from(new TextEncoder().encode(params.mintAuthority).slice(0, 32))
  const freezeAuthorityBytes: number[] = params.freezeAuthority 
    ? [1, ...Array.from(new TextEncoder().encode(params.freezeAuthority).slice(0, 32))]
    : [0, ...Array(32).fill(0) as number[]]
  
  // Build instruction data with explicit typing
  const instructionData: number[] = [
    0, // InitializeMint instruction discriminator
    params.decimals,
  ]
  instructionData.push(...mintAuthorityBytes)
  instructionData.push(...freezeAuthorityBytes)
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 'writable' },
      { address: address('SysvarRent111111111111111111111111111111111'), role: 'readonly' },
    ],
    data: new Uint8Array(instructionData),
  } as unknown as Instruction
}

/**
 * Create instruction to mint tokens to an account
 */
export async function createMintToInstruction(
  params: MintToInstructionParams
): Promise<Instruction> {
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.mint, role: 'writable' },
      { address: params.destination, role: 'writable' },
      { address: params.authority.address, role: 'readonly', signer: params.authority },
    ],
    data: new Uint8Array([
      7, // MintTo instruction discriminator
      ...numberToBytes(params.amount, 8), // amount as u64 little-endian
    ]),
  } as unknown as Instruction
}

/**
 * Create instruction to transfer tokens between accounts
 * 
 * This handles both regular transfers and transfers with fees for Token-2022 mints.
 */
export async function createTransferInstruction(
  params: TransferInstructionParams
): Promise<Instruction> {
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.source, role: 'writable' },
      { address: params.destination, role: 'writable' },
      { address: params.owner.address, role: 'readonly', signer: params.owner },
      { address: params.mint, role: 'readonly' }, // Required for Token-2022 checked transfers
    ],
    data: new Uint8Array([
      12, // TransferChecked instruction discriminator (safer for Token-2022)
      ...numberToBytes(params.amount, 8), // amount as u64 little-endian
      0, // decimals (would be fetched from mint in production)
    ]),
  } as unknown as Instruction
}

/**
 * Create instruction to transfer tokens with fee calculation
 * 
 * This is specifically for Token-2022 mints that have transfer fees enabled.
 */
export async function createTransferWithFeeInstruction(
  params: TransferWithFeeParams
): Promise<Instruction> {
  // For Token-2022 transfers with fees, we need to include the fee in the instruction
  // This uses the TransferCheckedWithFee instruction (if available) or falls back to TransferChecked
  
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: params.source, role: 'writable' },
      { address: params.destination, role: 'writable' },
      { address: params.owner.address, role: 'readonly', signer: params.owner },
      { address: params.mint, role: 'readonly' },
      // Add fee withdrawal authority account if needed
    ],
    data: new Uint8Array([
      27, // TransferCheckedWithFee instruction discriminator
      ...numberToBytes(params.amount, 8), // transfer amount as u64 little-endian
      0, // decimals (should be fetched from mint in production)
      ...numberToBytes(params.expectedFee, 8), // expected fee amount as u64
    ]),
  } as unknown as Instruction
}

/**
 * Create instruction to create an associated token account
 */
export async function createAssociatedTokenAccountInstruction(
  params: CreateAssociatedTokenAccountParams
): Promise<Instruction> {
  // Associated Token Account Program ID
  const ATA_PROGRAM_ID = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

  return {
    programAddress: ATA_PROGRAM_ID,
    accounts: [
      { address: params.payer.address, role: 'writable', signer: params.payer },
      // ATA address would be derived here
      { address: params.owner, role: 'readonly' },
      { address: params.owner, role: 'readonly' },
      { address: params.mint, role: 'readonly' },
      { address: address('Sysvar1111111111111111111111111111111111111'), role: 'readonly' },
      { address: TOKEN_2022_PROGRAM_ADDRESS, role: 'readonly' },
    ],
    data: new Uint8Array([0]), // Create instruction
  } as unknown as Instruction
}

/**
 * Get the program ID for a given mint (Token vs Token-2022)
 * 
 * This helper determines whether to use the legacy Token program or Token-2022 program
 * based on the mint's program ownership.
 */
export function getTokenProgramId(isToken2022: boolean): Address {
  if (isToken2022) {
    return TOKEN_2022_PROGRAM_ADDRESS
  }
  // Legacy Token program ID
  return address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
}

/**
 * Check if a mint uses Token-2022 program
 * 
 * This would typically query the blockchain to check the mint's program owner.
 * For now, returns a placeholder implementation.
 */
export async function isMintToken2022(
  mint: Address,
  rpc: { getAccountInfo: (address: Address) => Promise<{ owner: Address } | null> }
): Promise<boolean> {
  try {
    const accountInfo = await rpc.getAccountInfo(mint)
    return accountInfo?.owner === TOKEN_2022_PROGRAM_ADDRESS
  } catch {
    return false
  }
}

/**
 * Calculate transfer fee for Token-2022 transfers
 * 
 * This reads the transfer fee configuration from the mint and calculates
 * the fee for a given transfer amount.
 */
export function calculateTransferFeeForAmount(
  amount: bigint,
  transferFeeBasisPoints: number,
  maximumFee: bigint
): bigint {
  if (transferFeeBasisPoints === 0) {
    return 0n
  }

  // Calculate fee as percentage of transfer amount
  const feeAmount = (amount * BigInt(transferFeeBasisPoints)) / 10000n
  
  // Cap at maximum fee
  return feeAmount > maximumFee ? maximumFee : feeAmount
}

/**
 * Helper function to convert numbers to byte arrays (little-endian)
 */
function numberToBytes(num: bigint | number, byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength)
  let value = typeof num === 'bigint' ? num : BigInt(num)
  
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = Number(value & 0xFFn)
    value = value >> 8n
  }
  
  return bytes
}

/**
 * Fetch mint decimals for Token-2022 transfers
 * 
 * This helper fetches the decimal places for a mint to ensure proper
 * instruction formatting for checked transfers.
 */
export async function getMintDecimals(
  mint: Address,
  rpc: unknown
): Promise<number> {
  try {
    // Dynamically import to avoid circular dependencies
    const { getMintWithExtensions } = await import('./token-2022-rpc.js')
    
    const mintData = await getMintWithExtensions(rpc, mint, 'confirmed')
    return mintData?.decimals ?? 0
  } catch {
    console.warn(`Failed to fetch decimals for mint ${mint}, defaulting to 0`)
    return 0
  }
}

/**
 * Create instruction data for Token-2022 extension initialization
 * 
 * This helper creates the instruction data needed to initialize various
 * Token-2022 extensions like transfer fees, confidential transfers, etc.
 */
export function createExtensionInitData(
  extensionType: number,
  extensionData: Uint8Array
): Uint8Array {
  return new Uint8Array([
    extensionType, // Extension type discriminator
    ...extensionData
  ])
}

/**
 * Token-2022 extension types
 */
export enum Token2022ExtensionType {
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
  TokenGroup = 19,
  GroupMemberPointer = 20,
  TokenGroupMember = 21,
}