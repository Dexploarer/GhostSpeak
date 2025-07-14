// Main exports for the GhostSpeak TypeScript SDK

// Client
export { GhostSpeakClient } from './client/GhostSpeakClient.js'

// Instruction modules
export { AgentInstructions } from './client/instructions/AgentInstructions.js'
export { MarketplaceInstructions } from './client/instructions/MarketplaceInstructions.js'
export { EscrowInstructions } from './client/instructions/EscrowInstructions.js'
export { A2AInstructions } from './client/instructions/A2AInstructions.js'

// Types
export * from './types/index.js'

// Utilities
export * from './utils/pda.js'
export * from './utils/connection.js'

// Constants
export { GHOSTSPEAK_PROGRAM_ID } from './types/index.js'