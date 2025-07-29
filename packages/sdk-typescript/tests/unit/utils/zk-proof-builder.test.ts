import { describe, it, expect, beforeEach } from 'vitest'
import type { ElGamalCiphertext, ElGamalPubkey } from '../../../src/utils/elgamal.js'
import { ed25519 } from '@noble/curves/ed25519'
import { randomBytes, bytesToNumberLE } from '@noble/curves/abstract/utils'

import { 
  generateRangeProofWithCommitment,
  verifyRangeProofLocal,
  generateValidityProofWithInstruction,
  generateTransferProofWithInstruction,
  isZkProgramAvailable,
  getZkProgramStatus,
  ProofMode,
  type ProofGenerationResult,
  type ProofVerificationResult
} from '../../../src/utils/zk-proof-builder.js'

describe('ZK Proof Builder', () => {
  describe('Program Status', () => {
    it('should report ZK program as disabled', async () => {
      const isAvailable = await isZkProgramAvailable()
      expect(isAvailable).toBe(false)
    })

    it('should return proper status message', async () => {
      const status = await getZkProgramStatus()
      expect(status).toContain('No connection')
    })
  })

  describe('Range Proof Generation', () => {
    it('should generate valid range proof for small amounts', async () => {
      const amount = 100n
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      const result = await generateRangeProofWithCommitment(amount, randomness)
      
      expect(result.proof).toBeInstanceOf(Uint8Array)
      expect(result.proof).toHaveLength(674) // Standard bulletproof size
      expect(result.commitment).toBeInstanceOf(Uint8Array)
      expect(result.commitment).toHaveLength(32)
      expect(result.requiresZkProgram).toBe(false)
      expect(result.instruction).toBeUndefined()
    })

    it('should generate valid range proof for large amounts', async () => {
      const amount = (1n << 63n) // Large but valid amount
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      const result = await generateRangeProofWithCommitment(amount, randomness)
      
      expect(result.proof).toBeInstanceOf(Uint8Array)
      expect(result.proof).toHaveLength(674)
      expect(result.commitment).toBeInstanceOf(Uint8Array)
      expect(result.commitment).toHaveLength(32)
    })

    it('should reject negative amounts', async () => {
      const amount = -1n
      const randomness = randomBytes(32)
      
      await expect(generateRangeProofWithCommitment(amount, randomness))
        .rejects.toThrow('Amount must be in range [0, 2^64)')
    })

    it('should reject amounts exceeding 64 bits', async () => {
      const amount = 1n << 64n
      const randomness = randomBytes(32)
      
      await expect(generateRangeProofWithCommitment(amount, randomness))
        .rejects.toThrow('Amount must be in range [0, 2^64)')
    })

    it('should reject zero randomness', async () => {
      const amount = 100n
      const randomness = new Uint8Array(32) // All zeros
      
      await expect(generateRangeProofWithCommitment(amount, randomness))
        .rejects.toThrow('Invalid randomness: gamma cannot be zero')
    })

    it('should handle different proof modes', async () => {
      const amount = 100n
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      // Test LOCAL_ONLY mode
      const localResult = await generateRangeProofWithCommitment(amount, randomness, { mode: ProofMode.LOCAL_ONLY })
      expect(localResult.requiresZkProgram).toBe(false)
      expect(localResult.instruction).toBeUndefined()
      
      // Test ZK_PROGRAM_ONLY mode (should still work but flag as requiring ZK program)
      const zkOnlyResult = await generateRangeProofWithCommitment(amount, randomness, { mode: ProofMode.ZK_PROGRAM_ONLY })
      expect(zkOnlyResult.requiresZkProgram).toBe(true)
      expect(zkOnlyResult.instruction).toBeDefined() // Creates instruction even when disabled
      
      // Test ZK_PROGRAM_WITH_FALLBACK mode
      const fallbackResult = await generateRangeProofWithCommitment(amount, randomness, { mode: ProofMode.ZK_PROGRAM_WITH_FALLBACK })
      expect(fallbackResult.requiresZkProgram).toBe(false)
      expect(fallbackResult.instruction).toBeUndefined()
    })
  })

  describe('Range Proof Verification', () => {
    it('should verify valid range proof', async () => {
      const amount = 1000n
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      const proofResult = await generateRangeProofWithCommitment(amount, randomness)
      const verifyResult = verifyRangeProofLocal(proofResult.proof, proofResult.commitment!)
      
      expect(verifyResult.valid).toBe(true)
      expect(verifyResult.usedFallback).toBe(true)
      expect(verifyResult.error).toBeUndefined()
    })

    it('should reject proof with wrong size', () => {
      const wrongSizeProof = randomBytes(100) // Wrong size
      const commitment = randomBytes(32)
      
      const result = verifyRangeProofLocal(wrongSizeProof, commitment)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid proof size')
      expect(result.usedFallback).toBe(true)
    })

    it('should handle malformed proof gracefully', () => {
      const malformedProof = new Uint8Array(674).fill(255) // All 1s
      const commitment = randomBytes(32)
      
      const result = verifyRangeProofLocal(malformedProof, commitment)
      
      // Should still return a result, even if verification fails
      expect(result.usedFallback).toBe(true)
    })

    it('should verify proof components are valid curve points', async () => {
      const amount = 5000n
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      const proofResult = await generateRangeProofWithCommitment(amount, randomness)
      
      // Extract proof components and verify they're valid curve points
      const A = proofResult.proof.slice(0, 32)
      const S = proofResult.proof.slice(32, 64)
      const T1 = proofResult.proof.slice(64, 96)
      const T2 = proofResult.proof.slice(96, 128)
      
      // Should not throw when parsing as valid curve points
      expect(() => ed25519.ExtendedPoint.fromHex(Buffer.from(A).toString('hex'))).not.toThrow()
      expect(() => ed25519.ExtendedPoint.fromHex(Buffer.from(S).toString('hex'))).not.toThrow()
      expect(() => ed25519.ExtendedPoint.fromHex(Buffer.from(T1).toString('hex'))).not.toThrow()
      expect(() => ed25519.ExtendedPoint.fromHex(Buffer.from(T2).toString('hex'))).not.toThrow()
    })
  })

  describe('Validity Proof Generation', () => {
    let mockCiphertext: ElGamalCiphertext
    let mockPubkey: ElGamalPubkey
    
    beforeEach(() => {
      // Create mock ElGamal ciphertext
      const commitment = randomBytes(32)
      const handle = randomBytes(32)
      
      mockCiphertext = {
        commitment: { commitment },
        handle: { handle }
      }
      
      // Create mock public key (valid curve point)
      const privateKey = randomBytes(32)
      privateKey[0] &= 248
      privateKey[31] &= 127
      privateKey[31] |= 64
      const scalar = bytesToNumberLE(privateKey) % ed25519.CURVE.n
      const pubPoint = ed25519.ExtendedPoint.BASE.multiply(scalar)
      mockPubkey = pubPoint.toRawBytes()
    })

    it('should generate valid validity proof', async () => {
      const amount = 1000n
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      const result = await generateValidityProofWithInstruction(
        mockCiphertext,
        mockPubkey,
        amount,
        randomness
      )
      
      expect(result.proof).toBeInstanceOf(Uint8Array)
      expect(result.proof).toHaveLength(96) // Validity proof size
      expect(result.requiresZkProgram).toBe(false)
      expect(result.instruction).toBeUndefined()
    })

    it('should handle different proof modes for validity proofs', async () => {
      const amount = 100n
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      // Test LOCAL_ONLY mode
      const localResult = await generateValidityProofWithInstruction(
        mockCiphertext,
        mockPubkey,
        amount,
        randomness,
        { mode: ProofMode.LOCAL_ONLY }
      )
      expect(localResult.requiresZkProgram).toBe(false)
      expect(localResult.instruction).toBeUndefined()
      
      // Test ZK_PROGRAM_ONLY mode
      const zkOnlyResult = await generateValidityProofWithInstruction(
        mockCiphertext,
        mockPubkey,
        amount,
        randomness,
        { mode: ProofMode.ZK_PROGRAM_ONLY }
      )
      expect(zkOnlyResult.requiresZkProgram).toBe(true)
      expect(zkOnlyResult.instruction).toBeDefined()
    })

    it('should generate unique proofs for same input', async () => {
      const amount = 500n
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      const result1 = await generateValidityProofWithInstruction(
        mockCiphertext,
        mockPubkey,
        amount,
        randomness
      )
      
      const result2 = await generateValidityProofWithInstruction(
        mockCiphertext,
        mockPubkey,
        amount,
        randomness
      )
      
      // Proofs should be different due to random challenge
      expect(result1.proof).not.toEqual(result2.proof)
    })
  })

  describe('Transfer Proof Generation', () => {
    let sourceBalance: ElGamalCiphertext
    let sourcePubkey: ElGamalPubkey
    let destPubkey: ElGamalPubkey
    
    beforeEach(() => {
      // Create mock source balance
      const commitment = randomBytes(32)
      const handle = randomBytes(32)
      sourceBalance = {
        commitment: { commitment },
        handle: { handle }
      }
      
      // Create mock public keys
      const sourcePrivKey = randomBytes(32)
      sourcePrivKey[0] &= 248
      sourcePrivKey[31] &= 127
      sourcePrivKey[31] |= 64
      const sourceScalar = bytesToNumberLE(sourcePrivKey) % ed25519.CURVE.n
      const sourcePubPoint = ed25519.ExtendedPoint.BASE.multiply(sourceScalar)
      sourcePubkey = sourcePubPoint.toRawBytes()
      
      const destPrivKey = randomBytes(32)
      destPrivKey[0] &= 248
      destPrivKey[31] &= 127
      destPrivKey[31] |= 64
      const destScalar = bytesToNumberLE(destPrivKey) % ed25519.CURVE.n
      const destPubPoint = ed25519.ExtendedPoint.BASE.multiply(destScalar)
      destPubkey = destPubPoint.toRawBytes()
    })

    it('should generate valid transfer proof', async () => {
      const transferAmount = 250n
      const sourceRandomness = randomBytes(32)
      sourceRandomness[0] &= 248
      sourceRandomness[31] &= 127
      sourceRandomness[31] |= 64
      
      const result = await generateTransferProofWithInstruction(
        sourceBalance,
        transferAmount,
        sourcePubkey,
        destPubkey,
        sourceRandomness
      )
      
      expect(result.transferProof).toBeDefined()
      expect(result.transferProof.encryptedTransferAmount).toHaveLength(64)
      expect(result.transferProof.equalityProof).toHaveLength(192)
      expect(result.transferProof.validityProof).toHaveLength(96)
      expect(result.transferProof.rangeProof).toHaveLength(674)
      expect(result.newSourceBalance).toBeDefined()
      expect(result.destCiphertext).toBeDefined()
      expect(result.requiresZkProgram).toBe(false)
    })

    it('should handle different proof modes for transfer proofs', async () => {
      const transferAmount = 100n
      const sourceRandomness = randomBytes(32)
      sourceRandomness[0] &= 248
      sourceRandomness[31] &= 127
      sourceRandomness[31] |= 64
      
      // Test LOCAL_ONLY mode
      const localResult = await generateTransferProofWithInstruction(
        sourceBalance,
        transferAmount,
        sourcePubkey,
        destPubkey,
        sourceRandomness,
        { mode: ProofMode.LOCAL_ONLY }
      )
      expect(localResult.requiresZkProgram).toBe(false)
      expect(localResult.instruction).toBeUndefined()
      
      // Test ZK_PROGRAM_ONLY mode
      const zkOnlyResult = await generateTransferProofWithInstruction(
        sourceBalance,
        transferAmount,
        sourcePubkey,
        destPubkey,
        sourceRandomness,
        { mode: ProofMode.ZK_PROGRAM_ONLY }
      )
      expect(zkOnlyResult.requiresZkProgram).toBe(true)
      expect(zkOnlyResult.instruction).toBeDefined()
    })

    it('should generate valid ciphertext for destination', async () => {
      const transferAmount = 500n
      const sourceRandomness = randomBytes(32)
      sourceRandomness[0] &= 248
      sourceRandomness[31] &= 127
      sourceRandomness[31] |= 64
      
      const result = await generateTransferProofWithInstruction(
        sourceBalance,
        transferAmount,
        sourcePubkey,
        destPubkey,
        sourceRandomness
      )
      
      // Verify destination ciphertext structure
      expect(result.destCiphertext.commitment.commitment).toHaveLength(32)
      expect(result.destCiphertext.handle.handle).toHaveLength(32)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle maximum valid amount', async () => {
      const maxAmount = (1n << 64n) - 1n
      const randomness = randomBytes(32)
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      const result = await generateRangeProofWithCommitment(maxAmount, randomness)
      expect(result.proof).toHaveLength(674)
    })

    it('should handle very small randomness values', async () => {
      const amount = 100n
      const randomness = new Uint8Array(32)
      randomness[0] = 1 // Very small but non-zero
      
      // Should format randomness properly
      const result = await generateRangeProofWithCommitment(amount, randomness)
      expect(result.proof).toHaveLength(674)
    })

    it('should generate deterministic commitments for same inputs', async () => {
      const amount = 500n
      const randomness = new Uint8Array(32)
      randomness.fill(42) // Fixed randomness
      randomness[0] &= 248
      randomness[31] &= 127
      randomness[31] |= 64
      
      const result1 = await generateRangeProofWithCommitment(amount, randomness)
      const result2 = await generateRangeProofWithCommitment(amount, randomness)
      
      // Commitments should be identical for same inputs
      expect(result1.commitment).toEqual(result2.commitment)
    })
  })

  describe('Performance', () => {
    it('should generate range proofs efficiently', async () => {
      const iterations = 10
      const start = Date.now()
      
      for (let i = 0; i < iterations; i++) {
        const amount = BigInt((i + 1) * 1000) // Start from 1000, not 0
        const randomness = randomBytes(32)
        randomness[0] &= 248
        randomness[31] &= 127
        randomness[31] |= 64
        
        await generateRangeProofWithCommitment(amount, randomness)
      }
      
      const elapsed = Date.now() - start
      const avgTime = elapsed / iterations
      
      // Should generate proofs reasonably quickly (< 100ms per proof)
      expect(avgTime).toBeLessThan(100)
    })

    it('should verify range proofs efficiently', async () => {
      // Generate a set of proofs
      const proofs: { proof: Uint8Array; commitment: Uint8Array }[] = []
      
      for (let i = 0; i < 5; i++) {
        const amount = BigInt((i + 1) * 1000) // Start from 1000, not 0
        const randomness = randomBytes(32)
        randomness[0] &= 248
        randomness[31] &= 127
        randomness[31] |= 64
        
        const result = await generateRangeProofWithCommitment(amount, randomness)
        proofs.push({ proof: result.proof, commitment: result.commitment! })
      }
      
      // Time verification
      const start = Date.now()
      
      for (const { proof, commitment } of proofs) {
        verifyRangeProofLocal(proof, commitment)
      }
      
      const elapsed = Date.now() - start
      const avgTime = elapsed / proofs.length
      
      // Verification should be fast (< 10ms per proof)
      expect(avgTime).toBeLessThan(10)
    })
  })
})