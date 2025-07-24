/**
 * Token Utilities for SPL Token and Token 2022 (Token Extensions)
 * 
 * Provides comprehensive token handling utilities including:
 * - Associated Token Account (ATA) derivation for both SPL Token and Token 2022
 * - Token 2022 specific features (transfer fees, confidential transfers, etc.)
 * - Token program detection and validation
 * - Account creation and management utilities
 * 
 * Based on the latest SPL Token 2022 specification and @solana/kit v2.3.0
 */

import type { Address } from '@solana/addresses'
import { 
  getProgramDerivedAddress,
  getAddressEncoder
} from '@solana/kit'
import { 
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS 
} from '../constants/system-addresses.js'

// =====================================================
// TYPES AND INTERFACES
// =====================================================

/**
 * Token program variants supported by GhostSpeak
 */
export enum TokenProgram {
  /** Original SPL Token Program */
  SPL_TOKEN = 'spl-token',
  /** SPL Token 2022 (Token Extensions) Program */
  TOKEN_2022 = 'token-2022'
}

/**
 * Associated Token Account information
 */
export interface AssociatedTokenAccount {
  /** The derived ATA address */
  address: Address
  /** The wallet/owner address */
  owner: Address
  /** The token mint address */
  mint: Address
  /** The token program used (SPL Token or Token 2022) */
  tokenProgram: Address
  /** Whether this is a Token 2022 ATA */
  isToken2022: boolean
}

/**
 * Token 2022 Extension Types
 * Based on the latest Token Extensions specification
 */
export enum TokenExtension {
  /** Uninitialized account */
  UNINITIALIZED = 0,
  /** Transfer fee extension */
  TRANSFER_FEE_CONFIG = 1,
  /** Transfer fee amount */
  TRANSFER_FEE_AMOUNT = 2,
  /** Mint close authority */
  MINT_CLOSE_AUTHORITY = 3,
  /** Confidential transfer mint */
  CONFIDENTIAL_TRANSFER_MINT = 4,
  /** Confidential transfer account */
  CONFIDENTIAL_TRANSFER_ACCOUNT = 5,
  /** Default account state */
  DEFAULT_ACCOUNT_STATE = 6,
  /** Immutable owner */
  IMMUTABLE_OWNER = 7,
  /** Memo transfer */
  MEMO_TRANSFER = 8,
  /** Non-transferable */
  NON_TRANSFERABLE = 9,
  /** Interest bearing mint */
  INTEREST_BEARING_MINT = 10,
  /** CPI guard */
  CPI_GUARD = 11,
  /** Permanent delegate */
  PERMANENT_DELEGATE = 12,
  /** Non-transferable account */
  NON_TRANSFERABLE_ACCOUNT = 13,
  /** Transfer hook */
  TRANSFER_HOOK = 14,
  /** Transfer hook account */
  TRANSFER_HOOK_ACCOUNT = 15,
  /** Metadata pointer */
  METADATA_POINTER = 16,
  /** Token metadata */
  TOKEN_METADATA = 17,
  /** Group pointer */
  GROUP_POINTER = 18,
  /** Token group */
  TOKEN_GROUP = 19,
  /** Group member pointer */
  GROUP_MEMBER_POINTER = 20,
  /** Token group member */
  TOKEN_GROUP_MEMBER = 21
}

/**
 * Transfer fee configuration for Token 2022
 */
export interface TransferFeeConfig {
  /** Transfer fee basis points (0-10000, where 10000 = 100%) */
  transferFeeBasisPoints: number
  /** Maximum transfer fee in token base units */
  maximumFee: bigint
  /** Authority that can modify transfer fee config */
  transferFeeConfigAuthority: Address | null
  /** Authority that can withdraw collected fees */
  withdrawWithheldAuthority: Address | null
}

/**
 * Confidential transfer configuration for Token 2022
 */
export interface ConfidentialTransferConfig {
  /** Authority that can configure confidential transfers */
  authority: Address | null
  /** Automatically approve new accounts for confidential transfers */
  autoApproveNewAccounts: boolean
  /** Public key for auditing confidential transfers */
  auditorElgamalPubkey: Uint8Array | null
}

