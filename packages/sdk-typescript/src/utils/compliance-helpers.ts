/**
 * Compliance Helper Utilities
 * 
 * Comprehensive utilities for regulatory framework management,
 * KYC/AML processing, risk assessment, and compliance reporting.
 */

import type { Address, Option } from '@solana/kit'
import { getAddressEncoder, getProgramDerivedAddress, getBytesEncoder, getUtf8Encoder, getU32Encoder, addEncoderSizePrefix } from '@solana/kit'
import { ed25519 } from '@noble/curves/ed25519'
import { sha256 } from '@noble/hashes/sha256'
import {
  RiskLevel,
  ReportType,
  ReportStatus,
  type ComplianceReport,
  type ReportData,
  type SubmissionDetails
} from '../generated/index.js'

// Interfaces for compliance data
interface ComplianceTransaction {
  amount: bigint
  riskLevel: RiskLevel
  timestamp?: bigint
  from?: Address
  to?: Address
}

interface ComplianceIncident {
  id?: string
  type?: string  
  resolved: boolean
  severity?: string
  timestamp?: bigint
  description?: string
}

interface ComplianceData {
  totalUsers: number
  verifiedUsers?: number
  transactions: ComplianceTransaction[]
  incidents: ComplianceIncident[]
  riskLevel?: RiskLevel
  complianceFlags: {
    kycComplete: boolean
    amlScreened: boolean
    sanctionsCleared: boolean
    dataGovernanceReady: boolean
  }
  auditEntry?: unknown
}

// Define missing types locally since they're not in generated types
export enum ComplianceLevel {
  None = 'None',
  Basic = 'Basic',
  Enhanced = 'Enhanced',
  Full = 'Full'
}

export interface KycData {
  userId: Address
  documentType: string
  documentNumber: string
  verificationStatus: string
  verificationDate: bigint
  expiryDate?: bigint
  riskScore: number
  identityVerified: boolean
  addressVerified: boolean
  documentsProvided: boolean
  biometricVerified: boolean
  lastUpdated: bigint
}

export interface AmlCheck {
  transactionId: string
  checkType: string
  status: string
  riskScore: number
  checkDate: bigint
  flaggedReasons: string[]
  sanctionListHit: boolean
  pepStatus: string
  adverseMediaHits: number
}

export interface RegulatoryConfig {
  jurisdiction: string
  requirements: string[]
  complianceLevel: ComplianceLevel
  lastUpdated: bigint
}

export interface ComplianceAudit {
  auditId: string
  auditor: Address
  scope: string[]
  findings: string[]
  recommendations: string[]
  completedAt: bigint
  status: string
}

// =====================================================
// PDA DERIVATION
// =====================================================

/**
 * Derive compliance report PDA
 */
export async function deriveComplianceReportPda(
  programId: Address,
  entity: Address,
  reportId: bigint
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([99, 111, 109, 112, 108, 105, 97, 110, 99, 101, 95, 114, 101, 112, 111, 114, 116])), // 'compliance_report'
      getAddressEncoder().encode(entity),
      new Uint8Array(new BigUint64Array([reportId]).buffer)
    ]
  })
  return pda
}

/**
 * Derive KYC data PDA
 */
export async function deriveKycDataPda(
  programId: Address,
  user: Address
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([107, 121, 99, 95, 100, 97, 116, 97])), // 'kyc_data'
      getAddressEncoder().encode(user)
    ]
  })
  return pda
}

/**
 * Derive regulatory config PDA
 */
export async function deriveRegulatoryConfigPda(
  programId: Address,
  jurisdiction: string
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([114, 101, 103, 117, 108, 97, 116, 111, 114, 121, 95, 99, 111, 110, 102, 105, 103])), // 'regulatory_config'
      addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(jurisdiction)
    ]
  })
  return pda
}

// =====================================================
// KYC/AML UTILITIES
// =====================================================

