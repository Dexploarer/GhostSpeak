/**
 * GhostSpeak Credential Module
 *
 * Provides functionality for creating, signing, and exporting
 * W3C-compatible Verifiable Credentials with DID integration.
 */


import { sha256 } from '@noble/hashes/sha256'
import type { Address } from '@solana/addresses'
// Using simple string encoding for base58 to match SDK patterns if needed,
// or usually @solana/addresses handles address strings.
// We need bs58 for raw data encoding
import bs58 from 'bs58'
import type { DidModule } from '../did/DidModule.js'
import { generateDidString } from '../did/did-helpers.js'

// Helper for base58 encoding
const base58Encode = (data: Uint8Array): string => bs58.encode(data)

// Constants
export const DEFAULT_PROGRAM_ID = 'GHosT3wqDfNq9bKz8dNEQ1F5mLuN7bKdNYx3Z1111111' as Address

// ============================================================================
// Types
// ============================================================================

export enum CredentialKind {
  AgentIdentity = 'AgentIdentity',
  ReputationScore = 'ReputationScore',
  JobCompletion = 'JobCompletion',
  DelegatedSigner = 'DelegatedSigner',
  Custom = 'Custom',
}

export enum CredentialStatus {
  Pending = 'Pending',
  Active = 'Active',
  Revoked = 'Revoked',
  Expired = 'Expired',
}

export interface CredentialType {
  authority: string; // Address
  name: string;
  kind: CredentialKind;
  schemaUri: string;
  description: string;
  isActive: boolean;
  totalIssued: number;
  createdAt: number;
}

export interface CredentialTemplate {
  credentialType: string; // Address
  name: string;
  imageUri: string;
  issuer: string; // Address
  isActive: boolean;
  totalIssued: number;
  createdAt: number;
  crossmintTemplateId?: string;
}

export interface Credential {
  template: string; // Address
  subject: string; // Address
  issuer: string; // Address
  credentialId: string;
  subjectDataHash: Uint8Array;
  subjectDataUri: string;
  status: CredentialStatus;
  signature: Uint8Array;
  issuedAt: number;
  expiresAt?: number;
  revokedAt?: number;
  // Metadata
  crossmintCredentialId?: string;
}

// W3C Verifiable Credential Data Model v2.0
export interface W3CVerifiableCredential {
  '@context': string[];
  type: string[];
  id: string;
  issuer: {
    id: string;
    name?: string;
  } | string;
  validFrom: string;
  validUntil?: string;
  credentialSubject: {
    id?: string;
    [key: string]: unknown;
  };
  credentialSchema?: {
    id: string;
    type: 'JsonSchema';
  };
  credentialStatus?: {
    id: string;
    type: string;
    statusPurpose: 'revocation' | 'suspension';
  };
  relatedResource?: Array<{
    id: string;
    digestMultibase?: string;
  }>;
  proof: {
    type: 'DataIntegrityProof';
    created: string;
    verificationMethod: string;
    cryptosuite: 'eddsa-rdfc-2022';
    proofPurpose: 'assertionMethod';
    proofValue: string;
  };
}

export class CredentialModule {
  private programId: Address
  private didModule?: DidModule

  constructor(programId: Address = DEFAULT_PROGRAM_ID, didModule?: DidModule) {
    this.programId = programId
    this.didModule = didModule
  }

  /**
   * Set the DID module for enhanced DID resolution
   * This enables automatic DID creation and resolution for credentials
   */
  setDidModule(didModule: DidModule): void {
    this.didModule = didModule
  }

  // --------------------------------------------------------------------------
  // Hashing
  // --------------------------------------------------------------------------

  hashSubjectData(subjectData: Record<string, unknown>): Uint8Array {
    // Sort keys for deterministic hashing
    const json = JSON.stringify(subjectData, Object.keys(subjectData).sort());
    return sha256(new TextEncoder().encode(json));
  }

