#!/usr/bin/env bun
/**
 * Devnet Integration Testing Script
 *
 * Tests all CLI commands against the deployed GhostSpeak program on devnet
 * to verify they perform real on-chain transactions
 */

import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { homedir } from 'os'

// Type declaration for Bun global (when running with Bun)
declare const Bun: {
  write: (path: string, data: string) => Promise<void>
} | undefined

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
}

const CLI_PATH = join(__dirname, '../dist/index.js')
const TEST_CONFIG_DIR = join(homedir(), '.ghostspeak-devnet-test')

// Test results tracking
interface TestResult {
  name: string
  command: string[]
  success: boolean
  duration: number
  output: string
  error?: string
  transactionSignature?: string
  explorerUrl?: string
}

const testResults: TestResult[] = []

// Helper to run CLI commands
async function runCLI(args: string[], options?: {
  input?: string[]
  timeout?: number
  expectFailure?: boolean
}): Promise<{
  stdout: string
  stderr: string
  exitCode: number | null
}> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      GHOSTSPEAK_CONFIG_DIR: TEST_CONFIG_DIR,
      NODE_ENV: 'test'
    }

    const proc = spawn('node', [CLI_PATH, ...args], {
      env,
      timeout: options?.timeout ?? 30000 // 30 second timeout for blockchain operations
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    // Handle input if provided
    if (options?.input) {
      let inputIndex = 0
      const sendNextInput = () => {
        if (inputIndex < options.input!.length) {
          setTimeout(() => {
            proc.stdin.write(options.input![inputIndex] + '\n')
            inputIndex++
            sendNextInput()
          }, 1000) // Wait 1 second between inputs
        } else {
          // Close stdin after all inputs
          setTimeout(() => {
            proc.stdin.end()
          }, 2000)
        }
      }
      sendNextInput()
    }

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code })
    })

    proc.on('error', (error) => {
      if (options?.expectFailure) {
        resolve({ stdout, stderr, exitCode: -1 })
      } else {
        reject(error)
      }
    })
  })
}

// Extract transaction signature from CLI output
function extractTransactionSignature(output: string): string | undefined {
  const txRegex = /Transaction[:\s]+([a-zA-Z0-9]{87,88})/i
  const sigRegex = /Signature[:\s]+([a-zA-Z0-9]{87,88})/i
  const urlRegex = /explorer\.solana\.com\/tx\/([a-zA-Z0-9]{87,88})/
  
  const txMatch = output.match(txRegex)
  const sigMatch = output.match(sigRegex)
  const urlMatch = output.match(urlRegex)
  
  return txMatch?.[1] || sigMatch?.[1] || urlMatch?.[1]
}