/**
 * Interest-bearing token configuration for Token 2022
 */
export interface InterestBearingConfig {
  /** Authority that can update the interest rate */
  rateAuthority: Address | null
  /** Current interest rate (basis points per year) */
  currentRate: number
  /** Timestamp of last rate update */
  lastUpdateTimestamp: bigint
  /** Pre-computed interest rate */
  preUpdateAverageRate: number
}

// =====================================================
// CORE ATA DERIVATION FUNCTIONS
// =====================================================

/**
 * Derive Associated Token Account address for any token program
 * 
 * This is the core ATA derivation function that works with both
 * SPL Token and Token 2022 programs. The derivation follows the
 * standard pattern: ['owner', 'token_program', 'mint']
 * 
 * @param owner - The wallet/owner address
 * @param mint - The token mint address
 * @param tokenProgram - The token program address (SPL Token or Token 2022)
 * @returns Promise<Address> - The derived ATA address
 */
export async function deriveAssociatedTokenAddress(
  owner: Address,
  mint: Address,
  tokenProgram: Address = TOKEN_PROGRAM_ADDRESS
): Promise<Address> {
  const [address] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [
      getAddressEncoder().encode(owner),
      getAddressEncoder().encode(tokenProgram),
      getAddressEncoder().encode(mint)
    ]
  })
  return address
}

/**
 * Derive Associated Token Account for SPL Token (legacy)
 * 
 * @param owner - The wallet/owner address
 * @param mint - The token mint address
 * @returns Promise<Address> - The derived ATA address
 */
export async function deriveSplTokenAssociatedTokenAddress(
  owner: Address,
  mint: Address
): Promise<Address> {
  return deriveAssociatedTokenAddress(owner, mint, TOKEN_PROGRAM_ADDRESS)
}

/**
 * Derive Associated Token Account for Token 2022
 * 
 * @param owner - The wallet/owner address
 * @param mint - The token mint address
 * @returns Promise<Address> - The derived ATA address
 */
export async function deriveToken2022AssociatedTokenAddress(
  owner: Address,
  mint: Address
): Promise<Address> {
  return deriveAssociatedTokenAddress(owner, mint, TOKEN_2022_PROGRAM_ADDRESS)
}

/**
 * Get complete ATA information including program detection
 * 
 * @param owner - The wallet/owner address
 * @param mint - The token mint address
 * @param tokenProgram - Optional: specify token program, auto-detect if not provided
 * @returns Promise<AssociatedTokenAccount> - Complete ATA information
 */
export async function getAssociatedTokenAccount(
  owner: Address,
  mint: Address,
  tokenProgram?: Address
): Promise<AssociatedTokenAccount> {
  // If token program not specified, default to SPL Token
  // In practice, you might want to detect this from the mint account
  const program = tokenProgram ?? TOKEN_PROGRAM_ADDRESS
  const isToken2022 = program === TOKEN_2022_PROGRAM_ADDRESS
  
  const address = await deriveAssociatedTokenAddress(owner, mint, program)
  
  return {
    address,
    owner,
    mint,
    tokenProgram: program,
    isToken2022
  }
}

// =====================================================
// TOKEN PROGRAM DETECTION
// =====================================================

/**
 * Detect which token program owns a given mint
 * Note: This requires RPC calls to fetch mint account data
 * 
 * @param mint - The token mint address
 * @returns Promise<Address> - The token program address
 */
