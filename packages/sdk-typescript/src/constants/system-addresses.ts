/**
 * System Program Addresses for Solana
 * 
 * These are the standard system program addresses used across Solana.
 * Using constants instead of hardcoded values improves maintainability
 * and ensures consistency across the SDK.
 */

import { address, type Address } from '@solana/addresses'

/**
 * System Program
 * The core system program that handles account creation, transfers, and other system operations
 */
export const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111')

/**
 * System Program Address with extra digit (used in some instructions)
 * Some generated code uses this variant
 */
export const SYSTEM_PROGRAM_ADDRESS_32 = address('11111111111111111111111111111112')

/**
 * Clock Sysvar
 * Provides cluster time information
 */
export const SYSVAR_CLOCK_ADDRESS = address('SysvarC1ock11111111111111111111111111111111')

/**
 * Rent Sysvar
 * Provides rent information for accounts
 */
export const SYSVAR_RENT_ADDRESS = address('SysvarRent111111111111111111111111111111111')

/**
 * Recent Blockhashes Sysvar
 * Provides recent blockhash information
 */
export const SYSVAR_RECENT_BLOCKHASHES_ADDRESS = address('SysvarRecentB1ockHashes11111111111111111111')

/**
 * Stake History Sysvar
 * Provides stake history information
 */
export const SYSVAR_STAKE_HISTORY_ADDRESS = address('SysvarStakeHistory1111111111111111111111111')

/**
 * Instructions Sysvar
 * Provides instruction introspection
 */
export const SYSVAR_INSTRUCTIONS_ADDRESS = address('Sysvar1nstructions1111111111111111111111111')

/**
 * SPL Token Program
 * The standard SPL Token program
 */
export const TOKEN_PROGRAM_ADDRESS = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

/**
 * SPL Token 2022 Program (Token Extensions)
 * The new token program with extended functionality
 */
export const TOKEN_2022_PROGRAM_ADDRESS = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')

/**
 * Associated Token Account Program
 * Manages associated token accounts
 */
export const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

/**
 * Metaplex Token Metadata Program
 * Manages NFT and token metadata
 */
export const TOKEN_METADATA_PROGRAM_ADDRESS = address('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Helper function to get system program address based on instruction requirements
 */
export function getSystemProgramAddress(use32Variant = false): Address {
  return use32Variant ? SYSTEM_PROGRAM_ADDRESS_32 : SYSTEM_PROGRAM_ADDRESS
}

/**
 * Export all addresses as a single object for convenience
 */
export const SYSTEM_ADDRESSES = {
  systemProgram: SYSTEM_PROGRAM_ADDRESS,
  systemProgram32: SYSTEM_PROGRAM_ADDRESS_32,
  clock: SYSVAR_CLOCK_ADDRESS,
  rent: SYSVAR_RENT_ADDRESS,
  recentBlockhashes: SYSVAR_RECENT_BLOCKHASHES_ADDRESS,
  stakeHistory: SYSVAR_STAKE_HISTORY_ADDRESS,
  instructions: SYSVAR_INSTRUCTIONS_ADDRESS,
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
  token2022Program: TOKEN_2022_PROGRAM_ADDRESS,
  associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ADDRESS,
} as const