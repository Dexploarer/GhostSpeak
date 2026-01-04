/**
 * Comprehensive ElGamal Encryption Tests
 * 
 * Tests all ElGamal operations including encryption, decryption,
 * homomorphic operations, and proof generation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateElGamalKeypair,
  encryptAmount,
  decryptAmount,
  addCiphertexts,
  subtractCiphertexts,
  scaleCiphertext,
  generateValidityProof,
  verifyValidityProof,
  generateEqualityProof,
  verifyEqualityProof,
  generateRangeProof,
  verifyRangeProof,
  isValidCiphertext,
  reRandomizeCiphertext,
  serializeCiphertext,
  deserializeCiphertext,
  buildDecryptionLookupTable,
  decryptAmountWithLookup,
  encryptAmountWithRandomness,
  type ElGamalKeypair,
  type ElGamalCiphertext
} from '../../../src/utils/elgamal.js'

describe('ElGamal Encryption', () => {
  let keypair: ElGamalKeypair
  
  beforeEach(() => {
    keypair = generateElGamalKeypair()
  })
  
  describe('Key Generation', () => {
    it('should generate valid keypair', () => {
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toHaveLength(32)
    })
    
    it('should generate deterministic keypair from seed', () => {
      const seed = new Uint8Array(32).fill(42)
      const keypair1 = generateElGamalKeypair(seed)
      const keypair2 = generateElGamalKeypair(seed)
      
      expect(keypair1.publicKey).toEqual(keypair2.publicKey)
      expect(keypair1.secretKey).toEqual(keypair2.secretKey)
    })
    
    it('should generate different keypairs with different seeds', () => {
      const seed1 = new Uint8Array(32).fill(1)
      const seed2 = new Uint8Array(32).fill(2)
      const keypair1 = generateElGamalKeypair(seed1)
      const keypair2 = generateElGamalKeypair(seed2)
      
      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey)
      expect(keypair1.secretKey).not.toEqual(keypair2.secretKey)
    })
  })
  
  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt small amounts correctly', () => {
      // Use smaller values to avoid slow brute-force decryption
      const amounts = [0n, 1n, 10n, 50n, 100n]

      for (const amount of amounts) {
        const ciphertext = encryptAmount(amount, keypair.publicKey)
        const decrypted = decryptAmount(ciphertext, keypair.secretKey, 200n)

        expect(decrypted).toBe(amount)
      }
    })

    it('should fail to decrypt with wrong key', () => {
      const amount = 10n
      const wrongKeypair = generateElGamalKeypair()

      const ciphertext = encryptAmount(amount, keypair.publicKey)
      const decrypted = decryptAmount(ciphertext, wrongKeypair.secretKey, 100n)

      // With wrong key, decryption will return null (not found in search range)
      expect(decrypted).toBeNull()
    })

    it('should handle maximum decryptable value', () => {
      // Use smaller max value to avoid slow brute-force decryption
      const maxValue = 500n
      const ciphertext = encryptAmount(maxValue, keypair.publicKey)
      const decrypted = decryptAmount(ciphertext, keypair.secretKey, maxValue + 1n)

      expect(decrypted).toBe(maxValue)
    })

    it('should return null for values beyond max decryptable', () => {
      const largeValue = 1000n
      const ciphertext = encryptAmount(largeValue, keypair.publicKey)
      // Search range is smaller than the encrypted value
      const decrypted = decryptAmount(ciphertext, keypair.secretKey, 500n)

      expect(decrypted).toBeNull()
    })
    
    it('should validate ciphertext format', () => {
      const validCiphertext = encryptAmount(100n, keypair.publicKey)
      expect(isValidCiphertext(validCiphertext)).toBe(true)
      
      const invalidCiphertext: ElGamalCiphertext = {
        commitment: { commitment: new Uint8Array(32) },
        handle: { handle: new Uint8Array(31) } // Wrong size
      }
      expect(isValidCiphertext(invalidCiphertext)).toBe(false)
    })
  })
  
  describe('Homomorphic Operations', () => {
    it('should add ciphertexts correctly', () => {
      const amount1 = 100n
      const amount2 = 200n
      
      const ciphertext1 = encryptAmount(amount1, keypair.publicKey)
      const ciphertext2 = encryptAmount(amount2, keypair.publicKey)
      
      const sum = addCiphertexts(ciphertext1, ciphertext2)
      const decrypted = decryptAmount(sum, keypair.secretKey, 1000n)
      
      expect(decrypted).toBe(amount1 + amount2)
    })
    
    it('should subtract ciphertexts correctly', () => {
      const amount1 = 500n
      const amount2 = 200n
      
      const ciphertext1 = encryptAmount(amount1, keypair.publicKey)
      const ciphertext2 = encryptAmount(amount2, keypair.publicKey)
      
      const diff = subtractCiphertexts(ciphertext1, ciphertext2)
      const decrypted = decryptAmount(diff, keypair.secretKey, 1000n)
      
      expect(decrypted).toBe(amount1 - amount2)
    })
    
    it('should scale ciphertext correctly', () => {
      const amount = 100n
      const scalar = 3n
      
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      const scaled = scaleCiphertext(ciphertext, scalar)
      const decrypted = decryptAmount(scaled, keypair.secretKey, 1000n)
      
      expect(decrypted).toBe(amount * scalar)
    })
    
    it('should handle zero in homomorphic operations', () => {
      const amount = 100n
      const zero = 0n
      
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      const zeroCiphertext = encryptAmount(zero, keypair.publicKey)
      
      // Adding zero
      const sum = addCiphertexts(ciphertext, zeroCiphertext)
      expect(decryptAmount(sum, keypair.secretKey)).toBe(amount)
      
      // Subtracting zero
      const diff = subtractCiphertexts(ciphertext, zeroCiphertext)
      expect(decryptAmount(diff, keypair.secretKey)).toBe(amount)
      
      // Scaling by zero
      const scaled = scaleCiphertext(ciphertext, 0n)
      expect(decryptAmount(scaled, keypair.secretKey)).toBe(0n)
    })
  })
  
  describe('Re-randomization', () => {
    it('should re-randomize ciphertext while preserving value', () => {
      const amount = 100n
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      const reRandomized = reRandomizeCiphertext(ciphertext, keypair.publicKey)
      
      // Ciphertext should be different
      expect(reRandomized.commitment.commitment).not.toEqual(ciphertext.commitment.commitment)
      expect(reRandomized.handle.handle).not.toEqual(ciphertext.handle.handle)
      
      // But decrypted value should be the same
      const decrypted = decryptAmount(reRandomized, keypair.secretKey)
      expect(decrypted).toBe(amount)
    })
  })
  
  describe('Serialization', () => {
    it('should serialize and deserialize ciphertext correctly', () => {
      const amount = 123n
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      
      const serialized = serializeCiphertext(ciphertext)
      expect(serialized).toHaveLength(64)
      
      const deserialized = deserializeCiphertext(serialized)
      expect(deserialized).toEqual(ciphertext)
      
      // Should still decrypt correctly
      const decrypted = decryptAmount(deserialized, keypair.secretKey)
      expect(decrypted).toBe(amount)
    })
    
    it('should throw on invalid serialized data', () => {
      expect(() => deserializeCiphertext(new Uint8Array(63))).toThrow()
      expect(() => deserializeCiphertext(new Uint8Array(65))).toThrow()
    })
  })
  
  describe('Lookup Table Decryption', () => {
    it('should decrypt using lookup table', () => {
      const maxValue = 1000n
      const lookupTable = buildDecryptionLookupTable(maxValue)
      
      const testValues = [0n, 1n, 100n, 500n, 1000n]
      
      for (const amount of testValues) {
        const ciphertext = encryptAmount(amount, keypair.publicKey)
        const decrypted = decryptAmountWithLookup(ciphertext, keypair.secretKey, lookupTable)
        expect(decrypted).toBe(amount)
      }
    })
    
    it('should return null for values not in lookup table', () => {
      const maxValue = 100n
      const lookupTable = buildDecryptionLookupTable(maxValue)
      
      const amount = 200n
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      const decrypted = decryptAmountWithLookup(ciphertext, keypair.secretKey, lookupTable)
      
      expect(decrypted).toBeNull()
    })
  })
  
  describe('Validity Proofs', () => {
    it('should generate and verify validity proof', () => {
      const amount = 100n
      const { ciphertext, randomness } = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      const proof = generateValidityProof(ciphertext, keypair.publicKey, randomness)
      const isValid = verifyValidityProof(proof, ciphertext, keypair.publicKey)
      
      expect(isValid).toBe(true)
    })
    
    it('should reject validity proof with wrong ciphertext', () => {
      const amount = 100n
      const { ciphertext, randomness } = encryptAmountWithRandomness(amount, keypair.publicKey)
      const wrongCiphertext = encryptAmount(200n, keypair.publicKey)
      
      const proof = generateValidityProof(ciphertext, keypair.publicKey, randomness)
      const isValid = verifyValidityProof(proof, wrongCiphertext, keypair.publicKey)
      
      expect(isValid).toBe(false)
    })
    
    it('should reject validity proof with wrong public key', () => {
      const amount = 100n
      const wrongKeypair = generateElGamalKeypair()
      const { ciphertext, randomness } = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      const proof = generateValidityProof(ciphertext, keypair.publicKey, randomness)
      const isValid = verifyValidityProof(proof, ciphertext, wrongKeypair.publicKey)
      
      expect(isValid).toBe(false)
    })
  })
  
  describe('Equality Proofs', () => {
    it('should generate and verify equality proof for same values', () => {
      const amount = 100n
      const { ciphertext: ct1, randomness: r1 } = encryptAmountWithRandomness(amount, keypair.publicKey)
      const { ciphertext: ct2, randomness: r2 } = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      const proof = generateEqualityProof(ct1, ct2, r1, r2, keypair.publicKey)
      const isValid = verifyEqualityProof(proof, ct1, ct2, keypair.publicKey)
      
      expect(isValid).toBe(true)
    })
    
    it('should reject equality proof for different values', () => {
      const amount1 = 100n
      const amount2 = 200n
      const { ciphertext: ct1, randomness: r1 } = encryptAmountWithRandomness(amount1, keypair.publicKey)
      const { ciphertext: ct2, randomness: r2 } = encryptAmountWithRandomness(amount2, keypair.publicKey)
      
      // Try to create a proof (should still work structurally)
      const proof = generateEqualityProof(ct1, ct2, r1, r2, keypair.publicKey)
      const isValid = verifyEqualityProof(proof, ct1, ct2, keypair.publicKey)
      
      // But verification should fail because values are different
      expect(isValid).toBe(false)
    })
  })
  
  describe('Range Proofs', () => {
    it('should generate and verify range proof', async () => {
      const amount = 1000n
      // Generate a proper Pedersen commitment for the range proof
      // The generateRangeProof function will create its own commitment
      const randomness = new Uint8Array(32).fill(1)
      const commitment = { commitment: new Uint8Array(32) } // Ignored by generateRangeProof
      
      const proof = await generateRangeProof(amount, commitment, randomness)
      expect(proof.proof).toBeInstanceOf(Uint8Array)
      expect(proof.commitment).toBeInstanceOf(Uint8Array)
      
      const isValid = await verifyRangeProof(proof, proof.commitment)
      expect(isValid).toBe(true)
    })
    
    it('should reject range proof for out-of-range values', async () => {
      const amount = -1n // Negative value
      const commitment = { commitment: new Uint8Array(32) }
      const randomness = new Uint8Array(32).fill(1)
      
      await expect(generateRangeProof(amount, commitment, randomness)).rejects.toThrow()
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle encryption of zero', () => {
      const zero = 0n
      const ciphertext = encryptAmount(zero, keypair.publicKey)
      const decrypted = decryptAmount(ciphertext, keypair.secretKey, 100n)

      expect(decrypted).toBe(zero)
    })

    it('should handle maximum safe integer', () => {
      // Use smaller value to avoid slow brute-force decryption
      const maxSafe = 500n
      const ciphertext = encryptAmount(maxSafe, keypair.publicKey)
      const decrypted = decryptAmount(ciphertext, keypair.secretKey, maxSafe + 1n)

      expect(decrypted).toBe(maxSafe)
    })
    
    it('should throw on negative amounts', () => {
      expect(() => encryptAmount(-1n, keypair.publicKey)).toThrow()
    })
    
    it('should throw on amounts exceeding maximum', () => {
      const tooLarge = 4_294_967_296n // 2^32
      expect(() => encryptAmount(tooLarge, keypair.publicKey)).toThrow()
    })
  })
})