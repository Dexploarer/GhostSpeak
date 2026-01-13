/**
 * Credentials Schema
 * W3C Verifiable Credentials for various achievements and attestations
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()
const walletAddressValidator = v.string()

// Agent identity credentials
export const agentIdentityCredentials = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  crossmintCredentialId: v.optional(v.string()),
  did: v.string(),
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_credential_id', ['credentialId'])

// PayAI credentials issued
export const payaiCredentialsIssued = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  tier: v.union(v.literal('Bronze'), v.literal('Silver'), v.literal('Gold'), v.literal('Platinum')),
  milestone: v.number(),
  ghostScore: v.number(),
  solanaSignature: v.optional(v.string()),
  crossmintCredentialId: v.optional(v.string()),
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_tier', ['tier'])
  .index('by_credential_id', ['credentialId'])

// Payment milestone credentials
export const paymentMilestoneCredentials = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  crossmintCredentialId: v.optional(v.string()),
  milestone: v.union(v.literal(10), v.literal(100), v.literal(1000)),
  tier: v.union(v.literal('Bronze'), v.literal('Silver'), v.literal('Gold')),
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_milestone', ['milestone'])
  .index('by_credential_id', ['credentialId'])

// Staking credentials
export const stakingCredentials = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  crossmintCredentialId: v.optional(v.string()),
  tier: v.union(v.literal('Basic'), v.literal('Premium'), v.literal('Elite')),
  stakingTier: v.union(v.literal(1), v.literal(2), v.literal(3)),
  amountStaked: v.number(),
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_tier', ['tier'])
  .index('by_credential_id', ['credentialId'])

// Verified hire credentials
export const verifiedHireCredentials = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  crossmintCredentialId: v.optional(v.string()),
  clientAddress: walletAddressValidator,
  rating: v.number(),
  transactionSignature: v.string(),
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_client', ['clientAddress'])
  .index('by_transaction', ['transactionSignature'])
  .index('by_credential_id', ['credentialId'])

// Capability verification credentials
export const capabilityVerificationCredentials = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  crossmintCredentialId: v.optional(v.string()),
  capabilities: v.array(v.string()),
  verificationMethod: v.union(v.literal('caisper_observation'), v.literal('manual_review')),
  testsRun: v.number(),
  testsPassed: v.number(),
  successRate: v.number(),
  validFrom: timestampValidator,
  validUntil: timestampValidator,
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_credential_id', ['credentialId'])
  .index('by_valid_until', ['validUntil'])

// Uptime attestation credentials
export const uptimeAttestationCredentials = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  crossmintCredentialId: v.optional(v.string()),
  uptimePercentage: v.number(),
  tier: v.union(v.literal('bronze'), v.literal('silver'), v.literal('gold')),
  observationPeriodDays: v.number(),
  totalTests: v.number(),
  successfulResponses: v.number(),
  avgResponseTimeMs: v.number(),
  periodStart: timestampValidator,
  periodEnd: timestampValidator,
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_credential_id', ['credentialId'])
  .index('by_tier', ['tier'])

// API quality grade credentials
export const apiQualityGradeCredentials = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  crossmintCredentialId: v.optional(v.string()),
  grade: v.union(v.literal('A'), v.literal('B'), v.literal('C'), v.literal('D'), v.literal('F')),
  gradeScore: v.number(),
  responseQuality: v.number(),
  capabilityAccuracy: v.number(),
  consistency: v.number(),
  documentation: v.number(),
  endpointsTested: v.number(),
  reportDate: v.string(),
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_credential_id', ['credentialId'])
  .index('by_grade', ['grade'])
  .index('by_date', ['reportDate'])

// TEE attestation credentials
export const teeAttestationCredentials = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  crossmintCredentialId: v.optional(v.string()),
  teeType: v.union(
    v.literal('intel_tdx'),
    v.literal('intel_sgx'),
    v.literal('phala'),
    v.literal('eigencloud')
  ),
  teeProvider: v.string(),
  attestationReport: v.string(),
  enclaveId: v.optional(v.string()),
  verifiedBy: v.string(),
  verificationTxSignature: v.optional(v.string()),
  validFrom: timestampValidator,
  validUntil: timestampValidator,
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_credential_id', ['credentialId'])
  .index('by_tee_type', ['teeType'])
  .index('by_valid_until', ['validUntil'])

// Model provenance credentials
export const modelProvenanceCredentials = defineTable({
  agentAddress: walletAddressValidator,
  credentialId: v.string(),
  crossmintCredentialId: v.optional(v.string()),
  modelName: v.string(),
  modelProvider: v.string(),
  modelVersion: v.string(),
  contextWindow: v.optional(v.number()),
  temperature: v.optional(v.number()),
  maxTokens: v.optional(v.number()),
  frameworkName: v.optional(v.string()),
  frameworkVersion: v.optional(v.string()),
  selfAttested: v.boolean(),
  verificationMethod: v.optional(v.string()),
  issuedAt: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_credential_id', ['credentialId'])
  .index('by_model', ['modelName'])
  .index('by_provider', ['modelProvider'])

// Failed credential issuances
export const failedCredentialIssuances = defineTable({
  agentAddress: walletAddressValidator,
  credentialType: v.string(),
  payload: v.any(),
  error: v.string(),
  retryCount: v.number(),
  maxRetries: v.number(),
  status: v.union(
    v.literal('pending'),
    v.literal('retrying'),
    v.literal('succeeded'),
    v.literal('failed')
  ),
  lastRetryAt: v.optional(timestampValidator),
  createdAt: timestampValidator,
  updatedAt: timestampValidator,
})
  .index('by_status', ['status'])
  .index('by_agent', ['agentAddress'])
  .index('by_type', ['credentialType'])
