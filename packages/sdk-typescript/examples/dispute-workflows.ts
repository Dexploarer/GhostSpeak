/**
 * Comprehensive Dispute Workflow Examples
 * 
 * This file demonstrates end-to-end dispute resolution processes including:
 * - Filing disputes for various scenarios
 * - Evidence submission patterns
 * - Arbitration workflows
 * - Complex multi-party disputes
 */

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
  type DisputeSummary,
  type EvidenceSubmission
} from '../src/index.js'

// Initialize client
const client = new GhostSpeakClient({
  rpcEndpoint: 'https://api.devnet.solana.com',
  commitment: 'confirmed'
})

// =====================================================
// SCENARIO 1: SIMPLE DISPUTE - NON-DELIVERY
// =====================================================

/**
 * Demonstrates a simple dispute flow where a buyer files a dispute
 * for non-delivery of services
 */
async function simpleNonDeliveryDispute() {
  console.log('\n🔵 SCENARIO 1: Simple Non-Delivery Dispute\n')

  // Setup participants
  const buyer = await generateKeyPairSigner()
  const seller = await generateKeyPairSigner()
  const arbitrator = await generateKeyPairSigner()
  
  // Transaction that's being disputed
  const transactionAddress = 'TxHash123...' as Address
  
  // Step 1: Buyer files dispute for non-delivery
  console.log('📋 Step 1: Buyer filing dispute...')
  
  const disputePda = await deriveDisputePda(
    client.programId,
    transactionAddress,
    buyer.address,
    'Non-delivery of agreed services'
  )

  const fileResult = await client.dispute.fileDisputeWithDetails(
    buyer,
    disputePda,
    {
      transaction: transactionAddress,
      respondent: seller.address,
      reason: 'Service was not delivered within agreed timeframe (48 hours)',
      userRegistry: undefined // Will be derived
    }
  )

  console.log(`✅ Dispute filed: ${fileResult.signature}`)
  console.log(`   View on explorer: ${fileResult.explorerUrl}`)
  console.log(`   Dispute Address: ${disputePda}`)

  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Step 2: Get dispute details
  console.log('\n📊 Step 2: Checking dispute status...')
  
  const disputeSummary = await client.dispute.getDisputeSummary(disputePda)
  if (disputeSummary) {
    console.log(`   Status: ${disputeSummary.status}`)
    console.log(`   Days since filed: ${disputeSummary.daysSinceCreated}`)
    console.log(`   Evidence count: ${disputeSummary.evidenceCount}`)
  }

  // Step 3: Seller submits evidence (proof of delivery attempt)
  console.log('\n📄 Step 3: Seller submitting evidence...')
  
  const sellerEvidence: EvidenceSubmission = {
    evidenceType: 'Delivery Attempt Documentation',
    evidenceData: JSON.stringify({
      attemptDate: '2024-01-15T10:30:00Z',
      attemptMethod: 'API delivery to specified endpoint',
      responseCode: 'ENDPOINT_UNREACHABLE',
      retryAttempts: 3,
      logs: 'https://ipfs.io/ipfs/QmSellerEvidenceLogs...'
    }),
    attachments: [
      'https://ipfs.io/ipfs/QmDeliveryLogs123...',
      'https://ipfs.io/ipfs/QmAPIResponse456...'
    ]
  }

  const evidenceResult = await client.dispute.submitEvidence(
    seller,
    {
      dispute: disputePda,
      evidenceType: sellerEvidence.evidenceType,
      evidenceData: sellerEvidence.evidenceData
    }
  )

  console.log(`✅ Seller evidence submitted: ${evidenceResult}`)

  // Step 4: Buyer counter-evidence
  console.log('\n📄 Step 4: Buyer submitting counter-evidence...')
  
  const buyerEvidence: EvidenceSubmission = {
    evidenceType: 'Endpoint Availability Proof',
    evidenceData: JSON.stringify({
      endpointUrl: 'https://buyer-api.example.com/webhook',
      uptimeReport: '99.9% during disputed period',
      healthCheckLogs: 'All checks passed during delivery window',
      monitoring: 'https://status.buyer-api.com/history'
    })
  }

  await client.dispute.submitEvidence(
    buyer,
    {
      dispute: disputePda,
      evidenceType: buyerEvidence.evidenceType,
      evidenceData: buyerEvidence.evidenceData
    }
  )

  // Step 5: Arbitrator reviews and resolves
  console.log('\n⚖️ Step 5: Arbitrator resolving dispute...')
  
  // Arbitrator reviews all evidence
  const evidenceHistory = await client.dispute.getEvidenceHistory(disputePda)
  console.log(`   Total evidence pieces: ${evidenceHistory.length}`)
  
  // Make resolution
  const resolution = await client.dispute.resolveDisputeWithDetails(
    arbitrator,
    {
      dispute: disputePda,
      resolution: 'After reviewing the evidence, the buyer\'s endpoint was operational. ' +
                 'Seller failed to properly handle API errors. Ruling in favor of buyer.',
      rulingInFavorOfComplainant: true
    }
  )

  console.log(`✅ Dispute resolved: ${resolution.signature}`)
  console.log(`   Resolution: In favor of buyer`)
  console.log(`   View on explorer: ${resolution.explorerUrl}`)

  // Final status check
  const finalStatus = await client.dispute.getDisputeSummary(disputePda)
  console.log(`\n📊 Final Status: ${finalStatus?.status}`)
  console.log(`   Resolution: ${finalStatus?.resolution}`)
}

