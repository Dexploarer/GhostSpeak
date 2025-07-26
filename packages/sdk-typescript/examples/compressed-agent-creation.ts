#!/usr/bin/env tsx
/**
 * Example: Creating Compressed Agents with ZK Compression
 * 
 * This example demonstrates how to use GhostSpeak's compressed agent feature
 * to achieve 5000x cost reduction when creating AI agents.
 * 
 * Prerequisites:
 * - Funded Solana wallet
 * - Connection to devnet/mainnet
 * 
 * Usage:
 * bun run examples/compressed-agent-creation.ts
 */

import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import { generateKeyPairSigner } from '@solana/signers'
import { GhostSpeakClient } from '../src/client/GhostSpeakClient'
import type { CompressedAgentParams } from '../src/utils/compressed-agent-helpers'

async function main() {
  console.log('🗜️ GhostSpeak Compressed Agent Creation Example')
  console.log('='.repeat(50))

  // Initialize client
  const rpc = createSolanaRpc('https://api.devnet.solana.com')
  const signer = await generateKeyPairSigner()
  
  const client = new GhostSpeakClient({
    rpc,
    programId: address('GHOSTSPEAKProgramAddress'), // Replace with actual program ID
  })

  try {
    // Step 1: Estimate cost savings
    console.log('\n📊 Cost Estimation:')
    const numAgents = 1000
    const savings = client.agents.estimateSavings(numAgents)
    
    console.log(`   Regular creation cost: ${savings.regularCostSOL.toFixed(4)} SOL`)
    console.log(`   Compressed cost: ${savings.compressedCostSOL.toFixed(4)} SOL`)
    console.log(`   💰 Savings: ${savings.savingsSOL.toFixed(4)} SOL (${savings.savingsPercent.toFixed(1)}%)`)
    console.log(`   🚀 Cost reduction: ${savings.costReductionFactor.toFixed(0)}x`)

    // Step 2: Create a Merkle tree for compressed storage
    console.log('\n🌳 Creating Merkle tree for compressed agents...')
    const treeResult = await client.agents.createCompressedTree(signer, {
      maxDepth: 14, // 2^14 = 16,384 agents capacity
      canopyDepth: 3 // Optimize proof generation
    })
    
    console.log(`   ✅ Tree created: ${treeResult.treeAddress}`)
    console.log(`   Authority: ${treeResult.treeAuthority}`)
    console.log(`   Capacity: 16,384 agents`)

    // Step 3: Create a batch of compressed agents
    console.log('\n🚀 Creating batch of compressed agents...')
    
    const agents: CompressedAgentParams[] = [
      {
        owner: signer.address,
        agentId: `ai_analyst_${Date.now()}`,
        agentType: 1,
        name: 'AI Data Analyst',
        description: 'Specialized in data analysis and visualization',
        capabilities: ['data-analysis', 'visualization', 'reporting', 'statistics'],
        metadataUri: 'https://example.com/metadata/analyst',
        serviceEndpoint: 'https://api.example.com/analyst',
        pricingModel: 'Hourly'
      },
      {
        owner: signer.address,
        agentId: `ai_writer_${Date.now()}`,
        agentType: 2,
        name: 'AI Content Writer',
        description: 'Creates high-quality written content',
        capabilities: ['writing', 'editing', 'research', 'seo-optimization'],
        metadataUri: 'https://example.com/metadata/writer',
        serviceEndpoint: 'https://api.example.com/writer',
        pricingModel: 'TaskBased'
      },
      {
        owner: signer.address,
        agentId: `ai_coder_${Date.now()}`,
        agentType: 3,
        name: 'AI Code Assistant',
        description: 'Helps with coding tasks and debugging',
        capabilities: ['coding', 'debugging', 'code-review', 'documentation'],
        metadataUri: 'https://example.com/metadata/coder',
        serviceEndpoint: 'https://api.example.com/coder',
        pricingModel: 'Fixed'
      },
      {
        owner: signer.address,
        agentId: `ai_translator_${Date.now()}`,
        agentType: 4,
        name: 'AI Language Translator',
        description: 'Translates between multiple languages',
        capabilities: ['translation', 'localization', 'cultural-adaptation'],
        metadataUri: 'https://example.com/metadata/translator',
        serviceEndpoint: 'https://api.example.com/translator',
        pricingModel: 'Dynamic'
      }
    ]

    const batchResult = await client.agents.createCompressedBatch(
      signer,
      treeResult.treeAddress,
      agents
    )

    console.log(`   ✅ Batch created successfully!`)
    console.log(`   Agents created: ${batchResult.agentIds.length}`)
    console.log(`   Cost reduction: ${batchResult.costReduction}x`)
    console.log(`   Agent IDs:`)
    batchResult.agentIds.forEach(id => console.log(`     - ${id}`))

    // Step 4: Check tree utilization
    console.log('\n📈 Checking tree utilization...')
    const treeState = await client.agents.getTreeState(treeResult.treeAuthority)
    
    console.log(`   Agents minted: ${treeState.numMinted}`)
    console.log(`   Tree capacity: ${treeState.capacity}`)
    console.log(`   Utilization: ${treeState.utilizationPercent.toFixed(2)}%`)

    // Step 5: Create a single compressed agent with metadata
    console.log('\n🤖 Creating single compressed agent with metadata...')
    const singleAgent = await client.agents.createCompressedAgentWithMetadata(signer, {
      merkleTree: treeResult.treeAddress,
      name: 'AI Research Assistant',
      description: 'Comprehensive research and analysis capabilities',
      category: 'research',
      capabilities: [
        'academic-research',
        'market-analysis',
        'competitive-intelligence',
        'trend-analysis',
        'report-generation'
      ],
      serviceEndpoint: 'https://api.example.com/research-assistant',
      forceIPFS: false // Use inline storage for small metadata
    })

    console.log(`   ✅ Agent created: ${singleAgent.agentId}`)
    console.log(`   Signature: ${singleAgent.signature}`)

    // Step 6: Demonstrate migration from regular to compressed
    console.log('\n🔄 Migration example (if you have an existing agent):')
    console.log('   To migrate an existing agent to compressed format:')
    console.log('   ```')
    console.log('   const migration = await client.agents.migrateToCompressed(')
    console.log('     signer,')
    console.log('     existingAgentAddress,')
    console.log('     treeResult.treeAddress')
    console.log('   )')
    console.log('   ```')

    // Step 7: Show massive scale example
    console.log('\n🌟 Massive Scale Example:')
    const massiveScale = client.agents.estimateSavings(10000)
    console.log(`   Creating 10,000 agents:`)
    console.log(`   - Regular cost: ${massiveScale.regularCostSOL.toFixed(2)} SOL`)
    console.log(`   - Compressed cost: ${massiveScale.compressedCostSOL.toFixed(2)} SOL`)
    console.log(`   - Savings: ${massiveScale.savingsSOL.toFixed(2)} SOL`)
    console.log(`   - Cost reduction: ~${Math.round(massiveScale.costReductionFactor)}x`)

    console.log('\n✨ Summary:')
    console.log('   Compressed agents provide massive cost savings while maintaining')
    console.log('   all functionality. Perfect for:')
    console.log('   - AI agent marketplaces')
    console.log('   - Large-scale agent deployments')
    console.log('   - Multi-agent systems')
    console.log('   - Cost-conscious developers')

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run the example
main().catch(console.error)