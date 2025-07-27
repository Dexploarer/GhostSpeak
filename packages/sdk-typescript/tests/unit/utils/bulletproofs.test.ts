/**
 * Comprehensive tests for Bulletproofs range proof implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateBulletproof,
  verifyBulletproof,
  serializeBulletproof,
  deserializeBulletproof,
  type Bulletproof
} from '../../../src/utils/bulletproofs.js'
import { ed25519 } from '@noble/curves/ed25519'
import { bytesToNumberLE } from '@noble/curves/abstract/utils'

// Mock crypto for consistent test results
const mockRandomBytes = vi.fn()
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockRandomBytes,
    subtle: {
      digest: vi.fn(async () => new ArrayBuffer(32))
    }
  },
  writable: true,
  configurable: true
})

describe('Bulletproofs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default to random values
    mockRandomBytes.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    })
  })

  describe('generateBulletproof', () => {
    it('should generate a valid bulletproof for value 0', () => {
      const value = 0n
      const blindingFactor = 12345n
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value)
        .add(ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867').multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      expect(proof).toBeDefined()
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
      expect(proof.innerProduct.a).toBeTypeOf('bigint')
      expect(proof.innerProduct.b).toBeTypeOf('bigint')
    })

    it('should generate a valid bulletproof for maximum value', () => {
      const value = (1n << 64n) - 1n // 2^64 - 1
      const blindingFactor = 67890n
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      expect(proof).toBeDefined()
      expect(proof.innerProduct.L.length).toBeGreaterThan(0)
      expect(proof.innerProduct.R.length).toBe(proof.innerProduct.L.length)
    })

    it('should generate different proofs for same value with different randomness', () => {
      const value = 42n
      const blindingFactor = 11111n
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
      
      const proof1 = generateBulletproof(value, commitment, blindingFactor)
      
      // Change randomness for second proof
      mockRandomBytes.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (i * 7 + 13) % 256
        }
        return array
      })
      
      const proof2 = generateBulletproof(value, commitment, blindingFactor)
      
      // Proofs should be different due to different randomness
      expect(proof1.A).not.toEqual(proof2.A)
      expect(proof1.S).not.toEqual(proof2.S)
    })

    it('should throw error for negative value', () => {
      const value = -1n
      const blindingFactor = 12345n
      const commitment = ed25519.ExtendedPoint.ZERO
      
      expect(() => generateBulletproof(value, commitment, blindingFactor))
        .toThrow('Value out of range')
    })

    it('should throw error for value >= 2^64', () => {
      const value = 1n << 64n // 2^64
      const blindingFactor = 12345n
      const commitment = ed25519.ExtendedPoint.ZERO
      
      expect(() => generateBulletproof(value, commitment, blindingFactor))
        .toThrow('Value out of range')
    })

    it('should handle edge case values correctly', () => {
      const testCases = [
        1n,                    // Minimum non-zero
        (1n << 32n) - 1n,     // 2^32 - 1
        1n << 32n,            // 2^32
        (1n << 63n) - 1n,     // 2^63 - 1
        1n << 63n,            // 2^63
      ]
      
      const blindingFactor = 99999n
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      
      for (const value of testCases) {
        const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
        const proof = generateBulletproof(value, commitment, blindingFactor)
        expect(proof).toBeDefined()
        expect(proof.innerProduct.L.length).toBe(6) // log2(64) = 6 rounds
      }
    })
  })

  describe('verifyBulletproof', () => {
    it('should verify a valid proof', () => {
      const value = 1234567890n
      const blindingFactor = 54321n
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      const isValid = verifyBulletproof(proof, commitment)
      
      expect(isValid).toBe(true)
    })

    it('should reject proof with wrong commitment', () => {
      const value = 100n
      const blindingFactor = 200n
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      // Wrong commitment (different value)
      const wrongCommitment = ed25519.ExtendedPoint.BASE.multiply(101n).add(H.multiply(blindingFactor))
      const isValid = verifyBulletproof(proof, wrongCommitment)
      
      expect(isValid).toBe(false)
    })

    it('should reject proof with tampered components', () => {
      const value = 777n
      const blindingFactor = 888n
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      // Test tampering with each component
      const tamperTests = [
        () => { proof.A[0] ^= 0x01 },              // Flip bit in A
        () => { proof.S[0] ^= 0x01 },              // Flip bit in S
        () => { proof.T1[0] ^= 0x01 },             // Flip bit in T1
        () => { proof.T2[0] ^= 0x01 },             // Flip bit in T2
        () => { proof.taux += 1n },                // Modify taux
        () => { proof.mu += 1n },                  // Modify mu
        () => { proof.tx += 1n },                  // Modify tx
        () => { proof.innerProduct.a += 1n },      // Modify inner product a
        () => { proof.innerProduct.b += 1n },      // Modify inner product b
        () => { proof.innerProduct.L[0][0] ^= 0x01 }, // Flip bit in L
        () => { proof.innerProduct.R[0][0] ^= 0x01 }, // Flip bit in R
      ]
      
      for (const tamper of tamperTests) {
        const proofCopy = JSON.parse(JSON.stringify(proof))
        // Restore Uint8Arrays
        proofCopy.A = new Uint8Array(Object.values(proofCopy.A))
        proofCopy.S = new Uint8Array(Object.values(proofCopy.S))
        proofCopy.T1 = new Uint8Array(Object.values(proofCopy.T1))
        proofCopy.T2 = new Uint8Array(Object.values(proofCopy.T2))
        proofCopy.innerProduct.L = proofCopy.innerProduct.L.map((l: any) => new Uint8Array(Object.values(l)))
        proofCopy.innerProduct.R = proofCopy.innerProduct.R.map((r: any) => new Uint8Array(Object.values(r)))
        
        tamper.call(proofCopy)
        const isValid = verifyBulletproof(proofCopy, commitment)
        expect(isValid).toBe(false)
      }
    })

    it('should handle invalid proof data gracefully', () => {
      const commitment = ed25519.ExtendedPoint.BASE
      
      // Invalid proof with wrong-sized components
      const invalidProof: Bulletproof = {
        A: new Uint8Array(31),        // Wrong size
        S: new Uint8Array(32),
        T1: new Uint8Array(32),
        T2: new Uint8Array(32),
        taux: 0n,
        mu: 0n,
        tx: 0n,
        innerProduct: {
          L: [],
          R: [],
          a: 0n,
          b: 0n
        }
      }
      
      const isValid = verifyBulletproof(invalidProof, commitment)
      expect(isValid).toBe(false)
    })

    it('should verify proofs for various values', () => {
      const testValues = [0n, 1n, 255n, 256n, 65535n, 65536n, (1n << 32n) - 1n]
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      
      for (const value of testValues) {
        const blindingFactor = 12345n + value
        const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
        
        const proof = generateBulletproof(value, commitment, blindingFactor)
        const isValid = verifyBulletproof(proof, commitment)
        
        expect(isValid).toBe(true)
      }
    })
  })

  describe('serializeBulletproof and deserializeBulletproof', () => {
    it('should correctly serialize and deserialize a bulletproof', () => {
      const value = 999999n
      const blindingFactor = 111111n
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
      
      const originalProof = generateBulletproof(value, commitment, blindingFactor)
      const serialized = serializeBulletproof(originalProof)
      const deserialized = deserializeBulletproof(serialized)
      
      // Check all components match
      expect(deserialized.A).toEqual(originalProof.A)
      expect(deserialized.S).toEqual(originalProof.S)
      expect(deserialized.T1).toEqual(originalProof.T1)
      expect(deserialized.T2).toEqual(originalProof.T2)
      expect(deserialized.taux).toBe(originalProof.taux)
      expect(deserialized.mu).toBe(originalProof.mu)
      expect(deserialized.tx).toBe(originalProof.tx)
      expect(deserialized.innerProduct.L).toEqual(originalProof.innerProduct.L)
      expect(deserialized.innerProduct.R).toEqual(originalProof.innerProduct.R)
      expect(deserialized.innerProduct.a).toBe(originalProof.innerProduct.a)
      expect(deserialized.innerProduct.b).toBe(originalProof.innerProduct.b)
      
      // Deserialized proof should still verify
      const isValid = verifyBulletproof(deserialized, commitment)
      expect(isValid).toBe(true)
    })

    it('should calculate correct serialization size', () => {
      const value = 42n
      const blindingFactor = 84n
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      const serialized = serializeBulletproof(proof)
      
      // Expected size: 4*32 (A,S,T1,T2) + 3*32 (taux,mu,tx) + 2*32 (a,b) + 2*rounds*32 (L,R)
      const rounds = proof.innerProduct.L.length
      const expectedSize = 32 * 4 + 32 * 3 + 32 * 2 + 32 * 2 * rounds
      
      expect(serialized.length).toBe(expectedSize)
    })

    it('should throw error for invalid serialized data', () => {
      // Too short data
      const shortData = new Uint8Array(100)
      expect(() => deserializeBulletproof(shortData)).toThrow('Invalid bulletproof data')
      
      // Valid minimum size
      const validData = new Uint8Array(224)
      const deserialized = deserializeBulletproof(validData)
      expect(deserialized).toBeDefined()
    })

    it('should preserve proof validity through serialization', () => {
      const testCases = [0n, 1n, 1000n, (1n << 32n), (1n << 63n)]
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      
      for (const value of testCases) {
        const blindingFactor = 555555n
        const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
        
        const proof = generateBulletproof(value, commitment, blindingFactor)
        const serialized = serializeBulletproof(proof)
        const deserialized = deserializeBulletproof(serialized)
        
        const isValid = verifyBulletproof(deserialized, commitment)
        expect(isValid).toBe(true)
      }
    })
  })

  describe('ProofTranscript (Fiat-Shamir)', () => {
    it('should produce deterministic challenges', () => {
      // Set deterministic randomness
      let counter = 0
      mockRandomBytes.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (counter + i) % 256
        }
        counter++
        return array
      })
      
      const value = 12345n
      const blindingFactor = 67890n
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
      
      const proof1 = generateBulletproof(value, commitment, blindingFactor)
      
      // Reset counter for second proof
      counter = 0
      const proof2 = generateBulletproof(value, commitment, blindingFactor)
      
      // With same randomness, proofs should be identical
      expect(proof1.A).toEqual(proof2.A)
      expect(proof1.S).toEqual(proof2.S)
      expect(proof1.T1).toEqual(proof2.T1)
      expect(proof1.T2).toEqual(proof2.T2)
    })
  })

  describe('Vector operations', () => {
    it('should handle vector operations correctly in proof generation', () => {
      // Test with power-of-2 values which have simple binary representations
      const testValues = [0n, 1n, 2n, 4n, 8n, 16n, 32n, 64n, 128n, 256n]
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      
      for (const value of testValues) {
        const blindingFactor = 10000n
        const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
        
        const proof = generateBulletproof(value, commitment, blindingFactor)
        const isValid = verifyBulletproof(proof, commitment)
        
        expect(isValid).toBe(true)
      }
    })

    it('should handle inner product argument correctly', () => {
      const value = 0xDEADBEEFn
      const blindingFactor = 0xCAFEBABEn
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
      
      const proof = generateBulletproof(value, commitment, blindingFactor)
      
      // Inner product proof should have log2(64) = 6 rounds
      expect(proof.innerProduct.L.length).toBe(6)
      expect(proof.innerProduct.R.length).toBe(6)
      
      // Each L and R should be 32 bytes (compressed point)
      for (let i = 0; i < 6; i++) {
        expect(proof.innerProduct.L[i]).toHaveLength(32)
        expect(proof.innerProduct.R[i]).toHaveLength(32)
      }
    })
  })

  describe('Performance and stress tests', () => {
    it('should generate and verify proofs efficiently', () => {
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const numTests = 10
      const totalStartTime = Date.now()
      
      for (let i = 0; i < numTests; i++) {
        const value = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
        const blindingFactor = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
        const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
        
        const genStart = Date.now()
        const proof = generateBulletproof(value, commitment, blindingFactor)
        const genTime = Date.now() - genStart
        
        const verifyStart = Date.now()
        const isValid = verifyBulletproof(proof, commitment)
        const verifyTime = Date.now() - verifyStart
        
        expect(isValid).toBe(true)
        
        // Performance expectations (adjust based on your requirements)
        expect(genTime).toBeLessThan(5000) // Generation should take less than 5 seconds
        expect(verifyTime).toBeLessThan(2000) // Verification should take less than 2 seconds
      }
      
      const totalTime = Date.now() - totalStartTime
      expect(totalTime).toBeLessThan(numTests * 7000) // Total should be reasonable
    })

    it('should handle extreme blinding factors', () => {
      const value = 123456789n
      const extremeBlindingFactors = [
        0n,
        1n,
        ed25519.CURVE.n - 1n,  // Maximum valid scalar
        (1n << 255n) - 1n,      // Large number
      ]
      
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      
      for (const blindingFactor of extremeBlindingFactors) {
        const normalizedBlinding = blindingFactor % ed25519.CURVE.n
        const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(normalizedBlinding))
        
        const proof = generateBulletproof(value, commitment, normalizedBlinding)
        const isValid = verifyBulletproof(proof, commitment)
        
        expect(isValid).toBe(true)
      }
    })
  })

  describe('Binary representation edge cases', () => {
    it('should handle values with specific bit patterns', () => {
      const H = ed25519.ExtendedPoint.fromHex('2c9e8dc606049a0dd3b4a8cbba12b26b8bc95a6ba4bdfa87833f69ba88f7d867')
      const blindingFactor = 777777n
      
      const bitPatterns = [
        0b0101010101010101n,          // Alternating bits
        0b1111111111111111n,          // All ones (16 bits)
        (1n << 64n) - 1n - 255n,      // Almost maximum with some zeros
        0x8000000000000000n,          // Only highest bit set
        0xAAAAAAAAAAAAAAAAn,          // Alternating bytes
      ]
      
      for (const value of bitPatterns) {
        const commitment = ed25519.ExtendedPoint.BASE.multiply(value).add(H.multiply(blindingFactor))
        const proof = generateBulletproof(value, commitment, blindingFactor)
        const isValid = verifyBulletproof(proof, commitment)
        
        expect(isValid).toBe(true)
      }
    })
  })
})