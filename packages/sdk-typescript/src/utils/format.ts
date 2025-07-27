/**
 * Format Utilities
 * 
 * Utility functions for formatting and parsing Solana addresses, signatures, and amounts
 */

import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type { Signature } from '@solana/kit'

/**
 * Convert a string or Address to an Address type
 * @param value String representation of a public key or an Address
 * @returns Address type
 */
export function toAddress(value: string | Address): Address {
  if (typeof value === 'string') {
    return address(value)
  }
  return value
}

/**
 * Convert a string or Signature to a Signature type
 * @param value String representation of a signature or a Signature
 * @returns Signature type
 */
export function toSignature(value: string | Signature): Signature {
  if (typeof value === 'string') {
    // Cast string to Signature type
    return value as Signature
  }
  return value
}

/**
 * Format lamports to SOL as a string
 * @param lamports Amount in lamports (1 SOL = 1e9 lamports)
 * @returns String representation of SOL amount
 */
export function formatLamports(lamports: bigint): string {
  const sol = Number(lamports) / 1e9
  // Remove trailing zeros and decimal point if whole number
  return sol.toString()
}

/**
 * Parse SOL amount string to lamports
 * @param amount SOL amount as string (e.g., "1.5" for 1.5 SOL)
 * @returns Amount in lamports as bigint
 */
export function parseAmount(amount: string): bigint {
  // Handle edge cases
  if (amount === '0' || amount === '') {
    return 0n
  }
  
  // Parse the decimal number and convert to lamports
  const sol = parseFloat(amount)
  if (isNaN(sol)) {
    throw new Error(`Invalid amount: ${amount}`)
  }
  
  // Convert to lamports (1 SOL = 1e9 lamports)
  // Use Math.round to handle floating point precision issues
  const lamports = Math.round(sol * 1e9)
  
  return BigInt(lamports)
}