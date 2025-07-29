import { Connection, PublicKey } from '@solana/web3.js'
import { generateKeyPairSigner } from '@solana/signers'
import { address } from '@solana/addresses'
import { GhostSpeakClient } from '../src/index.js'
import { ServiceCategory } from '../src/generated/index.js'
import type { Address, TransactionSigner } from '@solana/kit'

interface LoadTestConfig {
  rpcEndpoint: string
  durationSeconds: number
  concurrentUsers: number
  transactionsPerUser: number
  rampUpSeconds: number
}

interface LoadTestMetrics {
  totalTransactions: number
  successfulTransactions: number
  failedTransactions: number
  totalDuration: number
  averageLatency: number
  p95Latency: number
  p99Latency: number
  maxLatency: number
  minLatency: number
  tps: number
  peakTps: number
  errorRate: number
  memoryUsage: {
    start: NodeJS.MemoryUsage
    peak: NodeJS.MemoryUsage
    end: NodeJS.MemoryUsage
  }
}

class LoadTester {
  private config: LoadTestConfig
  private client: GhostSpeakClient
  private connection: Connection
  private metrics: LoadTestMetrics
  private latencies: number[] = []
  private tpsHistory: number[] = []
  private startTime: number = 0
  private peakMemory: NodeJS.MemoryUsage
  
  constructor(config: LoadTestConfig) {
    this.config = config
    this.connection = new Connection(config.rpcEndpoint, 'confirmed')
    this.client = new GhostSpeakClient({
      rpc: config.rpcEndpoint,
      cluster: 'devnet'
    })
    
    this.metrics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalDuration: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      tps: 0,
      peakTps: 0,
      errorRate: 0,
      memoryUsage: {
        start: process.memoryUsage(),
        peak: process.memoryUsage(),
        end: process.memoryUsage()
      }
    }
    
