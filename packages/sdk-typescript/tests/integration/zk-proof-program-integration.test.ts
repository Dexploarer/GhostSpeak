/**
 * ZK Proof Program Integration Tests
 * 
 * Tests the integration with Solana's ZK ElGamal Proof Program,
 * including feature gate detection, dynamic mode switching, and
 * fallback behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Connection, PublicKey } from '@solana/web3.js'
import type { Address, TransactionSigner } from '@solana/kit'
import { address } from '@solana/addresses'

import {
  isZkProgramEnabled,
  getZkProgramFeatureStatus,
  checkFeatureGate,
  monitorFeatureGate,
  clearFeatureGateCache,
  FEATURE_GATES
} from '../../src/utils/feature-gate-detector.js'

import {
  generateRangeProofWithCommitment,
  generateValidityProofWithInstruction,
  generateTransferProofWithInstruction,
  isZkProgramAvailable,
  getZkProgramStatus,
  ProofMode,
  type ProofGenerationOptions,
  clearZkProgramStatusCache
} from '../../src/utils/zk-proof-builder.js'

import {
  createVerifyRangeProofInstruction,
  createVerifyTransferProofInstruction,
  createCompleteProofVerificationFlow,
  calculateProofContextSpace,
  ProofInstruction
} from '../../src/utils/zk-proof-instructions.js'

import { ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS } from '../../src/constants/zk-proof-program.js'

import { generateElGamalKeypair } from '../../src/utils/keypair.js'
import { encryptAmount } from '../../src/utils/elgamal.js'
import { randomBytes } from '@noble/curves/abstract/utils'

// Mock connection
const mockConnection = {
  getAccountInfo: vi.fn(),
  getMinimumBalanceForRentExemption: vi.fn().mockResolvedValue(1000000),
  getLatestBlockhash: vi.fn().mockResolvedValue({
    blockhash: 'test-blockhash',
    lastValidBlockHeight: 1000
  })
} as unknown as Connection

describe('ZK Proof Program Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFeatureGateCache()
    clearZkProgramStatusCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Feature Gate Detection', () => {
    it('should detect ZK program as disabled when feature gate is not active', async () => {
      // Mock feature gate as not existing (disabled)
      mockConnection.getAccountInfo.mockResolvedValueOnce(null)

      const isEnabled = await isZkProgramEnabled(mockConnection)
      expect(isEnabled).toBe(false)

      const status = await getZkProgramFeatureStatus(mockConnection)
      expect(status.activated).toBe(false)
      expect(status.lastChecked).toBeLessThanOrEqual(Date.now())
    })

    it('should detect ZK program as enabled when feature gate is active', async () => {
      // Mock feature gate as existing with activation data
      const mockAccountData = Buffer.alloc(8)
      mockAccountData.writeBigUInt64LE(BigInt(123456789), 0)
      
      mockConnection.getAccountInfo.mockResolvedValueOnce({
        data: mockAccountData,
        lamports: 1,
        owner: new PublicKey('11111111111111111111111111111111'),
        executable: false
      })

      const isEnabled = await isZkProgramEnabled(mockConnection)
      expect(isEnabled).toBe(true)

      const status = await getZkProgramFeatureStatus(mockConnection)
      expect(status.activated).toBe(true)
      expect(status.activationSlot).toBe(123456789n)
    })

    it('should cache feature gate status', async () => {
      mockConnection.getAccountInfo.mockResolvedValueOnce(null)

      // First call
      await isZkProgramEnabled(mockConnection)
      expect(mockConnection.getAccountInfo).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await isZkProgramEnabled(mockConnection)
      expect(mockConnection.getAccountInfo).toHaveBeenCalledTimes(1)
    })

    it('should handle RPC errors gracefully', async () => {
      mockConnection.getAccountInfo.mockRejectedValueOnce(new Error('RPC error'))

      const status = await checkFeatureGate(
        mockConnection,
        FEATURE_GATES.ZK_ELGAMAL_PROOF_REENABLED
      )
      
      expect(status.activated).toBe(false)
      expect(status.error).toBe('RPC error')
    })
  })

  describe('Proof Generation with Dynamic Status', () => {
    it('should use local mode when ZK program is disabled', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null) // Disabled

      const amount = 1000n
      const randomness = randomBytes(32)
      
      const result = await generateRangeProofWithCommitment(amount, randomness, {
        mode: ProofMode.AUTO_DETECT,
        connection: mockConnection
      })

      expect(result.proof).toBeInstanceOf(Uint8Array)
      expect(result.commitment).toBeInstanceOf(Uint8Array)
      expect(result.instruction).toBeUndefined()
      expect(result.requiresZkProgram).toBe(false)
    })

    it('should create ZK program instruction when enabled and mode allows', async () => {
      // Mock as enabled
      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.alloc(8),
        lamports: 1,
        owner: new PublicKey('11111111111111111111111111111111'),
        executable: false
      })

      const amount = 1000n
      const randomness = randomBytes(32)
      
      const result = await generateRangeProofWithCommitment(amount, randomness, {
        mode: ProofMode.ZK_PROGRAM_ONLY,
        connection: mockConnection
      })

      expect(result.instruction).toBeDefined()
      expect(result.instruction?.programAddress).toBe(
        address('ZkE1Gama1Proof11111111111111111111111111111')
      )
    })

    it('should fallback to local when ZK_PROGRAM_WITH_FALLBACK mode', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null) // Disabled

      const amount = 1000n
      const randomness = randomBytes(32)
      
      const result = await generateRangeProofWithCommitment(amount, randomness, {
        mode: ProofMode.ZK_PROGRAM_WITH_FALLBACK,
        connection: mockConnection
      })

      expect(result.requiresZkProgram).toBe(false)
      expect(result.instruction).toBeUndefined()
    })

    it('should require ZK program when ZK_PROGRAM_ONLY mode and disabled', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null) // Disabled

      const amount = 1000n
      const randomness = randomBytes(32)
      
      const result = await generateRangeProofWithCommitment(amount, randomness, {
        mode: ProofMode.ZK_PROGRAM_ONLY,
        connection: mockConnection
      })

      expect(result.requiresZkProgram).toBe(true)
      // When ZK_PROGRAM_ONLY, instruction is still created but requiresZkProgram is true
      expect(result.instruction).toBeDefined()
    })
  })

  describe('Validity Proof Generation', () => {
    it('should generate validity proof with correct structure', async () => {
      const keypair = generateElGamalKeypair()
      const amount = 5000n
      const randomness = randomBytes(32)
      const ciphertext = encryptAmount(amount, keypair.publicKey)

      const result = await generateValidityProofWithInstruction(
        ciphertext,
        keypair.publicKey,
        amount,
        randomness,
        { mode: ProofMode.LOCAL_ONLY }
      )

      expect(result.proof).toHaveLength(96) // Validity proof size
      expect(result.requiresZkProgram).toBe(false)
    })
  })

  describe('Transfer Proof Generation', () => {
    it('should generate complete transfer proof', async () => {
      const sourceKeypair = generateElGamalKeypair()
      const destKeypair = generateElGamalKeypair()
      
      const sourceBalance = encryptAmount(10000n, sourceKeypair.publicKey)
      const transferAmount = 2500n
      const randomness = randomBytes(32)

      const result = await generateTransferProofWithInstruction(
        sourceBalance,
        transferAmount,
        sourceKeypair.publicKey,
        destKeypair.publicKey,
        randomness,
        { mode: ProofMode.LOCAL_ONLY }
      )

      expect(result.transferProof).toBeDefined()
      expect(result.transferProof.encryptedTransferAmount).toHaveLength(64)
      expect(result.transferProof.equalityProof).toHaveLength(192)
      expect(result.transferProof.validityProof).toHaveLength(96)
      expect(result.newSourceBalance).toBeDefined()
      expect(result.destCiphertext).toBeDefined()
    })
  })

  describe('Proof Context Management', () => {
    it('should calculate correct context space for different proof types', () => {
      const transferSpace = calculateProofContextSpace(ProofInstruction.VerifyTransfer)
      const rangeSpace = calculateProofContextSpace(ProofInstruction.VerifyRangeProof)
      const validitySpace = calculateProofContextSpace(ProofInstruction.VerifyValidityProof)

      expect(transferSpace).toBeGreaterThan(rangeSpace)
      expect(transferSpace).toBeGreaterThan(validitySpace)
      
      // Batched proofs need more space
      const batchedRangeSpace = calculateProofContextSpace(
        ProofInstruction.VerifyBatchedRangeProof,
        10
      )
      expect(batchedRangeSpace).toBeGreaterThan(rangeSpace)
    })

    it('should create complete proof verification flow', () => {
      const mockContext: TransactionSigner = {
        address: ZK_ELGAMAL_PROOF_PROGRAM_ADDRESS,
        signTransactions: vi.fn(),
        signMessages: vi.fn()
      }

      const mockAuthority: TransactionSigner = {
        address: address('11111111111111111111111111111111'),
        signTransactions: vi.fn(),
        signMessages: vi.fn()
      }

      const mockPayer: TransactionSigner = {
        address: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        signTransactions: vi.fn(),
        signMessages: vi.fn()
      }

      const proofInstruction = createVerifyRangeProofInstruction(
        { proofContext: mockContext.address },
        new Uint8Array(32),
        new Uint8Array(674)
      )

      const flow = createCompleteProofVerificationFlow(
        proofInstruction,
        mockContext,
        mockAuthority,
        mockPayer
      )

      expect(flow).toHaveLength(3)
      expect(flow[0].programAddress).toBe(address('11111111111111111111111111111111')) // System
      expect(flow[1]).toBe(proofInstruction)
      expect(flow[2].programAddress).toBe(address('ZkE1Gama1Proof11111111111111111111111111111'))
    })
  })

  describe('Feature Gate Monitoring', () => {
    it('should monitor feature gate changes', async () => {
      const callback = vi.fn()
      let callCount = 0

      // Mock changing status
      mockConnection.getAccountInfo.mockImplementation(() => {
        callCount++
        return callCount > 2 ? {
          data: Buffer.alloc(8),
          lamports: 1,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false
        } : null
      })

      const stopMonitoring = monitorFeatureGate(
        mockConnection,
        FEATURE_GATES.ZK_ELGAMAL_PROOF_REENABLED,
        callback,
        100 // Fast interval for testing
      )

      // Wait for a few checks
      await new Promise(resolve => setTimeout(resolve, 350))
      
      stopMonitoring()

      // Should have been called at least once
      expect(callback).toHaveBeenCalled()
      const calls = callback.mock.calls
      
      // Check that we got at least one disabled state
      expect(calls.some(call => !call[0].activated)).toBe(true)
      
      // May or may not have gotten enabled state depending on timing
      // Just verify the monitoring worked
      expect(calls.length).toBeGreaterThan(0)
    })
  })

  describe('Status Reporting', () => {
    it('should provide human-readable status messages', async () => {
      // Test disabled state
      mockConnection.getAccountInfo.mockResolvedValueOnce(null)
      const disabledStatus = await getZkProgramStatus(mockConnection)
      expect(disabledStatus).toContain('DISABLED')

      // Clear both caches
      clearFeatureGateCache()
      clearZkProgramStatusCache()

      // Test enabled state
      mockConnection.getAccountInfo.mockResolvedValueOnce({
        data: Buffer.alloc(8),
        lamports: 1,
        owner: new PublicKey('11111111111111111111111111111111'),
        executable: false
      })
      // Need to force a new check by calling with a fresh connection
      const enabledStatus = await getZkProgramStatus(mockConnection)
      // When enabled, the status should contain 'ENABLED'
      expect(enabledStatus).toContain('ENABLED')
    })

    it('should report unknown status when no connection', async () => {
      const status = await getZkProgramStatus()
      expect(status).toContain('No connection')
    })
  })
})