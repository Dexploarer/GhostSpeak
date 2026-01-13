/**
 * Modular Convex Schema - Main Export
 *
 * Following 2026 best practices:
 * - Split into domain-specific modules for maintainability
 * - Strong typing with validators
 * - Clear separation of concerns
 * - Each module < 200 lines for easy navigation
 */

import { defineSchema } from 'convex/server'

// Import all schema modules
import * as users from './users'
import * as agents from './agents'
import * as credentials from './credentials'
import * as observation from './observation'
import * as api from './api'
import * as billing from './billing'
import * as staking from './staking'
import * as enterprise from './enterprise'
import * as chat from './chat'
import * as escrow from './escrow'
import * as governance from './governance'
import * as config from './config'
import * as images from './images'

/**
 * Main schema combining all domain modules
 *
 * Module breakdown:
 * - users: User accounts, sessions, favorites
 * - agents: Agent discovery, reputation, reviews
 * - credentials: W3C Verifiable Credentials
 * - observation: Endpoint monitoring, fraud detection
 * - api: API keys, usage tracking, webhooks
 * - billing: Payments, revenue, user/team billing
 * - staking: GHOST token staking
 * - enterprise: Teams, members, invites
 * - chat: Conversations, messages
 * - escrow: Ghost Protect escrow system
 * - governance: Voting system
 * - config: System configuration
 * - images: AI-generated images, gallery, voting
 */
export default defineSchema({
  // Users module (authentication & profiles)
  users: users.users,
  sessions: users.sessions,
  favorites: users.favorites,

  // Agents module (discovery & reputation)
  agentReputationCache: agents.agentReputationCache,
  ghostScoreHistory: agents.ghostScoreHistory,
  discoveredAgents: agents.discoveredAgents,
  externalIdMappings: agents.externalIdMappings,
  discoveryEvents: agents.discoveryEvents,
  ghostIndexerState: agents.ghostIndexerState,
  reviews: agents.reviews,
  reviewVotes: agents.reviewVotes,
  verifications: agents.verifications,
  historicalInteractions: agents.historicalInteractions,
  potentialDevelopers: agents.potentialDevelopers,

  // Credentials module (W3C VCs)
  agentIdentityCredentials: credentials.agentIdentityCredentials,
  payaiCredentialsIssued: credentials.payaiCredentialsIssued,
  paymentMilestoneCredentials: credentials.paymentMilestoneCredentials,
  stakingCredentials: credentials.stakingCredentials,
  verifiedHireCredentials: credentials.verifiedHireCredentials,
  capabilityVerificationCredentials: credentials.capabilityVerificationCredentials,
  uptimeAttestationCredentials: credentials.uptimeAttestationCredentials,
  apiQualityGradeCredentials: credentials.apiQualityGradeCredentials,
  teeAttestationCredentials: credentials.teeAttestationCredentials,
  modelProvenanceCredentials: credentials.modelProvenanceCredentials,
  failedCredentialIssuances: credentials.failedCredentialIssuances,

  // Observation module (monitoring & fraud detection)
  observedEndpoints: observation.observedEndpoints,
  endpointTests: observation.endpointTests,
  observationVotes: observation.observationVotes,
  dailyObservationReports: observation.dailyObservationReports,
  fraudSignals: observation.fraudSignals,
  observationLogs: observation.observationLogs,

  // API module (B2B API management)
  apiKeys: api.apiKeys,
  apiUsage: api.apiUsage,
  webhookSubscriptions: api.webhookSubscriptions,
  webhookDeliveries: api.webhookDeliveries,

  // Billing module (payments & revenue)
  payments: billing.payments,
  x402SyncState: billing.x402SyncState,
  x402SyncEvents: billing.x402SyncEvents,
  x402UsedTransactions: billing.x402UsedTransactions,
  payaiFailedRecordings: billing.payaiFailedRecordings,
  userBillingDeductions: billing.userBillingDeductions,
  userBillingDeposits: billing.userBillingDeposits,
  dailyRevenue: billing.dailyRevenue,
  revenueByEndpoint: billing.revenueByEndpoint,
  apySnapshots: billing.apySnapshots,
  userRewards: billing.userRewards,
  rewardClaims: billing.rewardClaims,

  // Staking module
  stakingAccounts: staking.stakingAccounts,
  stakingEvents: staking.stakingEvents,

  // Enterprise module (teams & billing)
  teams: enterprise.teams,
  teamMembers: enterprise.teamMembers,
  teamInvites: enterprise.teamInvites,
  billingDeductions: enterprise.billingDeductions,
  billingDeposits: enterprise.billingDeposits,

  // Chat module
  conversations: chat.conversations,
  messages: chat.messages,
  agentMessages: chat.agentMessages,

  // Escrow module
  escrows: escrow.escrows,
  escrowEvents: escrow.escrowEvents,

  // Governance module
  governanceVotes: governance.governanceVotes,

  // Configuration module
  sasConfiguration: config.sasConfiguration,
  caisperWallet: config.caisperWallet,

  // Images module (AI-generated images & gallery)
  generatedImages: images.generatedImages,
  imageVotes: images.imageVotes,
  imageViews: images.imageViews,
})
