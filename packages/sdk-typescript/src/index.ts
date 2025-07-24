/**
 * GhostSpeak SDK - July 2025 Implementation
 * Using modern @solana/kit (Web3.js v2) patterns
 */

// Export modern client implementation
export { GhostSpeakClient } from './client/GhostSpeakClient.js'
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

// Export TransactionSigner type from Solana kit
export type { TransactionSigner } from '@solana/kit'

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

// Export all generated types and instructions (these take precedence)
export * from './generated/index.js'

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

// All necessary functionality is available through the modern client implementation above