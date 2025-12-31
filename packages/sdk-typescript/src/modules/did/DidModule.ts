/**
 * GhostSpeak DID Module
 *
 * Provides functionality for managing Decentralized Identifiers (DIDs)
 * following the W3C DID Core specification and did:sol method.
 */

import type { Address } from '@solana/addresses'
import type { TransactionSigner, Instruction } from '@solana/kit'
import { address } from '@solana/addresses'
import { BaseModule } from '../../core/BaseModule.js'
import type { GhostSpeakConfig } from '../../types/index.js'
import { SYSTEM_PROGRAM_ADDRESS } from '../../constants/system-addresses.js'
import {
  type DidDocument,
  type VerificationMethod,
  type ServiceEndpoint,
  type CreateDidDocumentParams,
  type UpdateDidDocumentParams,
  type DeactivateDidDocumentParams,
  type ResolveDidDocumentParams,
  type W3CDidDocument,
  DidError,
  DidErrorClass
} from './did-types.js'
import {
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
  didDocumentToJson
} from './did-helpers.js'

/**
 * DidModule - Manage decentralized identifiers on Solana
 *
 * @example
 * ```typescript
 * const client = new GhostSpeakClient({ cluster: 'devnet' })
 * const did = client.did
 *
 * // Create a DID
 * const signature = await did.create(signer, {
 *   controller: signer.address,
 *   network: 'devnet'
 * })
 *
 * // Resolve a DID
 * const didDoc = await did.resolve(signer.address)
 *
 * // Export as W3C format
 * const w3c = await did.exportW3C(signer.address)
 * ```
 */
export class DidModule extends BaseModule {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  // ============================================================================
  // DID CRUD Operations
  // ============================================================================

  /**
   * Create a new DID document
   *
   * @param signer - Transaction signer (will be the controller)
   * @param params - DID creation parameters
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * const signature = await didModule.create(signer, {
   *   controller: signer.address,
   *   network: 'devnet',
   *   verificationMethods: [{
   *     id: 'key-1',
   *     methodType: VerificationMethodType.Ed25519VerificationKey2020,
   *     controller: 'did:sol:devnet:...',
   *     publicKeyMultibase: 'z...',
   *     relationships: [VerificationRelationship.Authentication],
   *     createdAt: Date.now() / 1000,
   *     revoked: false
   *   }]
   * })
   * ```
   */
  async create(
    signer: TransactionSigner,
    params: CreateDidDocumentParams
  ): Promise<string> {
    const network = params.network || 'devnet'
    const didString = generateDidString(network, params.controller)

    // Validate DID format
    validateDidString(didString)

    // Derive DID document PDA
    const [didDocumentPda] = await deriveDidDocumentPda(
      this.programId,
      params.controller
    )

    const instructionGetter = async () => {
      // Note: This is a placeholder for the actual instruction
      // The DID instructions need to be generated from the IDL first
      // For now, we'll create a manual instruction structure
      return this.buildCreateDidInstruction(
        didDocumentPda,
        params.controller,
        didString,
        params.verificationMethods || [],
        params.serviceEndpoints || []
      )
    }

    return this.execute(
      'createDidDocument',
      instructionGetter,
      [signer] as unknown as TransactionSigner[]
    )
  }

  /**
   * Update an existing DID document
   *
   * @param signer - Transaction signer (must be the controller)
   * @param params - Update parameters
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * const signature = await didModule.update(signer, {
   *   didDocument: didPda,
   *   addVerificationMethod: {
   *     id: 'key-2',
   *     methodType: VerificationMethodType.X25519KeyAgreementKey2020,
   *     controller: 'did:sol:devnet:...',
   *     publicKeyMultibase: 'z...',
   *     relationships: [VerificationRelationship.KeyAgreement],
   *     createdAt: Date.now() / 1000,
   *     revoked: false
   *   }
   * })
   * ```
   */
  async update(
    signer: TransactionSigner,
    params: UpdateDidDocumentParams
  ): Promise<string> {
    const instructionGetter = async () => {
      return this.buildUpdateDidInstruction(
        params.didDocument,
        signer.address,
        params.addVerificationMethod || null,
        params.removeVerificationMethodId || null,
        params.addServiceEndpoint || null,
        params.removeServiceEndpointId || null
      )
    }

    return this.execute(
      'updateDidDocument',
      instructionGetter,
      [signer] as unknown as TransactionSigner[]
    )
  }

  /**
   * Deactivate a DID document (irreversible)
   *
   * @param signer - Transaction signer (must be the controller)
   * @param params - Deactivation parameters
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * const signature = await didModule.deactivate(signer, {
   *   didDocument: didPda
   * })
   * ```
   */
  async deactivate(
    signer: TransactionSigner,
    params: DeactivateDidDocumentParams
  ): Promise<string> {
    const instructionGetter = async () => {
      return this.buildDeactivateDidInstruction(
        params.didDocument,
        signer.address
      )
    }

    return this.execute(
      'deactivateDidDocument',
      instructionGetter,
      [signer] as unknown as TransactionSigner[]
    )
  }

