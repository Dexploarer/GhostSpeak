/**
 * Observation & Testing Schema
 * Caisper's endpoint monitoring, fraud detection, and quality scoring
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const timestampValidator = v.number()
const walletAddressValidator = v.string()

// Observed endpoints
export const observedEndpoints = defineTable({
  agentAddress: walletAddressValidator,
  baseUrl: v.string(),
  endpoint: v.string(),
  method: v.union(v.literal('GET'), v.literal('POST')),
  priceUsdc: v.number(),
  description: v.string(),
  category: v.string(), // Can be: 'research', 'market_data', 'social', 'utility', 'verification', 'other', etc.
  isActive: v.boolean(),
  addedAt: timestampValidator,
  lastTestedAt: v.optional(timestampValidator),
  totalTests: v.optional(v.number()),
  successfulTests: v.optional(v.number()),
  avgResponseTimeMs: v.optional(v.number()),
  avgQualityScore: v.optional(v.number()),
})
  .index('by_agent', ['agentAddress'])
  .index('by_active', ['isActive'])
  .index('by_category', ['category'])
  .index('by_price', ['priceUsdc'])
  .index('by_last_tested', ['lastTestedAt'])

// Endpoint tests
export const endpointTests = defineTable({
  endpointId: v.id('observedEndpoints'),
  agentAddress: walletAddressValidator,
  testedAt: timestampValidator,
  requestPayload: v.optional(v.string()),
  paymentSignature: v.optional(v.string()),
  paymentAmountUsdc: v.number(),
  responseStatus: v.number(),
  responseTimeMs: v.number(),
  responseBody: v.optional(v.string()),
  responseError: v.optional(v.string()),
  success: v.boolean(),
  capabilityVerified: v.boolean(),
  qualityScore: v.number(),
  issues: v.optional(v.array(v.string())),
  caisperNotes: v.string(),
  transcript: v.optional(
    v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        isToolCall: v.optional(v.boolean()),
        toolName: v.optional(v.string()),
        toolArgs: v.optional(v.string()),
        timestamp: timestampValidator,
      })
    )
  ),
  upvotes: v.optional(v.number()),
  downvotes: v.optional(v.number()),
})
  .index('by_endpoint', ['endpointId'])
  .index('by_agent', ['agentAddress'])
  .index('by_tested_at', ['testedAt'])
  .index('by_success', ['success'])
  .index('by_quality', ['qualityScore'])

// Observation votes
export const observationVotes = defineTable({
  observationId: v.id('endpointTests'),
  userId: v.id('users'),
  voteType: v.union(v.literal('upvote'), v.literal('downvote')),
  timestamp: timestampValidator,
})
  .index('by_observation', ['observationId'])
  .index('by_user', ['userId'])
  .index('by_user_observation', ['userId', 'observationId'])

// Daily observation reports
export const dailyObservationReports = defineTable({
  date: v.string(),
  agentAddress: walletAddressValidator,
  testsRun: v.number(),
  testsSucceeded: v.number(),
  avgResponseTimeMs: v.number(),
  avgQualityScore: v.number(),
  totalSpentUsdc: v.number(),
  claimedCapabilities: v.array(v.string()),
  verifiedCapabilities: v.array(v.string()),
  failedCapabilities: v.array(v.string()),
  overallGrade: v.union(
    v.literal('A'),
    v.literal('B'),
    v.literal('C'),
    v.literal('D'),
    v.literal('F')
  ),
  trustworthiness: v.number(),
  recommendation: v.string(),
  fraudSignals: v.array(v.string()),
  fraudRiskScore: v.number(),
  compiledAt: timestampValidator,
})
  .index('by_date', ['date'])
  .index('by_agent', ['agentAddress'])
  .index('by_agent_date', ['agentAddress', 'date'])
  .index('by_grade', ['overallGrade'])
  .index('by_fraud_risk', ['fraudRiskScore'])

// Fraud signals
export const fraudSignals = defineTable({
  agentAddress: walletAddressValidator,
  signalType: v.union(
    v.literal('fake_reviews'),
    v.literal('spam_activity'),
    v.literal('capability_mismatch'),
    v.literal('response_inconsistency')
  ),
  severity: v.union(
    v.literal('low'),
    v.literal('medium'),
    v.literal('high'),
    v.literal('critical')
  ),
  evidence: v.string(),
  detectedAt: timestampValidator,
  resolvedAt: v.optional(timestampValidator),
  resolution: v.optional(v.string()),
})
  .index('by_agent', ['agentAddress'])
  .index('by_type', ['signalType'])
  .index('by_severity', ['severity'])
  .index('by_unresolved', ['resolvedAt'])

// Observatory logs
export const observationLogs = defineTable({
  agentAddress: walletAddressValidator,
  testType: v.union(v.literal('capability'), v.literal('uptime'), v.literal('behavior')),
  status: v.union(v.literal('success'), v.literal('failure')),
  details: v.any(),
  timestamp: timestampValidator,
})
  .index('by_agent', ['agentAddress'])
  .index('by_timestamp', ['timestamp'])
