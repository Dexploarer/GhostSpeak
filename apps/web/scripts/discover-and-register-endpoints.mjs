#!/usr/bin/env node

/**
 * Discover and register endpoints for a specific agent
 * Run with: node scripts/discover-and-register-endpoints.mjs <agent_address>
 */

import { spawn } from 'child_process'

const CONVEX_DEPLOYMENT = 'prod:enduring-porpoise-79'

// Helper to run convex mutations
function runConvexMutation(fn, args = '{}') {
  return new Promise((resolve, reject) => {
    const proc = spawn('bunx', ['convex', 'run', fn, args], {
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
        reject(new Error(`Command failed: ${stderr}`))
      } else {
        try {
          resolve(JSON.parse(stdout))
        } catch (err) {
          resolve(stdout)
        }
      }
    })
  })
}

// Discover endpoints for an agent using standard x402 discovery
async function discoverEndpoints(agentAddress) {
  const endpoints = []

  const discoveryUrls = [
    `https://${agentAddress}/.well-known/x402.json`,
    `https://${agentAddress}/x402.json`,
    `https://${agentAddress}/endpoints.json`,
    `https://${agentAddress}/api/x402`,
  ]

  for (const url of discoveryUrls) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()

        if (data.endpoints && Array.isArray(data.endpoints)) {
          for (const ep of data.endpoints) {
            const priceUsdc = parsePrice(ep.price || ep.priceUsdc || ep.amount)

            // Validate price is reasonable (max $100)
            if (priceUsdc < 0 || priceUsdc > 100) continue

            endpoints.push({
              agentAddress,
              baseUrl: ep.baseUrl || new URL(url).origin,
              endpoint: ep.url || ep.endpoint,
              method: ep.method || 'GET',
              priceUsdc,
              description: ep.description || ep.name || 'No description provided',
              category: ep.category || ep.type || 'other',
            })
          }

          console.log(`✓ Found ${endpoints.length} endpoints via ${url}`)
          break
        }
      }
    } catch (error) {
      // Try next discovery method
      continue
    }
  }

  return endpoints
}

function parsePrice(price) {
  if (typeof price === 'number') return price
  if (typeof price === 'string') {
    const num = parseFloat(price)
    if (num > 1000) return num / 1e6 // Likely micro-USDC
    return num
  }
  return 0.01 // Default
}

async function main() {
  const agentAddress = process.argv[2]

  if (!agentAddress) {
    console.error('Usage: node scripts/discover-and-register-endpoints.mjs <agent_address>')
    process.exit(1)
  }

  console.log(`\n🔍 Discovering endpoints for: ${agentAddress}\n`)

  // Discover endpoints
  const discovered = await discoverEndpoints(agentAddress)

  if (discovered.length === 0) {
    console.log('⚠️  No endpoints discovered')
    return
  }

  console.log(`\n📍 Discovered ${discovered.length} endpoints:`)
  discovered.forEach((ep, i) => {
    console.log(`  ${i + 1}. ${ep.method} ${ep.endpoint} ($${ep.priceUsdc})`)
  })

  // Register via bulkImportEndpoints
  console.log(`\n📝 Registering endpoints...`)

  const result = await runConvexMutation(
    'observation:bulkImportEndpoints',
    JSON.stringify({ endpoints: discovered })
  )

  console.log(`\n✅ Success!`)
  console.log(`  Registered: ${result.imported}`)
  console.log(`  Skipped (duplicates): ${result.skipped}`)
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
