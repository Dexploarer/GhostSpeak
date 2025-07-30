/**
 * GhostSpeak SDK - Production-Ready AI Agent Commerce Protocol
 * 
 * Optimized for tree-shaking and minimal bundle size.
 * Import only what you need for the best performance.
 * 
 * @packageDocumentation
 */

// =====================================================
// MAIN CLIENT EXPORT (Tree-shakeable)
// =====================================================

// Default export for convenience
export { default, sol, lamportsToSol } from './core/GhostSpeakClient.js'

// Named export for explicit imports
export { GhostSpeakClient } from './core/GhostSpeakClient.js'

// =====================================================
// CORE EXPORTS
// =====================================================

// Types
export * from './core/types.js'

// Errors
export * from './core/errors.js'

// Base classes (for advanced users)
export { BaseModule } from './core/BaseModule.js'
export { InstructionBuilder } from './core/InstructionBuilder.js'
export { RpcClient } from './core/rpc-client.js'

// =====================================================
// MODULE EXPORTS
// =====================================================

// Agent module
export { AgentModule } from './core/modules/AgentModule.js'

// Escrow module
export { EscrowModule } from './modules/escrow/EscrowModule.js'

// Channel module
export { ChannelModule } from './modules/channels/ChannelModule.js'

// =====================================================
// CRYPTO EXPORTS
// =====================================================

// Crypto exports with renamed TransferProof to avoid conflict
export {
  generateKeypair,
  encrypt,
  decrypt,
  generateTransferProof,
  generateWithdrawProof,
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type TransferProof as ElGamalTransferProof,
  type WithdrawProof,
  createVerifyRangeProofInstruction,
  createVerifyTransferProofInstruction,
  ZK_ELGAMAL_PROOF_PROGRAM_ID,
  type ProofContext,
  loadWasmModule,
  isWasmAvailable,
  type WasmModule,
  elgamal,
  zkProofs,
  wasmBridge
} from './crypto/index.js'

// Keep old exports for backward compatibility (will be deprecated)
export { GhostSpeakClient as LegacyGhostSpeakClient } from './client/GhostSpeakClient.js'
export { AgentInstructions } from './client/instructions/AgentInstructions.js'
export { MarketplaceInstructions } from './client/instructions/MarketplaceInstructions.js'
export { 
  EscrowInstructions,
  type CancelEscrowParams,
  type RefundExpiredEscrowParams,
  type ProcessPartialRefundParams,
  type CreateRealEscrowParams,
  type CompleteEscrowParams,
  type ProcessEscrowPaymentParams,
  type DisputeEscrowParams
} from './client/instructions/EscrowInstructions.js'
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
export { ReputationInstructions } from './client/instructions/ReputationInstructions.js'

// Export TransactionSigner type from Solana kit
export type { TransactionSigner } from '@solana/kit'

// =====================================================
// GENERATED TYPES EXPORTS (for CLI)
// =====================================================

// Re-export essential enums and types for CLI usage
export { AuctionStatus } from './generated/types/auctionStatus.js'
export { AuctionType } from './generated/types/auctionType.js'
export { DisputeStatus } from './generated/types/disputeStatus.js'
export { ProposalStatus } from './generated/types/proposalStatus.js'

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

export { 
  deriveA2AMessagePda, 
  deriveA2ASessionPda,
  deriveAgentPda,
  deriveServiceListingPda,
  deriveUserRegistryPda,
  deriveWorkOrderPda,
  deriveJobPostingPda,
  deriveJobApplicationPda,
  deriveWorkDeliveryPda,
  derivePaymentPda,
  deriveServicePurchasePda,
  deriveAgentVerificationPda,
  findProgramDerivedAddress
} from './utils/pda.js'

