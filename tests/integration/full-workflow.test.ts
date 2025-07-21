import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GhostSpeakClient } from '../../packages/sdk-typescript/src'
import { createSolanaRpc } from '@solana/rpc'
import { createKeyPairFromBytes, generateKeyPair } from '@solana/keys'
import { address } from '@solana/addresses'
import { lamports } from '@solana/rpc-types'

describe('Full Workflow Integration Tests', () => {
  let client: GhostSpeakClient
  let clientKeyPair: CryptoKeyPair
  let agentOwnerKeyPair: CryptoKeyPair
  let rpc: ReturnType<typeof createSolanaRpc>

  beforeAll(async () => {
    // Set up test environment
    rpc = createSolanaRpc('http://localhost:8899') // Local validator
    
    client = new GhostSpeakClient({
      rpc,
      programId: address('11111111111111111111111111111112'),
      cluster: 'localnet'
    })

    // Generate test keypairs
    clientKeyPair = await generateKeyPair()
    agentOwnerKeyPair = await generateKeyPair()

    // Fund test accounts (this would typically be done with a test utility)
    await fundTestAccount(clientKeyPair.publicKey, lamports(10_000_000_000n)) // 10 SOL
    await fundTestAccount(agentOwnerKeyPair.publicKey, lamports(10_000_000_000n)) // 10 SOL
  })

  afterAll(async () => {
    // Cleanup test data if needed
  })

  describe('Agent Service Workflow', () => {
    it('should complete full agent service workflow from creation to payment', async () => {
      // 1. Agent Registration
      const agentMetadata = {
        name: 'AI Web Developer',
        description: 'Expert AI agent specializing in full-stack web development',
        avatar: 'https://example.com/agent-avatar.png',
        capabilities: ['React', 'Node.js', 'TypeScript', 'Database Design'],
        pricing: {
          baseRate: 2_000_000_000n, // 2 SOL per hour
          currency: 'SOL'
        },
        portfolio: [
          'https://github.com/agent/portfolio-1',
          'https://demo.agent-project.com'
        ]
      }

      const registerAgentTx = await client.agent.register({
        owner: agentOwnerKeyPair.publicKey,
        metadata: agentMetadata,
        tier: 'Pro'
      })

      expect(registerAgentTx).toBeDefined()
      const agentAccount = await client.agent.fetch(registerAgentTx.agentAddress)
      expect(agentAccount.name).toBe(agentMetadata.name)
      expect(agentAccount.isActive).toBe(true)

      // 2. Agent Verification (platform admin action)
      const verifyTx = await client.agent.verify({
        agent: registerAgentTx.agentAddress,
        verificationData: {
          verifiedAt: Date.now(),
          verificationLevel: 'KYB',
          documents: ['business_license', 'portfolio_review'],
          reviewedBy: 'platform_admin'
        }
      })

      expect(verifyTx).toBeDefined()
      const verifiedAgent = await client.agent.fetch(registerAgentTx.agentAddress)
      expect(verifiedAgent.isVerified).toBe(true)

      // 3. Client Creates Service Auction
      const auctionParams = {
        creator: clientKeyPair.publicKey,
        serviceType: 'web_development',
        description: 'Need a modern e-commerce platform with payment integration',
        requirements: [
          'React/Next.js frontend',
          'Node.js/Express backend',
          'Payment processing (Stripe)',
          'Admin dashboard',
          'Mobile responsive'
        ],
        minBidAmount: 15_000_000_000n, // 15 SOL
        maxBidAmount: 40_000_000_000n, // 40 SOL
        duration: 86400 // 24 hours
      }

      const createAuctionTx = await client.auction.create(auctionParams)
      expect(createAuctionTx).toBeDefined()

      const auctionAccount = await client.auction.fetch(createAuctionTx.auctionAddress)
      expect(auctionAccount.serviceType).toBe(auctionParams.serviceType)
      expect(auctionAccount.status).toBe('Active')

      // 4. Agent Places Bid
      const bidParams = {
        auction: createAuctionTx.auctionAddress,
        bidder: agentOwnerKeyPair.publicKey,
        agent: registerAgentTx.agentAddress,
        bidAmount: 25_000_000_000n, // 25 SOL
        proposal: 'I will build a modern e-commerce platform using React, Node.js, and Stripe. Timeline: 4 weeks with weekly milestones.',
        timeline: '4 weeks with weekly milestone deliveries',
        portfolioLinks: [
          'https://github.com/agent/ecommerce-demo',
          'https://ecommerce-demo.agent.com'
        ]
      }

      const placeBidTx = await client.auction.placeBid(bidParams)
      expect(placeBidTx).toBeDefined()

      const updatedAuction = await client.auction.fetch(createAuctionTx.auctionAddress)
      expect(updatedAuction.highestBid).toBe(bidParams.bidAmount)
      expect(updatedAuction.highestBidder).toBe(registerAgentTx.agentAddress)

      // 5. Wait for auction to end and finalize
      // In real tests, we'd advance time or wait
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate time passage

      const finalizeTx = await client.auction.finalize({
        auction: createAuctionTx.auctionAddress,
        creator: clientKeyPair.publicKey
      })

      expect(finalizeTx).toBeDefined()
      const finalizedAuction = await client.auction.fetch(createAuctionTx.auctionAddress)
      expect(finalizedAuction.status).toBe('Finalized')
      expect(finalizedAuction.winner).toBe(registerAgentTx.agentAddress)

      // 6. Create Escrow for Work Payment
      const escrowParams = {
        payer: clientKeyPair.publicKey,
        recipient: registerAgentTx.agentAddress,
        amount: 25_000_000_000n, // 25 SOL (winning bid)
        terms: 'Payment for e-commerce platform development as per auction specifications',
        milestones: [
          {
            id: 1,
            description: 'UI/UX Design and Mockups',
            amount: 5_000_000_000n, // 5 SOL
            dueDate: Math.floor(Date.now() / 1000) + 604800 // 1 week
          },
          {
            id: 2,
            description: 'Frontend Development',
            amount: 10_000_000_000n, // 10 SOL
            dueDate: Math.floor(Date.now() / 1000) + 1814400 // 3 weeks
          },
          {
            id: 3,
            description: 'Backend & Payment Integration',
            amount: 7_000_000_000n, // 7 SOL
            dueDate: Math.floor(Date.now() / 1000) + 2419200 // 4 weeks
          },
          {
            id: 4,
            description: 'Testing & Deployment',
            amount: 3_000_000_000n, // 3 SOL
            dueDate: Math.floor(Date.now() / 1000) + 2592000 // 5 weeks
          }
        ],
        expiryTimestamp: Math.floor(Date.now() / 1000) + 3024000 // 35 days
      }

      const createEscrowTx = await client.escrow.createWithMilestones(escrowParams)
      expect(createEscrowTx).toBeDefined()

      const escrowAccount = await client.escrow.fetch(createEscrowTx.escrowAddress)
      expect(escrowAccount.amount).toBe(escrowParams.amount)
      expect(escrowAccount.milestones).toHaveLength(4)
      expect(escrowAccount.status).toBe('Active')

      // 7. Client Deposits Funds to Escrow
      const depositTx = await client.escrow.deposit({
        escrow: createEscrowTx.escrowAddress,
        depositor: clientKeyPair.publicKey,
        amount: 25_000_000_000n // Full amount
      })

      expect(depositTx).toBeDefined()
      const fundedEscrow = await client.escrow.fetch(createEscrowTx.escrowAddress)
      expect(fundedEscrow.depositedAmount).toBe(25_000_000_000n)

      // 8. Complete First Milestone
      const completeMilestone1Tx = await client.escrow.completeMilestone({
        escrow: createEscrowTx.escrowAddress,
        payer: clientKeyPair.publicKey,
        milestoneId: 1,
        completionProof: 'https://design.figma.com/project-mockups'
      })

      expect(completeMilestone1Tx).toBeDefined()
      const milestone1Escrow = await client.escrow.fetch(createEscrowTx.escrowAddress)
      expect(milestone1Escrow.milestones[0].isCompleted).toBe(true)
      expect(milestone1Escrow.releasedAmount).toBe(5_000_000_000n)

      // 9. Complete Remaining Milestones
      for (let i = 2; i <= 4; i++) {
        const completeMilestoneTx = await client.escrow.completeMilestone({
          escrow: createEscrowTx.escrowAddress,
          payer: clientKeyPair.publicKey,
          milestoneId: i,
          completionProof: `https://github.com/project/milestone-${i}`
        })
        expect(completeMilestoneTx).toBeDefined()
      }

      const completedEscrow = await client.escrow.fetch(createEscrowTx.escrowAddress)
      expect(completedEscrow.status).toBe('Completed')
      expect(completedEscrow.releasedAmount).toBe(25_000_000_000n)

      // 10. Update Agent Reputation
      const reputationTx = await client.agent.updateReputation({
        agent: registerAgentTx.agentAddress,
        client: clientKeyPair.publicKey,
        rating: 5,
        review: 'Excellent work! Delivered high-quality e-commerce platform on time with all requirements met.',
        transactionId: createEscrowTx.escrowAddress
      })

      expect(reputationTx).toBeDefined()
      const finalAgent = await client.agent.fetch(registerAgentTx.agentAddress)
      expect(finalAgent.averageRating).toBeGreaterThan(0)
      expect(finalAgent.totalTransactions).toBe(1)
      expect(finalAgent.totalEarnings).toBe(25_000_000_000n)
    }, 60000) // 60 second timeout for full workflow
  })

  describe('Dispute Resolution Workflow', () => {
    it('should handle dispute filing and resolution process', async () => {
      // Setup: Create agent, auction, and escrow
      const agentTx = await client.agent.register({
        owner: agentOwnerKeyPair.publicKey,
        metadata: {
          name: 'Design Agent',
          description: 'UI/UX design specialist',
          capabilities: ['Figma', 'Adobe XD', 'Prototyping'],
          pricing: { baseRate: 1_500_000_000n, currency: 'SOL' }
        },
        tier: 'Basic'
      })

      const escrowTx = await client.escrow.create({
        payer: clientKeyPair.publicKey,
        recipient: agentTx.agentAddress,
        amount: 10_000_000_000n, // 10 SOL
        terms: 'Design mobile app UI with 5 screens',
        expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
      })

      await client.escrow.deposit({
        escrow: escrowTx.escrowAddress,
        depositor: clientKeyPair.publicKey,
        amount: 10_000_000_000n
      })

      // File Dispute
      const disputeTx = await client.dispute.file({
        escrow: escrowTx.escrowAddress,
        initiator: clientKeyPair.publicKey,
        reason: 'Delivered designs do not match agreed specifications',
        disputedAmount: 6_000_000_000n // 6 SOL
      })

      expect(disputeTx).toBeDefined()
      const disputeAccount = await client.dispute.fetch(disputeTx.disputeAddress)
      expect(disputeAccount.status).toBe('Open')
      expect(disputeAccount.disputedAmount).toBe(6_000_000_000n)

      // Submit Evidence from Both Parties
      const clientEvidenceTx = await client.dispute.submitEvidence({
        dispute: disputeTx.disputeAddress,
        submitter: clientKeyPair.publicKey,
        evidenceUri: 'https://evidence.client.com/original-specs',
        evidenceText: 'Original specification document showing required design elements'
      })

      const agentEvidenceTx = await client.dispute.submitEvidence({
        dispute: disputeTx.disputeAddress,
        submitter: agentOwnerKeyPair.publicKey,
        evidenceUri: 'https://evidence.agent.com/delivered-designs',
        evidenceText: 'Final delivered designs with explanation of design decisions'
      })

      expect(clientEvidenceTx).toBeDefined()
      expect(agentEvidenceTx).toBeDefined()

      const evidenceDispute = await client.dispute.fetch(disputeTx.disputeAddress)
      expect(evidenceDispute.evidence).toHaveLength(2)

      // Escalate Dispute
      const escalateTx = await client.dispute.escalate({
        dispute: disputeTx.disputeAddress,
        initiator: clientKeyPair.publicKey,
        escalationReason: 'Need senior arbitrator review for design quality assessment'
      })

      expect(escalateTx).toBeDefined()
      const escalatedDispute = await client.dispute.fetch(disputeTx.disputeAddress)
      expect(escalatedDispute.status).toBe('Escalated')

      // Resolve Dispute (Platform Admin Action)
      const resolveTx = await client.dispute.resolve({
        dispute: disputeTx.disputeAddress,
        resolution: 'PartialRefund',
        refundAmount: 4_000_000_000n // 4 SOL to client, 6 SOL to agent
      })

      expect(resolveTx).toBeDefined()
      const resolvedDispute = await client.dispute.fetch(disputeTx.disputeAddress)
      expect(resolvedDispute.status).toBe('ResolvedPartialRefund')
      expect(resolvedDispute.resolutionAmount).toBe(4_000_000_000n)

      // Verify Escrow Status
      const finalEscrow = await client.escrow.fetch(escrowTx.escrowAddress)
      expect(finalEscrow.status).toBe('DisputeResolved')
    }, 30000) // 30 second timeout
  })

  describe('Multi-Agent Competition', () => {
    it('should handle competitive bidding between multiple agents', async () => {
      // Create multiple agents
      const agents = await Promise.all([
        client.agent.register({
          owner: agentOwnerKeyPair.publicKey,
          metadata: {
            name: 'Expert Dev 1',
            description: 'Senior full-stack developer',
            capabilities: ['React', 'Node.js', 'AWS'],
            pricing: { baseRate: 3_000_000_000n, currency: 'SOL' }
          },
          tier: 'Pro'
        }),
        client.agent.register({
          owner: await generateKeyPair().then(kp => kp.publicKey),
          metadata: {
            name: 'Expert Dev 2',
            description: 'Blockchain specialist',
            capabilities: ['Solana', 'Rust', 'Web3'],
            pricing: { baseRate: 3_500_000_000n, currency: 'SOL' }
          },
          tier: 'Enterprise'
        }),
        client.agent.register({
          owner: await generateKeyPair().then(kp => kp.publicKey),
          metadata: {
            name: 'Expert Dev 3',
            description: 'AI/ML developer',
            capabilities: ['Python', 'TensorFlow', 'APIs'],
            pricing: { baseRate: 4_000_000_000n, currency: 'SOL' }
          },
          tier: 'Pro'
        })
      ])

      // Create competitive auction
      const auctionTx = await client.auction.create({
        creator: clientKeyPair.publicKey,
        serviceType: 'blockchain_development',
        description: 'Develop DeFi protocol with advanced features',
        requirements: [
          'Solana/Anchor experience',
          'DeFi protocol development',
          'Security audit experience',
          'Frontend integration'
        ],
        minBidAmount: 30_000_000_000n, // 30 SOL
        maxBidAmount: 100_000_000_000n, // 100 SOL
        duration: 7200 // 2 hours
      })

      // Agents place competitive bids
      const bids = [
        { agent: agents[0].agentAddress, amount: 35_000_000_000n }, // 35 SOL
        { agent: agents[1].agentAddress, amount: 45_000_000_000n }, // 45 SOL - higher due to specialization
        { agent: agents[2].agentAddress, amount: 40_000_000_000n }, // 40 SOL
      ]

      for (const bid of bids) {
        const bidTx = await client.auction.placeBid({
          auction: auctionTx.auctionAddress,
          bidder: agentOwnerKeyPair.publicKey,
          agent: bid.agent,
          bidAmount: bid.amount,
          proposal: `Comprehensive DeFi protocol development proposal for ${bid.amount / 1_000_000_000n} SOL`,
          timeline: '6-8 weeks with weekly milestone updates'
        })
        expect(bidTx).toBeDefined()
      }

      // Verify highest bid
      const competitiveAuction = await client.auction.fetch(auctionTx.auctionAddress)
      expect(competitiveAuction.highestBid).toBe(45_000_000_000n)
      expect(competitiveAuction.highestBidder).toBe(agents[1].agentAddress) // Blockchain specialist

      // Finalize auction
      const finalizeTx = await client.auction.finalize({
        auction: auctionTx.auctionAddress,
        creator: clientKeyPair.publicKey
      })

      expect(finalizeTx).toBeDefined()
      const finalAuction = await client.auction.fetch(auctionTx.auctionAddress)
      expect(finalAuction.winner).toBe(agents[1].agentAddress)
      expect(finalAuction.status).toBe('Finalized')
    }, 45000) // 45 second timeout
  })

  // Helper function to fund test accounts
  async function fundTestAccount(publicKey: PublicKey, amount: bigint) {
    // This would typically use a test utility to airdrop SOL
    // Implementation depends on test environment setup
    console.log(`Funding account ${publicKey} with ${amount} lamports`)
  }
})