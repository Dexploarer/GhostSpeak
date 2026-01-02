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

// Re-export Solana kit functions for CLI
export { createSolanaRpc, createKeyPairSignerFromBytes, generateKeyPairSigner, address } from '@solana/kit'

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

// Cache and performance utilities
export { CacheManager, type CacheConfig } from './core/CacheManager.js'
export {
  batchGetAccounts,
  batchGetExistingAccounts,
  batchGetAndMap,
  batchGetAccountsWithRetry,
  createBatchFetcher,
  type BatchProgressCallback,
  type BatchFetchConfig
} from './utils/batch-operations.js'

// =====================================================
// MODULE EXPORTS
// =====================================================

// Agent module
export { AgentModule } from './core/modules/AgentModule.js'

// Ghost module - Claim external agents
export {
  GhostModule,
  type ClaimGhostParams,
  type PreparedClaimResult,
  type Network
} from './core/modules/GhostModule.js'

// Authorization module - Trustless agent pre-authorization
export { AuthorizationModule } from './modules/authorization/index.js'

// API module - REST API wrappers
export { ExternalIdResolver, type ApiResolverConfig } from './modules/api/index.js'

// Escrow module


// Channel module - REMOVED (use A2A for agent communication)

// Marketplace module - REMOVED (use facilitator discovery mechanisms)

// Governance module
export {
  GovernanceModule,
  type CreateProposalParams,
  type ProposalType,
  type ExecutionParams
} from './modules/governance/index.js'

// Multisig module
export { MultisigModule } from './modules/multisig/index.js'



// Credential module
export {
  CredentialModule,
  CredentialKind,
  CredentialStatus,
  type W3CVerifiableCredential,
  type Credential,
  type CredentialTemplate
} from './modules/credentials/CredentialModule.js'

// DID module
export {
  DidModule,
  VerificationMethodType,
  VerificationRelationship,
  ServiceEndpointType,
  DidError,
  DidErrorClass,
  deriveDidDocumentPda,
  generateDidString,
  validateDidString,
  parseDidString,
  exportAsW3CDidDocument,
  createEd25519VerificationMethod,
  createServiceEndpoint,
  isDidActive,
  getMethodsForRelationship,
  canPerformAction,
  didDocumentToJson,
  getNetworkFromDid,
  getIdentifierFromDid,
  type DidDocument,
  type VerificationMethod,
  type ServiceEndpoint,
  type DidResolutionMetadata,
  type W3CDidDocument,
  type CreateDidDocumentParams,
  type UpdateDidDocumentParams,
  type DeactivateDidDocumentParams,
  type ResolveDidDocumentParams
} from './modules/did/index.js'

// Reputation module
export {
  ReputationModule,
  ReputationTier,
  BadgeType,
  REPUTATION_CONSTANTS,
  type ReputationData,
  type JobPerformance,
  type ReputationCalculationResult,
  type CategoryReputation,
  type PayAIReputationRecordInput,
} from './modules/reputation/ReputationModule.js'

// SAS (Solana Attestation Service) module
export {
  SASAttestationHelper,
  SAS_PROGRAM_ID,
  ATTESTATION_SEED,
  CREDENTIAL_SEED,
  SCHEMA_SEED,
  type GhostSpeakCredentialConfig,
  type GhostOwnershipAttestationData,
  type AttestationPDAResult,
  type CreateAttestationConfig
} from './modules/sas/index.js'

// Reputation Tag Engine (Pillar 2: Granular Tags)
export { ReputationTagEngine } from './utils/reputation-tag-engine.js'

// Indexer module - On-chain transaction polling for x402 payments
export {
  X402TransactionIndexer,
  type X402PaymentData,
  type SignatureInfo,
  type X402IndexerConfig,
} from './modules/indexer/index.js'

// Reputation tag types and enums
export {
  TagCategory,
  SkillTag,
  BehaviorTag,
  ComplianceTag,
  TAG_CONSTANTS,
  TagConfidenceLevel,
  DEFAULT_TAG_DECAY,
  type TagScore as TagScoreType,
  type TagCriteria,
  type TagEvaluation,
  type TagFilters,
  type TagUpdateRequest,
  type BulkTagUpdateRequest,
  type TagQueryResult,
  type TagDecayConfig,
  type ReputationMetrics as TagReputationMetrics,
} from './types/reputation-tags.js'

