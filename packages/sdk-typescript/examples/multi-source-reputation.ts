/**
 * Multi-Source Reputation Example
 *
 * Demonstrates how to:
 * - Aggregate reputation from multiple sources
 * - Configure source weights
 * - Detect conflicts between sources
 * - View source attribution
 * - Add custom webhook sources
 *
 * Run with: bun run examples/multi-source-reputation.ts
 */

import { GhostSpeakClient } from '../src/index.js'
import type { Address } from '@solana/addresses'
import type { PayAIReputationRecordInput } from '../src/modules/reputation/ReputationModule.js'

async function runMultiSourceReputationExample() {
  console.log('🔀 GhostSpeak Multi-Source Reputation Example\n')

  // ============================================================================
  // 1. Initialize Client
  // ============================================================================
  console.log('1️⃣  Initializing GhostSpeak client...')

  const client = new GhostSpeakClient({
    cluster: 'devnet'
  })

  console.log('   ✅ Client initialized\n')

  // ============================================================================
  // 2. Simulate PayAI Reputation Data
  // ============================================================================
  console.log('2️⃣  Processing PayAI reputation data...')

  const agentAddress = '5VKz...' as Address // Example agent address

  // Simulate PayAI webhook payment event
  const payaiPayment: PayAIReputationRecordInput = {
    agentAddress: agentAddress,
    paymentSignature: '4hXTCkRzt...ABC123',
    amount: 1_500_000n, // 1.5 USDC
    success: true,
    responseTimeMs: 380, // Fast response
    payerAddress: 'payer123...',
    timestamp: new Date(),
    network: 'solana'
  }

  console.log('   PayAI Payment Event:')
  console.log('     Amount: $', (Number(payaiPayment.amount) / 1_000_000).toFixed(2))
  console.log('     Success:', payaiPayment.success)
  console.log('     Response time:', payaiPayment.responseTimeMs, 'ms')
  console.log('     Network:', payaiPayment.network)

  // Convert to JobPerformance and calculate reputation
  // (In real app, you'd get current reputation from on-chain first)
  const currentReputation = {
    agent: agentAddress,
    overallScore: 7500,
    totalJobsCompleted: 100,
    totalJobsFailed: 5,
    avgResponseTime: 450,
    disputesAgainst: 2,
    disputesResolved: 2,
    lastUpdated: Math.floor(Date.now() / 1000),
    categoryReputations: [],
    badges: [],
    performanceHistory: [],
    factors: {
      completionWeight: 25,
      qualityWeight: 25,
      timelinessWeight: 20,
      satisfactionWeight: 20,
      disputeWeight: 10,
    }
  }

  const reputationResult = client.reputation.recordPayAIPayment(
    payaiPayment,
    currentReputation
  )

  console.log('\n   PayAI Reputation Update:')
  console.log('     Previous score:', currentReputation.overallScore)
  console.log('     Job score:', reputationResult.jobScore)
  console.log('     New score:', reputationResult.overallScore)
  console.log('     Tier:', reputationResult.tier)
  console.log('   ✅ PayAI data processed\n')

  // ============================================================================
  // 3. Simulate GitHub Reputation Data (Future Feature)
  // ============================================================================
  console.log('3️⃣  Simulating GitHub reputation data...')

  const githubStats = {
    source: 'github',
    agentAddress: agentAddress,
    metrics: {
      commitsLastMonth: 45,
      pullRequestsMerged: 12,
      issuesResolved: 8,
      codeReviewsGiven: 20,
      maintainerRating: 4.7,
      communityStars: 234
    },
    calculatedScore: 7800, // GitHub-specific score calculation
    weight: 20 // 20% weight
  }

  console.log('   GitHub Metrics:')
  console.log('     Commits (30d):', githubStats.metrics.commitsLastMonth)
  console.log('     PRs merged:', githubStats.metrics.pullRequestsMerged)
  console.log('     Issues resolved:', githubStats.metrics.issuesResolved)
  console.log('     Maintainer rating:', githubStats.metrics.maintainerRating)
  console.log('     Score:', githubStats.calculatedScore)
  console.log('   ✅ GitHub data simulated\n')

  // ============================================================================
  // 4. Simulate Custom Source Data
  // ============================================================================
  console.log('4️⃣  Processing custom reputation source...')

  const customSource = {
    source: 'internal-metrics',
    agentAddress: agentAddress,
    metrics: {
      customerSatisfactionScore: 9.2, // Out of 10
      averageResolutionTime: 3.5, // Hours
      escalationRate: 0.03, // 3%
      repeatClientRate: 0.65, // 65%
    },
    calculatedScore: 8200,
    weight: 10 // 10% weight
  }

  console.log('   Custom Metrics (Internal):')
  console.log('     Customer satisfaction:', customSource.metrics.customerSatisfactionScore, '/10')
  console.log('     Avg resolution time:', customSource.metrics.averageResolutionTime, 'hours')
  console.log('     Escalation rate:', (customSource.metrics.escalationRate * 100).toFixed(1), '%')
  console.log('     Repeat client rate:', (customSource.metrics.repeatClientRate * 100).toFixed(0), '%')
  console.log('     Score:', customSource.calculatedScore)
  console.log('   ✅ Custom source processed\n')

  // ============================================================================
  // 5. Aggregate Reputation from All Sources
  // ============================================================================
  console.log('5️⃣  Aggregating reputation from all sources...')

  const sources = [
    {
      name: 'payai',
      score: reputationResult.overallScore,
      weight: 70,
      lastUpdated: Math.floor(Date.now() / 1000)
    },
    {
      name: 'github',
      score: githubStats.calculatedScore,
      weight: githubStats.weight,
      lastUpdated: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    },
    {
      name: 'internal-metrics',
      score: customSource.calculatedScore,
      weight: customSource.weight,
      lastUpdated: Math.floor(Date.now() / 1000) - 7200 // 2 hours ago
    }
  ]

  // Calculate weighted average
  const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0)
  const weightedSum = sources.reduce((sum, s) => sum + (s.score * s.weight), 0)
  const aggregatedScore = Math.round(weightedSum / totalWeight)

  console.log('   Source Breakdown:')
  sources.forEach(source => {
    const contribution = Math.round((source.score * source.weight) / totalWeight)
    console.log(`     ${source.name}:`)
    console.log(`       Score: ${source.score}`)
    console.log(`       Weight: ${source.weight}%`)
    console.log(`       Contribution: ${contribution} points`)
  })

  console.log(`\n   Final Aggregated Score: ${aggregatedScore}`)
  console.log('   ✅ Reputation aggregated\n')

  // ============================================================================
  // 6. Detect Conflicts Between Sources
  // ============================================================================
  console.log('6️⃣  Detecting conflicts between sources...')

  const CONFLICT_THRESHOLD = 2000 // 20% difference

  const conflicts: Array<{
    source1: string
    source2: string
    difference: number
  }> = []

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const diff = Math.abs(sources[i].score - sources[j].score)

      if (diff > CONFLICT_THRESHOLD) {
        conflicts.push({
          source1: sources[i].name,
          source2: sources[j].name,
          difference: diff
        })
      }
    }
  }

  if (conflicts.length > 0) {
    console.log(`   ⚠️  ${conflicts.length} conflict(s) detected:`)
    conflicts.forEach(conflict => {
      console.log(`     ${conflict.source1} vs ${conflict.source2}: ${conflict.difference} points difference`)
    })
  } else {
    console.log('   ✅ No conflicts detected (all sources agree within 20%)')
  }
  console.log()

  // ============================================================================
  // 7. Adjust Source Weights
  // ============================================================================
  console.log('7️⃣  Adjusting source weights...')

  console.log('   Original weights:')
  sources.forEach(s => console.log(`     ${s.name}: ${s.weight}%`))

  // Increase PayAI weight due to high reliability
  sources[0].weight = 75 // PayAI
  sources[1].weight = 15 // GitHub
  sources[2].weight = 10 // Custom

  console.log('\n   Adjusted weights (PayAI increased):')
  sources.forEach(s => console.log(`     ${s.name}: ${s.weight}%`))

  // Recalculate with new weights
  const newTotalWeight = sources.reduce((sum, s) => sum + s.weight, 0)
  const newWeightedSum = sources.reduce((sum, s) => sum + (s.score * s.weight), 0)
  const newAggregatedScore = Math.round(newWeightedSum / newTotalWeight)

  console.log(`\n   Previous aggregated score: ${aggregatedScore}`)
  console.log(`   New aggregated score: ${newAggregatedScore}`)
  console.log(`   Change: ${newAggregatedScore - aggregatedScore} points`)
  console.log('   ✅ Weights adjusted\n')

  // ============================================================================
  // 8. Source Attribution for Transparency
  // ============================================================================
  console.log('8️⃣  Generating source attribution...')

  const attribution = {
    overallScore: newAggregatedScore,
    sources: sources.map(source => ({
      name: source.name,
      score: source.score,
      weight: source.weight,
      contribution: Math.round((source.score * source.weight) / newTotalWeight),
      percentageOfTotal: ((source.weight / newTotalWeight) * 100).toFixed(1),
      lastUpdated: source.lastUpdated
    })),
    hasConflicts: conflicts.length > 0,
    conflicts: conflicts,
    totalWeight: newTotalWeight,
    calculatedAt: Math.floor(Date.now() / 1000)
  }

  console.log('   Attribution Data:')
  console.log('   {')
  console.log(`     "overallScore": ${attribution.overallScore},`)
  console.log(`     "sources": [`)
  attribution.sources.forEach((source, i) => {
    console.log(`       {`)
    console.log(`         "name": "${source.name}",`)
    console.log(`         "score": ${source.score},`)
    console.log(`         "contribution": ${source.contribution} points,`)
    console.log(`         "weight": ${source.percentageOfTotal}%`)
    console.log(`       }${i < attribution.sources.length - 1 ? ',' : ''}`)
  })
  console.log(`     ],`)
  console.log(`     "hasConflicts": ${attribution.hasConflicts}`)
  console.log('   }')
  console.log('   ✅ Attribution generated\n')

  // ============================================================================
  // 9. Custom Webhook Integration Example
  // ============================================================================
  console.log('9️⃣  Setting up custom webhook integration...')

  console.log('   Webhook Configuration:')
  console.log('   {')
  console.log('     "webhookUrl": "https://ghostspeak.io/webhooks/reputation",')
  console.log('     "secret": "your-webhook-secret",')
  console.log('     "source": "internal-metrics",')
  console.log('     "weight": 10')
  console.log('   }')

  console.log('\n   Example webhook payload:')
  console.log('   {')
  console.log(`     "source": "internal-metrics",`)
  console.log(`     "apiKey": "your-api-key",`)
  console.log(`     "agentAddress": "${agentAddress}",`)
  console.log(`     "score": 8200,`)
  console.log('     "metrics": { ... },')
  console.log('     "evidence": [ ... ],')
  console.log('     "timestamp": ' + Date.now())
  console.log('   }')
  console.log('   ✅ Webhook configuration shown\n')

  // ============================================================================
  // 10. Monitor Source Reliability
  // ============================================================================
  console.log('🔟 Monitoring source reliability...')

  const sourceReliability = sources.map(source => {
    // Simulate reliability metrics
    const uptime = 95 + Math.random() * 5 // 95-100%
    const dataFreshness = Math.floor(Date.now() / 1000) - source.lastUpdated
    const freshnessScore = Math.max(0, 100 - (dataFreshness / 3600) * 10) // Decay over hours

    return {
      name: source.name,
      uptime: uptime.toFixed(1),
      lastUpdate: `${Math.floor(dataFreshness / 60)} minutes ago`,
      freshnessScore: Math.round(freshnessScore),
      recommendedWeight: source.weight,
      status: uptime > 98 && freshnessScore > 80 ? 'healthy' : 'degraded'
    }
  })

  console.log('   Source Reliability:')
  sourceReliability.forEach(rel => {
    console.log(`     ${rel.name}:`)
    console.log(`       Status: ${rel.status}`)
    console.log(`       Uptime: ${rel.uptime}%`)
    console.log(`       Last update: ${rel.lastUpdate}`)
    console.log(`       Freshness: ${rel.freshnessScore}%`)
  })
  console.log('   ✅ Source reliability monitored\n')

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('✅ Multi-Source Reputation Example Complete!\n')
  console.log('Summary:')
  console.log('- Processed PayAI payment data')
  console.log('- Simulated GitHub and custom sources')
  console.log('- Aggregated reputation with weighted scoring')
  console.log('- Detected conflicts between sources')
  console.log('- Adjusted source weights dynamically')
  console.log('- Generated transparent source attribution')
  console.log('- Showed webhook integration pattern')
  console.log('- Monitored source reliability')
  console.log('\nKey Metrics:')
  console.log(`- Final Score: ${newAggregatedScore}/10,000 (${(newAggregatedScore / 100).toFixed(1)}%)`)
  console.log(`- Sources: ${sources.length}`)
  console.log(`- Conflicts: ${conflicts.length}`)
  console.log(`- Primary Source: PayAI (${sources[0].weight}% weight)`)
  console.log('\nNext steps:')
  console.log('- Set up PayAI webhook for automatic updates')
  console.log('- Add custom reputation sources')
  console.log('- Monitor and adjust weights based on reliability')
  console.log('- Display source attribution in UI for transparency')
}

// Run example
runMultiSourceReputationExample().catch(console.error)
