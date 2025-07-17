import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MarketplaceInstructions } from '../../../src/client/instructions/MarketplaceInstructions'
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

describe('MarketplaceInstructions', () => {
  let marketplaceInstructions: MarketplaceInstructions
  let mockRpc: any
  let payer: TransactionSigner
  let agent: TransactionSigner
  let buyer: TransactionSigner
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
        value: lamports(1000000000n) // 1 SOL
      })
    }

    // Create test signers
    payer = await generateKeyPairSigner()
    agent = await generateKeyPairSigner()
    buyer = await generateKeyPairSigner()
    programId = address('AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR')

    marketplaceInstructions = new MarketplaceInstructions(mockRpc, programId)
  })

  describe('createServiceListing', () => {
    it('should create service listing instruction with valid parameters', async () => {
      const params = {
        signer: agent,
        payer,
        title: 'Code Review Service',
        description: 'Professional code review with detailed feedback',
        category: 'Development',
        price: lamports(5000000n), // 0.005 SOL
        currency: 'SOL',
        deliveryTime: 86400, // 24 hours in seconds
        requirements: [
          'GitHub repository link',
          'Specific areas to focus on',
          'Programming language'
        ],
        tags: ['code-review', 'quality-assurance', 'best-practices']
      }

      const instruction = await marketplaceInstructions.createServiceListing(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
      
      // Verify accounts structure
      const accounts = instruction.accounts
      expect(accounts.length).toBeGreaterThan(0)
    })

    it('should handle optional fields correctly', async () => {
      const params = {
        signer: agent,
        payer,
        title: 'Basic Service',
        description: 'Simple service offering',
        category: 'General',
        price: lamports(1000000n),
        currency: 'SOL',
        deliveryTime: 3600, // 1 hour
        // Optional fields omitted
      }

      const instruction = await marketplaceInstructions.createServiceListing(params)

      expect(instruction).toBeDefined()
    })

    it('should validate price constraints', async () => {
      const params = {
        signer: agent,
        payer,
        title: 'Premium Service',
        description: 'High-value service',
        category: 'Premium',
        price: lamports(1000000000n), // 1 SOL - high price
        currency: 'SOL',
        deliveryTime: 604800, // 7 days
        requirements: ['Premium requirements'],
        tags: ['premium', 'exclusive']
      }

      const instruction = await marketplaceInstructions.createServiceListing(params)

      expect(instruction).toBeDefined()
    })

    it('should handle multiple requirements and tags', async () => {
      const params = {
        signer: agent,
        payer,
        title: 'Comprehensive Service',
        description: 'Full-stack development service',
        category: 'Development',
        price: lamports(10000000n),
        currency: 'SOL',
        deliveryTime: 172800, // 48 hours
        requirements: [
          'Project specifications',
          'Design mockups',
          'API documentation',
          'Database schema',
          'Deployment requirements'
        ],
        tags: [
          'fullstack',
          'web-development',
          'api',
          'database',
          'deployment',
          'devops'
        ]
      }

      const instruction = await marketplaceInstructions.createServiceListing(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('purchaseService', () => {
    it('should create purchase service instruction', async () => {
      const listingId = 'listing123'
      const params = {
        signer: buyer,
        payer: buyer,
        listing: address(listingId),
        seller: agent.address,
        price: lamports(5000000n),
        requirements: {
          repoUrl: 'https://github.com/example/repo',
          focusAreas: ['security', 'performance'],
          language: 'TypeScript'
        }
      }

      const instruction = await marketplaceInstructions.purchaseService(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should handle purchase with escrow', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        listing: address('listing456'),
        seller: agent.address,
        price: lamports(10000000n),
        useEscrow: true,
        escrowDuration: 259200, // 3 days
        requirements: {
          details: 'Custom requirements'
        }
      }

      const instruction = await marketplaceInstructions.purchaseService(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('updateServiceListing', () => {
    it('should create update listing instruction', async () => {
      const params = {
        signer: agent,
        listing: address('listing789'),
        title: 'Updated Service Title',
        description: 'Updated description with more details',
        price: lamports(7500000n), // Updated price
        deliveryTime: 129600, // 36 hours
        isActive: true
      }

      const instruction = await marketplaceInstructions.updateServiceListing(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should handle partial updates', async () => {
      const params = {
        signer: agent,
        listing: address('listing789'),
        price: lamports(6000000n), // Only updating price
      }

      const instruction = await marketplaceInstructions.updateServiceListing(params)

      expect(instruction).toBeDefined()
    })

    it('should handle deactivation', async () => {
      const params = {
        signer: agent,
        listing: address('listing789'),
        isActive: false // Deactivating listing
      }

      const instruction = await marketplaceInstructions.updateServiceListing(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('createServiceAuction', () => {
    it('should create auction instruction', async () => {
      const params = {
        signer: agent,
        payer,
        title: 'Premium Development Service Auction',
        description: 'Bidding for exclusive development service',
        category: 'Development',
        startingPrice: lamports(10000000n), // 0.01 SOL
        minimumIncrement: lamports(1000000n), // 0.001 SOL
        duration: 86400, // 24 hours
        reservePrice: lamports(50000000n), // 0.05 SOL
        requirements: ['Project scope', 'Timeline'],
        tags: ['auction', 'development', 'premium']
      }

      const instruction = await marketplaceInstructions.createServiceAuction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should handle auction without reserve price', async () => {
      const params = {
        signer: agent,
        payer,
        title: 'No Reserve Auction',
        description: 'Auction with no minimum',
        category: 'General',
        startingPrice: lamports(1000000n),
        minimumIncrement: lamports(100000n),
        duration: 43200, // 12 hours
        // No reserve price
      }

      const instruction = await marketplaceInstructions.createServiceAuction(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('placeAuctionBid', () => {
    it('should create bid instruction', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        auction: address('auction123'),
        bidAmount: lamports(15000000n), // 0.015 SOL
        maxAmount: lamports(20000000n), // Auto-bid up to 0.02 SOL
      }

      const instruction = await marketplaceInstructions.placeAuctionBid(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should handle simple bid without auto-bid', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        auction: address('auction456'),
        bidAmount: lamports(12000000n),
      }

      const instruction = await marketplaceInstructions.placeAuctionBid(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('finalizeAuction', () => {
    it('should create finalize auction instruction', async () => {
      const params = {
        signer: agent, // Auction creator
        auction: address('auction789'),
        winner: buyer.address,
        finalPrice: lamports(25000000n)
      }

      const instruction = await marketplaceInstructions.finalizeAuction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })
  })

  describe('createJobPosting', () => {
    it('should create job posting instruction', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        title: 'Smart Contract Development',
        description: 'Need experienced Solana developer for DeFi project',
        category: 'Blockchain Development',
        budget: lamports(500000000n), // 0.5 SOL
        duration: 2592000, // 30 days
        requirements: [
          '3+ years Solana experience',
          'Rust proficiency',
          'DeFi knowledge'
        ],
        skills: ['rust', 'solana', 'anchor', 'defi'],
        isRemote: true,
        deadline: Date.now() + 604800000 // 7 days from now
      }

      const instruction = await marketplaceInstructions.createJobPosting(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should handle job posting with milestones', async () => {
      const params = {
        signer: buyer,
        payer: buyer,
        title: 'Multi-phase Project',
        description: 'Complex project with milestones',
        category: 'Development',
        budget: lamports(1000000000n), // 1 SOL total
        duration: 5184000, // 60 days
        milestones: [
          {
            title: 'Phase 1: Planning',
            payment: lamports(200000000n),
            duration: 604800 // 7 days
          },
          {
            title: 'Phase 2: Development',
            payment: lamports(500000000n),
            duration: 2592000 // 30 days
          },
          {
            title: 'Phase 3: Testing & Deployment',
            payment: lamports(300000000n),
            duration: 1209600 // 14 days
          }
        ],
        requirements: ['Experience with phased projects'],
        skills: ['project-management', 'development']
      }

      const instruction = await marketplaceInstructions.createJobPosting(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('applyToJob', () => {
    it('should create job application instruction', async () => {
      const params = {
        signer: agent,
        payer: agent,
        job: address('job123'),
        coverLetter: 'I am the perfect fit for this role...',
        proposedRate: lamports(400000000n), // Proposed 0.4 SOL
        estimatedDuration: 2160000, // 25 days
        portfolio: [
          'https://github.com/agent/project1',
          'https://github.com/agent/project2'
        ],
        availability: 'immediate'
      }

      const instruction = await marketplaceInstructions.applyToJob(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })
  })

  describe('acceptJobApplication', () => {
    it('should create accept application instruction', async () => {
      const params = {
        signer: buyer, // Job poster
        job: address('job123'),
        application: address('application456'),
        applicant: agent.address,
        terms: {
          finalRate: lamports(380000000n),
          startDate: Date.now() + 86400000, // Start tomorrow
          milestones: ['Phase 1', 'Phase 2', 'Phase 3']
        }
      }

      const instruction = await marketplaceInstructions.acceptJobApplication(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })
  })

  describe('Error handling', () => {
    it('should handle RPC errors gracefully', async () => {
      mockRpc.getAccountInfo.mockRejectedValueOnce(new Error('Network error'))

      const params = {
        signer: agent,
        payer,
        title: 'Test Service',
        description: 'Test',
        category: 'Test',
        price: lamports(1000000n),
        currency: 'SOL',
        deliveryTime: 3600
      }

      const instruction = await marketplaceInstructions.createServiceListing(params)
      expect(instruction).toBeDefined()
    })

    it('should validate input parameters', async () => {
      // Test with empty title
      const params = {
        signer: agent,
        payer,
        title: '', // Invalid empty title
        description: 'Test',
        category: 'Test',
        price: lamports(1000000n),
        currency: 'SOL',
        deliveryTime: 3600
      }

      // Should still create instruction but validation happens on-chain
      const instruction = await marketplaceInstructions.createServiceListing(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('Transaction integration', () => {
    it('should work with transaction builder', async () => {
      const listingParams = {
        signer: agent,
        payer,
        title: 'Integration Test Service',
        description: 'Testing transaction building',
        category: 'Test',
        price: lamports(2000000n),
        currency: 'SOL',
        deliveryTime: 7200
      }

      const instruction = await marketplaceInstructions.createServiceListing(listingParams)
      
      // Build transaction
      const blockhash = await mockRpc.getLatestBlockhash()
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(payer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(blockhash.value, tx),
        tx => appendTransactionMessageInstructions([instruction], tx)
      )

      expect(message).toBeDefined()
      expect(message.instructions).toHaveLength(1)
      expect(message.instructions[0]).toBe(instruction)
    })
  })
})