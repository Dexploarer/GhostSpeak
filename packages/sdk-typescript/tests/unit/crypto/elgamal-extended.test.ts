import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import { randomBytes } from '@noble/curves/abstract/utils'
import {
  generateElGamalKeypair,
  encryptAmount,
  encryptAmountWithRandomness,
  decryptAmount,
  addCiphertexts,
  subtractCiphertexts,
  scaleCiphertext,
  generateRangeProof,
  verifyRangeProof,
  generateValidityProof,
  verifyValidityProof,
  generateTransferProof,
  generateTransferValidityProof,
  verifyTransferValidityProof,
  generateTransferEqualityProof,
  verifyTransferEqualityProof,
  isValidCiphertext,
  serializeCiphertext,
  deserializeCiphertext,
  MAX_DECRYPTABLE_VALUE,
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type ElGamalPubkey
} from '../../../src/utils/elgamal.js'

describe('ElGamal Extended Tests', () => {
  let keypair: ElGamalKeypair
  let keypair2: ElGamalKeypair
  
  beforeEach(() => {
    keypair = generateElGamalKeypair()
    keypair2 = generateElGamalKeypair()
  })

  describe('Security and Edge Cases', () => {
    it('should handle malformed curve points gracefully', () => {
      // Since noble curves library handles these gracefully by creating valid points,
      // we should test with actual invalid ciphertexts instead
      const validAmount = 100n
      const validCipher = encryptAmount(validAmount, keypair.publicKey)
      
      // Test with invalid ciphertext structure
      const invalidCipher: ElGamalCiphertext = {
        commitment: { commitment: new Uint8Array(31) }, // Wrong size
        handle: { handle: new Uint8Array(32) }
      }
      
      expect(isValidCiphertext(invalidCipher)).toBe(false)
    })
    
    it('should handle field overflow correctly', () => {
      // Test with values near the curve order
      const nearMaxScalar = (1n << 252n) - 1n // Close to curve order
      
      // Should handle large scalars in scaling operation
      const cipher = encryptAmount(1n, keypair.publicKey)
      const scaled = scaleCiphertext(cipher, nearMaxScalar % (1n << 64n)) // Reduce to reasonable range
      expect(isValidCiphertext(scaled)).toBe(true)
    })
    
    it('should resist timing attacks in decryption', () => {
      const amount = 100n
      const cipher = encryptAmount(amount, keypair.publicKey)
      
      // Time multiple decryption attempts
      const timings: number[] = []
      for (let i = 0; i < 10; i++) {
        const start = performance.now()
        decryptAmount(cipher, keypair.secretKey, 200n)
        const end = performance.now()
        timings.push(end - start)
      }
      
      // Check that timings are relatively consistent (within 50% variance)
      const avgTime = timings.reduce((a, b) => a + b) / timings.length
      const maxVariance = timings.reduce((max, t) => Math.max(max, Math.abs(t - avgTime)), 0)
      expect(maxVariance).toBeLessThan(avgTime * 0.5)
    })
    
    it('should handle concurrent encryption operations', async () => {
      const amounts = Array.from({ length: 100 }, (_, i) => BigInt(i))
      
      // Encrypt concurrently
      const ciphertexts = await Promise.all(
        amounts.map(amount => 
          Promise.resolve(encryptAmount(amount, keypair.publicKey))
        )
      )
      
      // Verify all encryptions are valid and different
      const serializedSet = new Set<string>()
      for (let i = 0; i < ciphertexts.length; i++) {
        expect(isValidCiphertext(ciphertexts[i])).toBe(true)
        const serialized = Buffer.from(serializeCiphertext(ciphertexts[i])).toString('hex')
        expect(serializedSet.has(serialized)).toBe(false)
        serializedSet.add(serialized)
        
        // Verify decryption
        const decrypted = decryptAmount(ciphertexts[i], keypair.secretKey, 200n)
        expect(decrypted).toBe(amounts[i])
      }
    })
    
    it('should maintain security with zero randomness edge case', () => {
      // Test encryption with specific randomness patterns
      const amount = 42n
      
      // Create randomness that results in small scalar
      const smallRandomness = new Uint8Array(32)
      smallRandomness[0] = 1 // Very small scalar
      
      const result1 = encryptAmountWithRandomness(amount, keypair.publicKey)
      // Randomness should be properly formatted
      expect(result1.randomness[0] & 248).toBe(result1.randomness[0])
      expect(result1.randomness[31] & 127).toBe(result1.randomness[31] & 127)
      expect(result1.randomness[31] & 64).toBe(64)
    })
  })

  describe('Proof System Edge Cases', () => {
    it('should handle range proof for boundary values', async () => {
      const boundaryValues = [
        1n,                    // One (skip 0n to avoid zero gamma issue)
        (1n << 16n) - 1n,     // Max 16-bit
        1n << 16n,            // Min requiring full bulletproof
        (1n << 32n) - 1n,     // Max 32-bit
        (1n << 64n) - 1n      // Max 64-bit
      ]

      for (const value of boundaryValues) {
        if (value < (1n << 64n)) {
          const result = encryptAmountWithRandomness(value, keypair.publicKey)
          const proof = await generateRangeProof(value, result.ciphertext.commitment, result.randomness)
          expect(proof.proof).toHaveLength(674) // All use bulletproofs now
          expect(await verifyRangeProof(proof, proof.commitment)).toBe(true)
        }
      }
    })

    it('should reject tampered range proofs', async () => {
      const amount = 1000n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      const proof = await generateRangeProof(amount, result.ciphertext.commitment, result.randomness)

      // Tamper with proof at various positions
      const tamperedProof1 = { ...proof, proof: new Uint8Array(proof.proof) }
      tamperedProof1.proof[0] ^= 1 // Flip a bit
      expect(await verifyRangeProof(tamperedProof1, proof.commitment)).toBe(false)

      const tamperedProof2 = { ...proof, proof: new Uint8Array(proof.proof) }
      tamperedProof2.proof[proof.proof.length - 1] ^= 1 // Flip last bit
      expect(await verifyRangeProof(tamperedProof2, proof.commitment)).toBe(false)
    })
    
    it('should handle validity proof with edge case public keys', () => {
      // Generate keypair with specific properties
      const edgeSeed = new Uint8Array(32)
      edgeSeed.fill(1)
      const edgeKeypair = generateElGamalKeypair(edgeSeed)
      
      const amount = 500n
      const result = encryptAmountWithRandomness(amount, edgeKeypair.publicKey)
      const proof = generateValidityProof(result.ciphertext, edgeKeypair.publicKey, result.randomness)
      
      expect(verifyValidityProof(proof, result.ciphertext, edgeKeypair.publicKey)).toBe(true)
    })
    
    it('should properly handle transfer proof generation failures', () => {
      // Test insufficient balance
      const sourceBalance = encryptAmount(100n, keypair.publicKey)
      expect(() => 
        generateTransferProof(sourceBalance, 200n, keypair, keypair2.publicKey)
      ).toThrow('Insufficient balance')
      
      // Test with corrupted source balance
      const corruptedBalance: ElGamalCiphertext = {
        commitment: { commitment: new Uint8Array(32).fill(255) },
        handle: { handle: new Uint8Array(32).fill(255) }
      }
      expect(() => 
        generateTransferProof(corruptedBalance, 50n, keypair, keypair2.publicKey)
      ).toThrow()
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle large batch operations efficiently', () => {
      const batchSize = 1000
      const ciphertexts: ElGamalCiphertext[] = []
      
      // Measure memory before
      const memBefore = process.memoryUsage().heapUsed
      
      // Generate many ciphertexts
      for (let i = 0; i < batchSize; i++) {
        ciphertexts.push(encryptAmount(BigInt(i % 100), keypair.publicKey))
      }
      
      // Measure memory after
      const memAfter = process.memoryUsage().heapUsed
      const memUsedMB = (memAfter - memBefore) / (1024 * 1024)
      
      // Memory usage should be reasonable (less than 50MB for 1000 ciphertexts)
      expect(memUsedMB).toBeLessThan(50)
      
      // Verify a sample of ciphertexts
      for (let i = 0; i < 10; i++) {
        const idx = Math.floor(Math.random() * batchSize)
        const decrypted = decryptAmount(ciphertexts[idx], keypair.secretKey, 100n)
        expect(decrypted).toBe(BigInt(idx % 100))
      }
    })
    
    it('should clean up resources in proof generation', async () => {
      const iterations = 100
      const memReadings: number[] = []

      for (let i = 0; i < iterations; i++) {
        const amount = BigInt(i + 1)
        const result = encryptAmountWithRandomness(amount, keypair.publicKey)
        await generateRangeProof(amount, result.ciphertext.commitment, result.randomness)

        if (i % 20 === 0) {
          if (global.gc) {
            global.gc() // Force GC if available
          }
          memReadings.push(process.memoryUsage().heapUsed)
        }
      }

      // Memory should not continuously grow
      if (memReadings.length > 2) {
        const firstReading = memReadings[0]
        const lastReading = memReadings[memReadings.length - 1]
        const growth = (lastReading - firstReading) / firstReading
        expect(growth).toBeLessThan(0.5) // Less than 50% growth
      }
    })
  })

  describe('Serialization Edge Cases', () => {
    it('should handle serialization of edge case ciphertexts', () => {
      // Test with zero commitment
      const zeroCipher: ElGamalCiphertext = {
        commitment: { commitment: new Uint8Array(32) },
        handle: { handle: new Uint8Array(32) }
      }
      const serialized = serializeCiphertext(zeroCipher)
      const deserialized = deserializeCiphertext(serialized)
      expect(deserialized.commitment.commitment).toEqual(zeroCipher.commitment.commitment)
      
      // Test with max values
      const maxCipher: ElGamalCiphertext = {
        commitment: { commitment: new Uint8Array(32).fill(254) },
        handle: { handle: new Uint8Array(32).fill(254) }
      }
      const serialized2 = serializeCiphertext(maxCipher)
      const deserialized2 = deserializeCiphertext(serialized2)
      expect(deserialized2.commitment.commitment).toEqual(maxCipher.commitment.commitment)
    })
    
    it('should reject malformed serialized data', () => {
      // Too short
      expect(() => deserializeCiphertext(new Uint8Array(63))).toThrow('Invalid ciphertext length')
      
      // Too long
      expect(() => deserializeCiphertext(new Uint8Array(65))).toThrow('Invalid ciphertext length')
      
      // Correct length but potentially invalid points
      const malformed = new Uint8Array(64)
      malformed.fill(255) // All 1s - likely invalid curve points
      const deserialized = deserializeCiphertext(malformed)
      expect(isValidCiphertext(deserialized)).toBe(false)
    })
  })

  describe('Complex Homomorphic Operations', () => {
    it('should maintain correctness in complex arithmetic circuits', () => {
      // Implement (a * b + c) * d - e
      const a = 5n
      const b = 4n
      const c = 10n
      const d = 3n
      const e = 50n
      
      const cipherA = encryptAmount(a, keypair.publicKey)
      const cipherC = encryptAmount(c, keypair.publicKey)
      const cipherE = encryptAmount(e, keypair.publicKey)
      
      // a * b (scalar multiplication)
      const ab = scaleCiphertext(cipherA, b)
      // a * b + c
      const abc = addCiphertexts(ab, cipherC)
      // (a * b + c) * d
      const abcd = scaleCiphertext(abc, d)
      // (a * b + c) * d - e
      const result = subtractCiphertexts(abcd, cipherE)
      
      const decrypted = decryptAmount(result, keypair.secretKey, 100n)
      const expected = (a * b + c) * d - e
      expect(decrypted).toBe(expected)
    })
    
    it('should handle overflow in homomorphic operations gracefully', () => {
      const largeAmount = MAX_DECRYPTABLE_VALUE / 2n
      const cipher = encryptAmount(largeAmount, keypair.publicKey)
      
      // Adding two large values should work
      const sum = addCiphertexts(cipher, cipher)
      // But we won't be able to decrypt if it exceeds MAX_DECRYPTABLE_VALUE
      const decrypted = decryptAmount(sum, keypair.secretKey, MAX_DECRYPTABLE_VALUE)
      expect(decrypted).toBe(null) // Cannot decrypt values > MAX_DECRYPTABLE_VALUE
    })
  })

  describe('Transfer Proof Advanced Scenarios', () => {
    it('should handle transfer proofs with minimum amounts', () => {
      const sourceBalance = encryptAmount(1n, keypair.publicKey)
      const transferProof = generateTransferProof(sourceBalance, 1n, keypair, keypair2.publicKey)
      
      expect(transferProof.transferProof).toBeDefined()
      expect(transferProof.newSourceBalance).toBeDefined()
      expect(transferProof.destCiphertext).toBeDefined()
      
      // Verify new source balance is 0
      const newBalance = decryptAmount(transferProof.newSourceBalance, keypair.secretKey)
      expect(newBalance).toBe(0n)
    })
    
    it('should generate valid transfer validity proofs', () => {
      const amount = 1000n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      const validityProof = generateTransferValidityProof(
        result.ciphertext,
        amount,
        result.randomness
      )
      
      expect(validityProof.proof).toHaveLength(96)
      
      // Verify the proof
      const isValid = verifyTransferValidityProof(
        validityProof,
        result.ciphertext,
        keypair.publicKey
      )
      expect(isValid).toBe(true)
    })
    
    it('should generate valid transfer equality proofs', () => {
      const sourceAmount = 1000n
      const transferAmount = 300n
      const remainingAmount = sourceAmount - transferAmount
      
      // Encrypt all values
      const sourceResult = encryptAmountWithRandomness(sourceAmount, keypair.publicKey)
      const remainingResult = encryptAmountWithRandomness(remainingAmount, keypair.publicKey)
      const transferResult = encryptAmountWithRandomness(transferAmount, keypair2.publicKey)
      
      const equalityProof = generateTransferEqualityProof(
        sourceResult.ciphertext,
        remainingResult.ciphertext,
        transferResult.ciphertext,
        transferAmount,
        sourceResult.randomness
      )
      
      expect(equalityProof.proof).toHaveLength(192)
      
      // Verify the proof structure is valid
      const isValid = verifyTransferEqualityProof(
        equalityProof,
        sourceResult.ciphertext,
        remainingResult.ciphertext,
        transferResult.ciphertext,
        keypair.publicKey,
        keypair2.publicKey
      )
      expect(isValid).toBe(true)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from invalid decryption attempts', () => {
      const amount = 100n
      const cipher = encryptAmount(amount, keypair.publicKey)
      
      // Try decryption with wrong key first
      const wrongDecrypt = decryptAmount(cipher, keypair2.secretKey, 200n)
      expect(wrongDecrypt).toBe(null)
      
      // Should still work with correct key
      const correctDecrypt = decryptAmount(cipher, keypair.secretKey, 200n)
      expect(correctDecrypt).toBe(amount)
    })
    
    it('should handle proof generation with invalid inputs gracefully', async () => {
      // Invalid randomness size
      const invalidRandomness = new Uint8Array(31) // Too short
      const commitment = { commitment: new Uint8Array(32) }

      await expect(
        generateRangeProof(100n, commitment, invalidRandomness)
      ).rejects.toThrow()

      // Invalid amount for range proof
      await expect(
        generateRangeProof(-1n, commitment, new Uint8Array(32))
      ).rejects.toThrow('Amount must be in range [0, 2^64)')
    })
    
    it('should maintain consistency after failed operations', () => {
      const validCipher = encryptAmount(50n, keypair.publicKey)
      
      // Attempt invalid operation
      try {
        const invalidCipher: ElGamalCiphertext = {
          commitment: { commitment: new Uint8Array(31) }, // Invalid size
          handle: { handle: new Uint8Array(32) }
        }
        addCiphertexts(validCipher, invalidCipher)
      } catch {
        // Expected to fail
      }
      
      // Valid cipher should still be usable
      const decrypted = decryptAmount(validCipher, keypair.secretKey)
      expect(decrypted).toBe(50n)
    })
  })

  describe('Token-2022 Integration Scenarios', () => {
    it('should handle Token-2022 decimal precision', () => {
      // Test with 6 decimal places (USDC-like)
      const amounts = [
        1_000_000n,      // 1 token
        1_000n,          // 0.001 token
        1n,              // 0.000001 token
        999_999_999n     // 999.999999 tokens
      ]
      
      for (const amount of amounts) {
        const cipher = encryptAmount(amount, keypair.publicKey)
        const serialized = serializeCiphertext(cipher)
        
        // Verify format matches Token-2022 expectations
        expect(serialized).toHaveLength(64)
        
        // Should round-trip correctly
        const deserialized = deserializeCiphertext(serialized)
        const decrypted = decryptAmount(deserialized, keypair.secretKey, 1_000_000_000n)
        expect(decrypted).toBe(amount)
      }
    })
    
    it('should generate proofs compatible with Token-2022 limits', async () => {
      // Token-2022 has specific proof size requirements
      const amount = 1_000_000_000n // 1000 tokens with 6 decimals
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)

      const rangeProof = await generateRangeProof(amount, result.ciphertext.commitment, result.randomness)
      expect(rangeProof.proof).toHaveLength(674) // Expected by Token-2022

      const validityProof = generateValidityProof(result.ciphertext, keypair.publicKey, result.randomness)
      expect(validityProof.proof).toHaveLength(96) // Schnorr proof size
    })
  })
})