/**
 * Feature Gate Detector
 * 
 * Runtime detection of Solana feature gates to determine which native
 * programs and features are available on the current network.
 * 
 * This module specifically tracks the ZK ElGamal Proof Program feature gate
 * and provides caching to minimize RPC calls.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/kit'

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Known feature gate addresses
 */
export const FEATURE_GATES = {
  /** ZK ElGamal Proof Program re-enablement */
  ZK_ELGAMAL_PROOF_REENABLED: new PublicKey('zkemPXcuM3G4wpMDZ36Cpw34EjUpvm1nuioiSGbGZPR'),
  
  /** Confidential transfers feature (placeholder) */
  CONFIDENTIAL_TRANSFERS: new PublicKey('11111111111111111111111111111111'),
  
  /** Token-2022 program (placeholder) */
  TOKEN_2022: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
} as const

/**
 * Cache configuration
 */
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_ENTRIES = 100

// =====================================================
// TYPES
// =====================================================

export interface FeatureStatus {
  /** Whether the feature is activated */
  activated: boolean
  
  /** When the status was last checked */
  lastChecked: number
  
  /** Optional activation slot if known */
  activationSlot?: bigint
  
  /** Error if status check failed */
  error?: string
}

export interface FeatureGateCache {
  [featureId: string]: FeatureStatus
}

// =====================================================
// CACHE IMPLEMENTATION
// =====================================================

class FeatureGateCacheManager {
  private cache: FeatureGateCache = {}
  private cacheOrder: string[] = []
  
  /**
   * Get cached feature status
   */
  get(featureId: string): FeatureStatus | null {
    const cached = this.cache[featureId]
    // Cache found, continue
    
    // Check if cache is expired
    if (Date.now() - cached.lastChecked > CACHE_TTL_MS) {
      this.remove(featureId)
      return null
    }
    
    return cached
  }
  
  /**
   * Set feature status in cache
   */
  set(featureId: string, status: FeatureStatus): void {
    // Remove if already exists to update order
    this.remove(featureId)
    
    // Add to cache
    this.cache[featureId] = status
    this.cacheOrder.push(featureId)
    
    // Enforce max cache size
    if (this.cacheOrder.length > MAX_CACHE_ENTRIES) {
      const oldest = this.cacheOrder.shift()
      if (oldest) {
        delete this.cache[oldest]
      }
    }
  }
  
  /**
   * Remove from cache
   */
  remove(featureId: string): void {
    delete this.cache[featureId]
    this.cacheOrder = this.cacheOrder.filter(id => id !== featureId)
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache = {}
    this.cacheOrder = []
  }
}

// Global cache instance
const featureCache = new FeatureGateCacheManager()

// =====================================================
// FEATURE DETECTION
// =====================================================

/**
 * Check if a feature gate is activated on the current network
 * 
 * @param connection - Solana connection
 * @param featureGate - Feature gate public key to check
 * @returns Feature activation status
 */
export async function checkFeatureGate(
  connection: Connection,
  featureGate: PublicKey
): Promise<FeatureStatus> {
  const featureId = featureGate.toBase58()
  
  // Check cache first
  const cached = featureCache.get(featureId)
  if (cached) {
    return cached
  }
  
  try {
    // Check if the feature account exists
    const accountInfo = await connection.getAccountInfo(featureGate)
    
    // Feature gates are special accounts - if they exist, the feature is active
    const activated = accountInfo !== null
    
    const status: FeatureStatus = {
      activated,
      lastChecked: Date.now(),
    }
    
    // If activated, try to get activation slot from account data
    try {
      // First 8 bytes of feature account data is the activation slot
      const activationSlot = BigInt(
        accountInfo.data.readBigUInt64LE(0)
      )
      status.activationSlot = activationSlot
    } catch {
      // Ignore parsing errors
    }
    
    // Cache the result
    featureCache.set(featureId, status)
    
    return status
  } catch (error) {
    // Cache error state to avoid repeated failures
    const errorStatus: FeatureStatus = {
      activated: false,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    
    featureCache.set(featureId, errorStatus)
    
    return errorStatus
  }
}

/**
 * Check if the ZK ElGamal Proof Program is enabled
 * 
 * @param connection - Solana connection
 * @returns Whether the ZK program is available
 */
export async function isZkProgramEnabled(
  connection: Connection
): Promise<boolean> {
  const status = await checkFeatureGate(
    connection,
    FEATURE_GATES.ZK_ELGAMAL_PROOF_REENABLED
  )
  
  return status.activated
}

/**
 * Get detailed status of the ZK ElGamal Proof Program
 * 
 * @param connection - Solana connection
 * @returns Detailed feature status
 */
export async function getZkProgramFeatureStatus(
  connection: Connection
): Promise<FeatureStatus> {
  return checkFeatureGate(
    connection,
    FEATURE_GATES.ZK_ELGAMAL_PROOF_REENABLED
  )
}

/**
 * Check multiple feature gates in parallel
 * 
 * @param connection - Solana connection
 * @param featureGates - Array of feature gates to check
 * @returns Map of feature gate to status
 */
export async function checkMultipleFeatureGates(
  connection: Connection,
  featureGates: PublicKey[]
): Promise<Map<string, FeatureStatus>> {
  const results = await Promise.all(
    featureGates.map(gate => checkFeatureGate(connection, gate))
  )
  
  const statusMap = new Map<string, FeatureStatus>()
  featureGates.forEach((gate, index) => {
    statusMap.set(gate.toBase58(), results[index])
  })
  
  return statusMap
}

/**
 * Monitor a feature gate for activation changes
 * 
 * @param connection - Solana connection
 * @param featureGate - Feature gate to monitor
 * @param callback - Callback when status changes
 * @param intervalMs - Check interval (default 30 seconds)
 * @returns Function to stop monitoring
 */
export function monitorFeatureGate(
  connection: Connection,
  featureGate: PublicKey,
  callback: (status: FeatureStatus) => void,
  intervalMs = 30_000
): () => void {
  let lastStatus: FeatureStatus | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null
  
  const check = async () => {
    try {
      const status = await checkFeatureGate(connection, featureGate)
      
      // Check if status changed
      if (!lastStatus || lastStatus.activated !== status.activated) {
        callback(status)
        lastStatus = status
      }
    } catch (error) {
      console.error('Error monitoring feature gate:', error)
    }
  }
  
  // Initial check
  check()
  
  // Set up interval
  intervalId = setInterval(check, intervalMs)
  
  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Clear the feature gate cache
 * Useful for testing or forcing fresh checks
 */
export function clearFeatureGateCache(): void {
  featureCache.clear()
}

/**
 * Get a human-readable description of the ZK program status
 * 
 * @param connection - Solana connection
 * @returns Status description
 */
export async function getZkProgramStatusDescription(
  connection: Connection
): Promise<string> {
  const status = await getZkProgramFeatureStatus(connection)
  
  if (status.error) {
    return `ZK ElGamal Proof Program status unknown: ${status.error}`
  }
  
  if (status.activated) {
    const slotInfo = status.activationSlot 
      ? ` (activated at slot ${status.activationSlot})` 
      : ''
    return `ZK ElGamal Proof Program is ENABLED${slotInfo}`
  }
  
  return 'ZK ElGamal Proof Program is DISABLED pending security audit completion'
}

/**
 * Convert feature gate public key to Address type
 */
export function featureGateToAddress(featureGate: PublicKey): Address {
  return address(featureGate.toBase58())
}

// =====================================================
// EXPORTS
// =====================================================

export {
  FeatureGateCacheManager,
  featureCache as defaultFeatureCache,
}