#!/usr/bin/env bun
/**
 * Health Check
 *
 * Checks the health of all GhostSpeak services and dependencies.
 * Can be used for monitoring, CI/CD, or manual verification.
 *
 * Usage:
 *   bun run scripts/health-check.ts [--format json|text]
 */

import { createSolanaRpc, address } from '@solana/kit'
import { getNetworkConfig, type NetworkEnvironment } from '../config/program-ids'

// Parse command line arguments
const args = process.argv.slice(2)
const formatArg = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 
                  args.find(arg => arg === '--format') && args[args.indexOf('--format') + 1] ||
                  'text'

const format = formatArg === 'json' ? 'json' : 'text'

// Colors for output
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const blue = (s: string) => `\x1b[34m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  message: string
  latency?: number
  details?: Record<string, unknown>
}

const checks: HealthCheck[] = []

async function checkSolanaRpc(): Promise<void> {
  const startTime = Date.now()
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    const rpc = createSolanaRpc(rpcUrl)
    
    const version = await rpc.getVersion().send()
    const latency = Date.now() - startTime
    
    checks.push({
      name: 'Solana RPC',
      status: 'healthy',
      message: `Connected (${latency}ms)`,
      latency,
      details: {
        version: version['solana-core'],
        rpcUrl,
      },
    })
  } catch (error) {
    checks.push({
      name: 'Solana RPC',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : String(error),
      latency: Date.now() - startTime,
    })
  }
}

async function checkProgramDeployment(): Promise<void> {
  const startTime = Date.now()
  
  try {
    const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as NetworkEnvironment
    const config = getNetworkConfig(network)
    const rpc = createSolanaRpc(config.endpoint)
    
    const programInfo = await rpc.getAccountInfo(address(config.programId)).send()
    const latency = Date.now() - startTime
    
    if (programInfo.value?.executable) {
      checks.push({
        name: 'Program Deployment',
        status: 'healthy',
        message: `Program deployed and executable`,
        latency,
        details: {
          programId: config.programId,
          network,
          executable: true,
        },
      })
    } else {
      checks.push({
        name: 'Program Deployment',
        status: 'unhealthy',
        message: 'Program not found or not executable',
        latency,
        details: {
          programId: config.programId,
          network,
        },
      })
    }
  } catch (error) {
    checks.push({
      name: 'Program Deployment',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : String(error),
      latency: Date.now() - startTime,
    })
  }
}

async function checkConvex(): Promise<void> {
  const startTime = Date.now()
  
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    
    if (!convexUrl) {
      checks.push({
        name: 'Convex',
        status: 'degraded',
        message: 'Convex URL not configured',
      })
      return
    }
    
    // Simple health check - try to ping Convex
    const response = await fetch(`${convexUrl.replace('/api', '')}/api/ping`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    
    const latency = Date.now() - startTime
    
    if (response.ok) {
      checks.push({
        name: 'Convex',
        status: 'healthy',
        message: `Connected (${latency}ms)`,
        latency,
        details: {
          url: convexUrl,
        },
      })
    } else {
      checks.push({
        name: 'Convex',
        status: 'unhealthy',
        message: `HTTP ${response.status}`,
        latency,
      })
    }
  } catch (error) {
    checks.push({
      name: 'Convex',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : String(error),
      latency: Date.now() - startTime,
    })
  }
}

async function checkEnvironmentVariables(): Promise<void> {
  const required = [
    'NEXT_PUBLIC_SOLANA_RPC_URL',
    'NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID',
  ]
  
  const optional = [
    'NEXT_PUBLIC_CONVEX_URL',
    'NEXT_PUBLIC_CROSSMINT_API_KEY',
    'CROSSMINT_SECRET_KEY',
  ]
  
  const missingRequired = required.filter(key => !process.env[key])
  const missingOptional = optional.filter(key => !process.env[key])
  
  if (missingRequired.length === 0 && missingOptional.length === 0) {
    checks.push({
      name: 'Environment Variables',
      status: 'healthy',
      message: 'All required variables configured',
      details: {
        required: required.length,
        optional: optional.length,
      },
    })
  } else if (missingRequired.length > 0) {
    checks.push({
      name: 'Environment Variables',
      status: 'unhealthy',
      message: `Missing required variables: ${missingRequired.join(', ')}`,
      details: {
        missingRequired,
        missingOptional,
      },
    })
  } else {
    checks.push({
      name: 'Environment Variables',
      status: 'degraded',
      message: `Missing optional variables: ${missingOptional.join(', ')}`,
      details: {
        missingOptional,
      },
    })
  }
}

function printResults() {
  const healthy = checks.filter(c => c.status === 'healthy').length
  const degraded = checks.filter(c => c.status === 'degraded').length
  const unhealthy = checks.filter(c => c.status === 'unhealthy').length
  const total = checks.length
  
  const allHealthy = unhealthy === 0
  
  if (format === 'json') {
    console.log(JSON.stringify({
      healthy: allHealthy,
      timestamp: new Date().toISOString(),
      summary: {
        total,
        healthy,
        degraded,
        unhealthy,
      },
      checks,
    }, null, 2))
    process.exit(allHealthy ? 0 : 1)
    return
  }
  
  // Text format
  console.log(cyan('\n' + '═'.repeat(60)))
  console.log(bold('  GhostSpeak Health Check'))
  console.log(cyan('═'.repeat(60) + '\n'))
  
  checks.forEach(check => {
    const icon = 
      check.status === 'healthy' ? green('✅') :
      check.status === 'degraded' ? yellow('⚠️ ') :
      red('❌')
    
    const statusColor = 
      check.status === 'healthy' ? green :
      check.status === 'degraded' ? yellow :
      red
    
    console.log(`${icon} ${bold(check.name)}`)
    console.log(`   Status: ${statusColor(check.status)}`)
    console.log(`   ${check.message}`)
    
    if (check.latency !== undefined) {
      console.log(`   Latency: ${check.latency}ms`)
    }
    
    if (check.details) {
      console.log(`   Details: ${JSON.stringify(check.details, null, 2).split('\n').join('\n   ')}`)
    }
    
    console.log('')
  })
  
  console.log(cyan('─'.repeat(60)))
  console.log(`Summary: ${green(`${healthy}/${total} healthy`)}${degraded > 0 ? `, ${yellow(`${degraded} degraded`)}` : ''}${unhealthy > 0 ? `, ${red(`${unhealthy} unhealthy`)}` : ''}`)
  console.log(cyan('─'.repeat(60) + '\n'))
  
  if (allHealthy) {
    console.log(green('✅ All systems healthy'))
    process.exit(0)
  } else {
    console.log(red('❌ Some systems are unhealthy'))
    process.exit(1)
  }
}

async function main() {
  console.log(bold('\n🏥 GhostSpeak Health Check\n'))
  
  // Run all checks in parallel
  await Promise.all([
    checkEnvironmentVariables(),
    checkSolanaRpc(),
    checkProgramDeployment(),
    checkConvex(),
  ])
  
  printResults()
}

main().catch((error) => {
  console.error(red('\n❌ Health check failed with error:'))
  console.error(error)
  process.exit(1)
})
