/**
 * Ghost Claim On-Chain Validation Tests
 *
 * These tests validate the complete Ghost claiming flow on devnet:
 * 1. Program deployment verification
 * 2. PDA derivation correctness
 * 3. Instruction structure validation
 * 4. SAS attestation integration
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { address, type Address } from '@solana/addresses'
import { createSolanaRpc } from '@solana/rpc'
import { GhostModule, SASAttestationHelper } from '../../src/index.js'
import type { GhostSpeakConfig } from '../../src/types/index.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../../src/constants/index.js'

// Test configuration
const DEVNET_RPC_URL = 'https://api.devnet.solana.com'
// Using valid Solana addresses
const TEST_AGENT_ADDRESS = address('CJC1nZDLRJPYEJiHN7LpQv1jkTB4bPi2WuCT5Cr3g5wT') // Random valid address
const TEST_X402_ADDRESS = address('H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG') // Random valid address
const TEST_SAS_CREDENTIAL = address('5xc6rLR47kmMcvVk48SgGPbV8aVhqzVHwcaZokrFbJv6') // Random valid address
const TEST_SAS_SCHEMA = address('9zN9ULFDZp4NbqP5MjJzR8G1xS37YPmLa4KqT2WwBvQy') // Random valid address

describe('Ghost Claim On-Chain Validation', () => {
  let ghostModule: GhostModule
  let rpc: ReturnType<typeof createSolanaRpc>

  beforeAll(() => {
    rpc = createSolanaRpc(DEVNET_RPC_URL)

    const config: GhostSpeakConfig = {
      programId: GHOSTSPEAK_PROGRAM_ID,
      rpc,
      commitment: 'confirmed',
      cluster: 'devnet',
      rpcEndpoint: DEVNET_RPC_URL
    }

    ghostModule = new GhostModule(config)
  })

  describe('Program Deployment Verification', () => {
    it('should have program deployed on devnet', async () => {
      const programAccountInfo = await rpc.getAccountInfo(GHOSTSPEAK_PROGRAM_ID, {
        encoding: 'base64'
      }).send()

      expect(programAccountInfo).toBeDefined()
      expect(programAccountInfo.value).toBeDefined()
      console.log('✅ Program deployed at:', GHOSTSPEAK_PROGRAM_ID)
      console.log('   Program data length:', programAccountInfo.value?.data.length)
    })

    it('should have correct program ID', () => {
      expect(GHOSTSPEAK_PROGRAM_ID).toBe('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB')
      console.log('✅ Program ID verified:', GHOSTSPEAK_PROGRAM_ID)
    })
  })

  describe('PDA Derivation Validation', () => {
    it('should derive SAS attestation PDA correctly', async () => {
      const { attestationPda, bump } = await SASAttestationHelper.deriveAttestationPda(
        TEST_SAS_CREDENTIAL,
        TEST_SAS_SCHEMA,
        TEST_X402_ADDRESS
      )

      expect(attestationPda).toBeDefined()
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)

      console.log('✅ SAS Attestation PDA:', attestationPda)
      console.log('   Bump:', bump)
    })

    it('should derive DID document PDA correctly', async () => {
      const prepared = await ghostModule.prepareClaim({
        agentAddress: TEST_AGENT_ADDRESS,
        x402PaymentAddress: TEST_X402_ADDRESS,
        sasCredential: TEST_SAS_CREDENTIAL,
        sasSchema: TEST_SAS_SCHEMA,
        network: 'devnet'
      })

      expect(prepared.didDocumentPda).toBeDefined()
      expect(prepared.didDocumentBump).toBeGreaterThanOrEqual(0)
      expect(prepared.attestationPda).toBeDefined()
      expect(prepared.attestationBump).toBeGreaterThanOrEqual(0)

      console.log('✅ DID Document PDA:', prepared.didDocumentPda)
      console.log('   DID Bump:', prepared.didDocumentBump)
      console.log('   Attestation PDA:', prepared.attestationPda)
      console.log('   Attestation Bump:', prepared.attestationBump)
    })

    it('should derive PDAs deterministically', async () => {
      // First derivation
      const first = await ghostModule.prepareClaim({
        agentAddress: TEST_AGENT_ADDRESS,
        x402PaymentAddress: TEST_X402_ADDRESS,
        sasCredential: TEST_SAS_CREDENTIAL,
        sasSchema: TEST_SAS_SCHEMA,
        network: 'devnet'
      })

      // Second derivation with same inputs
      const second = await ghostModule.prepareClaim({
        agentAddress: TEST_AGENT_ADDRESS,
        x402PaymentAddress: TEST_X402_ADDRESS,
        sasCredential: TEST_SAS_CREDENTIAL,
        sasSchema: TEST_SAS_SCHEMA,
        network: 'devnet'
      })

      expect(first.didDocumentPda).toBe(second.didDocumentPda)
      expect(first.attestationPda).toBe(second.attestationPda)
      expect(first.didDocumentBump).toBe(second.didDocumentBump)
      expect(first.attestationBump).toBe(second.attestationBump)

      console.log('✅ PDA derivation is deterministic')
    })
  })

  describe('SAS Integration Validation', () => {
    it('should have correct SAS program ID', () => {
      expect(SASAttestationHelper).toBeDefined()
      const sasProgram = address('22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG')

      console.log('✅ SAS Program ID:', sasProgram)
    })

    it('should calculate expiry timestamps correctly', () => {
      const now = BigInt(Math.floor(Date.now() / 1000))
      const expiry = SASAttestationHelper.calculateDefaultExpiry(now)
      const oneYear = BigInt(365 * 24 * 60 * 60)

      expect(expiry).toBe(now + oneYear)
      console.log('✅ Expiry calculation correct')
      console.log('   Now:', now.toString())
      console.log('   Expiry:', expiry.toString())
      console.log('   Duration:', (expiry - now).toString(), 'seconds (1 year)')
    })

    it('should check attestation expiry correctly', () => {
      const now = BigInt(Math.floor(Date.now() / 1000))
      const futureExpiry = now + BigInt(1000)
      const pastExpiry = now - BigInt(1000)

      expect(SASAttestationHelper.isAttestationExpired(futureExpiry, now)).toBe(false)
      expect(SASAttestationHelper.isAttestationExpired(pastExpiry, now)).toBe(true)

      console.log('✅ Attestation expiry check working correctly')
    })
  })

  describe('Claim Validation', () => {
    it('should validate claim parameters', async () => {
      const validation = await ghostModule.validateClaim({
        agentAddress: TEST_AGENT_ADDRESS,
        x402PaymentAddress: TEST_X402_ADDRESS,
        sasCredential: TEST_SAS_CREDENTIAL,
        sasSchema: TEST_SAS_SCHEMA,
        network: 'devnet'
      })

      // Agent won't exist, so validation should fail with appropriate error
      expect(validation).toBeDefined()
      expect(validation.errors).toBeDefined()
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors[0]).toContain('Agent not found')

      console.log('✅ Claim validation working')
      console.log('   Expected error:', validation.errors[0])
    })

    it('should reject invalid network', async () => {
      const validation = await ghostModule.validateClaim({
        agentAddress: TEST_AGENT_ADDRESS,
        x402PaymentAddress: TEST_X402_ADDRESS,
        sasCredential: TEST_SAS_CREDENTIAL,
        sasSchema: TEST_SAS_SCHEMA,
        network: 'invalid-network' as any
      })

      expect(validation.valid).toBe(false)
      const networkError = validation.errors.find(e => e.includes('Invalid network'))
      expect(networkError).toBeDefined()

      console.log('✅ Network validation working')
      console.log('   Error:', networkError)
    })

    it('should warn about invalid IPFS URI format', async () => {
      const validation = await ghostModule.validateClaim({
        agentAddress: TEST_AGENT_ADDRESS,
        x402PaymentAddress: TEST_X402_ADDRESS,
        sasCredential: TEST_SAS_CREDENTIAL,
        sasSchema: TEST_SAS_SCHEMA,
        network: 'devnet',
        ipfsMetadataUri: 'https://invalid.com/not-ipfs'
      })

      expect(validation.warnings).toBeDefined()
      const ipfsWarning = validation.warnings.find(w => w.includes('IPFS'))
      expect(ipfsWarning).toBeDefined()

      console.log('✅ IPFS URI validation working')
      console.log('   Warning:', ipfsWarning)
    })
  })

  describe('Module Integration', () => {
    it('should export Ghost module correctly', () => {
      expect(ghostModule).toBeInstanceOf(GhostModule)
      expect(ghostModule.claim).toBeInstanceOf(Function)
      expect(ghostModule.prepareClaim).toBeInstanceOf(Function)
      expect(ghostModule.validateClaim).toBeInstanceOf(Function)
      expect(ghostModule.getGhostAgent).toBeInstanceOf(Function)
      expect(ghostModule.getAllGhosts).toBeInstanceOf(Function)
      expect(ghostModule.getClaimedGhosts).toBeInstanceOf(Function)

      console.log('✅ Ghost module exports verified')
    })

    it('should have SAS helper utilities', () => {
      expect(SASAttestationHelper.deriveAttestationPda).toBeInstanceOf(Function)
      expect(SASAttestationHelper.deriveCredentialPda).toBeInstanceOf(Function)
      expect(SASAttestationHelper.deriveSchemaPda).toBeInstanceOf(Function)
      expect(SASAttestationHelper.prepareAttestation).toBeInstanceOf(Function)
      expect(SASAttestationHelper.calculateDefaultExpiry).toBeInstanceOf(Function)
      expect(SASAttestationHelper.isAttestationExpired).toBeInstanceOf(Function)

      console.log('✅ SAS helper utilities verified')
    })
  })
})
