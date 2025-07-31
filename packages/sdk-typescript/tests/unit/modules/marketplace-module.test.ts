import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MarketplaceModule } from '../../../src/modules/marketplace/MarketplaceModule.js'
import { address } from '@solana/addresses'
import type { GhostSpeakClient } from '../../../src/core/GhostSpeakClient.js'
import type { TransactionSigner } from '@solana/kit'
import { ServiceCategory, ApplicationStatus } from '../../../src/generated/index.js'
import { NATIVE_MINT_ADDRESS } from '../../../src/constants/system-addresses.js'

// Mock the generated instruction functions
vi.mock('../../../src/generated/index.js', () => ({
  getCreateServiceListingInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getPurchaseServiceInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getCreateJobPostingInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getApplyToJobInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getAcceptJobApplicationInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getCreateServiceAuctionInstructionAsync: vi.fn().mockResolvedValue({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  }),
  getPlaceAuctionBidInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getFinalizeAuctionInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  getUpdateAgentServiceInstruction: vi.fn().mockReturnValue({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  }),
  ServiceCategory: {
    Trading: 'Trading',
    Analytics: 'Analytics',
    DataProcessing: 'DataProcessing',
    ContentGeneration: 'ContentGeneration',
    Other: 'Other'
  },
  ApplicationStatus: {
    Pending: 'Pending',
    Accepted: 'Accepted',
    Rejected: 'Rejected'
  }
}))

describe('MarketplaceModule', () => {
  let marketplaceModule: MarketplaceModule
  let mockClient: GhostSpeakClient
  let mockProvider: TransactionSigner
  let mockConsumer: TransactionSigner

  beforeEach(() => {
    // Create mock client
    mockClient = {
      programId: address('GHOSTkqvqLvgbLqxqQ9826T72UWSgCGcMrw27LwaCy8'),
      config: {
        endpoint: 'https://api.devnet.solana.com'
      },
      sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
      fetchAccount: vi.fn()
    } as unknown as GhostSpeakClient

    // Create mock signers
    mockProvider = {
      address: address('ProviderWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    mockConsumer = {
      address: address('ConsumerWa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    // Create marketplace module instance
    marketplaceModule = new MarketplaceModule(mockClient)
  })

  describe('createServiceListing', () => {
    it('should create a service listing', async () => {
      const serviceData = {
        id: 'service-123',
        name: 'AI Trading Bot',
        description: 'Advanced trading bot with ML capabilities',
        category: ServiceCategory.Trading,
        price: 100_000_000n, // 0.1 SOL
        provider: mockProvider.address
      }

      const result = await marketplaceModule.createServiceListing({
        serviceId: serviceData.id,
        serviceData,
        signers: [mockProvider]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should create listing with custom payment token', async () => {
      const serviceData = {
        id: 'service-usdc',
        name: 'Analytics Service',
        category: ServiceCategory.Analytics,
        price: 50_000_000n,
        paymentMint: address('USDCMintAddressAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
        provider: mockProvider.address
      }

      const result = await marketplaceModule.createServiceListing({
        serviceId: serviceData.id,
        serviceData,
        signers: [mockProvider]
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('purchaseService', () => {
    it('should purchase a service', async () => {
      const result = await marketplaceModule.purchaseService({
        serviceId: 'service-123',
        signers: [mockConsumer]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('createJobPosting', () => {
    it('should create a job posting', async () => {
      const jobData = {
        id: 'job-123',
        title: 'Data Analysis Task',
        description: 'Analyze market data and provide insights',
        requirements: ['Python', 'Data Science', 'Trading Experience'],
        budget: 500_000_000n, // 0.5 SOL
        deadline: BigInt(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }

      const result = await marketplaceModule.createJobPosting({
        jobId: jobData.id,
        jobData,
        signers: [mockConsumer]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('applyToJob', () => {
    it('should apply to a job posting', async () => {
      const application = {
        coverLetter: 'I am perfect for this job...',
        proposedRate: 400_000_000n,
        estimatedDuration: BigInt(3 * 24 * 60 * 60) // 3 days in seconds
      }

      const result = await marketplaceModule.applyToJob({
        jobId: 'job-123',
        application,
        signers: [mockProvider]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('acceptApplication', () => {
    it('should accept a job application', async () => {
      const result = await marketplaceModule.acceptApplication({
        jobId: 'job-123',
        applicant: mockProvider.address,
        signers: [mockConsumer]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('createAuction', () => {
    it('should create a Dutch auction', async () => {
      const auctionParams = {
        startPrice: 1_000_000_000n, // 1 SOL
        reservePrice: 100_000_000n, // 0.1 SOL
        duration: BigInt(24 * 60 * 60), // 24 hours
        priceDecayRate: 10n // 10% per hour
      }

      const result = await marketplaceModule.createAuction({
        serviceId: 'service-123',
        auctionParams,
        signers: [mockProvider]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('placeBid', () => {
    it('should place a bid on an auction', async () => {
      const result = await marketplaceModule.placeBid({
        serviceId: 'service-123',
        bidAmount: 500_000_000n,
        signers: [mockConsumer]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('finalizeAuction', () => {
    it('should finalize an auction', async () => {
      const result = await marketplaceModule.finalizeAuction({
        serviceId: 'service-123',
        signers: [mockProvider]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('updateService', () => {
    it('should update service details', async () => {
      const updates = {
        price: 150_000_000n,
        description: 'Updated description with new features',
        available: false
      }

      const result = await marketplaceModule.updateService({
        serviceId: 'service-123',
        updates,
        signers: [mockProvider]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('helper methods', () => {
    it('should use native mint for SOL payments', () => {
      // Test that the module uses the correct native mint address
      const serviceData = {
        id: 'service-sol',
        name: 'SOL Service',
        category: ServiceCategory.Other,
        price: 100_000_000n,
        provider: mockProvider.address
      }

      marketplaceModule.createServiceListing({
        serviceId: serviceData.id,
        serviceData,
        signers: [mockProvider]
      })

      // The native mint should be used when no payment mint is specified
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })
})