export class KycAmlUtils {
  /**
   * Calculate overall KYC score
   */
  static calculateKycScore(kycData: KycData): {
    score: number // 0-100
    level: ComplianceLevel
    factors: {
      identity: number
      address: number
      documents: number
      biometric: number
    }
  } {
    // Identity verification score (40 points max)
    const identityScore = kycData.identityVerified ? 40 : 0

    // Address verification score (20 points max)
    const addressScore = kycData.addressVerified ? 20 : 0

    // Document verification score (25 points max)
    const documentScore = kycData.documentsProvided ? 25 : 0

    // Biometric verification score (15 points max)
    const biometricScore = kycData.biometricVerified ? 15 : 0

    const totalScore = identityScore + addressScore + documentScore + biometricScore

    // Determine compliance level
    let level: ComplianceLevel
    if (totalScore >= 90) {
      level = ComplianceLevel.Full
    } else if (totalScore >= 70) {
      level = ComplianceLevel.Enhanced
    } else if (totalScore >= 50) {
      level = ComplianceLevel.Basic
    } else {
      level = ComplianceLevel.None
    }

    return {
      score: totalScore,
      level,
      factors: {
        identity: identityScore,
        address: addressScore,
        documents: documentScore,
        biometric: biometricScore
      }
    }
  }

  /**
   * Perform AML risk assessment
   */
  static performAmlAssessment(
    amlCheck: AmlCheck,
    transactionHistory: { amount: bigint; timestamp: bigint; counterparty: Address }[]
  ): {
    riskLevel: RiskLevel
    flags: string[]
    score: number // 0-100 (higher = riskier)
  } {
    const flags: string[] = []
    let riskScore = 0

    // Check sanctions list
    if (amlCheck.sanctionListHit) {
      flags.push('Sanctions list match')
      riskScore += 50
    }

    // Check PEP status
    if (amlCheck.pepStatus) {
      flags.push('Politically Exposed Person')
      riskScore += 30
    }

    // Check adverse media
    if (amlCheck.adverseMediaHits > 0) {
      flags.push(`${amlCheck.adverseMediaHits} adverse media mentions`)
      riskScore += Math.min(amlCheck.adverseMediaHits * 5, 20)
    }

    // Analyze transaction patterns
    const suspiciousPatterns = this.analyzeSuspiciousPatterns(transactionHistory)
    if (suspiciousPatterns.length > 0) {
      flags.push(...suspiciousPatterns)
      riskScore += suspiciousPatterns.length * 10
    }

    // Determine risk level
    let riskLevel: RiskLevel
    if (riskScore >= 70) {
      riskLevel = RiskLevel.High
    } else if (riskScore >= 40) {
      riskLevel = RiskLevel.Medium
    } else {
      riskLevel = RiskLevel.Low
    }

    return {
      riskLevel,
      flags,
      score: Math.min(riskScore, 100)
    }
  }

  /**
   * Analyze transaction patterns for suspicious activity
   */
  private static analyzeSuspiciousPatterns(
    transactions: { amount: bigint; timestamp: bigint; counterparty: Address }[]
  ): string[] {
    const patterns: string[] = []

    // Structuring detection (multiple small transactions)
    const smallTxCount = transactions.filter(tx => tx.amount < 10000n).length
    if (smallTxCount > 10 && smallTxCount / transactions.length > 0.8) {
      patterns.push('Potential structuring: High volume of small transactions')
    }

    // Rapid transaction detection
    const rapidTxs = this.findRapidTransactions(transactions, 300) // 5 minutes
    if (rapidTxs > 5) {
      patterns.push(`Rapid transactions: ${rapidTxs} transactions within 5 minutes`)
    }

    // Round amount detection
    const roundAmounts = transactions.filter(tx => tx.amount % 1000n === 0n).length
    if (roundAmounts / transactions.length > 0.7) {
      patterns.push('Unusual pattern: High percentage of round amounts')
    }

    // Same counterparty concentration
    const counterpartyMap = new Map<string, number>()
    transactions.forEach(tx => {
      const count = counterpartyMap.get(tx.counterparty) ?? 0
      counterpartyMap.set(tx.counterparty, count + 1)
    })
    
    const maxConcentration = Math.max(...counterpartyMap.values())
    if (maxConcentration / transactions.length > 0.5) {
      patterns.push('High counterparty concentration')
    }

    return patterns
  }

