
import { vi } from 'vitest'
import { address } from '@solana/addresses'

// Mock InstructionBuilder to skip signing logic
vi.mock('../../../src/core/InstructionBuilder.js', () => ({
  InstructionBuilder: class {
    constructor() {}
    execute() { return Promise.resolve('mock-signature') }
  }
}))

// Mock generated instructions
vi.mock('../../../src/generated/index.js', () => ({
  getCreateMultisigInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getInitializeGovernanceProposalInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    },
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getCastVoteInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getExecuteProposalInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  VoteChoice: {
    For: 0,
    Against: 1,
    Abstain: 2
  },
  ProposalType: {
    Custom: 27
  }
}))

// Mock helpers
vi.mock('../../../src/utils/governance-helpers.js', () => ({
  deriveMultisigPda: vi.fn().mockResolvedValue(address('11111111111111111111111111111112'))
}))

import { describe, it, expect, beforeEach } from 'vitest'
import { MultisigModule } from '../../../src/modules/multisig/MultisigModule.js'
import type { GhostSpeakClient } from '../../../src/core/GhostSpeakClient.js'
import type { TransactionSigner } from '@solana/kit'
import { VoteChoice, ProposalTypeArgs } from '../../../src/generated/index.js'

describe('MultisigModule', () => {
  let multisigModule: MultisigModule
  let mockClient: GhostSpeakClient
  let mockSigner: TransactionSigner

  beforeEach(() => {
    // Re-mock client for each test
    mockClient = {
      programId: address('11111111111111111111111111111119'),
      config: {
        endpoint: 'https://api.devnet.solana.com'
      },
      sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
      fetchAccount: vi.fn().mockResolvedValue({
        data: {}
      })
    } as unknown as GhostSpeakClient

    // Create mock signer
    mockSigner = {
      address: address('11111111111111111111111111111114'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn().mockResolvedValue([]),
      signTransactions: vi.fn().mockImplementation(async (txs) => txs)
    }

    // Create module instance
    multisigModule = new MultisigModule(mockClient)
  })

  describe('createMultisig', () => {
    it('should create a multisig account', async () => {
      const result = await multisigModule.createMultisig({
        owner: mockSigner,
        multisigId: 1n,
        threshold: 2,
        signers: [mockSigner.address, address('11111111111111111111111111111115')]
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('createProposal', () => {
    it('should create a proposal', async () => {
      const result = await multisigModule.createProposal({
        multisigAddress: address('11111111111111111111111111111112'),
        title: 'Test Proposal',
        description: 'Description',
        proposalType: 27 as ProposalTypeArgs, // Custom
        executionParams: {
          instructions: [],
          executionDelay: 0n,
          executionConditions: [],
          cancellable: true,
          autoExecute: true,
          executionAuthority: mockSigner.address
        },
        proposalId: 100n,
        proposer: mockSigner
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('approveProposal', () => {
    it('should cast a vote', async () => {
      const result = await multisigModule.approveProposal({
        proposalAddress: address('11111111111111111111111111111113'),
        voter: mockSigner,
        voterTokenAccount: address('11111111111111111111111111111114'),
        voteChoice: VoteChoice.For
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('executeProposal', () => {
    it('should execute a proposal', async () => {
      const result = await multisigModule.executeProposal({
        proposalAddress: address('11111111111111111111111111111113'),
        executor: mockSigner,
        targetProgram: address('11111111111111111111111111111111')
      })

      expect(result).toBe('mock-signature')
    })
  })
})
