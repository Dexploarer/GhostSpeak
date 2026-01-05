#!/usr/bin/env bun
/**
 * Import validated x402 endpoints into Convex observation system
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'
import validatedAgents from '../../../data/validated_agents_with_endpoints.json'

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://lovely-cobra-639.convex.cloud'

async function main() {
  console.log('Importing validated x402 endpoints into Convex...')
  console.log(`Using Convex: ${CONVEX_URL}`)

  const client = new ConvexHttpClient(CONVEX_URL)

  // Categorize endpoints based on description
  function categorizeEndpoint(description: string): string {
    const desc = description.toLowerCase()
    if (desc.includes('research') || desc.includes('search') || desc.includes('kol') || desc.includes('gems')) {
      return 'research'
    }
    if (desc.includes('token') || desc.includes('price') || desc.includes('trending') || desc.includes('market') || desc.includes('dex')) {
      return 'market_data'
    }
    if (desc.includes('raid') || desc.includes('twitter') || desc.includes('x post') || desc.includes('telegram') || desc.includes('profile')) {
      return 'social'
    }
    if (desc.includes('music') || desc.includes('tts') || desc.includes('stt') || desc.includes('speech') || desc.includes('bridge') || desc.includes('send')) {
      return 'utility'
    }
    return 'other'
  }

  // Flatten the nested structure
  const endpoints: Array<{
    agentAddress: string
    baseUrl: string
    endpoint: string
    method: string
    priceUsdc: number
    description: string
    category: string
  }> = []

  for (const agent of validatedAgents as any[]) {
    for (const service of agent.services) {
      endpoints.push({
        agentAddress: agent.agent,
        baseUrl: agent.base_url,
        endpoint: service.endpoint,
        method: service.method,
        priceUsdc: service.price_usdc,
        description: service.description,
        category: categorizeEndpoint(service.description),
      })
    }
  }

  console.log(`Found ${endpoints.length} endpoints from ${validatedAgents.length} agents`)

  // Import in batches
  const BATCH_SIZE = 20
  let totalImported = 0
  let totalSkipped = 0

  for (let i = 0; i < endpoints.length; i += BATCH_SIZE) {
    const batch = endpoints.slice(i, i + BATCH_SIZE)
    console.log(`Importing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(endpoints.length / BATCH_SIZE)}...`)

    try {
      const result = await client.mutation(api.observation.bulkImportEndpoints, {
        endpoints: batch,
      })
      totalImported += result.imported
      totalSkipped += result.skipped
      console.log(`  Imported: ${result.imported}, Skipped: ${result.skipped}`)
    } catch (error: any) {
      console.error(`  Error: ${error.message}`)
    }
  }

  console.log('\n=== Import Complete ===')
  console.log(`Total imported: ${totalImported}`)
  console.log(`Total skipped: ${totalSkipped}`)
  console.log(`Total endpoints: ${endpoints.length}`)

  // Print category breakdown
  const categories: Record<string, number> = {}
  for (const ep of endpoints) {
    categories[ep.category] = (categories[ep.category] || 0) + 1
  }
  console.log('\nBy category:')
  for (const [cat, count] of Object.entries(categories)) {
    console.log(`  ${cat}: ${count}`)
  }
}

main().catch(console.error)