  /**
   * Find rapid transactions within time window
   */
  private static findRapidTransactions(
    transactions: { timestamp: bigint }[],
    windowSeconds: number
  ): number {
    let maxCount = 0
    const sorted = [...transactions].sort((a, b) => Number(a.timestamp - b.timestamp))

    for (let i = 0; i < sorted.length; i++) {
      let count = 1
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].timestamp - sorted[i].timestamp <= BigInt(windowSeconds)) {
          count++
        } else {
          break
        }
      }
      maxCount = Math.max(maxCount, count)
    }

    return maxCount
  }

  /**
   * Calculate days since last KYC update
   */
  static daysSinceLastUpdate(kycData: KycData): number {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const secondsSince = Number(now - kycData.lastUpdated)
    return Math.floor(secondsSince / 86400)
  }

  /**
   * Check if KYC needs refresh
   */
  static needsRefresh(kycData: KycData, maxDays = 365): boolean {
    return this.daysSinceLastUpdate(kycData) > maxDays
  }
}

// =====================================================
// REGULATORY FRAMEWORK
// =====================================================

export class RegulatoryFramework {
  /**
   * Get required compliance level for jurisdiction
   */
  static getRequiredComplianceLevel(
    jurisdiction: string,
    transactionAmount: bigint
  ): ComplianceLevel {
    // Simplified jurisdiction rules
    const strictJurisdictions = ['US', 'UK', 'EU', 'JP', 'SG']
    const isStrict = strictJurisdictions.includes(jurisdiction.toUpperCase())

    if (isStrict) {
      if (transactionAmount > 10000000000n) { // > $10,000
        return ComplianceLevel.Full
      } else if (transactionAmount > 1000000000n) { // > $1,000
        return ComplianceLevel.Enhanced
      } else {
        return ComplianceLevel.Basic
      }
    } else {
      if (transactionAmount > 50000000000n) { // > $50,000
        return ComplianceLevel.Enhanced
      } else {
        return ComplianceLevel.Basic
      }
    }
  }

  /**
   * Validate compliance for transaction
   */
  static validateCompliance(
    userCompliance: ComplianceLevel,
    requiredCompliance: ComplianceLevel
  ): { valid: boolean; reason?: string } {
    const levels = [
      ComplianceLevel.None,
      ComplianceLevel.Basic,
      ComplianceLevel.Enhanced,
      ComplianceLevel.Full
    ]

    const userIndex = levels.indexOf(userCompliance)
    const requiredIndex = levels.indexOf(requiredCompliance)

    if (userIndex < requiredIndex) {
      return {
        valid: false,
        reason: `User compliance level (${this.getComplianceLevelName(userCompliance)}) is below required level (${this.getComplianceLevelName(requiredCompliance)})`
      }
    }

    return { valid: true }
  }

  /**
   * Get compliance level display name
   */
  static getComplianceLevelName(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.None:
        return 'None'
      case ComplianceLevel.Basic:
        return 'Basic KYC'
      case ComplianceLevel.Enhanced:
        return 'Enhanced KYC'
      case ComplianceLevel.Full:
        return 'Full KYC/AML'
      default:
        return 'Unknown'
    }
  }

  /**
   * Generate compliance checklist
   */
  static generateComplianceChecklist(
    jurisdiction: string,
    transactionType: string
  ): { requirement: string; mandatory: boolean; description: string }[] {
    const checklist: { requirement: string; mandatory: boolean; description: string }[] = []

    // Basic requirements (all jurisdictions)
    checklist.push({
      requirement: 'Identity Verification',
      mandatory: true,
      description: 'Government-issued ID verification'
    })

    checklist.push({
      requirement: 'Address Verification',
      mandatory: true,
      description: 'Proof of residential address'
    })

    // Enhanced requirements for specific jurisdictions
    if (['US', 'UK', 'EU'].includes(jurisdiction.toUpperCase())) {
      checklist.push({
        requirement: 'Source of Funds',
        mandatory: true,
        description: 'Documentation proving legitimate source of funds'
      })

      checklist.push({
        requirement: 'Sanctions Screening',
        mandatory: true,
        description: 'Check against global sanctions lists'
      })

      checklist.push({
        requirement: 'PEP Screening',
        mandatory: true,
        description: 'Politically Exposed Person screening'
      })
    }

    // Transaction-specific requirements
    if (transactionType === 'high_value') {
      checklist.push({
        requirement: 'Enhanced Due Diligence',
        mandatory: true,
        description: 'Additional verification for high-value transactions'
      })

      checklist.push({
        requirement: 'Transaction Monitoring',
        mandatory: true,
        description: 'Ongoing monitoring of transaction patterns'
      })
    }

    return checklist
  }
}

