/**
 * GhostSpeak DID Module
 *
 * Exports all DID-related functionality for managing
 * Decentralized Identifiers on Solana.
 */

// Main module
export { DidModule } from './DidModule.js'

// Types
export type {
  DidDocument,
  VerificationMethod,
  ServiceEndpoint,
  DidResolutionMetadata,
  W3CDidDocument,
  CreateDidDocumentParams,
  UpdateDidDocumentParams,
  DeactivateDidDocumentParams,
  ResolveDidDocumentParams
} from './did-types.js'

export {
  VerificationMethodType,
  VerificationRelationship,
  ServiceEndpointType,
  DidError,
  DidErrorClass,
  MAX_DID_STRING,
  MAX_VERIFICATION_METHODS,
  MAX_SERVICE_ENDPOINTS,
  MAX_AUTHENTICATION_KEYS,
  MAX_URI_LENGTH,
  MAX_METHOD_ID,
  DID_DOCUMENT_SEED,
  VERIFICATION_METHOD_SEED
} from './did-types.js'

// Helpers
export {
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
  getIdentifierFromDid
} from './did-helpers.js'
