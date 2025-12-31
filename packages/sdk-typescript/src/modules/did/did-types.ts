/**
 * GhostSpeak DID (Decentralized Identifier) Types
 *
 * Implements the did:sol method for Solana-based DIDs following W3C standards.
 * Based on Identity.com's did:sol specification v3.0.
 */

import type { Address } from '@solana/addresses'

// ============================================================================
// Constants
// ============================================================================

export const MAX_DID_STRING = 64
export const MAX_VERIFICATION_METHODS = 10
export const MAX_SERVICE_ENDPOINTS = 5
export const MAX_AUTHENTICATION_KEYS = 5
export const MAX_URI_LENGTH = 256
export const MAX_METHOD_ID = 128

export const DID_DOCUMENT_SEED = 'did_document'
export const VERIFICATION_METHOD_SEED = 'verification_method'

// ============================================================================
// Enums
// ============================================================================

/**
 * Verification method type for DIDs
 */
export enum VerificationMethodType {
  /** Ed25519 verification key (Solana native) */
  Ed25519VerificationKey2020 = 'Ed25519VerificationKey2020',
  /** X25519 key agreement for encryption */
  X25519KeyAgreementKey2020 = 'X25519KeyAgreementKey2020',
  /** Secp256k1 verification key (Ethereum compatibility) */
  EcdsaSecp256k1VerificationKey2019 = 'EcdsaSecp256k1VerificationKey2019',
}

/**
 * Verification relationship types
 */
export enum VerificationRelationship {
  /** Key can authenticate as the DID */
  Authentication = 'authentication',
  /** Key can assert claims (issue credentials) */
  AssertionMethod = 'assertionMethod',
  /** Key can perform key agreement (encryption) */
  KeyAgreement = 'keyAgreement',
  /** Key can invoke capabilities (update DID document) */
  CapabilityInvocation = 'capabilityInvocation',
  /** Key can delegate capabilities */
  CapabilityDelegation = 'capabilityDelegation',
}

/**
 * Service endpoint type
 */
export enum ServiceEndpointType {
  /** AI agent service endpoint */
  AIAgentService = 'AIAgentService',
  /** Messaging service endpoint (DIDComm) */
  DIDCommMessaging = 'DIDCommMessaging',
  /** Credential repository */
  CredentialRepository = 'CredentialRepository',
  /** Linked domains verification */
  LinkedDomains = 'LinkedDomains',
  /** Custom service type */
  Custom = 'Custom',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Verification method for DID document
 *
 * Represents a cryptographic key that can be used to verify
 * signatures or perform other cryptographic operations
 */
export interface VerificationMethod {
  /** Method identifier (e.g., "key-1") */
  id: string
  /** Type of verification method */
  methodType: VerificationMethodType
  /** DID of the controller (usually the DID itself) */
  controller: string
  /** Public key in multibase format (base58btc) */
  publicKeyMultibase: string
  /** Verification relationships this key has */
  relationships: VerificationRelationship[]
  /** Creation timestamp */
  createdAt: number
  /** Revoked flag */
  revoked: boolean
}

/**
 * Service endpoint in DID document
 */
export interface ServiceEndpoint {
  /** Service identifier (e.g., "agent-api") */
  id: string
  /** Type of service */
  serviceType: ServiceEndpointType
  /** Service endpoint URI */
  serviceEndpoint: string
  /** Optional description */
  description: string
}

/**
 * DID Document - main account for storing decentralized identifiers
 *
 * Follows W3C DID Core specification and did:sol method
 */
export interface DidDocument {
  /** The DID string (e.g., "did:sol:devnet:HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH") */
  did: string

  /** Controller of the DID (can update the document) */
  controller: Address

  /** Verification methods (public keys) */
  verificationMethods: VerificationMethod[]

  /** Service endpoints */
  serviceEndpoints: ServiceEndpoint[]

  /** Context URIs (for W3C compatibility) */
  context: string[]

  /** Also known as (alternative DIDs) */
  alsoKnownAs: string[]

  /** DID document creation timestamp */
  createdAt: number

  /** Last update timestamp */
  updatedAt: number

  /** Version number (incremented on each update) */
  version: number

  /** Deactivated flag */
  deactivated: boolean

  /** Deactivation timestamp (if deactivated) */
  deactivatedAt?: number

  /** PDA bump */
  bump: number
}

/**
 * DID Resolution Metadata
 *
 * Additional metadata for DID resolution
 */
export interface DidResolutionMetadata {
  /** DID being resolved */
  did: string

  /** Pointer to the DID document account */
  didDocument: Address

  /** Resolution timestamp */
  resolvedAt: number

  /** Content type (application/did+json) */
  contentType: string

  /** DID document version at resolution time */
  version: number

  /** PDA bump */
  bump: number
}

// ============================================================================
// W3C DID Document Format
// ============================================================================

/**
 * W3C DID Document format for export
 * Compliant with W3C DID Core specification
 */
export interface W3CDidDocument {
  '@context': string[]
  id: string
  controller?: string | string[]
  verificationMethod: Array<{
    id: string
    type: string
    controller: string
    publicKeyMultibase: string
  }>
  authentication?: Array<string | {
    id: string
    type: string
    controller: string
    publicKeyMultibase: string
  }>
  assertionMethod?: string[]
  keyAgreement?: string[]
  capabilityInvocation?: string[]
  capabilityDelegation?: string[]
  service?: Array<{
    id: string
    type: string
    serviceEndpoint: string
    description?: string
  }>
  alsoKnownAs?: string[]
}

// ============================================================================
// Operation Parameters
// ============================================================================

/**
 * Parameters for creating a DID document
 */
export interface CreateDidDocumentParams {
  /** Controller public key */
  controller: Address
  /** Initial verification methods */
  verificationMethods?: VerificationMethod[]
  /** Initial service endpoints */
  serviceEndpoints?: ServiceEndpoint[]
  /** Network (mainnet, devnet, testnet) */
  network?: 'mainnet' | 'devnet' | 'testnet'
}

/**
 * Parameters for updating a DID document
 */
export interface UpdateDidDocumentParams {
  /** DID document address */
  didDocument: Address
  /** Verification method to add */
  addVerificationMethod?: VerificationMethod
  /** Verification method ID to remove */
  removeVerificationMethodId?: string
  /** Service endpoint to add */
  addServiceEndpoint?: ServiceEndpoint
  /** Service endpoint ID to remove */
  removeServiceEndpointId?: string
}

/**
 * Parameters for deactivating a DID document
 */
export interface DeactivateDidDocumentParams {
  /** DID document address */
  didDocument: Address
}

/**
 * Parameters for resolving a DID document
 */
export interface ResolveDidDocumentParams {
  /** DID string or controller address */
  did: string | Address
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * DID-related errors
 */
export enum DidError {
  AlreadyDeactivated = 'AlreadyDeactivated',
  TooManyVerificationMethods = 'TooManyVerificationMethods',
  TooManyServiceEndpoints = 'TooManyServiceEndpoints',
  DuplicateMethodId = 'DuplicateMethodId',
  DuplicateServiceId = 'DuplicateServiceId',
  MethodNotFound = 'MethodNotFound',
  ServiceNotFound = 'ServiceNotFound',
  InvalidDidFormat = 'InvalidDidFormat',
  UnauthorizedDidOperation = 'UnauthorizedDidOperation',
  DidDeactivated = 'DidDeactivated',
}

/**
 * DID Error class
 */
export class DidErrorClass extends Error {
  code: DidError

  constructor(code: DidError, message?: string) {
    super(message || code)
    this.name = 'DidError'
    this.code = code
  }
}