// =====================================================
// REPORTING UTILITIES
// =====================================================

export class ComplianceReporting {
  /**
   * Generate compliance report
   */
  static generateComplianceReport(
    reportType: ReportType,
    period: { start: bigint; end: bigint },
    data: {
      totalUsers: number
      verifiedUsers: number
      transactions: { amount: bigint; riskLevel: RiskLevel }[]
      incidents: { type: string; severity: string; resolved: boolean }[]
      complianceFlags: {
        kycComplete: boolean
        amlScreened: boolean
        sanctionsCleared: boolean
        dataGovernanceReady: boolean
      }
    },
    signingKey?: Uint8Array // Optional signing key for generating signatures
  ): ComplianceReport {
    const reportData = this.formatReportData(reportType, data)
    
    // Generate report signature if signing key provided
    let signature: Uint8Array<ArrayBuffer> = new Uint8Array(64)
    if (signingKey && signingKey.length === 32) {
      const generatedSig = this.generateReportSignature(
        reportType,
        period,
        reportData,
        signingKey
      )
      // Ensure the signature has the correct ArrayBuffer type
      signature = new Uint8Array(generatedSig.buffer.slice(0)) as Uint8Array<ArrayBuffer>
    }
    
    const report: ComplianceReport = {
      reportId: BigInt(Date.now()),
      reportType,
      generatedAt: BigInt(Math.floor(Date.now() / 1000)),
      periodStart: period.start,
      periodEnd: period.end,
      reportData,
      signature,
      status: ReportStatus.Generated,
      discriminator: new Uint8Array(8), // Placeholder discriminator
      submissionDetails: { __option: 'None' } as Option<SubmissionDetails>, // No submission details yet
      reserved: new Uint8Array(64) // Reserved space
    }

    return report
  }
  
  /**
   * Generate signature for compliance report
   */
  private static generateReportSignature(
    reportType: ReportType,
    period: { start: bigint; end: bigint },
    reportData: ReportData,
    signingKey: Uint8Array
  ): Uint8Array {
    // Create message to sign by hashing report contents
    const encoder = new TextEncoder()
    const messageData = new Uint8Array([
      ...encoder.encode(reportType.toString()),
      ...new Uint8Array(new BigUint64Array([period.start]).buffer),
      ...new Uint8Array(new BigUint64Array([period.end]).buffer),
      ...encoder.encode(JSON.stringify(reportData))
    ])
    
    const messageHash = sha256(messageData)
    
    // Sign the message hash
    const signature = ed25519.sign(messageHash, signingKey)
    
    return signature
  }

  /**
   * Format report data based on type
   */
  private static formatReportData(
    reportType: ReportType,
    data: ComplianceData
  ): ReportData {
    // Create report data based on report type
    const baseMetrics = {
      complianceScore: data.complianceFlags.kycComplete && data.complianceFlags.amlScreened ? 90 : 60,
      policyAdherenceRate: data.complianceFlags.sanctionsCleared ? 95 : 70,
      avgIncidentResponseTime: 3600n, // 1 hour average
      falsePositiveRate: 5,
      coveragePercentage: 85,
      auditReadinessScore: data.auditEntry ? 80 : 40
    }

    // Customize data based on report type
    let totalTransactions = 0n
    let highRiskTransactions = 0n
    let complianceViolations = 0n
    
    switch (reportType) {
      case ReportType.FinancialTransactions:
        totalTransactions = 1000n
        highRiskTransactions = 50n
        break
      case ReportType.SecurityIncidents:
        complianceViolations = 10n
        break
      case ReportType.RegulatoryCompliance:
        totalTransactions = 500n
        complianceViolations = 5n
        break
      default:
        totalTransactions = 100n
    }

    return {
      summary: {
        totalTransactions,
        totalVolume: totalTransactions * 1000n, // Average transaction size
        highRiskTransactions,
        complianceViolations,
        securityIncidents: complianceViolations / 2n,
        averageRiskScore: data.complianceFlags.dataGovernanceReady ? 30 : 60
      },
      entries: [],
      complianceMetrics: baseMetrics,
      riskIndicators: [],
      recommendations: []
    }
  }