export async function detectTokenProgram(
  mint: Address, 
  rpcEndpoint = 'https://api.devnet.solana.com'
): Promise<Address> {
  try {
    // Import RPC utilities for account fetching
    const { createSolanaRpc } = await import('@solana/kit')
    const rpc = createSolanaRpc(rpcEndpoint)
    
    // Fetch mint account info with safe base64 encoding
    const accountInfo = await rpc.getAccountInfo(mint, {
      encoding: 'base64',
      commitment: 'confirmed'
    }).send()
    
    if (!accountInfo.value) {
      throw new Error(`Mint account ${mint} not found`)
    }
    
    // Check the owner program - this determines which token program owns the mint
    const ownerProgram = accountInfo.value.owner
    
    // Compare against known token program addresses
    if (ownerProgram === TOKEN_PROGRAM_ADDRESS) {
      return TOKEN_PROGRAM_ADDRESS
    } else if (ownerProgram === TOKEN_2022_PROGRAM_ADDRESS) {
      return TOKEN_2022_PROGRAM_ADDRESS  
    } else {
      // Unknown program - default to SPL Token for safety
      console.warn(`Unknown token program owner: ${ownerProgram}, defaulting to SPL Token`)
      return TOKEN_PROGRAM_ADDRESS
    }
  } catch (error) {
    console.error(`Failed to detect token program for mint ${mint}:`, error)
    // Default to SPL Token on error
    return TOKEN_PROGRAM_ADDRESS
  }
}

/**
 * Check if a mint is a Token 2022 mint
 * 
 * @param mint - The token mint address
 * @returns Promise<boolean> - True if Token 2022, false if SPL Token
 */
export async function isToken2022Mint(mint: Address): Promise<boolean> {
  const program = await detectTokenProgram(mint)
  return program === TOKEN_2022_PROGRAM_ADDRESS
}

/**
 * Get the appropriate token program for a given mint
 * 
 * @param mint - The token mint address
 * @returns Promise<TokenProgram> - The token program enum
 */
export async function getTokenProgramType(mint: Address): Promise<TokenProgram> {
  const isToken2022 = await isToken2022Mint(mint)
  return isToken2022 ? TokenProgram.TOKEN_2022 : TokenProgram.SPL_TOKEN
}

// =====================================================
// TOKEN 2022 EXTENSION UTILITIES
// =====================================================

/**
 * Extension type discriminators for Token-2022 TLV parsing
 * Based on the ExtensionType enum from the Token-2022 program
 */
const EXTENSION_TYPE_DISCRIMINATORS = {
  [TokenExtension.TRANSFER_FEE_CONFIG]: 1,
  [TokenExtension.TRANSFER_HOOK]: 2,
  [TokenExtension.CONFIDENTIAL_TRANSFER_MINT]: 3,
  [TokenExtension.METADATA_POINTER]: 18,
  [TokenExtension.MINT_CLOSE_AUTHORITY]: 5,
  [TokenExtension.PERMANENT_DELEGATE]: 4,
  [TokenExtension.INTEREST_BEARING_MINT]: 6,
  [TokenExtension.CPI_GUARD]: 11,
} as const

/**
 * Parse TLV (Type-Length-Value) extension data from Token-2022 account data
 * @param tlvData - The raw TLV data buffer
 * @returns Set of found extension types
 */
function parseTLVExtensions(tlvData: Buffer): Set<TokenExtension> {
  const foundExtensions = new Set<TokenExtension>()
  let offset = 0
  
  while (offset < tlvData.length) {
    // Ensure we have enough bytes for type and length fields
    if (offset + 8 > tlvData.length) break
    
    // Read extension type (4 bytes, little-endian)
    const extensionType = tlvData.readUInt32LE(offset)
    offset += 4
    
    // Read extension length (4 bytes, little-endian)  
    const extensionLength = tlvData.readUInt32LE(offset)
    offset += 4
    
    // Ensure we have enough bytes for the extension data
    if (offset + extensionLength > tlvData.length) break
    
    // Map discriminator to extension type
    for (const [extensionKey, discriminator] of Object.entries(EXTENSION_TYPE_DISCRIMINATORS)) {
      if (discriminator === extensionType) {
        // Convert string key back to enum value  
        const extensionValue = TokenExtension[extensionKey as keyof typeof TokenExtension]
        if (extensionValue !== undefined) {
          foundExtensions.add(extensionValue)
        }
        break
      }
    }
    
    // Skip over the extension data
    offset += extensionLength
  }
  
  return foundExtensions
}