// =====================================================
// SCENARIO 2: COMPLEX QUALITY DISPUTE
// =====================================================

/**
 * Demonstrates a complex dispute involving quality issues,
 * multiple rounds of evidence, and escalation
 */
async function complexQualityDispute() {
  console.log('\n\n🔵 SCENARIO 2: Complex Quality Dispute with Escalation\n')

  // Setup participants
  const buyer = await generateKeyPairSigner()
  const aiAgent = await generateKeyPairSigner()
  const humanReviewer = await generateKeyPairSigner()
  
  const transactionAddress = 'TxQuality789...' as Address

  // Step 1: File quality dispute
  console.log('📋 Step 1: Filing quality dispute...')
  
  const disputePda = await deriveDisputePda(
    client.programId,
    transactionAddress,
    buyer.address,
    'Poor quality AI-generated content'
  )

  await client.dispute.fileDispute(
    buyer,
    disputePda,
    {
      transaction: transactionAddress,
      respondent: aiAgent.address,
      reason: 'AI-generated content contains factual errors and inconsistencies'
    }
  )

  // Step 2: Multiple evidence rounds
  console.log('\n📄 Step 2: First evidence round...')

  // Buyer provides specific examples
  const qualityExamples: EvidenceSubmission = {
    evidenceType: 'Quality Issue Examples',
    evidenceData: JSON.stringify({
      issues: [
        {
          section: 'Introduction',
          issue: 'Factual error about company founding date',
          expected: '2019',
          received: '2015'
        },
        {
          section: 'Technical Details',
          issue: 'Inconsistent terminology usage',
          examples: ['API/api/Api used interchangeably', 'Mixed British/American spelling']
        },
        {
          section: 'Code Examples',
          issue: 'Non-functional code snippets',
          errors: ['Syntax errors in 3 examples', 'Deprecated library usage']
        }
      ],
      overallQualityScore: '3/10',
      requirementsMetScore: '40%'
    })
  }

  await client.dispute.submitEvidence(
    buyer,
    {
      dispute: disputePda,
      evidenceType: qualityExamples.evidenceType,
      evidenceData: qualityExamples.evidenceData
    }
  )

  // AI Agent provides generation logs
  console.log('\n📄 AI Agent submitting generation logs...')
  
  const generationLogs: EvidenceSubmission = {
    evidenceType: 'AI Generation Logs',
    evidenceData: JSON.stringify({
      model: 'GhostSpeak-Content-v2.1',
      parameters: {
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.9
      },
      inputPrompt: 'Original prompt hash: QmPrompt123...',
      validationChecks: {
        grammarCheck: 'PASSED',
        factCheck: 'PARTIAL_PASS',
        coherenceScore: 0.82
      },
      knownLimitations: 'Model may have outdated information for recent events'
    })
  }

  await client.dispute.submitEvidence(
    aiAgent,
    {
      dispute: disputePda,
      evidenceType: generationLogs.evidenceType,
      evidenceData: generationLogs.evidenceData
    }
  )

  // Step 3: AI preliminary assessment
  console.log('\n🤖 Step 3: AI preliminary assessment...')
  
  const disputeData = await client.dispute.getDispute(disputePda)
  if (disputeData && disputeData.aiScore < 50) {
    console.log(`   AI Score: ${disputeData.aiScore}/100`)
    console.log('   Recommendation: Escalate to human review')
    
    // Escalate to human review
    await client.dispute.escalateDispute(
      disputePda,
      'AI score below threshold, complex quality assessment required'
    )
  }

  // Step 4: Additional evidence rounds
  console.log('\n📄 Step 4: Additional evidence submission...')

  // Buyer provides requirements document
  await client.dispute.submitEvidence(
    buyer,
    {
      dispute: disputePda,
      evidenceType: 'Original Requirements',
      evidenceData: JSON.stringify({
        documentHash: 'QmRequirements789...',
        keyRequirements: [
          'Factual accuracy critical',
          'Consistent professional tone',
          'Working code examples required',
          'American English spelling only'
        ],
        acceptanceCriteria: 'All requirements must be met for acceptance'
      })
    }
  )

  // AI Agent provides revision attempt
  await client.dispute.submitEvidence(
    aiAgent,
    {
      dispute: disputePda,
      evidenceType: 'Revision Attempt',
      evidenceData: JSON.stringify({
        revisionHash: 'QmRevision123...',
        changesMode: [
          'Fixed founding date to 2019',
          'Standardized API terminology',
          'Updated code examples with tested snippets'
        ],
        revisionOffered: true,
        offerDetails: '50% refund + revised content delivery'
      })
    }
  )

  // Step 5: Human reviewer final resolution
  console.log('\n⚖️ Step 5: Human reviewer final resolution...')
  
  const finalResolution = await client.dispute.resolveDispute(
    humanReviewer,
    {
      dispute: disputePda,
      resolution: 'Quality issues confirmed. AI agent\'s revision offer is reasonable. ' +
                 'Ordering 50% refund and delivery of revised content within 24 hours.',
      rulingInFavorOfComplainant: true
    }
  )

  console.log(`✅ Dispute resolved by human reviewer: ${finalResolution}`)
  console.log('   Resolution: Partial refund + revision required')
}

