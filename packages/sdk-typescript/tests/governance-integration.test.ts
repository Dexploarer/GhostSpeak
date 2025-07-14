/**
 * Governance Integration Tests
 * 
 * Comprehensive test suite for governance functionality including
 * multisig wallets, proposals, voting, and RBAC.
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'
import { 
  Keypair,
  createSignerFromKeypair,
  generateKeyPairSigner,
  type Address,
  type TransactionSigner
} from '@solana/kit'
import { 
  GhostSpeakClient,
  ProposalStatus,
  type MultisigSummary,
  type ProposalSummary,
  type RbacSummary,
  type MultisigFilter,
  type ProposalFilter
} from '../src/index.js'

// Mock RPC responses
vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn().mockImplementation(() => ({
    getRecentBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'MockBlockhash123',
      lastValidBlockHeight: 100
    }),
    getMinimumBalanceForRentExemption: vi.fn().mockResolvedValue(1000000),
    sendTransaction: vi.fn().mockResolvedValue('MockSignature123'),
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    getAccountInfo: vi.fn().mockResolvedValue(null),
    getMultipleAccountsInfo: vi.fn().mockResolvedValue([])
  }))
}))

describe('Governance Integration Tests', () => {
  let client: GhostSpeakClient
  let admin: TransactionSigner
  let signer1: TransactionSigner
  let signer2: TransactionSigner
  let signer3: TransactionSigner
  let multisigPda: Address
  let proposalPda: Address
  let rbacPda: Address

  beforeAll(async () => {
    // Initialize client
    client = new GhostSpeakClient({
      rpcEndpoint: 'http://localhost:8899',
      commitment: 'confirmed'
    })

    // Generate test signers
    admin = await generateKeyPairSigner()
    signer1 = await generateKeyPairSigner()
    signer2 = await generateKeyPairSigner()
    signer3 = await generateKeyPairSigner()
    
    // Mock PDAs
    multisigPda = 'MultisigPDA123' as Address
    proposalPda = 'ProposalPDA456' as Address
    rbacPda = 'RbacPDA789' as Address
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  describe('Multisig Creation', () => {
    test('should create multisig with valid parameters', async () => {
      const params = {
        multisigId: 1n,
        threshold: 2,
        signers: [signer1.address, signer2.address, signer3.address],
        config: {
          requireSequentialExecution: false,
          executionDelay: 86400n // 24 hours
        }
      }

      // Mock successful transaction
      const mockSignature = 'MultisigCreateSig123' as any
      vi.spyOn(client.governance, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.governance.createMultisig(
        admin,
        multisigPda,
        params
      )

      expect(signature).toBe(mockSignature)
      expect(client.governance.sendTransaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object)]),
        [admin]
      )
    })

    test('should create multisig with detailed results', async () => {
      const params = {
        multisigId: 2n,
        threshold: 3,
        signers: [signer1.address, signer2.address, signer3.address],
        config: {
          requireSequentialExecution: true,
          executionDelay: 172800n // 48 hours
        }
      }

      const mockResult = {
        signature: 'MultisigDetailSig456' as any,
        explorerUrl: 'https://explorer.solana.com/tx/MultisigDetailSig456?cluster=devnet'
      }
      vi.spyOn(client.governance, 'sendTransactionWithDetails').mockResolvedValueOnce(mockResult)

      const result = await client.governance.createMultisigWithDetails(
        admin,
        multisigPda,
        params
      )

      expect(result.signature).toBe(mockResult.signature)
      expect(result.explorerUrl).toContain('explorer.solana.com')
    })

    test('should validate multisig parameters', async () => {
      // Test invalid threshold (0)
      await expect(
        client.governance.createMultisig(
          admin,
          multisigPda,
          {
            multisigId: 3n,
            threshold: 0,
            signers: [signer1.address],
            config: { requireSequentialExecution: false, executionDelay: 0n }
          }
        )
      ).rejects.toThrow('Threshold must be greater than 0')

      // Test threshold exceeding signers
      await expect(
        client.governance.createMultisig(
          admin,
          multisigPda,
          {
            multisigId: 4n,
            threshold: 3,
            signers: [signer1.address, signer2.address],
            config: { requireSequentialExecution: false, executionDelay: 0n }
          }
        )
      ).rejects.toThrow('Threshold cannot exceed number of signers')

      // Test no signers
      await expect(
        client.governance.createMultisig(
          admin,
          multisigPda,
          {
            multisigId: 5n,
            threshold: 1,
            signers: [],
            config: { requireSequentialExecution: false, executionDelay: 0n }
          }
        )
      ).rejects.toThrow('At least one signer is required')

      // Test duplicate signers
      await expect(
        client.governance.createMultisig(
          admin,
          multisigPda,
          {
            multisigId: 6n,
            threshold: 2,
            signers: [signer1.address, signer1.address, signer2.address],
            config: { requireSequentialExecution: false, executionDelay: 0n }
          }
        )
      ).rejects.toThrow('Duplicate signers are not allowed')
    })
  })

  describe('Proposal Creation', () => {
    test('should create proposal with valid parameters', async () => {
      const params = {
        proposalId: 42n,
        title: "Increase transaction fee threshold",
        description: "Proposal to increase the minimum transaction fee from 0.01 to 0.02 SOL",
        proposalType: { parameterChange: {} } as any,
        executionParams: {
          executionDelay: 172800n, // 2 days
          targetProgram: 'TargetProgram123' as Address,
          instructionData: new Uint8Array([1, 2, 3, 4])
        }
      }

      const mockSignature = 'ProposalCreateSig123' as any
      vi.spyOn(client.governance, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.governance.createProposal(
        admin,
        proposalPda,
        params
      )

      expect(signature).toBe(mockSignature)
    })

    test('should validate proposal parameters', async () => {
      // Test empty title
      await expect(
        client.governance.createProposal(
          admin,
          proposalPda,
          {
            proposalId: 43n,
            title: "",
            description: "Description",
            proposalType: { parameterChange: {} } as any,
            executionParams: { executionDelay: 0n } as any
          }
        )
      ).rejects.toThrow('Proposal title is required')

      // Test title too long
      await expect(
        client.governance.createProposal(
          admin,
          proposalPda,
          {
            proposalId: 44n,
            title: "T".repeat(101),
            description: "Description",
            proposalType: { parameterChange: {} } as any,
            executionParams: { executionDelay: 0n } as any
          }
        )
      ).rejects.toThrow('Proposal title cannot exceed 100 characters')

      // Test empty description
      await expect(
        client.governance.createProposal(
          admin,
          proposalPda,
          {
            proposalId: 45n,
            title: "Title",
            description: "",
            proposalType: { parameterChange: {} } as any,
            executionParams: { executionDelay: 0n } as any
          }
        )
      ).rejects.toThrow('Proposal description is required')

      // Test description too long
      await expect(
        client.governance.createProposal(
          admin,
          proposalPda,
          {
            proposalId: 46n,
            title: "Title",
            description: "D".repeat(2001),
            proposalType: { parameterChange: {} } as any,
            executionParams: { executionDelay: 0n } as any
          }
        )
      ).rejects.toThrow('Proposal description cannot exceed 2000 characters')
    })
  })

  describe('RBAC Initialization', () => {
    test('should initialize RBAC with valid roles', async () => {
      const params = {
        initialRoles: [
          {
            name: "Admin",
            permissions: ['manage_all', 'view_all', 'execute_all'],
            members: [admin.address]
          },
          {
            name: "Member",
            permissions: ['view_proposals', 'vote'],
            members: [signer1.address, signer2.address]
          },
          {
            name: "Observer",
            permissions: ['view_proposals'],
            members: []
          }
        ]
      }

      const mockSignature = 'RbacInitSig123' as any
      vi.spyOn(client.governance, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.governance.initializeRbac(
        admin,
        rbacPda,
        params
      )

      expect(signature).toBe(mockSignature)
    })

    test('should validate RBAC parameters', async () => {
      // Test no roles
      await expect(
        client.governance.initializeRbac(
          admin,
          rbacPda,
          { initialRoles: [] }
        )
      ).rejects.toThrow('At least one initial role is required')

      // Test too many roles
      const tooManyRoles = Array(11).fill(null).map((_, i) => ({
        name: `Role${i}`,
        permissions: ['view'],
        members: []
      }))

      await expect(
        client.governance.initializeRbac(
          admin,
          rbacPda,
          { initialRoles: tooManyRoles }
        )
      ).rejects.toThrow('Cannot have more than 10 initial roles')
    })
  })

  describe('Querying and Monitoring', () => {
    test('should get multisig summary', async () => {
      const mockMultisig = {
        multisigId: 1n,
        threshold: 2,
        signers: [signer1.address, signer2.address, signer3.address],
        owner: admin.address,
        createdAt: BigInt(Date.now() / 1000 - 86400),
        updatedAt: BigInt(Date.now() / 1000),
        config: {
          requireSequentialExecution: false,
          executionDelay: 86400n
        }
      }

      vi.spyOn(client.governance, 'getMultisig').mockResolvedValueOnce(mockMultisig as any)

      const summary = await client.governance.getMultisigSummary(multisigPda)

      expect(summary).toBeDefined()
      expect(summary?.threshold).toBe(2)
      expect(summary?.signers).toHaveLength(3)
      expect(summary?.isActive).toBe(true)
    })

    test('should get proposal summary with computed fields', async () => {
      const createdAt = BigInt(Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60) // 3 days ago
      
      const mockProposal = {
        proposalId: 42n,
        proposalType: { parameterChange: {} },
        proposer: admin.address,
        title: "Test Proposal",
        description: "Test Description",
        status: ProposalStatus.Active,
        createdAt,
        executionParams: { executionDelay: 172800n },
        votingResults: {
          votesFor: 150n,
          votesAgainst: 50n,
          votesAbstain: 20n,
          quorumReached: true
        }
      }

      vi.spyOn(client.governance, 'getProposal').mockResolvedValueOnce(mockProposal as any)

      const summary = await client.governance.getProposalSummary(proposalPda)

      expect(summary).toBeDefined()
      expect(summary?.forVotes).toBe(150n)
      expect(summary?.againstVotes).toBe(50n)
      expect(summary?.abstainVotes).toBe(20n)
      expect(summary?.totalVotes).toBe(220n)
      expect(summary?.quorumReached).toBe(true)
    })

    test('should monitor proposal for updates', async () => {
      const updates: ProposalSummary[] = []

      // Mock changing proposal data
      const mockProposals = [
        {
          proposal: proposalPda,
          proposalId: 42n,
          status: ProposalStatus.Active,
          forVotes: 0n,
          againstVotes: 0n,
          abstainVotes: 0n,
          totalVotes: 0n,
          quorumReached: false,
          canExecute: false
        },
        {
          proposal: proposalPda,
          proposalId: 42n,
          status: ProposalStatus.Active,
          forVotes: 100n,
          againstVotes: 20n,
          abstainVotes: 10n,
          totalVotes: 130n,
          quorumReached: false,
          canExecute: false
        },
        {
          proposal: proposalPda,
          proposalId: 42n,
          status: ProposalStatus.Active,
          forVotes: 200n,
          againstVotes: 50n,
          abstainVotes: 30n,
          totalVotes: 280n,
          quorumReached: true,
          canExecute: true
        }
      ]

      let callCount = 0
      vi.spyOn(client.governance, 'getProposalSummary').mockImplementation(async () => {
        if (callCount < mockProposals.length) {
          return mockProposals[callCount++] as any
        }
        return mockProposals[mockProposals.length - 1] as any
      })

      const cleanup = await client.governance.monitorProposal(
        proposalPda,
        (summary) => {
          updates.push(summary)
        }
      )

      // Wait for monitoring
      await new Promise(resolve => setTimeout(resolve, 100))
      
      cleanup()

      expect(updates.length).toBeGreaterThan(0)
      expect(updates[0].totalVotes).toBe(0n)
    })
  })

  describe('Active Proposals', () => {
    test('should get active proposals requiring votes', async () => {
      const now = BigInt(Math.floor(Date.now() / 1000))
      
      const mockProposals = [
        {
          proposal: 'Proposal1' as Address,
          status: ProposalStatus.Active,
          votingEndsAt: now + BigInt(86400), // Ends tomorrow
          forVotes: 100n,
          againstVotes: 50n
        },
        {
          proposal: 'Proposal2' as Address,
          status: ProposalStatus.Executed,
          votingEndsAt: now - BigInt(86400), // Ended yesterday
          forVotes: 200n,
          againstVotes: 30n
        },
        {
          proposal: 'Proposal3' as Address,
          status: ProposalStatus.Active,
          votingEndsAt: now + BigInt(172800), // Ends in 2 days
          forVotes: 50n,
          againstVotes: 20n
        }
      ]

      vi.spyOn(client.governance, 'listProposals').mockResolvedValueOnce(mockProposals as any)

      const activeProposals = await client.governance.getActiveProposals()

      expect(activeProposals).toHaveLength(2)
      expect(activeProposals.every(p => p.status === ProposalStatus.Active)).toBe(true)
      expect(activeProposals.every(p => p.votingEndsAt > now)).toBe(true)
    })
  })

  describe('Governance Analytics', () => {
    test('should get governance analytics', async () => {
      const mockAnalytics = {
        totalMultisigs: 25,
        activeMultisigs: 20,
        totalProposals: 100,
        activeProposals: 5,
        passedProposals: 75,
        failedProposals: 20,
        averageVotingParticipation: 65.5,
        topSigners: [
          {
            signer: signer1.address,
            multisigCount: 10,
            transactionCount: 50
          },
          {
            signer: signer2.address,
            multisigCount: 8,
            transactionCount: 40
          }
        ],
        proposalSuccess: {
          rate: 78.9,
          averageVotes: 250n
        }
      }

      vi.spyOn(client.governance, 'getGovernanceAnalytics').mockResolvedValueOnce(mockAnalytics)

      const analytics = await client.governance.getGovernanceAnalytics()

      expect(analytics.totalMultisigs).toBe(25)
      expect(analytics.passedProposals).toBe(75)
      expect(analytics.proposalSuccess.rate).toBe(78.9)
      expect(analytics.topSigners).toHaveLength(2)
    })
  })

  describe('Error Handling', () => {
    test('should handle non-existent accounts gracefully', async () => {
      vi.spyOn(client.governance, 'getMultisig').mockResolvedValueOnce(null)
      vi.spyOn(client.governance, 'getProposal').mockResolvedValueOnce(null)
      vi.spyOn(client.governance, 'getRbacConfig').mockResolvedValueOnce(null)

      const multisig = await client.governance.getMultisig('NonExistent' as Address)
      const proposal = await client.governance.getProposal('NonExistent' as Address)
      const rbac = await client.governance.getRbacConfig('NonExistent' as Address)

      expect(multisig).toBeNull()
      expect(proposal).toBeNull()
      expect(rbac).toBeNull()
    })

    test('should handle RPC errors', async () => {
      vi.spyOn(client.governance, 'sendTransaction').mockRejectedValueOnce(
        new Error('RPC Error: Connection timeout')
      )

      await expect(
        client.governance.createMultisig(
          admin,
          multisigPda,
          {
            multisigId: 99n,
            threshold: 2,
            signers: [signer1.address, signer2.address],
            config: { requireSequentialExecution: false, executionDelay: 0n }
          }
        )
      ).rejects.toThrow('RPC Error')
    })
  })

  describe('Complex Scenarios', () => {
    test('should handle emergency multisig scenarios', async () => {
      // Create emergency multisig with time-locked execution
      const emergencyParams = {
        multisigId: 911n,
        threshold: 4, // High threshold for emergency actions
        signers: [admin.address, signer1.address, signer2.address, signer3.address, 'EmergencySigner' as Address],
        config: {
          requireSequentialExecution: true,
          executionDelay: 259200n // 3 days delay for emergency actions
        }
      }

      const mockSignature = 'EmergencyMultisigSig' as any
      vi.spyOn(client.governance, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.governance.createMultisig(
        admin,
        'EmergencyMultisig' as Address,
        emergencyParams
      )

      expect(signature).toBe(mockSignature)
    })

    test('should handle proposal execution workflow', async () => {
      // Simulate full proposal lifecycle
      const proposalStates = [
        { status: ProposalStatus.Active, canExecute: false },
        { status: ProposalStatus.Active, canExecute: true },
        { status: ProposalStatus.Executed, canExecute: false }
      ]

      let stateIndex = 0
      vi.spyOn(client.governance, 'getProposalSummary').mockImplementation(async () => {
        if (stateIndex < proposalStates.length) {
          const state = proposalStates[stateIndex++]
          return {
            proposal: proposalPda,
            status: state.status,
            canExecute: state.canExecute,
            forVotes: 300n,
            againstVotes: 100n,
            quorumReached: true
          } as any
        }
        return null
      })

      // Check initial state
      const initial = await client.governance.getProposalSummary(proposalPda)
      expect(initial?.status).toBe(ProposalStatus.Active)
      expect(initial?.canExecute).toBe(false)

      // Check ready for execution
      const ready = await client.governance.getProposalSummary(proposalPda)
      expect(ready?.canExecute).toBe(true)

      // Check executed
      const executed = await client.governance.getProposalSummary(proposalPda)
      expect(executed?.status).toBe(ProposalStatus.Executed)
    })
  })
})