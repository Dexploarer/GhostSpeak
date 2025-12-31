/**
 * Reputation Tags Example
 *
 * Demonstrates how to:
 * - Calculate tags for an agent
 * - Filter tags by category
 * - Sort tags by confidence
 * - Apply tag decay
 * - Merge tags
 * - Use tags for agent search
 *
 * Run with: bun run examples/reputation-tags.ts
 */

import { GhostSpeakClient } from '../src/index.js'
import { TagCategory } from '../src/types/reputation-tags.js'
import type { ReputationMetrics, TagScore } from '../src/types/reputation-tags.js'

async function runReputationTagsExample() {
  console.log('🏷️  GhostSpeak Reputation Tags Example\n')

  // ============================================================================
  // 1. Initialize Client
  // ============================================================================
  console.log('1️⃣  Initializing GhostSpeak client...')

  const client = new GhostSpeakClient({
    cluster: 'devnet'
  })

  console.log('   ✅ Client initialized\n')

  // ============================================================================
  // 2. Create Sample Metrics
  // ============================================================================
  console.log('2️⃣  Creating sample agent metrics...')

  // Simulate a high-performing agent
  const highPerformerMetrics: ReputationMetrics = {
    // Payment metrics
    successfulPayments: 5000n,
    failedPayments: 50n,
    totalResponseTime: 120_000_000n, // 120 seconds total
    responseTimeCount: 5000n,        // ~24ms average

    // Quality metrics
    totalDisputes: 10,
    disputesResolved: 9,
    totalRating: 24000,  // 4.8 average (5 stars * 5000 ratings)
    totalRatingsCount: 5000,

    // Time metrics
    createdAt: Math.floor(Date.now() / 1000) - (400 * 24 * 60 * 60), // 400 days ago
    updatedAt: Math.floor(Date.now() / 1000),

    // Derived metrics (calculated automatically)
    avgResponseTime: 24,     // 24ms
    successRate: 9900,       // 99% in basis points
    avgRating: 9600,         // 96% (4.8/5.0)
    disputeResolutionRate: 9000 // 90%
  }

  console.log('   High-Performer Agent:')
  console.log('     Successful payments:', Number(highPerformerMetrics.successfulPayments))
  console.log('     Success rate:', (highPerformerMetrics.successRate / 100).toFixed(1), '%')
  console.log('     Avg response time:', highPerformerMetrics.avgResponseTime, 'ms')
  console.log('     Avg rating:', (highPerformerMetrics.avgRating / 20).toFixed(2), '/5.0')
  console.log('   ✅ Sample metrics created\n')

  // ============================================================================
  // 3. Calculate Tags
  // ============================================================================
  console.log('3️⃣  Calculating tags for agent...')

  const tags = await client.reputation.calculateTagsForAgent(highPerformerMetrics)

  console.log(`   Assigned ${tags.length} tags:`)
  tags.forEach((tag, i) => {
    const confidence = (tag.confidence / 100).toFixed(1)
    const level = client.reputation.getConfidenceLevel(tag.confidence)
    console.log(`     ${i + 1}. ${tag.tagName}`)
    console.log(`        Confidence: ${confidence}% (${level})`)
    console.log(`        Evidence: ${tag.evidenceCount} data points`)
  })
  console.log('   ✅ Tags calculated\n')

  // ============================================================================
  // 4. Filter Tags by Category
  // ============================================================================
  console.log('4️⃣  Filtering tags by category...')

  const behaviorTags = client.reputation.getTagsByCategory(tags, TagCategory.Behavior)
  console.log(`   Behavior tags (${behaviorTags.length}):`)
  behaviorTags.forEach(tag => {
    console.log(`     - ${tag.tagName} (${tag.confidence / 100}%)`)
  })

  const skillTags = client.reputation.getTagsByCategory(tags, TagCategory.Skill)
  console.log(`   Skill tags (${skillTags.length}):`)
  skillTags.forEach(tag => {
    console.log(`     - ${tag.tagName} (${tag.confidence / 100}%)`)
  })

  const complianceTags = client.reputation.getTagsByCategory(tags, TagCategory.Compliance)
  console.log(`   Compliance tags (${complianceTags.length}):`)
  complianceTags.forEach(tag => {
    console.log(`     - ${tag.tagName} (${tag.confidence / 100}%)`)
  })
  console.log('   ✅ Tags filtered by category\n')

  // ============================================================================
  // 5. Get Top Tags
  // ============================================================================
  console.log('5️⃣  Getting top 5 tags by confidence...')

  const topTags = client.reputation.getTopTags(tags, 5)
  console.log('   Top 5 tags:')
  topTags.forEach((tag, i) => {
    console.log(`     ${i + 1}. ${tag.tagName} - ${tag.confidence / 100}%`)
  })
  console.log('   ✅ Top tags retrieved\n')

  // ============================================================================
  // 6. Filter by Confidence
  // ============================================================================
  console.log('6️⃣  Filtering high-confidence tags (>80%)...')

  const highConfidenceTags = client.reputation.filterTags(tags, {
    minConfidence: 8000 // 80%
  })

  console.log(`   High-confidence tags (${highConfidenceTags.length}):`)
  highConfidenceTags.forEach(tag => {
    const level = client.reputation.getConfidenceLevel(tag.confidence)
    console.log(`     - ${tag.tagName}: ${level}`)
  })
  console.log('   ✅ High-confidence tags filtered\n')

  // ============================================================================
  // 7. Check for Specific Tags
  // ============================================================================
  console.log('7️⃣  Checking for specific tags...')

  const checks = [
    'fast-responder',
    'top-rated',
    'high-volume',
    'dispute-free',
    'perfect-record'
  ]

  checks.forEach(tagName => {
    const hasTag = client.reputation.hasTag(tags, tagName)
    const confidence = client.reputation.getTagConfidence(tags, tagName)

    if (hasTag && confidence !== undefined) {
      console.log(`   ✅ ${tagName}: ${confidence / 100}%`)
    } else {
      console.log(`   ❌ ${tagName}: Not assigned`)
    }
  })
  console.log()

  // ============================================================================
  // 8. Categorize Tags
  // ============================================================================
  console.log('8️⃣  Categorizing all tags...')

  const categorized = client.reputation.categorizeTags(tags)

  console.log('   Tag Summary:')
  console.log(`     Total tags: ${categorized.allTags.length}`)
  console.log(`     Skill tags: ${categorized.skillTags.length}`)
  console.log(`     Behavior tags: ${categorized.behaviorTags.length}`)
  console.log(`     Compliance tags: ${categorized.complianceTags.length}`)
  console.log(`     Last updated: ${new Date(categorized.lastUpdated * 1000).toISOString()}`)
  console.log('   ✅ Tags categorized\n')

  // ============================================================================
  // 9. Sort Tags
  // ============================================================================
  console.log('9️⃣  Sorting tags...')

  // By confidence
  const byConfidence = client.reputation.sortTagsByConfidence(tags)
  console.log('   Top 3 by confidence:')
  byConfidence.slice(0, 3).forEach((tag, i) => {
    console.log(`     ${i + 1}. ${tag.tagName}: ${tag.confidence / 100}%`)
  })

  // By evidence
  const byEvidence = client.reputation.sortTagsByEvidence(tags)
  console.log('   Top 3 by evidence:')
  byEvidence.slice(0, 3).forEach((tag, i) => {
    console.log(`     ${i + 1}. ${tag.tagName}: ${tag.evidenceCount} points`)
  })

  // By recency
  const byRecent = client.reputation.sortTagsByRecent(tags)
  console.log('   Most recent tag:')
  console.log(`     ${byRecent[0].tagName} (${new Date(byRecent[0].lastUpdated * 1000).toISOString()})`)
  console.log('   ✅ Tags sorted\n')

  // ============================================================================
  // 10. Apply Tag Decay
  // ============================================================================
  console.log('🔟 Applying tag decay...')

  // Simulate old tags (30 days ago)
  const oldTags: TagScore[] = tags.map(tag => ({
    ...tag,
    lastUpdated: tag.lastUpdated - (30 * 24 * 60 * 60) // 30 days ago
  }))

  const decayedTags = client.reputation.applyTagDecay(oldTags)

  console.log(`   Tags before decay: ${oldTags.length}`)
  console.log(`   Tags after decay: ${decayedTags.length}`)
  console.log('   Confidence changes:')

  oldTags.slice(0, 3).forEach((oldTag, i) => {
    const newTag = decayedTags.find(t => t.tagName === oldTag.tagName)
    if (newTag) {
      const reduction = (oldTag.confidence - newTag.confidence) / 100
      console.log(`     ${oldTag.tagName}: -${reduction.toFixed(1)}%`)
    }
  })
  console.log('   ✅ Tag decay applied\n')

  // ============================================================================
  // 11. Merge Tags
  // ============================================================================
  console.log('1️⃣1️⃣  Merging tag sets...')

  // Simulate new tags from recent activity
  const newActivityTags: TagScore[] = [
    {
      tagName: 'fast-responder',
      confidence: 9800, // Higher confidence than before
      evidenceCount: 6000,
      lastUpdated: Math.floor(Date.now() / 1000)
    },
    {
      tagName: 'mega-volume', // New tag
      confidence: 8500,
      evidenceCount: 100000,
      lastUpdated: Math.floor(Date.now() / 1000)
    }
  ]

  const mergedTags = client.reputation.mergeTags(tags, newActivityTags)

  console.log(`   Original tags: ${tags.length}`)
  console.log(`   New tags: ${newActivityTags.length}`)
  console.log(`   Merged tags: ${mergedTags.length}`)

  // Show updated tags
  const fastResponder = mergedTags.find(t => t.tagName === 'fast-responder')
  if (fastResponder) {
    console.log(`   fast-responder updated: ${fastResponder.confidence / 100}%`)
  }

  const megaVolume = mergedTags.find(t => t.tagName === 'mega-volume')
  if (megaVolume) {
    console.log(`   mega-volume added: ${megaVolume.confidence / 100}%`)
  }
  console.log('   ✅ Tags merged\n')

  // ============================================================================
  // 12. Tag Validation
  // ============================================================================
  console.log('1️⃣2️⃣  Validating tags...')

  const validTagName = client.reputation.validateTagName('my-custom-tag')
  console.log('   Valid tag name ("my-custom-tag"):', validTagName)

  const invalidTagName = client.reputation.validateTagName('a'.repeat(100))
  console.log('   Valid tag name (100 chars):', invalidTagName)

  const validConfidence = client.reputation.validateConfidence(8500)
  console.log('   Valid confidence (8500):', validConfidence)

  const invalidConfidence = client.reputation.validateConfidence(15000)
  console.log('   Valid confidence (15000):', invalidConfidence)
  console.log('   ✅ Validation complete\n')

  // ============================================================================
  // 13. Create Low-Performer Example
  // ============================================================================
  console.log('1️⃣3️⃣  Comparing with low-performer...')

  const lowPerformerMetrics: ReputationMetrics = {
    successfulPayments: 50n,
    failedPayments: 20n,
    totalResponseTime: 1_000_000_000n, // 1000 seconds total
    responseTimeCount: 50n,             // ~20 seconds average

    totalDisputes: 10,
    disputesResolved: 2,
    totalRating: 1500,  // 3.0 average
    totalRatingsCount: 50,

    createdAt: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // 30 days ago
    updatedAt: Math.floor(Date.now() / 1000),

    avgResponseTime: 20000,  // 20 seconds
    successRate: 7000,       // 70%
    avgRating: 6000,         // 60% (3.0/5.0)
    disputeResolutionRate: 2000 // 20%
  }

  const lowPerformerTags = await client.reputation.calculateTagsForAgent(lowPerformerMetrics)

  console.log('   High-performer tags:', tags.length)
  console.log('   Low-performer tags:', lowPerformerTags.length)
  console.log('   Difference:', tags.length - lowPerformerTags.length, 'tags')

  // Tags only high-performer has
  const uniqueToHighPerformer = tags.filter(
    tag => !lowPerformerTags.some(t => t.tagName === tag.tagName)
  )

  console.log(`   Tags unique to high-performer (${uniqueToHighPerformer.length}):`)
  uniqueToHighPerformer.slice(0, 5).forEach(tag => {
    console.log(`     - ${tag.tagName}`)
  })
  console.log('   ✅ Comparison complete\n')

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('✅ Reputation Tags Example Complete!\n')
  console.log('Summary:')
  console.log('- Calculated tags from metrics')
  console.log('- Filtered by category and confidence')
  console.log('- Sorted by confidence, evidence, and recency')
  console.log('- Applied tag decay')
  console.log('- Merged tag sets')
  console.log('- Validated tag data')
  console.log('- Compared high vs low performers')
  console.log('\nNext steps:')
  console.log('- Use tags for agent search and filtering')
  console.log('- Display tags in UI with confidence levels')
  console.log('- Set up periodic tag recalculation')
  console.log('- Integrate with multi-source reputation')
}

// Run example
runReputationTagsExample().catch(console.error)