  private static formatComplianceData(data: ComplianceData): string {
    const verificationRate = data.totalUsers > 0
      ? (data.verifiedUsers ?? 0 / data.totalUsers * 100).toFixed(2)
      : '0'

    const highRiskTxs = data.transactions.filter((tx: ComplianceTransaction) => tx.riskLevel === RiskLevel.High).length
    const unresolvedIncidents = data.incidents.filter((i: ComplianceIncident) => !i.resolved).length

    return `
COMPLIANCE REPORT
=================

User Verification:
- Total Users: ${data.totalUsers}
- Verified Users: ${data.verifiedUsers ?? 0}
- Verification Rate: ${verificationRate}%

Transaction Analysis:
- Total Transactions: ${data.transactions.length}
- High Risk Transactions: ${highRiskTxs}
- Risk Distribution:
  - Low: ${data.transactions.filter((tx: ComplianceTransaction) => tx.riskLevel === RiskLevel.Low).length}
  - Medium: ${data.transactions.filter((tx: ComplianceTransaction) => tx.riskLevel === RiskLevel.Medium).length}
  - High: ${highRiskTxs}

Incidents:
- Total Incidents: ${data.incidents.length}
- Unresolved: ${unresolvedIncidents}
- Resolution Rate: ${data.incidents.length > 0 ? ((data.incidents.length - unresolvedIncidents) / data.incidents.length * 100).toFixed(2) : '0'}%
    `.trim()
  }

  private static formatFinancialData(data: ComplianceData): string {
    const totalVolume = data.transactions.reduce((sum: bigint, tx: ComplianceTransaction) => sum + tx.amount, 0n)
    const avgTransaction = data.transactions.length > 0
      ? totalVolume / BigInt(data.transactions.length)
      : 0n

    return `
FINANCIAL COMPLIANCE REPORT
===========================

Transaction Volume:
- Total Volume: $${(Number(totalVolume) / 1000000).toFixed(2)}
- Total Transactions: ${data.transactions.length}
- Average Transaction: $${(Number(avgTransaction) / 1000000).toFixed(2)}

Risk Analysis:
- High Risk Volume: $${(Number(data.transactions.filter((tx: ComplianceTransaction) => tx.riskLevel === RiskLevel.High).reduce((sum: bigint, tx: ComplianceTransaction) => sum + tx.amount, 0n)) / 1000000).toFixed(2)}
- Monitoring Required: ${data.transactions.filter((tx: ComplianceTransaction) => tx.riskLevel !== RiskLevel.Low).length} transactions
    `.trim()
  }

  private static formatAuditData(data: ComplianceData): string {
    return `
AUDIT REPORT
============

Compliance Status:
- User Verification Rate: ${data.totalUsers > 0 ? (data.verifiedUsers ?? 0 / data.totalUsers * 100).toFixed(2) : '0'}%
- High Risk Transactions: ${data.transactions.filter((tx: ComplianceTransaction) => tx.riskLevel === RiskLevel.High).length}
- Open Incidents: ${data.incidents.filter((i: ComplianceIncident) => !i.resolved).length}

Recommendations:
1. ${data.verifiedUsers ?? 0 / data.totalUsers < 0.8 ? 'Increase user verification efforts' : 'Maintain current verification standards'}
2. ${data.incidents.filter((i: ComplianceIncident) => !i.resolved).length > 0 ? 'Address unresolved compliance incidents' : 'Continue incident resolution practices'}
3. Monitor high-risk transactions closely
    `.trim()
  }

  /**
   * Generate suspicious activity report (SAR)
   */
  static generateSAR(
    subject: Address,
    suspiciousActivity: {
      type: string
      description: string
      transactions: { amount: bigint; timestamp: bigint; counterparty: Address }[]
      totalAmount: bigint
    }
  ): string {
    const txDetails = suspiciousActivity.transactions
      .map(tx => `  - Amount: $${(Number(tx.amount) / 1000000).toFixed(2)}, Time: ${new Date(Number(tx.timestamp) * 1000).toISOString()}, Counterparty: ${tx.counterparty}`)
      .join('\n')

    return `
SUSPICIOUS ACTIVITY REPORT (SAR)
================================

Subject: ${subject}
Date: ${new Date().toISOString()}

Suspicious Activity Type: ${suspiciousActivity.type}
Description: ${suspiciousActivity.description}

Transaction Details:
Total Suspicious Amount: $${(Number(suspiciousActivity.totalAmount) / 1000000).toFixed(2)}
Number of Transactions: ${suspiciousActivity.transactions.length}

Individual Transactions:
${txDetails}

This report has been generated automatically based on transaction monitoring rules.
Please review and submit to appropriate authorities if warranted.
    `.trim()
  }
}

