/**
 * GhostSpeak DID Helpers
 *
 * Utility functions for DID operations, validation, and W3C export
 */

import type { Address } from '@solana/addresses'
import {
  getProgramDerivedAddress,
  getAddressEncoder,
  getBytesEncoder
} from '@solana/kit'
import bs58 from 'bs58'
import {
  type DidDocument,
  type VerificationMethod,
  type ServiceEndpoint,
  type W3CDidDocument,
  VerificationMethodType,
  VerificationRelationship,
  DID_DOCUMENT_SEED,
  DidError,
  DidErrorClass
} from './did-types.js'

// ============================================================================
// PDA Derivation
// ============================================================================

/**
 * Derive DID document PDA
 * Pattern: ['did_document', controller]
 */
export async function deriveDidDocumentPda(
  programId: Address,
  controller: Address
): Promise<[Address, number]> {
  const [address, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode(DID_DOCUMENT_SEED),
      getAddressEncoder().encode(controller)
    ]
  })
  return [address, bump]
}

// ============================================================================
// DID String Generation and Validation
// ============================================================================

/**
 * Generate a did:sol string from network and public key
 *
 * @param network - Solana network (mainnet, devnet, testnet, localnet)
 * @param pubkey - Public key to use as the DID identifier
 * @returns DID string in the format "did:sol:network:pubkey"
 *
 * @example
 * ```typescript
 * const did = generateDidString('devnet', '5VKz...')
 * // Returns: "did:sol:devnet:5VKz..."
 * ```
 */
export function generateDidString(
  network: 'mainnet' | 'devnet' | 'testnet' | 'localnet',
  pubkey: Address | string
): string {
  // Normalize network name for mainnet
  const normalizedNetwork = network === 'mainnet' ? 'mainnet-beta' : network
  return `did:sol:${normalizedNetwork}:${pubkey.toString()}`
}

/**
 * Validate DID string format
 *
 * @param did - DID string to validate
 * @throws {DidErrorClass} If DID format is invalid
 *
 * @example
 * ```typescript
 * validateDidString('did:sol:devnet:5VKz...')
 * // Returns: void (no error)
 *
 * validateDidString('invalid:did')
 * // Throws: DidErrorClass
 * ```
 */
export function validateDidString(did: string): void {
  // Must start with did:sol:
  if (!did.startsWith('did:sol:')) {
    throw new DidErrorClass(
      DidError.InvalidDidFormat,
      'DID must start with "did:sol:"'
    )
  }

  // Split into parts
  const parts = did.split(':')

  // Must have 4 parts: did, sol, network, identifier
  if (parts.length !== 4) {
    throw new DidErrorClass(
      DidError.InvalidDidFormat,
      'DID must have format "did:sol:network:identifier"'
    )
  }

  // Validate network (mainnet-beta, devnet, testnet, or localnet)
  const validNetworks = ['mainnet-beta', 'devnet', 'testnet', 'localnet']
  if (!validNetworks.includes(parts[2])) {
    throw new DidErrorClass(
      DidError.InvalidDidFormat,
      `Invalid network "${parts[2]}". Must be one of: ${validNetworks.join(', ')}`
    )
  }

  // Validate identifier is a valid base58 string (Solana pubkey)
  try {
    bs58.decode(parts[3])
  } catch {
    throw new DidErrorClass(
      DidError.InvalidDidFormat,
      'DID identifier must be a valid base58-encoded Solana public key'
    )
  }
}

/**
 * Parse a DID string into its components
 *
 * @param did - DID string to parse
 * @returns Object with method, network, and identifier
 *
 * @example
 * ```typescript
 * const parts = parseDidString('did:sol:devnet:5VKz...')
 * // Returns: { method: 'sol', network: 'devnet', identifier: '5VKz...' }
 * ```
 */
export function parseDidString(did: string): {
  method: string
  network: string
  identifier: string
} {
  validateDidString(did)
  const parts = did.split(':')

  return {
    method: parts[1],
    network: parts[2],
    identifier: parts[3]
  }
}

// ============================================================================
// W3C DID Document Export
// ============================================================================

/**
 * Export a DID document as W3C-compliant format
 *
 * @param didDocument - DID document to export
 * @returns W3C-compliant DID document
 *
 * @example
 * ```typescript
 * const w3cDoc = exportAsW3CDidDocument(didDocument)
 * console.log(JSON.stringify(w3cDoc, null, 2))
 * ```
 */
