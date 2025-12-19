/**
 * Compliance Screening for x402 Payments
 *
 * Inspired by PayAI's auto-compliance feature, this module provides:
 * - OFAC sanctions list screening
 * - Address risk scoring
 * - Transaction monitoring
 * - Compliance event logging
 *
 * @module x402/ComplianceScreening
 */

import type { Address } from '@solana/kit'
import { EventEmitter } from 'node:events'

// =====================================================
// TYPES
// =====================================================

/**
 * Compliance check result
 */
export interface ComplianceResult {
  /** Whether the address passed compliance checks */
  allowed: boolean
  /** Risk score (0-100, higher = riskier) */
  riskScore: number
  /** Specific flags triggered */
  flags: ComplianceFlag[]
  /** Check timestamp */
  checkedAt: number
  /** Expiry of this result (should re-check after) */
  validUntil: number
}

/**
 * Compliance flags
 */
export interface ComplianceFlag {
  type: ComplianceFlagType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  source?: string
}

export type ComplianceFlagType =
  | 'OFAC_SANCTIONED'
  | 'KNOWN_MIXER'
  | 'KNOWN_SCAM'
  | 'HIGH_RISK_JURISDICTION'
  | 'UNUSUAL_ACTIVITY'
  | 'NEW_ADDRESS'
  | 'DARKNET_ASSOCIATION'
  | 'EXPLOIT_ASSOCIATION'

/**
 * Screening configuration
 */
export interface ComplianceConfig {
  /** Enable OFAC screening */
  ofacEnabled: boolean
  /** Enable mixer detection */
  mixerDetectionEnabled: boolean
  /** Enable scam address detection */
  scamDetectionEnabled: boolean
  /** Risk score threshold (addresses above this are blocked) */
  riskThreshold: number
  /** Cache duration for results (ms) */
  cacheDurationMs: number
  /** External API endpoint for enhanced screening */
  externalApiEndpoint?: string
  /** API key for external service */
  externalApiKey?: string
}

/**
 * Transaction for monitoring
 */
export interface MonitoredTransaction {
  signature: string
  from: Address
  to: Address
  amount: bigint
  token: Address
  timestamp: number
  resourceUrl?: string
}

// =====================================================
// KNOWN BAD ACTORS (SAMPLE - Use real lists in production)
// =====================================================

/**
 * Sample OFAC-sanctioned addresses (Solana)
 * In production, this would be fetched from official sources
 */
const OFAC_SANCTIONED_ADDRESSES = new Set<string>([
  // Tornado Cash-related (example format)
  // Add actual sanctioned addresses from OFAC SDN list
])

/**
 * Known mixer addresses
 */
const KNOWN_MIXERS = new Set<string>([
  // Add known privacy protocol addresses
])

/**
 * Known scam addresses
 */
const KNOWN_SCAMS = new Set<string>([
  // Add known rug pulls, phishing, etc.
])

// =====================================================
// COMPLIANCE SCREENING SERVICE
// =====================================================

/**
 * Compliance Screening Service
 *
 * Provides automated compliance checks for x402 payments,
 * helping merchants stay compliant with regulations.
 */
export class ComplianceScreeningService extends EventEmitter {
  private readonly config: ComplianceConfig
  private readonly resultCache: Map<string, ComplianceResult> = new Map()
  private readonly transactionLog: MonitoredTransaction[] = []

  constructor(config: Partial<ComplianceConfig> = {}) {
    super()
    this.config = {
      ofacEnabled: config.ofacEnabled ?? true,
      mixerDetectionEnabled: config.mixerDetectionEnabled ?? true,
      scamDetectionEnabled: config.scamDetectionEnabled ?? true,
      riskThreshold: config.riskThreshold ?? 70,
      cacheDurationMs: config.cacheDurationMs ?? 3600000, // 1 hour
      externalApiEndpoint: config.externalApiEndpoint,
      externalApiKey: config.externalApiKey
    }
  }

  /**
   * Screen an address for compliance
   */
  async screenAddress(address: Address): Promise<ComplianceResult> {
    // Check cache first
    const cached = this.resultCache.get(address)
    if (cached && cached.validUntil > Date.now()) {
      return cached
    }

    const flags: ComplianceFlag[] = []
    let riskScore = 0

    // OFAC screening
    if (this.config.ofacEnabled) {
      if (OFAC_SANCTIONED_ADDRESSES.has(address)) {
        flags.push({
          type: 'OFAC_SANCTIONED',
          severity: 'critical',
          description: 'Address is on OFAC SDN list',
          source: 'OFAC'
        })
        riskScore = 100 // Immediate block
      }
    }

    // Mixer detection
    if (this.config.mixerDetectionEnabled) {
      if (KNOWN_MIXERS.has(address)) {
        flags.push({
          type: 'KNOWN_MIXER',
          severity: 'high',
          description: 'Address associated with mixing service',
          source: 'internal'
        })
        riskScore = Math.max(riskScore, 80)
      }
    }

    // Scam detection
    if (this.config.scamDetectionEnabled) {
      if (KNOWN_SCAMS.has(address)) {
        flags.push({
          type: 'KNOWN_SCAM',
          severity: 'critical',
          description: 'Address associated with known scam',
          source: 'internal'
        })
        riskScore = Math.max(riskScore, 95)
      }
    }

    // External API screening (if configured)
    if (this.config.externalApiEndpoint) {
      try {
        const externalResult = await this.callExternalApi(address)
        if (externalResult) {
          flags.push(...externalResult.flags)
          riskScore = Math.max(riskScore, externalResult.riskScore)
        }
      } catch {
        // Log but don't fail on external API errors
        this.emit('screening:external_error', { address })
      }
    }

    const result: ComplianceResult = {
      allowed: riskScore < this.config.riskThreshold,
      riskScore,
      flags,
      checkedAt: Date.now(),
      validUntil: Date.now() + this.config.cacheDurationMs
    }

    // Cache result
    this.resultCache.set(address, result)

    // Emit event
    this.emit('screening:completed', {
      address,
      allowed: result.allowed,
      riskScore: result.riskScore,
      flagCount: flags.length
    })

    return result
  }

