/**
 * Credential Module Tests
 *
 * Tests for W3C Verifiable Credentials, x402 agent credentials,
 * and credential export functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CredentialModule,
  CredentialKind,
  CredentialStatus,
  DEFAULT_PROGRAM_ID,
  type Credential,
  type CredentialTemplate,
  type CredentialType,
  type W3CVerifiableCredential
} from '../../../src/modules/credentials/CredentialModule.js'
import type { Address } from '@solana/addresses'

describe('CredentialModule', () => {
  let credentialModule: CredentialModule
  const testProgramId = 'GHosT3wqDfNq9bKz8dNEQ1F5mLuN7bKdNYx3Z1111111' as Address
  const testSubjectAddress = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH' as Address

  beforeEach(() => {
    credentialModule = new CredentialModule(testProgramId)
  })

  describe('constructor', () => {
    it('should create module with default program ID', () => {
      const module = new CredentialModule()
      expect(module).toBeDefined()
    })

    it('should create module with custom program ID', () => {
      const customId = 'Custom111111111111111111111111111111111111' as Address
      const module = new CredentialModule(customId)
      expect(module).toBeDefined()
    })
  })

  describe('hashSubjectData', () => {
    it('should hash subject data deterministically', () => {
      const data = { name: 'Test Agent', score: 100 }
      const hash1 = credentialModule.hashSubjectData(data)
      const hash2 = credentialModule.hashSubjectData(data)

      expect(hash1).toEqual(hash2)
      expect(hash1).toBeInstanceOf(Uint8Array)
      expect(hash1.length).toBe(32) // SHA-256 produces 32 bytes
    })

    it('should produce different hashes for different data', () => {
      const data1 = { name: 'Agent A', score: 100 }
      const data2 = { name: 'Agent B', score: 100 }

      const hash1 = credentialModule.hashSubjectData(data1)
      const hash2 = credentialModule.hashSubjectData(data2)

      expect(hash1).not.toEqual(hash2)
    })

    it('should produce consistent hash regardless of key order', () => {
      const data1 = { name: 'Test', score: 100 }
      const data2 = { score: 100, name: 'Test' }

      const hash1 = credentialModule.hashSubjectData(data1)
      const hash2 = credentialModule.hashSubjectData(data2)

      // Keys are sorted before hashing, so order doesn't matter
      expect(hash1).toEqual(hash2)
    })
  })

  describe('generateCredentialId', () => {
    it('should generate unique credential IDs', () => {
      const id1 = credentialModule.generateCredentialId(CredentialKind.AgentIdentity, testSubjectAddress)

      // Wait a tiny bit to ensure different timestamp
      const id2 = credentialModule.generateCredentialId(CredentialKind.AgentIdentity, testSubjectAddress)

      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).toContain('agentidentity-')
    })

    it('should include credential kind in ID', () => {
      const agentId = credentialModule.generateCredentialId(CredentialKind.AgentIdentity, testSubjectAddress)
      const reputationId = credentialModule.generateCredentialId(CredentialKind.ReputationScore, testSubjectAddress)
      const jobId = credentialModule.generateCredentialId(CredentialKind.JobCompletion, testSubjectAddress)

      expect(agentId).toContain('agentidentity-')
      expect(reputationId).toContain('reputationscore-')
      expect(jobId).toContain('jobcompletion-')
    })
  })

  describe('exportAsW3CCredential', () => {
    const mockCredential: Credential = {
      template: 'template-address',
      subject: testSubjectAddress,
      issuer: testProgramId,
      credentialId: 'agentidentity-abc123',
      subjectDataHash: new Uint8Array(32).fill(1),
      subjectDataUri: 'ipfs://QmTest',
      status: CredentialStatus.Active,
      signature: new Uint8Array(64).fill(2),
      issuedAt: 1704067200, // 2024-01-01T00:00:00Z
      expiresAt: 1735689600, // 2025-01-01T00:00:00Z
    }

    const mockTemplate: CredentialTemplate = {
      credentialType: testProgramId,
      name: 'Agent Identity',
      imageUri: 'https://example.com/image.png',
      issuer: testProgramId,
      isActive: true,
      totalIssued: 1,
      createdAt: 1704067200,
    }

    const mockCredentialType: CredentialType = {
      authority: testProgramId,
      name: 'AgentIdentity',
      kind: CredentialKind.AgentIdentity,
      schemaUri: 'https://ghostspeak.io/schemas/agent-identity.json',
      description: 'Agent identity credential',
      isActive: true,
      totalIssued: 1,
      createdAt: 1704067200,
    }

    const mockSubjectData = {
      agentId: 'agent-123',
      owner: testSubjectAddress,
      name: 'Test Agent',
      capabilities: ['inference', 'search'],
    }

    it('should export credential with W3C context', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData
      )

      expect(w3c['@context']).toContain('https://www.w3.org/ns/credentials/v2')
      expect(w3c['@context']).toContain('https://w3id.org/security/data-integrity/v2')
      expect(w3c['@context']).toContain('https://ghostspeak.io/ns/credentials/v1')
    })

    it('should include correct credential type', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData
      )

      expect(w3c.type).toContain('VerifiableCredential')
      expect(w3c.type).toContain('GhostSpeakAgentIdentityCredential')
    })

    it('should generate correct issuer DID', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData,
        { network: 'devnet' }
      )

      expect(w3c.issuer).toHaveProperty('id')
      expect((w3c.issuer as { id: string }).id).toContain('did:sol:devnet:')
    })

    it('should include subject data in credentialSubject', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData
      )

      expect(w3c.credentialSubject.agentId).toBe('agent-123')
      expect(w3c.credentialSubject.name).toBe('Test Agent')
      expect(w3c.credentialSubject.capabilities).toEqual(['inference', 'search'])
    })

    it('should include validity dates', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData
      )

      expect(w3c.validFrom).toBe('2024-01-01T00:00:00.000Z')
      expect(w3c.validUntil).toBe('2025-01-01T00:00:00.000Z')
    })

    it('should include credential schema reference', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData
      )

      expect(w3c.credentialSchema).toEqual({
        id: 'https://ghostspeak.io/schemas/agent-identity.json',
        type: 'JsonSchema',
      })
    })

    it('should include credential status for revocation', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData
      )

      expect(w3c.credentialStatus).toHaveProperty('id')
      expect(w3c.credentialStatus?.type).toBe('SolanaAccountStatus2025')
      expect(w3c.credentialStatus?.statusPurpose).toBe('revocation')
    })

    it('should include DataIntegrityProof', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData
      )

      expect(w3c.proof.type).toBe('DataIntegrityProof')
      expect(w3c.proof.cryptosuite).toBe('eddsa-rdfc-2022')
      expect(w3c.proof.proofPurpose).toBe('assertionMethod')
      expect(w3c.proof.proofValue).toBeDefined()
    })

    it('should include related resource when requested', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData,
        { includeRelatedResource: true }
      )

      expect(w3c.relatedResource).toBeDefined()
      expect(w3c.relatedResource?.length).toBe(1)
      expect(w3c.relatedResource?.[0].id).toBe('ipfs://QmTest')
    })

    it('should not include related resource by default', () => {
      const w3c = credentialModule.exportAsW3CCredential(
        mockCredential,
        mockTemplate,
        mockCredentialType,
        mockSubjectData
      )

      expect(w3c.relatedResource).toBeUndefined()
    })
  })

  describe('issueX402AgentCredential', () => {
    it('should issue x402 agent credential with all required fields', () => {
      const result = credentialModule.issueX402AgentCredential({
        agentAddress: testSubjectAddress,
        agentId: 'x402-test-agent',
        owner: testSubjectAddress,
        name: 'Test x402 Agent',
        serviceEndpoint: 'https://api.example.com',
        frameworkOrigin: 'coinbase-x402',
        x402PaymentAddress: testSubjectAddress,
        x402AcceptedTokens: ['EPjFWdd5...'],
        x402PricePerCall: '1000000',
        network: 'devnet',
      })

      expect(result.credentialId).toContain('agentidentity-')
      expect(result.credential).toBeDefined()
      expect(result.w3cCredential).toBeDefined()
      expect(result.subjectData).toBeDefined()
    })

    it('should include x402-specific fields in subject data', () => {
      const result = credentialModule.issueX402AgentCredential({
        agentAddress: testSubjectAddress,
        agentId: 'x402-test-agent',
        owner: testSubjectAddress,
        name: 'Test x402 Agent',
        serviceEndpoint: 'https://api.example.com',
        frameworkOrigin: 'coinbase-x402',
        x402PaymentAddress: 'EPjFWdd5...',
        x402AcceptedTokens: ['USDC', 'GHOST'],
        x402PricePerCall: '1000000',
      })

      expect(result.subjectData.x402Enabled).toBe(true)
      expect(result.subjectData.x402PaymentAddress).toBe('EPjFWdd5...')
      expect(result.subjectData.x402AcceptedTokens).toEqual(['USDC', 'GHOST'])
      expect(result.subjectData.x402PricePerCall).toBe('1000000')
      expect(result.subjectData.frameworkOrigin).toBe('coinbase-x402')
    })

    it('should set credential status to Active', () => {
      const result = credentialModule.issueX402AgentCredential({
        agentAddress: testSubjectAddress,
        agentId: 'x402-test-agent',
        owner: testSubjectAddress,
        name: 'Test x402 Agent',
        serviceEndpoint: 'https://api.example.com',
        frameworkOrigin: 'coinbase-x402',
        x402PaymentAddress: testSubjectAddress,
        x402AcceptedTokens: [],
        x402PricePerCall: '0',
      })

      expect(result.credential.status).toBe(CredentialStatus.Active)
    })

    it('should generate W3C credential with correct type', () => {
      const result = credentialModule.issueX402AgentCredential({
        agentAddress: testSubjectAddress,
        agentId: 'x402-test-agent',
        owner: testSubjectAddress,
        name: 'Test x402 Agent',
        serviceEndpoint: 'https://api.example.com',
        frameworkOrigin: 'coinbase-x402',
        x402PaymentAddress: testSubjectAddress,
        x402AcceptedTokens: [],
        x402PricePerCall: '0',
        network: 'devnet',
      })

      expect(result.w3cCredential.type).toContain('VerifiableCredential')
      expect(result.w3cCredential.type).toContain('GhostSpeakAgentIdentityCredential')
    })

    it('should include optional capabilities', () => {
      const result = credentialModule.issueX402AgentCredential({
        agentAddress: testSubjectAddress,
        agentId: 'x402-test-agent',
        owner: testSubjectAddress,
        name: 'Test x402 Agent',
        serviceEndpoint: 'https://api.example.com',
        frameworkOrigin: 'coinbase-x402',
        x402PaymentAddress: testSubjectAddress,
        x402AcceptedTokens: [],
        x402PricePerCall: '0',
        capabilities: ['inference', 'code-generation', 'search'],
      })

      expect(result.subjectData.capabilities).toEqual(['inference', 'code-generation', 'search'])
    })
  })

  describe('exportCredentialToJSON', () => {
    const mockCredential: Credential = {
      template: 'template-address',
      subject: testSubjectAddress,
      issuer: testProgramId,
      credentialId: 'agentidentity-abc123',
      subjectDataHash: new Uint8Array(32).fill(1),
      subjectDataUri: 'ipfs://QmTest',
      status: CredentialStatus.Active,
      signature: new Uint8Array(64).fill(2),
      issuedAt: 1704067200,
    }

    it('should export credential as JSON string', () => {
      const json = credentialModule.exportCredentialToJSON(mockCredential, { name: 'Test' })

      expect(typeof json).toBe('string')
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('should export pretty-printed JSON when requested', () => {
      const json = credentialModule.exportCredentialToJSON(
        mockCredential,
        { name: 'Test' },
        { pretty: true }
      )

      expect(json).toContain('\n')
      expect(json).toContain('  ')
    })

    it('should export minified JSON by default', () => {
      const json = credentialModule.exportCredentialToJSON(mockCredential, { name: 'Test' })

      expect(json).not.toContain('\n  ')
    })

    it('should include network in export options', () => {
      const json = credentialModule.exportCredentialToJSON(
        mockCredential,
        { name: 'Test' },
        { network: 'testnet' }
      )

      const parsed = JSON.parse(json) as W3CVerifiableCredential
      expect((parsed.issuer as { id: string }).id).toContain('did:sol:testnet:')
    })
  })

  describe('buildAgentIdentitySubject', () => {
    it('should build agent identity subject data', () => {
      const subject = CredentialModule.buildAgentIdentitySubject({
        agentId: 'agent-123',
        owner: testSubjectAddress,
        name: 'Test Agent',
        capabilities: ['search', 'inference'],
        serviceEndpoint: 'https://api.example.com',
        frameworkOrigin: 'ghostspeak',
        x402Enabled: true,
        registeredAt: 1704067200,
        verifiedAt: 1704067200,
      })

      expect(subject.agentId).toBe('agent-123')
      expect(subject.owner).toBe(testSubjectAddress)
      expect(subject.name).toBe('Test Agent')
      expect(subject.capabilities).toEqual(['search', 'inference'])
      expect(subject.serviceEndpoint).toBe('https://api.example.com')
      expect(subject.frameworkOrigin).toBe('ghostspeak')
      expect(subject.x402Enabled).toBe(true)
    })
  })

  describe('CredentialKind enum', () => {
    it('should have all expected credential kinds', () => {
      expect(CredentialKind.AgentIdentity).toBe('AgentIdentity')
      expect(CredentialKind.ReputationScore).toBe('ReputationScore')
      expect(CredentialKind.JobCompletion).toBe('JobCompletion')
      expect(CredentialKind.DelegatedSigner).toBe('DelegatedSigner')
      expect(CredentialKind.Custom).toBe('Custom')
    })
  })

  describe('CredentialStatus enum', () => {
    it('should have all expected credential statuses', () => {
      expect(CredentialStatus.Pending).toBe('Pending')
      expect(CredentialStatus.Active).toBe('Active')
      expect(CredentialStatus.Revoked).toBe('Revoked')
      expect(CredentialStatus.Expired).toBe('Expired')
    })
  })

  describe('DEFAULT_PROGRAM_ID', () => {
    it('should be a valid address string', () => {
      expect(DEFAULT_PROGRAM_ID).toBeDefined()
      expect(typeof DEFAULT_PROGRAM_ID).toBe('string')
      expect(DEFAULT_PROGRAM_ID.length).toBeGreaterThan(30)
    })
  })
})
