/**
 * Type guards and validation functions for SDK responses
 * This ensures type safety for all SDK operations
 */

import { type Address } from '@solana/addresses'

// Core type interfaces based on expected SDK responses
export interface ValidatedAuctionData {
  auction: Address
  auctionType: string
  currentPrice: bigint
  startingPrice: bigint
  reservePrice?: bigint
  auctionEndTime: bigint
  totalBids: number
  minimumBidIncrement: bigint
  currentWinner?: Address
  creator: Address
  status?: string
  timeRemaining?: number
}

export interface ValidatedAgent {
  address: Address
  data: {
    name: string
    description?: string
    capabilities?: string[]
  }
  owner: Address
}

export interface ValidatedDisputeSummary {
  dispute: Address
  claimant: Address
  respondent: Address
  status: string
  evidenceCount: number
  createdAt: bigint
}

// Type guard functions with runtime validation
export function isValidAuctionData(value: unknown): value is ValidatedAuctionData {
  if (!value || typeof value !== 'object') return false
  
  const obj = value as Record<string, unknown>
  
  return (
    typeof obj.auction === 'string' &&
    typeof obj.auctionType === 'string' &&
    (typeof obj.currentPrice === 'bigint' || typeof obj.currentPrice === 'string' || typeof obj.currentPrice === 'number') &&
    (typeof obj.startingPrice === 'bigint' || typeof obj.startingPrice === 'string' || typeof obj.startingPrice === 'number') &&
    (typeof obj.auctionEndTime === 'bigint' || typeof obj.auctionEndTime === 'string' || typeof obj.auctionEndTime === 'number') &&
    typeof obj.totalBids === 'number' &&
    (typeof obj.minimumBidIncrement === 'bigint' || typeof obj.minimumBidIncrement === 'string' || typeof obj.minimumBidIncrement === 'number')
  )
}

export function isValidAgent(value: unknown): value is ValidatedAgent {
  if (!value || typeof value !== 'object') return false
  
  const obj = value as Record<string, unknown>
  
  return Boolean(
    typeof obj.address === 'string' &&
    obj.data && typeof obj.data === 'object' &&
    typeof (obj.data as Record<string, unknown>).name === 'string' &&
    typeof obj.owner === 'string'
  )
}

export function isValidDisputeSummary(value: unknown): value is ValidatedDisputeSummary {
  if (!value || typeof value !== 'object') return false
  
  const obj = value as Record<string, unknown>
  
  return (
    typeof obj.dispute === 'string' &&
    typeof obj.claimant === 'string' &&
    typeof obj.respondent === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.evidenceCount === 'number'
  )
}

// Validation functions that convert and validate
export function validateAndConvertAuction(value: unknown): ValidatedAuctionData | null {
  if (!value || typeof value !== 'object') return null
  
  // Define expected SDK Auction structure
  interface SDKAuction {
    id: string
    address: string
    seller: string
    currentBid?: bigint | number | string
    startingPrice?: bigint | number | string
    reservePrice?: bigint | number | string
    endTime?: bigint | number | string
    totalBids?: number
    auctionType?: string
    highestBidder?: string
    status?: string
  }
  
  const obj = value as SDKAuction
  
  // Check if this looks like an SDK Auction object
  if (!obj.id || !obj.address || !obj.seller) return null
  
  // Map SDK Auction fields to ValidatedAuctionData fields
  try {
    return {
      auction: obj.address as Address,
      auctionType: obj.auctionType ?? 'unknown',
      currentPrice: typeof obj.currentBid === 'bigint' ? obj.currentBid : BigInt(obj.currentBid ?? 0),
      startingPrice: typeof obj.startingPrice === 'bigint' ? obj.startingPrice : BigInt(obj.startingPrice ?? obj.currentBid ?? 0),
      reservePrice: obj.reservePrice ? (typeof obj.reservePrice === 'bigint' ? obj.reservePrice : BigInt(obj.reservePrice)) : undefined,
      auctionEndTime: typeof obj.endTime === 'bigint' ? obj.endTime : BigInt(obj.endTime ?? Date.now() + 86400000),
      totalBids: obj.totalBids ?? 0,
      minimumBidIncrement: BigInt(1000000), // 0.001 SOL default
      currentWinner: obj.highestBidder as Address | undefined,
      creator: obj.seller as Address,
      status: obj.status ?? 'active'
    }
  } catch (error) {
    console.warn('Failed to convert auction data:', error)
    return null
  }
}

// Array validation functions
export function validateAuctionArray(value: unknown): ValidatedAuctionData[] {
  if (!Array.isArray(value)) return []
  
  return value
    .map(validateAndConvertAuction)
    .filter((item): item is ValidatedAuctionData => item !== null)
}

export function validateAgentArray(value: unknown): ValidatedAgent[] {
  if (!Array.isArray(value)) return []
  
  return value.filter(isValidAgent)
}

export function validateDisputeArray(value: unknown): ValidatedDisputeSummary[] {
  if (!Array.isArray(value)) return []
  
  return value.filter(isValidDisputeSummary)
}

// Error type guards for safe error handling
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

export function isErrorWithMessage(value: unknown): value is Error & { message: string } {
  return isError(value) && typeof value.message === 'string'
}

export function isErrorWithCode(value: unknown): value is Error & { code: string | number } {
  return isError(value) && ('code' in value) && (typeof value.code === 'string' || typeof value.code === 'number')
}

export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error'
}

export function getErrorCode(error: unknown): string | number | undefined {
  if (isErrorWithCode(error)) {
    return error.code
  }
  return undefined
}