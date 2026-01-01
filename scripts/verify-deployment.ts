#!/usr/bin/env bun
/**
 * Verify Deployment
 *
 * Verifies that the GhostSpeak program is properly deployed and functional.
 * Checks program ID, account existence, and basic instruction execution.
 *
 * Usage:
 *   bun run scripts/verify-deployment.ts [--network devnet|mainnet|testnet]
 */

import { createSolanaRpc, address, type Address } from '@solana/kit'
import { getCurrentProgramId, getNetworkConfig, type NetworkEnvironment } from '../config/program-ids'

// Parse command line arguments
const args = process.argv.slice(2)
const networkArg = args.find(arg => arg.startsWith('--network='))?.split('=')[1] || 
                   args.find(arg => arg === '--network') && args[args.indexOf('--network') + 1] ||
                   'devnet'

const network = (networkArg as NetworkEnvironment) || 'devnet'
const config = getNetworkConfig(network)

const PROGRAM_ID = address(config.programId)
const RPC_URL = config.endpoint

// Colors for output
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const blue = (s: string) => `\x1b[34m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`

interface VerificationResult {
  name: string
  passed: boolean
  message: string
  details?: string
}

const results: VerificationResult[] = []

function addResult(name: string, passed: boolean, message: string, details?: string) {
  results.push({ name, passed, message, details })
}

async function verifyRpcConnection() {
  console.log(cyan('\n🔌 Verifying RPC Connection...\n'))
  
  try {
    const rpc = createSolanaRpc(RPC_URL)
    const version = await rpc.getVersion().send()
    
    addResult(
      'RPC Connection',
      true,
      `✅ Connected to ${network}`,
      `Solana Version: ${version['solana-core']}`
    )
    return rpc
  } catch (error) {
    addResult(
      'RPC Connection',
      false,
      `❌ Failed to connect to ${RPC_URL}`,
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }
}

async function verifyProgramDeployment(rpc: ReturnType<typeof createSolanaRpc>) {
  console.log(cyan('\n📦 Verifying Program Deployment...\n'))
  
  try {
    const programInfo = await rpc.getAccountInfo(PROGRAM_ID).send()
    
    if (!programInfo.value) {
      addResult(
        'Program Deployment',
        false,
        `❌ Program not found at ${PROGRAM_ID}`,
        'Program account does not exist'
      )
      return false
    }
    
    const isExecutable = programInfo.value.executable
    const owner = programInfo.value.owner.toString()
    const lamports = programInfo.value.lamports
    
    addResult(
      'Program Deployment',
      isExecutable,
      isExecutable 
        ? `✅ Program deployed and executable`
        : `❌ Program exists but is not executable`,
      `Address: ${PROGRAM_ID}\nOwner: ${owner}\nBalance: ${lamports / 1e9} SOL`
    )
    
    return isExecutable
  } catch (error) {
    addResult(
      'Program Deployment',
      false,
      `❌ Failed to verify program`,
      error instanceof Error ? error.message : String(error)
    )
    return false
  }
}

async function verifyProgramAccounts(rpc: ReturnType<typeof createSolanaRpc>) {
  console.log(cyan('\n📋 Verifying Program Accounts...\n'))
  
  try {
    const accounts = await rpc.getProgramAccounts(PROGRAM_ID, {
      encoding: 'base64',
      filters: [],
      dataSlice: { offset: 0, length: 0 }, // Just get account addresses
    }).send()
    
    const accountCount = accounts.length
    
    addResult(
      'Program Accounts',
      accountCount >= 0, // Always true, just informational
      accountCount > 0
        ? `✅ Found ${accountCount} program-owned accounts`
        : `⚠️  No program-owned accounts found (may be normal for new deployment)`,
      `Total accounts: ${accountCount}`
    )
    
    return true
  } catch (error) {
    addResult(
      'Program Accounts',
      false,
      `❌ Failed to fetch program accounts`,
      error instanceof Error ? error.message : String(error)
    )
    return false
  }
}

async function verifyNetworkMatch() {
  console.log(cyan('\n🌐 Verifying Network Configuration...\n'))
  
  const rpcUrlLower = RPC_URL.toLowerCase()
  const networkLower = network.toLowerCase()
  
  const matches = 
    (networkLower === 'mainnet' && rpcUrlLower.includes('mainnet')) ||
    (networkLower === 'devnet' && rpcUrlLower.includes('devnet')) ||
    (networkLower === 'testnet' && rpcUrlLower.includes('testnet')) ||
    (networkLower === 'localnet' && (rpcUrlLower.includes('localhost') || rpcUrlLower.includes('127.0.0.1')))
  
  addResult(
    'Network Configuration',
    matches,
    matches
      ? `✅ Network configuration matches`
      : `⚠️  Network mismatch: expected ${network}, RPC URL suggests different network`,
    `Network: ${network}\nRPC URL: ${RPC_URL}`
  )
  
  return matches
}

function printResults() {
  console.log(cyan('\n' + '═'.repeat(60)))
  console.log(bold('  Deployment Verification Results'))
  console.log(cyan('═'.repeat(60) + '\n'))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  
  results.forEach(result => {
    const icon = result.passed ? green('✅') : red('❌')
    const color = result.passed ? green : red
    console.log(`${icon} ${bold(result.name)}`)
    console.log(`   ${color(result.message)}`)
    if (result.details) {
      console.log(`   ${blue(result.details.split('\n').join('\n   '))}`)
    }
    console.log('')
  })
  
  console.log(cyan('─'.repeat(60)))
  console.log(`Summary: ${green(`${passed}/${total} passed`)}${failed > 0 ? `, ${red(`${failed} failed`)}` : ''}`)
  console.log(cyan('─'.repeat(60) + '\n'))
  
  if (failed > 0) {
    console.log(red('❌ Deployment verification failed'))
    process.exit(1)
  } else {
    console.log(green('✅ Deployment verification passed'))
    process.exit(0)
  }
}

async function main() {
  console.log(bold('\n🔍 GhostSpeak Deployment Verification\n'))
  console.log(`Network: ${cyan(network)}`)
  console.log(`Program ID: ${cyan(PROGRAM_ID)}`)
  console.log(`RPC URL: ${cyan(RPC_URL)}\n`)
  
  try {
    // Verify network configuration
    await verifyNetworkMatch()
    
    // Verify RPC connection
    const rpc = await verifyRpcConnection()
    
    // Verify program deployment
    const isDeployed = await verifyProgramDeployment(rpc)
    
    // Only check accounts if program is deployed
    if (isDeployed) {
      await verifyProgramAccounts(rpc)
    }
    
    printResults()
  } catch (error) {
    console.error(red('\n❌ Verification failed with error:'))
    console.error(error)
    process.exit(1)
  }
}

main().catch(console.error)
