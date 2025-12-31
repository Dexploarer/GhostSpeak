/**
 * Manual stub for ComplianceStatus and related audit.rs types
 *
 * Source: programs/src/state/audit.rs
 * These types are specific to the audit module and differ from
 * the security_governance.rs types (RiskFactor, RiskAssessment).
 *
 * ⚠️ IMPORTANT: When Rust types change, this manual stub MUST be updated!
 */

import {
  addEncoderSizePrefix,
  addDecoderSizePrefix,
  getStructEncoder,
  getStructDecoder,
  getUtf8Encoder,
  getUtf8Decoder,
  getU8Encoder,
  getU8Decoder,
  getU32Encoder,
  getU32Decoder,
  getU64Encoder,
  getU64Decoder,
  getI64Encoder,
  getI64Decoder,
  getArrayEncoder,
  getArrayDecoder,
  getAddressEncoder,
  getAddressDecoder,
  getOptionEncoder,
  getOptionDecoder,
  combineCodec,
  type Encoder,
  type Decoder,
  type Codec,
  type Address,
  type Option,
} from '@solana/kit'

// Boolean codec helpers (booleans are encoded as u8: 0 = false, 1 = true)
const getBoolEncoder = () => getU8Encoder()
const getBoolDecoder = () => {
  const u8Decoder = getU8Decoder()
  return {
    ...u8Decoder,
    decode: (bytes: Uint8Array, offset = 0) => {
      const [value, newOffset] = u8Decoder.decode(bytes, offset)
      return [value !== 0, newOffset] as [boolean, number]
    }
  }
}
import type { DecodedStringTuple, StringTupleInput } from './common-tuple-types.js'

// ============================================================================
// Enums (audit.rs)
// ============================================================================

/**
 * Violation type (audit.rs:318-329)
 */
export enum AuditViolationType {
  UnauthorizedAccess,
  ExcessivePrivileges,
  SuspiciousTransaction,
  DataPrivacyBreach,
  RegulatoryNonCompliance,
  SecurityPolicyViolation,
  FraudulentActivity,
  MoneyLaundering,
  SanctionsViolation,
  DataRetentionViolation,
}

/**
 * Resolution status (audit.rs:342-348)
 */
export enum AuditResolutionStatus {
  Open,
  InProgress,
  Resolved,
  Escalated,
  Closed,
}

/**
 * Risk factor type (audit.rs:421-430)
 */
export enum AuditRiskFactorType {
  OperationalRisk,
  FinancialRisk,
  ComplianceRisk,
  SecurityRisk,
  ReputationalRisk,
  TechnicalRisk,
  LegalRisk,
  MarketRisk,
}

// ============================================================================
// Nested Structs (audit.rs)
// ============================================================================

/**
 * Risk factor (audit.rs:399-407)
 * Different from security_governance.rs RiskFactor!
 */
export type AuditRiskFactor = {
  factorType: AuditRiskFactorType
  riskLevel: number
  description: string
}

export type AuditRiskFactorArgs = {
  factorType: AuditRiskFactorType
  riskLevel: number
  description: string
}

