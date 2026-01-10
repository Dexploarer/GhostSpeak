#!/usr/bin/env node

/**
 * Analyze which discovered agents don't have endpoints registered
 * Run with: node scripts/analyze-agent-endpoints.mjs
 */

import { spawn } from 'child_process'

const CONVEX_DEPLOYMENT = 'prod:enduring-porpoise-79'

// Helper to run convex queries
function runConvexQuery(query, args = '{}') {
  return new Promise((resolve, reject) => {
    const proc = spawn('bunx', ['convex', 'run', query, args], {
      env: { ...process.env, CONVEX_DEPLOYMENT },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to run query: ${stderr}`))
      } else {
        try {
          resolve(JSON.parse(stdout))
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${stdout}`))
        }
      }
    })
  })
}

async function main() {
  console.log('🔍 Fetching discovered agents...')
  const agents = await runConvexQuery('ghostDiscovery:listDiscoveredAgents')

  console.log('🔍 Fetching registered endpoints...')
  const endpoints = await runConvexQuery('observation:listEndpoints')

  // Extract unique agent addresses from each list
  const allAgentAddresses = new Set(agents.map((a) => a.ghostAddress))
  const agentsWithEndpoints = new Set(endpoints.map((e) => e.agentAddress))

  // Find agents without endpoints
  const agentsWithoutEndpoints = [...allAgentAddresses].filter(
    (addr) => !agentsWithEndpoints.has(addr)
  )

  // Get full agent info for agents without endpoints
  const missingEndpoints = agents
    .filter((a) => agentsWithoutEndpoints.includes(a.ghostAddress))
    .map((a) => ({
      address: a.ghostAddress,
      name: a.name || 'Unknown',
      status: a.status,
      discoverySource: a.discoverySource,
      claimedBy: a.claimedBy,
      description: a.description,
    }))

  // Count endpoints per agent for those that have them
  const endpointCounts = {}
  endpoints.forEach((e) => {
    endpointCounts[e.agentAddress] = (endpointCounts[e.agentAddress] || 0) + 1
  })

  const agentsWithEndpointsInfo = agents
    .filter((a) => agentsWithEndpoints.has(a.ghostAddress))
    .map((a) => ({
      address: a.ghostAddress,
      name: a.name || 'Unknown',
      endpointCount: endpointCounts[a.ghostAddress],
      status: a.status,
    }))

  // Print results
  console.log('\n' + '='.repeat(80))
  console.log('📊 AGENT ENDPOINT ANALYSIS')
  console.log('='.repeat(80))

  console.log(`\n📈 Summary:`)
  console.log(`  Total discovered agents: ${allAgentAddresses.size}`)
  console.log(`  Agents WITH endpoints: ${agentsWithEndpoints.size}`)
  console.log(`  Agents WITHOUT endpoints: ${agentsWithoutEndpoints.length}`)
  console.log(`  Total endpoints registered: ${endpoints.length}`)

  console.log('\n✅ Agents WITH Endpoints:')
  agentsWithEndpointsInfo
    .sort((a, b) => b.endpointCount - a.endpointCount)
    .forEach((a) => {
      console.log(
        `  ${a.name.padEnd(30)} | ${a.endpointCount.toString().padStart(2)} endpoints | ${a.status}`
      )
      console.log(`    ${a.address}`)
    })

  console.log('\n❌ Agents WITHOUT Endpoints:')
  missingEndpoints.forEach((a) => {
    const statusLabel =
      a.status === 'claimed' ? '🔒 CLAIMED' : a.status === 'verified' ? '✓ VERIFIED' : '⚪ DISCOVERED'
    console.log(`\n  ${statusLabel} ${a.name}`)
    console.log(`    Address: ${a.address}`)
    console.log(`    Source: ${a.discoverySource}`)
    if (a.claimedBy) {
      console.log(`    Claimed by: ${a.claimedBy}`)
    }
    if (a.description) {
      console.log(`    Description: ${a.description}`)
    }
  })

  console.log('\n' + '='.repeat(80))
  console.log('💡 Recommendations:')
  console.log('='.repeat(80))
  console.log(`\n1. ${missingEndpoints.length} agents need endpoint registration`)
  console.log(`2. Claimed agents should be prioritized for endpoint discovery`)
  console.log(`3. Verified agents from seed data likely have known endpoints`)
  console.log(`4. Use x402 discovery to auto-register endpoints`)

  console.log('\n📋 Next Steps:')
  console.log('  - Review claimed agents and manually add endpoints if known')
  console.log('  - Implement x402 discovery backfill for agents without endpoints')
  console.log('  - Create automatic endpoint registration on agent discovery')

  console.log('\n')
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