/**
 * Parse transfer fee extension data from Token-2022 mint account
 * @param rawData - The complete mint account data
 * @returns TransferFeeConfig or null if not found
 */
function parseTransferFeeExtension(rawData: Buffer): TransferFeeConfig | null {
  try {
    const MINT_BASE_SIZE = 82
    
    // Check if there's extension data
    if (rawData.length <= MINT_BASE_SIZE) {
      return null
    }
    
    const tlvData = rawData.subarray(MINT_BASE_SIZE)
    let offset = 0
    
    // Search for transfer fee extension in TLV data
    while (offset < tlvData.length) {
      if (offset + 8 > tlvData.length) break
      
      const extensionType = tlvData.readUInt32LE(offset)
      offset += 4
      const extensionLength = tlvData.readUInt32LE(offset) 
      offset += 4
      
      if (offset + extensionLength > tlvData.length) break
      
      // Check if this is the transfer fee extension (type 1)
      if (extensionType === 1) {
        // Parse transfer fee config structure
        // Transfer fee config has specific layout defined by Token-2022 program
        const configData = tlvData.subarray(offset, offset + extensionLength)
        
        if (configData.length >= 40) { // Minimum size for transfer fee config
          return {
            transferFeeBasisPoints: configData.readUInt16LE(0),
            maximumFee: configData.readBigUInt64LE(2),
            transferFeeConfigAuthority: configData.subarray(10, 42).toString('base64') as Address, // 32-byte pubkey
            withdrawWithheldAuthority: configData.subarray(42, 74).toString('base64') as Address // 32-byte pubkey  
          }
        }
      }
      
      offset += extensionLength
    }
    
    return null
  } catch (error) {
    console.error('Error parsing transfer fee extension:', error)
    return null
  }
}

/**
 * Check if a mint has specific Token 2022 extensions
 * Note: This requires RPC calls to fetch and parse mint account data
 * 
 * @param mint - The token mint address
 * @param extensions - Array of extensions to check for
 * @returns Promise<Record<TokenExtension, boolean>> - Extension presence map
 */
export async function checkToken2022Extensions(
  mint: Address,
  extensions: TokenExtension[],
  rpcEndpoint = 'https://api.devnet.solana.com'
): Promise<Record<TokenExtension, boolean>> {
  try {
    // First check if it's even a Token-2022 mint
    const tokenProgram = await detectTokenProgram(mint, rpcEndpoint)
    if (tokenProgram !== TOKEN_2022_PROGRAM_ADDRESS) {
      // SPL Token mints don't have extensions
      const result = {} as Record<TokenExtension, boolean>
      for (const extension of extensions) {
        result[extension] = false
      }
      return result
    }

    // Import RPC utilities for account fetching
    const { createSolanaRpc } = await import('@solana/kit')
    const rpc = createSolanaRpc(rpcEndpoint)
    
    // Fetch mint account info with full data
    const accountInfo = await rpc.getAccountInfo(mint, {
      encoding: 'base64',
      commitment: 'confirmed'
    }).send()
    
    if (!accountInfo.value || !accountInfo.value.data[0]) {
      throw new Error(`Mint account ${mint} not found or has no data`)
    }
    
    // Decode the base64 data to get raw bytes
    const rawData = Buffer.from(accountInfo.value.data[0], 'base64')
    
    // Token-2022 mint base size is 82 bytes (same as SPL Token)
    const MINT_BASE_SIZE = 82
    
    // Check if there's extension data after the base mint account
    if (rawData.length <= MINT_BASE_SIZE) {
      // No extensions present
      const result = {} as Record<TokenExtension, boolean>
      for (const extension of extensions) {
        result[extension] = false
      }
      return result
    }
    
    // Parse TLV data after the base mint account
    const tlvData = rawData.subarray(MINT_BASE_SIZE)
    const foundExtensions = parseTLVExtensions(tlvData)
    
    // Map requested extensions to found extensions
    const result = {} as Record<TokenExtension, boolean>
    for (const extension of extensions) {
      result[extension] = foundExtensions.has(extension)
    }
    
    return result
  } catch (error) {
    console.error(`Failed to check Token-2022 extensions for mint ${mint}:`, error)
    
    // Return all false on error
    const result = {} as Record<TokenExtension, boolean>
    for (const extension of extensions) {
      result[extension] = false
    }
    return result
  }
}

