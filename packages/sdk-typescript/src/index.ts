/**
 * GhostSpeak SDK - July 2025 Implementation
 * Using modern @solana/kit (Web3.js v2) patterns
 */

// Export modern client implementation
export { GhostSpeakClient } from './client/GhostSpeakClient.js'
export { AgentInstructions } from './client/instructions/AgentInstructions.js'
export { MarketplaceInstructions } from './client/instructions/MarketplaceInstructions.js'
export { EscrowInstructions } from './client/instructions/EscrowInstructions.js'
export { A2AInstructions } from './client/instructions/A2AInstructions.js'
export { AuctionInstructions } from './client/instructions/AuctionInstructions.js'
export { DisputeInstructions } from './client/instructions/DisputeInstructions.js'
export { GovernanceInstructions } from './client/instructions/GovernanceInstructions.js'
export { BulkDealsInstructions } from './client/instructions/BulkDealsInstructions.js'
export { AnalyticsInstructions } from './client/instructions/AnalyticsInstructions.js'
export { ComplianceInstructions } from './client/instructions/ComplianceInstructions.js'

// Export types and utilities
export type { GhostSpeakConfig } from './types/index.js'
export * from './utils/rpc.js'

// Export all generated types and instructions (these take precedence)
export * from './generated/index.js'

// Export program constants
export { GHOSTSPEAK_PROGRAM_ID } from './constants.js'

// Export core client only (avoid type conflicts)
export { GhostSpeakClient as SimplifiedClient } from './core/client-simple.js'
export * from './core/instructions/index.js'
export * from './core/utils.js'