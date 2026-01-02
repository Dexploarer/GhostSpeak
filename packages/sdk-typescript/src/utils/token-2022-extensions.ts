/**
 * Token-2022 Extensions Utilities (Stub)
 *
 * TODO: Implement full Token-2022 extension support
 * This is a stub to allow tests to compile
 */

import type { Address } from '@solana/addresses'

export enum TokenAccountState {
  Uninitialized = 0,
  Initialized = 1,
  Frozen = 2,
}

export interface TransferFeeConfig {
  transferFeeBasisPoints: number
  maximumFee: bigint
}

export interface InterestBearingConfig {
  rateAuthority: Address
  initializationTimestamp: number
  preUpdateAverageRate: number
  lastUpdateTimestamp: number
  currentRate: number
}

// Transfer fee calculations
export function calculateTransferFee(
  amount: bigint,
  transferFeeBasisPoints: number,
  maximumFee: bigint
): bigint {
  const fee = (amount * BigInt(transferFeeBasisPoints)) / 10000n
  return fee > maximumFee ? maximumFee : fee
}

export function calculateRequiredAmountForNetTransfer(
  netAmount: bigint,
  transferFeeBasisPoints: number,
  maximumFee: bigint
): bigint {
  // Simple approximation: grossAmount = netAmount * (1 + fee%)
  const feeRate = BigInt(transferFeeBasisPoints) * 10000n / (10000n - BigInt(transferFeeBasisPoints))
  const estimatedFee = (netAmount * feeRate) / 10000n
  const adjustedFee = estimatedFee > maximumFee ? maximumFee : estimatedFee
  return netAmount + adjustedFee
}

export function estimateAccumulatedFees(
  transferCount: number,
  averageAmount: bigint,
  transferFeeBasisPoints: number,
  maximumFee: bigint
): bigint {
  let totalFees = 0n
  for (let i = 0; i < transferCount; i++) {
    totalFees += calculateTransferFee(averageAmount, transferFeeBasisPoints, maximumFee)
  }
  return totalFees
}

// Interest calculations
export function calculateInterest(
  balance: bigint,
  rate: number,
  elapsedSeconds: number
): bigint {
  // Simple interest: balance * rate * time
  // Rate is typically in basis points per year
  const annualRate = BigInt(Math.floor(rate * 10000))
  const secondsPerYear = 365n * 24n * 60n * 60n
  return (balance * annualRate * BigInt(elapsedSeconds)) / (10000n * secondsPerYear)
}

// Config creators
export function createTransferFeeConfig(
  transferFeeBasisPoints: number,
  maximumFee: bigint
): TransferFeeConfig {
  return {
    transferFeeBasisPoints,
    maximumFee,
  }
}

export function createInterestBearingConfig(
  rateAuthority: Address,
  currentRate: number
): InterestBearingConfig {
  const now = Math.floor(Date.now() / 1000)
  return {
    rateAuthority,
    initializationTimestamp: now,
    preUpdateAverageRate: 0,
    lastUpdateTimestamp: now,
    currentRate,
  }
}

// Compute unit estimation
export function estimateComputeUnits(
  hasTransferFee: boolean,
  hasInterestBearing: boolean,
  hasConfidentialTransfers: boolean
): number {
  let units = 5000 // Base compute units
  if (hasTransferFee) units += 2000
  if (hasInterestBearing) units += 1500
  if (hasConfidentialTransfers) units += 15000
  return units
}

// Account state checks
export function canTransfer(state: TokenAccountState): boolean {
  return state === TokenAccountState.Initialized
}

// Basis points utilities
export function basisPointsToPercentage(basisPoints: number): number {
  return basisPoints / 100
}

export function percentageToBasisPoints(percentage: number): number {
  return Math.floor(percentage * 100)
}

export function formatBasisPoints(basisPoints: number): string {
  const percentage = basisPointsToPercentage(basisPoints)
  return `${percentage.toFixed(2)}%`
}

// Confidential transfer stubs
export function verifyConfidentialTransferProof(_proof: Uint8Array): boolean {
  // Stub: always returns true for testing
  return true
}

export function generateConfidentialTransferProof(
  _amount: bigint,
  _blindingFactor: Uint8Array
): Uint8Array {
  // Stub: returns empty proof
  return new Uint8Array(64)
}
