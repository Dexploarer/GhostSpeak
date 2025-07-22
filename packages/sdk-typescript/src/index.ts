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
export { 
  DisputeInstructions,
  type DisputeSummary,
  type DisputeFilter
} from './client/instructions/DisputeInstructions.js'
export { 
  GovernanceInstructions,
  type MultisigSummary,
  type ProposalFilter,
  type ProposalSummary
} from './client/instructions/GovernanceInstructions.js'
export { BulkDealsInstructions } from './client/instructions/BulkDealsInstructions.js'
export { AnalyticsInstructions } from './client/instructions/AnalyticsInstructions.js'
export { ComplianceInstructions } from './client/instructions/ComplianceInstructions.js'

// Export KeyPairSigner from client
export type { KeyPairSigner } from './client/GhostSpeakClient.js'

// Export discriminator validation and account migration utilities
export {
  safeDecodeAgent,
  validateAccountDiscriminator,
  createDiscriminatorErrorMessage,
  inspectAccountData,
  type DiscriminatorValidationResult,
  type AccountInspectionResult
} from './utils/discriminator-validator.js'

export {
  createMigrationPlan,
  createMigrationReport,
  simulateMigration,
  getMigrationInstructions,
  extractLegacyData,
  type MigrationPlan,
  type MigrationResult,
  type LegacyAgentData
} from './utils/account-migration.js'

export {
  runAccountDiagnostics,
  runBatchDiagnostics,
  diagnoseAccountFromChain,
  diagnoseBatchFromChain,
  exportDiagnosticReport,
  type DiagnosticReport,
  type BatchDiagnosticReport
} from './utils/account-diagnostics.js'

// Export all essential types and utilities
export type { 
  GhostSpeakConfig,
  AgentWithAddress,
  ServiceListingWithAddress,
  AgentRegistrationData,
  AgentAccount,
  ServiceListingData,
  JobPosting,
  EscrowAccount,
  EscrowStatus,
  A2ASession,
  A2AMessage,
  PricingModel,
  GhostSpeakError,
  RegisterAgentParams,
  CreateServiceListingParams,
  CreateJobPostingParams,
  CreateEscrowParams,
  CreateA2ASessionParams,
  SendA2AMessageParams,
  RpcResponse,
  RpcAccountInfo,
  RpcProgramAccount,
  RpcProgramAccountsResponse,
  RpcAccountInfoResponse,
  RpcMultipleAccountsResponse,
  TransactionResponse,
  SimulatedTransactionResponse,
  SolanaRpcClient,
  EmergencyConfig,
  Commitment,
  RetryConfig,
  ExtendedRpcApi,
  RpcApi,
  RpcSubscriptionApi
} from './types/index.js'

export { deriveA2AMessagePda, deriveA2ASessionPda } from './utils/pda.js'

// Export all generated types and instructions (these take precedence)
export * from './generated/index.js'

// Export program constants
export { GHOSTSPEAK_PROGRAM_ID } from './constants.js'

// Export system addresses
export { NATIVE_MINT_ADDRESS } from './constants/system-addresses.js'

// Export governance helpers
export { deriveMultisigPda, deriveProposalPda } from './utils/governance-helpers.js'

// All necessary functionality is available through the modern client implementation above