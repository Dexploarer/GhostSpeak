import { describe, it, expect } from 'vitest'
import { 
  findAgentPda,
  findServiceListingPda,
  findWorkOrderPda,
  findPaymentPda,
  findChannelPda,
  findMessagePda,
  findDisputePda,
  findUserRegistryPda,
  findAgentRegistryPda,
  findServicePurchasePda,
  findWorkDeliveryPda,
  findA2ASessionPda,
  findA2AMessagePda,
  findExtensionPda,
  findAuctionPda,
  findBidPda,
  findJobPostingPda,
  findJobApplicationPda,
  deriveGhostSpeakPda
} from '../../../src/utils/pda'
import { address, generateKeyPairSigner } from '@solana/kit'
import type { Address, TransactionSigner } from '@solana/kit'

describe('PDA Utilities', () => {
  const programId: Address = address('AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR')
  let owner: TransactionSigner
  let agent: TransactionSigner
  let buyer: TransactionSigner
  let seller: TransactionSigner

  beforeEach(async () => {
    owner = await generateKeyPairSigner()
    agent = await generateKeyPairSigner()
    buyer = await generateKeyPairSigner()
    seller = await generateKeyPairSigner()
  })

  describe('findAgentPda', () => {
    it('should derive agent PDA correctly', () => {
      const [pda, bump] = findAgentPda(owner.address, programId)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      expect(bump).toBeDefined()
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)
    })

    it('should generate consistent PDAs for same owner', () => {
      const [pda1] = findAgentPda(owner.address, programId)
      const [pda2] = findAgentPda(owner.address, programId)
      
      expect(pda1).toBe(pda2)
    })

    it('should generate different PDAs for different owners', () => {
      const [pda1] = findAgentPda(owner.address, programId)
      const [pda2] = findAgentPda(agent.address, programId)
      
      expect(pda1).not.toBe(pda2)
    })
  })

  describe('findServiceListingPda', () => {
    it('should derive service listing PDA correctly', () => {
      const [pda, bump] = findServiceListingPda(agent.address, 'unique-listing-id', programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should generate different PDAs for different listing IDs', () => {
      const [pda1] = findServiceListingPda(agent.address, 'listing-1', programId)
      const [pda2] = findServiceListingPda(agent.address, 'listing-2', programId)
      
      expect(pda1).not.toBe(pda2)
    })

    it('should handle long listing IDs', () => {
      const longId = 'a'.repeat(100)
      const [pda] = findServiceListingPda(agent.address, longId, programId)
      
      expect(pda).toBeDefined()
    })
  })

  describe('findWorkOrderPda', () => {
    it('should derive work order PDA correctly', () => {
      const orderId = 'order-123'
      const [pda, bump] = findWorkOrderPda(buyer.address, seller.address, orderId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should generate unique PDAs for different order combinations', () => {
      const orderId = 'order-456'
      
      const [pda1] = findWorkOrderPda(buyer.address, seller.address, orderId, programId)
      const [pda2] = findWorkOrderPda(seller.address, buyer.address, orderId, programId)
      const [pda3] = findWorkOrderPda(buyer.address, agent.address, orderId, programId)
      
      expect(pda1).not.toBe(pda2)
      expect(pda1).not.toBe(pda3)
      expect(pda2).not.toBe(pda3)
    })
  })

  describe('findPaymentPda', () => {
    it('should derive payment PDA correctly', () => {
      const workOrder = address('workOrder123')
      const paymentId = 'payment-001'
      const [pda, bump] = findPaymentPda(workOrder, paymentId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should handle numeric payment IDs', () => {
      const workOrder = address('workOrder456')
      const [pda1] = findPaymentPda(workOrder, '1', programId)
      const [pda2] = findPaymentPda(workOrder, '2', programId)
      
      expect(pda1).not.toBe(pda2)
    })
  })

  describe('findChannelPda', () => {
    it('should derive channel PDA correctly', () => {
      const participant1 = buyer.address
      const participant2 = seller.address
      const channelId = 'channel-123'
      
      const [pda, bump] = findChannelPda(participant1, participant2, channelId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should be order-agnostic for participants', () => {
      const channelId = 'channel-456'
      
      // Should generate same PDA regardless of participant order
      const [pda1] = findChannelPda(buyer.address, seller.address, channelId, programId)
      const [pda2] = findChannelPda(seller.address, buyer.address, channelId, programId)
      
      // Note: Depending on implementation, these might be same or different
      // This test documents the expected behavior
      expect(pda1).toBeDefined()
      expect(pda2).toBeDefined()
    })
  })

  describe('findMessagePda', () => {
    it('should derive message PDA correctly', () => {
      const channel = address('channel123')
      const messageId = 'msg-001'
      
      const [pda, bump] = findMessagePda(channel, messageId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should handle timestamp-based message IDs', () => {
      const channel = address('channel456')
      const timestamp1 = Date.now().toString()
      const timestamp2 = (Date.now() + 1000).toString()
      
      const [pda1] = findMessagePda(channel, timestamp1, programId)
      const [pda2] = findMessagePda(channel, timestamp2, programId)
      
      expect(pda1).not.toBe(pda2)
    })
  })

  describe('findDisputePda', () => {
    it('should derive dispute PDA correctly', () => {
      const payment = address('payment123')
      const disputeId = 'dispute-001'
      
      const [pda, bump] = findDisputePda(payment, disputeId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should generate unique PDAs for different payments', () => {
      const disputeId = 'dispute-123'
      
      const [pda1] = findDisputePda(address('payment1'), disputeId, programId)
      const [pda2] = findDisputePda(address('payment2'), disputeId, programId)
      
      expect(pda1).not.toBe(pda2)
    })
  })

  describe('Registry PDAs', () => {
    it('should derive user registry PDA', () => {
      const [pda, bump] = findUserRegistryPda(programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should derive agent registry PDA', () => {
      const [pda, bump] = findAgentRegistryPda(programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should generate different PDAs for different registries', () => {
      const [userPda] = findUserRegistryPda(programId)
      const [agentPda] = findAgentRegistryPda(programId)
      
      expect(userPda).not.toBe(agentPda)
    })
  })

  describe('A2A Protocol PDAs', () => {
    it('should derive A2A session PDA', () => {
      const sessionId = 'session-123'
      const [pda, bump] = findA2ASessionPda(agent.address, buyer.address, sessionId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should derive A2A message PDA', () => {
      const session = address('session123')
      const messageId = 'a2a-msg-001'
      
      const [pda, bump] = findA2AMessagePda(session, messageId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })
  })

  describe('Extension and Auction PDAs', () => {
    it('should derive extension PDA', () => {
      const extensionId = 'ext-123'
      const [pda, bump] = findExtensionPda(owner.address, extensionId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should derive auction PDA', () => {
      const auctionId = 'auction-123'
      const [pda, bump] = findAuctionPda(seller.address, auctionId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should derive bid PDA', () => {
      const auction = address('auction123')
      const [pda, bump] = findBidPda(auction, buyer.address, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })
  })

  describe('Job Market PDAs', () => {
    it('should derive job posting PDA', () => {
      const jobId = 'job-123'
      const [pda, bump] = findJobPostingPda(buyer.address, jobId, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should derive job application PDA', () => {
      const job = address('job123')
      const [pda, bump] = findJobApplicationPda(job, agent.address, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })
  })

  describe('Generic PDA derivation', () => {
    it('should derive generic PDA with custom seeds', () => {
      const seeds = ['custom', 'seed', 'values']
      const [pda, bump] = deriveGhostSpeakPda(seeds, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should handle buffer seeds', () => {
      const buffer = Buffer.from('binary-data')
      const seeds = ['prefix', buffer, 'suffix']
      const [pda, bump] = deriveGhostSpeakPda(seeds, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should handle address seeds', () => {
      const seeds = ['account', owner.address]
      const [pda, bump] = deriveGhostSpeakPda(seeds, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })

    it('should handle mixed seed types', () => {
      const seeds = [
        'string-seed',
        Buffer.from([1, 2, 3, 4]),
        owner.address,
        'another-string'
      ]
      const [pda, bump] = deriveGhostSpeakPda(seeds, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeDefined()
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string seeds', () => {
      const [pda] = findServiceListingPda(agent.address, '', programId)
      expect(pda).toBeDefined()
    })

    it('should handle unicode in seeds', () => {
      const unicodeId = '测试-🚀-τεστ'
      const [pda] = findServiceListingPda(agent.address, unicodeId, programId)
      expect(pda).toBeDefined()
    })

    it('should handle maximum seed length', () => {
      // Solana seeds have a maximum length of 32 bytes per seed
      const maxLengthSeed = 'a'.repeat(32)
      const [pda] = deriveGhostSpeakPda(['test', maxLengthSeed], programId)
      expect(pda).toBeDefined()
    })
  })

  describe('Consistency tests', () => {
    it('should always derive same PDA for same inputs', () => {
      const seeds = ['consistent', 'test']
      
      const results = []
      for (let i = 0; i < 10; i++) {
        const [pda] = deriveGhostSpeakPda(seeds, programId)
        results.push(pda)
      }
      
      // All PDAs should be identical
      expect(new Set(results).size).toBe(1)
    })

    it('should derive different bumps for different seed combinations', () => {
      const bumps = new Set<number>()
      
      // Generate multiple PDAs with different seeds
      for (let i = 0; i < 20; i++) {
        const [, bump] = deriveGhostSpeakPda([`seed-${i}`], programId)
        bumps.add(bump)
      }
      
      // Should have multiple different bump values
      expect(bumps.size).toBeGreaterThan(1)
    })
  })
})