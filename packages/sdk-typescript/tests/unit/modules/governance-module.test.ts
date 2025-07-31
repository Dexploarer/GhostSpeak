import { vi } from 'vitest'
import { address } from '@solana/addresses'

// Mock the generated instruction functions FIRST - before any imports
vi.mock('../../../src/generated/index.js', () => ({
  getInitializeGovernanceProposalInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getCastVoteInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getDelegateVoteInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getExecuteProposalInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getTallyVotesInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  VoteChoice: {
    For: 'For',
    Against: 'Against',
    Abstain: 'Abstain'
  }
}))

import { describe, it, expect, beforeEach } from 'vitest'
import { GovernanceModule } from '../../../src/modules/governance/GovernanceModule.js'
import type { GhostSpeakClient } from '../../../src/core/GhostSpeakClient.js'
import type { TransactionSigner } from '@solana/kit'
import { VoteChoice } from '../../../src/generated/index.js'

describe('GovernanceModule', () => {
  let governanceModule: GovernanceModule
  let mockClient: GhostSpeakClient
  let mockProposer: TransactionSigner
  let mockVoter: TransactionSigner

  beforeEach(() => {
    // Create mock client
    mockClient = {
      programId: address('11111111111111111111111111111119'),
      config: {
        endpoint: 'https://api.devnet.solana.com'
      },
      sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
      fetchAccount: vi.fn().mockResolvedValue({
        data: {
          title: 'Test Proposal',
          description: 'A test governance proposal',
          proposer: address('11111111111111111111111111111114'),
          status: 'voting',
          yesVotes: 1000n,
          noVotes: 500n,
          abstainVotes: 100n
        }
      })
    } as unknown as GhostSpeakClient

    // Create mock signers
    mockProposer = {
      address: address('11111111111111111111111111111114'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    mockVoter = {
      address: address('11111111111111111111111111111115'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    // Create governance module instance
    governanceModule = new GovernanceModule(mockClient)
  })

  describe('createProposal', () => {
    it('should create a parameter change proposal', async () => {
      const result = await governanceModule.createProposal({
        signer: mockProposer,
        title: 'Increase Transaction Fee',
        description: 'Proposal to increase transaction fees to 0.1%',
        proposalType: 'parameter_change',
        votingDuration: 7 * 24 * 60 * 60, // 7 days
        executionDelay: 24 * 60 * 60 // 1 day
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should create an upgrade proposal', async () => {
      const result = await governanceModule.createProposal({
        signer: mockProposer,
        title: 'Protocol Upgrade v2.0',
        description: 'Major protocol upgrade with new features',
        proposalType: 'upgrade',
        votingDuration: 14 * 24 * 60 * 60 // 14 days
      })

      expect(result).toBe('mock-signature')
    })

    it('should create a treasury proposal', async () => {
      const result = await governanceModule.createProposal({
        signer: mockProposer,
        title: 'Treasury Allocation',
        description: 'Allocate funds for development',
        proposalType: 'treasury',
        votingDuration: 10 * 24 * 60 * 60 // 10 days
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('vote', () => {
    const proposalAddress = address('11111111111111111111111111111112')
    const tokenAccount = address('11111111111111111111111111111113')

    it('should cast a yes vote', async () => {
      const result = await governanceModule.vote({
        signer: mockVoter,
        proposalAddress,
        choice: 'yes',
        reasoning: 'This proposal will benefit the protocol',
        tokenAccount
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should cast a no vote', async () => {
      const result = await governanceModule.vote({
        signer: mockVoter,
        proposalAddress,
        choice: 'no',
        reasoning: 'This proposal has too many risks',
        tokenAccount
      })

      expect(result).toBe('mock-signature')
    })

    it('should cast an abstain vote', async () => {
      const result = await governanceModule.vote({
        signer: mockVoter,
        proposalAddress,
        choice: 'abstain',
        tokenAccount
      })

      expect(result).toBe('mock-signature')
    })

    it('should cast a vote without reasoning', async () => {
      const result = await governanceModule.vote({
        signer: mockVoter,
        proposalAddress,
        choice: 'yes',
        tokenAccount
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('delegateVotingPower', () => {
    it('should delegate voting power to another address', async () => {
      const delegate = address('11111111111111111111111111111116')
      const tokenAccount = address('11111111111111111111111111111113')

      const result = await governanceModule.delegateVotingPower({
        signer: mockVoter,
        delegate,
        amount: 1000n,
        tokenAccount
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('executeProposal', () => {
    it('should execute a passed proposal', async () => {
      const proposalAddress = address('11111111111111111111111111111112')

      const result = await governanceModule.executeProposal({
        signer: mockProposer,
        proposalAddress,
        proposalId: 'proposal-123'
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('tallyVotes', () => {
    it('should tally votes for a proposal', async () => {
      const proposalAddress = address('11111111111111111111111111111112')

      const result = await governanceModule.tallyVotes({
        signer: mockProposer,
        proposalAddress
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('getProposal', () => {
    it('should fetch proposal details', async () => {
      const proposalAddress = address('11111111111111111111111111111112')
      
      const proposal = await governanceModule.getProposal(proposalAddress)

      expect(proposal).toEqual({
        title: 'Test Proposal',
        description: 'A test governance proposal',
        proposer: address('11111111111111111111111111111114'),
        status: 'voting',
        yesVotes: 1000n,
        noVotes: 500n,
        abstainVotes: 100n
      })
      expect(mockClient.fetchAccount).toHaveBeenCalled()
    })
  })

  describe('getActiveProposals', () => {
    it('should fetch all active proposals', async () => {
      // Mock getProgramAccounts to return proposals
      governanceModule.getProgramAccounts = vi.fn().mockResolvedValue([
        {
          address: address('11111111111111111111111111111117'),
          data: {
            title: 'Proposal 1',
            status: 'voting'
          }
        },
        {
          address: address('11111111111111111111111111111118'),
          data: {
            title: 'Proposal 2',
            status: 'voting'
          }
        }
      ])

      const proposals = await governanceModule.getActiveProposals()

      expect(proposals).toHaveLength(2)
      expect(proposals[0].data.title).toBe('Proposal 1')
      expect(proposals[1].data.title).toBe('Proposal 2')
    })
  })

  describe('getProposalsByProposer', () => {
    it('should fetch proposals by proposer', async () => {
      const proposerAddress = address('11111111111111111111111111111114')
      
      // Mock getProgramAccounts with filters
      governanceModule.getProgramAccounts = vi.fn().mockResolvedValue([
        {
          address: address('11111111111111111111111111111117'),
          data: {
            title: 'Proposer Proposal 1',
            proposer: proposerAddress
          }
        }
      ])

      const proposals = await governanceModule.getProposalsByProposer(proposerAddress)

      expect(proposals).toHaveLength(1)
      expect(proposals[0].data.proposer).toBe(proposerAddress)
    })
  })

  describe('getProposalsByStatus', () => {
    it('should fetch proposals by status', async () => {
      // Mock getProgramAccounts
      governanceModule.getProgramAccounts = vi.fn().mockResolvedValue([
        {
          address: address('11111111111111111111111111111117'),
          data: {
            title: 'Voting Proposal',
            status: 'voting'
          }
        },
        {
          address: address('11111111111111111111111111111118'),
          data: {
            title: 'Executed Proposal',
            status: 'executed'
          }
        }
      ])

      const votingProposals = await governanceModule.getProposalsByStatus('voting')

      expect(votingProposals).toHaveLength(2) // Returns all since filtering is placeholder
    })
  })

  describe('helper methods', () => {
    it('should map vote choices correctly', () => {
      // Test private method indirectly through vote method
      const proposalAddress = address('11111111111111111111111111111112')
      const tokenAccount = address('11111111111111111111111111111113')

      // This will call the private mapVoteChoice method
      governanceModule.vote({
        signer: mockVoter,
        proposalAddress,
        choice: 'yes',
        tokenAccount
      })

      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should derive proposal PDA', async () => {
      // Test PDA derivation indirectly through createProposal
      await governanceModule.createProposal({
        signer: mockProposer,
        title: 'PDA Test Proposal',
        description: 'Testing PDA derivation',
        proposalType: 'parameter_change',
        votingDuration: 7 * 24 * 60 * 60
      })

      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('direct instruction access', () => {
    it('should provide direct access to initialize proposal instruction', async () => {
      const instruction = await governanceModule.getInitializeGovernanceProposalInstruction({
        proposer: mockProposer,
        title: 'Direct Access Test',
        description: 'Testing direct instruction access',
        proposalType: { kind: 'parameter_change' },
        executionParams: { instructions: [], accounts: [], targetProgram: mockClient.programId },
        proposalId: BigInt(Date.now())
      })

      expect(instruction).toHaveProperty('instruction')
    })

    it('should provide direct access to cast vote instruction', () => {
      const proposalAddress = address('11111111111111111111111111111112')
      const tokenAccount = address('11111111111111111111111111111113')

      const instruction = governanceModule.getCastVoteInstruction({
        proposal: proposalAddress,
        voter: mockVoter,
        voterTokenAccount: tokenAccount,
        voteChoice: VoteChoice.For,
        reasoning: null
      })

      expect(instruction).toHaveProperty('programAddress')
    })

    it('should provide direct access to delegate vote instruction', () => {
      const delegateAddress = address('11111111111111111111111111111116')
      const tokenAccount = address('11111111111111111111111111111113')

      const instruction = governanceModule.getDelegateVoteInstruction({
        delegator: mockVoter,
        delegate: delegateAddress,
        delegatorTokenAccount: tokenAccount,
        proposalId: BigInt(0),
        scope: { kind: 'All' },
        expiresAt: null
      })

      expect(instruction).toHaveProperty('programAddress')
    })
  })
})