// Multi-Source Reputation Aggregator (Pillar 3: External Sources)
export {
  MultiSourceAggregator,
  type AggregatedReputation,
  type SourceScoreBreakdown,
} from './modules/reputation/MultiSourceAggregator.js'

// Reputation source adapters and types
export {
  ReputationSource,
  BaseReputationAdapter,
  type ReputationSourceAdapter,
  type ReputationSourceConfig,
  type SourceReputationData,
} from './modules/reputation/adapters/ReputationSourceAdapter.js'

// Privacy module
export {
  PrivacyModule,
  PrivacyMode,
  VisibilityLevel,
  ScoreRange,
  PrivacyPresets,
  PRIVACY_CONSTANTS,
  type MetricVisibility,
  type PrivacySettings,
  type PrivacyPreset,
  type VisibleReputation,
  type InitializePrivacyParams,
  type UpdatePrivacyModeParams,
  type SetMetricVisibilityParams,
  type GrantAccessParams,
  type RevokeAccessParams,
  type ApplyPresetParams,
  calculateVisibleScore,
  getReputationTier,
  getScoreRange,
  canViewerAccess,
  filterMetricsByVisibility,
  getDefaultMetricVisibility,
  validatePrivacySettings,
  getTierDisplayName,
  getRangeDisplayString,
} from './modules/privacy/index.js'

export { 
  UnifiedCredentialService, 
  type UnifiedCredentialConfig,
  type IssuedCredentialResult
} from './modules/credentials/UnifiedCredentialService.js'

export {
  CrossmintVCClient,
  type CrossmintClientOptions,
  type CredentialType as CrossmintCredentialType,
  type IssuedCredential as CrossmintIssuedCredential,
  GHOSTSPEAK_CREDENTIAL_TYPES
} from './modules/credentials/CrossmintVCClient.js'

// Work Order module removed - x402 payment protocol focus

// H2A Communication module - removed (use A2A instructions for agent communication)

// =====================================================
// PROTOCOL EXPORTS (x402, A2A, H2A)
// =====================================================

// x402 Payment Protocol - Generic facilitator support
// PaymentStreamingManager removed - use facilitator-specific integration

// A2A (Agent-to-Agent) Protocol - REMOVED (messaging deprecated)

// H2A (Human-to-Agent) Protocol - REMOVED (messaging deprecated)

// =====================================================
// CRYPTO EXPORTS
// =====================================================

// Crypto exports with renamed TransferProof to avoid conflict
// ZK proof exports removed - x402 payment protocol focus
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
  loadWasmModule,
  isWasmAvailable,
  type WasmModule,
  elgamal,
  wasmBridge
} from './crypto/index.js'


// Export TransactionSigner type from Solana kit
export type { TransactionSigner } from '@solana/kit'

// =====================================================
// GENERATED TYPES EXPORTS (for CLI)
// =====================================================

// Re-export essential enums and types for CLI usage
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
  AgentRegistrationData,
  AgentAccount,
  PricingModel,
  GhostSpeakError,
  RegisterAgentParams,
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

// Export authorization types
export type {
  SolanaNetwork,
  ReputationAuthorization,
  AuthorizationMetadata,
  AuthorizationProof,
  AuthorizationInvalidReason,
  VerificationDetails,
  AuthorizationMessage,
  CreateAuthorizationParams,
  VerifyAuthorizationParams,
  AuthorizationUsage,
  AuthorizationStatus,
  AuthorizationWithStatus,
  BatchAuthorizationVerification,
  AuthorizationRevocation,
  AuthorizationFilter,
} from './types/authorization/authorization-types.js'

export {
  deriveAgentPda,
  deriveUserRegistryPda,
  deriveAgentVerificationPda,
  findProgramDerivedAddress
} from './utils/pda.js'