export function getAuditRiskFactorEncoder(): Encoder<AuditRiskFactorArgs> {
  return getStructEncoder([
    ['factorType', getU8Encoder()],
    ['riskLevel', getU8Encoder()],
    ['description', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
  ])
}

export function getAuditRiskFactorDecoder(): Decoder<AuditRiskFactor> {
  return getStructDecoder([
    ['factorType', getU8Decoder()],
    ['riskLevel', getU8Decoder()],
    ['description', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
  ])
}

/**
 * Risk thresholds (audit.rs:444-462)
 */
export type RiskThresholds = {
  lowThreshold: number
  mediumThreshold: number
  highThreshold: number
  criticalThreshold: number
  autoMitigationThreshold: number
  manualReviewThreshold: number
}

export type RiskThresholdsArgs = {
  lowThreshold: number
  mediumThreshold: number
  highThreshold: number
  criticalThreshold: number
  autoMitigationThreshold: number
  manualReviewThreshold: number
}

export function getRiskThresholdsEncoder(): Encoder<RiskThresholdsArgs> {
  return getStructEncoder([
    ['lowThreshold', getU8Encoder()],
    ['mediumThreshold', getU8Encoder()],
    ['highThreshold', getU8Encoder()],
    ['criticalThreshold', getU8Encoder()],
    ['autoMitigationThreshold', getU8Encoder()],
    ['manualReviewThreshold', getU8Encoder()],
  ])
}

export function getRiskThresholdsDecoder(): Decoder<RiskThresholds> {
  return getStructDecoder([
    ['lowThreshold', getU8Decoder()],
    ['mediumThreshold', getU8Decoder()],
    ['highThreshold', getU8Decoder()],
    ['criticalThreshold', getU8Decoder()],
    ['autoMitigationThreshold', getU8Decoder()],
    ['manualReviewThreshold', getU8Decoder()],
  ])
}

/**
 * Risk assessment (audit.rs:377-395)
 * Different from security_governance.rs RiskAssessment!
 */
export type AuditRiskAssessment = {
  riskScore: number
  lastAssessment: bigint
  nextAssessment: bigint
  riskFactors: Array<AuditRiskFactor>
  mitigationStrategies: Array<string>
  riskThresholds: RiskThresholds
}

export type AuditRiskAssessmentArgs = {
  riskScore: number
  lastAssessment: number | bigint
  nextAssessment: number | bigint
  riskFactors: Array<AuditRiskFactorArgs>
  mitigationStrategies: Array<string>
  riskThresholds: RiskThresholdsArgs
}

export function getAuditRiskAssessmentEncoder(): Encoder<AuditRiskAssessmentArgs> {
  return getStructEncoder([
    ['riskScore', getU8Encoder()],
    ['lastAssessment', getI64Encoder()],
    ['nextAssessment', getI64Encoder()],
    ['riskFactors', getArrayEncoder(getAuditRiskFactorEncoder())],
    ['mitigationStrategies', getArrayEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
    ['riskThresholds', getRiskThresholdsEncoder()],
  ])
}

export function getAuditRiskAssessmentDecoder(): Decoder<AuditRiskAssessment> {
  return getStructDecoder([
    ['riskScore', getU8Decoder()],
    ['lastAssessment', getI64Decoder()],
    ['nextAssessment', getI64Decoder()],
    ['riskFactors', getArrayDecoder(getAuditRiskFactorDecoder())],
    ['mitigationStrategies', getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
    ['riskThresholds', getRiskThresholdsDecoder()],
  ])
}

/**
 * Regulatory status per jurisdiction (audit.rs:352-373)
 */
export type RegulatoryStatus = {
  jurisdiction: string
  registered: boolean
  licenses: Array<string>
  requirements: Array<string>
  lastSubmission: Option<bigint>
  nextSubmission: Option<bigint>
  regulatoryContact: Option<string>
}

export type RegulatoryStatusArgs = {
  jurisdiction: string
  registered: boolean
  licenses: Array<string>
  requirements: Array<string>
  lastSubmission: Option<number | bigint>
  nextSubmission: Option<number | bigint>
  regulatoryContact: Option<string>
}

export function getRegulatoryStatusEncoder(): Encoder<RegulatoryStatusArgs> {
  return getStructEncoder([
    ['jurisdiction', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['registered', getBoolEncoder()],
    ['licenses', getArrayEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
    ['requirements', getArrayEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
    ['lastSubmission', getOptionEncoder(getI64Encoder())],
    ['nextSubmission', getOptionEncoder(getI64Encoder())],
    ['regulatoryContact', getOptionEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
  ])
}

export function getRegulatoryStatusDecoder(): Decoder<RegulatoryStatus> {
  return getStructDecoder([
    ['jurisdiction', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['registered', getBoolDecoder()],
    ['licenses', getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
    ['requirements', getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
    ['lastSubmission', getOptionDecoder(getI64Decoder())],
    ['nextSubmission', getOptionDecoder(getI64Decoder())],
    ['regulatoryContact', getOptionDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
  ])
}

/**
 * Compliance violation record (audit.rs:287-314)
 */
export type ComplianceViolation = {
  violationId: bigint
  detectedAt: bigint
  violationType: AuditViolationType
  severity: number // ViolationSeverity enum from generated types (u8)
  description: string
  relatedEntries: Array<bigint>
  resolutionStatus: AuditResolutionStatus
  resolvedAt: Option<bigint>
  remediationActions: Array<string>
}

export type ComplianceViolationArgs = {
  violationId: number | bigint
  detectedAt: number | bigint
  violationType: AuditViolationType
  severity: number
  description: string
  relatedEntries: Array<number | bigint>
  resolutionStatus: AuditResolutionStatus
  resolvedAt: Option<number | bigint>
  remediationActions: Array<string>
}

export function getComplianceViolationEncoder(): Encoder<ComplianceViolationArgs> {
  return getStructEncoder([
    ['violationId', getU64Encoder()],
    ['detectedAt', getI64Encoder()],
    ['violationType', getU8Encoder()],
    ['severity', getU8Encoder()],
    ['description', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['relatedEntries', getArrayEncoder(getU64Encoder())],
    ['resolutionStatus', getU8Encoder()],
    ['resolvedAt', getOptionEncoder(getI64Encoder())],
    ['remediationActions', getArrayEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
  ])
}

export function getComplianceViolationDecoder(): Decoder<ComplianceViolation> {
  return getStructDecoder([
    ['violationId', getU64Decoder()],
    ['detectedAt', getI64Decoder()],
    ['violationType', getU8Decoder()],
    ['severity', getU8Decoder()],
    ['description', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['relatedEntries', getArrayDecoder(getU64Decoder())],
    ['resolutionStatus', getU8Decoder()],
    ['resolvedAt', getOptionDecoder(getI64Decoder())],
    ['remediationActions', getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
  ])
}

/**
 * NOTE: ComplianceMetrics is now auto-generated by Codama in complianceMetrics.ts
 * Removed duplicate definition to avoid export ambiguity
 */

// ============================================================================
// Main ComplianceStatus Type (audit.rs:262-283)
// ============================================================================

/**
 * Compliance status with full nested types
 *
 * Total fields: 41 across 5 nested structs
 */
export type ComplianceStatus = {
  complianceScore: number
  lastReview: bigint
  nextReview: bigint
  activeViolations: Array<ComplianceViolation>
  regulatoryStatus: Array<DecodedStringTuple> // Vec<(String, RegulatoryStatus)> - simplified to avoid mega-complexity
  riskAssessment: AuditRiskAssessment
  complianceOfficers: Array<Address>
}

export type ComplianceStatusArgs = {
  complianceScore: number
  lastReview: number | bigint
  nextReview: number | bigint
  activeViolations: Array<ComplianceViolationArgs>
  regulatoryStatus: Array<StringTupleInput> // Simplified: will decode jurisdiction+status separately
  riskAssessment: AuditRiskAssessmentArgs
  complianceOfficers: Array<Address>
}

export function getComplianceStatusEncoder(): Encoder<ComplianceStatusArgs> {
  return getStructEncoder([
    ['complianceScore', getU8Encoder()],
    ['lastReview', getI64Encoder()],
    ['nextReview', getI64Encoder()],
    ['activeViolations', getArrayEncoder(getComplianceViolationEncoder())],
    [
      'regulatoryStatus',
      getArrayEncoder(
        getStructEncoder([
          ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
          ['1', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())], // Serialize RegulatoryStatus to JSON string
        ])
      ),
    ],
    ['riskAssessment', getAuditRiskAssessmentEncoder()],
    ['complianceOfficers', getArrayEncoder(getAddressEncoder())],
  ])
}

export function getComplianceStatusDecoder(): Decoder<ComplianceStatus> {
  return getStructDecoder([
    ['complianceScore', getU8Decoder()],
    ['lastReview', getI64Decoder()],
    ['nextReview', getI64Decoder()],
    ['activeViolations', getArrayDecoder(getComplianceViolationDecoder())],
    [
      'regulatoryStatus',
      getArrayDecoder(
        getStructDecoder([
          ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
          ['1', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
        ])
      ),
    ],
    ['riskAssessment', getAuditRiskAssessmentDecoder()],
    ['complianceOfficers', getArrayDecoder(getAddressDecoder())],
  ])
}

export function getComplianceStatusCodec(): Codec<ComplianceStatusArgs, ComplianceStatus> {
  return combineCodec(getComplianceStatusEncoder(), getComplianceStatusDecoder())
}