  /**
   * Screen a payment before processing
   */
  async screenPayment(
    from: Address,
    to: Address,
    amount: bigint
  ): Promise<{
    allowed: boolean
    fromResult: ComplianceResult
    toResult: ComplianceResult
    combinedRiskScore: number
  }> {
    const [fromResult, toResult] = await Promise.all([
      this.screenAddress(from),
      this.screenAddress(to)
    ])

    const combinedRiskScore = Math.max(fromResult.riskScore, toResult.riskScore)
    const allowed = fromResult.allowed && toResult.allowed

    if (!allowed) {
      this.emit('payment:blocked', {
        from,
        to,
        amount,
        reason: !fromResult.allowed ? 'sender_blocked' : 'recipient_blocked'
      })
    }

    return {
      allowed,
      fromResult,
      toResult,
      combinedRiskScore
    }
  }

  /**
   * Log a transaction for monitoring
   */
  logTransaction(tx: MonitoredTransaction): void {
    this.transactionLog.push(tx)

    // Keep only last 10000 transactions in memory
    if (this.transactionLog.length > 10000) {
      this.transactionLog.shift()
    }

    this.emit('transaction:logged', tx)
  }

  /**
   * Get transaction history for an address
   */
  getTransactionHistory(address: Address): MonitoredTransaction[] {
    return this.transactionLog.filter(
      tx => tx.from === address || tx.to === address
    )
  }

  /**
   * Generate compliance report
   */
  generateReport(startDate: number, endDate: number): {
    totalTransactions: number
    blockedTransactions: number
    averageRiskScore: number
    flagsByType: Record<ComplianceFlagType, number>
    highRiskAddresses: Address[]
  } {
    const relevantTxs = this.transactionLog.filter(
      tx => tx.timestamp >= startDate && tx.timestamp <= endDate
    )

    const flagCounts: Partial<Record<ComplianceFlagType, number>> = {}
    const highRisk: Set<Address> = new Set()
    let totalRisk = 0
    let blocked = 0

    for (const tx of relevantTxs) {
      const fromResult = this.resultCache.get(tx.from)
      const toResult = this.resultCache.get(tx.to)

      if (fromResult) {
        totalRisk += fromResult.riskScore
        if (!fromResult.allowed) blocked++
        if (fromResult.riskScore >= 50) highRisk.add(tx.from)
        for (const flag of fromResult.flags) {
          flagCounts[flag.type] = (flagCounts[flag.type] ?? 0) + 1
        }
      }

      if (toResult) {
        if (toResult.riskScore >= 50) highRisk.add(tx.to)
      }
    }

    return {
      totalTransactions: relevantTxs.length,
      blockedTransactions: blocked,
      averageRiskScore: relevantTxs.length > 0 ? totalRisk / relevantTxs.length : 0,
      flagsByType: flagCounts as Record<ComplianceFlagType, number>,
      highRiskAddresses: Array.from(highRisk)
    }
  }

  /**
   * Call external compliance API
   */
  private async callExternalApi(
    address: Address
  ): Promise<{ riskScore: number; flags: ComplianceFlag[] } | null> {
    if (!this.config.externalApiEndpoint || !this.config.externalApiKey) {
      return null
    }

    // In production, this would call services like:
    // - Chainalysis
    // - Elliptic
    // - TRM Labs
    // - Merkle Science

    // Mock implementation
    return null
  }

  /**
   * Add address to blocklist
   */
  addToBlocklist(address: Address, reason: ComplianceFlagType): void {
    this.resultCache.set(address, {
      allowed: false,
      riskScore: 100,
      flags: [{
        type: reason,
        severity: 'critical',
        description: 'Manually added to blocklist'
      }],
      checkedAt: Date.now(),
      validUntil: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
    })

    this.emit('blocklist:added', { address, reason })
  }

  /**
   * Remove address from blocklist
   */
  removeFromBlocklist(address: Address): void {
    this.resultCache.delete(address)
    this.emit('blocklist:removed', { address })
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now()
    let cleared = 0

    for (const [address, result] of this.resultCache) {
      if (result.validUntil < now) {
        this.resultCache.delete(address)
        cleared++
      }
    }

    return cleared
  }
}

// =====================================================
// FACTORY
// =====================================================

export function createComplianceScreening(
  config?: Partial<ComplianceConfig>
): ComplianceScreeningService {
  return new ComplianceScreeningService(config)
}

// =====================================================
// MIDDLEWARE INTEGRATION
// =====================================================

/**
 * Compliance middleware for x402 payments
 *
 * Usage:
 * ```typescript
 * const compliance = createComplianceScreening();
 *
 * app.use(complianceMiddleware(compliance));
 * ```
 */
export function complianceMiddleware(
  screening: ComplianceScreeningService
): (payerAddress: Address) => Promise<{ allowed: boolean; reason?: string }> {
  return async (payerAddress: Address) => {
    const result = await screening.screenAddress(payerAddress)

    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.flags.map(f => f.type).join(', ')
      }
    }

    return { allowed: true }
  }
}
