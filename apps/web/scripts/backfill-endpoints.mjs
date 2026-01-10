#!/usr/bin/env node

/**
 * Backfill endpoints for agents without registered endpoints
 * Run with: node scripts/backfill-endpoints.mjs
 */

import { spawn } from 'child_process'

const CONVEX_DEPLOYMENT = 'prod:enduring-porpoise-79'

// Helper to run convex queries/actions
function runConvexCommand(type, fn, args = '{}') {
  return new Promise((resolve, reject) => {
    const proc = spawn('bunx', ['convex', type, fn, args], {
      env: { ...process.env, CONVEX_DEPLOYMENT },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      stdout += text
      // Stream logs in real-time
      if (text.includes('[Endpoint Discovery]') || text.includes('[Discovery]')) {
        console.log(text.trim())
      }
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed: ${stderr}`))
      } else {
        try {
          resolve(JSON.parse(stdout))
        } catch (err) {
          // If output isn't JSON, return raw
          resolve(stdout)
        }
      }
    })
  })
}

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] || 'claimed' // 'claimed', 'all', or specific address

  console.log('🔍 Fetching agents without endpoints...')

  // Get all discovered agents
  const agents = await runConvexCommand('run', 'ghostDiscovery:listDiscoveredAgents')

  // Get all registered endpoints
  const endpoints = await runConvexCommand('run', 'observation:listEndpoints')

  // Find agents without endpoints
  const allAgentAddresses = new Set(agents.map((a) => a.ghostAddress))
  const agentsWithEndpoints = new Set(endpoints.map((e) => e.agentAddress))

  const agentsWithoutEndpoints = agents.filter(
    (a) => !agentsWithEndpoints.has(a.ghostAddress)
  )

  console.log(`\n📊 Status:`)
  console.log(`  Total agents: ${allAgentAddresses.size}`)
  console.log(`  Agents WITH endpoints: ${agentsWithEndpoints.size}`)
  console.log(`  Agents WITHOUT endpoints: ${agentsWithoutEndpoints.length}`)

  // Filter based on mode
  let targetAgents = []

  if (mode === 'claimed') {
    targetAgents = agentsWithoutEndpoints.filter((a) => a.status === 'claimed')
    console.log(`\n🔒 Targeting ${targetAgents.length} CLAIMED agents without endpoints`)
  } else if (mode === 'all') {
    targetAgents = agentsWithoutEndpoints
    console.log(`\n🌐 Targeting ALL ${targetAgents.length} agents without endpoints`)
  } else {
    // Specific address
    const agent = agents.find((a) => a.ghostAddress === mode)
    if (!agent) {
      console.error(`❌ Agent not found: ${mode}`)
      process.exit(1)
    }
    if (agentsWithEndpoints.has(mode)) {
      console.error(`⚠️  Agent already has endpoints: ${mode}`)
      console.log(`   Use 'bunx convex run observation:listEndpoints \\`)
      console.log(`     '{"agentAddress": "${mode}"}' to view them`)
      process.exit(0)
    }
    targetAgents = [agent]
    console.log(`\n🎯 Targeting specific agent: ${mode}`)
  }

  if (targetAgents.length === 0) {
    console.log(`\n✅ No agents need endpoint discovery!`)
    process.exit(0)
  }

  console.log(`\n` + '='.repeat(80))
  console.log(`Starting endpoint discovery for ${targetAgents.length} agents...`)
  console.log('='.repeat(80))

  let successful = 0
  let failed = 0
  let noEndpoints = 0
  let totalEndpointsRegistered = 0

  for (let i = 0; i < targetAgents.length; i++) {
    const agent = targetAgents[i]
    const progress = `[${i + 1}/${targetAgents.length}]`

    console.log(`\n${progress} 🔎 Discovering endpoints for:`)
    console.log(`  Address: ${agent.ghostAddress}`)
    console.log(`  Name: ${agent.name || 'Unknown'}`)
    console.log(`  Status: ${agent.status}`)
    if (agent.claimedBy) {
      console.log(`  Owner: ${agent.claimedBy}`)
    }

    try {
      const result = await runConvexCommand(
        'run',
        'agentEndpointDiscovery:discoverAndRegisterEndpoints',
        JSON.stringify({ agentAddress: agent.ghostAddress })
      )

      if (result.success) {
        if (result.registered > 0) {
          console.log(`  ✅ Registered ${result.registered} endpoints`)
          if (result.skipped > 0) {
            console.log(`     (${result.skipped} duplicates skipped)`)
          }
          successful++
          totalEndpointsRegistered += result.registered
        } else {
          console.log(`  ⚠️  No endpoints found`)
          noEndpoints++
        }
      } else {
        console.log(`  ❌ Failed: ${result.error}`)
        failed++
      }

      // Rate limit: wait 2 seconds between discoveries to avoid overwhelming networks
      if (i < targetAgents.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
      failed++
    }
  }

  console.log(`\n` + '='.repeat(80))
  console.log(`📊 Backfill Complete!`)
  console.log('='.repeat(80))
  console.log(`  Total agents processed: ${targetAgents.length}`)
  console.log(`  ✅ Successful: ${successful} agents`)
  console.log(`  ⚠️  No endpoints found: ${noEndpoints} agents`)
  console.log(`  ❌ Failed: ${failed} agents`)
  console.log(`  📍 Total endpoints registered: ${totalEndpointsRegistered}`)

  if (successful > 0) {
    console.log(`\n🎉 ${successful} agents now have endpoints and will be tested hourly!`)
    console.log(`   View them at: www.ghostspeak.io/observatory`)
  }

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} agents failed discovery. Common reasons:`)
    console.log(`   - Agent address is not a valid domain/URL`)
    console.log(`   - No x402 discovery endpoint available`)
    console.log(`   - Network timeout or unavailable`)
  }

  if (noEndpoints > 0) {
    console.log(`\n💡 ${noEndpoints} agents have no discoverable endpoints. Consider:`)
    console.log(`   - Manual endpoint registration via bulkImportEndpoints`)
    console.log(`   - Contacting agent owners for endpoint information`)
  }

  console.log(`\n✅ Done!`)
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message)
  process.exit(1)
})
