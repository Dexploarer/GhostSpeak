import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GhostSpeakClient } from '../../src/client/GhostSpeakClient'
import { 
  address,
  generateKeyPairSigner,
  lamports,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction
} from '@solana/kit'
import type { TransactionSigner, Address } from '@solana/kit'

describe('GhostSpeak Integration Workflows', () => {
  let client: GhostSpeakClient
  let mockRpc: any
  let payer: TransactionSigner
  let agent: TransactionSigner
  let buyer: TransactionSigner
  let programId: Address

  beforeEach(async () => {
    programId = address('5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK')
    
    // Create signers
    payer = await generateKeyPairSigner()
    agent = await generateKeyPairSigner()
    buyer = await generateKeyPairSigner()

    // Create comprehensive mock RPC
    mockRpc = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        value: {
          blockhash: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          lastValidBlockHeight: 150000000n
        }
      }),
      getAccountInfo: vi.fn().mockImplementation((address) => {
        // Mock different account states
        if (address === agent.address) {
          return Promise.resolve({
            value: {
              data: Buffer.from('agent-data'),
              lamports: lamports(1000000n),
              owner: programId,
              executable: false
            }
          })
        }
        return Promise.resolve({ value: null })
      }),
      getMultipleAccounts: vi.fn().mockResolvedValue({
        value: []
      }),
      sendTransaction: vi.fn().mockImplementation(() => {
        // Generate unique signature for each transaction
        return Promise.resolve(`tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
      }),
      simulateTransaction: vi.fn().mockResolvedValue({
        value: {
          err: null,
          logs: ['Program log: Success'],
          unitsConsumed: 5000n
        }
      }),
      getSignatureStatuses: vi.fn().mockResolvedValue({
        value: [{
          slot: 150000000n,
          confirmations: 10,
          err: null,
          confirmationStatus: 'confirmed'
        }]
      }),
      getBalance: vi.fn().mockResolvedValue({
        value: lamports(1000000000n)
      })
    }

    client = new GhostSpeakClient(mockRpc, programId)
  })

  describe('Agent Registration and Service Listing Workflow', () => {
    it('should complete full agent onboarding workflow', async () => {
      // Step 1: Register agent
      const registerIx = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'AI Code Reviewer',
        description: 'Professional code review service with AI-powered insights',
        avatar: 'https://example.com/agent-avatar.png',
        category: 'Development',
        capabilities: ['code-review', 'security-audit', 'performance-optimization'],
        pricing: {
          basePrice: lamports(5000000n), // 0.005 SOL
          currency: 'SOL'
        }
      })

      const registerTx = await client.sendTransaction([registerIx], [payer, agent])
      expect(registerTx).toBeDefined()
      expect(registerTx).toMatch(/^tx_/)

      // Step 2: Activate agent
      const activateIx = await client.agent.activateAgent({
        signer: agent,
        payer
      })

      const activateTx = await client.sendTransaction([activateIx], [payer, agent])
      expect(activateTx).toBeDefined()

      // Step 3: Create service listing
      const listingIx = await client.marketplace.createServiceListing({
        signer: agent,
        payer,
        title: 'Comprehensive Code Review Service',
        description: 'Get detailed code review with security analysis and performance recommendations',
        category: 'Development',
        price: lamports(10000000n), // 0.01 SOL
        currency: 'SOL',
        deliveryTime: 86400, // 24 hours
        requirements: [
          'GitHub repository link',
          'Specific files or modules to review',
          'Areas of concern (optional)'
        ],
        tags: ['code-review', 'security', 'best-practices', 'typescript', 'rust']
      })

      const listingTx = await client.sendTransaction([listingIx], [payer, agent])
      expect(listingTx).toBeDefined()

      // Verify all transactions were sent
      expect(mockRpc.sendTransaction).toHaveBeenCalledTimes(3)
    })

    it('should handle agent verification workflow', async () => {
      // Assume agent is already registered
      const authority = await generateKeyPairSigner()

      // Step 1: Verify agent (by authority)
      const verifyIx = await client.agent.verifyAgent({
        signer: authority,
        agent: agent.address,
        verificationLevel: 'professional',
        metadata: {
          verifiedAt: Date.now(),
          verifierName: 'GhostSpeak Protocol Team',
          verificationNotes: 'Verified professional developer'
        }
      })

      const verifyTx = await client.sendTransaction([verifyIx], [authority])
      expect(verifyTx).toBeDefined()

      // Step 2: Update agent reputation
      const reputationIx = await client.agent.updateAgentReputation({
        signer: buyer,
        agent: agent.address,
        taskCompleted: true,
        rating: 5,
        review: 'Excellent code review, found critical security issues'
      })

      const reputationTx = await client.sendTransaction([reputationIx], [buyer])
      expect(reputationTx).toBeDefined()
    })
  })

  describe('Service Purchase with Escrow Workflow', () => {
    it('should complete full purchase workflow with escrow', async () => {
      const listingAddress = address('listing123')
      const workOrderId = `order_${Date.now()}`

      // Step 1: Create work order
      const workOrderIx = await client.escrow.createWorkOrder({
        signer: buyer,
        payer: buyer,
        seller: agent.address,
        title: 'Code Review for DeFi Protocol',
        description: 'Review smart contracts for security vulnerabilities',
        requirements: [
          'Solana program code',
          'Focus on token handling',
          'Check for reentrancy'
        ],
        deliverables: [
          'Detailed security report',
          'Code improvement suggestions',
          'Best practices guide'
        ],
        price: lamports(50000000n), // 0.05 SOL
        deadline: Date.now() + 259200000, // 3 days
        useEscrow: true
      })

      const workOrderTx = await client.sendTransaction([workOrderIx], [buyer, payer])
      expect(workOrderTx).toBeDefined()

      // Step 2: Create escrow payment
      const paymentIx = await client.escrow.createPayment({
        signer: buyer,
        payer: buyer,
        recipient: agent.address,
        amount: lamports(50000000n),
        workOrder: address(workOrderId),
        useEscrow: true,
        escrowDuration: 259200, // 3 days
        description: 'Payment for code review service'
      })

      const paymentTx = await client.sendTransaction([paymentIx], [buyer, payer])
      expect(paymentTx).toBeDefined()

      // Step 3: Agent delivers work
      const deliveryIx = await client.escrow.submitWorkDelivery({
        signer: agent,
        workOrder: address(workOrderId),
        deliveryUrl: 'https://github.com/agent/security-report',
        description: 'Security review completed with 5 critical findings',
        attachments: [
          'https://docs.example.com/security-report.pdf',
          'https://github.com/agent/improved-code'
        ]
      })

      const deliveryTx = await client.sendTransaction([deliveryIx], [agent])
      expect(deliveryTx).toBeDefined()

      // Step 4: Buyer approves and releases payment
      const releaseIx = await client.escrow.processPayment({
        signer: buyer,
        payment: address('payment123'),
        action: 'release',
        reason: 'Excellent work, all requirements met'
      })

      const releaseTx = await client.sendTransaction([releaseIx], [buyer])
      expect(releaseTx).toBeDefined()

      // Verify workflow completion
      expect(mockRpc.sendTransaction).toHaveBeenCalledTimes(4)
    })

    it('should handle dispute resolution workflow', async () => {
      const paymentAddress = address('payment456')
      const workOrderAddress = address('workOrder456')
      const arbitrator = await generateKeyPairSigner()

      // Step 1: Buyer files dispute
      const disputeIx = await client.escrow.fileDispute({
        signer: buyer,
        payment: paymentAddress,
        workOrder: workOrderAddress,
        reason: 'Work not delivered as specified',
        evidence: [
          'Original requirements document',
          'Delivered work screenshot',
          'Communication logs'
        ],
        requestedResolution: 'Requesting 50% refund'
      })

      const disputeTx = await client.sendTransaction([disputeIx], [buyer])
      expect(disputeTx).toBeDefined()

      // Step 2: Seller submits counter-evidence
      const evidenceIx = await client.escrow.submitDisputeEvidence({
        signer: agent,
        dispute: address('dispute123'),
        evidence: [
          'Proof of completed work',
          'Additional features delivered',
          'Buyer approval messages'
        ],
        description: 'All requirements were met plus additional features'
      })

      const evidenceTx = await client.sendTransaction([evidenceIx], [agent])
      expect(evidenceTx).toBeDefined()

      // Step 3: Arbitrator resolves dispute
      const resolveIx = await client.escrow.resolveDispute({
        signer: arbitrator,
        dispute: address('dispute123'),
        payment: paymentAddress,
        resolution: 'split',
        buyerAmount: lamports(15000000n), // 30% refund
        sellerAmount: lamports(35000000n), // 70% to seller
        reasoning: 'Work was mostly complete but some requirements not fully met'
      })

      const resolveTx = await client.sendTransaction([resolveIx], [arbitrator])
      expect(resolveTx).toBeDefined()
    })
  })

  describe('Auction Workflow', () => {
    it('should complete full auction lifecycle', async () => {
      const bidder1 = await generateKeyPairSigner()
      const bidder2 = await generateKeyPairSigner()

      // Step 1: Create service auction
      const auctionIx = await client.marketplace.createServiceAuction({
        signer: agent,
        payer,
        title: 'Premium Smart Contract Audit',
        description: 'Comprehensive security audit for DeFi protocols',
        category: 'Security',
        startingPrice: lamports(100000000n), // 0.1 SOL
        minimumIncrement: lamports(10000000n), // 0.01 SOL
        duration: 172800, // 48 hours
        reservePrice: lamports(500000000n), // 0.5 SOL
        requirements: [
          'Full protocol documentation',
          'Access to private repository',
          'Test suite included'
        ],
        tags: ['security', 'audit', 'defi', 'premium']
      })

      const auctionTx = await client.sendTransaction([auctionIx], [payer, agent])
      expect(auctionTx).toBeDefined()

      // Step 2: Place bids
      const bid1Ix = await client.marketplace.placeAuctionBid({
        signer: bidder1,
        payer: bidder1,
        auction: address('auction123'),
        bidAmount: lamports(150000000n), // 0.15 SOL
        maxAmount: lamports(300000000n)  // Auto-bid up to 0.3 SOL
      })

      const bid1Tx = await client.sendTransaction([bid1Ix], [bidder1])
      expect(bid1Tx).toBeDefined()

      const bid2Ix = await client.marketplace.placeAuctionBid({
        signer: bidder2,
        payer: bidder2,
        auction: address('auction123'),
        bidAmount: lamports(200000000n) // 0.2 SOL
      })

      const bid2Tx = await client.sendTransaction([bid2Ix], [bidder2])
      expect(bid2Tx).toBeDefined()

      // Step 3: Finalize auction
      const finalizeIx = await client.marketplace.finalizeAuction({
        signer: agent,
        auction: address('auction123'),
        winner: bidder2.address,
        finalPrice: lamports(200000000n)
      })

      const finalizeTx = await client.sendTransaction([finalizeIx], [agent])
      expect(finalizeTx).toBeDefined()
    })
  })

  describe('Job Market Workflow', () => {
    it('should complete job posting and application workflow', async () => {
      const freelancer1 = await generateKeyPairSigner()
      const freelancer2 = await generateKeyPairSigner()

      // Step 1: Create job posting
      const jobIx = await client.marketplace.createJobPosting({
        signer: buyer,
        payer: buyer,
        title: 'Solana dApp Development',
        description: 'Build a decentralized exchange on Solana',
        category: 'Blockchain Development',
        budget: lamports(5000000000n), // 5 SOL
        duration: 2592000, // 30 days
        requirements: [
          '3+ years Solana experience',
          'Rust proficiency',
          'DeFi knowledge',
          'Portfolio required'
        ],
        skills: ['rust', 'solana', 'anchor', 'defi', 'trading'],
        isRemote: true,
        deadline: Date.now() + 604800000 // Applications open for 7 days
      })

      const jobTx = await client.sendTransaction([jobIx], [buyer, payer])
      expect(jobTx).toBeDefined()

      // Step 2: Freelancers apply
      const apply1Ix = await client.marketplace.applyToJob({
        signer: freelancer1,
        payer: freelancer1,
        job: address('job123'),
        coverLetter: 'Experienced Solana developer with 5 DEX projects completed...',
        proposedRate: lamports(4500000000n), // 4.5 SOL
        estimatedDuration: 2160000, // 25 days
        portfolio: [
          'https://github.com/freelancer1/solana-dex',
          'https://github.com/freelancer1/defi-protocol'
        ],
        availability: 'immediate'
      })

      const apply1Tx = await client.sendTransaction([apply1Ix], [freelancer1])
      expect(apply1Tx).toBeDefined()

      // Step 3: Accept application
      const acceptIx = await client.marketplace.acceptJobApplication({
        signer: buyer,
        job: address('job123'),
        application: address('application123'),
        applicant: freelancer1.address,
        terms: {
          finalRate: lamports(4500000000n),
          startDate: Date.now() + 172800000, // Start in 2 days
          milestones: [
            'Smart contract development',
            'Frontend integration',
            'Testing and deployment'
          ]
        }
      })

      const acceptTx = await client.sendTransaction([acceptIx], [buyer])
      expect(acceptTx).toBeDefined()
    })
  })

  describe('A2A Communication Workflow', () => {
    it('should handle agent-to-agent collaboration', async () => {
      const agent2 = await generateKeyPairSigner()

      // Step 1: Create A2A session
      const sessionIx = await client.a2a.createSession({
        signer: agent,
        payer,
        participant: agent2.address,
        sessionType: 'collaboration',
        metadata: {
          purpose: 'Code review collaboration',
          expectedDuration: 3600 // 1 hour
        }
      })

      const sessionTx = await client.sendTransaction([sessionIx], [payer, agent])
      expect(sessionTx).toBeDefined()

      // Step 2: Send messages
      const message1Ix = await client.a2a.sendMessage({
        signer: agent,
        session: address('session123'),
        content: 'Found potential security issue in contract',
        messageType: 'alert',
        attachments: ['https://github.com/link/to/issue']
      })

      const message1Tx = await client.sendTransaction([message1Ix], [agent])
      expect(message1Tx).toBeDefined()

      const message2Ix = await client.a2a.sendMessage({
        signer: agent2,
        session: address('session123'),
        content: 'Confirmed, preparing fix',
        messageType: 'response',
        replyTo: 'msg123'
      })

      const message2Tx = await client.sendTransaction([message2Ix], [agent2])
      expect(message2Tx).toBeDefined()

      // Step 3: Update session status
      const statusIx = await client.a2a.updateStatus({
        signer: agent,
        session: address('session123'),
        status: 'completed',
        summary: 'Security issue identified and resolved'
      })

      const statusTx = await client.sendTransaction([statusIx], [agent])
      expect(statusTx).toBeDefined()
    })
  })

  describe('Complex Multi-Step Workflows', () => {
    it('should handle enterprise bulk deal workflow', async () => {
      const enterprise = await generateKeyPairSigner()
      const agents = await Promise.all([
        generateKeyPairSigner(),
        generateKeyPairSigner(),
        generateKeyPairSigner()
      ])

      // Step 1: Create bulk deal
      const bulkDealIx = await client.bulkDeals.createBulkDeal({
        signer: enterprise,
        payer: enterprise,
        dealType: 'enterprise',
        title: 'Enterprise AI Agent Package',
        description: 'Comprehensive AI agent services for enterprise',
        services: agents.map((agent, i) => ({
          agent: agent.address,
          service: `Service ${i + 1}`,
          price: lamports(100000000n) // 0.1 SOL each
        })),
        discount: 20, // 20% discount
        validUntil: Date.now() + 2592000000 // Valid for 30 days
      })

      const bulkDealTx = await client.sendTransaction([bulkDealIx], [enterprise])
      expect(bulkDealTx).toBeDefined()

      // Step 2: Execute bulk deal
      const executeDealIx = await client.bulkDeals.executeBulkDeal({
        signer: buyer,
        payer: buyer,
        bulkDeal: address('bulkDeal123'),
        totalPayment: lamports(240000000n) // 0.24 SOL (after discount)
      })

      const executeTx = await client.sendTransaction([executeDealIx], [buyer])
      expect(executeTx).toBeDefined()
    })

    it('should handle governance proposal workflow', async () => {
      const voters = await Promise.all([
        generateKeyPairSigner(),
        generateKeyPairSigner(),
        generateKeyPairSigner()
      ])

      // Step 1: Create proposal
      const proposalIx = await client.governance.createProposal({
        signer: agent,
        payer,
        title: 'Reduce marketplace fees',
        description: 'Proposal to reduce marketplace fees from 5% to 3%',
        proposalType: 'parameter_change',
        votingPeriod: 259200, // 3 days
        options: ['Yes', 'No', 'Abstain']
      })

      const proposalTx = await client.sendTransaction([proposalIx], [payer, agent])
      expect(proposalTx).toBeDefined()

      // Step 2: Cast votes
      for (const [index, voter] of voters.entries()) {
        const voteIx = await client.governance.castVote({
          signer: voter,
          proposal: address('proposal123'),
          vote: index === 2 ? 'Abstain' : 'Yes'
        })

        const voteTx = await client.sendTransaction([voteIx], [voter])
        expect(voteTx).toBeDefined()
      }

      // Step 3: Execute proposal
      const executeIx = await client.governance.executeProposal({
        signer: agent,
        proposal: address('proposal123')
      })

      const executeTx = await client.sendTransaction([executeIx], [agent])
      expect(executeTx).toBeDefined()
    })
  })

  describe('Error Recovery Workflows', () => {
    it('should handle transaction retry on failure', async () => {
      // Mock first attempt failure, second success
      mockRpc.sendTransaction
        .mockRejectedValueOnce(new Error('Network congestion'))
        .mockResolvedValueOnce('retry_success_tx')

      const instruction = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'Retry Test Agent',
        description: 'Testing retry logic',
        avatar: 'https://example.com/avatar.png',
        category: 'Test',
        capabilities: ['testing'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })

      // Implement retry logic
      let signature
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts) {
        try {
          signature = await client.sendTransaction([instruction], [payer, agent])
          break
        } catch (error) {
          attempts++
          if (attempts === maxAttempts) throw error
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      expect(signature).toBe('retry_success_tx')
      expect(mockRpc.sendTransaction).toHaveBeenCalledTimes(2)
    })

    it('should handle partial workflow completion', async () => {
      // Simulate partial completion where agent is registered but activation fails
      const registerIx = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'Partial Workflow Agent',
        description: 'Testing partial completion',
        avatar: 'https://example.com/avatar.png',
        category: 'Test',
        capabilities: ['testing'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })

      const registerTx = await client.sendTransaction([registerIx], [payer, agent])
      expect(registerTx).toBeDefined()

      // Mock activation failure
      mockRpc.sendTransaction.mockRejectedValueOnce(new Error('Insufficient funds'))

      const activateIx = await client.agent.activateAgent({
        signer: agent,
        payer
      })

      // Store state for recovery
      const workflowState = {
        agentRegistered: true,
        registrationTx: registerTx,
        agentActivated: false,
        lastError: null as Error | null
      }

      try {
        const activateTx = await client.sendTransaction([activateIx], [payer, agent])
        workflowState.agentActivated = true
      } catch (error) {
        workflowState.lastError = error as Error
      }

      expect(workflowState.agentRegistered).toBe(true)
      expect(workflowState.agentActivated).toBe(false)
      expect(workflowState.lastError).toBeDefined()
    })
  })
})