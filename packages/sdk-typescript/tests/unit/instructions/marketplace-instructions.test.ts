/**
 * Unit tests for MarketplaceInstructions
 * 
 * Tests all marketplace functionality including service listings,
 * job postings, purchases with Token-2022 transfer fees, and work orders.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  generateKeyPairSigner, 
  address,
  createTransactionMessage,
  appendTransactionMessageInstructions,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners
} from '@solana/kit'
import type { Address, TransactionSigner, Rpc, Blockhash } from '@solana/kit'
import { MarketplaceInstructions } from '../../src/client/instructions/MarketplaceInstructions'
import type { GhostSpeakConfig } from '../../src/types'
import type { ServiceListing, JobPosting, WorkOrder } from '../../src/generated'
import { 
  getCreateServiceListingInstruction,
  getCreateJobPostingInstruction,
  getPurchaseServiceInstruction,
  getApplyToJobInstruction,
  getAcceptJobApplicationInstruction,
  getVerifyWorkDeliveryInstruction
} from '../../src/generated'

// Mock the generated instructions
vi.mock('../../src/generated', () => ({
  getCreateServiceListingInstruction: vi.fn(),
  getCreateJobPostingInstruction: vi.fn(),
  getPurchaseServiceInstruction: vi.fn(),
  getApplyToJobInstruction: vi.fn(),
  getAcceptJobApplicationInstruction: vi.fn(),
  getProcessEscrowPaymentInstructionAsync: vi.fn(),
  getVerifyWorkDeliveryInstruction: vi.fn(),
  getServiceListingDecoder: vi.fn(),
  getJobPostingDecoder: vi.fn(),
  getWorkOrderDecoder: vi.fn()
}))

// Mock token utilities
vi.mock('../../src/utils/token-utils', () => ({
  hasTransferFees: vi.fn(),
  fetchTransferFeeConfig: vi.fn()
}))

// Mock token-2022 extensions
vi.mock('../../src/utils/token-2022-extensions', () => ({
  calculateTransferFee: vi.fn(),
  calculateRequiredAmountForNetTransfer: vi.fn()
}))

describe('MarketplaceInstructions', () => {
  let marketplace: MarketplaceInstructions
  let mockRpc: vi.Mocked<Rpc<unknown>>
  let mockConfig: GhostSpeakConfig
  let signer: TransactionSigner
  let agent: Address
  let userRegistry: Address

  beforeEach(async () => {
    // Setup mocks
    signer = await generateKeyPairSigner()
    agent = address('Agent111111111111111111111111111111111111111')
    userRegistry = address('Registry11111111111111111111111111111111111')
    
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

    marketplace = new MarketplaceInstructions(mockConfig)
  })

  describe('createServiceListing', () => {
    it('should create a service listing with smart defaults', async () => {
      const listingAddress = address('Listing11111111111111111111111111111111111')
      const mockInstruction = { programAddress: mockConfig.programId, accounts: [], data: new Uint8Array() }
      
      ;(getCreateServiceListingInstruction as vi.Mock).mockReturnValue(mockInstruction)

      const params = {
        title: 'AI Code Review Service',
        description: 'Professional code review with security analysis',
        amount: 100_000_000n // 100 tokens
      }

      const result = await marketplace.createServiceListing(
        signer,
        listingAddress,
        agent,
        userRegistry,
        params
      )

      expect(result).toBe('mock-signature')
      expect(getCreateServiceListingInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceListing: listingAddress,
          agent,
          userRegistry,
          creator: signer,
          title: params.title,
          description: params.description,
          price: params.amount,
          serviceType: 'general', // default
          estimatedDelivery: expect.any(BigInt),
          tags: [],
          listingId: expect.stringMatching(/^listing-\d+-[a-z0-9]+$/)
        })
      )
    })

    it('should handle custom parameters', async () => {
      const listingAddress = address('Listing22222222222222222222222222222222222')
      const mockInstruction = { programAddress: mockConfig.programId, accounts: [], data: new Uint8Array() }
      const customToken = address('Token111111111111111111111111111111111111111')
      
      ;(getCreateServiceListingInstruction as vi.Mock).mockReturnValue(mockInstruction)

      const params = {
        title: 'Smart Contract Audit',
        description: 'Comprehensive security audit',
        amount: 500_000_000n,
        tokenMint: customToken,
        serviceType: 'security-audit',
        tags: ['security', 'audit', 'solana'],
        estimatedDelivery: 172800n // 2 days
      }

      await marketplace.createServiceListing(
        signer,
        listingAddress,
        agent,
        userRegistry,
        params
      )

      expect(getCreateServiceListingInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenMint: customToken,
          serviceType: 'security-audit',
          tags: ['security', 'audit', 'solana'],
          estimatedDelivery: 172800n
        })
      )
    })

    it('should handle transaction errors gracefully', async () => {
      const listingAddress = address('Listing33333333333333333333333333333333333')
      ;(getCreateServiceListingInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })
      
      mockRpc.sendTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('Transaction failed'))
      })

      await expect(
        marketplace.createServiceListing(
          signer,
          listingAddress,
          agent,
          userRegistry,
          { title: 'Test', description: 'Test', amount: 100n }
        )
      ).rejects.toThrow('Failed to execute service listing creation')
    })
  })

  describe('purchaseService with Token-2022 Transfer Fees', () => {
    it('should calculate transfer fees when enabled', async () => {
      const { hasTransferFees, fetchTransferFeeConfig } = await import('../../src/utils/token-utils')
      const { calculateTransferFee } = await import('../../src/utils/token-2022-extensions')
      
      const purchaseAddress = address('Purchase1111111111111111111111111111111111')
      const listingAddress = address('Listing44444444444444444444444444444444444')
      const paymentToken = address('FeeToken1111111111111111111111111111111111')
      
      // Mock service listing data
      const mockListing: ServiceListing = {
        isActive: true,
        creator: signer.address,
        agent,
        title: 'Test Service',
        description: 'Test',
        price: 100_000_000n,
        tokenMint: paymentToken,
        serviceType: 'test',
        estimatedDelivery: 86400n,
        tags: [],
        listingId: 'test-123',
        createdAt: Date.now() / 1000,
        updatedAt: Date.now() / 1000
      }

      vi.spyOn(marketplace, 'getServiceListing').mockResolvedValue(mockListing)
      
      // Mock transfer fee config
      ;(hasTransferFees as vi.Mock).mockResolvedValue(true)
      ;(fetchTransferFeeConfig as vi.Mock).mockResolvedValue({
        transferFeeBasisPoints: 250, // 2.5%
        maximumFee: 10_000_000n,
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })
      
      ;(calculateTransferFee as vi.Mock).mockReturnValue({
        transferAmount: 100_000_000n,
        feeAmount: 2_500_000n,
        netAmount: 97_500_000n,
        feeBasisPoints: 250,
        wasFeeCapped: false
      })

      ;(getPurchaseServiceInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await marketplace.purchaseService(purchaseAddress, {
        serviceListingAddress: listingAddress,
        signer,
        calculateTransferFees: true,
        paymentTokenMint: paymentToken
      })

      expect(result).toBe('mock-signature')
      expect(hasTransferFees).toHaveBeenCalledWith(mockRpc, paymentToken)
      expect(fetchTransferFeeConfig).toHaveBeenCalledWith(mockRpc, paymentToken)
      expect(calculateTransferFee).toHaveBeenCalledWith(
        100_000_000n,
        expect.objectContaining({ transferFeeBasisPoints: 250 })
      )
    })

    it('should handle no transfer fees gracefully', async () => {
      const { hasTransferFees } = await import('../../src/utils/token-utils')
      
      const purchaseAddress = address('Purchase2222222222222222222222222222222222')
      const listingAddress = address('Listing55555555555555555555555555555555555')
      const paymentToken = address('NoFeeToken11111111111111111111111111111111')
      
      const mockListing: ServiceListing = {
        isActive: true,
        creator: signer.address,
        agent,
        title: 'Test Service',
        description: 'Test',
        price: 100_000_000n,
        tokenMint: paymentToken,
        serviceType: 'test',
        estimatedDelivery: 86400n,
        tags: [],
        listingId: 'test-456',
        createdAt: Date.now() / 1000,
        updatedAt: Date.now() / 1000
      }

      vi.spyOn(marketplace, 'getServiceListing').mockResolvedValue(mockListing)
      ;(hasTransferFees as vi.Mock).mockResolvedValue(false)
      ;(getPurchaseServiceInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await marketplace.purchaseService(purchaseAddress, {
        serviceListingAddress: listingAddress,
        signer,
        calculateTransferFees: true,
        paymentTokenMint: paymentToken
      })

      expect(result).toBe('mock-signature')
      expect(hasTransferFees).toHaveBeenCalledWith(mockRpc, paymentToken)
    })

    it('should calculate required amount for net transfers', async () => {
      const { hasTransferFees, fetchTransferFeeConfig } = await import('../../src/utils/token-utils')
      const { calculateRequiredAmountForNetTransfer } = await import('../../src/utils/token-2022-extensions')
      
      const purchaseAddress = address('Purchase3333333333333333333333333333333333')
      const listingAddress = address('Listing66666666666666666666666666666666666')
      const paymentToken = address('FeeToken2222222222222222222222222222222222')
      
      const mockListing: ServiceListing = {
        isActive: true,
        creator: signer.address,
        agent,
        title: 'Test Service',
        description: 'Test',
        price: 100_000_000n,
        tokenMint: paymentToken,
        serviceType: 'test',
        estimatedDelivery: 86400n,
        tags: [],
        listingId: 'test-789',
        createdAt: Date.now() / 1000,
        updatedAt: Date.now() / 1000
      }

      vi.spyOn(marketplace, 'getServiceListing').mockResolvedValue(mockListing)
      
      // Mock transfer fee config
      ;(hasTransferFees as vi.Mock).mockResolvedValue(true)
      ;(fetchTransferFeeConfig as vi.Mock).mockResolvedValue({
        transferFeeBasisPoints: 250,
        maximumFee: 10_000_000n,
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })
      
      ;(calculateRequiredAmountForNetTransfer as vi.Mock).mockReturnValue({
        transferAmount: 102_564_103n, // Amount needed to ensure seller gets 100M
        feeAmount: 2_564_103n,
        netAmount: 100_000_000n,
        feeBasisPoints: 250,
        wasFeeCapped: false
      })

      ;(getPurchaseServiceInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await marketplace.purchaseService(purchaseAddress, {
        serviceListingAddress: listingAddress,
        signer,
        calculateTransferFees: true,
        paymentTokenMint: paymentToken,
        expectedNetAmount: 100_000_000n // Seller should receive exactly 100M
      })

      expect(calculateRequiredAmountForNetTransfer).toHaveBeenCalledWith(
        100_000_000n,
        expect.objectContaining({ transferFeeBasisPoints: 250 })
      )
    })
  })

  describe('createJobPosting', () => {
    it('should create job posting with smart defaults', async () => {
      const jobAddress = address('Job111111111111111111111111111111111111111')
      const mockInstruction = { programAddress: mockConfig.programId, accounts: [], data: new Uint8Array() }
      
      ;(getCreateJobPostingInstruction as vi.Mock).mockReturnValue(mockInstruction)

      const params = {
        title: 'Build DEX Integration',
        description: 'Integrate our protocol with major DEXs',
        amount: 1000_000_000n // 1000 tokens
      }

      await marketplace.createJobPosting(jobAddress, { ...params, signer })

      expect(getCreateJobPostingInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          jobPosting: jobAddress,
          employer: signer,
          title: params.title,
          description: params.description,
          budget: params.amount,
          requirements: [],
          skillsNeeded: [],
          budgetMin: params.amount,
          budgetMax: params.amount,
          jobType: 'fixed', // default
          experienceLevel: 'any' // default
        })
      )
    })

    it('should handle budget range properly', async () => {
      const jobAddress = address('Job222222222222222222222222222222222222222')
      ;(getCreateJobPostingInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const params = {
        title: 'Senior Smart Contract Developer',
        description: 'Long-term development role',
        budgetMin: 500_000_000n,
        budgetMax: 1500_000_000n,
        jobType: 'hourly',
        experienceLevel: 'senior',
        skillsNeeded: ['rust', 'anchor', 'solana'],
        requirements: ['5+ years experience', 'Previous DeFi projects'],
        signer
      }

      await marketplace.createJobPosting(jobAddress, params)

      expect(getCreateJobPostingInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: params.budgetMax, // Uses max as budget
          budgetMin: params.budgetMin,
          budgetMax: params.budgetMax,
          jobType: 'hourly',
          experienceLevel: 'senior',
          skillsNeeded: params.skillsNeeded,
          requirements: params.requirements
        })
      )
    })
  })

  describe('applyToJob', () => {
    it('should submit job application with defaults', async () => {
      const applicationAddress = address('App111111111111111111111111111111111111111')
      const jobAddress = address('Job333333333333333333333333333333333333333')
      const agentAddress = address('Agent22222222222222222222222222222222222222')
      
      ;(getApplyToJobInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await marketplace.applyToJob(applicationAddress, {
        jobPostingAddress: jobAddress,
        agentAddress,
        signer
      })

      expect(getApplyToJobInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          jobApplication: applicationAddress,
          jobPosting: jobAddress,
          agent: agentAddress,
          agentOwner: signer,
          coverLetter: 'I am interested in this job opportunity.', // default
          proposedPrice: 0n,
          estimatedDuration: 7, // default 7 days
          portfolioItems: []
        })
      )
    })

    it('should submit detailed application', async () => {
      const applicationAddress = address('App222222222222222222222222222222222222222')
      const jobAddress = address('Job444444444444444444444444444444444444444')
      const agentAddress = address('Agent33333333333333333333333333333333333333')
      
      ;(getApplyToJobInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const params = {
        jobPostingAddress: jobAddress,
        agentAddress,
        coverLetter: 'I have extensive experience with Solana smart contracts...',
        proposedPrice: 800_000_000n,
        estimatedDuration: 14, // 2 weeks
        proposedRate: 50_000_000n, // 50 tokens/day
        portfolioItems: ['ipfs://portfolio1', 'ipfs://portfolio2'],
        signer
      }

      await marketplace.applyToJob(applicationAddress, params)

      expect(getApplyToJobInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          coverLetter: params.coverLetter,
          proposedPrice: params.proposedPrice,
          estimatedDuration: params.estimatedDuration,
          proposedRate: params.proposedRate,
          portfolioItems: params.portfolioItems
        })
      )
    })
  })

  describe('Work Order Operations', () => {
    it('should verify work delivery', async () => {
      const workOrderAddress = address('WO1111111111111111111111111111111111111111')
      const deliveryAddress = address('Del111111111111111111111111111111111111111')
      
      ;(getVerifyWorkDeliveryInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await marketplace.verifyWorkDelivery({
        workOrderAddress,
        workDeliveryAddress: deliveryAddress,
        approveDelivery: true,
        verificationNotes: 'Excellent work, all requirements met',
        signer
      })

      expect(getVerifyWorkDeliveryInstruction).toHaveBeenCalledWith({
        workOrder: workOrderAddress,
        workDelivery: deliveryAddress,
        client: signer,
        verificationNotes: 'Excellent work, all requirements met'
      })
    })

    it('should get work orders by user', async () => {
      const userAddress = address('User11111111111111111111111111111111111111')
      const mockWorkOrders = [
        { 
          client: userAddress, 
          provider: address('Provider11111111111111111111111111111111111'),
          orderId: 1n,
          status: 'active'
        },
        { 
          client: address('Other1111111111111111111111111111111111111'),
          provider: userAddress,
          orderId: 2n,
          status: 'completed'
        }
      ]

      // Mock the decoder
      const { getWorkOrderDecoder } = await import('../../src/generated')
      ;(getWorkOrderDecoder as vi.Mock).mockReturnValue({
        decode: (data: any) => data
      })

      mockRpc.getProgramAccounts = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(
          mockWorkOrders.map((wo, i) => ({
            address: address(`WO${i}1111111111111111111111111111111111111`),
            data: wo
          }))
        )
      })

      const clientOrders = await marketplace.getWorkOrdersByUser(userAddress, 'client')
      expect(clientOrders).toHaveLength(1)
      expect(clientOrders[0].client).toBe(userAddress)

      const providerOrders = await marketplace.getWorkOrdersByUser(userAddress, 'provider')
      expect(providerOrders).toHaveLength(1)
      expect(providerOrders[0].provider).toBe(userAddress)
    })
  })

  describe('Search and Filter Operations', () => {
    it('should search services by category', async () => {
      const mockListings = [
        {
          address: address('L1111111111111111111111111111111111111111'),
          data: {
            isActive: true,
            serviceType: 'security-audit',
            tags: ['security', 'audit'],
            title: 'Smart Contract Audit'
          }
        },
        {
          address: address('L2222222222222222222222222222222222222222'),
          data: {
            isActive: true,
            serviceType: 'development',
            tags: ['defi', 'dex'],
            title: 'DEX Development'
          }
        },
        {
          address: address('L3333333333333333333333333333333333333333'),
          data: {
            isActive: true,
            serviceType: 'security-audit',
            tags: ['pentest', 'security'],
            title: 'Penetration Testing'
          }
        }
      ]

      vi.spyOn(marketplace, 'getServiceListings').mockResolvedValue(mockListings as any)

      const securityServices = await marketplace.searchServicesByCategory('security')
      
      expect(securityServices).toHaveLength(2)
      expect(securityServices.every(s => 
        s.data.serviceType?.includes('security') || 
        s.data.tags?.some((t: string) => t.includes('security'))
      )).toBe(true)
    })

    it('should search jobs by budget range', async () => {
      const mockJobs = [
        { budget: 100_000_000n, title: 'Small Task' },
        { budget: 500_000_000n, title: 'Medium Project' },
        { budget: 1000_000_000n, title: 'Large Project' },
        { budget: 2000_000_000n, title: 'Enterprise Project' }
      ]

      vi.spyOn(marketplace, 'getJobPostings').mockResolvedValue(mockJobs as any)

      const mediumJobs = await marketplace.searchJobsByBudget(
        400_000_000n,
        1200_000_000n
      )

      expect(mediumJobs).toHaveLength(2)
      expect(mediumJobs[0].budget).toBe(500_000_000n)
      expect(mediumJobs[1].budget).toBe(1000_000_000n)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing service listing gracefully', async () => {
      const purchaseAddress = address('Purchase4444444444444444444444444444444444')
      const listingAddress = address('Missing11111111111111111111111111111111111')
      
      vi.spyOn(marketplace, 'getServiceListing').mockResolvedValue(null)

      await expect(
        marketplace.purchaseService(purchaseAddress, {
          serviceListingAddress: listingAddress,
          signer
        })
      ).rejects.toThrow('Service listing not found')
    })

    it('should handle RPC errors with enhanced messages', async () => {
      const listingAddress = address('Listing77777777777777777777777777777777777')
      
      mockRpc.getLatestBlockhash = vi.fn().mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('Network error'))
      })

      await expect(
        marketplace.createServiceListing(
          signer,
          listingAddress,
          agent,
          userRegistry,
          { title: 'Test', description: 'Test', amount: 100n }
        )
      ).rejects.toThrow('Failed to execute service listing creation')
    })
  })

  describe('Token Transfer Fee Calculations', () => {
    it('should calculate fees correctly for various amounts', async () => {
      const paymentToken = address('FeeToken3333333333333333333333333333333333')
      const { hasTransferFees, fetchTransferFeeConfig } = await import('../../src/utils/token-utils')
      const { calculateTransferFee } = await import('../../src/utils/token-2022-extensions')
      
      ;(hasTransferFees as vi.Mock).mockResolvedValue(true)
      ;(fetchTransferFeeConfig as vi.Mock).mockResolvedValue({
        transferFeeBasisPoints: 100, // 1%
        maximumFee: 1_000_000n, // Cap at 1 token
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      })

      // Test various amounts
      const testCases = [
        { amount: 10_000_000n, expectedFee: 100_000n }, // 10 tokens -> 0.1 fee
        { amount: 100_000_000n, expectedFee: 1_000_000n }, // 100 tokens -> 1 fee (exactly at cap)
        { amount: 1000_000_000n, expectedFee: 1_000_000n } // 1000 tokens -> 1 fee (capped)
      ]

      for (const { amount, expectedFee } of testCases) {
        ;(calculateTransferFee as vi.Mock).mockReturnValue({
          transferAmount: amount,
          feeAmount: expectedFee,
          netAmount: amount - expectedFee,
          feeBasisPoints: 100,
          wasFeeCapped: amount >= 100_000_000n
        })

        const result = await marketplace.calculateTokenTransferFees(
          amount,
          paymentToken,
          false
        )

        expect(result.feeAmount).toBe(expectedFee)
        expect(result.netAmount).toBe(amount - expectedFee)
      }
    })
  })
})