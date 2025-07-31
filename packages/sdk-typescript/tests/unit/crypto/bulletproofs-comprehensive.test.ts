/**
 * Comprehensive Bulletproofs Tests
 * 
 * Tests bulletproof generation and verification for range proofs
 * used in confidential transfers.
 */

import { describe, it, expect } from 'vitest'
import {
  generateBulletproof,
  verifyBulletproof,
  serializeBulletproof,
  deserializeBulletproof,
  type Bulletproof
} from '../../../src/utils/bulletproofs.js'
import { ed25519 } from '@noble/curves/ed25519'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToNumberLE } from '@noble/curves/abstract/utils'

describe('Bulletproofs', () => {
  // Generator points
  const G = ed25519.ExtendedPoint.BASE
  
  // Generate H using hash-to-curve (must match implementation)
  function generateH(): typeof ed25519.ExtendedPoint.BASE {
    const gBytes = G.toRawBytes()
    let hash = sha256(gBytes)
    
    // Hash until we get a valid point
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      try {
        // Try to decode as a point
        return ed25519.ExtendedPoint.fromHex(Buffer.from(hash).toString('hex'))
      } catch {
        // If not valid, hash again
        hash = sha256(hash)
      }
    }
  }
  
  const H = generateH()
  
  describe('Proof Generation', () => {
    it('should generate valid bulletproof for small values', () => {
      const value = 100n
      const blindingFactor = 123n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      expect(proof.A).toBeInstanceOf(Uint8Array)
      expect(proof.A).toHaveLength(32)
      expect(proof.S).toBeInstanceOf(Uint8Array)
      expect(proof.S).toHaveLength(32)
      expect(proof.T1).toBeInstanceOf(Uint8Array)
      expect(proof.T1).toHaveLength(32)
      expect(proof.T2).toBeInstanceOf(Uint8Array)
      expect(proof.T2).toHaveLength(32)
      expect(proof.taux).toBeTypeOf('bigint')
      expect(proof.mu).toBeTypeOf('bigint')
      expect(proof.tx).toBeTypeOf('bigint')
      expect(proof.innerProduct).toBeDefined()
      expect(proof.innerProduct.L).toBeInstanceOf(Array)
      expect(proof.innerProduct.R).toBeInstanceOf(Array)
    })
    
    it('should generate valid bulletproof for zero', () => {
      const value = 0n
      const blindingFactor = 456n
      // For zero value, commitment is just blindingFactor * H
      const commitment = H.multiply(blindingFactor)
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      expect(proof).toBeDefined()
      // Note: tx is not necessarily 0 for value 0
      // When value = 0, tx = -z³·n (mod p) which is non-zero
      expect(proof.tx).toBeTypeOf('bigint')
    })
    
    it('should generate valid bulletproof for maximum 64-bit value', () => {
      const value = (1n << 64n) - 1n // 2^64 - 1
      const blindingFactor = 789n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      expect(proof).toBeDefined()
      expect(proof.innerProduct.L.length).toBeGreaterThan(0)
    })
    
    it('should throw for negative values', () => {
      const value = -1n
      const blindingFactor = 123n
      // Use H.multiply for zero value commitment
      const commitment = H.multiply(blindingFactor)
      
      expect(() => generateBulletproof(value, commitment, blindingFactor)).toThrow('Value out of range')
    })
    
    it('should throw for values exceeding 64 bits', () => {
      const value = 1n << 64n // 2^64
      const blindingFactor = 123n
      // Use H.multiply for zero value commitment
      const commitment = H.multiply(blindingFactor)
      
      expect(() => generateBulletproof(value, commitment, blindingFactor)).toThrow('Value out of range')
    })
    
    it('should generate different proofs for same value with different randomness', () => {
      const value = 100n
      const blindingFactor1 = 123n
      const blindingFactor2 = 456n
      const commitment1 = G.multiply(value).add(H.multiply(blindingFactor1))
      const commitment2 = G.multiply(value).add(H.multiply(blindingFactor2))
      
      const proof1 = generateBulletproof(value, commitment1, blindingFactor1)
      const proof2 = generateBulletproof(value, commitment2, blindingFactor2)
      
      // Proofs should be different
      expect(proof1.A).not.toEqual(proof2.A)
      expect(proof1.S).not.toEqual(proof2.S)
      expect(proof1.taux).not.toBe(proof2.taux)
      expect(proof1.mu).not.toBe(proof2.mu)
    })
  })
  
  describe('Proof Verification', () => {
    it('should verify valid bulletproof', () => {
      const value = 1000n
      const blindingFactor = 999n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      const isValid = verifyBulletproof(proof, commitment)
      
      expect(isValid).toBe(true)
    })
    
    it('should reject proof with wrong commitment', () => {
      const value = 1000n
      const blindingFactor = 999n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      const wrongCommitment = G.multiply(value + 1n).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      const isValid = verifyBulletproof(proof, wrongCommitment)
      
      expect(isValid).toBe(false)
    })
    
    it('should reject proof with tampered data', () => {
      const value = 1000n
      const blindingFactor = 999n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      // Tamper with proof
      const tamperedProof: Bulletproof = {
        ...proof,
        taux: proof.taux + 1n // Change a scalar
      }
      
      const isValid = verifyBulletproof(tamperedProof, commitment)
      expect(isValid).toBe(false)
    })
    
    it('should reject proof with invalid curve points', () => {
      const value = 1000n
      const blindingFactor = 999n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      // Create invalid proof with bad curve point
      const tamperedProof: Bulletproof = {
        ...proof,
        A: new Uint8Array(32).fill(0) // Invalid curve point
      }
      
      const isValid = verifyBulletproof(tamperedProof, commitment)
      expect(isValid).toBe(false)
    })
  })
  
  describe('Serialization', () => {
    it('should serialize and deserialize bulletproof correctly', () => {
      const value = 12345n
      const blindingFactor = 54321n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      const serialized = serializeBulletproof(proof)
      const deserialized = deserializeBulletproof(serialized)
      
      expect(deserialized.A).toEqual(proof.A)
      expect(deserialized.S).toEqual(proof.S)
      expect(deserialized.T1).toEqual(proof.T1)
      expect(deserialized.T2).toEqual(proof.T2)
      expect(deserialized.taux).toBe(proof.taux)
      expect(deserialized.mu).toBe(proof.mu)
      expect(deserialized.tx).toBe(proof.tx)
      expect(deserialized.innerProduct.L).toEqual(proof.innerProduct.L)
      expect(deserialized.innerProduct.R).toEqual(proof.innerProduct.R)
      expect(deserialized.innerProduct.a).toBe(proof.innerProduct.a)
      expect(deserialized.innerProduct.b).toBe(proof.innerProduct.b)
    })
    
    it('should verify deserialized proof', () => {
      const value = 5000n
      const blindingFactor = 7777n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      const serialized = serializeBulletproof(proof)
      const deserialized = deserializeBulletproof(serialized)
      
      const isValid = verifyBulletproof(deserialized, commitment)
      expect(isValid).toBe(true)
    })
    
    it('should have correct serialized size', () => {
      const value = 1000n
      const blindingFactor = 999n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      const serialized = serializeBulletproof(proof)
      
      // Expected size: 4*32 (A,S,T1,T2) + 3*32 (scalars) + inner product proof
      // Inner product has log2(64) = 6 rounds, each with 2*32 bytes (L,R) + 2*32 (a,b)
      const expectedMinSize = 4 * 32 + 3 * 32 + 6 * 2 * 32 + 2 * 32
      expect(serialized.length).toBeGreaterThanOrEqual(expectedMinSize)
    })
    
    it('should throw on invalid serialized data', () => {
      const tooShort = new Uint8Array(100) // Too short for valid proof
      expect(() => deserializeBulletproof(tooShort)).toThrow()
    })
  })
  
  describe('Inner Product Proof', () => {
    it('should have correct number of rounds', () => {
      const value = 1000n
      const blindingFactor = 999n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      // For 64-bit range proof, we expect log2(64) = 6 rounds
      expect(proof.innerProduct.L).toHaveLength(6)
      expect(proof.innerProduct.R).toHaveLength(6)
    })
    
    it('should have valid curve points in inner product proof', () => {
      const value = 1000n
      const blindingFactor = 999n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      // All L and R points should be valid curve points
      for (const L of proof.innerProduct.L) {
        expect(() => ed25519.ExtendedPoint.fromHex(Buffer.from(L).toString('hex'))).not.toThrow()
      }
      
      for (const R of proof.innerProduct.R) {
        expect(() => ed25519.ExtendedPoint.fromHex(Buffer.from(R).toString('hex'))).not.toThrow()
      }
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle all powers of 2', () => {
      const blindingFactor = 12345n
      
      for (let i = 0; i < 64; i++) {
        const value = 1n << BigInt(i)
        const commitment = G.multiply(value).add(H.multiply(blindingFactor))
        
        const proof = generateBulletproof(value, commitment, blindingFactor)
        const isValid = verifyBulletproof(proof, commitment)
        
        expect(isValid).toBe(true)
      }
    })
    
    it('should handle consecutive values', () => {
      const blindingFactor = 54321n
      
      for (let value = 0n; value < 10n; value++) {
        // Handle zero value case
        const commitment = value === 0n 
          ? H.multiply(blindingFactor)
          : G.multiply(value).add(H.multiply(blindingFactor))
        
        const proof = generateBulletproof(value, commitment, blindingFactor)
        const isValid = verifyBulletproof(proof, commitment)
        
        expect(isValid).toBe(true)
      }
    })
    
    it('should handle maximum curve scalar', () => {
      const value = 1000n
      const maxScalar = ed25519.CURVE.n - 1n
      const commitment = G.multiply(value).add(H.multiply(maxScalar))
      
      const proof = generateBulletproof(value, commitment, maxScalar)
      const isValid = verifyBulletproof(proof, commitment)
      
      expect(isValid).toBe(true)
    })
  })
  
  describe('Performance', () => {
    it('should generate proof in reasonable time', () => {
      const value = 123456789n
      const blindingFactor = 987654321n
      const commitment = G.multiply(value).add(H.multiply(blindingFactor))
      
      const startTime = performance.now()
      const proof = generateBulletproof(value, commitment, blindingFactor)
      const endTime = performance.now()
      
      const generationTime = endTime - startTime
      expect(generationTime).toBeLessThan(1500) // Should take less than 1.5 seconds
      
      const verifyStartTime = performance.now()
      const isValid = verifyBulletproof(proof, commitment)
      const verifyEndTime = performance.now()
      
      const verificationTime = verifyEndTime - verifyStartTime
      expect(verificationTime).toBeLessThan(100) // Verification should be fast
      expect(isValid).toBe(true)
    })
  })
})