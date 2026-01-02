/**
 * Central Type Exports
 *
 * Single import point for all shared types used throughout the application.
 * This prevents duplicate type definitions and makes imports cleaner.
 *
 * @example
 * // Instead of:
 * // import { Agent } from '@/lib/queries/agents'
 * // import { Credential } from '@/lib/queries/credentials'
 *
 * // Use:
 * import { Agent, Credential } from '@/lib/types'
 */

// Agent types
export type {
  Agent,
  AgentFilters,
  AgentRegistrationParams,
  AgentUpdateParams,
  AgentAccountData,
} from './agent'

// Credential types
export type { Credential, SyncCredentialParams } from '@/lib/queries/credentials'

// Governance types
export type {
  Proposal,
  ProposalStatus,
  ProposalType,
  Vote,
  VoteChoice,
  Delegation,
  VotingPower,
  CreateProposalData,
  CreateVoteData,
  CreateDelegationData,
  GovernanceFilters,
} from '@/lib/queries/governance'

// Multisig types
export type {
  Multisig,
  MultisigType,
  MultisigTypeInfo,
  TransactionType,
  TransactionStatus,
  TransactionPriority,
  PendingTransaction,
  CreateMultisigData,
  AddSignerData,
  RemoveSignerData,
  UpdateThresholdData,
  CreateTransactionData,
  ApproveTransactionData,
} from '@/lib/queries/multisig'

// Token types
export type { Token } from '@/lib/queries/tokens'

// Reputation types
export type { ReputationMetrics } from '@/lib/queries/reputation'

// Auth types
export type {
  AuthState,
  ConvexUser,
  CrossmintWalletStatus,
  CrossmintAuthStatus,
  AuthStore,
} from '@/lib/auth/types'

// Error types
export type { ErrorInfo } from '@/lib/errors/error-messages'
export type { ErrorType, ErrorMetadata, ErrorCoordinatorConfig } from '@/lib/errors/error-coordinator'

// Transaction types
export type {
  TransactionDetails,
  TransactionState,
} from '@/lib/transaction-feedback'
