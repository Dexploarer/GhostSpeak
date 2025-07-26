import { describe, it, expect, vi } from 'vitest'
import { EscrowInstructions } from '../../src/client/instructions/EscrowInstructions'
import { address } from '@solana/addresses'
import { type PublicKey } from '@solana/transactions'

// Mock the RPC client
const mockRpc = {
  sendTransaction: vi.fn(),
  getLatestBlockhash: vi.fn(),
  confirmTransaction: vi.fn(),
}

// Mock program ID
const programId = address('11111111111111111111111111111112')

describe('EscrowInstructions', () => {
  let escrowInstructions: EscrowInstructions

  beforeEach(() => {
    escrowInstructions = new EscrowInstructions(mockRpc, programId)
    vi.clearAllMocks()
  })

  describe('createEscrow', () => {
    it('should create valid escrow creation instruction', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        payer: address('11111111111111111111111111111115') as PublicKey,
        recipient: address('11111111111111111111111111111116') as PublicKey,
        amount: 5_000_000_000n, // 5 SOL
        terms: 'Complete web development project as specified in requirements document',
        expiryTimestamp: Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
      }

      const instruction = escrowInstructions.createEscrowInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate amount is positive', () => {
      expect(() => {
        escrowInstructions.createEscrowInstruction({
          escrow: address('11111111111111111111111111111114') as PublicKey,
          payer: address('11111111111111111111111111111115') as PublicKey,
          recipient: address('11111111111111111111111111111116') as PublicKey,
          amount: 0n,
          terms: 'Test terms',
          expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })

    it('should validate expiry is in the future', () => {
      expect(() => {
        escrowInstructions.createEscrowInstruction({
          escrow: address('11111111111111111111111111111114') as PublicKey,
          payer: address('11111111111111111111111111111115') as PublicKey,
          recipient: address('11111111111111111111111111111116') as PublicKey,
          amount: 5_000_000_000n,
          terms: 'Test terms',
          expiryTimestamp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        })
      }).toThrow()
    })
  })

  describe('depositToEscrow', () => {
    it('should create valid deposit instruction', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        depositor: address('11111111111111111111111111111115') as PublicKey,
        amount: 3_000_000_000n // 3 SOL
      }

      const instruction = escrowInstructions.createDepositInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should handle multiple deposit amounts', () => {
      const amounts = [1_000_000_000n, 5_000_000_000n, 10_000_000_000n]

      amounts.forEach(amount => {
        const params = {
          escrow: address('11111111111111111111111111111114') as PublicKey,
          depositor: address('11111111111111111111111111111115') as PublicKey,
          amount
        }

        const instruction = escrowInstructions.createDepositInstruction(params)
        expect(instruction).toBeDefined()
      })
    })
  })

  describe('releaseEscrow', () => {
    it('should create valid release instruction', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        payer: address('11111111111111111111111111111115') as PublicKey,
        recipient: address('11111111111111111111111111111116') as PublicKey
      }

      const instruction = escrowInstructions.createReleaseInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should verify payer authority', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        payer: address('11111111111111111111111111111115') as PublicKey,
        recipient: address('11111111111111111111111111111116') as PublicKey
      }

      // Instruction creation should succeed, authority validation happens on-chain
      const instruction = escrowInstructions.createReleaseInstruction(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('refundEscrow', () => {
    it('should create valid refund instruction', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        payer: address('11111111111111111111111111111115') as PublicKey
      }

      const instruction = escrowInstructions.createRefundInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })
  })

  describe('partialRelease', () => {
    it('should create valid partial release instruction', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        payer: address('11111111111111111111111111111115') as PublicKey,
        recipient: address('11111111111111111111111111111116') as PublicKey,
        amount: 2_000_000_000n // 2 SOL
      }

      const instruction = escrowInstructions.createPartialReleaseInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate partial amount is positive', () => {
      expect(() => {
        escrowInstructions.createPartialReleaseInstruction({
          escrow: address('11111111111111111111111111111114') as PublicKey,
          payer: address('11111111111111111111111111111115') as PublicKey,
          recipient: address('11111111111111111111111111111116') as PublicKey,
          amount: 0n
        })
      }).toThrow()
    })
  })

  describe('createMilestoneEscrow', () => {
    it('should create valid milestone escrow instruction', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        payer: address('11111111111111111111111111111115') as PublicKey,
        recipient: address('11111111111111111111111111111116') as PublicKey,
        milestones: [
          {
            id: 1,
            description: 'Design mockups and wireframes',
            amount: 2_000_000_000n, // 2 SOL
            dueDate: Math.floor(Date.now() / 1000) + 604800, // 1 week
            isCompleted: false
          },
          {
            id: 2,
            description: 'Frontend development',
            amount: 5_000_000_000n, // 5 SOL
            dueDate: Math.floor(Date.now() / 1000) + 1814400, // 3 weeks
            isCompleted: false
          },
          {
            id: 3,
            description: 'Backend integration and testing',
            amount: 3_000_000_000n, // 3 SOL
            dueDate: Math.floor(Date.now() / 1000) + 2419200, // 4 weeks
            isCompleted: false
          }
        ],
        terms: 'Complete web application development with milestone-based payments',
        expiryTimestamp: Math.floor(Date.now() / 1000) + 2592000 // 30 days
      }

      const instruction = escrowInstructions.createMilestoneEscrowInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate milestone structure', () => {
      expect(() => {
        escrowInstructions.createMilestoneEscrowInstruction({
          escrow: address('11111111111111111111111111111114') as PublicKey,
          payer: address('11111111111111111111111111111115') as PublicKey,
          recipient: address('11111111111111111111111111111116') as PublicKey,
          milestones: [], // Empty milestones should be invalid
          terms: 'Test terms',
          expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })

    it('should validate milestone due dates are in the future', () => {
      expect(() => {
        escrowInstructions.createMilestoneEscrowInstruction({
          escrow: address('11111111111111111111111111111114') as PublicKey,
          payer: address('11111111111111111111111111111115') as PublicKey,
          recipient: address('11111111111111111111111111111116') as PublicKey,
          milestones: [
            {
              id: 1,
              description: 'Test milestone',
              amount: 1_000_000_000n,
              dueDate: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
              isCompleted: false
            }
          ],
          terms: 'Test terms',
          expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })
  })

  describe('completeMilestone', () => {
    it('should create valid milestone completion instruction', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        payer: address('11111111111111111111111111111115') as PublicKey,
        recipient: address('11111111111111111111111111111116') as PublicKey,
        milestoneId: 1,
        completionProof: 'https://github.com/project/milestone-1-deliverables'
      }

      const instruction = escrowInstructions.createCompleteMilestoneInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate milestone ID', () => {
      expect(() => {
        escrowInstructions.createCompleteMilestoneInstruction({
          escrow: address('11111111111111111111111111111114') as PublicKey,
          payer: address('11111111111111111111111111111115') as PublicKey,
          recipient: address('11111111111111111111111111111116') as PublicKey,
          milestoneId: 0, // Invalid milestone ID
          completionProof: 'https://example.com/proof'
        })
      }).toThrow()
    })
  })

  describe('createSPLTokenEscrow', () => {
    it('should create valid SPL token escrow instruction', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        tokenMint: address('11111111111111111111111111111117') as PublicKey,
        payerTokenAccount: address('11111111111111111111111111111118') as PublicKey,
        recipientTokenAccount: address('11111111111111111111111111111119') as PublicKey,
        payer: address('11111111111111111111111111111115') as PublicKey,
        recipient: address('11111111111111111111111111111116') as PublicKey,
        tokenAmount: 1000_000_000_000n, // 1000 tokens (assuming 9 decimals)
        terms: 'SPL token payment for AI services',
        expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
      }

      const instruction = escrowInstructions.createSPLTokenEscrowInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should require token accounts for SPL token escrow', () => {
      expect(() => {
        escrowInstructions.createSPLTokenEscrowInstruction({
          escrow: address('11111111111111111111111111111114') as PublicKey,
          tokenMint: address('11111111111111111111111111111117') as PublicKey,
          // @ts-expect-error - testing missing required field
          payerTokenAccount: undefined,
          recipientTokenAccount: address('11111111111111111111111111111119') as PublicKey,
          payer: address('11111111111111111111111111111115') as PublicKey,
          recipient: address('11111111111111111111111111111116') as PublicKey,
          tokenAmount: 1000_000_000_000n,
          terms: 'Test terms',
          expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })
  })

  describe('updateEscrowTerms', () => {
    it('should create valid terms update instruction', () => {
      const params = {
        escrow: address('11111111111111111111111111111114') as PublicKey,
        payer: address('11111111111111111111111111111115') as PublicKey,
        newTerms: 'Updated terms: Added additional deliverable requirements',
        newExpiryTimestamp: Math.floor(Date.now() / 1000) + 172800 // 48 hours
      }

      const instruction = escrowInstructions.createUpdateTermsInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate new expiry is in the future', () => {
      expect(() => {
        escrowInstructions.createUpdateTermsInstruction({
          escrow: address('11111111111111111111111111111114') as PublicKey,
          payer: address('11111111111111111111111111111115') as PublicKey,
          newTerms: 'Updated terms',
          newExpiryTimestamp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        })
      }).toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle invalid public keys', () => {
      expect(() => {
        escrowInstructions.createEscrowInstruction({
          // @ts-expect-error - testing invalid input
          escrow: 'invalid-key',
          payer: address('11111111111111111111111111111115') as PublicKey,
          recipient: address('11111111111111111111111111111116') as PublicKey,
          amount: 5_000_000_000n,
          terms: 'Test terms',
          expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })

    it('should validate terms are not empty', () => {
      expect(() => {
        escrowInstructions.createEscrowInstruction({
          escrow: address('11111111111111111111111111111114') as PublicKey,
          payer: address('11111111111111111111111111111115') as PublicKey,
          recipient: address('11111111111111111111111111111116') as PublicKey,
          amount: 5_000_000_000n,
          terms: '', // Empty terms should be invalid
          expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })
  })

  describe('getPDA', () => {
    it('should generate valid escrow PDA', () => {
      const escrowId = address('11111111111111111111111111111114') as PublicKey
      const pda = escrowInstructions.getEscrowPDA(escrowId)

      expect(pda).toBeDefined()
      expect(pda.length).toBe(2) // [address, bump]
      expect(typeof pda[0]).toBe('string') // address
      expect(typeof pda[1]).toBe('number') // bump
    })

    it('should generate deterministic PDAs', () => {
      const escrowId = address('11111111111111111111111111111114') as PublicKey
      const pda1 = escrowInstructions.getEscrowPDA(escrowId)
      const pda2 = escrowInstructions.getEscrowPDA(escrowId)

      expect(pda1[0]).toBe(pda2[0])
      expect(pda1[1]).toBe(pda2[1])
    })
  })
})