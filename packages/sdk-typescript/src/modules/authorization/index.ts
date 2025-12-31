/**
 * Authorization Module Exports
 *
 * ERC-8004 parity for agent pre-authorization of reputation updates.
 */

export { AuthorizationModule } from './AuthorizationModule.js'

// Re-export types from authorization types
export type {
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
  SolanaNetwork,
} from '../../types/authorization/authorization-types.js'