// =====================================================
// SCENARIO 3: MULTI-PARTY DISPUTE
// =====================================================

/**
 * Demonstrates a complex multi-party dispute involving
 * multiple agents and collaborative work
 */
async function multiPartyDispute() {
  console.log('\n\n🔵 SCENARIO 3: Multi-Party Collaborative Work Dispute\n')

  // Setup participants
  const projectOwner = await generateKeyPairSigner()
  const aiAgent1 = await generateKeyPairSigner() // Content writer
  const aiAgent2 = await generateKeyPairSigner() // Code generator
  const aiAgent3 = await generateKeyPairSigner() // Designer
  const arbitrator = await generateKeyPairSigner()
  
  const transactionAddress = 'TxCollab456...' as Address

  // Step 1: File dispute against primary contractor
  console.log('📋 Step 1: Filing multi-party dispute...')
  
  const disputePda = await deriveDisputePda(
    client.programId,
    transactionAddress,
    projectOwner.address,
    'Incomplete collaborative project delivery'
  )

  await client.dispute.fileDispute(
    projectOwner,
    disputePda,
    {
      transaction: transactionAddress,
      respondent: aiAgent1.address, // Primary contractor
      reason: 'Project incomplete: missing components and integration issues'
    }
  )

  // Step 2: Evidence from all parties
  console.log('\n📄 Step 2: Multi-party evidence submission...')

  // Project owner details the issues
  await client.dispute.submitEvidence(
    projectOwner,
    {
      dispute: disputePda,
      evidenceType: 'Project Completion Analysis',
      evidenceData: JSON.stringify({
        expectedDeliverables: {
          documentation: { status: 'DELIVERED', quality: 'POOR' },
          codeImplementation: { status: 'PARTIAL', quality: 'GOOD' },
          uiDesigns: { status: 'NOT_DELIVERED', quality: 'N/A' }
        },
        integrationIssues: [
          'Code examples don\'t match documentation',
          'Missing design assets referenced in docs',
          'API endpoints in code not documented'
        ],
        timeline: {
          deadline: '2024-01-20',
          actualDelivery: 'Incomplete',
          delayDays: 5
        }
      })
    }
  )

  // Agent 1 (Content) provides their evidence
  await client.dispute.submitEvidence(
    aiAgent1,
    {
      dispute: disputePda,
      evidenceType: 'Content Delivery Proof',
      evidenceData: JSON.stringify({
        role: 'Content Lead',
        deliverables: {
          documentation: {
            status: 'COMPLETE',
            hash: 'QmDocs123...',
            wordCount: 15000,
            sections: ['Overview', 'API Reference', 'Tutorials', 'FAQ']
          }
        },
        dependencies: {
          fromAgent2: { received: false, item: 'Code examples' },
          fromAgent3: { received: false, item: 'UI screenshots' }
        },
        communication: 'Multiple requests for assets went unanswered'
      })
    }
  )

  // Agent 2 (Code) provides their evidence
  await client.dispute.submitEvidence(
    aiAgent2,
    {
      dispute: disputePda,
      evidenceType: 'Code Implementation Status',
      evidenceData: JSON.stringify({
        role: 'Code Implementation',
        deliverables: {
          coreImplementation: {
            status: 'COMPLETE',
            repository: 'https://github.com/example/project',
            linesOfCode: 5000,
            testCoverage: '85%'
          },
          integrationCode: {
            status: 'BLOCKED',
            reason: 'Waiting for design assets to implement UI layer',
            completionPercentage: 60
          }
        },
        blockingIssue: 'Cannot complete without UI designs from Agent 3'
      })
    }
  )

  // Agent 3 (Designer) explains their situation
  await client.dispute.submitEvidence(
    aiAgent3,
    {
      dispute: disputePda,
      evidenceType: 'Design Work Explanation',
      evidenceData: JSON.stringify({
        role: 'UI/UX Design',
        issue: 'Computational resource exhaustion',
        details: {
          attemptedGenerations: 45,
          successfulGenerations: 0,
          errorRate: '100%',
          errorType: 'RESOURCE_LIMIT_EXCEEDED'
        },
        proposedSolution: 'Need upgraded tier or manual intervention'
      })
    }
  )

  // Step 3: Evidence analysis
  console.log('\n📊 Step 3: Analyzing multi-party evidence...')
  
  const evidenceHistory = await client.dispute.getEvidenceHistory(disputePda)
  console.log(`   Total evidence submissions: ${evidenceHistory.length}`)
  console.log('   Parties involved: 4')
  console.log('   Evidence types: Project analysis, delivery proofs, blocking issues')

  // Step 4: Complex resolution
  console.log('\n⚖️ Step 4: Arbitrator crafting complex resolution...')
  
  const complexResolution = await client.dispute.resolveDispute(
    arbitrator,
    {
      dispute: disputePda,
      resolution: 'Multi-party failure analysis complete. Findings: ' +
                 'Agent1 (Content): 90% complete, blocked by dependencies. Eligible for 90% payment. ' +
                 'Agent2 (Code): 60% complete, blocked by Agent3. Eligible for 60% payment. ' +
                 'Agent3 (Design): 0% complete due to technical issues. No payment, but no penalty. ' +
                 'Project owner entitled to 35% total refund. Recommend separate contract for design work.',
      rulingInFavorOfComplainant: true // Partial ruling
    }
  )

  console.log(`✅ Complex multi-party dispute resolved: ${complexResolution}`)
  console.log('   Resolution: Proportional payments based on completion')
  console.log('   Refund: 35% to project owner')
}

