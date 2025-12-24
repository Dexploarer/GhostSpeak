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

// =====================================================
// MODULE EXPORTS
// =====================================================

// Agent module
export { AgentModule } from './core/modules/AgentModule.js'

// Escrow module
export { EscrowModule } from './modules/escrow/EscrowModule.js'

// Channel module
export { ChannelModule } from './modules/channels/ChannelModule.js'

// Marketplace module
export { MarketplaceModule } from './modules/marketplace/MarketplaceModule.js'

// Governance module
export {
  GovernanceModule,
  type CreateMultisigParams,
  type CreateProposalParams,
  type VoteParams,
  type ProposalType,
  type ExecutionParams,
  type DelegationScope
} from './modules/governance/index.js'

// Multisig module
export { MultisigModule } from './modules/multisig/index.js'

// Token2022 module
export { Token2022Module } from './modules/token2022/Token2022Module.js'

// Credential module
export { 
  CredentialModule, 
  CredentialKind, 
  CredentialStatus,
  type W3CVerifiableCredential,
  type Credential,
  type CredentialTemplate
} from './modules/credentials/CredentialModule.js'

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

// Work Order module
export {
  WorkOrderModule,
  type CreateWorkOrderParams,
  type SubmitDeliveryParams,
  type VerifyDeliveryParams,
  type RejectDeliveryParams,
} from './modules/workorders/index.js'

// H2A Communication module - removed (use A2A instructions for agent communication)

// =====================================================
// PROTOCOL EXPORTS (x402, A2A, H2A)
// =====================================================

// x402 Payment Protocol
export { X402Client, createX402Client } from './x402/X402Client.js'
export { AgentDiscoveryClient, createAgentDiscoveryClient } from './x402/AgentDiscoveryClient.js'
export {
  createX402Middleware,
  x402FastifyPlugin,
  withX402RateLimit,
  type X402MiddlewareOptions,
  type X402RequestWithPayment,
  type X402CallerIdentity,
  type X402FastifyRequest
} from './x402/middleware.js'

export {
  fetchWithX402Payment,
  wrapFetchWithPayment,
  FetchWithPaymentClient,
  type FetchWithPaymentOptions,
  type X402Response
} from './x402/fetchWithPayment.js'

export { X402AnalyticsTracker, createX402AnalyticsTracker } from './x402/analytics.js'
export { PaymentStreamingManager } from './x402/PaymentStreaming.js'

// A2A (Agent-to-Agent) Protocol
export { A2AClient, createA2AClient } from './protocols/A2AClient.js'

// H2A (Human-to-Agent) Protocol
export { H2AClient, createH2AClient, ParticipantType } from './protocols/H2AClient.js'

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
  deriveChannelPda,
  deriveAgentPda,
  deriveServiceListingPda,
  deriveUserRegistryPda,
  deriveWorkOrderPda,
  deriveEscrowPDA,
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
  // Work order instructions
  getCreateWorkOrderInstruction,
  getSubmitWorkDeliveryInstruction,
  getVerifyWorkDeliveryInstruction,
  getRejectWorkDeliveryInstruction,
  getProcessPaymentInstruction,
  // Work order types
  WorkOrderStatus,
  type WorkOrderStatus as GeneratedWorkOrderStatus,
  // Types that don't conflict
  type EscrowStatus as GeneratedEscrowStatus,
  type ChannelType as GeneratedChannelType,
  type MessageType as GeneratedMessageType,
  // Other generated utilities
  GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
} from './generated/index.js'

// Account decoders (exported specifically to avoid conflict with types)
export {
  getAgentDecoder,
  getEscrowDecoder,
  getChannelDecoder,
  getMessageDecoder,
  getWorkOrderDecoder,
  getWorkDeliveryDecoder
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