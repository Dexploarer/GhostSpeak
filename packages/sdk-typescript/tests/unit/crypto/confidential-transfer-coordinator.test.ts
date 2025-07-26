import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import {
  prepareConfidentialTransfer,
  prepareBatchConfidentialTransfer,
  prepareConfidentialWithdrawal,
  createCleanupInstructions,
  estimateTransferComputeUnits,
  optimizeTransferBatches,
  type ConfidentialTransferOptions,
  type BatchTransferRequest,
  type TransferParticipant
} from '../../src/utils/confidential-transfer-coordinator'
import {
  generateElGamalKeypair,
  encryptAmount,
  type ElGamalKeypair,
  type ElGamalCiphertext
} from '../../src/utils/elgamal'
import { ProofInstruction } from '../../src/constants/zk-proof-program'
import type { TransactionSigner } from '@solana/kit'

// Mock the ElGamal module to control decryption results
vi.mock('../../src/utils/elgamal', async () => {
  const actual = await vi.importActual('../../src/utils/elgamal') as any
  return {
    ...actual,
    decryptAmount: vi.fn().mockReturnValue(1000000n), // Default balance
    generateTransferProof: vi.fn().mockImplementation((sourceBalance, amount, sourceKeypair, destPubkey) => ({
      transferProof: {
        encryptedTransferAmount: new Uint8Array(64),
        newSourceCommitment: new Uint8Array(32),
        equalityProof: new Uint8Array(192),
        validityProof: new Uint8Array(96),
        rangeProof: new Uint8Array(674)
      },
      newSourceBalance: actual.encryptAmount(900000n, sourceKeypair.publicKey),
      destCiphertext: actual.encryptAmount(amount, destPubkey)
    }))
  }
})

