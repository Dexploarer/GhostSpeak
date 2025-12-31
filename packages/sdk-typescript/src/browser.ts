/**
 * GhostSpeak SDK - Browser-safe exports
 * 
 * This entry point excludes database and server-only dependencies,
 * making it safe for use in browser/Next.js environments.
 */

// Core modules - browser safe
export { AgentModule } from './core/modules/AgentModule.js'

export { GovernanceModule } from './modules/governance/GovernanceModule.js'
export { MultisigModule } from './modules/multisig/MultisigModule.js'
export { StakingModule } from './modules/staking/StakingModule.js'

export { CredentialModule as CredentialsModule } from './modules/credentials/CredentialModule.js'
export { PayAIClient } from './payai/PayAIClient.js'

// Reputation module - browser safe (core module)
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

// PDA utilities - browser safe
export {
  deriveAgentPda,
  deriveUserRegistryPda
} from './utils/pda.js'

// Generated types - browser safe (type only exports)
export type {
  Agent,

  GovernanceProposal,
} from './generated/index.js'
