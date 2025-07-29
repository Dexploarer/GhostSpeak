/**
 * Common utility functions for GhostSpeak SDK
 */

/**
 * Convert SOL to lamports
 */
export function sol(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000_000))
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000
}