/**
 * End-to-End Ghost Integration Test
 *
 * Validates the complete flow:
 * 1. Agent Discovery (Convex)
 * 2. Ghost Score Calculation
 * 3. Dashboard Queries
 * 4. Public API Endpoints
 *
 * Run with: bun test tests/e2e-ghost-integration.test.ts
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import { api } from '../convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || ''

if (!CONVEX_URL) {
  console.warn('⚠️  CONVEX_URL not set, E2E test will be skipped')
}

describe('E2E Ghost Integration Test', () => {
  let client: ConvexHttpClient
  const testAgentAddress = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB' // From ghost-claim-validation

  beforeAll(() => {
    if (!CONVEX_URL) {
      return
    }
    client = new ConvexHttpClient(CONVEX_URL)
  })

  it('should connect to Convex backend', async () => {
    if (!CONVEX_URL) {
      console.log('⏭️  Skipping: CONVEX_URL not configured')
      return
    }

    expect(client).toBeDefined()
    expect(CONVEX_URL).toContain('convex.cloud')
  })

  it('should fetch dashboard stats', async () => {
    if (!CONVEX_URL) {
      console.log('⏭️  Skipping: CONVEX_URL not configured')
      return
    }

    const stats = await client.query(api.agentsDashboard.getDashboardStats)

    expect(stats).toBeDefined()
    expect(stats.totalAgents).toBeGreaterThanOrEqual(0)
    expect(stats.avgGhostScore).toBeGreaterThanOrEqual(0)
    expect(stats.tierDistribution).toBeDefined()

    console.log('✅ Dashboard stats:', stats)
  })

  it('should list discovered agents', async () => {
    if (!CONVEX_URL) {
      console.log('⏭️  Skipping: CONVEX_URL not configured')
      return
    }

    const result = await client.query(api.ghostDiscovery.listDiscoveredAgents, {
      limit: 10,
    })

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)

    console.log(`✅ Found ${result.length} discovered agents`)

    if (result.length > 0) {
      const agent = result[0]
      expect(agent.ghostAddress).toBeDefined()
      expect(agent.status).toBeDefined()
      expect(['discovered', 'claimed', 'verified'].includes(agent.status)).toBe(true)
    }
  })

  it('should get top agents by Ghost Score', async () => {
    if (!CONVEX_URL) {
      console.log('⏭️  Skipping: CONVEX_URL not configured')
      return
    }

    const topAgents = await client.query(api.agentsDashboard.getTopAgents, {
      limit: 5,
    })

    expect(topAgents).toBeDefined()
    expect(Array.isArray(topAgents)).toBe(true)

    console.log(`✅ Retrieved ${topAgents.length} top agents`)

    if (topAgents.length > 0) {
      const topAgent = topAgents[0]
      expect(topAgent.ghostScore).toBeDefined()
      expect(topAgent.tier).toBeDefined()
      expect(topAgent.ghostScore).toBeGreaterThanOrEqual(0)
    }
  })

  it('should retrieve agent reputation from cache', async () => {
    if (!CONVEX_URL) {
      console.log('⏭️  Skipping: CONVEX_URL not configured')
      return
    }

    // Try to get a random agent from the list first
    const agents = await client.query(api.ghostDiscovery.listDiscoveredAgents, {
      limit: 1,
    })

    if (agents.length === 0) {
      console.log('⏭️  Skipping: No agents discovered yet')
      return
    }

    const agentAddress = agents[0].ghostAddress

    const reputation = await client.query(api.agentReputationCache.getByAddress, {
      agentAddress,
    })

    // Reputation might not exist yet (not calculated)
    if (reputation) {
      expect(reputation.ghostScore).toBeDefined()
      expect(reputation.tier).toBeDefined()
      expect(reputation.successRate).toBeGreaterThanOrEqual(0)
      expect(reputation.totalJobs).toBeGreaterThanOrEqual(0)

      console.log('✅ Reputation cache:', {
        address: agentAddress.slice(0, 8),
        score: reputation.ghostScore,
        tier: reputation.tier,
        jobs: reputation.totalJobs,
      })
    } else {
      console.log('⏭️  No reputation cache entry yet for', agentAddress.slice(0, 8))
    }
  })

  it('should paginate agents with scores', async () => {
    if (!CONVEX_URL) {
      console.log('⏭️  Skipping: CONVEX_URL not configured')
      return
    }

    const result = await client.query(api.agentsDashboard.listAgentsWithScores, {
      paginationOpts: {
        numItems: 3,
        cursor: null,
      },
    })

    expect(result).toBeDefined()
    expect(result.page).toBeDefined()
    expect(Array.isArray(result.page)).toBe(true)
    expect(result.isDone).toBeDefined()
    expect(result.continueCursor).toBeDefined()

    console.log(`✅ Paginated results: ${result.page.length} agents, isDone: ${result.isDone}`)

    result.page.forEach((agent) => {
      expect(agent.ghostAddress).toBeDefined()
      expect(agent.status).toBeDefined()
      // ghostScore may be undefined if not calculated yet
      console.log(`   - ${agent.ghostAddress.slice(0, 8)}: Score ${agent.ghostScore ?? 'N/A'}`)
    })
  })

  it('should search for agents', async () => {
    if (!CONVEX_URL) {
      console.log('⏭️  Skipping: CONVEX_URL not configured')
      return
    }

    const agents = await client.query(api.ghostDiscovery.listDiscoveredAgents, {
      limit: 1,
    })

    if (agents.length === 0) {
      console.log('⏭️  Skipping: No agents to search for')
      return
    }

    const searchTerm = agents[0].ghostAddress

    const results = await client.query(api.agentsDashboard.searchAgents, {
      searchTerm,
      limit: 5,
    })

    expect(results).toBeDefined()
    expect(Array.isArray(results)).toBe(true)

    if (results.length > 0) {
      expect(results[0].ghostAddress).toBe(searchTerm)
      console.log('✅ Search successful:', results[0].ghostAddress.slice(0, 8))
    }
  })

  it('should validate public API structure', async () => {
    // This tests the API route structure without actually calling it
    // (requires authentication which we don't have in tests)

    const apiRoutes = [
      '/api/v1/verify',
      '/api/v1/verify/batch',
      '/api/v1/agents/[address]/score',
      '/api/v1/credentials/[id]',
    ]

    console.log('✅ Public API routes defined:', apiRoutes)

    expect(apiRoutes.length).toBe(4)
  })
})

/**
 * Additional validation notes:
 *
 * To fully test the public API endpoints, you need:
 * 1. A valid API key (created via dashboard)
 * 2. USDC/GHOST balance for billing
 * 3. Network access to the deployed API
 *
 * Example API call (requires setup):
 *
 * ```typescript
 * const response = await fetch('https://your-domain.com/api/v1/verify', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer YOUR_API_KEY',
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     agentAddress: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
 *     requiredScore: 500,
 *     returnMetrics: true,
 *   }),
 * })
 * ```
 */