describe('Confidential Transfer Coordinator', () => {
  let sourceKeypair: ElGamalKeypair
  let destKeypair: ElGamalKeypair
  let sourceBalance: ElGamalCiphertext
  let payer: TransactionSigner

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Generate test keypairs
    sourceKeypair = generateElGamalKeypair()
    destKeypair = generateElGamalKeypair()
    
    // Create encrypted source balance
    sourceBalance = encryptAmount(1000000n, sourceKeypair.publicKey)
    
    // Create payer
    payer = {
      address: address('payer11111111111111111111111111111111111111'),
      signAndSendTransactions: async () => { throw new Error('Mock signer') }
    }
  })

  describe('prepareConfidentialTransfer', () => {
    it('should prepare a basic confidential transfer', async () => {
      const amount = 100000n
      
      const result = await prepareConfidentialTransfer(
        sourceKeypair,
        sourceBalance,
        destKeypair.publicKey,
        amount,
        payer
      )

      expect(result.instructions).toHaveLength(3) // init, verify, no auto-close
      expect(result.proofContexts).toHaveLength(1)
      expect(result.computeUnits).toBeGreaterThan(0)
      expect(result.newSourceBalance).toBeDefined()
      expect(result.destCiphertext).toBeDefined()
    })

    it('should handle auto-close proof contexts option', async () => {
      const amount = 50000n
      const options: ConfidentialTransferOptions = {
        autoCloseProofContexts: true
      }
      
      const result = await prepareConfidentialTransfer(
        sourceKeypair,
        sourceBalance,
        destKeypair.publicKey,
        amount,
        payer,
        options
      )

      expect(result.instructions).toHaveLength(3) // init, verify, close
      expect(result.proofContexts).toHaveLength(0) // Cleared after auto-close
    })

    it('should skip proof verification when requested', async () => {
      const amount = 25000n
      const options: ConfidentialTransferOptions = {
        skipProofVerification: true
      }
      
      const result = await prepareConfidentialTransfer(
        sourceKeypair,
        sourceBalance,
        destKeypair.publicKey,
        amount,
        payer,
        options
      )

      expect(result.instructions).toHaveLength(0) // No verification
      expect(result.proofContexts).toHaveLength(0)
    })

    it('should reject negative amounts', async () => {
      await expect(
        prepareConfidentialTransfer(
          sourceKeypair,
          sourceBalance,
          destKeypair.publicKey,
          -1000n,
          payer
        )
      ).rejects.toThrow('Transfer amount must be positive')
    })

    it('should reject insufficient balance', async () => {
      const { decryptAmount } = await import('../../src/utils/elgamal')
      vi.mocked(decryptAmount).mockReturnValueOnce(50n) // Low balance
      
      await expect(
        prepareConfidentialTransfer(
          sourceKeypair,
          sourceBalance,
          destKeypair.publicKey,
          100n,
          payer
        )
      ).rejects.toThrow('Insufficient balance for transfer')
    })
  })

  describe('prepareBatchConfidentialTransfer', () => {
    it('should prepare a batch transfer to multiple recipients', async () => {
      const recipients: TransferParticipant[] = [
        {
          address: address('recipient111111111111111111111111111111111'),
          elgamalPubkey: generateElGamalKeypair().publicKey,
          amount: 10000n
        },
        {
          address: address('recipient222222222222222222222222222222222'),
          elgamalPubkey: generateElGamalKeypair().publicKey,
          amount: 20000n
        },
        {
          address: address('recipient333333333333333333333333333333333'),
          elgamalPubkey: generateElGamalKeypair().publicKey,
          amount: 30000n
        }
      ]

      const request: BatchTransferRequest = {
        sourceKeypair,
        sourceBalance,
        recipients
      }

      const results = await prepareBatchConfidentialTransfer(request)

      expect(results).toHaveLength(1) // All fit in one transaction
      expect(results[0].instructions.length).toBeGreaterThan(recipients.length)
      expect(results[0].proofContexts).toHaveLength(recipients.length)
    })

    it('should split large batches across multiple transactions', async () => {
      const recipients: TransferParticipant[] = Array(20).fill(null).map((_, i) => ({
        address: address(`recipient${i}11111111111111111111111111111111`),
        elgamalPubkey: generateElGamalKeypair().publicKey,
        amount: 1000n
      }))

      const request: BatchTransferRequest = {
        sourceKeypair,
        sourceBalance,
        recipients,
        options: {
          maxComputeUnits: 500000 // Low limit to force splitting
        }
      }

      const results = await prepareBatchConfidentialTransfer(request)

      expect(results.length).toBeGreaterThan(1) // Split into multiple transactions
      
      // Verify all recipients are processed
      const totalInstructions = results.reduce((sum, r) => sum + r.instructions.length, 0)
      expect(totalInstructions).toBeGreaterThan(recipients.length)
    })

    it('should reject insufficient total balance', async () => {
      const { decryptAmount } = await import('../../src/utils/elgamal')
      vi.mocked(decryptAmount).mockReturnValueOnce(50000n) // Limited balance
      
      const recipients: TransferParticipant[] = [
        {
          address: address('recipient111111111111111111111111111111111'),
          elgamalPubkey: generateElGamalKeypair().publicKey,
          amount: 30000n
        },
        {
          address: address('recipient222222222222222222222222222222222'),
          elgamalPubkey: generateElGamalKeypair().publicKey,
          amount: 40000n // Total 70000 > 50000
        }
      ]

      const request: BatchTransferRequest = {
        sourceKeypair,
        sourceBalance,
        recipients
      }

      await expect(
        prepareBatchConfidentialTransfer(request)
      ).rejects.toThrow('Insufficient balance for batch transfer')
    })
  })

  describe('prepareConfidentialWithdrawal', () => {
    it('should prepare a withdrawal from confidential balance', async () => {
      const amount = 250000n
      
      const result = await prepareConfidentialWithdrawal(
        sourceKeypair,
        sourceBalance,
        amount,
        payer
      )

      expect(result.instructions).toHaveLength(2) // init, verify
      expect(result.proofContext).toBeDefined()
      expect(result.computeUnits).toBeGreaterThan(0)
      expect(result.newSourceBalance).toBeDefined()
      expect(result.withdrawAmount).toBe(amount)
    })

    it('should handle auto-close option for withdrawals', async () => {
      const amount = 100000n
      const options: ConfidentialTransferOptions = {
        autoCloseProofContexts: true
      }
      
      const result = await prepareConfidentialWithdrawal(
        sourceKeypair,
        sourceBalance,
        amount,
        payer,
        options
      )

      expect(result.instructions).toHaveLength(3) // init, verify, close
      expect(result.proofContext).toBeUndefined() // Cleared after auto-close
    })

    it('should reject insufficient balance for withdrawal', async () => {
      const { decryptAmount } = await import('../../src/utils/elgamal')
      vi.mocked(decryptAmount).mockReturnValueOnce(10000n)
      
      await expect(
        prepareConfidentialWithdrawal(
          sourceKeypair,
          sourceBalance,
          50000n,
          payer
        )
      ).rejects.toThrow('Insufficient balance for withdrawal')
    })
  })

  describe('Utility Functions', () => {
    describe('createCleanupInstructions', () => {
      it('should create cleanup instructions for proof contexts', () => {
        const proofContexts = [
          address('context1111111111111111111111111111111111'),
          address('context2222222222222222222222222222222222'),
          address('context3333333333333333333333333333333333')
        ]
        const authority = payer
        const rentRecipient = address('recipient1111111111111111111111111111111111')

        const instructions = createCleanupInstructions(proofContexts, authority, rentRecipient)

        expect(instructions).toHaveLength(3)
        instructions.forEach((instruction, i) => {
          expect(instruction.accounts[0].address).toBe(proofContexts[i])
          expect(instruction.accounts[1].address).toBe(authority.address)
          expect(instruction.accounts[2].address).toBe(rentRecipient)
        })
      })
    })

    describe('estimateTransferComputeUnits', () => {
      it('should estimate compute units for transfers', () => {
        const units = estimateTransferComputeUnits(5)
        
        expect(units).toBeGreaterThan(0)
        expect(units).toBeLessThan(1_400_000) // Max compute units
      })

      it('should include withdrawal compute units when requested', () => {
        const unitsWithoutWithdrawal = estimateTransferComputeUnits(3, false)
        const unitsWithWithdrawal = estimateTransferComputeUnits(3, true)
        
        expect(unitsWithWithdrawal).toBeGreaterThan(unitsWithoutWithdrawal)
      })
    })

    describe('optimizeTransferBatches', () => {
      it('should optimize transfers into batches', () => {
        const transfers = [
          10000n, 20000n, 30000n, 40000n, 50000n,
          60000n, 70000n, 80000n, 90000n, 100000n
        ]

        const batches = optimizeTransferBatches(transfers)

        expect(batches.length).toBeGreaterThan(0)
        
        // Verify all transfers are included
        const totalTransfers = batches.reduce((sum, batch) => sum + batch.length, 0)
        expect(totalTransfers).toBe(transfers.length)
        
        // Verify original values are preserved
        const flatBatches = batches.flat()
        expect(flatBatches).toEqual(transfers)
      })

      it('should respect max compute units limit', () => {
        const transfers = Array(100).fill(1000n) // Many transfers
        const maxComputeUnits = 200000 // Low limit

        const batches = optimizeTransferBatches(transfers, maxComputeUnits)

        expect(batches.length).toBeGreaterThan(1) // Should be split
        
        // Each batch should fit within compute limit
        batches.forEach(batch => {
          const estimatedUnits = batch.length * 115000 // Approximate units per transfer
          expect(estimatedUnits).toBeLessThanOrEqual(maxComputeUnits + 115000) // Allow one over
        })
      })
    })
  })
})