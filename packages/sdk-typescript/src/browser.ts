/**
 * GhostSpeak SDK - Browser-safe exports
 * 
 * This entry point excludes database and server-only dependencies,
 * making it safe for use in browser/Next.js environments.
 */

// Core modules - browser safe
export { AgentModule } from './core/modules/AgentModule.js'
export { EscrowModule } from './modules/escrow/EscrowModule.js'
export { MarketplaceModule } from './modules/marketplace/MarketplaceModule.js'
export { GovernanceModule } from './modules/governance/GovernanceModule.js'
export { ChannelModule } from './modules/channels/ChannelModule.js'
export { WorkOrderModule } from './modules/workorders/WorkOrderModule.js'
export { Token2022Module } from './modules/token2022/Token2022Module.js'

// New modules - browser safe
export { StakingModule, LockupTier } from './modules/staking/index.js'
export { DisputeModule, DisputeResolution, type EvidenceSubmission } from './modules/dispute/index.js'
export {
  ReputationModule,
  ReputationTier,
  BadgeType,
  REPUTATION_CONSTANTS,
  type ReputationData,
  type JobPerformance,
  type ReputationCalculationResult,
  type CategoryReputation,
} from './modules/reputation/index.js'
export { AuctionModule, AuctionType } from './modules/auction/index.js'

// Constants - browser safe
export { GHOSTSPEAK_PROGRAM_ID, NETWORK_CONFIG } from './constants/ghostspeak.js'
export { 
  NATIVE_MINT_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS 
} from './constants/system-addresses.js'

// Types - browser safe
export type { GhostSpeakConfig } from './types/index.js'

// PDA utilities - browser safe (only export what exists in pda.js)
export {
  deriveAgentPda,
  deriveAgentPdaOriginal,
  deriveEscrowPda,
  deriveChannelPda,
  deriveMessagePda,
  deriveServiceListingPda,
  deriveJobPostingPda,
  deriveUserRegistryPda
} from './utils/pda.js'

// Generated types - browser safe (type only exports)
export type {
  Agent,
  Escrow,
  EscrowStatus,
  ServiceListing,
  JobPosting,
  JobApplication,
  GovernanceProposal,
  Channel,
  Message,
  ChannelType,
  MessageType,
  WorkOrder,
  WorkDelivery,
  WorkOrderStatus,
  Deliverable,
  // Staking types
  StakingAccount,
  StakingConfig,
  // Dispute types
  DisputeCase,
  DisputeStatus,
  DisputeEvidence,
  // Auction types
  AuctionMarketplace,
  AuctionBid,
} from './generated/index.js'


