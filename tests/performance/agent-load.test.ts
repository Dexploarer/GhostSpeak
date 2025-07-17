import { describe, it, expect, beforeAll } from 'vitest'
import { GhostSpeakClient, type KeyPairSigner } from '@ghostspeak/sdk'
import { generateKeyPairSigner } from '@solana/signers'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/rpc'
import { performance } from 'perf_hooks'

// Performance tests for agent operations at scale
describe('Agent Performance Tests', () => {
  let client: GhostSpeakClient
  let wallets: KeyPairSigner[] = []
  const AGENT_COUNT = 100 // Number of agents to test with
  const BATCH_SIZE = 10 // Concurrent operations

  beforeAll(async () => {
    // Initialize client
    const rpc = createSolanaRpc('https://api.devnet.solana.com')
    const rpcSubscriptions = createSolanaRpcSubscriptions('wss://api.devnet.solana.com')

    client = new GhostSpeakClient({
      rpc: rpc as any,
      rpcSubscriptions: rpcSubscriptions as any,
      rpcEndpoint: 'https://api.devnet.solana.com',
      programId: 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR' as any,
      commitment: 'confirmed',
      cluster: 'devnet'
    })

    // Pre-generate wallets
    console.log(`Generating ${AGENT_COUNT} test wallets...`)
    for (let i = 0; i < AGENT_COUNT; i++) {
      wallets.push(await generateKeyPairSigner())
    }
  })

  describe('Bulk Agent Registration', () => {
    it('should handle concurrent agent registrations', async () => {
      const startTime = performance.now()
      const results = []

      // Process in batches
      for (let i = 0; i < AGENT_COUNT; i += BATCH_SIZE) {
        const batch = wallets.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map((wallet, idx) => 
          client.agent.register(wallet, {
            agentId: `perf-agent-${i + idx}-${Date.now()}`,
            agentType: 1,
            metadataUri: `https://test.com/agent-${i + idx}.json`
          }).catch(err => ({ error: err.message }))
        )

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
      }

      const endTime = performance.now()
      const duration = endTime - startTime
      const successCount = results.filter(r => typeof r === 'string').length
      const errorCount = results.filter(r => r.error).length

      console.log(`
Performance Metrics:
- Total agents: ${AGENT_COUNT}
- Successful: ${successCount}
- Failed: ${errorCount}
- Total time: ${(duration / 1000).toFixed(2)}s
- Average per agent: ${(duration / AGENT_COUNT).toFixed(2)}ms
- Throughput: ${(AGENT_COUNT / (duration / 1000)).toFixed(2)} agents/sec
      `)

      expect(successCount).toBeGreaterThan(0)
      expect(duration / AGENT_COUNT).toBeLessThan(5000) // < 5s per agent
    }, 300000) // 5 minute timeout
  })

  describe('Query Performance', () => {
    it('should efficiently query large agent lists', async () => {
      const queries = [
        { name: 'List all agents', fn: () => client.agent.list({}) },
        { name: 'Search by type', fn: () => client.agent.list({ agentType: 1 }) },
        { name: 'Paginated query', fn: () => client.agent.list({ limit: 20, offset: 0 }) }
      ]

      for (const query of queries) {
        const startTime = performance.now()
        const result = await query.fn()
        const endTime = performance.now()
        const duration = endTime - startTime

        console.log(`${query.name}: ${duration.toFixed(2)}ms (${result.length} results)`)
        expect(duration).toBeLessThan(2000) // < 2 seconds
      }
    })

    it('should handle concurrent reads efficiently', async () => {
      const concurrentReads = 50
      const startTime = performance.now()

      const promises = Array(concurrentReads).fill(0).map(() => 
        client.agent.list({ limit: 10 })
      )

      const results = await Promise.all(promises)
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`
Concurrent Read Performance:
- Concurrent requests: ${concurrentReads}
- Total time: ${(duration / 1000).toFixed(2)}s
- Average per request: ${(duration / concurrentReads).toFixed(2)}ms
- Throughput: ${(concurrentReads / (duration / 1000)).toFixed(2)} req/sec
      `)

      expect(results.every(r => Array.isArray(r))).toBe(true)
      expect(duration / concurrentReads).toBeLessThan(500) // < 500ms per request
    })
  })

  describe('Memory Usage', () => {
    it('should maintain stable memory with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await client.agent.list({ limit: 100 })
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryGrowth = finalMemory - initialMemory

      console.log(`
Memory Usage:
- Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB
- Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB
- Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB
      `)

      // Memory growth should be reasonable (< 100MB)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024)
    })
  })

  describe('Stress Testing', () => {
    it('should handle rapid-fire operations', async () => {
      const operationCount = 1000
      const startTime = performance.now()
      let successCount = 0
      let errorCount = 0

      // Use a single wallet for rapid operations
      const testWallet = wallets[0]

      for (let i = 0; i < operationCount; i++) {
        try {
          // Alternate between different operations
          if (i % 3 === 0) {
            await client.agent.getByWallet(testWallet.address)
          } else if (i % 3 === 1) {
            await client.agent.list({ limit: 1 })
          } else {
            await client.marketplace.list({ limit: 1 })
          }
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`
Stress Test Results:
- Total operations: ${operationCount}
- Successful: ${successCount}
- Failed: ${errorCount}
- Duration: ${(duration / 1000).toFixed(2)}s
- Operations/sec: ${(operationCount / (duration / 1000)).toFixed(2)}
- Success rate: ${((successCount / operationCount) * 100).toFixed(2)}%
      `)

      expect(successCount / operationCount).toBeGreaterThan(0.95) // > 95% success rate
    })
  })

  describe('Connection Pool Performance', () => {
    it('should efficiently reuse connections', async () => {
      const metrics = {
        connectionReuse: 0,
        newConnections: 0
      }

      // Monitor connection usage (mock tracking)
      const operations = Array(50).fill(0).map(async (_, i) => {
        const start = performance.now()
        await client.agent.list({ limit: 1 })
        const duration = performance.now() - start

        // Fast operations indicate connection reuse
        if (duration < 100) {
          metrics.connectionReuse++
        } else {
          metrics.newConnections++
        }
      })

      await Promise.all(operations)

      console.log(`
Connection Pool Metrics:
- Reused connections: ${metrics.connectionReuse}
- New connections: ${metrics.newConnections}
- Reuse rate: ${((metrics.connectionReuse / 50) * 100).toFixed(2)}%
      `)

      expect(metrics.connectionReuse).toBeGreaterThan(metrics.newConnections)
    })
  })
})