// Export authorization signature utilities
export {
  createAuthorizationMessage,
  signAuthorizationMessage,
  verifyAuthorizationSignature,
  createSignedAuthorization,
  generateNonce,
  serializeAuthorization,
  deserializeAuthorization,
  getAuthorizationId,
  isAuthorizationExpired,
  isAuthorizationExhausted,
  validateAuthorizationNetwork,
} from './utils/signature-verification.js'

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

  // ===== GHOST INSTRUCTIONS (External Agent Claiming) =====
  getClaimGhostInstruction,

  // ===== STAKING INSTRUCTIONS (GHOST Token Staking) =====
  getInitializeStakingConfigInstructionAsync,
  getStakeGhostInstructionAsync,
  getUnstakeGhostInstructionAsync,
  getSlashStakeInstructionAsync,

  // ===== GHOST PROTECT ESCROW INSTRUCTIONS (B2C Escrow) =====
  getCreateEscrowInstructionAsync,
  getSubmitDeliveryInstruction,
  getApproveDeliveryInstruction,
  getFileDisputeInstruction,
  getArbitrateDisputeInstruction,

  // ===== DID INSTRUCTIONS (W3C Decentralized Identifiers) =====
  getCreateDidDocumentInstructionAsync,
  getUpdateDidDocumentInstructionAsync,
  getDeactivateDidDocumentInstructionAsync,
  getResolveDidDocumentInstructionAsync,

  // ===== REPUTATION TAG INSTRUCTIONS =====
  getUpdateReputationTagsInstructionAsync,

  // ===== STAKING TYPES =====
  type SlashReason,
  type StakingAccount,
  type StakingConfig,
  type GhostStakedEvent,
  type GhostUnstakedEvent,
  type GhostSlashedEvent,

  // ===== GHOST PROTECT TYPES =====
  type ArbitratorDecision,
  type EscrowStatus,
  type GhostProtectEscrow,
  type EscrowCreatedEvent,
  type EscrowCompletedEvent,
  type DeliverySubmittedEvent,
  type DisputeFiledEvent,
  type DisputeResolvedEvent,

  // ===== REPUTATION TAG TYPES =====
  type TagScore,
  type ReputationTagsUpdatedEvent,
  type TagDecayAppliedEvent,

  // Other generated utilities
  GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
} from './generated/index.js'

// Account decoders (exported specifically to avoid conflict with types)
export {
  getAgentDecoder,
  decodeAgent,
  fetchAgent,
  fetchMaybeAgent,
  getStakingAccountDecoder,
  getStakingConfigDecoder,
  getGhostProtectEscrowDecoder,
} from './generated/accounts/index.js'

// Export program constants
export { GHOSTSPEAK_PROGRAM_ID } from './constants/index.js'

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
  type EncryptedData,
  type PrivateMetadata,
  type ClientEncryptionOptions
} from './utils/client-encryption.js'

export {
  PrivateMetadataStorage,
  IPFSProvider,
  LocalStorageProvider,
  PrivateDataQuery,
  estimateStorageCost,
  createPrivacyManifest,
  type StorageProvider,
  type StoredPrivateData,
  type PrivateDataReference,
  type PrivacyManifest
} from './utils/private-metadata.js'

// Confidential transfer removed - x402 payment protocol focus
// export {
//   ConfidentialTransferManager,
//   type ConfidentialAccount,
//   type ConfigureAccountParams,
//   type DepositParams,
//   type WithdrawParams,
//   type TransferParams
// } from './utils/confidential-transfer-manager.js'

export {
  getFeatureFlags,
  isFeatureEnabled,
  FeatureFlagManager,
  type FeatureFlags
} from './utils/feature-flags.js'

export {
  checkFeatureGate,
  clearFeatureGateCache,
  FEATURE_GATES,
  type FeatureStatus
} from './utils/feature-gate-detector.js'

// ZK proof builder removed - x402 payment protocol focus
// export {
//   generateRangeProofWithCommitment,
//   generateTransferProofWithInstruction,
//   isZkProgramAvailable,
//   getZkProgramStatus,
//   ProofMode,
//   type ProofGenerationOptions,
//   type ProofGenerationResult
// } from './utils/zk-proof-builder.js'

// Migration utilities removed - ZK program post-mortem
// All necessary functionality is available through the modern client implementation above