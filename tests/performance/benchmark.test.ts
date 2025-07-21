import { describe, it, expect } from 'vitest'
import { GhostSpeakClient } from '../../packages/sdk-typescript/src'
import { createSolanaRpc } from '@solana/rpc'
import { generateKeyPair } from '@solana/keys'
import { address } from '@solana/addresses'

describe('Performance Benchmarks', () => {
  let client: GhostSpeakClient

  beforeAll(async () => {
    const rpc = createSolanaRpc('http://localhost:8899')
    client = new GhostSpeakClient({
      rpc,
      programId: address('11111111111111111111111111111112'),
      cluster: 'localnet'
    })
  })

  describe('Transaction Throughput', () => {
    it('should handle concurrent agent registrations within acceptable time', async () => {
      const startTime = Date.now()
      const concurrentRegistrations = 10

      const registrationPromises = Array.from({ length: concurrentRegistrations }, async (_, i) => {
        const keyPair = await generateKeyPair()
        return client.agent.register({
          owner: keyPair.publicKey,
          metadata: {
            name: `Performance Agent ${i}`,
            description: `Test agent for performance testing ${i}`,
            capabilities: ['testing'],
            pricing: { baseRate: 1_000_000_000n, currency: 'SOL' }
          },
          tier: 'Basic'
        })
      })

      const results = await Promise.all(registrationPromises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(results).toHaveLength(concurrentRegistrations)
      expect(totalTime).toBeLessThan(30000) // Should complete within 30 seconds
      
      const averageTime = totalTime / concurrentRegistrations
      console.log(`Average registration time: ${averageTime}ms`)
      expect(averageTime).toBeLessThan(5000) // Average should be under 5 seconds
    })

    it('should handle batch auction creation efficiently', async () => {
      const startTime = Date.now()
      const batchSize = 20
      const clientKeyPair = await generateKeyPair()

      const auctionCreations = Array.from({ length: batchSize }, (_, i) => 
        client.auction.create({
          creator: clientKeyPair.publicKey,
          serviceType: 'performance_test',
          description: `Performance test auction ${i}`,
          requirements: ['Performance testing capability'],
          minBidAmount: 1_000_000_000n,
          maxBidAmount: 5_000_000_000n,
          duration: 3600
        })
      )

      const results = await Promise.all(auctionCreations)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(results).toHaveLength(batchSize)
      expect(totalTime).toBeLessThan(45000) // Should complete within 45 seconds

      const throughput = (batchSize / totalTime) * 1000 // transactions per second
      console.log(`Auction creation throughput: ${throughput.toFixed(2)} TPS`)
      expect(throughput).toBeGreaterThan(0.4) // At least 0.4 TPS
    })
  })

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage during bulk operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed
      const bulkOperations = 100

      // Perform bulk agent fetches
      const agentAddresses = Array.from({ length: bulkOperations }, () => 
        address('11111111111111111111111111111114')
      )

      const fetchPromises = agentAddresses.map(async (addr) => {
        try {
          return await client.agent.fetch(addr)
        } catch (error) {
          // Expected to fail for non-existent agents
          return null
        }
      })

      await Promise.all(fetchPromises)

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      const memoryPerOperation = memoryIncrease / bulkOperations

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`)
      console.log(`Memory per operation: ${(memoryPerOperation / 1024).toFixed(2)} KB`)

      // Should not use more than 50MB for 100 operations
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
    })
  })

  describe('Network Efficiency', () => {
    it('should minimize RPC calls for complex operations', async () => {
      let rpcCallCount = 0
      
      // Mock RPC to count calls
      const originalSend = client.rpc.sendTransaction
      client.rpc.sendTransaction = (...args) => {
        rpcCallCount++
        return originalSend.apply(client.rpc, args)
      }

      const keyPair = await generateKeyPair()
      
      // Complex operation: register agent + create auction + place bid
      const agentTx = await client.agent.register({
        owner: keyPair.publicKey,
        metadata: {
          name: 'Network Efficiency Agent',
          description: 'Testing network efficiency',
          capabilities: ['networking'],
          pricing: { baseRate: 1_000_000_000n, currency: 'SOL' }
        },
        tier: 'Basic'
      })

      const auctionTx = await client.auction.create({
        creator: keyPair.publicKey,
        serviceType: 'networking',
        description: 'Network efficiency test auction',
        requirements: ['Network optimization'],
        minBidAmount: 2_000_000_000n,
        maxBidAmount: 10_000_000_000n,
        duration: 3600
      })

      await client.auction.placeBid({
        auction: auctionTx.auctionAddress,
        bidder: keyPair.publicKey,
        agent: agentTx.agentAddress,
        bidAmount: 3_000_000_000n,
        proposal: 'Network efficiency optimization proposal',
        timeline: '2 weeks'
      })

      console.log(`Total RPC calls for complex operation: ${rpcCallCount}`)
      
      // Should not require excessive RPC calls
      expect(rpcCallCount).toBeLessThan(10)
    })
  })

  describe('Scalability Limits', () => {
    it('should handle large data structures efficiently', async () => {
      const startTime = Date.now()
      
      // Create escrow with many milestones
      const largeMilestones = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        description: `Milestone ${i + 1} - Performance testing with large data structures`,
        amount: 1_000_000_000n, // 1 SOL each
        dueDate: Math.floor(Date.now() / 1000) + (i + 1) * 604800 // Weekly milestones
      }))

      const keyPair = await generateKeyPair()
      const agentKeyPair = await generateKeyPair()

      const escrowTx = await client.escrow.createWithMilestones({
        payer: keyPair.publicKey,
        recipient: agentKeyPair.publicKey,
        amount: 20_000_000_000n, // 20 SOL total
        terms: 'Large milestone-based project for scalability testing',
        milestones: largeMilestones,
        expiryTimestamp: Math.floor(Date.now() / 1000) + 86400 * 150 // 150 days
      })

      const endTime = Date.now()
      const creationTime = endTime - startTime

      expect(escrowTx).toBeDefined()
      expect(creationTime).toBeLessThan(15000) // Should complete within 15 seconds

      // Verify the escrow was created with all milestones
      const escrowAccount = await client.escrow.fetch(escrowTx.escrowAddress)
      expect(escrowAccount.milestones).toHaveLength(20)

      console.log(`Large escrow creation time: ${creationTime}ms`)
    })

    it('should handle auction with many requirements efficiently', async () => {
      const largeRequirements = Array.from({ length: 50 }, (_, i) => 
        `Requirement ${i + 1}: Detailed technical requirement for scalability testing`
      )

      const startTime = Date.now()
      const keyPair = await generateKeyPair()

      const auctionTx = await client.auction.create({
        creator: keyPair.publicKey,
        serviceType: 'enterprise_development',
        description: 'Large enterprise project with extensive requirements',
        requirements: largeRequirements,
        minBidAmount: 50_000_000_000n, // 50 SOL
        maxBidAmount: 200_000_000_000n, // 200 SOL
        duration: 604800 // 1 week
      })

      const endTime = Date.now()
      const creationTime = endTime - startTime

      expect(auctionTx).toBeDefined()
      expect(creationTime).toBeLessThan(10000) // Should complete within 10 seconds

      const auctionAccount = await client.auction.fetch(auctionTx.auctionAddress)
      expect(auctionAccount.requirements).toHaveLength(50)

      console.log(`Large requirements auction creation time: ${creationTime}ms`)
    })
  })

  describe('Resource Management', () => {
    it('should clean up resources properly after operations', async () => {
      const initialHandles = process._getActiveHandles().length
      const initialRequests = process._getActiveRequests().length

      // Perform multiple operations
      const operations = []
      for (let i = 0; i < 10; i++) {
        const keyPair = await generateKeyPair()
        operations.push(
          client.agent.register({
            owner: keyPair.publicKey,
            metadata: {
              name: `Resource Test Agent ${i}`,
              description: 'Resource management testing',
              capabilities: ['resource_management'],
              pricing: { baseRate: 1_000_000_000n, currency: 'SOL' }
            },
            tier: 'Basic'
          }).catch(() => null) // Ignore errors for this test
        )
      }

      await Promise.all(operations)

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000))

      const finalHandles = process._getActiveHandles().length
      const finalRequests = process._getActiveRequests().length

      console.log(`Handle change: ${finalHandles - initialHandles}`)
      console.log(`Request change: ${finalRequests - initialRequests}`)

      // Should not accumulate too many handles/requests
      expect(finalHandles - initialHandles).toBeLessThan(5)
      expect(finalRequests - initialRequests).toBeLessThan(3)
    })
  })

  describe('Error Recovery Performance', () => {
    it('should recover from errors quickly', async () => {
      const errorRecoveryTimes = []

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now()
        
        try {
          // Attempt operation that will fail
          await client.agent.fetch(address('11111111111111111111111111111114'))
        } catch (error) {
          const recoveryTime = Date.now() - startTime
          errorRecoveryTimes.push(recoveryTime)
          expect(error).toBeDefined()
        }

        // Successful operation after error
        const keyPair = await generateKeyPair()
        const successStart = Date.now()
        
        const result = await client.agent.register({
          owner: keyPair.publicKey,
          metadata: {
            name: `Recovery Agent ${i}`,
            description: 'Error recovery testing',
            capabilities: ['error_recovery'],
            pricing: { baseRate: 1_000_000_000n, currency: 'SOL' }
          },
          tier: 'Basic'
        })
        
        const successTime = Date.now() - successStart
        expect(result).toBeDefined()
        expect(successTime).toBeLessThan(8000) // Should recover quickly
      }

      const averageRecoveryTime = errorRecoveryTimes.reduce((a, b) => a + b, 0) / errorRecoveryTimes.length
      console.log(`Average error recovery time: ${averageRecoveryTime}ms`)
      
      // Error detection should be fast
      expect(averageRecoveryTime).toBeLessThan(5000)
    })
  })
})