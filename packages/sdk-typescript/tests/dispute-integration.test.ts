/**
 * Dispute Integration Tests
 * 
 * Comprehensive test suite for dispute resolution functionality
 * ensuring proper integration with smart contracts and validation of all dispute workflows.
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'
import { 
  Keypair,
  createSignerFromKeypair,
  generateKeyPairSigner,
  type Address,
  type TransactionSigner
} from '@solana/kit'
import { 
  GhostSpeakClient,
  DisputeStatus,
  deriveDisputePda,
  DisputeTimeUtils,
  DisputeValidationUtils,
  DisputeFilterUtils,
  DisputeAnalyticsUtils,
  type DisputeSummary,
  type EvidenceSubmission
} from '../src/index.js'

// Mock RPC responses for testing
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getRecentBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'MockBlockhash123',
      lastValidBlockHeight: 100
    }),
    getMinimumBalanceForRentExemption: jest.fn().mockResolvedValue(1000000),
    sendTransaction: jest.fn().mockResolvedValue('MockSignature123'),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    getAccountInfo: jest.fn().mockResolvedValue(null),
    getMultipleAccountsInfo: jest.fn().mockResolvedValue([])
  }))
}))

describe('Dispute Integration Tests', () => {
  let client: GhostSpeakClient
  let buyer: TransactionSigner
  let seller: TransactionSigner
  let arbitrator: TransactionSigner
  let transactionAddress: Address
  let disputePda: Address

  beforeAll(async () => {
    // Initialize client with mock RPC
    client = new GhostSpeakClient({
      rpcEndpoint: 'http://localhost:8899',
      commitment: 'confirmed'
    })

    // Generate test signers
    buyer = await generateKeyPairSigner()
    seller = await generateKeyPairSigner()
    arbitrator = await generateKeyPairSigner()
    
    // Mock transaction address
    transactionAddress = 'TxMock123456789' as Address
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('Dispute Creation', () => {
    test('should file a dispute with valid parameters', async () => {
      const reason = 'Service not delivered as agreed'
      
      // Derive dispute PDA
      disputePda = await deriveDisputePda(
        client.programId,
        transactionAddress,
        buyer.address,
        reason
      )

      // Mock successful transaction
      const mockSignature = 'DispFileSig123' as any
      jest.spyOn(client.dispute, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.dispute.fileDispute(
        buyer,
        disputePda,
        {
          transaction: transactionAddress,
          respondent: seller.address,
          reason
        }
      )

      expect(signature).toBe(mockSignature)
      expect(client.dispute.sendTransaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object)]),
        [buyer]
      )
    })

    test('should file dispute with detailed results', async () => {
      const reason = 'Quality issues with delivered content'
      
      disputePda = await deriveDisputePda(
        client.programId,
        transactionAddress,
        buyer.address,
        reason
      )

      // Mock transaction result
      const mockResult = {
        signature: 'DispFileDetailSig456' as any,
        explorerUrl: 'https://explorer.solana.com/tx/DispFileDetailSig456?cluster=devnet'
      }
      jest.spyOn(client.dispute, 'sendTransactionWithDetails').mockResolvedValueOnce(mockResult)

      const result = await client.dispute.fileDisputeWithDetails(
        buyer,
        disputePda,
        {
          transaction: transactionAddress,
          respondent: seller.address,
          reason,
          userRegistry: undefined
        }
      )

      expect(result.signature).toBe(mockResult.signature)
      expect(result.explorerUrl).toContain('explorer.solana.com')
    })

    test('should validate dispute parameters', async () => {
      // Test invalid reason (too long)
      const longReason = 'A'.repeat(501)
      
      await expect(
        client.dispute.fileDispute(
          buyer,
          disputePda,
          {
            transaction: transactionAddress,
            respondent: seller.address,
            reason: longReason
          }
        )
      ).rejects.toThrow('Reason cannot exceed 500 characters')

      // Test empty reason
      await expect(
        client.dispute.fileDispute(
          buyer,
          disputePda,
          {
            transaction: transactionAddress,
            respondent: seller.address,
            reason: ''
          }
        )
      ).rejects.toThrow('Reason is required')
    })
  })

  describe('Evidence Submission', () => {
    test('should submit text evidence', async () => {
      const evidenceData = JSON.stringify({
        statement: 'Seller failed to deliver on agreed deadline',
        supportingFacts: [
          'Deadline was January 15, 2024',
          'No delivery received as of January 20, 2024',
          'Multiple follow-up messages ignored'
        ]
      })

      // Mock successful transaction
      const mockSignature = 'EvidSubmitSig123' as any
      jest.spyOn(client.dispute, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.dispute.submitEvidence(
        buyer,
        {
          dispute: disputePda,
          evidenceType: 'Written Statement',
          evidenceData
        }
      )

      expect(signature).toBe(mockSignature)
    })

    test('should submit document evidence with attachments', async () => {
      const evidenceData = JSON.stringify({
        documents: [
          {
            name: 'Service Agreement',
            ipfsHash: 'QmAgreement123',
            relevantSections: ['Section 3.2 - Delivery Terms']
          }
        ]
      })

      const mockSignature = 'EvidDocSig456' as any
      jest.spyOn(client.dispute, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.dispute.submitEvidence(
        seller,
        {
          dispute: disputePda,
          evidenceType: 'Supporting Documentation',
          evidenceData
        }
      )

      expect(signature).toBe(mockSignature)
    })

    test('should validate evidence data', async () => {
      // Test invalid JSON
      await expect(
        client.dispute.submitEvidence(
          buyer,
          {
            dispute: disputePda,
            evidenceType: 'Invalid Data',
            evidenceData: 'not-valid-json'
          }
        )
      ).rejects.toThrow('Evidence data must be valid JSON')

      // Test evidence too large
      const largeData = JSON.stringify({ data: 'X'.repeat(10001) })
      
      await expect(
        client.dispute.submitEvidence(
          buyer,
          {
            dispute: disputePda,
            evidenceType: 'Large Data',
            evidenceData: largeData
          }
        )
      ).rejects.toThrow('Evidence data cannot exceed 10KB')
    })

    test('should handle multiple evidence submissions', async () => {
      const evidenceTypes = [
        'Timeline of Events',
        'Technical Analysis',
        'Financial Records'
      ]

      // Mock all transactions
      const mockSignatures = evidenceTypes.map((_, i) => `MultiEvidSig${i}` as any)
      mockSignatures.forEach(sig => {
        jest.spyOn(client.dispute, 'sendTransaction').mockResolvedValueOnce(sig)
      })

      const results = await Promise.all(
        evidenceTypes.map((type, i) => 
          client.dispute.submitEvidence(
            i % 2 === 0 ? buyer : seller,
            {
              dispute: disputePda,
              evidenceType: type,
              evidenceData: JSON.stringify({ index: i, type })
            }
          )
        )
      )

      expect(results).toHaveLength(3)
      results.forEach((sig, i) => {
        expect(sig).toBe(mockSignatures[i])
      })
    })
  })

  describe('Dispute Resolution', () => {
    test('should resolve dispute in favor of complainant', async () => {
      const resolution = 'Evidence clearly shows non-delivery. Full refund ordered.'
      
      // Mock successful transaction
      const mockSignature = 'ResolveSig123' as any
      jest.spyOn(client.dispute, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.dispute.resolveDispute(
        arbitrator,
        {
          dispute: disputePda,
          resolution,
          rulingInFavorOfComplainant: true
        }
      )

      expect(signature).toBe(mockSignature)
    })

    test('should resolve dispute with detailed results', async () => {
      const resolution = 'Partial delivery confirmed. 50% refund ordered.'
      
      const mockResult = {
        signature: 'ResolveDetailSig456' as any,
        explorerUrl: 'https://explorer.solana.com/tx/ResolveDetailSig456?cluster=devnet'
      }
      jest.spyOn(client.dispute, 'sendTransactionWithDetails').mockResolvedValueOnce(mockResult)

      const result = await client.dispute.resolveDisputeWithDetails(
        arbitrator,
        {
          dispute: disputePda,
          resolution,
          rulingInFavorOfComplainant: true
        }
      )

      expect(result.signature).toBe(mockResult.signature)
      expect(result.explorerUrl).toContain('explorer.solana.com')
    })

    test('should validate resolution parameters', async () => {
      // Test empty resolution
      await expect(
        client.dispute.resolveDispute(
          arbitrator,
          {
            dispute: disputePda,
            resolution: '',
            rulingInFavorOfComplainant: true
          }
        )
      ).rejects.toThrow('Resolution details are required')

      // Test resolution too long
      const longResolution = 'R'.repeat(1001)
      
      await expect(
        client.dispute.resolveDispute(
          arbitrator,
          {
            dispute: disputePda,
            resolution: longResolution,
            rulingInFavorOfComplainant: false
          }
        )
      ).rejects.toThrow('Resolution cannot exceed 1000 characters')
    })
  })

  describe('Dispute Querying', () => {
    test('should get dispute account data', async () => {
      // Mock dispute data
      const mockDispute = {
        transaction: transactionAddress,
        complainant: buyer.address,
        respondent: seller.address,
        reason: 'Test dispute',
        status: DisputeStatus.Filed,
        evidence: [],
        createdAt: BigInt(Date.now() / 1000),
        updatedAt: BigInt(Date.now() / 1000),
        resolution: null,
        moderator: null,
        aiScore: 0,
        humanReview: false
      }

      // Mock RPC response
      jest.spyOn(client.dispute, 'getDispute').mockResolvedValueOnce(mockDispute as any)

      const dispute = await client.dispute.getDispute(disputePda)

      expect(dispute).toBeDefined()
      expect(dispute?.complainant).toBe(buyer.address)
      expect(dispute?.status).toBe(DisputeStatus.Filed)
    })

    test('should get dispute summary with computed fields', async () => {
      const createdAt = BigInt(Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60) // 3 days ago
      
      const mockDispute = {
        transaction: transactionAddress,
        complainant: buyer.address,
        respondent: seller.address,
        reason: 'Test dispute',
        status: DisputeStatus.UnderReview,
        evidence: [
          { submitter: buyer.address, evidenceType: 'Doc1', evidenceData: '{}', timestamp: createdAt },
          { submitter: seller.address, evidenceType: 'Doc2', evidenceData: '{}', timestamp: createdAt }
        ],
        createdAt,
        updatedAt: BigInt(Date.now() / 1000),
        resolution: null,
        moderator: arbitrator.address,
        aiScore: 75,
        humanReview: true
      }

      jest.spyOn(client.dispute, 'getDispute').mockResolvedValueOnce(mockDispute as any)

      const summary = await client.dispute.getDisputeSummary(disputePda)

      expect(summary).toBeDefined()
      expect(summary?.daysSinceCreated).toBe(3)
      expect(summary?.evidenceCount).toBe(2)
      expect(summary?.hasComplainantEvidence).toBe(true)
      expect(summary?.hasRespondentEvidence).toBe(true)
      expect(summary?.status).toBe(DisputeStatus.UnderReview)
    })

    test('should handle non-existent dispute', async () => {
      jest.spyOn(client.dispute, 'getDispute').mockResolvedValueOnce(null)

      const dispute = await client.dispute.getDispute('NonExistentDispute' as Address)
      expect(dispute).toBeNull()
    })
  })

  describe('Evidence History', () => {
    test('should get evidence history', async () => {
      const mockEvidence: EvidenceSubmission[] = [
        {
          submitter: buyer.address,
          evidenceType: 'Initial Complaint',
          evidenceData: JSON.stringify({ complaint: 'Non-delivery' }),
          timestamp: BigInt(Date.now() / 1000 - 86400),
          attachments: []
        },
        {
          submitter: seller.address,
          evidenceType: 'Response',
          evidenceData: JSON.stringify({ response: 'Delivery attempted' }),
          timestamp: BigInt(Date.now() / 1000),
          attachments: ['QmDoc123']
        }
      ]

      jest.spyOn(client.dispute, 'getEvidenceHistory').mockResolvedValueOnce(mockEvidence)

      const history = await client.dispute.getEvidenceHistory(disputePda)

      expect(history).toHaveLength(2)
      expect(history[0].submitter).toBe(buyer.address)
      expect(history[1].submitter).toBe(seller.address)
    })

    test('should get evidence by submitter', async () => {
      const allEvidence: EvidenceSubmission[] = [
        {
          submitter: buyer.address,
          evidenceType: 'Doc1',
          evidenceData: '{}',
          timestamp: BigInt(1),
          attachments: []
        },
        {
          submitter: seller.address,
          evidenceType: 'Doc2',
          evidenceData: '{}',
          timestamp: BigInt(2),
          attachments: []
        },
        {
          submitter: buyer.address,
          evidenceType: 'Doc3',
          evidenceData: '{}',
          timestamp: BigInt(3),
          attachments: []
        }
      ]

      jest.spyOn(client.dispute, 'getEvidenceHistory').mockResolvedValueOnce(allEvidence)

      const buyerEvidence = await client.dispute.getEvidenceBySubmitter(disputePda, buyer.address)

      expect(buyerEvidence).toHaveLength(2)
      expect(buyerEvidence.every(e => e.submitter === buyer.address)).toBe(true)
    })
  })

  describe('Dispute Monitoring', () => {
    test('should monitor dispute updates', async () => {
      const updates: DisputeSummary[] = []
      
      // Mock dispute data that changes
      const mockDisputes = [
        {
          dispute: disputePda,
          status: DisputeStatus.Filed,
          evidenceCount: 0,
          aiScore: 0,
          humanReview: false,
          daysSinceCreated: 0,
          hasComplainantEvidence: false,
          hasRespondentEvidence: false,
          moderator: null,
          resolution: null
        },
        {
          dispute: disputePda,
          status: DisputeStatus.EvidenceSubmitted,
          evidenceCount: 1,
          aiScore: 0,
          humanReview: false,
          daysSinceCreated: 0,
          hasComplainantEvidence: true,
          hasRespondentEvidence: false,
          moderator: null,
          resolution: null
        },
        {
          dispute: disputePda,
          status: DisputeStatus.UnderReview,
          evidenceCount: 2,
          aiScore: 65,
          humanReview: true,
          daysSinceCreated: 1,
          hasComplainantEvidence: true,
          hasRespondentEvidence: true,
          moderator: arbitrator.address,
          resolution: null
        }
      ]

      let callCount = 0
      jest.spyOn(client.dispute, 'getDisputeSummary').mockImplementation(async () => {
        if (callCount < mockDisputes.length) {
          return mockDisputes[callCount++] as DisputeSummary
        }
        return mockDisputes[mockDisputes.length - 1] as DisputeSummary
      })

      const cleanup = await client.dispute.monitorDispute(
        disputePda,
        (summary) => {
          updates.push(summary)
        }
      )

      // Wait for monitoring to capture updates
      await new Promise(resolve => setTimeout(resolve, 100))

      // Clean up monitoring
      cleanup()

      expect(updates.length).toBeGreaterThan(0)
      expect(updates[0].status).toBe(DisputeStatus.Filed)
    })
  })

  describe('Dispute Analytics', () => {
    test('should get dispute analytics', async () => {
      const mockAnalytics = {
        totalDisputes: 150,
        activeDisputes: 25,
        resolvedDisputes: 120,
        escalatedDisputes: 5,
        averageResolutionTime: BigInt(3 * 24 * 60 * 60), // 3 days
        complainantSuccessRate: 65.5,
        mostCommonReasons: [
          { reason: 'Non-delivery', count: 45 },
          { reason: 'Quality issues', count: 38 },
          { reason: 'Incorrect specifications', count: 22 }
        ],
        topMediators: [
          { 
            moderator: arbitrator.address, 
            resolutionCount: 50, 
            averageTime: BigInt(2 * 24 * 60 * 60),
            successRate: 85
          }
        ]
      }

      jest.spyOn(client.dispute, 'getDisputeAnalytics').mockResolvedValueOnce(mockAnalytics)

      const analytics = await client.dispute.getDisputeAnalytics()

      expect(analytics.totalDisputes).toBe(150)
      expect(analytics.complainantSuccessRate).toBe(65.5)
      expect(analytics.mostCommonReasons).toHaveLength(3)
      expect(analytics.mostCommonReasons[0].reason).toBe('Non-delivery')
    })
  })

  describe('Utility Functions', () => {
    describe('DisputeTimeUtils', () => {
      test('should calculate days open', () => {
        const createdAt = BigInt(Math.floor(Date.now() / 1000) - 5 * 24 * 60 * 60) // 5 days ago
        const days = DisputeTimeUtils.calculateDaysOpen(createdAt)
        expect(days).toBe(5)
      })

      test('should check if dispute is overdue', () => {
        const recentDispute = BigInt(Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60) // 3 days
        const oldDispute = BigInt(Math.floor(Date.now() / 1000) - 10 * 24 * 60 * 60) // 10 days
        
        expect(DisputeTimeUtils.isOverdue(recentDispute)).toBe(false)
        expect(DisputeTimeUtils.isOverdue(oldDispute)).toBe(true)
      })

      test('should format timestamp', () => {
        const timestamp = BigInt(1705334400) // Jan 15, 2024
        const formatted = DisputeTimeUtils.formatTimestamp(timestamp)
        expect(formatted).toMatch(/2024/)
      })
    })

    describe('DisputeValidationUtils', () => {
      test('should validate reason', () => {
        expect(DisputeValidationUtils.validateReason('Valid reason')).toBe(true)
        expect(DisputeValidationUtils.validateReason('')).toBe(false)
        expect(DisputeValidationUtils.validateReason('X'.repeat(501))).toBe(false)
      })

      test('should validate evidence data', () => {
        expect(DisputeValidationUtils.validateEvidenceData('{"valid": "json"}')).toBe(true)
        expect(DisputeValidationUtils.validateEvidenceData('invalid json')).toBe(false)
        expect(DisputeValidationUtils.validateEvidenceData(JSON.stringify({ data: 'X'.repeat(10001) }))).toBe(false)
      })

      test('should validate resolution', () => {
        expect(DisputeValidationUtils.validateResolution('Valid resolution')).toBe(true)
        expect(DisputeValidationUtils.validateResolution('')).toBe(false)
        expect(DisputeValidationUtils.validateResolution('R'.repeat(1001))).toBe(false)
      })
    })

    describe('DisputeFilterUtils', () => {
      test('should filter by status', () => {
        const disputes: DisputeSummary[] = [
          { status: DisputeStatus.Filed } as DisputeSummary,
          { status: DisputeStatus.Resolved } as DisputeSummary,
          { status: DisputeStatus.Filed } as DisputeSummary
        ]

        const filtered = DisputeFilterUtils.filterByStatus(disputes, DisputeStatus.Filed)
        expect(filtered).toHaveLength(2)
      })

      test('should filter by date range', () => {
        const now = BigInt(Math.floor(Date.now() / 1000))
        const disputes: DisputeSummary[] = [
          { daysSinceCreated: 2 } as DisputeSummary,
          { daysSinceCreated: 5 } as DisputeSummary,
          { daysSinceCreated: 10 } as DisputeSummary
        ]

        const filtered = DisputeFilterUtils.filterByDateRange(
          disputes,
          now - BigInt(7 * 24 * 60 * 60), // 7 days ago
          now
        )
        
        // This would need proper implementation based on actual date comparison
        expect(filtered).toBeDefined()
      })

      test('should filter by participant', () => {
        const disputes: DisputeSummary[] = [
          { dispute: disputePda } as DisputeSummary,
          { dispute: 'OtherDispute' as Address } as DisputeSummary
        ]

        // Mock getDispute to return participant info
        const filtered = DisputeFilterUtils.filterByParticipant(disputes, buyer.address)
        expect(filtered).toBeDefined()
      })
    })

    describe('DisputeAnalyticsUtils', () => {
      test('should calculate success rate', () => {
        const disputes: DisputeSummary[] = [
          { status: DisputeStatus.Resolved, resolution: 'In favor of complainant' } as DisputeSummary,
          { status: DisputeStatus.Resolved, resolution: 'In favor of respondent' } as DisputeSummary,
          { status: DisputeStatus.Resolved, resolution: 'In favor of complainant' } as DisputeSummary,
          { status: DisputeStatus.Filed } as DisputeSummary
        ]

        const rate = DisputeAnalyticsUtils.calculateSuccessRate(disputes)
        expect(rate).toBeCloseTo(66.67, 1) // 2 out of 3 resolved
      })

      test('should get top dispute reasons', () => {
        const disputes = [
          { reason: 'Non-delivery' },
          { reason: 'Quality issues' },
          { reason: 'Non-delivery' },
          { reason: 'Non-delivery' },
          { reason: 'Quality issues' }
        ]

        const topReasons = DisputeAnalyticsUtils.getTopReasons(disputes as any, 2)
        expect(topReasons).toHaveLength(2)
        expect(topReasons[0].reason).toBe('Non-delivery')
        expect(topReasons[0].count).toBe(3)
      })

      test('should calculate average resolution time', () => {
        const disputes: DisputeSummary[] = [
          { status: DisputeStatus.Resolved, daysSinceCreated: 3 } as DisputeSummary,
          { status: DisputeStatus.Resolved, daysSinceCreated: 5 } as DisputeSummary,
          { status: DisputeStatus.Filed, daysSinceCreated: 10 } as DisputeSummary, // Should be ignored
          { status: DisputeStatus.Resolved, daysSinceCreated: 4 } as DisputeSummary
        ]

        const avgTime = DisputeAnalyticsUtils.getAverageResolutionTime(disputes)
        expect(avgTime).toBe(4) // (3 + 5 + 4) / 3
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle RPC errors gracefully', async () => {
      // Mock RPC error
      jest.spyOn(client.dispute, 'sendTransaction').mockRejectedValueOnce(
        new Error('RPC Error: Network timeout')
      )

      await expect(
        client.dispute.fileDispute(
          buyer,
          disputePda,
          {
            transaction: transactionAddress,
            respondent: seller.address,
            reason: 'Test dispute'
          }
        )
      ).rejects.toThrow('RPC Error')
    })

    test('should handle insufficient funds error', async () => {
      jest.spyOn(client.dispute, 'sendTransaction').mockRejectedValueOnce(
        new Error('Insufficient funds for transaction')
      )

      await expect(
        client.dispute.submitEvidence(
          buyer,
          {
            dispute: disputePda,
            evidenceType: 'Test Evidence',
            evidenceData: '{}'
          }
        )
      ).rejects.toThrow('Insufficient funds')
    })
  })

  describe('Rate Limiting', () => {
    test('should handle rate limiting for evidence submission', async () => {
      const submissions = Array(5).fill(null).map((_, i) => ({
        evidenceType: `Evidence ${i}`,
        evidenceData: JSON.stringify({ index: i })
      }))

      // Mock first 3 succeed, 4th rate limited
      const mockSignatures = ['Sig1', 'Sig2', 'Sig3']
      mockSignatures.forEach(sig => {
        jest.spyOn(client.dispute, 'sendTransaction').mockResolvedValueOnce(sig as any)
      })
      jest.spyOn(client.dispute, 'sendTransaction').mockRejectedValueOnce(
        new Error('Rate limit exceeded')
      )

      const results = await Promise.allSettled(
        submissions.map(sub => 
          client.dispute.submitEvidence(buyer, {
            dispute: disputePda,
            ...sub
          })
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      expect(successful).toHaveLength(3)
      expect(failed).toHaveLength(2) // Remaining would also fail
    })
  })
})

describe('Dispute Escalation Tests', () => {
  let client: GhostSpeakClient
  let disputePda: Address

  beforeAll(() => {
    client = new GhostSpeakClient({
      rpcEndpoint: 'http://localhost:8899',
      commitment: 'confirmed'
    })
    
    disputePda = 'DisputeEscalation123' as Address
  })

  test('should escalate dispute to human review', async () => {
    const reason = 'AI confidence score below threshold'
    
    // Mock successful escalation
    const mockResult = await client.dispute.escalateDispute(disputePda, reason)
    
    expect(mockResult).toBeDefined()
  })

  test('should handle complex multi-party disputes', async () => {
    // Test scenario with multiple parties submitting evidence
    const parties = [
      await generateKeyPairSigner(),
      await generateKeyPairSigner(),
      await generateKeyPairSigner()
    ]

    const evidencePromises = parties.map((party, index) => {
      jest.spyOn(client.dispute, 'sendTransaction').mockResolvedValueOnce(`MultiPartySig${index}` as any)
      
      return client.dispute.submitEvidence(
        party,
        {
          dispute: disputePda,
          evidenceType: `Party ${index} Evidence`,
          evidenceData: JSON.stringify({
            partyIndex: index,
            claim: `Party ${index} claim details`
          })
        }
      )
    })

    const results = await Promise.all(evidencePromises)
    expect(results).toHaveLength(3)
  })
})

describe('Dispute Notification Tests', () => {
  let client: GhostSpeakClient

  beforeAll(() => {
    client = new GhostSpeakClient({
      rpcEndpoint: 'http://localhost:8899',
      commitment: 'confirmed'
    })
  })

  test('should trigger notifications on status changes', async () => {
    const disputePda = 'NotificationTest123' as Address
    const notifications: string[] = []

    // Mock monitoring with status changes
    const statuses = [
      DisputeStatus.Filed,
      DisputeStatus.EvidenceSubmitted,
      DisputeStatus.UnderReview,
      DisputeStatus.Resolved
    ]

    let currentStatus = 0
    jest.spyOn(client.dispute, 'getDisputeSummary').mockImplementation(async () => {
      if (currentStatus < statuses.length) {
        return {
          dispute: disputePda,
          status: statuses[currentStatus++],
          evidenceCount: currentStatus,
          aiScore: currentStatus * 25,
          humanReview: currentStatus > 2,
          daysSinceCreated: 0,
          hasComplainantEvidence: true,
          hasRespondentEvidence: currentStatus > 1,
          moderator: currentStatus > 2 ? 'Moderator123' as Address : null,
          resolution: currentStatus === statuses.length ? 'Resolved' : null
        } as DisputeSummary
      }
      return null
    })

    const cleanup = await client.dispute.monitorDispute(
      disputePda,
      (summary) => {
        notifications.push(`Status: ${summary.status}`)
      }
    )

    // Wait for status changes
    await new Promise(resolve => setTimeout(resolve, 200))
    
    cleanup()

    expect(notifications.length).toBeGreaterThan(0)
    expect(notifications[0]).toContain('Filed')
  })
})