/**
 * Get transfer fee configuration for a Token 2022 mint
 * 
 * @param mint - The Token 2022 mint address
 * @returns Promise<TransferFeeConfig | null> - Transfer fee config or null if not configured
 */
export async function getTransferFeeConfig(
  mint: Address,
  rpcEndpoint = 'https://api.devnet.solana.com'
): Promise<TransferFeeConfig | null> {
  try {
    // Check if the mint has the transfer fee extension
    const extensionResult = await checkToken2022Extensions(
      mint, 
      [TokenExtension.TRANSFER_FEE_CONFIG],
      rpcEndpoint
    )
    
    if (!extensionResult[TokenExtension.TRANSFER_FEE_CONFIG]) {
      return null // No transfer fee extension
    }

    // Import RPC utilities for account fetching
    const { createSolanaRpc } = await import('@solana/kit')
    const rpc = createSolanaRpc(rpcEndpoint)
    
    // Fetch mint account info with full data
    const accountInfo = await rpc.getAccountInfo(mint, {
      encoding: 'base64',
      commitment: 'confirmed'
    }).send()
    
    if (!accountInfo.value || !accountInfo.value.data[0]) {
      throw new Error(`Mint account ${mint} not found or has no data`)
    }
    
    // Decode the base64 data and parse transfer fee extension
    const rawData = Buffer.from(accountInfo.value.data[0], 'base64')
    const transferFeeConfig = parseTransferFeeExtension(rawData)
    
    return transferFeeConfig
  } catch (error) {
    console.error(`Failed to get transfer fee config for mint ${mint}:`, error)
    return null
  }
}

/**
 * Get confidential transfer configuration for a Token 2022 mint
 * 
 * @param mint - The Token 2022 mint address  
 * @returns Promise<ConfidentialTransferConfig | null> - Confidential transfer config or null
 */
export async function getConfidentialTransferConfig(
  mint: Address
): Promise<ConfidentialTransferConfig | null> {
  // TODO: Implement RPC call to fetch mint account data and parse confidential transfer extension
  console.warn('Confidential transfer config fetching not implemented yet')
  
  // Acknowledge parameter to avoid unused variable warning
  void mint
  
  return null
}

/**
 * Get interest-bearing configuration for a Token 2022 mint
 * 
 * @param mint - The Token 2022 mint address
 * @returns Promise<InterestBearingConfig | null> - Interest-bearing config or null
 */
export async function getInterestBearingConfig(
  mint: Address
): Promise<InterestBearingConfig | null> {
  // TODO: Implement RPC call to fetch mint account data and parse interest-bearing extension
  console.warn('Interest-bearing config fetching not implemented yet')
  
  // Acknowledge parameter to avoid unused variable warning
  void mint
  
  return null
}

// =====================================================
// TOKEN ACCOUNT UTILITIES  
// =====================================================

/**
 * Calculate rent-exempt minimum for a token account with extensions
 * 
 * @param extensions - Array of extensions the account will have
 * @returns bigint - Minimum lamports required for rent exemption
 */
export function calculateTokenAccountRent(extensions: TokenExtension[] = []): bigint {
  // Base token account size: 165 bytes
  let accountSize = 165
  
  // Add space for each extension (simplified calculation)
  for (const extension of extensions) {
    switch (extension) {
      case TokenExtension.TRANSFER_FEE_AMOUNT:
        accountSize += 8 + 8  // u64 + u64 for withheld amounts
        break
      case TokenExtension.CONFIDENTIAL_TRANSFER_ACCOUNT:
        accountSize += 286  // Complex confidential transfer data
        break
      case TokenExtension.IMMUTABLE_OWNER:
        accountSize += 0  // No additional space needed
        break
      case TokenExtension.MEMO_TRANSFER:
        accountSize += 1  // u8 flag
        break
      case TokenExtension.NON_TRANSFERABLE_ACCOUNT:
        accountSize += 0  // No additional space needed
        break
      case TokenExtension.CPI_GUARD:
        accountSize += 1  // u8 flag
        break
      case TokenExtension.TRANSFER_HOOK_ACCOUNT:
        accountSize += 1  // u8 flag
        break
      default:
        accountSize += 8  // Default additional space for unknown extensions
    }
  }
  
  // Rough calculation: ~6,960 lamports per 128 bytes (current Solana rates)
  // This is a simplified calculation - actual implementation should use RPC
  const lamportsPerByte = 54n  // Approximate current rate
  return BigInt(accountSize) * lamportsPerByte
}

