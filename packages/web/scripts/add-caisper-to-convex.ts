/**
 * Add Caisper to Convex as Discovered Agent
 *
 * This script manually adds Caisper to the discovered agents table in Convex
 * so we can test the claim flow without needing to make an actual x402 payment.
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

async function main() {
  console.log('🚀 Adding Caisper to Convex as Discovered Agent\n')
  console.log('=' .repeat(80))

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is not set')
  }
  console.log(`📋 Convex URL: ${convexUrl}`)

  const convex = new ConvexHttpClient(convexUrl)

  // Caisper's actual funded address
  const caisperAddress = '35TMqcEZAM43Axdxg5kfwkXmzDs1bJUxN8pD1pCs3nSt'

  console.log(`\n👻 Adding Caisper: ${caisperAddress}`)

  try {
    // Check if already exists
    const existing = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
      ghostAddress: caisperAddress
    })

    if (existing) {
      console.log('\n⚠️  Caisper already exists in discovered agents!')
      console.log('Status:', existing.status)
      console.log('Data:', JSON.stringify(existing, null, 2))
      return
    }

    // Add Caisper to discovered agents
    await convex.mutation(api.ghostDiscovery.addDiscoveredAgent, {
      ghostAddress: caisperAddress,
      agentName: 'Caisper',
      agentType: 'AI Assistant',
      capabilities: ['conversation', 'ghostspeak-integration', 'reputation-tracking'],
      discoverySource: 'manual_test',
      metadata: {
        version: '1.0.0',
        x402Compliant: true,
        testAgent: true,
      }
    })

    console.log('\n✅ SUCCESS! Caisper added to discovered agents')

    // Verify it was added
    const agent = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
      ghostAddress: caisperAddress
    })

    console.log('\n📊 Agent Data:')
    console.log(JSON.stringify(agent, null, 2))

    console.log('\n' + '='.repeat(80))
    console.log('\n📚 Next Steps:')
    console.log('1. Navigate to http://localhost:3000/caisper')
    console.log('2. Ask: "What agents are available?"')
    console.log('3. Caisper should appear in the list')
    console.log('4. Click "Claim Now" to register on-chain')
    console.log()

  } catch (error) {
    console.error('\n❌ Error:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
    }
    throw error
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