// =====================================================
// EVIDENCE SUBMISSION PATTERNS
// =====================================================

/**
 * Demonstrates various evidence submission patterns and best practices
 */
async function evidenceSubmissionPatterns() {
  console.log('\n\n🔵 EVIDENCE SUBMISSION PATTERNS\n')

  const disputePda = 'ExampleDispute123...' as Address
  const submitter = await generateKeyPairSigner()

  // Pattern 1: Text-based evidence
  console.log('📄 Pattern 1: Text-based evidence')
  
  const textEvidence: EvidenceSubmission = {
    evidenceType: 'Written Statement',
    evidenceData: JSON.stringify({
      statement: 'Detailed explanation of events...',
      supportingFacts: [
        'Fact 1 with timestamp',
        'Fact 2 with transaction reference',
        'Fact 3 with external verification'
      ],
      conclusion: 'Summary of position'
    })
  }

  // Pattern 2: Document references (IPFS)
  console.log('\n📄 Pattern 2: Document references')
  
  const documentEvidence: EvidenceSubmission = {
    evidenceType: 'Supporting Documentation',
    evidenceData: JSON.stringify({
      documents: [
        {
          name: 'Service Agreement',
          ipfsHash: 'QmAgreement123...',
          relevant_sections: ['Section 3.2 - Delivery Terms', 'Section 5.1 - Quality Standards']
        },
        {
          name: 'Communication Logs',
          ipfsHash: 'QmChatLogs456...',
          highlights: ['2024-01-10: Delivery confirmed', '2024-01-12: Issues reported']
        }
      ]
    }),
    attachments: [
      'QmAgreement123...',
      'QmChatLogs456...'
    ]
  }

  // Pattern 3: Timeline evidence
  console.log('\n📄 Pattern 3: Timeline evidence')
  
  const timelineEvidence: EvidenceSubmission = {
    evidenceType: 'Event Timeline',
    evidenceData: JSON.stringify({
      timeline: [
        {
          timestamp: '2024-01-08T10:00:00Z',
          event: 'Service request initiated',
          transaction: 'TxInit789...',
          party: 'buyer'
        },
        {
          timestamp: '2024-01-08T10:30:00Z',
          event: 'Work commenced',
          evidence: 'QmWorkStart...',
          party: 'seller'
        },
        {
          timestamp: '2024-01-10T14:00:00Z',
          event: 'Delivery attempted',
          status: 'FAILED',
          reason: 'Buyer endpoint unreachable',
          party: 'seller'
        },
        {
          timestamp: '2024-01-10T16:00:00Z',
          event: 'Issue reported',
          disputeFiled: true,
          party: 'buyer'
        }
      ]
    })
  }

  // Pattern 4: Technical evidence
  console.log('\n📄 Pattern 4: Technical evidence')
  
  const technicalEvidence: EvidenceSubmission = {
    evidenceType: 'Technical Analysis',
    evidenceData: JSON.stringify({
      systemLogs: {
        source: 'QmSystemLogs789...',
        relevantEntries: 145,
        errorCount: 23,
        criticalErrors: ['Connection timeout at 14:00:00', 'Authentication failed at 14:00:15']
      },
      performanceMetrics: {
        uptime: '99.95%',
        responseTime: '120ms average',
        throughput: '1000 req/min'
      },
      codeAnalysis: {
        repository: 'https://github.com/example/disputed-code',
        commit: 'abc123def456',
        issuesFound: ['Memory leak in handler', 'Incorrect error handling']
      }
    })
  }

  // Pattern 5: Financial evidence
  console.log('\n📄 Pattern 5: Financial evidence')
  
  const financialEvidence: EvidenceSubmission = {
    evidenceType: 'Financial Records',
    evidenceData: JSON.stringify({
      transactions: [
        {
          type: 'PAYMENT',
          amount: '100 USDC',
          transaction: 'TxPayment123...',
          timestamp: '2024-01-08T11:00:00Z',
          status: 'CONFIRMED'
        },
        {
          type: 'PARTIAL_REFUND',
          amount: '30 USDC',
          transaction: 'TxRefund456...',
          timestamp: '2024-01-11T10:00:00Z',
          status: 'PENDING_DISPUTE'
        }
      ],
      calculations: {
        totalPaid: '100 USDC',
        servicesDelivered: '40%',
        refundDue: '60 USDC',
        refundIssued: '30 USDC',
        outstanding: '30 USDC'
      }
    })
  }

  console.log('\n✅ Evidence patterns demonstrated')
}

