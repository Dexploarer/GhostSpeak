/**
 * Authorization Signature Verification Tests
 *
 * Tests for GhostSpeak's agent authorization signature creation and verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import {
  createAuthorizationMessage,
  signAuthorizationMessage,
  verifyAuthorizationSignature,
  createSignedAuthorization,
  generateNonce,
  serializeAuthorization,
  deserializeAuthorization,
  getAuthorizationId,
  isAuthorizationExpired,
  isAuthorizationExhausted,
  validateAuthorizationNetwork,
  type SigningKeypair,
} from '../../../src/utils/signature-verification'
import type {
  AuthorizationMessage,
  ReputationAuthorization,
  CreateAuthorizationParams,
} from '../../../src/types/authorization/authorization-types'

/**
 * Create a test keypair compatible with SigningKeypair interface
 */
function createTestKeypair(): SigningKeypair {
  const keypair = nacl.sign.keyPair()
  const publicKeyBase58 = bs58.encode(keypair.publicKey)

  return {
    publicKey: {
      toBase58: () => publicKeyBase58,
      toBytes: () => keypair.publicKey,
    },
    secretKey: keypair.secretKey,
  }
}

describe('Authorization Signature Verification', () => {
  let agentKeypair: SigningKeypair
  let facilitatorPubkey: Address

  beforeEach(() => {
    // Clear any mocks from other tests that might pollute our test
    vi.restoreAllMocks()

    // Generate a test agent keypair
    agentKeypair = createTestKeypair()
    facilitatorPubkey = bs58.encode(nacl.sign.keyPair().publicKey) as Address
  })

  describe('createAuthorizationMessage', () => {
    it('should create deterministic message buffer', () => {
      const message: AuthorizationMessage = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const buffer1 = createAuthorizationMessage(message)
      const buffer2 = createAuthorizationMessage(message)

      expect(buffer1).toEqual(buffer2)
    })

    it('should create different buffers for different messages', () => {
      const baseMessage: AuthorizationMessage = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const buffer1 = createAuthorizationMessage(baseMessage)
      const buffer2 = createAuthorizationMessage({
        ...baseMessage,
        indexLimit: 2000, // Different index limit
      })

      expect(buffer1).not.toEqual(buffer2)
    })

    it('should include nonce in message if provided', () => {
      const messageWithoutNonce: AuthorizationMessage = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const messageWithNonce: AuthorizationMessage = {
        ...messageWithoutNonce,
        nonce: 'test-nonce-12345',
      }

      const buffer1 = createAuthorizationMessage(messageWithoutNonce)
      const buffer2 = createAuthorizationMessage(messageWithNonce)

      // Messages with nonce should be longer
      expect(buffer2.length).toBeGreaterThan(buffer1.length)
    })
  })

  describe('signAuthorizationMessage', () => {
    it('should create valid signature', async () => {
      const message: AuthorizationMessage = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const signature = await signAuthorizationMessage(message, agentKeypair)

      expect(signature).toBeDefined()
      expect(signature.length).toBe(64) // Ed25519 signature is 64 bytes
    })

    it('should throw if keypair does not match agent address', async () => {
      const wrongKeypair = createTestKeypair()
      const message: AuthorizationMessage = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address, // Different from wrongKeypair
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      await expect(signAuthorizationMessage(message, wrongKeypair)).rejects.toThrow()
    })

    it('should create different signatures for different messages', async () => {
      const message1: AuthorizationMessage = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const message2: AuthorizationMessage = {
        ...message1,
        indexLimit: 2000,
      }

      const signature1 = await signAuthorizationMessage(message1, agentKeypair)
      const signature2 = await signAuthorizationMessage(message2, agentKeypair)

      expect(signature1).not.toEqual(signature2)
    })
  })

  describe('verifyAuthorizationSignature', () => {
    it('should verify valid authorization signature', async () => {
      const params: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresIn: 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const authorization = await createSignedAuthorization(params, agentKeypair)
      const isValid = await verifyAuthorizationSignature(authorization)

      expect(isValid).toBe(true)
    })

    it('should reject authorization with modified data', async () => {
      const params: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresIn: 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const authorization = await createSignedAuthorization(params, agentKeypair)

      // Tamper with the authorization
      const tamperedAuthorization: ReputationAuthorization = {
        ...authorization,
        indexLimit: 2000, // Changed from 1000
      }

      const isValid = await verifyAuthorizationSignature(tamperedAuthorization)

      expect(isValid).toBe(false)
    })

    it('should reject authorization with wrong signature', async () => {
      const params: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresIn: 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const authorization = await createSignedAuthorization(params, agentKeypair)

      // Replace signature with random bytes
      const tamperedAuthorization: ReputationAuthorization = {
        ...authorization,
        signature: new Uint8Array(64).fill(0),
      }

      const isValid = await verifyAuthorizationSignature(tamperedAuthorization)

      expect(isValid).toBe(false)
    })
  })

  describe('createSignedAuthorization', () => {
    it('should create complete authorization with valid signature', async () => {
      const params: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresIn: 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const authorization = await createSignedAuthorization(params, agentKeypair)

      expect(authorization.agentAddress).toBe(agentKeypair.publicKey.toBase58())
      expect(authorization.authorizedSource).toBe(facilitatorPubkey)
      expect(authorization.indexLimit).toBe(1000)
      expect(authorization.network).toBe('devnet')
      expect(authorization.signature.length).toBe(64)
      expect(authorization.nonce).toBeDefined()

      // Verify signature is valid
      const isValid = await verifyAuthorizationSignature(authorization)
      expect(isValid).toBe(true)
    })

    it('should use default values when not provided', async () => {
      const params: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
      }

      const authorization = await createSignedAuthorization(params, agentKeypair)

      expect(authorization.indexLimit).toBe(1000) // Default
      expect(authorization.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
      expect(authorization.network).toBe('devnet') // Default
    })

    it('should include metadata if provided', async () => {
      const params: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
        metadata: {
          description: 'Test authorization for PayAI facilitator',
          tags: ['payai', 'test'],
          version: '1.0',
        },
      }

      const authorization = await createSignedAuthorization(params, agentKeypair)

      expect(authorization.metadata).toBeDefined()
      expect(authorization.metadata?.description).toBe('Test authorization for PayAI facilitator')
      expect(authorization.metadata?.tags).toEqual(['payai', 'test'])
    })
  })

  describe('serializeAuthorization and deserializeAuthorization', () => {
    it('should serialize and deserialize authorization', async () => {
      const params: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresIn: 30 * 24 * 60 * 60,
        network: 'devnet',
      }

      const original = await createSignedAuthorization(params, agentKeypair)
      const serialized = serializeAuthorization(original)
      const deserialized = deserializeAuthorization(serialized)

      expect(deserialized.agentAddress).toBe(original.agentAddress)
      expect(deserialized.authorizedSource).toBe(original.authorizedSource)
      expect(deserialized.indexLimit).toBe(original.indexLimit)
      expect(deserialized.expiresAt).toBe(original.expiresAt)
      expect(deserialized.network).toBe(original.network)
      expect(deserialized.signature).toEqual(original.signature)

      // Deserialized authorization should still verify
      const isValid = await verifyAuthorizationSignature(deserialized)
      expect(isValid).toBe(true)
    })
  })

  describe('getAuthorizationId', () => {
    it('should generate deterministic ID', async () => {
      const params: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
        nonce: 'fixed-nonce-for-testing',
      }

      const authorization = await createSignedAuthorization(params, agentKeypair)

      const id1 = await getAuthorizationId(authorization)
      const id2 = await getAuthorizationId(authorization)

      expect(id1).toBe(id2)
    })

    it('should generate different IDs for different authorizations', async () => {
      const params1: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
        nonce: 'nonce-1',
      }

      const params2: CreateAuthorizationParams = {
        authorizedSource: facilitatorPubkey,
        nonce: 'nonce-2',
      }

      const authorization1 = await createSignedAuthorization(params1, agentKeypair)
      const authorization2 = await createSignedAuthorization(params2, agentKeypair)

      const id1 = await getAuthorizationId(authorization1)
      const id2 = await getAuthorizationId(authorization2)

      expect(id1).not.toBe(id2)
    })
  })

  describe('isAuthorizationExpired', () => {
    it('should return false for non-expired authorization', () => {
      const authorization: ReputationAuthorization = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
        network: 'devnet',
        signature: new Uint8Array(64),
      }

      expect(isAuthorizationExpired(authorization)).toBe(false)
    })

    it('should return true for expired authorization', () => {
      const authorization: ReputationAuthorization = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
        network: 'devnet',
        signature: new Uint8Array(64),
      }

      expect(isAuthorizationExpired(authorization)).toBe(true)
    })
  })

  describe('isAuthorizationExhausted', () => {
    it('should return false when index is below limit', () => {
      const authorization: ReputationAuthorization = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
        signature: new Uint8Array(64),
      }

      expect(isAuthorizationExhausted(authorization, 500)).toBe(false)
    })

    it('should return true when index reaches limit', () => {
      const authorization: ReputationAuthorization = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
        signature: new Uint8Array(64),
      }

      expect(isAuthorizationExhausted(authorization, 1000)).toBe(true)
      expect(isAuthorizationExhausted(authorization, 1001)).toBe(true)
    })
  })

  describe('validateAuthorizationNetwork', () => {
    it('should return true for matching networks', () => {
      const authorization: ReputationAuthorization = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
        signature: new Uint8Array(64),
      }

      expect(validateAuthorizationNetwork(authorization, 'devnet')).toBe(true)
    })

    it('should return false for mismatched networks', () => {
      const authorization: ReputationAuthorization = {
        agentAddress: agentKeypair.publicKey.toBase58() as Address,
        authorizedSource: facilitatorPubkey,
        indexLimit: 1000,
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        network: 'devnet',
        signature: new Uint8Array(64),
      }

      expect(validateAuthorizationNetwork(authorization, 'mainnet-beta')).toBe(false)
    })
  })

  describe('generateNonce', () => {
    it('should generate random nonce', () => {
      const nonce1 = generateNonce()
      const nonce2 = generateNonce()

      expect(nonce1).toBeDefined()
      expect(nonce2).toBeDefined()
      expect(nonce1).not.toBe(nonce2)
      expect(nonce1.length).toBe(64) // 32 bytes as hex string
    })
  })
})
