/**
 * Register Caisper's x402 Endpoints
 * 
 * Registers Caisper's API endpoints in the observedEndpoints table
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

const CAISPER_ADDRESS = process.env.CAISPER_WALLET_ADDRESS!
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3333'

// Caisper's x402-enabled endpoints
const ENDPOINTS = [
    {
        endpoint: `${BASE_URL}/api/agent/chat`,
        method: 'POST',
        priceUsdc: 0.001,
        description: 'Chat with Caisper AI agent for credential verification and trust analysis',
        category: 'utility',
    },
    {
        endpoint: `${BASE_URL}/api/v1/agent/${CAISPER_ADDRESS}`,
        method: 'GET',
        priceUsdc: 0.0005,
        description: 'Get Caisper agent details and metadata',
        category: 'utility',
    },
    {
        endpoint: `${BASE_URL}/api/v1/x402/query`,
        method: 'POST',
        priceUsdc: 0.002,
        description: 'Query any x402-enabled agent through Caisper proxy',
        category: 'utility',
    },
    {
        endpoint: `${BASE_URL}/api/v1/discovery`,
        method: 'GET',
        priceUsdc: 0.0001,
        description: 'Discover available AI agents in the GhostSpeak network',
        category: 'research',
    },
    {
        endpoint: `${BASE_URL}/api/v1/discovery/stats`,
        method: 'GET',
        priceUsdc: 0.0001,
        description: 'Get network statistics and agent discovery metrics',
        category: 'research',
    },
]

async function main() {
    if (!CAISPER_ADDRESS) {
        console.error('❌ CAISPER_WALLET_ADDRESS not set')
        process.exit(1)
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

    console.log('📡 Registering Caisper x402 Endpoints')
    console.log(`   Agent: ${CAISPER_ADDRESS}`)
    console.log(`   Base URL: ${BASE_URL}`)
    console.log('')

    for (const ep of ENDPOINTS) {
        try {
            // Check if endpoint already exists
            const existing = await convex.query(api.observation.listEndpoints, {
                agentAddress: CAISPER_ADDRESS,
            })

            const alreadyExists = existing?.some((e: any) => e.endpoint === ep.endpoint)

            if (alreadyExists) {
                console.log(`   ⏭️  ${ep.method} ${ep.endpoint} (already exists)`)
                continue
            }

            // Register endpoint
            await convex.mutation(api.observation.addEndpoint, {
                agentAddress: CAISPER_ADDRESS,
                baseUrl: new URL(ep.endpoint).origin,
                endpoint: ep.endpoint,
                method: ep.method,
                priceUsdc: ep.priceUsdc,
                description: ep.description,
                category: ep.category,
            })

            console.log(`   ✅ ${ep.method} ${ep.endpoint}`)
        } catch (error: any) {
            console.log(`   ❌ ${ep.method} ${ep.endpoint}: ${error.message}`)
        }
    }

    console.log('')
    console.log('🎉 Done!')

    // Verify
    const endpoints = await convex.query(api.observation.listEndpoints, {
        agentAddress: CAISPER_ADDRESS,
    })
    console.log(`   Total endpoints: ${endpoints?.length || 0}`)
}

main()