    this.peakMemory = process.memoryUsage()
  }
  
  async run(): Promise<LoadTestMetrics> {
    console.log('🚀 Starting Load Test')
    console.log('='.repeat(80))
    console.log(`RPC Endpoint: ${this.config.rpcEndpoint}`)
    console.log(`Duration: ${this.config.durationSeconds}s`)
    console.log(`Concurrent Users: ${this.config.concurrentUsers}`)
    console.log(`Transactions per User: ${this.config.transactionsPerUser}`)
    console.log(`Ramp-up Time: ${this.config.rampUpSeconds}s`)
    console.log('='.repeat(80))
    
    this.metrics.memoryUsage.start = process.memoryUsage()
    this.startTime = Date.now()
    
    // Start memory monitoring
    const memoryMonitor = setInterval(() => {
      const current = process.memoryUsage()
      if (current.heapUsed > this.peakMemory.heapUsed) {
        this.peakMemory = current
      }
    }, 100)
    
    // Start TPS monitoring
    const tpsMonitor = setInterval(() => {
      const elapsed = (Date.now() - this.startTime) / 1000
      const currentTps = this.metrics.successfulTransactions / elapsed
      this.tpsHistory.push(currentTps)
      if (currentTps > this.metrics.peakTps) {
        this.metrics.peakTps = currentTps
      }
    }, 1000)
    
    try {
      // Ramp up users gradually
      const userPromises: Promise<void>[] = []
      const usersPerSecond = this.config.concurrentUsers / this.config.rampUpSeconds
      
      for (let i = 0; i < this.config.concurrentUsers; i++) {
        const delay = (i / usersPerSecond) * 1000
        const userPromise = this.delayedStart(delay, () => this.runUser(i))
        userPromises.push(userPromise)
      }
      
      // Wait for all users to complete or timeout
      const timeout = (this.config.durationSeconds + this.config.rampUpSeconds) * 1000
      await Promise.race([
        Promise.all(userPromises),
        new Promise(resolve => setTimeout(resolve, timeout))
      ])
      
    } finally {
      clearInterval(memoryMonitor)
      clearInterval(tpsMonitor)
      
      this.metrics.memoryUsage.peak = this.peakMemory
      this.metrics.memoryUsage.end = process.memoryUsage()
      this.metrics.totalDuration = (Date.now() - this.startTime) / 1000
      
      this.calculateFinalMetrics()
      this.printResults()
    }
    
    return this.metrics
  }
  
  private async delayedStart(delayMs: number, fn: () => Promise<void>): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    return fn()
  }
  
  private async runUser(userId: number): Promise<void> {
    console.log(`👤 User ${userId} started`)
    
    const signer = await generateKeyPairSigner()
    const operations = this.getRandomOperations(this.config.transactionsPerUser)
    
    for (const operation of operations) {
      const start = Date.now()
      
      try {
        await this.executeOperation(operation, signer)
        this.metrics.successfulTransactions++
      } catch (error) {
        this.metrics.failedTransactions++
        if (userId === 0) { // Only log errors for first user to avoid spam
          console.error(`❌ Operation failed: ${operation.type}`, error)
        }
      }
      
      const latency = Date.now() - start
      this.latencies.push(latency)
      this.metrics.totalTransactions++
      
      if (latency < this.metrics.minLatency) {
        this.metrics.minLatency = latency
      }
      if (latency > this.metrics.maxLatency) {
        this.metrics.maxLatency = latency
      }
      
      // Progress update every 10 transactions
      if (this.metrics.totalTransactions % 10 === 0) {
        this.printProgress()
      }
      
      // Check if duration exceeded
      if ((Date.now() - this.startTime) / 1000 > this.config.durationSeconds) {
        break
      }
    }
  }
  
  private getRandomOperations(count: number): Array<{ type: string; weight: number }> {
    const operationTypes = [
      { type: 'register_agent', weight: 10 },
      { type: 'create_escrow', weight: 20 },
      { type: 'submit_work', weight: 15 },
      { type: 'search_services', weight: 30 },
      { type: 'update_agent', weight: 10 },
      { type: 'create_listing', weight: 15 }
    ]
    
    const operations: Array<{ type: string; weight: number }> = []
    
    for (let i = 0; i < count; i++) {
      const random = Math.random() * 100
      let cumWeight = 0
      
      for (const op of operationTypes) {
        cumWeight += op.weight
        if (random < cumWeight) {
          operations.push(op)
          break
        }
      }
    }
    
    return operations
  }
  
  private async executeOperation(
    operation: { type: string },
    signer: TransactionSigner
  ): Promise<void> {
    const randomId = Math.floor(Math.random() * 1000000)
    
    switch (operation.type) {
      case 'register_agent': {
        const agentPda = address(`AGNT${randomId}xxxxxxxxxxxxxxxxxxxxxxxxxxx`)
        await this.client.agents.registerAgent(signer, agentPda, {
          name: `Load Test Agent ${randomId}`,
          metadata: { description: 'Load test agent' },
          fee: 1000000n,
          capabilities: ['task_execution'],
          categories: [ServiceCategory.Development]
        })
        break
      }
      
      case 'create_escrow': {
        const escrowPda = address(`ESCR${randomId}xxxxxxxxxxxxxxxxxxxxxxxxxxx`)
        const provider = address('PROVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
        await this.client.escrow.createEscrow(signer, escrowPda, {
          amount: 5000000n,
          provider,
          duration: 3600n,
          milestones: []
        })
        break
      }
      
      case 'submit_work': {
        const jobPda = address(`JOB${randomId}xxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
        const escrowPda = address('ESCRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
        await this.client.workOrders.submitWorkOrder(signer, jobPda, escrowPda, BigInt(randomId), {
          workDetails: 'Load test work submission',
          deliverables: [],
          proofOfWork: ''
        })
        break
      }
      
      case 'search_services': {
        await this.client.marketplace.searchServices({
          category: ServiceCategory.Development,
          limit: 10
        })
        break
      }
      
      case 'update_agent': {
        const agentPda = address('AGNTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
        await this.client.agents.updateAgent(signer, agentPda, {
          fee: 2000000n
        })
        break
      }
      
      case 'create_listing': {
        const listingPda = address(`LIST${randomId}xxxxxxxxxxxxxxxxxxxxxxxxxxx`)
        await this.client.marketplace.createServiceListing(signer, listingPda, {
          serviceId: BigInt(randomId),
          name: `Load Test Service ${randomId}`,
          description: 'Load test service',
          price: 10000000n,
          duration: 86400n,
          category: ServiceCategory.Development,
          tags: ['load-test'],
          requirements: []
        })
        break
      }
    }
  }
  
  private printProgress(): void {
    const elapsed = (Date.now() - this.startTime) / 1000
    const tps = this.metrics.successfulTransactions / elapsed
    const errorRate = (this.metrics.failedTransactions / this.metrics.totalTransactions) * 100
    
    process.stdout.write(
      `\r⚡ Progress: ${this.metrics.totalTransactions} txns | ` +
      `${tps.toFixed(1)} TPS | ` +
      `${errorRate.toFixed(1)}% errors | ` +
      `${elapsed.toFixed(0)}s elapsed`
    )
  }
  
  private calculateFinalMetrics(): void {
    // Calculate latency percentiles
    this.latencies.sort((a, b) => a - b)
    const p95Index = Math.floor(this.latencies.length * 0.95)
    const p99Index = Math.floor(this.latencies.length * 0.99)
    
    this.metrics.averageLatency = this.latencies.reduce((sum, l) => sum + l, 0) / this.latencies.length
    this.metrics.p95Latency = this.latencies[p95Index] || 0
    this.metrics.p99Latency = this.latencies[p99Index] || 0
    this.metrics.tps = this.metrics.successfulTransactions / this.metrics.totalDuration
    this.metrics.errorRate = (this.metrics.failedTransactions / this.metrics.totalTransactions) * 100
  }
  
  private printResults(): void {
    console.log('\n\n📊 LOAD TEST RESULTS')
    console.log('='.repeat(80))
    
    console.log('\n📈 Transaction Metrics:')
    console.log(`  Total Transactions: ${this.metrics.totalTransactions}`)
    console.log(`  Successful: ${this.metrics.successfulTransactions} (${((this.metrics.successfulTransactions / this.metrics.totalTransactions) * 100).toFixed(1)}%)`)
    console.log(`  Failed: ${this.metrics.failedTransactions} (${this.metrics.errorRate.toFixed(1)}%)`)
    console.log(`  Duration: ${this.metrics.totalDuration.toFixed(1)}s`)
    
    console.log('\n⚡ Performance Metrics:')
    console.log(`  Average TPS: ${this.metrics.tps.toFixed(1)}`)
    console.log(`  Peak TPS: ${this.metrics.peakTps.toFixed(1)}`)
    console.log(`  Average Latency: ${this.metrics.averageLatency.toFixed(0)}ms`)
    console.log(`  P95 Latency: ${this.metrics.p95Latency.toFixed(0)}ms`)
    console.log(`  P99 Latency: ${this.metrics.p99Latency.toFixed(0)}ms`)
    console.log(`  Min Latency: ${this.metrics.minLatency}ms`)
    console.log(`  Max Latency: ${this.metrics.maxLatency}ms`)
    
    console.log('\n💾 Resource Usage:')
    const startMB = this.metrics.memoryUsage.start.heapUsed / 1024 / 1024
    const peakMB = this.metrics.memoryUsage.peak.heapUsed / 1024 / 1024
    const endMB = this.metrics.memoryUsage.end.heapUsed / 1024 / 1024
    console.log(`  Memory Start: ${startMB.toFixed(1)}MB`)
    console.log(`  Memory Peak: ${peakMB.toFixed(1)}MB`)
    console.log(`  Memory End: ${endMB.toFixed(1)}MB`)
    console.log(`  Memory Growth: ${(endMB - startMB).toFixed(1)}MB`)
    
    console.log('\n🎯 Target Analysis:')
    const targetTps = 100 // Example target
    const meetsTarget = this.metrics.tps >= targetTps
    console.log(`  Target TPS: ${targetTps}`)
    console.log(`  Achieved: ${this.metrics.tps.toFixed(1)} (${meetsTarget ? '✅ PASS' : '❌ FAIL'})`)
    
    if (this.metrics.errorRate > 5) {
      console.log(`\n⚠️  High error rate detected: ${this.metrics.errorRate.toFixed(1)}%`)
    }
    
    if (this.metrics.p99Latency > 5000) {
      console.log(`\n⚠️  High P99 latency detected: ${this.metrics.p99Latency}ms`)
    }
    
    console.log('\n='.repeat(80))
  }
}

// CLI usage
async function main() {
  const config: LoadTestConfig = {
    rpcEndpoint: process.env.RPC_URL || 'http://localhost:8899',
    durationSeconds: parseInt(process.env.DURATION || '60'),
    concurrentUsers: parseInt(process.env.USERS || '10'),
    transactionsPerUser: parseInt(process.env.TXS_PER_USER || '100'),
    rampUpSeconds: parseInt(process.env.RAMP_UP || '10')
  }
  
  const tester = new LoadTester(config)
  await tester.run()
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { LoadTester, type LoadTestConfig, type LoadTestMetrics }