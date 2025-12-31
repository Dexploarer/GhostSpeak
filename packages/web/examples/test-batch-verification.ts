/**
 * Batch Verification Test Utility
 *
 * Test the bulk verification endpoint with various scenarios
 */

interface BatchVerificationResult {
  address: string
  ghostScore: number
  tier: string
  verified: boolean
  error?: string
}

interface BatchVerificationResponse {
  results: BatchVerificationResult[]
  totalCost: number
  metadata: {
    requestedCount: number
    uniqueCount: number
    successCount: number
    failedCount: number
    responseTime: string
    avgTimePerAgent: string
  }
}

/**
 * Test batch verification with various agent addresses
 */
export async function testBatchVerification(apiKey: string, agents: string[]) {
  const startTime = Date.now()

  console.log(`\n🧪 Testing batch verification with ${agents.length} agents...\n`)

  try {
    const response = await fetch('https://ghostspeak.ai/api/v1/verify/batch', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agents }),
    })

    const data: BatchVerificationResponse = await response.json()
    const duration = Date.now() - startTime

    if (!response.ok) {
      console.error('❌ Batch verification failed:', data)
      return
    }

    // Print summary
    console.log('✅ Batch verification completed!\n')
    console.log('📊 Summary:')
    console.log(`   Total agents: ${data.metadata.requestedCount}`)
    console.log(`   Unique agents: ${data.metadata.uniqueCount}`)
    console.log(`   Verified: ${data.metadata.successCount}`)
    console.log(`   Failed: ${data.metadata.failedCount}`)
    console.log(`   Total cost: $${(data.totalCost / 100).toFixed(2)}`)
    console.log(`   Response time: ${data.metadata.responseTime}`)
    console.log(`   Avg per agent: ${data.metadata.avgTimePerAgent}`)
    console.log(`   Client duration: ${duration}ms\n`)

    // Print tier distribution
    const tierCounts: Record<string, number> = {}
    data.results.forEach((result) => {
      if (result.verified) {
        tierCounts[result.tier] = (tierCounts[result.tier] || 0) + 1
      }
    })

    console.log('🏆 Tier Distribution:')
    Object.entries(tierCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([tier, count]) => {
        console.log(`   ${tier}: ${count} agents`)
      })

    // Print any errors
    const errors = data.results.filter((r) => !r.verified)
    if (errors.length > 0) {
      console.log('\n❌ Errors:')
      errors.forEach((result) => {
        console.log(`   ${result.address}: ${result.error}`)
      })
    }

    // Performance analysis
    console.log('\n⚡ Performance:')
    const avgTime = parseFloat(data.metadata.avgTimePerAgent)
    if (avgTime < 50) {
      console.log('   ✅ Excellent (<50ms per agent)')
    } else if (avgTime < 100) {
      console.log('   ✅ Good (<100ms per agent)')
    } else if (avgTime < 200) {
      console.log('   ⚠️  Acceptable (<200ms per agent)')
    } else {
      console.log('   ❌ Slow (>200ms per agent)')
    }

    return data
  } catch (error) {
    console.error('❌ Request failed:', error)
    throw error
  }
}

/**
 * Generate test agent addresses
 */
export function generateTestAgents(count: number): string[] {
  const agents: string[] = []
  for (let i = 0; i < count; i++) {
    // Generate fake Solana addresses for testing
    const randomHex = Math.random().toString(36).substring(2, 15)
    agents.push(`TestAgent${i}_${randomHex}`)
  }
  return agents
}

/**
 * Test various batch sizes
 */
export async function testBatchSizes(apiKey: string) {
  const testSizes = [1, 10, 25, 50, 100]

  console.log('🧪 Testing various batch sizes...\n')

  for (const size of testSizes) {
    const agents = generateTestAgents(size)
    await testBatchVerification(apiKey, agents)
    console.log('\n' + '='.repeat(60) + '\n')
    // Wait 1 second between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

/**
 * Test with duplicate addresses
 */
export async function testDuplicates(apiKey: string) {
  console.log('🧪 Testing deduplication...\n')

  const agents = [
    'AgentA',
    'AgentB',
    'AgentA', // duplicate
    'AgentC',
    'AgentB', // duplicate
    'AgentA', // duplicate
  ]

  const result = await testBatchVerification(apiKey, agents)

  console.log('\n📊 Deduplication Test:')
  console.log(`   Requested: ${result?.metadata.requestedCount} agents`)
  console.log(`   Unique: ${result?.metadata.uniqueCount} agents`)
  console.log(
    `   Duplicates removed: ${(result?.metadata.requestedCount || 0) - (result?.metadata.uniqueCount || 0)}`
  )
}

/**
 * Compare batch vs individual verification
 */
export async function compareBatchVsIndividual(apiKey: string, agents: string[]) {
  console.log('🧪 Comparing batch vs individual verification...\n')

  // Test batch
  const batchStart = Date.now()
  const batchResult = await testBatchVerification(apiKey, agents)
  const batchDuration = Date.now() - batchStart

  // Test individual (simulate)
  const individualStart = Date.now()
  const individualCost = agents.length * 1.0 // 1¢ per agent
  const estimatedIndividualTime = agents.length * 100 // ~100ms per request + network overhead
  const individualDuration = Date.now() - individualStart

  console.log('\n💰 Cost Comparison:')
  console.log(`   Batch: $${(batchResult?.totalCost || 0) / 100} (0.5¢ per agent)`)
  console.log(`   Individual: $${individualCost / 100} (1¢ per agent)`)
  console.log(
    `   Savings: $${((individualCost - (batchResult?.totalCost || 0)) / 100).toFixed(2)} (${((1 - (batchResult?.totalCost || 0) / individualCost) * 100).toFixed(1)}%)`
  )

  console.log('\n⏱️  Time Comparison:')
  console.log(`   Batch: ${batchDuration}ms`)
  console.log(
    `   Individual (estimated): ${estimatedIndividualTime}ms (sequential) or ${Math.ceil(estimatedIndividualTime / 10)}ms (10 parallel)`
  )
}

/**
 * Main test runner
 */
export async function runAllTests() {
  const apiKey = process.env.GHOSTSPEAK_API_KEY

  if (!apiKey) {
    console.error('❌ GHOSTSPEAK_API_KEY environment variable not set')
    process.exit(1)
  }

  console.log('🚀 GhostSpeak Batch Verification Test Suite\n')
  console.log('='.repeat(60) + '\n')

  // Test 1: Small batch
  console.log('TEST 1: Small Batch (10 agents)')
  await testBatchVerification(apiKey, generateTestAgents(10))
  console.log('\n' + '='.repeat(60) + '\n')

  // Test 2: Medium batch
  console.log('TEST 2: Medium Batch (50 agents)')
  await testBatchVerification(apiKey, generateTestAgents(50))
  console.log('\n' + '='.repeat(60) + '\n')

  // Test 3: Large batch
  console.log('TEST 3: Large Batch (100 agents - max)')
  await testBatchVerification(apiKey, generateTestAgents(100))
  console.log('\n' + '='.repeat(60) + '\n')

  // Test 4: Deduplication
  console.log('TEST 4: Deduplication')
  await testDuplicates(apiKey)
  console.log('\n' + '='.repeat(60) + '\n')

  // Test 5: Cost comparison
  console.log('TEST 5: Batch vs Individual Comparison')
  await compareBatchVsIndividual(apiKey, generateTestAgents(25))
  console.log('\n' + '='.repeat(60) + '\n')

  console.log('✅ All tests completed!')
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}
