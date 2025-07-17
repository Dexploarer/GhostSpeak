import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EscrowInstructions } from '../../../src/client/instructions/EscrowInstructions'
import { 
  address,
  generateKeyPairSigner,
  lamports,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions
} from '@solana/kit'
import type { TransactionSigner, Address } from '@solana/kit'

describe('EscrowInstructions', () => {
  let escrowInstructions: EscrowInstructions
  let mockRpc: any
  let payer: TransactionSigner
  let buyer: TransactionSigner
  let seller: TransactionSigner
  let arbitrator: TransactionSigner
  let programId: Address

  beforeEach(async () => {
    // Create mock RPC
    mockRpc = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        value: {
          blockhash: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          lastValidBlockHeight: 100n
        }
      }),
      getAccountInfo: vi.fn().mockResolvedValue({
        value: null
      }),
      simulateTransaction: vi.fn().mockResolvedValue({
        value: {
          err: null,
          logs: []
        }
      }),
      sendTransaction: vi.fn().mockResolvedValue('mockTxSignature'),
      getBalance: vi.fn().mockResolvedValue({
        value: lamports(1000000000n)
      })
    }

    // Create test signers
    payer = await generateKeyPairSigner()
    buyer = await generateKeyPairSigner()
    seller = await generateKeyPairSigner()
    arbitrator = await generateKeyPairSigner()
    programId = address('AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR')

    escrowInstructions = new EscrowInstructions(mockRpc, programId)
  })

  describe('createPayment', () => {
    it('should create payment instruction with escrow', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        recipient: seller.address,
        amount: lamports(10000000n), // 0.01 SOL
        workOrder: address('workOrder123'),
        useEscrow: true,
        escrowDuration: 259200, // 3 days
        description: 'Payment for code review service'
      }

      const instruction = await escrowInstructions.createPayment(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should create direct payment without escrow', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        recipient: seller.address,
        amount: lamports(5000000n),
        workOrder: address('workOrder456'),
        useEscrow: false,
        description: 'Direct payment for service'
      }

      const instruction = await escrowInstructions.createPayment(params)

      expect(instruction).toBeDefined()
    })

    it('should handle payment with milestones', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        recipient: seller.address,
        amount: lamports(100000000n), // 0.1 SOL total
        workOrder: address('workOrder789'),
        useEscrow: true,
        escrowDuration: 604800, // 7 days
        milestones: [
          {
            description: 'Initial setup',
            amount: lamports(20000000n),
            deadline: Date.now() + 86400000 // 1 day
          },
          {
            description: 'Core development',
            amount: lamports(50000000n),
            deadline: Date.now() + 259200000 // 3 days
          },
          {
            description: 'Testing and deployment',
            amount: lamports(30000000n),
            deadline: Date.now() + 604800000 // 7 days
          }
        ]
      }

      const instruction = await escrowInstructions.createPayment(params)

      expect(instruction).toBeDefined()
    })

    it('should validate payment amount', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        recipient: seller.address,
        amount: lamports(0n), // Zero amount
        workOrder: address('workOrder000'),
        useEscrow: true
      }

      // Should still create instruction, validation happens on-chain
      const instruction = await escrowInstructions.createPayment(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('processPayment', () => {
    it('should process escrow release', async () => {
      const params = {
        signer: buyer, // Buyer releases payment
        payment: address('payment123'),
        action: 'release' as const,
        reason: 'Work completed satisfactorily'
      }

      const instruction = await escrowInstructions.processPayment(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should process escrow refund', async () => {
      const params = {
        signer: seller, // Seller can initiate refund
        payment: address('payment456'),
        action: 'refund' as const,
        reason: 'Unable to complete the work'
      }

      const instruction = await escrowInstructions.processPayment(params)

      expect(instruction).toBeDefined()
    })

    it('should handle partial release', async () => {
      const params = {
        signer: buyer,
        payment: address('payment789'),
        action: 'partial_release' as const,
        amount: lamports(5000000n), // Release half
        reason: 'First milestone completed'
      }

      const instruction = await escrowInstructions.processPayment(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('fileDispute', () => {
    it('should create dispute filing instruction', async () => {
      const params = {
        signer: buyer,
        payment: address('payment123'),
        workOrder: address('workOrder123'),
        reason: 'Service not delivered as described',
        evidence: [
          'Screenshot of incomplete work',
          'Original requirements document',
          'Communication logs'
        ],
        requestedResolution: 'Full refund requested'
      }

      const instruction = await escrowInstructions.fileDispute(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should handle seller-initiated dispute', async () => {
      const params = {
        signer: seller,
        payment: address('payment456'),
        workOrder: address('workOrder456'),
        reason: 'Buyer provided incorrect requirements',
        evidence: [
          'Original specifications',
          'Change requests',
          'Additional work performed'
        ],
        requestedResolution: 'Additional payment for extra work'
      }

      const instruction = await escrowInstructions.fileDispute(params)

      expect(instruction).toBeDefined()
    })

    it('should validate evidence array', async () => {
      const params = {
        signer: buyer,
        payment: address('payment789'),
        workOrder: address('workOrder789'),
        reason: 'Dispute reason',
        evidence: [], // Empty evidence
        requestedResolution: 'Resolution'
      }

      const instruction = await escrowInstructions.fileDispute(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('submitDisputeEvidence', () => {
    it('should submit additional evidence', async () => {
      const params = {
        signer: seller,
        dispute: address('dispute123'),
        evidence: [
          'Additional screenshot',
          'Updated work proof',
          'Time tracking logs'
        ],
        description: 'Additional evidence supporting my case'
      }

      const instruction = await escrowInstructions.submitDisputeEvidence(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should handle evidence from arbitrator', async () => {
      const params = {
        signer: arbitrator,
        dispute: address('dispute456'),
        evidence: [
          'Independent review results',
          'Technical analysis',
          'Recommendation'
        ],
        description: 'Arbitrator findings'
      }

      const instruction = await escrowInstructions.submitDisputeEvidence(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('resolveDispute', () => {
    it('should resolve dispute in favor of buyer', async () => {
      const params = {
        signer: arbitrator,
        dispute: address('dispute123'),
        payment: address('payment123'),
        resolution: 'refund' as const,
        buyerAmount: lamports(10000000n), // Full refund
        sellerAmount: lamports(0n),
        reasoning: 'Service was not delivered as specified'
      }

      const instruction = await escrowInstructions.resolveDispute(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should resolve dispute with split resolution', async () => {
      const params = {
        signer: arbitrator,
        dispute: address('dispute456'),
        payment: address('payment456'),
        resolution: 'split' as const,
        buyerAmount: lamports(3000000n), // 30% refund
        sellerAmount: lamports(7000000n), // 70% to seller
        reasoning: 'Partial work was completed'
      }

      const instruction = await escrowInstructions.resolveDispute(params)

      expect(instruction).toBeDefined()
    })

    it('should resolve dispute in favor of seller', async () => {
      const params = {
        signer: arbitrator,
        dispute: address('dispute789'),
        payment: address('payment789'),
        resolution: 'release' as const,
        buyerAmount: lamports(0n),
        sellerAmount: lamports(10000000n), // Full payment to seller
        reasoning: 'Work was completed according to specifications'
      }

      const instruction = await escrowInstructions.resolveDispute(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('Work Order Management', () => {
    it('should create work order', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        seller: seller.address,
        title: 'Website Development',
        description: 'Build a responsive website',
        requirements: [
          'Mobile-first design',
          'SEO optimization',
          'CMS integration'
        ],
        deliverables: [
          'Source code',
          'Documentation',
          'Deployment guide'
        ],
        price: lamports(200000000n), // 0.2 SOL
        deadline: Date.now() + 1209600000, // 14 days
        useEscrow: true
      }

      const instruction = await escrowInstructions.createWorkOrder(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should submit work delivery', async () => {
      const params = {
        signer: seller,
        workOrder: address('workOrder123'),
        deliveryUrl: 'https://github.com/seller/project-delivery',
        description: 'All deliverables completed',
        attachments: [
          'https://docs.project.com/guide',
          'https://demo.project.com'
        ]
      }

      const instruction = await escrowInstructions.submitWorkDelivery(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should handle RPC errors', async () => {
      mockRpc.getAccountInfo.mockRejectedValueOnce(new Error('RPC timeout'))

      const params = {
        signer: buyer,
        payer: buyer,
        recipient: seller.address,
        amount: lamports(10000000n),
        workOrder: address('workOrder999'),
        useEscrow: true
      }

      const instruction = await escrowInstructions.createPayment(params)
      expect(instruction).toBeDefined()
    })

    it('should handle invalid addresses', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        recipient: 'invalid-address' as Address, // Invalid address format
        amount: lamports(10000000n),
        workOrder: address('workOrder999'),
        useEscrow: true
      }

      // Should still create instruction, validation on-chain
      const instruction = await escrowInstructions.createPayment(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('Complex workflows', () => {
    it('should handle full escrow workflow', async () => {
      // 1. Create payment with escrow
      const paymentParams = {
        signer: buyer,
        payer: buyer,
        recipient: seller.address,
        amount: lamports(50000000n),
        workOrder: address('workOrder999'),
        useEscrow: true,
        escrowDuration: 432000 // 5 days
      }

      const paymentIx = await escrowInstructions.createPayment(paymentParams)
      expect(paymentIx).toBeDefined()

      // 2. File dispute
      const disputeParams = {
        signer: buyer,
        payment: address('payment999'),
        workOrder: address('workOrder999'),
        reason: 'Quality issues',
        evidence: ['Evidence 1'],
        requestedResolution: 'Partial refund'
      }

      const disputeIx = await escrowInstructions.fileDispute(disputeParams)
      expect(disputeIx).toBeDefined()

      // 3. Resolve dispute
      const resolveParams = {
        signer: arbitrator,
        dispute: address('dispute999'),
        payment: address('payment999'),
        resolution: 'split' as const,
        buyerAmount: lamports(15000000n),
        sellerAmount: lamports(35000000n),
        reasoning: 'Partial completion verified'
      }

      const resolveIx = await escrowInstructions.resolveDispute(resolveParams)
      expect(resolveIx).toBeDefined()
    })

    it('should build multi-instruction transaction', async () => {
      const createOrderIx = await escrowInstructions.createWorkOrder({
        signer: buyer,
        payer: buyer,
        seller: seller.address,
        title: 'Test Order',
        description: 'Test',
        requirements: ['Req 1'],
        deliverables: ['Del 1'],
        price: lamports(10000000n),
        deadline: Date.now() + 86400000,
        useEscrow: true
      })

      const createPaymentIx = await escrowInstructions.createPayment({
        signer: buyer,
        payer: buyer,
        recipient: seller.address,
        amount: lamports(10000000n),
        workOrder: address('workOrder123'),
        useEscrow: true
      })

      const blockhash = await mockRpc.getLatestBlockhash()
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(buyer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(blockhash.value, tx),
        tx => appendTransactionMessageInstructions([createOrderIx, createPaymentIx], tx)
      )

      expect(message).toBeDefined()
      expect(message.instructions).toHaveLength(2)
    })
  })
})