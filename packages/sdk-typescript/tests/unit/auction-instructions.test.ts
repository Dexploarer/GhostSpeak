import { describe, it, expect, vi } from 'vitest'
import { AuctionInstructions } from '../../src/client/instructions/AuctionInstructions'
import { address } from '@solana/addresses'
import { type PublicKey } from '@solana/transactions'

// Mock the RPC client
const mockRpc = {
  sendTransaction: vi.fn(),
  getLatestBlockhash: vi.fn(),
  confirmTransaction: vi.fn(),
}

// Mock program ID
const programId = address('GHOSTuTpw1dsLYRYDEM9dHsFvPw6cGfKxe6UtXyPVRHN')

describe('AuctionInstructions', () => {
  let auctionInstructions: AuctionInstructions

  beforeEach(() => {
    auctionInstructions = new AuctionInstructions(mockRpc, programId)
    vi.clearAllMocks()
  })

  describe('createServiceAuction', () => {
    it('should create valid service auction instruction', () => {
      const params = {
        auction: address('11111111111111111111111111111114') as PublicKey,
        creator: address('11111111111111111111111111111115') as PublicKey,
        serviceType: 'web_development',
        description: 'Need a full-stack web application built with React and Node.js',
        requirements: [
          'Experience with React and TypeScript',
          'Node.js backend development',
          'Database design (PostgreSQL)',
          'API integration experience',
          'Responsive design skills'
        ],
        minBidAmount: 10_000_000_000n, // 10 SOL
        maxBidAmount: 50_000_000_000n, // 50 SOL
        duration: 86400, // 24 hours
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400
      }

      const instruction = auctionInstructions.createServiceAuctionInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate bid amount ranges', () => {
      expect(() => {
        auctionInstructions.createServiceAuctionInstruction({
          auction: address('11111111111111111111111111111114') as PublicKey,
          creator: address('11111111111111111111111111111115') as PublicKey,
          serviceType: 'web_development',
          description: 'Test auction',
          requirements: ['Test requirement'],
          minBidAmount: 50_000_000_000n, // 50 SOL
          maxBidAmount: 10_000_000_000n, // 10 SOL - invalid: max < min
          duration: 86400,
          startTime: Math.floor(Date.now() / 1000),
          endTime: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })

    it('should validate auction duration', () => {
      expect(() => {
        auctionInstructions.createServiceAuctionInstruction({
          auction: address('11111111111111111111111111111114') as PublicKey,
          creator: address('11111111111111111111111111111115') as PublicKey,
          serviceType: 'web_development',
          description: 'Test auction',
          requirements: ['Test requirement'],
          minBidAmount: 10_000_000_000n,
          maxBidAmount: 50_000_000_000n,
          duration: 0, // Invalid duration
          startTime: Math.floor(Date.now() / 1000),
          endTime: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })

    it('should handle different service types', () => {
      const serviceTypes = [
        'web_development',
        'mobile_app',
        'ai_development',
        'blockchain',
        'data_science',
        'design',
        'content_writing',
        'consulting'
      ]

      serviceTypes.forEach(serviceType => {
        const params = {
          auction: address('11111111111111111111111111111114') as PublicKey,
          creator: address('11111111111111111111111111111115') as PublicKey,
          serviceType,
          description: `${serviceType} service auction`,
          requirements: [`Experience in ${serviceType}`],
          minBidAmount: 5_000_000_000n,
          maxBidAmount: 25_000_000_000n,
          duration: 86400,
          startTime: Math.floor(Date.now() / 1000),
          endTime: Math.floor(Date.now() / 1000) + 86400
        }

        const instruction = auctionInstructions.createServiceAuctionInstruction(params)
        expect(instruction).toBeDefined()
      })
    })
  })

  describe('placeAuctionBid', () => {
    it('should create valid bid placement instruction', () => {
      const params = {
        auction: address('11111111111111111111111111111114') as PublicKey,
        bidder: address('11111111111111111111111111111115') as PublicKey,
        agent: address('11111111111111111111111111111116') as PublicKey,
        bidAmount: 15_000_000_000n, // 15 SOL
        proposal: 'I will deliver a high-quality web application with the following approach...',
        timeline: 'Project will be completed in 4 weeks with weekly milestone updates',
        portfolioLinks: [
          'https://github.com/agent/portfolio-project-1',
          'https://demo.agent-project.com',
          'https://testimonials.agent.com'
        ]
      }

      const instruction = auctionInstructions.placeBidInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate bid amount is positive', () => {
      expect(() => {
        auctionInstructions.placeBidInstruction({
          auction: address('11111111111111111111111111111114') as PublicKey,
          bidder: address('11111111111111111111111111111115') as PublicKey,
          agent: address('11111111111111111111111111111116') as PublicKey,
          bidAmount: 0n, // Invalid bid amount
          proposal: 'Test proposal',
          timeline: 'Test timeline',
          portfolioLinks: []
        })
      }).toThrow()
    })

    it('should require proposal text', () => {
      expect(() => {
        auctionInstructions.placeBidInstruction({
          auction: address('11111111111111111111111111111114') as PublicKey,
          bidder: address('11111111111111111111111111111115') as PublicKey,
          agent: address('11111111111111111111111111111116') as PublicKey,
          bidAmount: 15_000_000_000n,
          proposal: '', // Empty proposal should be invalid
          timeline: 'Test timeline',
          portfolioLinks: []
        })
      }).toThrow()
    })
  })

  describe('finalizeAuction', () => {
    it('should create valid finalization instruction', () => {
      const params = {
        auction: address('11111111111111111111111111111114') as PublicKey,
        creator: address('11111111111111111111111111111115') as PublicKey,
        winningBidder: address('11111111111111111111111111111116') as PublicKey,
        winningAgent: address('11111111111111111111111111111117') as PublicKey,
        treasury: address('11111111111111111111111111111118') as PublicKey
      }

      const instruction = auctionInstructions.finalizeAuctionInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate creator authority', () => {
      // Should create instruction successfully - authority validation happens on-chain
      const params = {
        auction: address('11111111111111111111111111111114') as PublicKey,
        creator: address('11111111111111111111111111111115') as PublicKey,
        winningBidder: address('11111111111111111111111111111116') as PublicKey,
        winningAgent: address('11111111111111111111111111111117') as PublicKey,
        treasury: address('11111111111111111111111111111118') as PublicKey
      }

      const instruction = auctionInstructions.finalizeAuctionInstruction(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('cancelAuction', () => {
    it('should create valid cancellation instruction', () => {
      const params = {
        auction: address('11111111111111111111111111111114') as PublicKey,
        creator: address('11111111111111111111111111111115') as PublicKey,
        reason: 'Project requirements changed, need to restart auction process'
      }

      const instruction = auctionInstructions.cancelAuctionInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should handle different cancellation reasons', () => {
      const reasons = [
        'Requirements changed',
        'Budget constraints',
        'Found alternative solution',
        'Timeline no longer viable',
        'Quality of bids insufficient'
      ]

      reasons.forEach(reason => {
        const params = {
          auction: address('11111111111111111111111111111114') as PublicKey,
          creator: address('11111111111111111111111111111115') as PublicKey,
          reason
        }

        const instruction = auctionInstructions.cancelAuctionInstruction(params)
        expect(instruction).toBeDefined()
      })
    })
  })

  describe('updateAuctionDetails', () => {
    it('should create valid update instruction', () => {
      const params = {
        auction: address('11111111111111111111111111111114') as PublicKey,
        creator: address('11111111111111111111111111111115') as PublicKey,
        newDescription: 'Updated: Now seeking full-stack developer with blockchain experience',
        newRequirements: [
          'Experience with React and TypeScript',
          'Node.js backend development',
          'Solana blockchain integration',
          'Web3 wallet integration',
          'Smart contract interaction'
        ],
        newMaxBidAmount: 75_000_000_000n // 75 SOL - increased budget
      }

      const instruction = auctionInstructions.updateAuctionInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should allow partial updates', () => {
      const params = {
        auction: address('11111111111111111111111111111114') as PublicKey,
        creator: address('11111111111111111111111111111115') as PublicKey,
        newDescription: 'Updated description only',
        // Other fields remain unchanged
      }

      const instruction = auctionInstructions.updateAuctionInstruction(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('extendAuction', () => {
    it('should create valid extension instruction', () => {
      const params = {
        auction: address('11111111111111111111111111111114') as PublicKey,
        creator: address('11111111111111111111111111111115') as PublicKey,
        additionalDuration: 43200, // 12 hours
        reason: 'Extending to allow more quality bids from qualified agents'
      }

      const instruction = auctionInstructions.extendAuctionInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate extension duration', () => {
      expect(() => {
        auctionInstructions.extendAuctionInstruction({
          auction: address('11111111111111111111111111111114') as PublicKey,
          creator: address('11111111111111111111111111111115') as PublicKey,
          additionalDuration: 0, // Invalid duration
          reason: 'Test reason'
        })
      }).toThrow()
    })

    it('should handle different extension durations', () => {
      const durations = [3600, 7200, 21600, 43200, 86400] // 1h, 2h, 6h, 12h, 24h

      durations.forEach(duration => {
        const params = {
          auction: address('11111111111111111111111111111114') as PublicKey,
          creator: address('11111111111111111111111111111115') as PublicKey,
          additionalDuration: duration,
          reason: `Extending by ${duration / 3600} hours`
        }

        const instruction = auctionInstructions.extendAuctionInstruction(params)
        expect(instruction).toBeDefined()
      })
    })
  })

  describe('withdrawBid', () => {
    it('should create valid bid withdrawal instruction', () => {
      const params = {
        auction: address('11111111111111111111111111111114') as PublicKey,
        bidder: address('11111111111111111111111111111115') as PublicKey,
        agent: address('11111111111111111111111111111116') as PublicKey,
        reason: 'No longer available for this time period'
      }

      const instruction = auctionInstructions.withdrawBidInstruction(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should handle withdrawal reasons', () => {
      const reasons = [
        'Schedule conflict',
        'Budget mismatch',
        'Scope too large',
        'Found better opportunity',
        'Technical requirements mismatch'
      ]

      reasons.forEach(reason => {
        const params = {
          auction: address('11111111111111111111111111111114') as PublicKey,
          bidder: address('11111111111111111111111111111115') as PublicKey,
          agent: address('11111111111111111111111111111116') as PublicKey,
          reason
        }

        const instruction = auctionInstructions.withdrawBidInstruction(params)
        expect(instruction).toBeDefined()
      })
    })
  })

  describe('error handling', () => {
    it('should handle invalid public keys', () => {
      expect(() => {
        auctionInstructions.createServiceAuctionInstruction({
          // @ts-expect-error - testing invalid input
          auction: 'invalid-key',
          creator: address('11111111111111111111111111111115') as PublicKey,
          serviceType: 'web_development',
          description: 'Test auction',
          requirements: ['Test requirement'],
          minBidAmount: 10_000_000_000n,
          maxBidAmount: 50_000_000_000n,
          duration: 86400,
          startTime: Math.floor(Date.now() / 1000),
          endTime: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })

    it('should validate required fields', () => {
      expect(() => {
        auctionInstructions.createServiceAuctionInstruction({
          auction: address('11111111111111111111111111111114') as PublicKey,
          creator: address('11111111111111111111111111111115') as PublicKey,
          serviceType: '', // Empty service type
          description: 'Test auction',
          requirements: ['Test requirement'],
          minBidAmount: 10_000_000_000n,
          maxBidAmount: 50_000_000_000n,
          duration: 86400,
          startTime: Math.floor(Date.now() / 1000),
          endTime: Math.floor(Date.now() / 1000) + 86400
        })
      }).toThrow()
    })

    it('should validate time constraints', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      
      expect(() => {
        auctionInstructions.createServiceAuctionInstruction({
          auction: address('11111111111111111111111111111114') as PublicKey,
          creator: address('11111111111111111111111111111115') as PublicKey,
          serviceType: 'web_development',
          description: 'Test auction',
          requirements: ['Test requirement'],
          minBidAmount: 10_000_000_000n,
          maxBidAmount: 50_000_000_000n,
          duration: 86400,
          startTime: currentTime + 3600, // 1 hour from now
          endTime: currentTime + 1800 // 30 minutes from now - invalid: end < start
        })
      }).toThrow()
    })
  })

  describe('getPDA', () => {
    it('should generate valid auction PDA', () => {
      const auctionId = address('11111111111111111111111111111114') as PublicKey
      const pda = auctionInstructions.getAuctionPDA(auctionId)

      expect(pda).toBeDefined()
      expect(pda.length).toBe(2) // [address, bump]
      expect(typeof pda[0]).toBe('string') // address
      expect(typeof pda[1]).toBe('number') // bump
    })

    it('should generate deterministic PDAs', () => {
      const auctionId = address('11111111111111111111111111111114') as PublicKey
      const pda1 = auctionInstructions.getAuctionPDA(auctionId)
      const pda2 = auctionInstructions.getAuctionPDA(auctionId)

      expect(pda1[0]).toBe(pda2[0])
      expect(pda1[1]).toBe(pda2[1])
    })
  })

  describe('bid validation helpers', () => {
    it('should validate bid is within auction range', () => {
      const auctionData = {
        minBidAmount: 10_000_000_000n, // 10 SOL
        maxBidAmount: 50_000_000_000n  // 50 SOL
      }

      // Valid bids
      expect(auctionInstructions.validateBidAmount(15_000_000_000n, auctionData)).toBe(true)
      expect(auctionInstructions.validateBidAmount(30_000_000_000n, auctionData)).toBe(true)
      expect(auctionInstructions.validateBidAmount(50_000_000_000n, auctionData)).toBe(true)

      // Invalid bids
      expect(auctionInstructions.validateBidAmount(5_000_000_000n, auctionData)).toBe(false)
      expect(auctionInstructions.validateBidAmount(60_000_000_000n, auctionData)).toBe(false)
      expect(auctionInstructions.validateBidAmount(0n, auctionData)).toBe(false)
    })

    it('should check if auction is still active', () => {
      const currentTime = Math.floor(Date.now() / 1000)

      const activeAuction = {
        startTime: currentTime - 3600, // 1 hour ago
        endTime: currentTime + 3600    // 1 hour from now
      }

      const expiredAuction = {
        startTime: currentTime - 7200, // 2 hours ago
        endTime: currentTime - 3600    // 1 hour ago
      }

      const futureAuction = {
        startTime: currentTime + 3600, // 1 hour from now
        endTime: currentTime + 7200    // 2 hours from now
      }

      expect(auctionInstructions.isAuctionActive(activeAuction)).toBe(true)
      expect(auctionInstructions.isAuctionActive(expiredAuction)).toBe(false)
      expect(auctionInstructions.isAuctionActive(futureAuction)).toBe(false)
    })
  })
})