/**
 * Get all possible ATA addresses for a wallet/mint pair
 * Returns both SPL Token and Token 2022 ATAs
 * 
 * @param owner - The wallet/owner address
 * @param mint - The token mint address  
 * @returns Promise<{ splToken: Address, token2022: Address }> - Both ATA addresses
 */
export async function getAllAssociatedTokenAddresses(
  owner: Address,
  mint: Address
): Promise<{ splToken: Address, token2022: Address }> {
  const [splToken, token2022] = await Promise.all([
    deriveSplTokenAssociatedTokenAddress(owner, mint),
    deriveToken2022AssociatedTokenAddress(owner, mint)
  ])
  
  return { splToken, token2022 }
}

/**
 * Validate if an address could be a valid ATA
 * 
 * @param address - The address to validate
 * @param owner - The expected owner
 * @param mint - The expected mint  
 * @returns Promise<{ isValid: boolean, program?: Address }> - Validation result
 */
export async function validateAssociatedTokenAddress(
  address: Address,
  owner: Address,
  mint: Address
): Promise<{ isValid: boolean, program?: Address }> {
  const addresses = await getAllAssociatedTokenAddresses(owner, mint)
  
  if (address === addresses.splToken) {
    return { isValid: true, program: TOKEN_PROGRAM_ADDRESS }
  }
  
  if (address === addresses.token2022) {
    return { isValid: true, program: TOKEN_2022_PROGRAM_ADDRESS }
  }
  
  return { isValid: false }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Convert TokenProgram enum to program address
 * 
 * @param program - The token program enum
 * @returns Address - The program address
 */
export function getTokenProgramAddress(program: TokenProgram): Address {
  switch (program) {
    case TokenProgram.SPL_TOKEN:
      return TOKEN_PROGRAM_ADDRESS
    case TokenProgram.TOKEN_2022:
      return TOKEN_2022_PROGRAM_ADDRESS
    default:
      throw new Error(`Unknown token program: ${program}`)
  }
}

/**
 * Convert program address to TokenProgram enum
 * 
 * @param address - The program address
 * @returns TokenProgram - The token program enum
 */
export function getTokenProgramFromAddress(address: Address): TokenProgram {
  if (address === TOKEN_PROGRAM_ADDRESS) {
    return TokenProgram.SPL_TOKEN
  }
  if (address === TOKEN_2022_PROGRAM_ADDRESS) {
    return TokenProgram.TOKEN_2022
  }
  throw new Error(`Unknown token program address: ${address}`)
}

/**
 * Format token amount with proper decimals
 * 
 * @param amount - Raw token amount (in base units)
 * @param decimals - Number of decimal places for the token
 * @returns string - Formatted amount
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals)
  const quotient = amount / divisor
  const remainder = amount % divisor
  
  if (remainder === 0n) {
    return quotient.toString()
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0')
  const trimmedRemainder = remainderStr.replace(/0+$/, '')
  
  return `${quotient}.${trimmedRemainder}`
}

/**
 * Parse formatted token amount to raw base units
 * 
 * @param formatted - Formatted token amount string
 * @param decimals - Number of decimal places for the token
 * @returns bigint - Raw token amount
 */
export function parseTokenAmount(formatted: string, decimals: number): bigint {
  const [whole, fraction = ''] = formatted.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  const rawAmount = whole + paddedFraction
  return BigInt(rawAmount)
}