// Check if transaction exists on devnet explorer
async function verifyTransactionOnChain(signature: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.devnet.solana.com`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          signature,
          {
            encoding: 'json',
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          }
        ]
      })
    })
    
    const data = await response.json() as { result: unknown | null }
    return data.result !== null
  } catch (error) {
    console.warn(`Failed to verify transaction ${signature}:`, error)
    return false
  }
}

// Test individual command
async function testCommand(
  name: string,
  command: string[],
  inputs?: string[],
  options?: { expectFailure?: boolean }
): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    console.log(`${colors.blue}Testing:${colors.reset} ${name}`)
    console.log(`${colors.dim}Command: gs ${command.join(' ')}${colors.reset}`)
    
    const result = await runCLI(command, { 
      input: inputs,
      expectFailure: options?.expectFailure 
    })
    const duration = Date.now() - startTime
    
    const output = result.stdout + result.stderr
    const signature = extractTransactionSignature(output)
    
    let explorerUrl: string | undefined
    let onChainVerified = false
    
    if (signature) {
      explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      onChainVerified = await verifyTransactionOnChain(signature)
      
      if (onChainVerified) {
        console.log(`${colors.green}✅ Transaction verified on-chain${colors.reset}`)
        console.log(`${colors.dim}Explorer: ${explorerUrl}${colors.reset}`)
      } else {
        console.log(`${colors.red}❌ Transaction not found on-chain${colors.reset}`)
      }
    }
    
    const success = options?.expectFailure ? result.exitCode !== 0 : result.exitCode === 0
    
    return {
      name,
      command,
      success: success && (!signature || onChainVerified),
      duration,
      output,
      transactionSignature: signature,
      explorerUrl
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      name,
      command,
      success: false,
      duration,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Main testing function
async function runDevnetTests() {
  console.log(`${colors.bold}${colors.cyan}🚀 GhostSpeak Devnet Integration Tests${colors.reset}\n`)
  console.log(`${colors.yellow}Testing CLI commands against deployed program on devnet${colors.reset}`)
  console.log(`${colors.dim}Program ID: GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX${colors.reset}\n`)
  
  // Setup test environment
  if (existsSync(TEST_CONFIG_DIR)) {
    rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
  }
  mkdirSync(TEST_CONFIG_DIR, { recursive: true })
  
  console.log('━'.repeat(60))
  console.log(`${colors.bold}Phase 1: Environment Setup${colors.reset}`)
  console.log('━'.repeat(60))
  
  // Test 1: Check version
  testResults.push(await testCommand(
    'CLI Version Check',
    ['--version']
  ))
  
  // Test 2: Create wallet
  testResults.push(await testCommand(
    'Create Wallet',
    ['wallet', 'create'],
    ['test-wallet', 'y'] // wallet name, confirm
  ))
  
  // Test 3: Get SOL from faucet
  console.log('\n⏳ Getting SOL from faucet (may take 10-30 seconds)...')
  testResults.push(await testCommand(
    'Faucet Request',
    ['faucet', '--amount', '2', '--save']
  ))
  
  console.log('\n━'.repeat(60))
  console.log(`${colors.bold}Phase 2: Agent Operations${colors.reset}`)
  console.log('━'.repeat(60))
  
  // Test 4: Register agent
  console.log('\n⏳ Registering agent (this should create on-chain transaction)...')
  testResults.push(await testCommand(
    'Agent Registration',
    ['agent', 'register'],
    [
      'Test Agent',              // name
      'A test agent for devnet', // description
      'automation',              // capability
      'y'                        // confirm
    ]
  ))
  
  // Test 5: List agents
  testResults.push(await testCommand(
    'Agent Listing',
    ['agent', 'list']
  ))
  
  console.log('\n━'.repeat(60))
  console.log(`${colors.bold}Phase 3: Marketplace Operations${colors.reset}`)
  console.log('━'.repeat(60))
  
  // Test 6: Create marketplace listing
  console.log('\n⏳ Creating marketplace listing...')
  testResults.push(await testCommand(
    'Marketplace Create',
    ['marketplace', 'create'],
    [
      'Test Service',                    // title
      'A test service for devnet',       // description
      'automation',                      // category
      '0.1',                            // price in SOL
      'y'                               // confirm
    ]
  ))
  
  // Test 7: List marketplace
  testResults.push(await testCommand(
    'Marketplace Listing',
    ['marketplace', 'list']
  ))
  
  console.log('\n━'.repeat(60))
  console.log(`${colors.bold}Phase 4: Escrow Operations${colors.reset}`)
  console.log('━'.repeat(60))
  
  // Test 8: Create escrow (this will likely fail without a provider address)
  console.log('\n⏳ Testing escrow creation...')
  testResults.push(await testCommand(
    'Escrow Creation',
    ['escrow', 'create'],
    [
      'GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX', // dummy provider address
      'Test Work Order',                              // title
      '0.05',                                        // amount
      'y'                                            // confirm
    ]
  ))
  
  console.log('\n━'.repeat(60))
  console.log(`${colors.bold}📊 Test Results Summary${colors.reset}`)
  console.log('━'.repeat(60))
  
  const totalTests = testResults.length
  const passedTests = testResults.filter(r => r.success).length
  const failedTests = totalTests - passedTests
  const onChainTransactions = testResults.filter(r => r.transactionSignature).length
  
  console.log(`\n${colors.bold}Overall Results:${colors.reset}`)
  console.log(`Total Tests: ${colors.bold}${totalTests}${colors.reset}`)
  console.log(`Passed: ${colors.green}${passedTests}${colors.reset}`)
  console.log(`Failed: ${colors.red}${failedTests}${colors.reset}`)
  console.log(`On-Chain Transactions: ${colors.cyan}${onChainTransactions}${colors.reset}`)
  
  console.log(`\n${colors.bold}Detailed Results:${colors.reset}`)
  testResults.forEach((result, index) => {
    const status = result.success ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`
    const duration = `${result.duration}ms`
    const txInfo = result.transactionSignature ? 
      `\n   ${colors.dim}Transaction: ${result.transactionSignature}${colors.reset}` +
      `\n   ${colors.dim}Explorer: ${result.explorerUrl}${colors.reset}` : ''
    
    console.log(`\n${index + 1}. ${result.name} - ${status} (${duration})${txInfo}`)
    
    if (!result.success && result.error) {
      console.log(`   ${colors.red}Error: ${result.error}${colors.reset}`)
    }
  })
  
  console.log('\n━'.repeat(60))
  
  if (onChainTransactions === 0) {
    console.log(`${colors.red}${colors.bold}⚠️  WARNING: No on-chain transactions detected!${colors.reset}`)
    console.log(`${colors.red}This suggests CLI commands are using mocks/simulations.${colors.reset}`)
  } else if (onChainTransactions > 0) {
    console.log(`${colors.green}${colors.bold}✅ SUCCESS: Detected ${onChainTransactions} on-chain transactions!${colors.reset}`)
    console.log(`${colors.green}CLI commands are performing real blockchain operations.${colors.reset}`)
  }
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    programId: 'GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX',
    network: 'devnet',
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      onChainTransactions
    },
    results: testResults
  }
  
  const reportPath = join(__dirname, '../devnet-test-report.json')
  // Use Bun.write if available (when running with Bun), otherwise use Node.js fs
  if (typeof Bun !== 'undefined') {
    await Bun.write(reportPath, JSON.stringify(report, null, 2))
  } else {
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
  }
  console.log(`\n📄 Detailed report saved to: ${colors.cyan}${reportPath}${colors.reset}`)
  
  process.exit(failedTests > 0 ? 1 : 0)
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user')
  process.exit(1)
})

// Run tests
if (!existsSync(CLI_PATH)) {
  console.error(`${colors.red}Error: CLI not built. Run 'bun run build' first.${colors.reset}`)
  process.exit(1)
}

runDevnetTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})