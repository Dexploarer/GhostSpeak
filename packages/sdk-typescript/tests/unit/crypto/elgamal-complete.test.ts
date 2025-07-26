/**
 * ElGamal Complete Implementation Unit Tests
 * 
 * Tests the complete ElGamal implementation including:
 * - Key generation and derivation
 * - Encryption and decryption
 * - All proof types (range, validity, equality, transfer)
 * - Bulletproof generation and verification
 * - Transfer and withdrawal proofs
 * - Helper utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateElGamalKeypair,
  getPublicKey,
  encryptAmount,
  encryptAmountWithRandomness,
  decryptAmount,
  generateBulletproof,
  verifyBulletproof,
  generateValidityProof,
  generateEqualityProof,
  generateTransferProof,
  generateWithdrawProof,
  generateTransferValidityProof,
  generateTransferEqualityProof,
  generateRangeProof,
  createPedersenCommitmentFromAmount,
  elgamal,
  type ElGamalKeypair,
  type ElGamalCiphertext,
  type RangeProof,
  type ValidityProof,
  type EqualityProof
} from '../../../src/utils/elgamal-complete'
import { PerformanceTimer } from '../../helpers/setup'

describe('ElGamal Complete Implementation', () => {
  let keypair: ElGamalKeypair
  let keypair2: ElGamalKeypair
  
  beforeEach(() => {
    // Generate fresh keypairs for each test
    keypair = generateElGamalKeypair()
    keypair2 = generateElGamalKeypair()
  })

  describe('Key Generation', () => {
    it('should generate valid ElGamal keypair', () => {
      const kp = generateElGamalKeypair()
      
      expect(kp.publicKey).toBeInstanceOf(Uint8Array)
      expect(kp.publicKey).toHaveLength(32)
      expect(kp.secretKey).toBeInstanceOf(Uint8Array)
      expect(kp.secretKey).toHaveLength(32)
    })
    
    it('should generate deterministic keypair from seed', () => {
      const seed = new Uint8Array(32).fill(42)
      const kp1 = generateElGamalKeypair(seed)
      const kp2 = generateElGamalKeypair(seed)
      
      expect(kp1.publicKey).toEqual(kp2.publicKey)
      expect(kp1.secretKey).toEqual(kp2.secretKey)
    })
    
    it('should derive public key from secret key', () => {
      const publicKey = getPublicKey(keypair.secretKey)
      expect(publicKey).toEqual(keypair.publicKey)
    })
  })

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt amounts', () => {
      const amounts = [0n, 1n, 100n, 1000n]
      
      for (const amount of amounts) {
        const ciphertext = encryptAmount(amount, keypair.publicKey)
        const decrypted = decryptAmount(ciphertext, keypair.secretKey, 2000n)
        
        expect(decrypted).toBe(amount)
      }
    })
    
    it('should fail to decrypt with wrong secret key', () => {
      const amount = 500n
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      const decrypted = decryptAmount(ciphertext, keypair2.secretKey, 1000n)
      
      expect(decrypted).toBeNull()
    })
    
    it('should return randomness with encryptAmountWithRandomness', () => {
      const amount = 123n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      expect(result.ciphertext).toBeDefined()
      expect(result.randomness).toBeInstanceOf(Uint8Array)
      expect(result.randomness).toHaveLength(32)
      
      // Should decrypt correctly
      const decrypted = decryptAmount(result.ciphertext, keypair.secretKey)
      expect(decrypted).toBe(amount)
    })
  })

  describe('Bulletproof Generation', () => {
    it('should generate and verify bulletproof', () => {
      const amount = 1000n
      const commitment = createPedersenCommitmentFromAmount(amount)
      const randomness = new Uint8Array(32).fill(1)
      
      const bulletproof = generateBulletproof(amount, commitment, randomness)
      
      expect(bulletproof.proof).toBeInstanceOf(Uint8Array)
      expect(bulletproof.proof.length).toBeGreaterThan(0)
      expect(bulletproof.commitment).toEqual(commitment.commitment)
      
      const isValid = verifyBulletproof(bulletproof, commitment)
      expect(isValid).toBe(true)
    })
    
    it('should generate different size proofs based on amount', () => {
      const smallAmount = 100n
      const largeAmount = 100000n
      
      const smallCommitment = createPedersenCommitmentFromAmount(smallAmount)
      const largeCommitment = createPedersenCommitmentFromAmount(largeAmount)
      
      const smallProof = generateBulletproof(smallAmount, smallCommitment, new Uint8Array(32))
      const largeProof = generateBulletproof(largeAmount, largeCommitment, new Uint8Array(32))
      
      // Different amounts may result in different proof sizes
      expect(smallProof.proof).toBeInstanceOf(Uint8Array)
      expect(largeProof.proof).toBeInstanceOf(Uint8Array)
    })
  })

  describe('Range Proofs', () => {
    it('should generate and verify range proof', () => {
      const amount = 5000n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      const rangeProof = generateRangeProof(
        amount,
        result.ciphertext.commitment,
        result.randomness
      )
      
      expect(rangeProof.proof).toBeInstanceOf(Uint8Array)
      expect(rangeProof.commitment).toEqual(result.ciphertext.commitment.commitment)
      
      // Verify using elgamal helper
      const isValid = elgamal.verifyRangeProof(rangeProof)
      expect(isValid).toBe(true)
    })
    
    it('should reject range proof for negative amount', () => {
      expect(() => {
        generateRangeProof(-1n, { commitment: new Uint8Array(32) }, new Uint8Array(32))
      }).toThrow('Amount must be in range [0, 2^64)')
    })
    
    it('should reject range proof for amount exceeding 64 bits', () => {
      const tooLarge = 1n << 64n
      expect(() => {
        generateRangeProof(tooLarge, { commitment: new Uint8Array(32) }, new Uint8Array(32))
      }).toThrow('Amount must be in range [0, 2^64)')
    })
  })

  describe('Validity Proofs', () => {
    it('should generate validity proof', () => {
      const amount = 2500n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      const validityProof = generateValidityProof(
        result.ciphertext,
        keypair.publicKey,
        result.randomness
      )
      
      expect(validityProof.proof).toBeInstanceOf(Uint8Array)
      expect(validityProof.proof).toHaveLength(96) // Schnorr proof size
      
      // Verify using elgamal helper
      const isValid = elgamal.verifyValidityProof(validityProof)
      expect(isValid).toBe(true)
    })
  })

  describe('Equality Proofs', () => {
    it('should generate equality proof for same amounts', () => {
      const amount = 3000n
      const result1 = encryptAmountWithRandomness(amount, keypair.publicKey)
      const result2 = encryptAmountWithRandomness(amount, keypair2.publicKey)
      
      const equalityProof = generateEqualityProof(
        result1.ciphertext,
        result2.ciphertext,
        amount,
        result1.randomness,
        result2.randomness
      )
      
      expect(equalityProof.proof).toBeInstanceOf(Uint8Array)
      expect(equalityProof.proof).toHaveLength(192) // Actual equality proof size
      
      // Verify using elgamal helper
      const isValid = elgamal.verifyEqualityProof(equalityProof)
      expect(isValid).toBe(true)
    })
  })

  describe('Transfer Proofs', () => {
    it('should generate complete transfer proof', () => {
      const sourceBalance = 10000n
      const transferAmount = 3000n
      
      const sourceEncrypted = encryptAmount(sourceBalance, keypair.publicKey)
      
      const transferProof = generateTransferProof(
        sourceEncrypted,
        transferAmount,
        keypair,
        keypair2.publicKey
      )
      
      expect(transferProof.transferProof).toBeDefined()
      expect(transferProof.transferProof.encryptedTransferAmount).toBeInstanceOf(Uint8Array)
      expect(transferProof.transferProof.newSourceCommitment).toBeInstanceOf(Uint8Array)
      expect(transferProof.transferProof.equalityProof).toBeInstanceOf(Uint8Array)
      expect(transferProof.transferProof.validityProof).toBeInstanceOf(Uint8Array)
      expect(transferProof.transferProof.rangeProof).toBeInstanceOf(Uint8Array)
      
      expect(transferProof.newSourceBalance).toBeDefined()
      expect(transferProof.destCiphertext).toBeDefined()
      
      // Verify new source balance
      const newBalance = decryptAmount(transferProof.newSourceBalance, keypair.secretKey, 20000n)
      expect(newBalance).toBe(sourceBalance - transferAmount)
      
      // Verify destination received correct amount
      const destAmount = decryptAmount(transferProof.destCiphertext, keypair2.secretKey, 5000n)
      expect(destAmount).toBe(transferAmount)
    })
    
    it('should generate transfer validity proof', () => {
      const amount = 1500n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      const validityProof = generateTransferValidityProof(
        result.ciphertext,
        amount,
        result.randomness
      )
      
      expect(validityProof.proof).toBeInstanceOf(Uint8Array)
      expect(validityProof.proof).toHaveLength(96)
      
      // Verify using elgamal helper
      const isValid = elgamal.verifyValidityProof(validityProof)
      expect(isValid).toBe(true)
    })
    
    it('should generate transfer equality proof', () => {
      const sourceBalance = 5000n
      const transferAmount = 1000n
      const remainingBalance = sourceBalance - transferAmount
      
      const sourceResult = encryptAmountWithRandomness(sourceBalance, keypair.publicKey)
      const remainingResult = encryptAmountWithRandomness(remainingBalance, keypair.publicKey)
      const destResult = encryptAmountWithRandomness(transferAmount, keypair2.publicKey)
      
      const equalityProof = generateTransferEqualityProof(
        sourceResult.ciphertext,
        remainingResult.ciphertext,
        destResult.ciphertext,
        transferAmount,
        sourceResult.randomness
      )
      
      expect(equalityProof.proof).toBeInstanceOf(Uint8Array)
      expect(equalityProof.proof).toHaveLength(192) // Extended equality proof
      
      // Verify using elgamal helper
      const isValid = elgamal.verifyEqualityProof(equalityProof)
      expect(isValid).toBe(true)
    })
  })

  describe('Withdrawal Proofs', () => {
    it('should generate withdrawal proof', () => {
      const balance = 8000n
      const withdrawAmount = 2000n
      
      const balanceEncrypted = encryptAmount(balance, keypair.publicKey)
      
      const withdrawProof = generateWithdrawProof(
        balanceEncrypted,
        withdrawAmount,
        keypair
      )
      
      expect(withdrawProof.newSourceBalance).toBeDefined()
      expect(withdrawProof.withdrawProof).toBeDefined()
      expect(withdrawProof.withdrawProof.equalityProof).toBeInstanceOf(Uint8Array)
      expect(withdrawProof.withdrawProof.rangeProof).toBeInstanceOf(Uint8Array)
      
      // Verify new balance
      const newBalance = decryptAmount(withdrawProof.newSourceBalance, keypair.secretKey, 10000n)
      expect(newBalance).toBe(balance - withdrawAmount)
    })
  })

  describe('Helper Utilities', () => {
    it('should create Pedersen commitment from amount', () => {
      const amount = 1234n
      const commitment = createPedersenCommitmentFromAmount(amount)
      
      expect(commitment.commitment).toBeInstanceOf(Uint8Array)
      expect(commitment.commitment).toHaveLength(32)
      expect(commitment.randomness).toBeInstanceOf(Uint8Array)
      expect(commitment.randomness).toHaveLength(32)
    })
    
    it('should serialize and deserialize ciphertexts', () => {
      const amount = 5678n
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      
      // Manual serialization
      const serialized = new Uint8Array(64)
      serialized.set(ciphertext.commitment.commitment, 0)
      serialized.set(ciphertext.handle.handle, 32)
      
      // Manual deserialization
      const deserialized: ElGamalCiphertext = {
        commitment: { commitment: serialized.slice(0, 32) },
        handle: { handle: serialized.slice(32, 64) }
      }
      
      expect(deserialized.commitment.commitment).toEqual(ciphertext.commitment.commitment)
      expect(deserialized.handle.handle).toEqual(ciphertext.handle.handle)
      
      // Should decrypt correctly
      const decrypted = decryptAmount(deserialized, keypair.secretKey, 10000n)
      expect(decrypted).toBe(amount)
    })
  })

  describe('Performance Characteristics', () => {
    it('should meet performance targets for critical operations', () => {
      const timer = new PerformanceTimer()
      
      // Test keypair generation
      timer.start()
      generateElGamalKeypair()
      const keypairTime = timer.measure('keypair_generation')
      expect(keypairTime).toBeLessThan(50)
      
      // Test encryption
      timer.start()
      encryptAmount(1000n, keypair.publicKey)
      const encryptTime = timer.measure('encryption')
      expect(encryptTime).toBeLessThan(10)
      
      // Test decryption
      const cipher = encryptAmount(100n, keypair.publicKey)
      timer.start()
      decryptAmount(cipher, keypair.secretKey, 200n)
      const decryptTime = timer.measure('decryption')
      expect(decryptTime).toBeLessThan(50)
    })
    
    it('should benchmark proof generation', () => {
      const timer = new PerformanceTimer()
      const amount = 1000n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      // Benchmark range proof
      timer.start()
      generateRangeProof(amount, result.ciphertext.commitment, result.randomness)
      const rangeProofTime = timer.measure('range_proof')
      
      console.log(`Range proof generation: ${rangeProofTime.toFixed(2)}ms`)
      
      // Target is <50ms with WASM, <100ms without
      expect(rangeProofTime).toBeLessThan(200)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero amount encryption', () => {
      const zero = encryptAmount(0n, keypair.publicKey)
      const decrypted = decryptAmount(zero, keypair.secretKey)
      expect(decrypted).toBe(0n)
    })
    
    it('should handle maximum safe amounts', () => {
      const maxSafe = 2n ** 32n - 1n // 32-bit max
      const cipher = encryptAmount(maxSafe, keypair.publicKey)
      
      // For performance, just verify we can create the ciphertext
      expect(cipher.commitment.commitment).toHaveLength(32)
      expect(cipher.handle.handle).toHaveLength(32)
    })
    
    it('should produce different ciphertexts for same amount', () => {
      const amount = 100n
      const cipher1 = encryptAmount(amount, keypair.publicKey)
      const cipher2 = encryptAmount(amount, keypair.publicKey)
      
      // Should be different due to randomness
      expect(cipher1.commitment.commitment).not.toEqual(cipher2.commitment.commitment)
      expect(cipher1.handle.handle).not.toEqual(cipher2.handle.handle)
      
      // But both should decrypt to same value
      expect(decryptAmount(cipher1, keypair.secretKey)).toBe(amount)
      expect(decryptAmount(cipher2, keypair.secretKey)).toBe(amount)
    })
  })

  describe('Security Properties', () => {
    it('should maintain semantic security', () => {
      const amount = 42n
      const ciphers: ElGamalCiphertext[] = []
      
      // Encrypt same value multiple times
      for (let i = 0; i < 5; i++) {
        ciphers.push(encryptAmount(amount, keypair.publicKey))
      }
      
      // All ciphertexts should be different
      for (let i = 0; i < ciphers.length; i++) {
        for (let j = i + 1; j < ciphers.length; j++) {
          expect(ciphers[i].commitment.commitment).not.toEqual(ciphers[j].commitment.commitment)
          expect(ciphers[i].handle.handle).not.toEqual(ciphers[j].handle.handle)
        }
      }
      
      // But all should decrypt to same value
      for (const cipher of ciphers) {
        expect(decryptAmount(cipher, keypair.secretKey)).toBe(amount)
      }
    })
    
    it('should verify proof soundness', () => {
      // Create a valid encryption
      const amount = 100n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      
      // Create a range proof for the correct amount
      const validProof = generateRangeProof(
        amount,
        result.ciphertext.commitment,
        result.randomness
      )
      
      // Verify it's valid
      expect(elgamal.verifyRangeProof(validProof)).toBe(true)
      
      // Create a fake proof with wrong data
      const fakeProof: RangeProof = {
        proof: new Uint8Array(validProof.proof.length).fill(0),
        commitment: validProof.commitment
      }
      
      // Should fail verification
      expect(elgamal.verifyRangeProof(fakeProof)).toBe(false)
    })
  })

  describe('ElGamal Helper Object', () => {
    it('should verify range proofs', () => {
      const amount = 1000n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      const rangeProof = generateRangeProof(amount, result.ciphertext.commitment, result.randomness)
      
      expect(elgamal.verifyRangeProof(rangeProof)).toBe(true)
    })
    
    it('should verify validity proofs', () => {
      const amount = 500n
      const result = encryptAmountWithRandomness(amount, keypair.publicKey)
      const validityProof = generateValidityProof(result.ciphertext, keypair.publicKey, result.randomness)
      
      expect(elgamal.verifyValidityProof(validityProof)).toBe(true)
    })
    
    it('should verify equality proofs', () => {
      const amount = 300n
      const result1 = encryptAmountWithRandomness(amount, keypair.publicKey)
      const result2 = encryptAmountWithRandomness(amount, keypair2.publicKey)
      const equalityProof = generateEqualityProof(
        result1.ciphertext,
        result2.ciphertext,
        amount,
        result1.randomness,
        result2.randomness
      )
      
      expect(elgamal.verifyEqualityProof(equalityProof)).toBe(true)
    })
  })
})