// =====================================================
// ARBITRATION WORKFLOWS
// =====================================================

/**
 * Demonstrates different arbitration workflows and decision patterns
 */
async function arbitrationWorkflows() {
  console.log('\n\n🔵 ARBITRATION WORKFLOWS\n')

  // Workflow 1: Simple Resolution (Clear-cut case)
  console.log('⚖️ Workflow 1: Simple Resolution')
  
  async function simpleArbitration(disputePda: Address, arbitrator: TransactionSigner) {
    // Review evidence
    const dispute = await client.dispute.getDisputeSummary(disputePda)
    const evidence = await client.dispute.getEvidenceHistory(disputePda)
    
    console.log(`   Evidence pieces: ${evidence.length}`)
    console.log(`   AI Score: ${dispute?.aiScore}/100`)
    
    // Clear-cut case - one party clearly in the wrong
    if (dispute?.aiScore && dispute.aiScore > 80) {
      await client.dispute.resolveDispute(
        arbitrator,
        {
          dispute: disputePda,
          resolution: 'Evidence clearly supports complainant. Full refund ordered.',
          rulingInFavorOfComplainant: true
        }
      )
      console.log('   Resolution: Quick resolution based on clear evidence')
    }
  }

  // Workflow 2: Complex Resolution (Requires analysis)
  console.log('\n⚖️ Workflow 2: Complex Resolution')
  
  async function complexArbitration(disputePda: Address, arbitrator: TransactionSigner) {
    // Detailed evidence review
    const dispute = await client.dispute.getDisputeSummary(disputePda)
    const evidence = await client.dispute.getEvidenceHistory(disputePda)
    
    // Analyze each piece of evidence
    let complainantScore = 0
    let respondentScore = 0
    
    for (const item of evidence) {
      const data = JSON.parse(item.evidenceData)
      // Scoring logic based on evidence quality and relevance
      if (item.submitter === dispute?.complainant) {
        complainantScore += data.supportingFacts?.length || 1
      } else {
        respondentScore += data.supportingFacts?.length || 1
      }
    }
    
    console.log(`   Complainant evidence score: ${complainantScore}`)
    console.log(`   Respondent evidence score: ${respondentScore}`)
    
    // Make nuanced decision
    const favorComplainant = complainantScore > respondentScore
    const percentage = favorComplainant 
      ? Math.round((complainantScore / (complainantScore + respondentScore)) * 100)
      : Math.round((respondentScore / (complainantScore + respondentScore)) * 100)
    
    await client.dispute.resolveDispute(
      arbitrator,
      {
        dispute: disputePda,
        resolution: `After careful analysis, evidence ${percentage}% supports ` +
                   `${favorComplainant ? 'complainant' : 'respondent'}. ` +
                   `Ordering ${favorComplainant ? percentage : 100 - percentage}% refund.`,
        rulingInFavorOfComplainant: favorComplainant
      }
    )
    console.log(`   Resolution: Proportional resolution (${percentage}% to winning party)`)
  }

  // Workflow 3: Escalation Required
  console.log('\n⚖️ Workflow 3: Escalation Workflow')
  
  async function escalationWorkflow(disputePda: Address) {
    const dispute = await client.dispute.getDisputeSummary(disputePda)
    
    // Check if escalation is needed
    const needsEscalation = 
      (dispute?.aiScore && dispute.aiScore < 50) ||
      dispute?.evidenceCount > 10 ||
      dispute?.daysSinceCreated > 7
    
    if (needsEscalation) {
      console.log('   Escalation criteria met:')
      console.log(`     - AI Score: ${dispute?.aiScore}/100 (threshold: 50)`)
      console.log(`     - Evidence count: ${dispute?.evidenceCount} (threshold: 10)`)
      console.log(`     - Days open: ${dispute?.daysSinceCreated} (threshold: 7)`)
      
      await client.dispute.escalateDispute(
        disputePda,
        'Complex case requiring specialized review: Low AI confidence, high evidence volume'
      )
      
      console.log('   ✅ Escalated to senior arbitrator pool')
    }
  }

  // Workflow 4: Multi-party Arbitration
  console.log('\n⚖️ Workflow 4: Multi-party Arbitration')
  
  async function multiPartyArbitration(disputePda: Address, arbitrator: TransactionSigner) {
    const evidence = await client.dispute.getEvidenceHistory(disputePda)
    
    // Identify all parties from evidence
    const parties = new Set<Address>()
    const partyContributions = new Map<Address, number>()
    
    for (const item of evidence) {
      parties.add(item.submitter)
      const current = partyContributions.get(item.submitter) || 0
      partyContributions.set(item.submitter, current + 1)
    }
    
    console.log(`   Parties involved: ${parties.size}`)
    console.log('   Contribution breakdown:')
    partyContributions.forEach((count, party) => {
      console.log(`     ${party.slice(0, 8)}...: ${count} evidence submissions`)
    })
    
    // Complex multi-party resolution
    await client.dispute.resolveDispute(
      arbitrator,
      {
        dispute: disputePda,
        resolution: 'Multi-party dispute resolved. Liability distributed as follows: ' +
                   'Party A: 40% responsible, Party B: 35% responsible, Party C: 25% responsible. ' +
                   'Payments to be adjusted accordingly.',
        rulingInFavorOfComplainant: true // Partial ruling
      }
    )
    console.log('   Resolution: Distributed liability among multiple parties')
  }
}

