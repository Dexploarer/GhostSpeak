/**
 * Unified Credential Service
 * 
 * Bridges GhostSpeak's native Solana credentials with Crossmint's EVM-based VCs.
 */

import type { Address } from '@solana/addresses'
import type { CrossmintClientOptions } from './CrossmintVCClient.js'
import { CrossmintVCClient } from './CrossmintVCClient.js'
import { 
  CredentialModule, 
  CredentialKind, 
  CredentialStatus, 
  type Credential, 
  type CredentialTemplate, 
  type CredentialType,
  type W3CVerifiableCredential 
} from './CredentialModule.js'

export interface UnifiedCredentialConfig {
  programId?: Address
  crossmint?: CrossmintClientOptions
  crossmintTemplates?: {
    agentIdentity?: string
    reputation?: string
    jobCompletion?: string
  }
}

export interface IssuedCredentialResult {
  solanaCredential: {
    credentialId: string
    // signature would be here if we signed it
  }
  w3cCredential: W3CVerifiableCredential
  crossmintSync?: {
    status: 'pending' | 'synced' | 'failed'
    credentialId?: string
    chain?: string
    error?: string
  }
}

export class UnifiedCredentialService {
  private credentialModule: CredentialModule
  private crossmintClient?: CrossmintVCClient
  
  constructor(private config: UnifiedCredentialConfig) {
    this.credentialModule = new CredentialModule(config.programId)
    
    if (config.crossmint) {
      this.crossmintClient = new CrossmintVCClient(config.crossmint)
    }
  }

  /**
   * Issue an Agent Identity credential.
   * Note: logic simplified for SDK usage (mocking the on-chain part for now as per original implementation)
   */
  async issueAgentIdentityCredential(params: {
    agentId: string
    owner: string // Address
    name: string
    capabilities: string[]
    serviceEndpoint: string
    frameworkOrigin: string
    x402Enabled: boolean
    registeredAt: number
    verifiedAt: number
    recipientEmail?: string
    syncToCrossmint?: boolean
    // Pre-calculated signature for the credential data
    signature: Uint8Array
  }): Promise<IssuedCredentialResult> {
    const subjectData = CredentialModule.buildAgentIdentitySubject({
      agentId: params.agentId,
      owner: params.owner,
      name: params.name,
      capabilities: params.capabilities,
      serviceEndpoint: params.serviceEndpoint,
      frameworkOrigin: params.frameworkOrigin,
      x402Enabled: params.x402Enabled,
      registeredAt: params.registeredAt,
      verifiedAt: params.verifiedAt,
    })

    const credentialId = this.credentialModule.generateCredentialId(
      CredentialKind.AgentIdentity,
      params.owner
    )

    const subjectDataHash = this.credentialModule.hashSubjectData(subjectData as unknown as Record<string, unknown>)

    // Create Credential Object
    const credential: Credential = {
      template: '11111111111111111111111111111111' as Address, // Placeholder Address
      subject: params.owner,
      issuer: params.owner, // Self-issued for agent identity usually, or program
      credentialId,
      subjectDataHash,
      subjectDataUri: `ipfs://placeholder/${credentialId}`,
      status: CredentialStatus.Active,
      signature: params.signature, // Use provided signature
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: undefined,
      revokedAt: undefined,
      crossmintCredentialId: undefined,
    }

    // Create Type/Template structure required for W3C export
    const mockType: CredentialType = {
      authority: '11111111111111111111111111111111',
      name: 'AgentIdentity',
      kind: CredentialKind.AgentIdentity,
      schemaUri: 'https://ghostspeak.io/schemas/agent-identity.json',
      description: 'Verified AI agent identity on GhostSpeak Protocol',
      isActive: true,
      totalIssued: 1,
      createdAt: Math.floor(Date.now() / 1000),
    }

    const mockTemplate: CredentialTemplate = {
      credentialType: '11111111111111111111111111111111',
      name: 'GhostSpeak Agent Identity',
      imageUri: 'https://www.ghostspeak.io/assets/credential-agent.png',
      issuer: params.owner,
      isActive: true,
      totalIssued: 1,
      createdAt: Math.floor(Date.now() / 1000),
      crossmintTemplateId: this.config.crossmintTemplates?.agentIdentity,
    }

    const w3cCredential = this.credentialModule.exportAsW3CCredential(
      credential,
      mockTemplate,
      mockType,
      subjectData as unknown as Record<string, unknown>
    )

    const result: IssuedCredentialResult = {
      solanaCredential: {
        credentialId,
      },
      w3cCredential,
    }

    if (params.syncToCrossmint && this.crossmintClient && params.recipientEmail) {
      if (!mockTemplate.crossmintTemplateId) {
        result.crossmintSync = { status: 'failed', error: 'No template ID configured' }
      } else {
        try {
          const crossmintResult = await this.crossmintClient.issueCredential(
            mockTemplate.crossmintTemplateId,
            params.recipientEmail,
            subjectData as unknown as Record<string, unknown>
            // enrichedSubject... logic handled here or in client? 
            // In web it was in syncToCrossmint.
          )
          result.crossmintSync = {
            status: 'synced',
            credentialId: crossmintResult.credentialId,
            chain: this.config.crossmint?.chain
          }
        } catch (error) {
          result.crossmintSync = {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    }

    return result
  }
}