  /**
   * Resolve a DID document
   *
   * @param didOrController - DID string or controller address
   * @returns DID document or null if not found
   *
   * @example
   * ```typescript
   * // Resolve by controller address
   * const didDoc = await didModule.resolve(controllerAddress)
   *
   * // Resolve by DID string
   * const didDoc = await didModule.resolve('did:sol:devnet:5VKz...')
   * ```
   */
  async resolve(didOrController: string | Address): Promise<DidDocument | null> {
    // Determine if we got a DID string or an address
    let controllerAddress: Address

    if (typeof didOrController === 'string' && didOrController.startsWith('did:sol:')) {
      // Parse DID to extract controller
      const { identifier } = parseDidString(didOrController)
      controllerAddress = address(identifier)
    } else {
      controllerAddress = typeof didOrController === 'string'
        ? address(didOrController)
        : didOrController
    }

    // Derive DID document PDA
    const [didDocumentPda] = await deriveDidDocumentPda(
      this.programId,
      controllerAddress
    )

    // Fetch the account data
    // Note: We would use a decoder here, but since DID isn't in generated yet,
    // we'll need to handle this manually or wait for code generation
    return this.getAccount<DidDocument>(didDocumentPda, 'getDidDocumentDecoder')
  }

  // ============================================================================
  // W3C Export
  // ============================================================================

  /**
   * Export a DID document as W3C-compliant JSON
   *
   * @param didOrController - DID string or controller address
   * @param pretty - Whether to pretty-print the JSON
   * @returns W3C DID document JSON string
   *
   * @example
   * ```typescript
   * const json = await didModule.exportW3C(controllerAddress, true)
   * console.log(json)
   * ```
   */
  async exportW3C(
    didOrController: string | Address,
    pretty = true
  ): Promise<string | null> {
    const didDoc = await this.resolve(didOrController)
    if (!didDoc) return null

    return didDocumentToJson(didDoc, pretty)
  }

  /**
   * Get W3C DID document object
   *
   * @param didOrController - DID string or controller address
   * @returns W3C DID document object or null
   */
  async getW3CDocument(
    didOrController: string | Address
  ): Promise<W3CDidDocument | null> {
    const didDoc = await this.resolve(didOrController)
    if (!didDoc) return null

    return exportAsW3CDidDocument(didDoc)
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Derive DID document PDA for a controller
   *
   * @param controller - Controller address
   * @returns DID document PDA and bump
   */
  async deriveDidPda(controller: Address): Promise<[Address, number]> {
    return deriveDidDocumentPda(this.programId, controller)
  }

  /**
   * Generate a DID string for a controller
   *
   * @param controller - Controller address
   * @param network - Network identifier
   * @returns DID string
   */
  generateDid(
    controller: Address,
    network: 'mainnet' | 'devnet' | 'testnet' = 'devnet'
  ): string {
    return generateDidString(network, controller)
  }

  /**
   * Validate a DID string
   *
   * @param did - DID string to validate
   * @returns True if valid, throws error if invalid
   */
  validateDid(did: string): boolean {
    validateDidString(did)
    return true
  }

  /**
   * Check if a DID is active
   *
   * @param didOrController - DID string or controller address
   * @returns True if active, false if deactivated or not found
   */
  async isActive(didOrController: string | Address): Promise<boolean> {
    const didDoc = await this.resolve(didOrController)
    if (!didDoc) return false
    return isDidActive(didDoc)
  }

  // ============================================================================
  // Manual Instruction Builders (until code generation)
  // ============================================================================

  /**
   * Build create DID instruction manually
   * Note: This is temporary until DID instructions are generated from IDL
   */
  private buildCreateDidInstruction(
    didDocument: Address,
    controller: Address,
    didString: string,
    verificationMethods: VerificationMethod[],
    serviceEndpoints: ServiceEndpoint[]
  ): Instruction {
    // This is a placeholder - the actual instruction would be generated
    // from the Anchor IDL once the DID instructions are added to the program
    throw new Error(
      'DID instructions are not yet generated. ' +
      'Please run: bun run generate:client after adding DID instructions to the program.'
    )
  }

  /**
   * Build update DID instruction manually
   * Note: This is temporary until DID instructions are generated from IDL
   */
  private buildUpdateDidInstruction(
    didDocument: Address,
    controller: Address,
    addVerificationMethod: VerificationMethod | null,
    removeVerificationMethodId: string | null,
    addServiceEndpoint: ServiceEndpoint | null,
    removeServiceEndpointId: string | null
  ): Instruction {
    // Placeholder - would be generated from IDL
    throw new Error(
      'DID instructions are not yet generated. ' +
      'Please run: bun run generate:client after adding DID instructions to the program.'
    )
  }

  /**
   * Build deactivate DID instruction manually
   * Note: This is temporary until DID instructions are generated from IDL
   */
  private buildDeactivateDidInstruction(
    didDocument: Address,
    controller: Address
  ): Instruction {
    // Placeholder - would be generated from IDL
    throw new Error(
      'DID instructions are not yet generated. ' +
      'Please run: bun run generate:client after adding DID instructions to the program.'
    )
  }

  // ============================================================================
  // Exported Helper Functions (re-export for convenience)
  // ============================================================================

  /**
   * Create an Ed25519 verification method
   */
  static createVerificationMethod = createEd25519VerificationMethod

  /**
   * Create a service endpoint
   */
  static createServiceEndpoint = createServiceEndpoint
}

// Export helper functions at module level
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
  didDocumentToJson
}
