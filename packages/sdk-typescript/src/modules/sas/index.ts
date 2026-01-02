/**
 * Solana Attestation Service (SAS) Module
 *
 * Provides utilities for creating and verifying SAS attestations
 * for Ghost ownership claims.
 */

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
} from './SASAttestationHelper.js'
