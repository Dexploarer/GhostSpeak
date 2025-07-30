/**
 * Shared auction utilities for CLI commands
 */

import { AuctionType } from '@ghostspeak/sdk'

/**
 * Convert AuctionType enum to string representation
 */
export function auctionTypeToString(type: AuctionType): string {
  switch (type) {
    case AuctionType.English:
      return 'english'
    case AuctionType.Dutch:
      return 'dutch'
    case AuctionType.Sealed:
      return 'sealed'
    default:
      return 'unknown'
  }
}

/**
 * Convert string to AuctionType enum
 */
export function stringToAuctionType(str: string): AuctionType {
  switch (str.toLowerCase()) {
    case 'english':
      return AuctionType.English
    case 'dutch':
      return AuctionType.Dutch
    case 'sealed':
      return AuctionType.Sealed
    default:
      return AuctionType.English
  }
}

/**
 * Format auction time remaining
 */
export function formatTimeRemaining(endTime: bigint): string {
  const timeLeft = Number(endTime) - Math.floor(Date.now() / 1000)
  if (timeLeft <= 0) return 'Ended'
  
  const hours = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)
  const seconds = timeLeft % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Format SOL amount from lamports
 */
export function formatSOL(lamports: bigint | number): string {
  return (Number(lamports) / 1_000_000_000).toFixed(3)
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: string | number): bigint {
  return BigInt(Math.floor(Number(sol) * 1_000_000_000))
}