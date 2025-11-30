/**
 * Example: Using GhostSpeak SDK with Turso Database Integration
 * 
 * This example demonstrates how to use the database caching features
 * for faster agent discovery and transaction queries.
 */

import { GhostSpeakClient } from '@ghostspeak/sdk'
import { agentCache, transactionIndexer } from '@ghostspeak/sdk/database'
import { address } from '@solana/kit'

// Initialize the SDK client (database integration is automatic!)
const client = new GhostSpeakClient({
    rpc: 'https://api.devnet.solana.com',
    programId: address('GhostK5F8kJVfKzVYj3nJG4T8Q4Y9TZjDTp8Dq7ZzDzC'),
    cluster: 'devnet'
})

async function main() {
    console.log('🚀 GhostSpeak SDK with Turso Database Example\n')

    // ============================================
    // Part 1: Agent Discovery with Caching
    // ============================================
    console.log('📋 Part 1: Agent Discovery\n')

    // First call: Fetches from RPC and caches (~500ms)
    console.time('First agent query')
    const agents1 = await client.agent.discovery.searchAgents({
        x402_enabled: true,
        capability: 'text-generation',
        limit: 10
    })
    console.timeEnd('First agent query')
    console.log(`Found ${agents1.agents.length} agents\n`)

    // Second call: Returns from cache (~10-50ms)
    console.time('Cached agent query')
    const agents2 = await client.agent.discovery.searchAgents({
        x402_enabled: true,
        capability: 'text-generation',
        limit: 10
    })
    console.timeEnd('Cached agent query')
    console.log(`Found ${agents2.agents.length} agents (from cache!)\n`)

    // ============================================
    // Part 2: Advanced Agent Filtering
    // ============================================
    console.log('🔍 Part 2: Advanced Filtering\n')

    // Use database indexes for fast filtering
    const verifiedAgents = await agentCache.listAgents({
        isVerified: true,
        x402Enabled: true,
        minReputation: 7000,
        framework: 'eliza',
        limit: 5
    })

    console.log(`Top verified Eliza agents: ${verifiedAgents.length}`)
    verifiedAgents.forEach((agent, i) => {
        console.log(`  ${i + 1}. ${agent.name} (reputation: ${agent.reputationScore})`)
    })
    console.log()

    // ============================================
    // Part 3: Transaction Indexing
    // ============================================
    console.log('💰 Part 3: Transaction Indexing\n')

    if (agents1.agents.length > 0) {
        const exampleAgent = agents1.agents[0]

        // Example: Index a transaction (normally done automatically by SDK)
        await transactionIndexer.indexTransaction({
            signature: 'example_tx_' + Date.now(),
            agentAddress: exampleAgent.address,
            payerAddress: 'ExamplePayer111111111111111111111111111',
            recipientAddress: exampleAgent.x402_payment_address,
            amount: '1000000', // 1 USDC (6 decimals)
            tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            tokenDecimals: 6,
            status: 'finalized',
            blockTime: Math.floor(Date.now() / 1000),
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        console.log('✅ Transaction indexed')

        // Query agent transaction history (instant!)
        const txHistory = await transactionIndexer.getAgentTransactions(
            exampleAgent.address,
            20
        )

        console.log(`Agent has ${txHistory.length} transactions`)

        // Get revenue stats
        const revenue = await transactionIndexer.getAgentRevenue(exampleAgent.address)
        const txCount = await transactionIndexer.getAgentTransactionCount(exampleAgent.address)

        console.log(`Total revenue: ${revenue}`)
        console.log(`Total transactions: ${txCount}`)
    }
    console.log()

    // ============================================
    // Part 4: Cache Management
    // ============================================
    console.log('🔧 Part 4: Cache Management\n')

    // Get cache statistics
    const stats = await agentCache.getCacheStats()

    if (stats) {
        console.log(`Cache stats:`)
        console.log(`  - Total cached agents: ${stats.totalAgents}`)
        console.log(`  - Average cache age: ${Math.round(stats.averageAge / 1000)}s`)
        console.log(`  - Oldest cache: ${new Date(stats.oldestCache).toLocaleString()}`)
    } else {
        console.log('Database not configured - using RPC only')
    }
    console.log()

    // ============================================
    // Part 5: Force Refresh Example
    // ============================================
    console.log('🔄 Part 5: Force Refresh\n')

    if (agents1.agents.length > 0) {
        const agentAddress = agents1.agents[0].address

        // Get from cache
        console.time('Cached get')
        await client.agent.discovery.getAgent(agentAddress)
        console.timeEnd('Cached get')

        // Force refresh from RPC
        console.time('Force refresh')
        await client.agent.discovery.getAgent(agentAddress, true)
        console.timeEnd('Force refresh')
    }
    console.log()

    // ============================================
    // Part 6: Advanced Transaction Queries
    // ============================================
    console.log('📊 Part 6: Advanced Queries\n')

    // Query transactions with filters
    const recentTxs = await transactionIndexer.getTransactions({
        status: 'finalized',
        fromTime: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
        limit: 50
    })

    console.log(`Recent finalized transactions: ${recentTxs.length}`)

    // Query by token
    const usdcTxs = await transactionIndexer.getTransactions({
        tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        limit: 10
    })

    console.log(`USDC transactions: ${usdcTxs.length}`)
    console.log()

    console.log('✨ Example complete!')
}

// Run the example
main().catch(error => {
    console.error('Error:', error)
    process.exit(1)
})