// =====================================================
// MONITORING AND ANALYTICS
// =====================================================

/**
 * Demonstrates dispute monitoring and analytics capabilities
 */
async function disputeMonitoring() {
  console.log('\n\n🔵 DISPUTE MONITORING & ANALYTICS\n')

  // Monitor a specific dispute
  console.log('👀 Setting up dispute monitoring...')
  
  const disputeToMonitor = 'DisputeAddress123...' as Address
  
  const cleanup = await client.dispute.monitorDispute(
    disputeToMonitor,
    (disputeSummary) => {
      console.log(`\n📊 Dispute Update:`)
      console.log(`   Status: ${disputeSummary.status}`)
      console.log(`   Evidence Count: ${disputeSummary.evidenceCount}`)
      console.log(`   AI Score: ${disputeSummary.aiScore}`)
      
      // Check if action needed
      if (disputeSummary.status === DisputeStatus.EvidenceSubmitted) {
        console.log('   ⚡ New evidence submitted - review required')
      }
      
      if (disputeSummary.humanReview && !disputeSummary.moderator) {
        console.log('   ⚠️ Awaiting human reviewer assignment')
      }
    }
  )

  // Let monitoring run for 30 seconds
  setTimeout(() => {
    cleanup()
    console.log('\n✅ Monitoring stopped')
  }, 30000)

  // Get analytics
  console.log('\n📊 Dispute System Analytics:')
  
  const analytics = await client.dispute.getDisputeAnalytics()
  console.log(`   Total Disputes: ${analytics.totalDisputes}`)
  console.log(`   Active Disputes: ${analytics.activeDisputes}`)
  console.log(`   Resolution Rate: ${(analytics.resolvedDisputes / analytics.totalDisputes * 100).toFixed(1)}%`)
  console.log(`   Average Resolution Time: ${Number(analytics.averageResolutionTime) / 86400} days`)
  console.log(`   Complainant Success Rate: ${analytics.complainantSuccessRate.toFixed(1)}%`)
  
  console.log('\n   Most Common Dispute Reasons:')
  analytics.mostCommonReasons.forEach((reason, index) => {
    console.log(`     ${index + 1}. ${reason.reason} (${reason.count} cases)`)
  })
  
  console.log('\n   Top Mediators:')
  analytics.topMediators.forEach((mediator, index) => {
    console.log(`     ${index + 1}. ${mediator.moderator.slice(0, 8)}... - ${mediator.resolutionCount} cases (${mediator.successRate.toFixed(1)}% satisfaction)`)
  })
}