  generateCredentialId(kind: CredentialKind, subject: string): string {
    const timestamp = Date.now();
    const input = `${kind}-${subject}-${timestamp}`;
    const hash = sha256(new TextEncoder().encode(input));
    const shortHash = base58Encode(hash.slice(0, 8));
    return `${kind.toLowerCase()}-${shortHash}`;
  }

  // --------------------------------------------------------------------------
  // Export W3C
  // --------------------------------------------------------------------------

  exportAsW3CCredential(
    credential: Credential,
    template: CredentialTemplate,
    credentialType: CredentialType,
    subjectData: Record<string, unknown>,
    options?: {
      network?: 'mainnet' | 'devnet' | 'testnet'
      includeRelatedResource?: boolean
    }
  ): W3CVerifiableCredential {
    const network = options?.network || 'mainnet'

    // Use DID helper to generate proper DID strings
    const issuerDid = generateDidString(network, this.programId)
    const subjectDid = generateDidString(network, credential.subject as Address)

    // Simplification for ID generation to avoid complex PDA math in this module for now
    // In strict implementation, this status ID should calculate the exact PDA
    const statusId = `solana:${this.programId}:credential:${credential.credentialId}`;

    return {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://w3id.org/security/data-integrity/v2',
        'https://ghostspeak.io/ns/credentials/v1',
      ],
      type: ['VerifiableCredential', `GhostSpeak${credentialType.kind}Credential`],
      id: `urn:ghostspeak:${credential.credentialId}`,
      issuer: {
        id: issuerDid,
        name: 'GhostSpeak Protocol',
      },
      validFrom: new Date(credential.issuedAt * 1000).toISOString(),
      validUntil: credential.expiresAt
        ? new Date(credential.expiresAt * 1000).toISOString()
        : undefined,
      credentialSubject: {
        id: subjectDid,
        ...subjectData,
      },
      credentialSchema: {
        id: credentialType.schemaUri,
        type: 'JsonSchema',
      },
      credentialStatus: {
        id: statusId,
        type: 'SolanaAccountStatus2025',
        statusPurpose: 'revocation',
      },
      relatedResource: options?.includeRelatedResource
        ? [
            {
              id: credential.subjectDataUri,
              digestMultibase: `mEi${base58Encode(credential.subjectDataHash)}`,
            },
          ]
        : undefined,
      proof: {
        type: 'DataIntegrityProof',
        created: new Date(credential.issuedAt * 1000).toISOString(),
        verificationMethod: `${issuerDid}#key-1`,
        cryptosuite: 'eddsa-rdfc-2022',
        proofPurpose: 'assertionMethod',
        proofValue: base58Encode(credential.signature),
      },
    }
  }

  /**
   * Export credential with DID resolution
   * Resolves DIDs for issuer and subject to get full DID documents
   *
   * @param credential - Credential to export
   * @param template - Credential template
   * @param credentialType - Credential type
   * @param subjectData - Subject data
   * @param options - Export options
   * @returns W3C credential with resolved DIDs
   */
  async exportWithDidResolution(
    credential: Credential,
    template: CredentialTemplate,
    credentialType: CredentialType,
    subjectData: Record<string, unknown>,
    options?: {
      network?: 'mainnet' | 'devnet' | 'testnet'
      includeRelatedResource?: boolean
    }
  ): Promise<W3CVerifiableCredential> {
    if (!this.didModule) {
      // Fall back to basic export if DID module not available
      return this.exportAsW3CCredential(
        credential,
        template,
        credentialType,
        subjectData,
        options
      )
    }

    const network = options?.network || 'mainnet'

    // Resolve issuer DID
    const issuerDid = generateDidString(network, this.programId)

    // Resolve subject DID
    const subjectDid = generateDidString(network, credential.subject as Address)

    // Try to resolve DID documents (optional - for enhanced verification)
    const issuerDidDoc = await this.didModule.resolve(this.programId).catch(() => null)
    const subjectDidDoc = await this.didModule.resolve(credential.subject as Address).catch(() => null)

    const statusId = `solana:${this.programId}:credential:${credential.credentialId}`;

    // Use the first verification method for proof if available
    const verificationMethod = issuerDidDoc?.verificationMethods?.[0]
      ? `${issuerDid}#${issuerDidDoc.verificationMethods[0].id}`
      : `${issuerDid}#key-1`

    return {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://w3id.org/security/data-integrity/v2',
        'https://ghostspeak.io/ns/credentials/v1',
      ],
      type: ['VerifiableCredential', `GhostSpeak${credentialType.kind}Credential`],
      id: `urn:ghostspeak:${credential.credentialId}`,
      issuer: {
        id: issuerDid,
        name: 'GhostSpeak Protocol',
      },
      validFrom: new Date(credential.issuedAt * 1000).toISOString(),
      validUntil: credential.expiresAt
        ? new Date(credential.expiresAt * 1000).toISOString()
        : undefined,
      credentialSubject: {
        id: subjectDid,
        ...subjectData,
      },
      credentialSchema: {
        id: credentialType.schemaUri,
        type: 'JsonSchema',
      },
      credentialStatus: {
        id: statusId,
        type: 'SolanaAccountStatus2025',
        statusPurpose: 'revocation',
      },
      relatedResource: options?.includeRelatedResource
        ? [
            {
              id: credential.subjectDataUri,
              digestMultibase: `mEi${base58Encode(credential.subjectDataHash)}`,
            },
          ]
        : undefined,
      proof: {
        type: 'DataIntegrityProof',
        created: new Date(credential.issuedAt * 1000).toISOString(),
        verificationMethod,
        cryptosuite: 'eddsa-rdfc-2022',
        proofPurpose: 'assertionMethod',
        proofValue: base58Encode(credential.signature),
      },
    }
  }

  // --------------------------------------------------------------------------
  // Helpers for Subject Building
  // --------------------------------------------------------------------------

  static buildAgentIdentitySubject(params: {
    agentId: string;
    owner: string;
    name: string;
    capabilities: string[];
    serviceEndpoint: string;
    frameworkOrigin: string;
    x402Enabled: boolean;
    registeredAt: number;
    verifiedAt: number;
  }) {
    return params;
  }

  // --------------------------------------------------------------------------
  // x402 Agent Credential Issuance
  // --------------------------------------------------------------------------

  /**
   * Issue an AgentIdentity credential for a newly registered x402 agent
   * 
   * This creates a W3C Verifiable Credential that can be:
   * - Stored on-chain for reputation
   * - Exported as standard W3C VC JSON
   * - Verified by third parties
   * 
   * @example
   * ```typescript
   * const result = await credentialModule.issueX402AgentCredential({
   *   agentAddress: 'EPjFWdd5...',
   *   agentId: 'x402-abc123',
   *   owner: 'HN7cAB...',
   *   name: 'My Coinbase Agent',
   *   serviceEndpoint: 'https://my-agent.com/api',
   *   frameworkOrigin: 'coinbase-x402',
   *   x402PaymentAddress: 'EPjFWdd5...',
   *   x402AcceptedTokens: ['EPjFWdd5...'],
   *   x402PricePerCall: '1000000'
   * })
   * ```
   */
  issueX402AgentCredential(params: {
    agentAddress: string;
    agentId: string;
    owner: string;
    name: string;
    serviceEndpoint: string;
    frameworkOrigin: string;
    x402PaymentAddress: string;
    x402AcceptedTokens: string[];
    x402PricePerCall: string;
    capabilities?: string[];
    description?: string;
    verificationResponseTimeMs?: number;
    network?: 'mainnet' | 'devnet' | 'testnet';
  }): {
    credentialId: string;
    credential: Credential;
    w3cCredential: W3CVerifiableCredential;
    subjectData: Record<string, unknown>;
  } {
    const now = Math.floor(Date.now() / 1000);
    
    // Build subject data with x402-specific fields
    const subjectData = {
      agentId: params.agentId,
      owner: params.owner,
      name: params.name,
      capabilities: params.capabilities || [],
      serviceEndpoint: params.serviceEndpoint,
      frameworkOrigin: params.frameworkOrigin,
      x402Enabled: true,
      x402PaymentAddress: params.x402PaymentAddress,
      x402AcceptedTokens: params.x402AcceptedTokens,
      x402PricePerCall: params.x402PricePerCall,
      registeredAt: now,
      verifiedAt: now,
      type: 'external-x402-agent',
      verificationResponseTimeMs: params.verificationResponseTimeMs,
    };

    // Generate credential ID
    const credentialId = this.generateCredentialId(
      CredentialKind.AgentIdentity, 
      params.agentAddress
    );

    // Hash subject data
    const subjectDataHash = this.hashSubjectData(subjectData);
    
    // Create credential (in-memory, could be stored on-chain later)
    const credential: Credential = {
      template: `x402-agent-identity-template`,
      subject: params.agentAddress,
      issuer: this.programId,
      credentialId,
      subjectDataHash,
      subjectDataUri: `data:application/json;base64,${Buffer.from(JSON.stringify(subjectData)).toString('base64')}`,
      status: CredentialStatus.Active,
      signature: subjectDataHash, // Self-signed with hash (for demo; real impl would sign with authority key)
      issuedAt: now,
    };

    // Create credential type (template info)
    const credentialType: CredentialType = {
      authority: this.programId,
      name: 'x402 Agent Identity',
      kind: CredentialKind.AgentIdentity,
      schemaUri: 'https://ghostspeak.io/schemas/x402-agent-identity-v1.json',
      description: 'Verifiable credential for x402-compatible AI agents registered with GhostSpeak',
      isActive: true,
      totalIssued: 1,
      createdAt: now,
    };

    // Create template
    const template: CredentialTemplate = {
      credentialType: credentialType.authority,
      name: 'x402 Agent Identity',
      imageUri: 'https://ghostspeak.io/assets/credential-badge-x402.png',
      issuer: this.programId,
      isActive: true,
      totalIssued: 1,
      createdAt: now,
    };

    // Export as W3C credential
    const w3cCredential = this.exportAsW3CCredential(
      credential,
      template,
      credentialType,
      subjectData,
      { network: params.network || 'devnet', includeRelatedResource: true }
    );

    return {
      credentialId,
      credential,
      w3cCredential,
      subjectData,
    };
  }

  /**
   * Export an existing credential to W3C JSON format
   */
  exportCredentialToJSON(
    credential: Credential,
    subjectData: Record<string, unknown>,
    options?: {
      network?: 'mainnet' | 'devnet' | 'testnet';
      pretty?: boolean;
    }
  ): string {
    const template: CredentialTemplate = {
      credentialType: 'x402-agent',
      name: credential.credentialId.includes('agentidentity') ? 'Agent Identity' : 'Custom',
      imageUri: 'https://ghostspeak.io/assets/credential-badge.png',
      issuer: credential.issuer,
      isActive: true,
      totalIssued: 1,
      createdAt: credential.issuedAt,
    };

    const credentialType: CredentialType = {
      authority: credential.issuer,
      name: 'GhostSpeak Credential',
      kind: CredentialKind.AgentIdentity,
      schemaUri: 'https://ghostspeak.io/schemas/credential-v1.json',
      description: 'GhostSpeak verifiable credential',
      isActive: true,
      totalIssued: 1,
      createdAt: credential.issuedAt,
    };

    const w3c = this.exportAsW3CCredential(
      credential,
      template,
      credentialType,
      subjectData,
      { network: options?.network || 'devnet', includeRelatedResource: true }
    );

    return options?.pretty 
      ? JSON.stringify(w3c, null, 2) 
      : JSON.stringify(w3c);
  }
}