// Export enhanced error handling utilities
export {
  InstructionValidationError,
  isKnownInstruction,
  validateInstructionAccounts,
  createAccountMismatchError,
  getAccountRequirements,
  getRequiredSigners,
  getWritableAccounts,
  getPDAAccounts,
  enhanceErrorMessage,
  debugInstructionCall,
  getInstructionMapping,
  generateAccountValidationError,
  INSTRUCTION_MAPPINGS
} from './utils/instruction-error-handler.js'

// Export enhanced client error utilities
export {
  GhostSpeakSDKError,
  withEnhancedErrors,
  withEnhancedErrorsSync,
  enhanceTransactionError,
  logEnhancedError,
  createErrorContext,
  validatePreconditions,
  extractInstructionName
} from './utils/enhanced-client-errors.js'

// Export generated instruction functions and types with selective exports to avoid conflicts
export {
  // Instruction builders - these are the primary exports users need
  getRegisterAgentInstructionAsync,
  getCreateEscrowInstructionAsync,
  getCompleteEscrowInstruction,
  getCancelEscrowInstruction,
  getDisputeEscrowInstruction,
  getProcessPartialRefundInstruction,
  getCreateEnhancedChannelInstructionAsync,
  getSendEnhancedMessageInstructionAsync,
  getJoinChannelInstruction,
  getLeaveChannelInstruction,
  getUpdateChannelSettingsInstruction,
  getAddMessageReactionInstruction,
  // Account decoders
  getAgentDecoder,
  getEscrowDecoder,
  getChannelDecoder,
  getMessageDecoder,
  // Types that don't conflict
  type EscrowStatus as GeneratedEscrowStatus,
  type ChannelType as GeneratedChannelType,
  type MessageType as GeneratedMessageType,
  // Other generated utilities
  GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
} from './generated/index.js'

// Export program constants
export { GHOSTSPEAK_PROGRAM_ID } from './constants.js'

// Export system addresses
export { 
  NATIVE_MINT_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS 
} from './constants/system-addresses.js'

// Export Token 2022 utilities
export {
  deriveAssociatedTokenAddress,
  deriveSplTokenAssociatedTokenAddress,
  deriveToken2022AssociatedTokenAddress,
  getAssociatedTokenAccount,
  detectTokenProgram,
  isToken2022Mint,
  getTokenProgramType,
  getAllAssociatedTokenAddresses,
  validateAssociatedTokenAddress,
  getTokenProgramAddress,
  getTokenProgramFromAddress,
  formatTokenAmount,
  parseTokenAmount,
  TokenProgram,
  TokenExtension,
  // New Token-2022 extension detection functions
  hasTransferFeeExtension,
  hasConfidentialTransferExtension,
  hasInterestBearingExtension,
  // New Token-2022 configuration retrieval functions
  getTransferFeeConfig,
  getConfidentialTransferConfig,
  getInterestBearingConfig,
  type AssociatedTokenAccount,
  type TransferFeeConfig,
  type ConfidentialTransferConfig,
  type InterestBearingConfig
} from './utils/token-utils.js'

export {
  calculateTransferFee,
  calculateRequiredAmountForNetTransfer,
  estimateAccumulatedFees,
  generateConfidentialTransferProof,
  verifyConfidentialTransferProof,
  calculateInterest,
  calculateCompoundInterest,
  validateTransferHookInstruction,
  createTransferHookInstruction,
  serializeTokenMetadata,
  deserializeTokenMetadata,
  canTransfer,
  getRequiredExtensions,
  basisPointsToPercentage,
  percentageToBasisPoints,
  formatBasisPoints,
  estimateComputeUnits,
  TokenAccountState,
  type TransferFeeCalculation,
  type ConfidentialTransferProof,
  type InterestCalculation,
  type TransferHookInstruction,
  type TransferHookContext,
  type TokenMetadata,
  type MetadataPointerConfig,
  type CpiGuardConfig,
  type NonTransferableConfig,
  type ImmutableOwnerConfig
} from './utils/token-2022-extensions.js'