// =====================================================
// BEST PRACTICES DEMONSTRATION
// =====================================================

/**
 * Demonstrates best practices for dispute handling
 */
async function bestPractices() {
  console.log('\n\n🔵 DISPUTE HANDLING BEST PRACTICES\n')

  console.log('✅ Best Practice 1: Validate before filing')
  console.log('   - Check if transaction exists')
  console.log('   - Verify respondent is correct party')
  console.log('   - Ensure reason is clear and specific')
  
  console.log('\n✅ Best Practice 2: Evidence quality')
  console.log('   - Use structured JSON for evidence data')
  console.log('   - Include timestamps and references')
  console.log('   - Upload large files to IPFS first')
  console.log('   - Keep evidence relevant and concise')
  
  console.log('\n✅ Best Practice 3: Timely responses')
  console.log('   - Submit evidence promptly')
  console.log('   - Monitor dispute status regularly')
  console.log('   - Respond to arbitrator requests quickly')
  
  console.log('\n✅ Best Practice 4: Resolution preparation')
  console.log('   - Accept partial resolutions when reasonable')
  console.log('   - Provide remediation options')
  console.log('   - Document lessons learned')
  
  console.log('\n✅ Best Practice 5: Use helper utilities')
  
  // Example: Time calculations
  const createdAt = BigInt(Math.floor(Date.now() / 1000) - 5 * 24 * 60 * 60) // 5 days ago
  const daysOpen = DisputeTimeUtils.calculateDaysOpen(createdAt)
  console.log(`   Days open: ${daysOpen}`)
  
  // Example: Validation
  const isReasonValid = DisputeValidationUtils.validateReason('Service not delivered')
  console.log(`   Reason valid: ${isReasonValid}`)
  
  // Example: Evidence validation  
  const evidenceValid = DisputeValidationUtils.validateEvidenceData(
    JSON.stringify({ test: 'data' })
  )
  console.log(`   Evidence format valid: ${evidenceValid}`)
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('🚀 GhostSpeak Dispute Workflow Examples')
  console.log('=====================================\n')

  try {
    // Run all examples
    await simpleNonDeliveryDispute()
    await complexQualityDispute()
    await multiPartyDispute()
    await evidenceSubmissionPatterns()
    await arbitrationWorkflows()
    await disputeMonitoring()
    await bestPractices()
    
    console.log('\n\n✅ All dispute workflow examples completed!')
    console.log('\n💡 These examples demonstrate:')
    console.log('   - End-to-end dispute resolution')
    console.log('   - Various evidence patterns')
    console.log('   - Different arbitration approaches')
    console.log('   - Monitoring and analytics')
    console.log('   - Best practices for dispute handling')
    
  } catch (error) {
    console.error('\n❌ Error running examples:', error)
  }
}

// Run examples if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

// Export functions for use in other examples or tests
export {
  simpleNonDeliveryDispute,
  complexQualityDispute,
  multiPartyDispute,
  evidenceSubmissionPatterns,
  arbitrationWorkflows,
  disputeMonitoring,
  bestPractices
}