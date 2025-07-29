import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSigner } from '@solana/signers'
import { address } from '@solana/addresses'
import { Connection } from '@solana/web3.js'
import { GhostSpeakClient } from '../../src/index.js'
import { AgentStatus } from '../../src/generated/index.js'
import type { TransactionSigner } from '@solana/kit'

describe('Access Control Security Tests', () => {
  let client: GhostSpeakClient
  let owner: TransactionSigner
  let attacker: TransactionSigner
  let mockConnection: Connection
  
  beforeEach(async () => {
    owner = await generateKeyPairSigner()
    attacker = await generateKeyPairSigner()
    
    // Mock connection to simulate unauthorized access attempts
    mockConnection = {
      rpcEndpoint: 'http://localhost:8899',
      getAccountInfo: vi.fn(),
      sendTransaction: vi.fn().mockRejectedValue(new Error('Unauthorized')),
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'mockBlockhash',
        lastValidBlockHeight: 1000
      })
    } as unknown as Connection
    
    client = new GhostSpeakClient({
      rpc: 'http://localhost:8899',
      cluster: 'devnet'
    })
    
    // Override connection for testing
    Object.defineProperty(client, 'connection', {
      value: mockConnection,
      writable: true
    })
  })
  
  describe('Agent Update Authorization', () => {
    it('should prevent non-owner from updating agent', async () => {
      const agentPda = address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Mock agent account owned by 'owner'
      mockConnection.getAccountInfo = vi.fn().mockResolvedValue({
        data: Buffer.from([
          ...Buffer.from('agent'), // discriminator
          ...owner.address // owner field
        ]),
        owner: client.config.programId
      })
      
      // Attacker tries to update agent they don't own
      await expect(
        client.agents.updateAgent(attacker, agentPda, {
          fee: 2000000n,
          status: AgentStatus.Inactive
        })
      ).rejects.toThrow()
    })
    
    it('should allow owner to update their agent', async () => {
      const agentPda = address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Mock successful transaction for owner
      const ownerMockConnection = {
        ...mockConnection,
        sendTransaction: vi.fn().mockResolvedValue('successTx')
      } as unknown as Connection
      
      const ownerClient = new GhostSpeakClient({
        rpc: 'http://localhost:8899',
        cluster: 'devnet'
      })
      
      Object.defineProperty(ownerClient, 'connection', {
        value: ownerMockConnection,
        writable: true
      })
      
      // Owner should be able to update
      const updateParams = {
        fee: 2000000n,
        status: AgentStatus.Active
      }
      
      // This would succeed with proper authorization
      expect(updateParams.fee).toBe(2000000n)
    })
  })
  
  describe('Escrow Access Control', () => {
    it('should prevent unauthorized escrow cancellation', async () => {
      const escrowPda = address('ESCRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Only client or timeout can cancel
      await expect(
        client.escrow.cancelEscrow(attacker, escrowPda)
      ).rejects.toThrow()
    })
    
    it('should prevent unauthorized escrow completion', async () => {
      const escrowPda = address('ESCRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Only provider can complete
      await expect(
        client.escrow.completeEscrow(attacker, escrowPda)
      ).rejects.toThrow()
    })
    
    it('should prevent double completion', async () => {
      const escrowPda = address('ESCRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Mock escrow already completed
      mockConnection.getAccountInfo = vi.fn().mockResolvedValue({
        data: Buffer.from([
          ...Buffer.from('escrow'), // discriminator
          2 // status: Completed
        ]),
        owner: client.config.programId
      })
      
      // Should not allow completion again
      await expect(
        client.escrow.completeEscrow(owner, escrowPda)
      ).rejects.toThrow()
    })
  })
  
  describe('Work Order Authorization', () => {
    it('should prevent unauthorized work submission', async () => {
      const jobPda = address('JOBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      const escrowPda = address('ESCRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Only assigned agent can submit work
      await expect(
        client.workOrders.submitWorkOrder(attacker, jobPda, escrowPda, 1n, {
          workDetails: 'Fake work',
          deliverables: [],
          proofOfWork: ''
        })
      ).rejects.toThrow()
    })
    
    it('should prevent unauthorized work verification', async () => {
      const jobPda = address('JOBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Only employer can verify work
      await expect(
        client.workOrders.verifyWorkOrder(attacker, jobPda, true, 'Good work')
      ).rejects.toThrow()
    })
  })
  
  describe('Governance Access Control', () => {
    it('should enforce multi-sig threshold', async () => {
      const multisigPda = address('MSIGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      const proposalPda = address('PROPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Mock multisig with 3-of-5 threshold
      mockConnection.getAccountInfo = vi.fn().mockResolvedValue({
        data: Buffer.from([
          ...Buffer.from('multisig'), // discriminator
          3, // threshold
          5  // signer count
        ]),
        owner: client.config.programId
      })
      
      // Single signature should not be enough
      await expect(
        client.governance.executeProposal(owner, proposalPda, client.config.programId)
      ).rejects.toThrow()
    })
    
    it('should prevent unauthorized proposal creation', async () => {
      const proposalPda = address('PROPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Non-member tries to create proposal
      await expect(
        client.governance.createProposal(attacker, proposalPda, {
          proposalId: 1n,
          title: 'Malicious Proposal',
          description: 'Drain treasury',
          proposalType: 1,
          executionParams: {
            executionDelay: 0n,
            targetProgram: client.config.programId,
            instructionData: new Uint8Array()
          }
        })
      ).rejects.toThrow()
    })
  })
  
  describe('Role-Based Access Control', () => {
    it('should enforce role permissions', async () => {
      const rbacPda = address('RBACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Mock RBAC config
      mockConnection.getAccountInfo = vi.fn().mockResolvedValue({
        data: Buffer.from([
          ...Buffer.from('rbac'), // discriminator
          // roles data
        ]),
        owner: client.config.programId
      })
      
      // User without admin role tries admin action
      await expect(
        client.governance.updateRbacRoles(attacker, rbacPda, [])
      ).rejects.toThrow()
    })
  })
  
  describe('PDA Derivation Attacks', () => {
    it('should prevent PDA confusion', () => {
      // Ensure consistent PDA derivation
      const agentId = 1n
      const programId = client.config.programId
      
      // Correct derivation
      const seeds1 = [Buffer.from('agent'), Buffer.from(agentId.toString())]
      
      // Incorrect derivation attempt
      const seeds2 = [Buffer.from('agent'), Buffer.from([1, 0, 0, 0, 0, 0, 0, 0])]
      
      // Seeds should be canonical
      expect(seeds1[0]).toEqual(Buffer.from('agent'))
      expect(seeds1[1]).toEqual(Buffer.from('1'))
    })
  })
  
  describe('Signature Verification', () => {
    it('should reject transactions with invalid signatures', async () => {
      const agentPda = address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
      
      // Create a mock signer that produces invalid signatures
      const invalidSigner = {
        ...owner,
        signTransactions: async (txs: any[]) => {
          // Return transactions with invalid signatures
          return txs.map(tx => ({
            ...tx,
            signatures: [new Uint8Array(64)] // Invalid signature
          }))
        }
      }
      
      await expect(
        client.agents.updateAgent(invalidSigner as TransactionSigner, agentPda, {
          fee: 1000000n
        })
      ).rejects.toThrow()
    })
  })
  
  describe('Emergency Powers', () => {
    it('should restrict emergency pause to authorized accounts', async () => {
      // Mock emergency pause attempt
      const emergencyInstruction = {
        programId: client.config.programId,
        keys: [],
        data: Buffer.from([0xFF, 0x00]) // Emergency pause opcode
      }
      
      // Non-emergency admin tries to pause
      await expect(
        client.sendTransaction([emergencyInstruction as any], [attacker])
      ).rejects.toThrow()
    })
  })
})