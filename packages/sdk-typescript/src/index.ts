// Main exports for the GhostSpeak TypeScript SDK

// Client
export { GhostSpeakClient } from './client/GhostSpeakClient.js'

// Instruction modules
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

// Types
export * from './types/index.js'

// Utilities
export * from './utils/pda.js'
export * from './utils/connection.js'
export * from './utils/auction-helpers.js'
export * from './utils/dispute-helpers.js'
export * from './utils/governance-helpers.js'
export * from './utils/bulk-deals-helpers.js'
export * from './utils/analytics-helpers.js'
export * from './utils/compliance-helpers.js'

// Constants
export { GHOSTSPEAK_PROGRAM_ID } from './types/index.js'