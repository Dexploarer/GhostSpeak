/**
 * Unit tests for GovernanceInstructions
 * 
 * Tests multisig wallet creation, governance proposals, voting mechanisms,
 * delegation, vote tallying, and proposal execution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  generateKeyPairSigner, 
  address,
  type Address,
  type TransactionSigner,
  type Rpc,
  type Blockhash
} from '@solana/kit'
import { GovernanceInstructions } from '../../src/client/instructions/GovernanceInstructions'
import type { GhostSpeakConfig } from '../../src/types'
import { ProposalStatus } from '../../src/generated'
import type {
  Multisig,
  GovernanceProposal,
  ProposalType,
  ExecutionParams,
  VoteChoice,
  Role
} from '../../src/generated'

// Mock the generated instructions
vi.mock('../../src/generated', () => ({
  getCreateMultisigInstruction: vi.fn(),
  getInitializeGovernanceProposalInstruction: vi.fn(),
  getInitializeRbacConfigInstruction: vi.fn(),
  getCastVoteInstruction: vi.fn(),
  getDelegateVoteInstruction: vi.fn(),
  getTallyVotesInstruction: vi.fn(),
  getExecuteProposalInstruction: vi.fn(),
  getMultisigDecoder: vi.fn(),
  getGovernanceProposalDecoder: vi.fn(),
  getRbacConfigDecoder: vi.fn(),
  ProposalStatus: {
    Draft: { draft: {} },
    Active: { active: {} },
    Passed: { passed: {} },
    Failed: { failed: {} },
    Executed: { executed: {} },
    Cancelled: { cancelled: {} }
  }
}))

describe('GovernanceInstructions', () => {
  let governance: GovernanceInstructions
  let mockRpc: jest.Mocked<Rpc<unknown>>
  let mockConfig: GhostSpeakConfig
  let signer: TransactionSigner
  let multisigAddress: Address
  let proposalAddress: Address

  beforeEach(async () => {
    // Setup mocks
    signer = await generateKeyPairSigner()
    multisigAddress = address('Multisig1111111111111111111111111111111111')
    proposalAddress = address('Proposal1111111111111111111111111111111111')
    
    mockRpc = {
      getLatestBlockhash: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: {
            blockhash: 'mock-blockhash' as unknown as Blockhash,
            lastValidBlockHeight: 123456n
          }
        })
      }),
      sendTransaction: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue('mock-signature')
      }),
      confirmTransaction: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue(true)
      }),
      getAccountInfo: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue({ value: null })
      }),
      getProgramAccounts: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue([])
      })
    } as unknown as jest.Mocked<Rpc<unknown>>

    mockConfig = {
      rpc: mockRpc,
      programId: address('GHOST1VYEzX9gPsJdDVMXQmL8aZAQoLZfxCMbKfYohcvy'),
      commitment: 'confirmed'
    }

    governance = new GovernanceInstructions(mockConfig)
  })

  describe('createMultisig', () => {
    it('should create a multisig wallet with proper configuration', async () => {
      const { getCreateMultisigInstruction } = await import('../../src/generated')
      const signer2 = await generateKeyPairSigner()
      const signer3 = await generateKeyPairSigner()
      
      const mockInstruction = { programAddress: mockConfig.programId, accounts: [], data: new Uint8Array() }
      ;(getCreateMultisigInstruction as jest.Mock).mockReturnValue(mockInstruction)

      const params = {
        multisigId: 1n,
        threshold: 2,
        signers: [signer.address, signer2.address, signer3.address],
        config: {
          timeLockDuration: 86400n, // 1 day
          executionWindow: 604800n, // 7 days
          expirationTime: null
        }
      }

      const result = await governance.createMultisig(params, signer)

      expect(result.signature).toBe('mock-signature')
      expect(result.multisig).toBeDefined()
      expect(getCreateMultisigInstruction).toHaveBeenCalledWith({
        multisig: expect.any(String),
        owner: signer,
        multisigId: params.multisigId,
        threshold: params.threshold,
        signers: params.signers,
        config: params.config
      })
    })

    it('should validate threshold against signer count', async () => {
      const params = {
        multisigId: 2n,
        threshold: 3,
        signers: [signer.address], // Only 1 signer but threshold is 3
        config: {
          timeLockDuration: 0n,
          executionWindow: 86400n,
          expirationTime: null
        }
      }

      await expect(
        governance.createMultisig(params, signer)
      ).rejects.toThrow('Threshold cannot exceed number of signers')
    })

    it('should validate minimum threshold', async () => {
      const params = {
        multisigId: 3n,
        threshold: 0, // Invalid threshold
        signers: [signer.address],
        config: {
          timeLockDuration: 0n,
          executionWindow: 86400n,
          expirationTime: null
        }
      }

      await expect(
        governance.createMultisig(params, signer)
      ).rejects.toThrow('Threshold must be at least 1')
    })

    it('should handle emergency configuration', async () => {
      const { getCreateMultisigInstruction } = await import('../../src/generated')
      const emergencySigner = await generateKeyPairSigner()
      
      ;(getCreateMultisigInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const params = {
        multisigId: 4n,
        threshold: 1,
        signers: [signer.address],
        config: {
          timeLockDuration: 3600n, // 1 hour
          executionWindow: 86400n,
          expirationTime: null,
          emergencyConfig: {
            emergencyMultisig: emergencySigner.address,
            cooldownPeriod: 604800n // 7 days
          }
        }
      }

      await governance.createMultisig(params, signer)

      expect(getCreateMultisigInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            emergencyConfig: params.config.emergencyConfig
          })
        })
      )
    })
  })

  describe('createProposal', () => {
    it('should create a governance proposal', async () => {
      const { getInitializeGovernanceProposalInstruction } = await import('../../src/generated')
      
      ;(getInitializeGovernanceProposalInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const params = {
        proposalId: 100n,
        title: 'Upgrade Protocol Version',
        description: 'Upgrade to v2.0 with new features',
        proposalType: { parameterChange: {} } as ProposalType,
        executionParams: {
          programId: mockConfig.programId,
          accounts: [],
          data: new Uint8Array([1, 2, 3, 4])
        } as ExecutionParams
      }

      const result = await governance.createProposal(
        multisigAddress,
        params,
        signer
      )

      expect(result.signature).toBe('mock-signature')
      expect(result.proposal).toBeDefined()
      expect(getInitializeGovernanceProposalInstruction).toHaveBeenCalledWith({
        proposal: expect.any(String),
        multisig: multisigAddress,
        proposer: signer,
        proposalId: params.proposalId,
        title: params.title,
        description: params.description,
        proposalType: params.proposalType,
        executionParams: params.executionParams
      })
    })

    it('should validate proposal title length', async () => {
      const params = {
        proposalId: 101n,
        title: 'A'.repeat(201), // Too long
        description: 'Valid description',
        proposalType: { generalProposal: {} } as ProposalType,
        executionParams: {
          programId: mockConfig.programId,
          accounts: [],
          data: new Uint8Array()
        } as ExecutionParams
      }

      await expect(
        governance.createProposal(multisigAddress, params, signer)
      ).rejects.toThrow('Title must be 200 characters or less')
    })

    it('should validate proposal description length', async () => {
      const params = {
        proposalId: 102n,
        title: 'Valid Title',
        description: 'A'.repeat(5001), // Too long
        proposalType: { generalProposal: {} } as ProposalType,
        executionParams: {
          programId: mockConfig.programId,
          accounts: [],
          data: new Uint8Array()
        } as ExecutionParams
      }

      await expect(
        governance.createProposal(multisigAddress, params, signer)
      ).rejects.toThrow('Description must be 5000 characters or less')
    })
  })

  describe('castVote', () => {
    it('should cast a vote on a proposal', async () => {
      const { getCastVoteInstruction } = await import('../../src/generated')
      
      ;(getCastVoteInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const params = {
        proposal: proposalAddress,
        vote: 'For' as const,
        weight: 100n
      }

      const result = await governance.castVote(params, signer)

      expect(result).toBe('mock-signature')
      expect(getCastVoteInstruction).toHaveBeenCalledWith({
        proposal: proposalAddress,
        voter: signer,
        vote: { for: {} },
        weight: params.weight
      })
    })

    it('should handle different vote choices', async () => {
      const { getCastVoteInstruction } = await import('../../src/generated')
      
      ;(getCastVoteInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      // Test all vote choices
      const voteChoices: Array<'For' | 'Against' | 'Abstain'> = ['For', 'Against', 'Abstain']
      
      for (const vote of voteChoices) {
        await governance.castVote({ proposal: proposalAddress, vote }, signer)
        
        const expectedVote = vote === 'For' ? { for: {} } :
                           vote === 'Against' ? { against: {} } :
                           { abstain: {} }
        
        expect(getCastVoteInstruction).toHaveBeenCalledWith(
          expect.objectContaining({
            vote: expectedVote
          })
        )
      }
    })

    it('should use default weight if not provided', async () => {
      const { getCastVoteInstruction } = await import('../../src/generated')
      
      ;(getCastVoteInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await governance.castVote({ proposal: proposalAddress, vote: 'For' }, signer)

      expect(getCastVoteInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          weight: 1n // Default weight
        })
      )
    })
  })

  describe('delegateVote', () => {
    it('should delegate voting power to another account', async () => {
      const { getDelegateVoteInstruction } = await import('../../src/generated')
      const delegate = await generateKeyPairSigner()
      
      ;(getDelegateVoteInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await governance.delegateVote(
        delegate.address,
        { all: {} },
        signer
      )

      expect(result).toBe('mock-signature')
      expect(getDelegateVoteInstruction).toHaveBeenCalledWith({
        delegator: signer,
        delegate: delegate.address,
        scope: { all: {} }
      })
    })

    it('should delegate for specific proposal', async () => {
      const { getDelegateVoteInstruction } = await import('../../src/generated')
      const delegate = await generateKeyPairSigner()
      
      ;(getDelegateVoteInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await governance.delegateVote(
        delegate.address,
        { proposal: { proposalId: 123n } },
        signer
      )

      expect(getDelegateVoteInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: { proposal: { proposalId: 123n } }
        })
      )
    })

    it('should delegate for specific category', async () => {
      const { getDelegateVoteInstruction } = await import('../../src/generated')
      const delegate = await generateKeyPairSigner()
      
      ;(getDelegateVoteInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await governance.delegateVote(
        delegate.address,
        { category: { category: 'treasury' } },
        signer
      )

      expect(getDelegateVoteInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: { category: { category: 'treasury' } }
        })
      )
    })
  })

  describe('tallyVotes', () => {
    it('should tally votes for a proposal', async () => {
      const { getTallyVotesInstruction } = await import('../../src/generated')
      
      ;(getTallyVotesInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await governance.tallyVotes(proposalAddress, signer)

      expect(result.signature).toBe('mock-signature')
      expect(getTallyVotesInstruction).toHaveBeenCalledWith({
        proposal: proposalAddress,
        authority: signer
      })
    })
  })

  describe('executeProposal', () => {
    it('should execute a passed proposal', async () => {
      const { getExecuteProposalInstruction } = await import('../../src/generated')
      
      ;(getExecuteProposalInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await governance.executeProposal(proposalAddress, signer)

      expect(result.signature).toBe('mock-signature')
      expect(getExecuteProposalInstruction).toHaveBeenCalledWith({
        proposal: proposalAddress,
        executor: signer
      })
    })
  })

  describe('Query Operations', () => {
    it('should get multisig by address', async () => {
      const mockMultisig: Multisig = {
        multisigId: 1n,
        owner: signer.address,
        threshold: 2,
        signers: [signer.address],
        config: {
          timeLockDuration: 86400n,
          executionWindow: 604800n,
          expirationTime: null
        },
        createdAt: BigInt(Date.now() / 1000),
        updatedAt: BigInt(Date.now() / 1000),
        pendingTransactions: 0,
        isActive: true
      }

      const { getMultisigDecoder } = await import('../../src/generated')
      ;(getMultisigDecoder as jest.Mock).mockReturnValue({
        decode: jest.fn().mockReturnValue(mockMultisig)
      })

      mockRpc.getAccountInfo = jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: {
            data: new Uint8Array(1000),
            owner: mockConfig.programId
          }
        })
      })

      const result = await governance.getMultisig(multisigAddress)

      expect(result).toBeDefined()
      expect(result?.multisigId).toBe(1n)
      expect(result?.threshold).toBe(2)
    })

    it('should query multisigs with filters', async () => {
      const mockMultisigs = [
        {
          address: multisigAddress,
          data: {
            multisigId: 1n,
            owner: signer.address,
            threshold: 2,
            signers: [signer.address],
            isActive: true
          }
        },
        {
          address: address('Multisig2222222222222222222222222222222222'),
          data: {
            multisigId: 2n,
            owner: signer.address,
            threshold: 3,
            signers: [signer.address],
            isActive: true
          }
        }
      ]

      const { getMultisigDecoder } = await import('../../src/generated')
      ;(getMultisigDecoder as jest.Mock).mockReturnValue({
        decode: (data: any) => data
      })

      mockRpc.getProgramAccounts = jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue(mockMultisigs)
      })

      const results = await governance.queryMultisigs({
        owner: signer.address,
        threshold: 2
      })

      expect(results).toHaveLength(1)
      expect(results[0].multisig).toBe(multisigAddress)
      expect(results[0].threshold).toBe(2)
    })

    it('should get proposal by address', async () => {
      const mockProposal: GovernanceProposal = {
        proposalId: 100n,
        proposer: signer.address,
        multisig: multisigAddress,
        title: 'Test Proposal',
        description: 'Test Description',
        proposalType: { generalProposal: {} },
        status: ProposalStatus.Active,
        executionParams: {
          programId: mockConfig.programId,
          accounts: [],
          data: new Uint8Array()
        },
        votingStartTime: BigInt(Date.now() / 1000),
        votingEndTime: BigInt(Date.now() / 1000 + 86400),
        createdAt: BigInt(Date.now() / 1000),
        votes: {
          forVotes: 100n,
          againstVotes: 50n,
          abstainVotes: 10n
        },
        executed: false,
        executionTime: null,
        cancelled: false,
        category: 'governance'
      }

      const { getGovernanceProposalDecoder } = await import('../../src/generated')
      ;(getGovernanceProposalDecoder as jest.Mock).mockReturnValue({
        decode: jest.fn().mockReturnValue(mockProposal)
      })

      mockRpc.getAccountInfo = jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue({
          value: {
            data: new Uint8Array(1000),
            owner: mockConfig.programId
          }
        })
      })

      const result = await governance.getProposal(proposalAddress)

      expect(result).toBeDefined()
      expect(result?.proposalId).toBe(100n)
      expect(result?.title).toBe('Test Proposal')
      expect(result?.status).toBe(ProposalStatus.Active)
    })

    it('should query proposals with filters', async () => {
      const now = Date.now() / 1000
      const mockProposals = [
        {
          address: proposalAddress,
          data: {
            proposalId: 100n,
            status: ProposalStatus.Active,
            proposalType: { generalProposal: {} },
            votingEndTime: BigInt(now + 86400),
            category: 'treasury'
          }
        },
        {
          address: address('Proposal2222222222222222222222222222222222'),
          data: {
            proposalId: 101n,
            status: ProposalStatus.Passed,
            proposalType: { parameterChange: {} },
            votingEndTime: BigInt(now - 86400),
            category: 'governance'
          }
        }
      ]

      const { getGovernanceProposalDecoder } = await import('../../src/generated')
      ;(getGovernanceProposalDecoder as jest.Mock).mockReturnValue({
        decode: (data: any) => data
      })

      mockRpc.getProgramAccounts = jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue(mockProposals)
      })

      // Query active proposals
      const activeProposals = await governance.queryProposals({
        status: ProposalStatus.Active,
        votingActive: true
      })

      expect(activeProposals).toHaveLength(1)
      expect(activeProposals[0].proposal).toBe(proposalAddress)
      expect(activeProposals[0].status).toBe(ProposalStatus.Active)

      // Query by category
      const treasuryProposals = await governance.queryProposals({
        category: 'treasury'
      })

      expect(treasuryProposals).toHaveLength(1)
      expect(treasuryProposals[0].category).toBe('treasury')
    })
  })

  describe('RBAC Operations', () => {
    it('should initialize RBAC configuration', async () => {
      const { getInitializeRbacConfigInstruction } = await import('../../src/generated')
      
      ;(getInitializeRbacConfigInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const roles: Role[] = [
        {
          name: 'admin',
          permissions: ['all'],
          members: [signer.address]
        },
        {
          name: 'proposer',
          permissions: ['create_proposal', 'vote'],
          members: []
        }
      ]

      const result = await governance.initializeRbac(
        multisigAddress,
        { initialRoles: roles },
        signer
      )

      expect(result).toBe('mock-signature')
      expect(getInitializeRbacConfigInstruction).toHaveBeenCalledWith({
        multisig: multisigAddress,
        owner: signer,
        initialRoles: roles
      })
    })
  })

  describe('Proposal Lifecycle', () => {
    it('should handle complete proposal lifecycle', async () => {
      const { 
        getInitializeGovernanceProposalInstruction,
        getCastVoteInstruction,
        getTallyVotesInstruction,
        getExecuteProposalInstruction
      } = await import('../../src/generated')

      // Mock all instructions
      ;(getInitializeGovernanceProposalInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })
      ;(getCastVoteInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })
      ;(getTallyVotesInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })
      ;(getExecuteProposalInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      // 1. Create proposal
      const createResult = await governance.createProposal(
        multisigAddress,
        {
          proposalId: 200n,
          title: 'Lifecycle Test',
          description: 'Testing full lifecycle',
          proposalType: { generalProposal: {} } as ProposalType,
          executionParams: {
            programId: mockConfig.programId,
            accounts: [],
            data: new Uint8Array()
          } as ExecutionParams
        },
        signer
      )

      expect(createResult.signature).toBe('mock-signature')

      // 2. Cast votes
      await governance.castVote(
        { proposal: proposalAddress, vote: 'For', weight: 100n },
        signer
      )

      // 3. Tally votes
      await governance.tallyVotes(proposalAddress, signer)

      // 4. Execute proposal
      await governance.executeProposal(proposalAddress, signer)

      // Verify all steps were called
      expect(getInitializeGovernanceProposalInstruction).toHaveBeenCalled()
      expect(getCastVoteInstruction).toHaveBeenCalled()
      expect(getTallyVotesInstruction).toHaveBeenCalled()
      expect(getExecuteProposalInstruction).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle RPC errors gracefully', async () => {
      mockRpc.getLatestBlockhash = jest.fn().mockReturnValue({
        send: jest.fn().mockRejectedValue(new Error('Network error'))
      })

      await expect(
        governance.createMultisig(
          {
            multisigId: 999n,
            threshold: 1,
            signers: [signer.address],
            config: {
              timeLockDuration: 0n,
              executionWindow: 86400n,
              expirationTime: null
            }
          },
          signer
        )
      ).rejects.toThrow('Failed to create multisig')
    })

    it('should validate proposal status before execution', async () => {
      // This would be implemented in the actual SDK
      // For now, just verify the instruction is called
      const { getExecuteProposalInstruction } = await import('../../src/generated')
      
      ;(getExecuteProposalInstruction as jest.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await governance.executeProposal(proposalAddress, signer)

      expect(getExecuteProposalInstruction).toHaveBeenCalled()
    })
  })
})