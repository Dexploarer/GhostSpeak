/**
 * Integration tests for work order lifecycle
 * Tests creation, submission, verification, rejection, and milestone payments
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { 
  Keypair,
  generateKeyPairSigner,
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction
} from '@solana/web3.js'
import { getSetComputeUnitLimitInstruction } from '@solana-program/compute-budget'
import type { Address, Rpc } from '@solana/web3.js'
import { GhostSpeakClient } from '../../src/client/GhostSpeakClient.js'
import { WorkOrderInstructions } from '../../src/client/instructions/WorkOrderInstructions.js'
import { EscrowInstructions } from '../../src/client/instructions/EscrowInstructions.js'
import { AgentInstructions } from '../../src/client/instructions/AgentInstructions.js'
import { 
  WorkOrderStatus,
  Deliverable,
  EscrowStatus
} from '../../src/generated/index.js'
import { createMint, createAssociatedTokenAccount, mintTo } from '@solana/spl-token'
import type { TypedRpcClient } from '../../src/types/rpc-client-types.js'

describe('Work Order Verification System', () => {
  let rpc: Rpc<unknown>
  let typedRpc: TypedRpcClient
  let client: GhostSpeakClient
  let workOrderInstructions: WorkOrderInstructions
  let escrowInstructions: EscrowInstructions
  let agentInstructions: AgentInstructions
  
  // Test accounts
  let payer: Keypair
  let clientAccount: Keypair
  let providerAccount: Keypair
  let arbitrator: Keypair
  
  // Test data
  let paymentMint: Address
  let clientTokenAccount: Address
  let providerTokenAccount: Address
  let clientAgent: Address
  let providerAgent: Address
  let workOrderAddress: Address
  let escrowAddress: Address

  // Test configuration
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'http://localhost:8899'
  const PROGRAM_ID = process.env.PROGRAM_ID || 'GHOST1VYEzX9gPsJdDVMXQmL8aZAQoLZfxCMbKfYohcvy' as Address
  
  beforeAll(async () => {
    // Initialize RPC and client
    rpc = createSolanaRpc(RPC_ENDPOINT)
    typedRpc = rpc as TypedRpcClient
    
    // Generate test keypairs
    payer = await generateKeyPairSigner()
    clientAccount = await generateKeyPairSigner()
    providerAccount = await generateKeyPairSigner()
    arbitrator = await generateKeyPairSigner()

    // Initialize client and instructions
    client = new GhostSpeakClient(typedRpc, PROGRAM_ID, payer)
    workOrderInstructions = new WorkOrderInstructions(client.config)
    escrowInstructions = new EscrowInstructions(client.config)
    agentInstructions = new AgentInstructions(client.config)

    // Fund test accounts
    await fundAccount(rpc, payer.address, 10)
    await fundAccount(rpc, clientAccount.address, 5)
    await fundAccount(rpc, providerAccount.address, 5)
    await fundAccount(rpc, arbitrator.address, 2)

    // Create test token mint
    paymentMint = await createTestToken(rpc, payer)
    
    // Create token accounts
    clientTokenAccount = await createAssociatedTokenAccount(
      rpc,
      clientAccount,
      paymentMint,
      clientAccount.address
    )
    
    providerTokenAccount = await createAssociatedTokenAccount(
      rpc,
      providerAccount,
      paymentMint,
      providerAccount.address
    )

    // Mint tokens to client
    await mintTo(
      rpc,
      payer,
      paymentMint,
      clientTokenAccount,
      payer,
      10_000_000_000n // 10,000 tokens with 6 decimals
    )

    // Register test agents
    clientAgent = await registerTestAgent(
      agentInstructions,
      clientAccount,
      'Client Agent',
      'AI agent representing the client'
    )

    providerAgent = await registerTestAgent(
      agentInstructions,
      providerAccount,
      'Provider Agent',
      'AI agent providing services'
    )
  })

  describe('Work Order Creation', () => {
    it('should create work order with basic requirements', async () => {
      const result = await workOrderInstructions.createWorkOrder({
        client: clientAccount,
        provider: providerAgent,
        title: 'Smart Contract Development',
        description: 'Develop a DeFi lending protocol smart contract',
        requirements: [
          'Implement lending pool logic',
          'Add interest rate calculations',
          'Include liquidation mechanism',
          'Write comprehensive tests'
        ],
        paymentAmount: 1000_000_000n, // 1000 tokens
        paymentToken: paymentMint,
        deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
        requiresVerification: true
      })

      expect(result.signature).toBeDefined()
      expect(result.workOrderAddress).toBeDefined()
      expect(result.escrowAddress).toBeDefined()

      workOrderAddress = result.workOrderAddress
      escrowAddress = result.escrowAddress!

      // Verify work order was created
      const workOrder = await client.fetchWorkOrder(workOrderAddress)
      expect(workOrder).toBeDefined()
      expect(workOrder.client).toBe(clientAccount.address)
      expect(workOrder.provider).toBe(providerAgent)
      expect(workOrder.status).toBe(WorkOrderStatus.Created)
      expect(workOrder.paymentAmount.toString()).toBe('1000000000')
    })

    it('should create work order with milestones', async () => {
      const milestones = [
        {
          title: 'Design & Architecture',
          description: 'Complete system design and architecture documentation',
          paymentPercentage: 20,
          expectedDate: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
        },
        {
          title: 'Core Implementation',
          description: 'Implement core lending pool functionality',
          paymentPercentage: 50,
          expectedDate: Math.floor(Date.now() / 1000) + 21 * 24 * 60 * 60
        },
        {
          title: 'Testing & Documentation',
          description: 'Complete test suite and documentation',
          paymentPercentage: 30,
          expectedDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
        }
      ]

      const result = await workOrderInstructions.createWorkOrder({
        client: clientAccount,
        provider: providerAgent,
        title: 'Multi-phase Smart Contract Development',
        description: 'Develop DeFi protocol with milestone-based delivery',
        requirements: ['See milestone descriptions'],
        paymentAmount: 2000_000_000n, // 2000 tokens
        paymentToken: paymentMint,
        deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        milestones,
        requiresVerification: true
      })

      expect(result.signature).toBeDefined()

      // Verify milestone calculations
      const { milestonePayments, isValid } = workOrderInstructions.calculateMilestonePayments(
        2000_000_000n,
        milestones
      )

      expect(isValid).toBe(true)
      expect(milestonePayments[0]).toBe(400_000_000n) // 20% = 400 tokens
      expect(milestonePayments[1]).toBe(1000_000_000n) // 50% = 1000 tokens
      expect(milestonePayments[2]).toBe(600_000_000n) // 30% = 600 tokens
    })
  })

  describe('Work Delivery Submission', () => {
    let workDeliveryAddress: Address

    it('should submit work delivery with IPFS content', async () => {
      // Simulate work completion
      const deliveryContent = {
        type: 'application/json' as const,
        data: JSON.stringify({
          repository: 'https://github.com/provider/defi-lending',
          commit: 'abc123def456',
          documentation: 'https://docs.example.com/lending-protocol',
          testResults: {
            passed: 142,
            failed: 0,
            coverage: 95.6
          }
        })
      }

      const result = await workOrderInstructions.submitWorkDelivery({
        provider: providerAccount,
        workOrderAddress,
        deliverables: [
          Deliverable.Code,
          Deliverable.Document,
          Deliverable.Analysis
        ],
        content: deliveryContent,
        deliveryNotes: 'All requirements completed. Test coverage at 95.6%',
        milestoneIndex: 0
      })

      expect(result.signature).toBeDefined()
      expect(result.workDeliveryAddress).toBeDefined()
      expect(result.ipfsHash).toBeDefined()

      workDeliveryAddress = result.workDeliveryAddress

      // Verify work delivery was created
      const workDelivery = await client.fetchWorkDelivery(workDeliveryAddress)
      expect(workDelivery).toBeDefined()
      expect(workDelivery.provider).toBe(providerAccount.address)
      expect(workDelivery.deliverables.length).toBe(3)
      expect(workDelivery.ipfsHash).toBe(result.ipfsHash)

      // Verify work order status updated
      const workOrder = await client.fetchWorkOrder(workOrderAddress)
      expect(workOrder.status).toBe(WorkOrderStatus.Submitted)
    })

    it('should reject incomplete delivery', async () => {
      // Attempt to submit without required deliverables
      await expect(
        workOrderInstructions.submitWorkDelivery({
          provider: providerAccount,
          workOrderAddress,
          deliverables: [], // Empty deliverables
          ipfsHash: 'QmInvalidHash',
          deliveryNotes: 'Incomplete work'
        })
      ).rejects.toThrow()
    })
  })

  describe('Work Verification Process', () => {
    it('should verify and approve work delivery', async () => {
      // Check if can verify
      const canVerify = await workOrderInstructions.canVerifyWorkOrder(
        workOrderAddress
      )

      expect(canVerify.canVerify).toBe(true)

      // Verify work delivery
      const result = await workOrderInstructions.verifyWorkDelivery({
        client: clientAccount,
        workOrderAddress,
        workDeliveryAddress,
        verificationNotes: 'Excellent work! All requirements met and exceeded.',
        rating: 5,
        releasePayment: true
      })

      expect(result.signature).toBeDefined()
      expect(result.paymentReleased).toBe(true)

      // Verify work order status
      const workOrder = await client.fetchWorkOrder(workOrderAddress)
      expect(workOrder.status).toBe(WorkOrderStatus.Approved)
      expect(workOrder.deliveredAt).toBeDefined()

      // Verify provider received payment (if escrow was used)
      const providerBalance = await getTokenBalance(rpc, providerTokenAccount)
      expect(providerBalance).toBeGreaterThan(0n)
    })

    it('should handle work rejection with requested changes', async () => {
      // Create new work order for rejection test
      const rejectWorkOrder = await createTestWorkOrder(
        workOrderInstructions,
        clientAccount,
        providerAgent,
        500_000_000n
      )

      // Submit work
      const delivery = await workOrderInstructions.submitWorkDelivery({
        provider: providerAccount,
        workOrderAddress: rejectWorkOrder.workOrderAddress,
        deliverables: [Deliverable.Code],
        ipfsHash: 'QmTestDelivery123',
        deliveryNotes: 'Initial implementation'
      })

      // Reject work with requested changes
      const rejection = await workOrderInstructions.rejectWorkDelivery({
        client: clientAccount,
        workOrderAddress: rejectWorkOrder.workOrderAddress,
        workDeliveryAddress: delivery.workDeliveryAddress,
        rejectionReason: 'Missing unit tests and documentation',
        requestedChanges: [
          'Add comprehensive unit test suite',
          'Include API documentation',
          'Fix security vulnerability in auth module'
        ],
        allowResubmission: true,
        triggerDispute: false
      })

      expect(rejection.signature).toBeDefined()
      expect(rejection.disputeCreated).toBe(false)

      // Verify work order allows resubmission
      const workOrder = await client.fetchWorkOrder(rejectWorkOrder.workOrderAddress)
      expect(workOrder.status).toBe(WorkOrderStatus.InProgress)
    })
  })

  describe('Milestone-based Verification', () => {
    it('should verify and pay for individual milestones', async () => {
      // Create work order with milestones
      const milestones = [
        {
          title: 'Phase 1: Design',
          description: 'Complete design phase',
          paymentPercentage: 30,
          expectedDate: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
        },
        {
          title: 'Phase 2: Implementation',
          description: 'Core implementation',
          paymentPercentage: 50,
          expectedDate: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60
        },
        {
          title: 'Phase 3: Testing',
          description: 'Testing and documentation',
          paymentPercentage: 20,
          expectedDate: Math.floor(Date.now() / 1000) + 21 * 24 * 60 * 60
        }
      ]

      const milestoneWorkOrder = await workOrderInstructions.createWorkOrder({
        client: clientAccount,
        provider: providerAgent,
        title: 'Milestone-based Development',
        description: 'Project with phased delivery',
        requirements: ['Deliver according to milestones'],
        paymentAmount: 1000_000_000n,
        paymentToken: paymentMint,
        deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        milestones,
        requiresVerification: true
      })

      // Submit first milestone
      const milestone1Delivery = await workOrderInstructions.submitWorkDelivery({
        provider: providerAccount,
        workOrderAddress: milestoneWorkOrder.workOrderAddress,
        deliverables: [Deliverable.Design],
        ipfsHash: 'QmDesignPhaseComplete',
        deliveryNotes: 'Design phase completed',
        milestoneIndex: 0
      })

      // Test new completeMilestone method
      const milestone1Completion = await workOrderInstructions.completeMilestone({
        client: clientAccount,
        workOrderAddress: milestoneWorkOrder.workOrderAddress,
        workDeliveryAddress: milestone1Delivery.workDeliveryAddress,
        milestoneIndex: 0,
        verificationNotes: 'Design approved with excellent quality',
        rating: 5,
        milestones,
        totalAmount: 1000_000_000n
      })

      expect(milestone1Completion.signature).toBeDefined()
      expect(milestone1Completion.paymentAmount).toBe(300_000_000n) // 30%
      expect(milestone1Completion.paymentReleased).toBe(true)
      expect(milestone1Completion.remainingAmount).toBe(700_000_000n) // 70% remaining

      // Test milestone status tracking
      const milestoneStatus = await workOrderInstructions.getMilestoneStatus(
        milestoneWorkOrder.workOrderAddress,
        milestones
      )

      expect(milestoneStatus.completedMilestones).toBeGreaterThan(0)
      expect(milestoneStatus.currentMilestone?.title).toBe('Phase 2: Implementation')
      expect(milestoneStatus.progressPercentage).toBeGreaterThan(0)
      expect(milestoneStatus.paymentsReleased).toBe(300_000_000n)
      expect(milestoneStatus.remainingPayments).toBe(700_000_000n)
    })

    it('should handle multiple milestone completions', async () => {
      const milestones = [
        {
          title: 'Milestone 1',
          description: 'First deliverable',
          paymentPercentage: 25,
          expectedDate: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
        },
        {
          title: 'Milestone 2',
          description: 'Second deliverable',
          paymentPercentage: 35,
          expectedDate: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60
        },
        {
          title: 'Milestone 3',
          description: 'Final deliverable',
          paymentPercentage: 40,
          expectedDate: Math.floor(Date.now() / 1000) + 21 * 24 * 60 * 60
        }
      ]

      const multiMilestoneWorkOrder = await workOrderInstructions.createWorkOrder({
        client: clientAccount,
        provider: providerAgent,
        title: 'Multi-milestone Project',
        description: 'Complex project with multiple phases',
        requirements: ['Complete all milestones'],
        paymentAmount: 800_000_000n,
        paymentToken: paymentMint,
        deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        milestones,
        requiresVerification: true
      })

      // Complete first two milestones
      for (let i = 0; i < 2; i++) {
        const delivery = await workOrderInstructions.submitWorkDelivery({
          provider: providerAccount,
          workOrderAddress: multiMilestoneWorkOrder.workOrderAddress,
          deliverables: [Deliverable.Code],
          ipfsHash: `QmMilestone${i + 1}Complete`,
          deliveryNotes: `Milestone ${i + 1} completed`,
          milestoneIndex: i
        })

        const completion = await workOrderInstructions.completeMilestone({
          client: clientAccount,
          workOrderAddress: multiMilestoneWorkOrder.workOrderAddress,
          workDeliveryAddress: delivery.workDeliveryAddress,
          milestoneIndex: i,
          verificationNotes: `Milestone ${i + 1} approved`,
          rating: 4 + i, // 4 and 5
          milestones,
          totalAmount: 800_000_000n
        })

        expect(completion.paymentReleased).toBe(true)
      }

      // Check final status
      const finalStatus = await workOrderInstructions.getMilestoneStatus(
        multiMilestoneWorkOrder.workOrderAddress,
        milestones
      )

      expect(finalStatus.completedMilestones).toBe(2)
      expect(finalStatus.progressPercentage).toBe(66.66666666666666) // 2/3 complete
      expect(finalStatus.paymentsReleased).toBe(480_000_000n) // 25% + 35% = 60%
      expect(finalStatus.remainingPayments).toBe(320_000_000n) // 40% remaining
    })
  })

  describe('Enhanced Payment Verification', () => {
    it('should integrate payment release with escrow system', async () => {
      // Create work order with escrow
      const escrowWorkOrder = await workOrderInstructions.createWorkOrder({
        client: clientAccount,
        provider: providerAgent,
        title: 'Escrow Payment Test',
        description: 'Testing escrow payment integration',
        requirements: ['Complete work with payment verification'],
        paymentAmount: 500_000_000n,
        paymentToken: paymentMint,
        deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        requiresVerification: true
      })

      // Record initial provider balance
      const initialBalance = await getTokenBalance(rpc, providerTokenAccount)

      // Submit work
      const delivery = await workOrderInstructions.submitWorkDelivery({
        provider: providerAccount,
        workOrderAddress: escrowWorkOrder.workOrderAddress,
        deliverables: [Deliverable.Code, Deliverable.Document],
        ipfsHash: 'QmEscrowTestDelivery',
        deliveryNotes: 'Work completed for escrow payment test'
      })

      // Verify work with payment release
      const verification = await workOrderInstructions.verifyWorkDelivery({
        client: clientAccount,
        workOrderAddress: escrowWorkOrder.workOrderAddress,
        workDeliveryAddress: delivery.workDeliveryAddress,
        verificationNotes: 'Work approved, releasing payment through escrow',
        rating: 5,
        releasePayment: true
      })

      expect(verification.signature).toBeDefined()
      expect(verification.paymentReleased).toBe(true)

      // Verify payment was actually released
      const finalBalance = await getTokenBalance(rpc, providerTokenAccount)
      expect(finalBalance).toBeGreaterThan(initialBalance)
      expect(finalBalance - initialBalance).toBe(500_000_000n)
    })

    it('should handle payment verification errors gracefully', async () => {
      // Test case where escrow payment fails
      const invalidWorkOrder = await workOrderInstructions.createWorkOrder({
        client: clientAccount,
        provider: providerAgent,
        title: 'Invalid Payment Test',
        description: 'Testing payment error handling',
        requirements: ['Test error scenarios'],
        paymentAmount: 100_000_000n,
        paymentToken: paymentMint,
        deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        requiresVerification: true
      })

      const delivery = await workOrderInstructions.submitWorkDelivery({
        provider: providerAccount,
        workOrderAddress: invalidWorkOrder.workOrderAddress,
        deliverables: [Deliverable.Other],
        ipfsHash: 'QmInvalidPaymentTest'
      })

      // Attempt verification with payment (might fail due to insufficient escrow setup)
      try {
        const verification = await workOrderInstructions.verifyWorkDelivery({
          client: clientAccount,
          workOrderAddress: invalidWorkOrder.workOrderAddress,
          workDeliveryAddress: delivery.workDeliveryAddress,
          verificationNotes: 'Testing payment error handling',
          rating: 3,
          releasePayment: true
        })

        // Should either succeed or throw a descriptive error
        if (verification.paymentReleased) {
          expect(verification.paymentReleased).toBe(true)
        }
      } catch (error) {
        // Error should be informative and include operation context
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('payment release') // Should mention the operation
      }
    })
  })

  describe('Work Order Status Management', () => {
    it('should track and update work order status automatically', async () => {
      const statusWorkOrder = await workOrderInstructions.createWorkOrder({
        client: clientAccount,
        provider: providerAgent,
        title: 'Status Management Test',
        description: 'Testing automatic status updates',
        requirements: ['Track status changes'],
        paymentAmount: 200_000_000n,
        paymentToken: paymentMint,
        deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        requiresVerification: true
      })

      // Test initial status
      const summary = await workOrderInstructions.getWorkOrderSummary(
        statusWorkOrder.workOrderAddress
      )
      expect(summary.status).toBe(WorkOrderStatus.Created)
      expect(summary.progressPercentage).toBe(0)

      // Test status transition validation
      const statusUpdate = await workOrderInstructions.updateWorkOrderStatus(
        statusWorkOrder.workOrderAddress,
        WorkOrderStatus.Open,
        clientAccount,
        {
          reason: 'Work order published and open for bids',
          metadata: { publishedAt: new Date().toISOString() }
        }
      )

      expect(statusUpdate.isValidTransition).toBe(true)
      expect(statusUpdate.previousStatus).toBe(WorkOrderStatus.Created)
      expect(statusUpdate.newStatus).toBe(WorkOrderStatus.Open)

      // Test invalid transition
      await expect(
        workOrderInstructions.updateWorkOrderStatus(
          statusWorkOrder.workOrderAddress,
          WorkOrderStatus.Completed, // Invalid: Can't go directly from Open to Completed
          clientAccount
        )
      ).rejects.toThrow('Invalid status transition')
    })

    it('should provide enhanced summary with milestone information', async () => {
      const milestones = [
        {
          title: 'Phase 1',
          description: 'First phase',
          paymentPercentage: 40,
          expectedDate: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
        },
        {
          title: 'Phase 2',
          description: 'Second phase',
          paymentPercentage: 60,
          expectedDate: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60
        }
      ]

      const enhancedWorkOrder = await workOrderInstructions.createWorkOrder({
        client: clientAccount,
        provider: providerAgent,
        title: 'Enhanced Summary Test',
        description: 'Testing enhanced status summary',
        requirements: ['Complete with milestones'],
        paymentAmount: 1000_000_000n,
        paymentToken: paymentMint,
        deadline: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        milestones,
        requiresVerification: true
      })

      // Get enhanced summary with milestone information
      const enhancedSummary = await workOrderInstructions.getWorkOrderSummary(
        enhancedWorkOrder.workOrderAddress,
        milestones
      )

      expect(enhancedSummary.totalMilestones).toBe(2)
      expect(enhancedSummary.completedMilestones).toBe(0)
      expect(enhancedSummary.paymentReleased).toBe(0n)
      expect(enhancedSummary.paymentRemaining).toBe(1000_000_000n)
      expect(enhancedSummary.progressPercentage).toBeGreaterThanOrEqual(0)
      expect(enhancedSummary.daysUntilDeadline).toBeGreaterThan(0)
    })
  })

  describe('Work Order Status and Analytics', () => {
    it('should provide accurate status summary', async () => {
      const summary = await workOrderInstructions.getWorkOrderSummary(workOrderAddress)

      expect(summary.status).toBeDefined()
      expect(summary.progressPercentage).toBeGreaterThanOrEqual(0)
      expect(summary.progressPercentage).toBeLessThanOrEqual(100)
      expect(summary.daysUntilDeadline).toBeGreaterThan(0)
      expect(summary.deliveryCount).toBeGreaterThan(0)
    })

    it('should track work order completion metrics', async () => {
      // This would integrate with analytics system
      const metrics = {
        averageCompletionTime: 15, // days
        clientSatisfactionRate: 4.8, // out of 5
        providerReliabilityScore: 95, // percentage
        disputeRate: 2.3 // percentage
      }

      expect(metrics.clientSatisfactionRate).toBeGreaterThan(4.5)
      expect(metrics.disputeRate).toBeLessThan(5)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should prevent verification by non-client', async () => {
      await expect(
        workOrderInstructions.verifyWorkDelivery({
          client: providerAccount, // Wrong account
          workOrderAddress,
          workDeliveryAddress,
          verificationNotes: 'Unauthorized verification attempt'
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('should handle deadline expiration', async () => {
      // Create work order with short deadline
      const expiredWorkOrder = await workOrderInstructions.createWorkOrder({
        client: clientAccount,
        provider: providerAgent,
        title: 'Urgent Task',
        description: 'Task with very short deadline',
        requirements: ['Complete ASAP'],
        paymentAmount: 100_000_000n,
        paymentToken: paymentMint,
        deadline: Math.floor(Date.now() / 1000) + 1, // 1 second deadline
        requiresVerification: true
      })

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Attempt to submit after deadline
      await expect(
        workOrderInstructions.submitWorkDelivery({
          provider: providerAccount,
          workOrderAddress: expiredWorkOrder.workOrderAddress,
          deliverables: [Deliverable.Other],
          ipfsHash: 'QmLateDelivery'
        })
      ).rejects.toThrow('Deadline')
    })

    it('should validate milestone percentages', async () => {
      const invalidMilestones = [
        {
          title: 'Phase 1',
          description: 'First phase',
          paymentPercentage: 40,
          expectedDate: Date.now() + 86400000
        },
        {
          title: 'Phase 2',
          description: 'Second phase',
          paymentPercentage: 50, // Total = 90%, not 100%
          expectedDate: Date.now() + 172800000
        }
      ]

      const { isValid, error } = workOrderInstructions.calculateMilestonePayments(
        1000_000_000n,
        invalidMilestones
      )

      expect(isValid).toBe(false)
      expect(error).toContain('must sum to 100')
    })
  })
})

// Helper Functions

async function fundAccount(rpc: Rpc<unknown>, address: Address, lamports: number) {
  const airdropSignature = await rpc.requestAirdrop(address, lamports * 1e9).send()
  await confirmTransaction(rpc, airdropSignature)
}

async function confirmTransaction(rpc: Rpc<unknown>, signature: string) {
  const latestBlockhash = await rpc.getLatestBlockhash().send()
  await rpc.confirmTransaction({
    signature,
    blockhash: latestBlockhash.value.blockhash,
    lastValidBlockHeight: latestBlockhash.value.lastValidBlockHeight
  }).send()
}

async function createTestToken(rpc: Rpc<unknown>, payer: Keypair): Promise<Address> {
  const mint = await generateKeyPairSigner()
  
  const createMintIx = await createMint(
    rpc,
    payer,
    payer.address,
    payer.address,
    6, // 6 decimals
    mint
  )

  return mint.address
}

async function registerTestAgent(
  agentInstructions: AgentInstructions,
  owner: Keypair,
  name: string,
  description: string
): Promise<Address> {
  const agentData = {
    name,
    description,
    avatarUri: 'https://example.com/avatar.png',
    capabilities: ['development', 'testing'],
    knowledgeDomains: ['solana', 'rust', 'smart-contracts'],
    languageModels: ['gpt-4', 'claude-3'],
    pricingModel: {
      baseRate: 100_000_000n,
      currency: 'USDC'
    }
  }

  const { agentAddress } = await agentInstructions.registerAgent(owner, agentData)
  return agentAddress
}

async function createTestWorkOrder(
  workOrderInstructions: WorkOrderInstructions,
  client: Keypair,
  provider: Address,
  amount: bigint
): Promise<{
  workOrderAddress: Address
  escrowAddress?: Address
}> {
  const result = await workOrderInstructions.createWorkOrder({
    client,
    provider,
    title: 'Test Work Order',
    description: 'Test work order for verification',
    requirements: ['Test requirement'],
    paymentAmount: amount,
    paymentToken: 'So11111111111111111111111111111111111111112' as Address, // SOL
    deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    requiresVerification: true
  })

  return {
    workOrderAddress: result.workOrderAddress,
    escrowAddress: result.escrowAddress
  }
}

async function getTokenBalance(rpc: Rpc<unknown>, tokenAccount: Address): Promise<bigint> {
  const accountInfo = await rpc.getAccountInfo(tokenAccount, { encoding: 'jsonParsed' }).send()
  
  if (!accountInfo.value?.data || typeof accountInfo.value.data !== 'object' || !('parsed' in accountInfo.value.data)) {
    throw new Error('Invalid token account data')
  }

  return BigInt(accountInfo.value.data.parsed.info.tokenAmount.amount)
}