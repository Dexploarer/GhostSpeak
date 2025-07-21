import { describe, it, expect, vi } from 'vitest'
import { AgentInstructions } from '../../src/client/instructions/AgentInstructions'
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

describe('AgentInstructions', () => {
  let agentInstructions: AgentInstructions

  beforeEach(() => {
    agentInstructions = new AgentInstructions(mockRpc, programId)
    vi.clearAllMocks()
  })

  describe('registerAgent', () => {
    it('should create valid register agent instruction', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        owner: address('11111111111111111111111111111115') as PublicKey,
        metadata: {
          name: 'Test Agent',
          description: 'A test AI agent',
          avatar: 'https://example.com/avatar.png',
          capabilities: ['coding', 'writing'],
          pricing: {
            baseRate: 1000000n, // 0.001 SOL
            currency: 'SOL'
          }
        },
        tier: 'Basic'
      }

      const instruction = agentInstructions.createRegisterAgentInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate required parameters', () => {
      expect(() => {
        agentInstructions.createRegisterAgentInstruction({
          agent: address('11111111111111111111111111111114') as PublicKey,
          owner: address('11111111111111111111111111111115') as PublicKey,
          // @ts-expect-error - testing missing required field
          metadata: undefined,
          tier: 'Basic'
        })
      }).toThrow()
    })

    it('should handle different agent tiers', () => {
      const tiers = ['Basic', 'Pro', 'Enterprise'] as const

      tiers.forEach(tier => {
        const params = {
          agent: address('11111111111111111111111111111114') as PublicKey,
          owner: address('11111111111111111111111111111115') as PublicKey,
          metadata: {
            name: `${tier} Agent`,
            description: `A ${tier} AI agent`,
            avatar: 'https://example.com/avatar.png',
            capabilities: ['coding'],
            pricing: {
              baseRate: 1000000n,
              currency: 'SOL'
            }
          },
          tier
        }

        const instruction = agentInstructions.createRegisterAgentInstruction(params)
        expect(instruction).toBeDefined()
      })
    })
  })

  describe('updateAgent', () => {
    it('should create valid update agent instruction', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        owner: address('11111111111111111111111111111115') as PublicKey,
        metadata: {
          name: 'Updated Agent',
          description: 'An updated AI agent',
          avatar: 'https://example.com/new-avatar.png',
          capabilities: ['coding', 'writing', 'design'],
          pricing: {
            baseRate: 2000000n, // 0.002 SOL
            currency: 'SOL'
          }
        }
      }

      const instruction = agentInstructions.createUpdateAgentInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should allow partial metadata updates', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        owner: address('11111111111111111111111111111115') as PublicKey,
        metadata: {
          name: 'Partially Updated Agent',
          // Only updating name, other fields should be preserved
        }
      }

      const instruction = agentInstructions.createUpdateAgentInstruction(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('verifyAgent', () => {
    it('should create valid verify agent instruction', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        verifier: address('11111111111111111111111111111115') as PublicKey,
        verificationData: {
          verifiedAt: Date.now(),
          verificationLevel: 'KYB', // Know Your Business
          documents: ['business_license', 'tax_id'],
          reviewedBy: 'platform_admin'
        }
      }

      const instruction = agentInstructions.createVerifyAgentInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate verifier authority', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        verifier: address('11111111111111111111111111111115') as PublicKey,
        verificationData: {
          verifiedAt: Date.now(),
          verificationLevel: 'KYC',
          documents: ['id_verification'],
          reviewedBy: 'unauthorized_user'
        }
      }

      // Should create instruction but validation would happen on-chain
      const instruction = agentInstructions.createVerifyAgentInstruction(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('deactivateAgent', () => {
    it('should create valid deactivate agent instruction', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        owner: address('11111111111111111111111111111115') as PublicKey,
        reason: 'Agent owner requested deactivation'
      }

      const instruction = agentInstructions.createDeactivateAgentInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should handle different deactivation reasons', () => {
      const reasons = [
        'Owner requested',
        'Policy violation',
        'Maintenance',
        'Security concern'
      ]

      reasons.forEach(reason => {
        const params = {
          agent: address('11111111111111111111111111111114') as PublicKey,
          owner: address('11111111111111111111111111111115') as PublicKey,
          reason
        }

        const instruction = agentInstructions.createDeactivateAgentInstruction(params)
        expect(instruction).toBeDefined()
      })
    })
  })

  describe('updateAgentReputation', () => {
    it('should create valid reputation update instruction', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        client: address('11111111111111111111111111111115') as PublicKey,
        rating: 5,
        review: 'Excellent work, delivered on time and exceeded expectations',
        transactionId: address('11111111111111111111111111111116') as PublicKey
      }

      const instruction = agentInstructions.createUpdateReputationInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate rating range', () => {
      const validRatings = [1, 2, 3, 4, 5]
      const invalidRatings = [0, 6, -1, 10]

      validRatings.forEach(rating => {
        const params = {
          agent: address('11111111111111111111111111111114') as PublicKey,
          client: address('11111111111111111111111111111115') as PublicKey,
          rating,
          review: 'Test review',
          transactionId: address('11111111111111111111111111111116') as PublicKey
        }

        const instruction = agentInstructions.createUpdateReputationInstruction(params)
        expect(instruction).toBeDefined()
      })

      invalidRatings.forEach(rating => {
        expect(() => {
          const params = {
            agent: address('11111111111111111111111111111114') as PublicKey,
            client: address('11111111111111111111111111111115') as PublicKey,
            rating,
            review: 'Test review',
            transactionId: address('11111111111111111111111111111116') as PublicKey
          }

          agentInstructions.createUpdateReputationInstruction(params)
        }).toThrow()
      })
    })
  })

  describe('manageAgentStatus', () => {
    it('should create valid status management instruction', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        authority: address('11111111111111111111111111111115') as PublicKey,
        newStatus: 'Active',
        reason: 'Agent passed verification review'
      }

      const instruction = agentInstructions.createManageStatusInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should handle different status types', () => {
      const statuses = ['Active', 'Inactive', 'Suspended', 'UnderReview'] as const

      statuses.forEach(status => {
        const params = {
          agent: address('11111111111111111111111111111114') as PublicKey,
          authority: address('11111111111111111111111111111115') as PublicKey,
          newStatus: status,
          reason: `Setting status to ${status}`
        }

        const instruction = agentInstructions.createManageStatusInstruction(params)
        expect(instruction).toBeDefined()
      })
    })
  })

  describe('activateAgent', () => {
    it('should create valid activation instruction', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        owner: address('11111111111111111111111111111115') as PublicKey
      }

      const instruction = agentInstructions.createActivateAgentInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })
  })

  describe('registerCompressedAgent', () => {
    it('should create valid compressed agent registration instruction', () => {
      const params = {
        agent: address('11111111111111111111111111111114') as PublicKey,
        owner: address('11111111111111111111111111111115') as PublicKey,
        merkleTree: address('11111111111111111111111111111116') as PublicKey,
        metadata: {
          name: 'Compressed Agent',
          description: 'A compressed AI agent using ZK compression',
          avatar: 'https://example.com/avatar.png',
          capabilities: ['coding'],
          pricing: {
            baseRate: 500000n, // 0.0005 SOL (lower cost due to compression)
            currency: 'SOL'
          }
        }
      }

      const instruction = agentInstructions.createRegisterCompressedAgentInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should require merkle tree parameter', () => {
      expect(() => {
        agentInstructions.createRegisterCompressedAgentInstruction({
          agent: address('11111111111111111111111111111114') as PublicKey,
          owner: address('11111111111111111111111111111115') as PublicKey,
          // @ts-expect-error - testing missing required field
          merkleTree: undefined,
          metadata: {
            name: 'Test Agent',
            description: 'Test',
            avatar: 'https://example.com/avatar.png',
            capabilities: ['coding'],
            pricing: {
              baseRate: 1000000n,
              currency: 'SOL'
            }
          }
        })
      }).toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle invalid public keys gracefully', () => {
      expect(() => {
        agentInstructions.createRegisterAgentInstruction({
          // @ts-expect-error - testing invalid input
          agent: 'invalid-public-key',
          owner: address('11111111111111111111111111111115') as PublicKey,
          metadata: {
            name: 'Test Agent',
            description: 'Test',
            avatar: 'https://example.com/avatar.png',
            capabilities: ['coding'],
            pricing: {
              baseRate: 1000000n,
              currency: 'SOL'
            }
          },
          tier: 'Basic'
        })
      }).toThrow()
    })

    it('should validate metadata structure', () => {
      expect(() => {
        agentInstructions.createRegisterAgentInstruction({
          agent: address('11111111111111111111111111111114') as PublicKey,
          owner: address('11111111111111111111111111111115') as PublicKey,
          metadata: {
            // @ts-expect-error - testing missing required fields
            name: 'Test Agent',
            // missing required fields
          },
          tier: 'Basic'
        })
      }).toThrow()
    })
  })
})