/**
 * Basic usage example for GhostSpeak TypeScript SDK
 * 
 * This example demonstrates the core functionality of the SDK:
 * - Creating a client
 * - Registering an agent
 * - Creating marketplace listings
 * - Managing escrow payments
 * - A2A communication
 */

import { GhostSpeakClient, createRecommendedConnection } from '../src/index.js'
import type { Address } from '@solana/addresses'

async function basicUsageExample() {
  try {
    // 1. Create RPC connection
    console.log('🌐 Connecting to Solana devnet...')
    const rpc = createRecommendedConnection('https://api.devnet.solana.com')
    
    // 2. Create GhostSpeak client
    const client = GhostSpeakClient.create(rpc)
    console.log('✅ GhostSpeak client created')

    // 3. Mock signer (in real usage, you'd use actual wallet)
    const mockSigner = {
      publicKey: 'YOUR_WALLET_ADDRESS' as Address,
      sign: async (message: Uint8Array) => new Uint8Array(64) // Mock signature
    }

    // 4. Register an AI agent
    console.log('\n🤖 Registering AI agent...')
    try {
      const agentTx = await client.registerAgent(mockSigner, {
        agentData: {
          name: 'DataAnalyzer Pro',
          description: 'Advanced data analysis and business insights',
          capabilities: ['data-analysis', 'reporting', 'visualization'],
          metadataUri: 'https://example.com/agent-metadata.json',
          serviceEndpoint: 'https://api.dataanalyzer.com/v1'
        }
      })
      console.log('✅ Agent registered! Transaction:', agentTx)
    } catch (error) {
      console.log('⚠️  Agent registration pending SDK implementation')
    }

    // 5. Create a service listing
    console.log('\n🛍️ Creating marketplace service...')
    try {
      const serviceTx = await client.createServiceListing(mockSigner, {
        title: 'Professional Data Analysis',
        description: 'Comprehensive data analysis with interactive dashboards and insights',
        price: BigInt(500_000_000), // 0.5 SOL
        currency: 'So11111111111111111111111111111111111111112' as Address, // Wrapped SOL
        category: 'analytics'
      })
      console.log('✅ Service listed! Transaction:', serviceTx)
    } catch (error) {
      console.log('⚠️  Service listing pending SDK implementation')
    }

    // 6. Create escrow payment
    console.log('\n🔒 Creating escrow payment...')
    try {
      const escrowTx = await client.createEscrow(mockSigner, {
        seller: 'SELLER_WALLET_ADDRESS' as Address,
        agent: 'AGENT_WALLET_ADDRESS' as Address,
        amount: BigInt(500_000_000), // 0.5 SOL
        currency: 'So11111111111111111111111111111111111111112' as Address
      })
      console.log('✅ Escrow created! Transaction:', escrowTx)
    } catch (error) {
      console.log('⚠️  Escrow creation pending SDK implementation')
    }

    // 7. Create A2A communication session
    console.log('\n💬 Creating A2A session...')
    try {
      const sessionTx = await client.createA2ASession(mockSigner, {
        responder: 'AGENT_2_ADDRESS' as Address,
        sessionType: 'collaboration',
        metadata: 'Project collaboration session',
        expiresAt: BigInt(Date.now() + 3600000) // Expires in 1 hour
      })
      console.log('✅ A2A session created! Transaction:', sessionTx)
    } catch (error) {
      console.log('⚠️  A2A session creation pending SDK implementation')
    }

    // 8. Fetch agent information
    console.log('\n📊 Fetching agent data...')
    try {
      const agentData = await client.getAgent('AGENT_ADDRESS' as Address)
      console.log('✅ Agent data:', agentData)
    } catch (error) {
      console.log('⚠️  Agent data fetching pending SDK implementation')
    }

    // 9. List marketplace services
    console.log('\n🏪 Browsing marketplace...')
    try {
      const services = await client.getServiceListings()
      console.log('✅ Available services:', services.length)
    } catch (error) {
      console.log('⚠️  Marketplace browsing pending SDK implementation')
    }

    console.log('\n🎉 Basic usage example completed!')
    console.log('\n📝 Note: All blockchain operations are currently placeholders.')
    console.log('   Real implementation will be added once Codama generation is resolved.')

  } catch (error) {
    console.error('❌ Example failed:', error)
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExample()
    .then(() => console.log('✅ Example finished'))
    .catch(error => console.error('❌ Example error:', error))
}

export { basicUsageExample }