import { describe, it, expect, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'

// Test the API structure and basic functionality without full crypto
describe('ElGamal API Structure', () => {
  describe('Module Exports', () => {
    it('should export all required functions and types', async () => {
      const elgamalModule = await import('../../../src/utils/elgamal.js')
      
      // Key generation functions
      expect(typeof elgamalModule.generateElGamalKeypair).toBe('function')
      expect(typeof elgamalModule.deriveElGamalKeypair).toBe('function')
      
      // Encryption/decryption functions
      expect(typeof elgamalModule.encryptAmount).toBe('function')
      expect(typeof elgamalModule.encryptAmountWithRandomness).toBe('function')
      expect(typeof elgamalModule.decryptAmount).toBe('function')
      expect(typeof elgamalModule.decryptAmountWithLookup).toBe('function')
      expect(typeof elgamalModule.buildDecryptionLookupTable).toBe('function')
      
      // Homomorphic operations
      expect(typeof elgamalModule.addCiphertexts).toBe('function')
      expect(typeof elgamalModule.subtractCiphertexts).toBe('function')
      expect(typeof elgamalModule.scaleCiphertext).toBe('function')
      
      // Zero-knowledge proofs
      expect(typeof elgamalModule.generateRangeProof).toBe('function')
      expect(typeof elgamalModule.verifyRangeProof).toBe('function')
      expect(typeof elgamalModule.generateValidityProof).toBe('function')
      expect(typeof elgamalModule.verifyValidityProof).toBe('function')
      expect(typeof elgamalModule.generateEqualityProof).toBe('function')
      expect(typeof elgamalModule.verifyEqualityProof).toBe('function')
      
      // Utility functions
      expect(typeof elgamalModule.isValidCiphertext).toBe('function')
      expect(typeof elgamalModule.reRandomizeCiphertext).toBe('function')
      expect(typeof elgamalModule.serializeCiphertext).toBe('function')
      expect(typeof elgamalModule.deserializeCiphertext).toBe('function')
      
      // Constants
      expect(typeof elgamalModule.MAX_DECRYPTABLE_VALUE).toBe('bigint')
    })
  })

  describe('Key Generation API', () => {
    it('should generate keypair with correct structure', async () => {
      const { generateElGamalKeypair } = await import('../../../src/utils/elgamal.js')
      
      const keypair = generateElGamalKeypair()
      
      expect(keypair).toHaveProperty('publicKey')
      expect(keypair).toHaveProperty('secretKey')
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toHaveLength(32)
    })

    it('should derive keypair from signer', async () => {
      const { deriveElGamalKeypair } = await import('../../../src/utils/elgamal.js')
      
      const mockSigner: TransactionSigner = {
        address: address('11111111111111111111111111111112'),
        signTransactionMessage: vi.fn()
      }
      const tokenAccount = address('So11111111111111111111111111111111111111112')
      
      const keypair = deriveElGamalKeypair(mockSigner, tokenAccount)
      
      expect(keypair).toHaveProperty('publicKey')
      expect(keypair).toHaveProperty('secretKey')
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toHaveLength(32)
    })
  })

  describe('Encryption API', () => {
    it('should create ciphertext with correct structure', async () => {
      const { generateElGamalKeypair, encryptAmount } = await import('../../../src/utils/elgamal.js')
      
      const keypair = generateElGamalKeypair()
      const amount = 100n
      
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      
      expect(ciphertext).toHaveProperty('commitment')
      expect(ciphertext).toHaveProperty('handle')
      expect(ciphertext.commitment).toHaveProperty('commitment')
      expect(ciphertext.handle).toHaveProperty('handle')
      expect(ciphertext.commitment.commitment).toBeInstanceOf(Uint8Array)
      expect(ciphertext.handle.handle).toBeInstanceOf(Uint8Array)
      expect(ciphertext.commitment.commitment).toHaveLength(32)
      expect(ciphertext.handle.handle).toHaveLength(32)
    })

    it('should return randomness with encryption result', async () => {
      const { generateElGamalKeypair, encryptAmountWithRandomness } = await import('../../../src/utils/elgamal.js')
      
      const keypair = generateElGamalKeypair()
      const amount = 50n
      
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      expect(result).toHaveProperty('ciphertext')
      expect(result).toHaveProperty('randomness')
      expect(result.randomness).toBeInstanceOf(Uint8Array)
      expect(result.randomness).toHaveLength(32)
    })

    it('should validate input ranges', async () => {
      const { generateElGamalKeypair, encryptAmount, MAX_DECRYPTABLE_VALUE } = await import('../../../src/utils/elgamal.js')
      
      const keypair = generateElGamalKeypair()
      
      // Should reject negative amounts
      expect(() => encryptAmount(-1n, keypair.publicKey))
        .toThrow('Amount must be non-negative')
      
      // Should reject amounts exceeding maximum
      expect(() => encryptAmount(MAX_DECRYPTABLE_VALUE + 1n, keypair.publicKey))
        .toThrow('Amount exceeds maximum decryptable value')
    })
  })

  describe('Proof Generation API', () => {
    it('should generate range proof with correct structure', async () => {
      const { 
        generateElGamalKeypair, 
        encryptAmountWithRandomness, 
        generateRangeProof 
      } = await import('../../../src/utils/elgamal.js')
      
      const keypair = generateElGamalKeypair()
      const amount = 1000n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      const rangeProof = generateRangeProof(
        amount,
        result.ciphertext.commitment,
        result.randomness
      )
      
      expect(rangeProof).toHaveProperty('proof')
      expect(rangeProof).toHaveProperty('commitment')
      expect(rangeProof.proof).toBeInstanceOf(Uint8Array)
      expect(rangeProof.commitment).toBeInstanceOf(Uint8Array)
    })

    it('should generate validity proof with correct structure', async () => {
      const { 
        generateElGamalKeypair, 
        encryptAmountWithRandomness, 
        generateValidityProof 
      } = await import('../../../src/utils/elgamal.js')
      
      const keypair = generateElGamalKeypair()
      const amount = 500n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      const validityProof = generateValidityProof(
        result.ciphertext,
        keypair.publicKey,
        result.randomness
      )
      
      expect(validityProof).toHaveProperty('proof')
      expect(validityProof.proof).toBeInstanceOf(Uint8Array)
    })
  })

  describe('Utility Functions API', () => {
    it('should serialize and deserialize ciphertext', async () => {
      const { 
        generateElGamalKeypair, 
        encryptAmount, 
        serializeCiphertext, 
        deserializeCiphertext 
      } = await import('../../../src/utils/elgamal.js')
      
      const keypair = generateElGamalKeypair()
      const amount = 200n
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      
      const serialized = serializeCiphertext(ciphertext)
      expect(serialized).toBeInstanceOf(Uint8Array)
      expect(serialized).toHaveLength(64)
      
      const deserialized = deserializeCiphertext(serialized)
      expect(deserialized).toHaveProperty('commitment')
      expect(deserialized).toHaveProperty('handle')
    })

    it('should validate ciphertext structure', async () => {
      const { generateElGamalKeypair, encryptAmount, isValidCiphertext } = await import('../../../src/utils/elgamal.js')
      
      const keypair = generateElGamalKeypair()
      const amount = 150n
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      
      expect(isValidCiphertext(ciphertext)).toBe(true)
      
      // Test invalid ciphertext
      const invalidCiphertext = {
        commitment: { commitment: new Uint8Array(31) }, // Wrong size
        handle: { handle: new Uint8Array(32) }
      }
      
      expect(isValidCiphertext(invalidCiphertext)).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle serialization errors', async () => {
      const { deserializeCiphertext } = await import('../../../src/utils/elgamal.js')
      
      expect(() => deserializeCiphertext(new Uint8Array(50)))
        .toThrow('Invalid ciphertext length')
    })

    it('should handle range proof validation', async () => {
      const { generateRangeProof } = await import('../../../src/utils/elgamal.js')
      
      expect(() => generateRangeProof(-1n, { commitment: new Uint8Array(32) }, new Uint8Array(32)))
        .toThrow('Amount must be in range [0, 2^32)')
    })
  })

  describe('Constants', () => {
    it('should export correct maximum decryptable value', async () => {
      const { MAX_DECRYPTABLE_VALUE } = await import('../../../src/utils/elgamal.js')
      
      expect(MAX_DECRYPTABLE_VALUE).toBe(4_294_967_295n)
    })
  })
})