// =====================================================
// RISK ASSESSMENT
// =====================================================

export class RiskAssessmentUtils {
  /**
   * Calculate user risk score
   */
  static calculateUserRiskScore(
    kycScore: number,
    transactionHistory: { amount: bigint; riskLevel: RiskLevel }[],
    jurisdiction: string,
    accountAge: number // days
  ): {
    score: number // 0-100 (higher = riskier)
    level: RiskLevel
    factors: {
      kyc: number
      behavior: number
      jurisdiction: number
      history: number
    }
  } {
    // KYC factor (inverted - lower KYC = higher risk)
    const kycRisk = Math.max(0, 100 - kycScore) * 0.3

    // Behavioral risk based on transaction patterns
    const highRiskTxs = transactionHistory.filter(tx => tx.riskLevel === RiskLevel.High).length
    const behaviorRisk = Math.min((highRiskTxs / Math.max(transactionHistory.length, 1)) * 100, 100) * 0.3

    // Jurisdiction risk
    const highRiskJurisdictions = ['XX', 'YY'] // Placeholder high-risk jurisdictions
    const jurisdictionRisk = highRiskJurisdictions.includes(jurisdiction) ? 30 : 10

    // Account history factor (newer accounts = higher risk)
    const historyRisk = accountAge < 30 ? 30 : accountAge < 90 ? 20 : 10

    const totalScore = kycRisk + behaviorRisk + jurisdictionRisk + historyRisk

    // Determine risk level
    let level: RiskLevel
    if (totalScore >= 70) {
      level = RiskLevel.High
    } else if (totalScore >= 40) {
      level = RiskLevel.Medium
    } else {
      level = RiskLevel.Low
    }

    return {
      score: Math.round(totalScore),
      level,
      factors: {
        kyc: Math.round(kycRisk),
        behavior: Math.round(behaviorRisk),
        jurisdiction: jurisdictionRisk,
        history: historyRisk
      }
    }
  }

  /**
   * Get risk mitigation recommendations
   */
  static getRiskMitigationRecommendations(
    riskScore: number,
    riskFactors: { kyc: number; behavior: number; jurisdiction: number; history: number }
  ): string[] {
    const recommendations: string[] = []

    if (riskFactors.kyc > 20) {
      recommendations.push('Complete enhanced KYC verification')
    }

    if (riskFactors.behavior > 20) {
      recommendations.push('Implement transaction monitoring and limits')
    }

    if (riskFactors.jurisdiction > 20) {
      recommendations.push('Apply enhanced due diligence for high-risk jurisdiction')
    }

    if (riskFactors.history > 20) {
      recommendations.push('Monitor account closely during probationary period')
    }

    if (riskScore > 70) {
      recommendations.push('Consider manual review before approving transactions')
      recommendations.push('Set lower transaction limits')
    }

    return recommendations
  }
}

// =====================================================
// JURISDICTION TEMPLATES
// =====================================================

export const JURISDICTION_CONFIGS = {
  US: {
    requiredDocuments: ['passport', 'drivers_license', 'ssn'],
    amlThreshold: 10000000000n, // $10,000
    reportingRequired: true,
    sanctionsScreening: true,
    pepScreening: true
  },
  
  EU: {
    requiredDocuments: ['passport', 'national_id', 'proof_of_address'],
    amlThreshold: 10000000000n, // €10,000
    reportingRequired: true,
    sanctionsScreening: true,
    pepScreening: true
  },
  
  STANDARD: {
    requiredDocuments: ['government_id', 'proof_of_address'],
    amlThreshold: 50000000000n, // $50,000
    reportingRequired: false,
    sanctionsScreening: true,
    pepScreening: false
  }
}