export function exportAsW3CDidDocument(
  didDocument: DidDocument
): W3CDidDocument {
  // Build verification method section
  const verificationMethod = didDocument.verificationMethods
    .filter(m => !m.revoked)
    .map(method => ({
      id: `${didDocument.did}#${method.id}`,
      type: method.methodType,
      controller: method.controller,
      publicKeyMultibase: method.publicKeyMultibase
    }))

  // Build authentication array (methods with Authentication relationship)
  const authentication = didDocument.verificationMethods
    .filter(m => !m.revoked && m.relationships.includes(VerificationRelationship.Authentication))
    .map(m => `${didDocument.did}#${m.id}`)

  // Build assertionMethod array
  const assertionMethod = didDocument.verificationMethods
    .filter(m => !m.revoked && m.relationships.includes(VerificationRelationship.AssertionMethod))
    .map(m => `${didDocument.did}#${m.id}`)

  // Build keyAgreement array
  const keyAgreement = didDocument.verificationMethods
    .filter(m => !m.revoked && m.relationships.includes(VerificationRelationship.KeyAgreement))
    .map(m => `${didDocument.did}#${m.id}`)

  // Build capabilityInvocation array
  const capabilityInvocation = didDocument.verificationMethods
    .filter(m => !m.revoked && m.relationships.includes(VerificationRelationship.CapabilityInvocation))
    .map(m => `${didDocument.did}#${m.id}`)

  // Build capabilityDelegation array
  const capabilityDelegation = didDocument.verificationMethods
    .filter(m => !m.revoked && m.relationships.includes(VerificationRelationship.CapabilityDelegation))
    .map(m => `${didDocument.did}#${m.id}`)

  // Build service endpoints
  const service = didDocument.serviceEndpoints.map(endpoint => ({
    id: `${didDocument.did}#${endpoint.id}`,
    type: endpoint.serviceType,
    serviceEndpoint: endpoint.serviceEndpoint,
    description: endpoint.description || undefined
  }))

  return {
    '@context': didDocument.context,
    id: didDocument.did,
    controller: didDocument.controller.toString(),
    verificationMethod,
    authentication: authentication.length > 0 ? authentication : undefined,
    assertionMethod: assertionMethod.length > 0 ? assertionMethod : undefined,
    keyAgreement: keyAgreement.length > 0 ? keyAgreement : undefined,
    capabilityInvocation: capabilityInvocation.length > 0 ? capabilityInvocation : undefined,
    capabilityDelegation: capabilityDelegation.length > 0 ? capabilityDelegation : undefined,
    service: service.length > 0 ? service : undefined,
    alsoKnownAs: didDocument.alsoKnownAs.length > 0 ? didDocument.alsoKnownAs : undefined
  }
}

// ============================================================================
// Verification Method Helpers
// ============================================================================

/**
 * Create a default Ed25519 verification method
 *
 * @param id - Method identifier (e.g., "key-1")
 * @param controller - Controller DID
 * @param publicKey - Public key (Address or base58 string)
 * @param relationships - Verification relationships
 * @returns Verification method object
 */
export function createEd25519VerificationMethod(
  id: string,
  controller: string,
  publicKey: Address | string,
  relationships: VerificationRelationship[] = [VerificationRelationship.Authentication]
): VerificationMethod {
  // Convert public key to multibase format (base58btc with 'z' prefix)
  // Address in @solana/kit v2 is just a string type, no .toString() needed
  const publicKeyMultibase = `z${publicKey}`

  return {
    id,
    methodType: VerificationMethodType.Ed25519VerificationKey2020,
    controller,
    publicKeyMultibase,
    relationships,
    createdAt: Math.floor(Date.now() / 1000),
    revoked: false
  }
}

/**
 * Create a service endpoint
 *
 * @param id - Service identifier (e.g., "agent-api")
 * @param serviceType - Type of service
 * @param serviceEndpoint - Service endpoint URI
 * @param description - Optional description
 * @returns Service endpoint object
 */
export function createServiceEndpoint(
  id: string,
  serviceType: string,
  serviceEndpoint: string,
  description = ''
): ServiceEndpoint {
  return {
    id,
    serviceType: serviceType as any,
    serviceEndpoint,
    description
  }
}

// ============================================================================
// DID Resolution Helpers
// ============================================================================

/**
 * Check if a DID document is active and can be used
 *
 * @param didDocument - DID document to check
 * @returns True if active, false if deactivated
 */
export function isDidActive(didDocument: DidDocument): boolean {
  return !didDocument.deactivated
}

/**
 * Get verification methods for a specific relationship
 *
 * @param didDocument - DID document
 * @param relationship - Verification relationship to filter by
 * @returns Array of verification methods with the specified relationship
 */
export function getMethodsForRelationship(
  didDocument: DidDocument,
  relationship: VerificationRelationship
): VerificationMethod[] {
  return didDocument.verificationMethods.filter(
    m => !m.revoked && m.relationships.includes(relationship)
  )
}

/**
 * Check if a public key can perform a specific action
 *
 * @param didDocument - DID document
 * @param publicKey - Public key to check
 * @param relationship - Required verification relationship
 * @returns True if the public key has the required relationship
 */
export function canPerformAction(
  didDocument: DidDocument,
  publicKey: Address,
  relationship: VerificationRelationship
): boolean {
  // Controller can always perform actions
  if (publicKey.toString() === didDocument.controller.toString()) {
    return true
  }

  // Check if public key is in verification methods with correct relationship
  const pubkeyMultibase = `z${publicKey.toString()}`

  return didDocument.verificationMethods.some(
    method =>
      !method.revoked &&
      method.publicKeyMultibase === pubkeyMultibase &&
      method.relationships.includes(relationship)
  )
}

// ============================================================================
// Conversion Helpers
// ============================================================================

/**
 * Convert a DID document to JSON string
 *
 * @param didDocument - DID document to convert
 * @param pretty - Whether to pretty-print the JSON
 * @returns JSON string representation
 */
export function didDocumentToJson(
  didDocument: DidDocument,
  pretty = true
): string {
  const w3cDoc = exportAsW3CDidDocument(didDocument)
  return pretty
    ? JSON.stringify(w3cDoc, null, 2)
    : JSON.stringify(w3cDoc)
}

/**
 * Extract network from DID string
 *
 * @param did - DID string
 * @returns Network identifier
 */
export function getNetworkFromDid(did: string): string {
  const parts = parseDidString(did)
  return parts.network
}

/**
 * Extract identifier (public key) from DID string
 *
 * @param did - DID string
 * @returns Public key identifier
 */
export function getIdentifierFromDid(did: string): string {
  const parts = parseDidString(did)
  return parts.identifier
}
