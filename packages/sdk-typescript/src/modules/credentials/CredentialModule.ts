/**
 * GhostSpeak Credential Module
 *
 * Provides functionality for creating, signing, and exporting
 * W3C-compatible Verifiable Credentials.
 */


import { sha256 } from '@noble/hashes/sha256'
import type { Address } from '@solana/addresses'
// Using simple string encoding for base58 to match SDK patterns if needed, 
// or usually @solana/addresses handles address strings.
// We need bs58 for raw data encoding
import bs58 from 'bs58'

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

  constructor(programId: Address = DEFAULT_PROGRAM_ID) {
    this.programId = programId
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
    const didPrefix = network === 'mainnet' ? 'did:sol:' : `did:sol:${network}:`

    // Note: PDA derivation is omitted here for simplicity as we don't have the heavy Buffer logic
    // We assume credential.verificationStatus is handled by the consumer verifying on-chain data
    // Or we add a simplified implementation if needed.
    
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
        id: `${didPrefix}${this.programId}`,
        name: 'GhostSpeak Protocol',
      },
      validFrom: new Date(credential.issuedAt * 1000).toISOString(),
      validUntil: credential.expiresAt
        ? new Date(credential.expiresAt * 1000).toISOString()
        : undefined,
      credentialSubject: {
        id: `${didPrefix}${credential.subject}`,
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
        verificationMethod: `${didPrefix}${this.programId}#key-1`,
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
}
