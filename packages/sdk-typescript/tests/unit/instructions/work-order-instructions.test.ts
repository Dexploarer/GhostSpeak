/**
 * Unit tests for WorkOrderInstructions
 * 
 * Tests work order creation, milestone management, deliveries,
 * verification, disputes, and payment processing.
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
import { WorkOrderInstructions } from '../../src/client/instructions/WorkOrderInstructions'
import type { GhostSpeakConfig } from '../../src/types'
import type { 
  WorkOrder,
  WorkOrderMilestone,
  WorkDelivery,
  WorkOrderStatus,
  DeliveryStatus,
  VerificationResult
} from '../../src/generated'

// Mock the generated instructions
vi.mock('../../src/generated', () => ({
  getCreateWorkOrderInstruction: vi.fn(),
  getAddWorkOrderMilestoneInstruction: vi.fn(),
  getSubmitWorkDeliveryInstruction: vi.fn(),
  getVerifyWorkDeliveryInstruction: vi.fn(),
  getApproveWorkDeliveryInstruction: vi.fn(),
  getRejectWorkDeliveryInstruction: vi.fn(),
  getUpdateWorkOrderStatusInstruction: vi.fn(),
  getProcessMilestonePaymentInstruction: vi.fn(),
  getRaiseWorkOrderDisputeInstruction: vi.fn(),
  getResolveWorkOrderDisputeInstruction: vi.fn(),
  getWorkOrderDecoder: vi.fn(),
  getWorkOrderMilestoneDecoder: vi.fn(),
  getWorkDeliveryDecoder: vi.fn()
}))

// Mock escrow utilities
vi.mock('../../src/utils/escrow-helpers', () => ({
  calculateEscrowAmount: vi.fn(),
  verifyEscrowBalance: vi.fn(),
  processEscrowRelease: vi.fn()
}))

describe('WorkOrderInstructions', () => {
  let workOrder: WorkOrderInstructions
  let mockRpc: vi.Mocked<Rpc<unknown>>
  let mockConfig: GhostSpeakConfig
  let client: TransactionSigner
  let provider: TransactionSigner
  let workOrderAddress: Address
  let escrowAddress: Address

  beforeEach(async () => {
    // Setup mocks
    client = await generateKeyPairSigner()
    provider = await generateKeyPairSigner()
    workOrderAddress = address('WorkOrder111111111111111111111111111111111')
    escrowAddress = address('Escrow111111111111111111111111111111111111')
    
    mockRpc = {
      getLatestBlockhash: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({
          value: {
            blockhash: 'mock-blockhash' as unknown as Blockhash,
            lastValidBlockHeight: 123456n
          }
        })
      }),
      sendTransaction: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue('mock-signature')
      }),
      confirmTransaction: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(true)
      }),
      getAccountInfo: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({ value: null })
      }),
      getProgramAccounts: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue([])
      })
    } as unknown as vi.Mocked<Rpc<unknown>>

    mockConfig = {
      rpc: mockRpc,
      programId: address('GHOST1VYEzX9gPsJdDVMXQmL8aZAQoLZfxCMbKfYohcvy'),
      commitment: 'confirmed'
    }

    workOrder = new WorkOrderInstructions(mockConfig)
  })

  describe('createWorkOrder', () => {
    it('should create a work order with milestones', async () => {
      const { getCreateWorkOrderInstruction } = await import('../../src/generated')
      
      ;(getCreateWorkOrderInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const milestones: WorkOrderMilestone[] = [
        {
          id: 1,
          title: 'Design Phase',
          description: 'Complete UI/UX designs',
          amount: 200_000_000n, // 200 tokens
          deadline: BigInt(Date.now() / 1000 + 7 * 86400), // 1 week
          status: 'pending'
        },
        {
          id: 2,
          title: 'Development Phase',
          description: 'Implement core functionality',
          amount: 500_000_000n, // 500 tokens
          deadline: BigInt(Date.now() / 1000 + 21 * 86400), // 3 weeks
          status: 'pending'
        },
        {
          id: 3,
          title: 'Testing & Deployment',
          description: 'Test and deploy to production',
          amount: 300_000_000n, // 300 tokens
          deadline: BigInt(Date.now() / 1000 + 30 * 86400), // 30 days
          status: 'pending'
        }
      ]

      const result = await workOrder.createWorkOrder({
        workOrderAccount: workOrderAddress,
        client: client.address,
        provider: provider.address,
        title: 'Build DEX Integration',
        description: 'Integrate protocol with major DEXs',
        totalAmount: 1_000_000_000n, // 1000 tokens total
        milestones,
        escrowAccount: escrowAddress,
        deliveryRequirements: [
          'Source code with documentation',
          'Test coverage > 90%',
          'Deployment guide'
        ],
        signer: client
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.workOrder).toBe(workOrderAddress)
      expect(getCreateWorkOrderInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          workOrder: workOrderAddress,
          client: client.address,
          provider: provider.address,
          escrow: escrowAddress,
          title: 'Build DEX Integration',
          totalAmount: 1_000_000_000n,
          milestones
        })
      )
    })

    it('should validate milestone amounts equal total', async () => {
      const milestones: WorkOrderMilestone[] = [
        {
          id: 1,
          title: 'Phase 1',
          amount: 400_000_000n,
          deadline: BigInt(Date.now() / 1000 + 86400),
          status: 'pending'
        },
        {
          id: 2,
          title: 'Phase 2',
          amount: 500_000_000n, // Total is 900, not 1000
          deadline: BigInt(Date.now() / 1000 + 172800),
          status: 'pending'
        }
      ]

      await expect(
        workOrder.createWorkOrder({
          workOrderAccount: workOrderAddress,
          client: client.address,
          provider: provider.address,
          title: 'Test Order',
          totalAmount: 1_000_000_000n,
          milestones,
          escrowAccount: escrowAddress,
          signer: client
        })
      ).rejects.toThrow('Milestone amounts must equal total amount')
    })

    it('should create work order without milestones', async () => {
      const { getCreateWorkOrderInstruction } = await import('../../src/generated')
      
      ;(getCreateWorkOrderInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await workOrder.createWorkOrder({
        workOrderAccount: workOrderAddress,
        client: client.address,
        provider: provider.address,
        title: 'Simple Task',
        description: 'One-time delivery',
        totalAmount: 500_000_000n,
        escrowAccount: escrowAddress,
        estimatedDuration: 5, // 5 days
        signer: client
      })

      expect(getCreateWorkOrderInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          milestones: [],
          estimatedDuration: 5
        })
      )
    })
  })

  describe('addWorkOrderMilestone', () => {
    it('should add milestone to existing work order', async () => {
      const { getAddWorkOrderMilestoneInstruction } = await import('../../src/generated')
      const milestoneAddress = address('Milestone11111111111111111111111111111111')
      
      ;(getAddWorkOrderMilestoneInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const milestone: WorkOrderMilestone = {
        id: 4,
        title: 'Bonus Feature',
        description: 'Add advanced analytics',
        amount: 150_000_000n,
        deadline: BigInt(Date.now() / 1000 + 14 * 86400),
        status: 'pending',
        dependencies: [1, 2] // Depends on milestones 1 and 2
      }

      const result = await workOrder.addWorkOrderMilestone({
        workOrder: workOrderAddress,
        milestoneAccount: milestoneAddress,
        milestone,
        signer: client
      })

      expect(result.signature).toBe('mock-signature')
      expect(getAddWorkOrderMilestoneInstruction).toHaveBeenCalledWith({
        workOrder: workOrderAddress,
        milestone: milestoneAddress,
        client: client,
        milestoneData: milestone
      })
    })
  })

  describe('submitWorkDelivery', () => {
    it('should submit work delivery for milestone', async () => {
      const { getSubmitWorkDeliveryInstruction } = await import('../../src/generated')
      const deliveryAddress = address('Delivery111111111111111111111111111111111')
      
      ;(getSubmitWorkDeliveryInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await workOrder.submitWorkDelivery({
        workOrder: workOrderAddress,
        deliveryAccount: deliveryAddress,
        milestoneId: 1,
        deliverables: [
          'https://github.com/repo/commit/abc123',
          'ipfs://QmDesignFiles',
          'https://docs.project.com/phase1'
        ],
        notes: 'Design phase completed with all mockups and wireframes',
        signer: provider
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.delivery).toBe(deliveryAddress)
      expect(getSubmitWorkDeliveryInstruction).toHaveBeenCalledWith({
        workOrder: workOrderAddress,
        delivery: deliveryAddress,
        provider,
        milestoneId: 1,
        deliverables: expect.any(Array),
        notes: expect.any(String)
      })
    })

    it('should submit final delivery for work order', async () => {
      const { getSubmitWorkDeliveryInstruction } = await import('../../src/generated')
      const deliveryAddress = address('FinalDelivery11111111111111111111111111111')
      
      ;(getSubmitWorkDeliveryInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await workOrder.submitWorkDelivery({
        workOrder: workOrderAddress,
        deliveryAccount: deliveryAddress,
        isFinalDelivery: true,
        deliverables: [
          'https://github.com/repo/releases/v1.0.0',
          'ipfs://QmProductionBuild',
          'https://app.production.com'
        ],
        notes: 'All milestones completed. Production deployment ready.',
        metadata: {
          version: '1.0.0',
          testCoverage: '95.2%',
          performanceMetrics: {
            loadTime: '1.2s',
            throughput: '1000 tps'
          }
        },
        signer: provider
      })

      expect(getSubmitWorkDeliveryInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          isFinalDelivery: true,
          metadata: expect.any(Object)
        })
      )
    })
  })

  describe('verifyWorkDelivery', () => {
    it('should verify delivery with automated checks', async () => {
      const { getVerifyWorkDeliveryInstruction } = await import('../../src/generated')
      const deliveryAddress = address('Delivery222222222222222222222222222222222')
      
      ;(getVerifyWorkDeliveryInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const verificationResult: VerificationResult = {
        passed: true,
        checks: [
          { name: 'Code Quality', passed: true, score: 92 },
          { name: 'Test Coverage', passed: true, score: 95 },
          { name: 'Documentation', passed: true, score: 88 },
          { name: 'Performance', passed: true, score: 90 }
        ],
        overallScore: 91,
        notes: 'All automated checks passed'
      }

      const result = await workOrder.verifyWorkDelivery({
        workOrder: workOrderAddress,
        delivery: deliveryAddress,
        verificationResult,
        signer: client
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.verificationPassed).toBe(true)
      expect(getVerifyWorkDeliveryInstruction).toHaveBeenCalledWith({
        workOrder: workOrderAddress,
        delivery: deliveryAddress,
        client,
        verificationResult
      })
    })

    it('should handle failed verification', async () => {
      const { getVerifyWorkDeliveryInstruction } = await import('../../src/generated')
      const deliveryAddress = address('Delivery333333333333333333333333333333333')
      
      ;(getVerifyWorkDeliveryInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const verificationResult: VerificationResult = {
        passed: false,
        checks: [
          { name: 'Code Quality', passed: true, score: 85 },
          { name: 'Test Coverage', passed: false, score: 65 }, // Below threshold
          { name: 'Documentation', passed: true, score: 80 },
          { name: 'Performance', passed: false, score: 70 }
        ],
        overallScore: 75,
        notes: 'Test coverage and performance below requirements'
      }

      const result = await workOrder.verifyWorkDelivery({
        workOrder: workOrderAddress,
        delivery: deliveryAddress,
        verificationResult,
        requireRevision: true,
        revisionNotes: 'Please improve test coverage to at least 90% and optimize performance',
        signer: client
      })

      expect(result.verificationPassed).toBe(false)
      expect(result.requiresRevision).toBe(true)
    })
  })

  describe('approveWorkDelivery', () => {
    it('should approve delivery and release payment', async () => {
      const { getApproveWorkDeliveryInstruction } = await import('../../src/generated')
      const { processEscrowRelease } = await import('../../src/utils/escrow-helpers')
      const deliveryAddress = address('Delivery444444444444444444444444444444444')
      
      ;(getApproveWorkDeliveryInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })
      ;(processEscrowRelease as vi.Mock).mockResolvedValue({
        released: true,
        amount: 200_000_000n,
        transactionSignature: 'escrow-release-sig'
      })

      const result = await workOrder.approveWorkDelivery({
        workOrder: workOrderAddress,
        delivery: deliveryAddress,
        escrow: escrowAddress,
        rating: 9500, // 95/100
        feedback: 'Excellent work! Delivered ahead of schedule with great quality.',
        tip: 20_000_000n, // 20 token bonus
        signer: client
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.paymentReleased).toBe(true)
      expect(getApproveWorkDeliveryInstruction).toHaveBeenCalledWith({
        workOrder: workOrderAddress,
        delivery: deliveryAddress,
        escrow: escrowAddress,
        client,
        rating: 9500,
        feedback: expect.any(String),
        tip: 20_000_000n
      })
    })
  })

  describe('rejectWorkDelivery', () => {
    it('should reject delivery with reasons', async () => {
      const { getRejectWorkDeliveryInstruction } = await import('../../src/generated')
      const deliveryAddress = address('Delivery555555555555555555555555555555555')
      
      ;(getRejectWorkDeliveryInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await workOrder.rejectWorkDelivery({
        workOrder: workOrderAddress,
        delivery: deliveryAddress,
        reasons: [
          'Missing key functionality described in requirements',
          'Code quality does not meet standards',
          'No documentation provided'
        ],
        allowResubmission: true,
        resubmissionDeadline: BigInt(Date.now() / 1000 + 3 * 86400), // 3 days
        signer: client
      })

      expect(result.signature).toBe('mock-signature')
      expect(getRejectWorkDeliveryInstruction).toHaveBeenCalledWith({
        workOrder: workOrderAddress,
        delivery: deliveryAddress,
        client,
        reasons: expect.any(Array),
        allowResubmission: true,
        resubmissionDeadline: expect.any(BigInt)
      })
    })
  })

  describe('processMilestonePayment', () => {
    it('should process payment for approved milestone', async () => {
      const { getProcessMilestonePaymentInstruction } = await import('../../src/generated')
      const { processEscrowRelease } = await import('../../src/utils/escrow-helpers')
      
      ;(getProcessMilestonePaymentInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })
      ;(processEscrowRelease as vi.Mock).mockResolvedValue({
        released: true,
        amount: 500_000_000n,
        transactionSignature: 'milestone-payment-sig'
      })

      const result = await workOrder.processMilestonePayment({
        workOrder: workOrderAddress,
        milestoneId: 2,
        escrow: escrowAddress,
        signer: client
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.amountReleased).toBe(500_000_000n)
      expect(getProcessMilestonePaymentInstruction).toHaveBeenCalledWith({
        workOrder: workOrderAddress,
        escrow: escrowAddress,
        authority: client,
        milestoneId: 2
      })
    })
  })

  describe('Work Order Disputes', () => {
    it('should raise dispute for work order', async () => {
      const { getRaiseWorkOrderDisputeInstruction } = await import('../../src/generated')
      const disputeAddress = address('Dispute11111111111111111111111111111111111')
      
      ;(getRaiseWorkOrderDisputeInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await workOrder.raiseDispute({
        workOrder: workOrderAddress,
        disputeAccount: disputeAddress,
        reason: 'Provider failed to deliver milestone 3 after multiple extensions',
        evidence: [
          'ipfs://QmCommunicationHistory',
          'ipfs://QmDeliveryAttempts',
          'https://docs.project.com/requirements'
        ],
        requestedResolution: 'partial_refund',
        requestedAmount: 300_000_000n, // Refund for undelivered milestone
        signer: client
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.dispute).toBe(disputeAddress)
      expect(getRaiseWorkOrderDisputeInstruction).toHaveBeenCalledWith({
        workOrder: workOrderAddress,
        dispute: disputeAddress,
        disputant: client,
        reason: expect.any(String),
        evidence: expect.any(Array),
        requestedResolution: 'partial_refund',
        requestedAmount: 300_000_000n
      })
    })

    it('should resolve dispute with mediator', async () => {
      const { getResolveWorkOrderDisputeInstruction } = await import('../../src/generated')
      const disputeAddress = address('Dispute22222222222222222222222222222222222')
      const mediator = await generateKeyPairSigner()
      
      ;(getResolveWorkOrderDisputeInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await workOrder.resolveDispute({
        workOrder: workOrderAddress,
        dispute: disputeAddress,
        resolution: {
          type: 'split_payment',
          clientAmount: 150_000_000n, // Client gets 50% refund
          providerAmount: 150_000_000n, // Provider keeps 50%
          reasoning: 'Partial delivery completed but quality issues identified'
        },
        mediator,
        signer: mediator
      })

      expect(result.signature).toBe('mock-signature')
      expect(getResolveWorkOrderDisputeInstruction).toHaveBeenCalledWith({
        workOrder: workOrderAddress,
        dispute: disputeAddress,
        mediator,
        resolution: expect.any(Object)
      })
    })
  })

  describe('Query Operations', () => {
    it('should get work order by address', async () => {
      const mockWorkOrder: WorkOrder = {
        orderId: 123n,
        client: client.address,
        provider: provider.address,
        title: 'Build DEX Integration',
        description: 'Integrate protocol with major DEXs',
        totalAmount: 1_000_000_000n,
        escrow: escrowAddress,
        status: 'in_progress' as WorkOrderStatus,
        milestones: [],
        createdAt: BigInt(Date.now() / 1000 - 86400),
        updatedAt: BigInt(Date.now() / 1000),
        completedAt: null,
        deliveries: [],
        currentMilestone: 2,
        paymentsReleased: 200_000_000n,
        rating: null
      }

      const { getWorkOrderDecoder } = await import('../../src/generated')
      ;(getWorkOrderDecoder as vi.Mock).mockReturnValue({
        decode: vi.fn().mockReturnValue(mockWorkOrder)
      })

      mockRpc.getAccountInfo = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({
          value: {
            data: new Uint8Array(1000),
            owner: mockConfig.programId
          }
        })
      })

      const result = await workOrder.getWorkOrder(workOrderAddress)

      expect(result).toBeDefined()
      expect(result?.orderId).toBe(123n)
      expect(result?.status).toBe('in_progress')
      expect(result?.paymentsReleased).toBe(200_000_000n)
    })

    it('should query work orders by status', async () => {
      const mockOrders = [
        {
          address: address('WO1111111111111111111111111111111111111111'),
          data: {
            orderId: 1n,
            status: 'in_progress' as WorkOrderStatus,
            client: client.address,
            totalAmount: 500_000_000n
          }
        },
        {
          address: address('WO2222222222222222222222222222222222222222'),
          data: {
            orderId: 2n,
            status: 'in_progress' as WorkOrderStatus,
            provider: provider.address,
            totalAmount: 750_000_000n
          }
        }
      ]

      const { getWorkOrderDecoder } = await import('../../src/generated')
      ;(getWorkOrderDecoder as vi.Mock).mockReturnValue({
        decode: (data: any) => data
      })

      mockRpc.getProgramAccounts = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockOrders)
      })

      const results = await workOrder.queryWorkOrders({
        status: 'in_progress',
        client: client.address
      })

      expect(results).toHaveLength(1)
      expect(results[0].orderId).toBe(1n)
    })

    it('should get work deliveries for order', async () => {
      const mockDeliveries: WorkDelivery[] = [
        {
          deliveryId: 1n,
          workOrder: workOrderAddress,
          milestoneId: 1,
          provider: provider.address,
          deliverables: ['ipfs://QmDelivery1'],
          submittedAt: BigInt(Date.now() / 1000 - 3600),
          status: 'approved' as DeliveryStatus,
          verificationResult: { passed: true, overallScore: 90 },
          approvedAt: BigInt(Date.now() / 1000 - 1800),
          rating: 9000
        },
        {
          deliveryId: 2n,
          workOrder: workOrderAddress,
          milestoneId: 2,
          provider: provider.address,
          deliverables: ['ipfs://QmDelivery2'],
          submittedAt: BigInt(Date.now() / 1000 - 600),
          status: 'pending_review' as DeliveryStatus,
          verificationResult: null,
          approvedAt: null,
          rating: null
        }
      ]

      vi.spyOn(workOrder, 'getWorkDeliveries').mockResolvedValue(mockDeliveries)

      const deliveries = await workOrder.getWorkDeliveries(workOrderAddress)

      expect(deliveries).toHaveLength(2)
      expect(deliveries[0].status).toBe('approved')
      expect(deliveries[1].status).toBe('pending_review')
    })

    it('should calculate work order progress', async () => {
      const mockWorkOrder: WorkOrder = {
        orderId: 456n,
        client: client.address,
        provider: provider.address,
        title: 'Complex Project',
        totalAmount: 1_000_000_000n,
        escrow: escrowAddress,
        status: 'in_progress' as WorkOrderStatus,
        milestones: [
          { id: 1, amount: 200_000_000n, status: 'completed' },
          { id: 2, amount: 500_000_000n, status: 'completed' },
          { id: 3, amount: 300_000_000n, status: 'in_progress' }
        ],
        paymentsReleased: 700_000_000n,
        createdAt: BigInt(Date.now() / 1000 - 30 * 86400),
        updatedAt: BigInt(Date.now() / 1000)
      }

      vi.spyOn(workOrder, 'getWorkOrder').mockResolvedValue(mockWorkOrder)

      const progress = await workOrder.calculateWorkOrderProgress(workOrderAddress)

      expect(progress.milestonesCompleted).toBe(2)
      expect(progress.totalMilestones).toBe(3)
      expect(progress.progressPercentage).toBe(70) // 700M of 1000M paid
      expect(progress.timeElapsed).toBeGreaterThan(0)
      expect(progress.estimatedCompletion).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing work order gracefully', async () => {
      mockRpc.getAccountInfo = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({ value: null })
      })

      const result = await workOrder.getWorkOrder(workOrderAddress)
      expect(result).toBeNull()
    })

    it('should validate delivery requirements', async () => {
      await expect(
        workOrder.submitWorkDelivery({
          workOrder: workOrderAddress,
          deliveryAccount: address('Invalid11111111111111111111111111111111111'),
          milestoneId: 1,
          deliverables: [], // Empty deliverables
          signer: provider
        })
      ).rejects.toThrow('At least one deliverable must be provided')
    })

    it('should prevent double approval', async () => {
      // Mock work order with already approved delivery
      const mockDelivery: WorkDelivery = {
        deliveryId: 1n,
        workOrder: workOrderAddress,
        status: 'approved' as DeliveryStatus,
        approvedAt: BigInt(Date.now() / 1000 - 3600)
      }

      vi.spyOn(workOrder, 'getWorkDelivery').mockResolvedValue(mockDelivery)

      await expect(
        workOrder.approveWorkDelivery({
          workOrder: workOrderAddress,
          delivery: address('Delivery666666666666666666666666666666666'),
          escrow: escrowAddress,
          signer: client
        })
      ).rejects.toThrow('Delivery already approved')
    })
  })

  describe('Batch Operations', () => {
    it('should approve multiple milestones in batch', async () => {
      const milestoneIds = [1, 2, 3]
      const deliveries = [
        address('Del1111111111111111111111111111111111111111'),
        address('Del2222222222222222222222222222222222222222'),
        address('Del3333333333333333333333333333333333333333')
      ]

      const results = await workOrder.batchApproveMilestones({
        workOrder: workOrderAddress,
        approvals: milestoneIds.map((id, i) => ({
          milestoneId: id,
          delivery: deliveries[i],
          rating: 9000 + i * 100,
          feedback: `Milestone ${id} completed successfully`
        })),
        escrow: escrowAddress,
        signer: client
      })

      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
      expect(results[0].milestoneId).toBe(1)
      expect(results[2].milestoneId).toBe(3)
    })
  })
})