// Export governance helpers
export { deriveMultisigPda, deriveProposalPda } from './utils/governance-helpers.js'

// Export IPFS functionality for large content storage
export type {
  IPFSConfig,
  IPFSProviderConfig,
  IPFSUploadOptions,
  IPFSUploadResult,
  IPFSRetrievalOptions,
  IPFSRetrievalResult,
  IPFSPinResult,
  IPFSOperationResult,
  IPFSContentMetadata,
  FlexibleContent,
  ContentStorageResult,
  IPFSError
} from './types/ipfs-types.js'

export {
  IPFSClient
} from './utils/ipfs-client.js'

export {
  IPFSUtils,
  createIPFSUtils,
  createMetadataUri,
  determineStorageMethod,
  DEFAULT_IPFS_CONFIG
} from './utils/ipfs-utils.js'

export {
  TEST_IPFS_CONFIG,
  createTestIPFSConfig
} from './utils/test-ipfs-config.js'

export {
  IPFSOperationError,
  CircuitBreaker,
  RetryHandler,
  FallbackHandler,
  IPFSErrorHandler,
  createIPFSErrorHandler,
  isIPFSError,
  withIPFSErrorHandling,
  DEFAULT_RETRY_CONFIG
} from './utils/ipfs-error-handling.js'

export {
  IPFS_EXAMPLES,
  DEPLOYMENT_CONFIGS,
  exampleCreateAgentWithIPFS,
  exampleRetrieveAgentMetadata,
  exampleSendLargeMessage,
  exampleSendMessageWithAttachments,
  exampleResolveMessageContent,
  exampleBatchIPFSOperations,
  exampleIPFSUtilities,
  exampleCompleteIPFSIntegration
} from './utils/ipfs-examples.js'

// Export wallet funding utilities
export {
  WalletFundingService,
  fundWallet,
  ensureMinimumBalance,
  defaultFundingService,
  type FundingStrategyOptions,
  type FundingResult
} from './utils/wallet-funding.js'

// Export privacy and encryption utilities
export {
  ClientEncryptionService,
  generateLocalPrivacyProof,
  verifyLocalPrivacyProof,
  prepareForZkMigration,
  type EncryptedData,
  type PrivateMetadata,
  type ClientEncryptionOptions,
  type ZkMigrationData
} from './utils/client-encryption.js'

export {
  PrivateMetadataStorage,
  MockIPFSProvider,
  LocalStorageProvider,
  PrivateDataQuery,
  estimateStorageCost,
  createPrivacyManifest,
  type StorageProvider,
  type StoredPrivateData,
  type PrivateDataReference,
  type PrivacyManifest
} from './utils/private-metadata.js'

export {
  ConfidentialTransferManager,
  type ConfidentialAccount,
  type ConfigureAccountParams,
  type DepositParams,
  type WithdrawParams,
  type TransferParams
} from './utils/confidential-transfer-manager.js'

export {
  getFeatureFlags,
  isFeatureEnabled,
  FeatureFlagManager,
  type FeatureFlags
} from './utils/feature-flags.js'

export {
  isZkProgramEnabled,
  checkFeatureGate,
  clearFeatureGateCache,
  FEATURE_GATES,
  type FeatureStatus
} from './utils/feature-gate-detector.js'

export {
  generateRangeProofWithCommitment,
  generateTransferProofWithInstruction,
  isZkProgramAvailable,
  getZkProgramStatus,
  ProofMode,
  type ProofGenerationOptions,
  type ProofGenerationResult
} from './utils/zk-proof-builder.js'

export {
  MigrationManager,
  MigrationRollback,
  estimateMigrationCost,
  createMigrationReport as createPrivacyMigrationReport,
  type MigrationBatch,
  type MigrationItem,
  type MigrationResult as PrivacyMigrationResult
} from './utils/migration-utilities.js'

// All necessary functionality is available through the modern client implementation above