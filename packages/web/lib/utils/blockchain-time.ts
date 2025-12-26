// Utilities for working with blockchain timestamps and slot times
import { createSolanaRpc } from '@solana/kit'
import type { Signature } from '@solana/kit'

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'

/**
 * Convert Solana slot number to approximate timestamp
 * Solana produces blocks approximately every 400ms
 */
export function slotToTimestamp(slot: number, genesisTimestamp = 1609459200000): Date {
  // Genesis timestamp for mainnet (Jan 1, 2021)
  // For devnet, we'll use a more recent timestamp
  const SLOT_DURATION_MS = 400 // Approximate slot time
  const estimatedTimestamp = genesisTimestamp + slot * SLOT_DURATION_MS
  return new Date(estimatedTimestamp)
}

/**
 * Convert Unix timestamp (seconds) to Date object
 * Most Solana programs store timestamps as Unix seconds
 */
export function unixToDate(unixTimestamp: number | bigint): Date {
  const timestamp = typeof unixTimestamp === 'bigint' ? Number(unixTimestamp) : unixTimestamp
  return new Date(timestamp * 1000)
}

/**
 * Get current blockchain time from RPC
 * This fetches the current slot and estimates the timestamp
 */
export async function getCurrentBlockchainTime(): Promise<Date> {
  try {
    const rpc = createSolanaRpc(SOLANA_RPC_URL)
    
    // Get the current slot
    const slot = await rpc.getSlot().send()
    
    // Get the block time for current slot
    const blockTime = await rpc.getBlockTime(slot).send()
    
    if (blockTime) {
      return new Date(Number(blockTime) * 1000)
    }
    
    // Fallback: estimate from slot number
    return slotToTimestamp(Number(slot))
  } catch (error) {
    console.warn('Failed to get blockchain time, using system time:', error)
    return new Date()
  }
}

/**
 * Get the creation timestamp for a transaction
 * This looks up the transaction and gets its block time
 */
export async function getTransactionTimestamp(signature: string): Promise<Date | null> {
  try {
    const rpc = createSolanaRpc(SOLANA_RPC_URL)
    
    const tx = await rpc.getTransaction(signature as Signature, {
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
    }).send()
    
    if (tx?.blockTime) {
      return new Date(Number(tx.blockTime) * 1000)
    }
    
    return null
  } catch (error) {
    console.warn(`Failed to get transaction timestamp for ${signature}:`, error)
    return null
  }
}

/**
 * Enhanced timestamp conversion that handles various blockchain timestamp formats
 */
export function parseBlockchainTimestamp(
  timestamp: number | bigint | string | undefined | null,
  fallback?: Date
): Date {
  if (!timestamp) {
    return fallback || new Date()
  }

  let numericTimestamp: number

  if (typeof timestamp === 'string') {
    numericTimestamp = parseInt(timestamp, 10)
  } else if (typeof timestamp === 'bigint') {
    numericTimestamp = Number(timestamp)
  } else {
    numericTimestamp = timestamp
  }

  // Handle both seconds and milliseconds timestamps
  // If the timestamp is less than a reasonable year 2000 timestamp in seconds,
  // assume it's in seconds and convert to milliseconds
  if (numericTimestamp < 946684800000) {
    // Jan 1, 2000 in milliseconds
    numericTimestamp *= 1000
  }

  const date = new Date(numericTimestamp)

  // Validate the date
  if (isNaN(date.getTime())) {
    console.warn('Invalid timestamp:', timestamp)
    return fallback || new Date()
  }

  return date
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - timestamp.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else {
    return timestamp.toLocaleDateString()
  }
}

/**
 * Format blockchain timestamp for display
 */
export function formatBlockchainTimestamp(
  timestamp: number | bigint | string | undefined | null,
  options: {
    includeTime?: boolean
    relative?: boolean
    fallback?: string
  } = {}
): string {
  const date = parseBlockchainTimestamp(timestamp)

  if (options.relative) {
    return getRelativeTime(date)
  }

  if (options.includeTime) {
    return date.toLocaleString()
  }

  return date.toLocaleDateString()
}

/**
 * Calculate duration between two blockchain timestamps
 */
export function calculateDuration(
  startTimestamp: number | bigint | string,
  endTimestamp: number | bigint | string
): {
  seconds: number
  minutes: number
  hours: number
  days: number
  formatted: string
} {
  const start = parseBlockchainTimestamp(startTimestamp)
  const end = parseBlockchainTimestamp(endTimestamp)

  const diffMs = end.getTime() - start.getTime()
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  let formatted: string
  if (days > 0) {
    formatted = `${days} day${days === 1 ? '' : 's'}`
  } else if (hours > 0) {
    formatted = `${hours} hour${hours === 1 ? '' : 's'}`
  } else if (minutes > 0) {
    formatted = `${minutes} minute${minutes === 1 ? '' : 's'}`
  } else {
    formatted = `${seconds} second${seconds === 1 ? '' : 's'}`
  }

  return {
    seconds,
    minutes,
    hours,
    days,
    formatted,
  }
}
