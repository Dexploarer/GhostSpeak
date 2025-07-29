import { describe, it, beforeAll, vi } from 'vitest'
import { Connection, PublicKey } from '@solana/web3.js'
import { generateKeyPairSigner } from '@solana/signers'
import { address } from '@solana/addresses'

import { GhostSpeakClient } from '../src/index.js'
import { AgentStatus, EscrowStatus, ServiceCategory } from '../src/generated/index.js'
import type { Address, TransactionSigner } from '@solana/kit'

interface TransactionBenchmark {
  operation: string
  iterations: number
  successCount: number
  failureCount: number
  totalTime: number
  averageTime: number
  tps: number // Transactions per second
  p95Time: number
  p99Time: number
}

class TransactionBenchmarkRunner {
  results: TransactionBenchmark[] = []
  connection: Connection
  client: GhostSpeakClient
  
  constructor() {
    // Mock connection for benchmarking
    this.connection = {
      rpcEndpoint: 'http://localhost:8899',
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 1000
      }),
      sendTransaction: vi.fn().mockResolvedValue('mockSignature'),
      confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
      getAccountInfo: vi.fn().mockResolvedValue(null),
      getProgramAccounts: vi.fn().mockResolvedValue([]),
      getSignatureStatuses: vi.fn().mockResolvedValue({ value: [{ confirmationStatus: 'confirmed' }] })
    } as unknown as Connection
    
    this.client = new GhostSpeakClient({
      rpc: 'http://localhost:8899',
      cluster: 'devnet'
    })
    
    // Override connection
    Object.defineProperty(this.client, 'connection', {
      value: this.connection,
      writable: true
    })
  }
  
  async benchmark(
    name: string,
    operation: () => Promise<any>,
    iterations: number = 100
  ): Promise<TransactionBenchmark> {
    console.log(`\nBenchmarking: ${name}`)
    console.log(`Iterations: ${iterations}`)
    
    const times: number[] = []
    let successCount = 0
    let failureCount = 0
    
    // Warmup
    for (let i = 0; i < 5; i++) {
      try {
        await operation()
      } catch {
        // Ignore warmup errors
      }
    }
    
    // Actual benchmark
    const startTotal = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      try {
        await operation()
        successCount++
      } catch (error) {
        failureCount++
      }
      const end = performance.now()
      times.push(end - start)
      
      if (i % 10 === 0 && i > 0) {
        process.stdout.write(`\r  Progress: ${i}/${iterations} (${successCount} success, ${failureCount} failed)`)
      }
    }
    
    const endTotal = performance.now()
    const totalTime = endTotal - startTotal
    
    // Calculate percentiles
    times.sort((a, b) => a - b)
    const p95Index = Math.floor(times.length * 0.95)
    const p99Index = Math.floor(times.length * 0.99)
    
    const result: TransactionBenchmark = {
      operation: name,
      iterations,
      successCount,
      failureCount,
      totalTime,
      averageTime: totalTime / iterations,
      tps: (iterations / totalTime) * 1000,
      p95Time: times[p95Index] || 0,
      p99Time: times[p99Index] || 0
    }
    
    this.results.push(result)
    this.printResult(result)
    
    return result
  }
  
  printResult(result: TransactionBenchmark): void {
    console.log(`\n  ✓ Completed ${result.iterations} iterations`)
    console.log(`  Success: ${result.successCount} (${((result.successCount / result.iterations) * 100).toFixed(1)}%)`)
    console.log(`  Failed: ${result.failureCount}`)
    console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`)
    console.log(`  Average: ${result.averageTime.toFixed(3)}ms`)
    console.log(`  TPS: ${result.tps.toFixed(1)}`)
    console.log(`  P95: ${result.p95Time.toFixed(3)}ms`)
    console.log(`  P99: ${result.p99Time.toFixed(3)}ms`)
  }
  
  printSummary(): void {
    console.log('\n📊 TRANSACTION BENCHMARK SUMMARY')
    console.log('='.repeat(100))
    console.log(
      `${'Operation'.padEnd(35)} | ${'Success'.padEnd(8)} | ${'TPS'.padEnd(8)} | ${'Avg (ms)'.padEnd(10)} | ${'P95 (ms)'.padEnd(10)} | ${'P99 (ms)'.padEnd(10)}`
    )
    console.log('-'.repeat(100))
    
    this.results.forEach(r => {
      const successRate = ((r.successCount / r.iterations) * 100).toFixed(1) + '%'
      console.log(
        `${r.operation.padEnd(35)} | ${successRate.padEnd(8)} | ${r.tps.toFixed(1).padEnd(8)} | ${
          r.averageTime.toFixed(2).padEnd(10)
        } | ${r.p95Time.toFixed(2).padEnd(10)} | ${r.p99Time.toFixed(2).padEnd(10)}`
      )
    })
  }
}

describe('Transaction Performance Benchmarks', () => {
  const runner = new TransactionBenchmarkRunner()
  let signer: TransactionSigner
  let agentPda: Address
  let escrowPda: Address
  
  beforeAll(async () => {
    signer = await generateKeyPairSigner()
    agentPda = address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    escrowPda = address('ESCRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
  })
  
  it('should benchmark agent registration', async () => {
    await runner.benchmark('Agent Registration', async () => {
      return runner.client.agents.registerAgent(signer, agentPda, {
        name: 'Test Agent',
        metadata: { 
          description: 'Benchmark test agent',
          avatar: 'https://example.com/avatar.png'
        },
        fee: 1000000n,
        capabilities: ['task_execution', 'data_analysis'],
        categories: [ServiceCategory.Development, ServiceCategory.DataAnalysis]
      })
    })
  })
  
  it('should benchmark agent updates', async () => {
    await runner.benchmark('Agent Update', async () => {
      return runner.client.agents.updateAgent(signer, agentPda, {
        name: 'Updated Agent',
        fee: 2000000n,
        status: AgentStatus.Active
      })
    })
  })
  
  it('should benchmark escrow creation', async () => {
    const provider = address('PROVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    
    await runner.benchmark('Escrow Creation', async () => {
      return runner.client.escrow.createEscrow(signer, escrowPda, {
        amount: 10000000n,
        provider,
        duration: 3600n,
        milestones: []
      })
    }, 200)
  })
  
  it('should benchmark escrow operations', async () => {
    // Complete escrow
    await runner.benchmark('Escrow Completion', async () => {
      return runner.client.escrow.completeEscrow(signer, escrowPda)
    })
    
    // Cancel escrow
    await runner.benchmark('Escrow Cancellation', async () => {
      return runner.client.escrow.cancelEscrow(signer, escrowPda)
    })
    
    // Dispute escrow
    await runner.benchmark('Escrow Dispute', async () => {
      return runner.client.escrow.disputeEscrow(signer, escrowPda, 'Performance not satisfactory')
    })
  })
  
  it('should benchmark work order operations', async () => {
    const jobId = 1n
    const jobPda = address('JOBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    
    // Submit work
    await runner.benchmark('Work Order Submission', async () => {
      return runner.client.workOrders.submitWorkOrder(signer, jobPda, escrowPda, jobId, {
        workDetails: 'Completed task successfully',
        deliverables: ['https://example.com/result.zip'],
        proofOfWork: 'QmHashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      })
    })
    
    // Verify work
    await runner.benchmark('Work Order Verification', async () => {
      return runner.client.workOrders.verifyWorkOrder(signer, jobPda, true, 'Excellent work')
    })
  })
  
  it('should benchmark marketplace operations', async () => {
    const listingPda = address('LISTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    
    // Create listing
    await runner.benchmark('Service Listing Creation', async () => {
      return runner.client.marketplace.createServiceListing(signer, listingPda, {
        serviceId: 1n,
        name: 'AI Development Service',
        description: 'Professional AI development',
        price: 50000000n,
        duration: 604800n,
        category: ServiceCategory.Development,
        tags: ['ai', 'development', 'consulting'],
        requirements: ['Project scope', 'Technical requirements']
      })
    }, 50)
    
    // Search listings
    await runner.benchmark('Service Search', async () => {
      return runner.client.marketplace.searchServices({
        category: ServiceCategory.Development,
        minPrice: 0n,
        maxPrice: 100000000n,
        tags: ['ai']
      })
    }, 200)
  })
  
  it('should benchmark batch operations', async () => {
    // Batch agent registration
    await runner.benchmark('Batch Agent Registration (5)', async () => {
      const promises = Array(5).fill(0).map(async (_, i) => {
        const agentSigner = await generateKeyPairSigner()
        const agentPda = address(`AGNT${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
        return runner.client.agents.registerAgent(agentSigner, agentPda, {
          name: `Batch Agent ${i}`,
          metadata: {},
          fee: 1000000n,
          capabilities: ['task_execution'],
          categories: [ServiceCategory.Development]
        })
      })
      
      return Promise.all(promises)
    }, 20)
    
    // Batch escrow creation
    await runner.benchmark('Batch Escrow Creation (10)', async () => {
      const promises = Array(10).fill(0).map(async (_, i) => {
        const escrowSigner = await generateKeyPairSigner()
        const escrowPda = address(`ESCR${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
        return runner.client.escrow.createEscrow(escrowSigner, escrowPda, {
          amount: 5000000n,
          provider: address('PROVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
          duration: 3600n,
          milestones: []
        })
      })
      
      return Promise.all(promises)
    }, 10)
  })
  
  it('should benchmark concurrent operations', async () => {
    // Simulate concurrent users
    await runner.benchmark('Concurrent Mixed Operations (20)', async () => {
      const operations = [
        // 5 agent registrations
        ...Array(5).fill(0).map(() => async () => {
          const s = await generateKeyPairSigner()
          return runner.client.agents.registerAgent(s, agentPda, {
            name: 'Concurrent Agent',
            metadata: {},
            fee: 1000000n,
            capabilities: ['task_execution'],
            categories: [ServiceCategory.Development]
          })
        }),
        // 5 escrow creations
        ...Array(5).fill(0).map(() => async () => {
          const s = await generateKeyPairSigner()
          return runner.client.escrow.createEscrow(s, escrowPda, {
            amount: 5000000n,
            provider: address('PROVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
            duration: 3600n,
            milestones: []
          })
        }),
        // 5 work submissions
        ...Array(5).fill(0).map(() => async () => {
          const s = await generateKeyPairSigner()
          return runner.client.workOrders.submitWorkOrder(s, address('JOBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'), escrowPda, 1n, {
            workDetails: 'Concurrent work',
            deliverables: [],
            proofOfWork: ''
          })
        }),
        // 5 searches
        ...Array(5).fill(0).map(() => async () => {
          return runner.client.marketplace.searchServices({
            category: ServiceCategory.Development
          })
        })
      ]
      
      // Execute all operations concurrently
      return Promise.all(operations.map(op => op()))
    }, 10)
  })
  
  it('should print performance analysis', () => {
    runner.printSummary()
    
    console.log('\n📈 PERFORMANCE ANALYSIS')
    console.log('='.repeat(100))
    
    // Calculate average TPS by category
    const agentOps = runner.results.filter(r => r.operation.includes('Agent'))
    const escrowOps = runner.results.filter(r => r.operation.includes('Escrow'))
    const batchOps = runner.results.filter(r => r.operation.includes('Batch'))
    
    const avgAgentTPS = agentOps.reduce((sum, r) => sum + r.tps, 0) / agentOps.length
    const avgEscrowTPS = escrowOps.reduce((sum, r) => sum + r.tps, 0) / escrowOps.length
    const avgBatchTPS = batchOps.reduce((sum, r) => sum + r.tps, 0) / batchOps.length
    
    console.log(`Average Agent Operations: ${avgAgentTPS.toFixed(1)} TPS`)
    console.log(`Average Escrow Operations: ${avgEscrowTPS.toFixed(1)} TPS`)
    console.log(`Average Batch Operations: ${avgBatchTPS.toFixed(1)} TPS`)
    
    // Performance recommendations
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS')
    console.log('-'.repeat(100))
    
    const slowOps = runner.results.filter(r => r.tps < 10)
    if (slowOps.length > 0) {
      console.log(`⚠️  ${slowOps.length} operations below 10 TPS:`)
      slowOps.forEach(op => {
        console.log(`   - ${op.operation}: ${op.tps.toFixed(1)} TPS`)
      })
    }
    
    const highLatencyOps = runner.results.filter(r => r.p99Time > 1000)
    if (highLatencyOps.length > 0) {
      console.log(`\n⚠️  ${highLatencyOps.length} operations with P99 > 1s:`)
      highLatencyOps.forEach(op => {
        console.log(`   - ${op.operation}: ${op.p99Time.toFixed(0)}ms`)
      })
    }
    
    // Scalability insights
    console.log('\n📊 SCALABILITY INSIGHTS')
    console.log('-'.repeat(100))
    
    const totalTPS = runner.results.reduce((sum, r) => sum + r.tps, 0)
    console.log(`Total Combined TPS: ${totalTPS.toFixed(1)}`)
    console.log(`Estimated Daily Transactions: ${(totalTPS * 86400).toFixed(0)}`)
    
    if (totalTPS < 100) {
      console.log('\n⚠️  Current performance may not meet production requirements.')
      console.log('   Consider implementing:')
      console.log('   - Transaction batching')
      console.log('   - Connection pooling')
      console.log('   - Caching strategies')
      console.log('   - Load balancing')
    }
    
    console.log('\n✅ Transaction benchmarks completed!')
  })
})