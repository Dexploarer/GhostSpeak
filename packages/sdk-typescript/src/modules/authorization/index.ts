/**
 * Authorization Module Exports
 *
 * GhostSpeak's trustless pre-authorization system for delegated reputation updates.
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
