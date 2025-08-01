import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Address } from '@solana/addresses'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Validates and converts a string to a Solana Address
 * @param address - The address string to validate
 * @returns The validated Address or throws an error
 */
export function validateAddress(address: string): Address {
  // Basic Solana address validation (base58, 32-44 characters)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

  if (!address || typeof address !== 'string') {
    throw new Error('Address must be a non-empty string')
  }

  if (!base58Regex.test(address)) {
    throw new Error('Invalid Solana address format')
  }

  return address as Address
}

/**
 * Safely converts a string to Address with error handling
 * @param address - The address string to convert
 * @returns The Address or null if invalid
 */
export function safeParseAddress(address: string): Address | null {
  try {
    return validateAddress(address)
  } catch {
    return null
  }
}

/**
 * Validates image URL for security
 * @param url - The image URL to validate
 * @returns boolean indicating if URL is safe
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    // Only allow https URLs and common image hosting domains
    return (
      parsedUrl.protocol === 'https:' &&
      (parsedUrl.hostname.includes('imgur.com') ||
        parsedUrl.hostname.includes('cloudinary.com') ||
        parsedUrl.hostname.includes('ipfs.io') ||
        parsedUrl.hostname.includes('arweave.net') ||
        parsedUrl.hostname.includes('gateway.pinata.cloud'))
    )
  } catch {
    return false
  }
}

/**
 * Serializes BigInt values for JSON transmission
 * @param key - The object key
 * @param value - The value to serialize
 * @returns Serialized value
 */
export function bigintReplacer(key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return {
      __type: 'bigint',
      value: value.toString(),
    }
  }
  return value
}

/**
 * Deserializes BigInt values from JSON
 * @param key - The object key
 * @param value - The value to deserialize
 * @returns Deserialized value
 */
export function bigintReviver(key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    '__type' in value &&
    value.__type === 'bigint' &&
    'value' in value
  ) {
    return BigInt(String(value.value))
  }
  return value
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toString()
}

export function formatSol(lamports: bigint | number): string {
  const sol = Number(lamports) / 1e9
  return `${sol.toFixed(4)} SOL`
}
