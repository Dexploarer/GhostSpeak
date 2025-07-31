#!/usr/bin/env bun
/**
 * Test All Commands Script
 * 
 * Automated script to test every GhostSpeak CLI command
 * and generate a comprehensive test report
 */

import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

// Test command definitions
interface TestCommand {
  name: string
  command: string[]
  description: string
  expectedOutput?: string[]
  expectError?: boolean
  timeout?: number
}

const testCommands: TestCommand[] = [
  // Basic commands
  {
    name: 'Version Check',
    command: ['--version'],
    description: 'Display CLI version',
    expectedOutput: ['2.']
  },
  {
    name: 'Help',
    command: ['--help'],
    description: 'Display help information',
    expectedOutput: ['Command-line interface', 'agent', 'marketplace']
  },
  
  // Agent commands
  {
    name: 'Agent Help',
    command: ['agent'],
    description: 'Display agent command help',
    expectedOutput: ['Manage AI agents', 'register', 'list']
  },
  {
    name: 'Agent List',
    command: ['agent', 'list'],
    description: 'List all agents',
    expectedOutput: ['Loading agents']
  },
  {
    name: 'Agent Status Help',
    command: ['agent', 'status', '--help'],
    description: 'Display agent status help',
    expectedOutput: ['Check status']
  },
  
  // Marketplace commands
  {
    name: 'Marketplace Help',
    command: ['marketplace'],
    description: 'Display marketplace help',
    expectedOutput: ['marketplace']
  },
  {
    name: 'Marketplace List',
    command: ['marketplace', 'list'],
    description: 'List marketplace offerings',
    expectedOutput: ['Marketplace']
  },
  
  // Escrow commands
  {
    name: 'Escrow Help',
    command: ['escrow'],
    description: 'Display escrow help',
    expectedOutput: ['escrow']
  },
  
  // Channel commands
  {
    name: 'Channel Help',
    command: ['channel'],
    description: 'Display channel help',
    expectedOutput: ['communication channels', 'channel']
  },
  
  // Auction commands
  {
    name: 'Auction Help',
    command: ['auction', '--help'],
    description: 'Display auction help',
    expectedOutput: ['auction']
  },
  
  // Dispute commands
  {
    name: 'Dispute Help',
    command: ['dispute', '--help'],
    description: 'Display dispute help',
    expectedOutput: ['dispute']
  },
  
  // Governance commands
  {
    name: 'Governance Help',
    command: ['governance', '--help'],
    description: 'Display governance help',
    expectedOutput: ['governance']
  },
  
  // Wallet commands
  {
    name: 'Wallet Help',
    command: ['wallet'],
    description: 'Display wallet help',
    expectedOutput: ['wallet']
  },
  {
    name: 'Wallet Info',
    command: ['wallet', 'info'],
    description: 'Display wallet information',
    timeout: 5000
  },
  
  // Config commands
  {
    name: 'Config Help',
    command: ['config'],
    description: 'Display config help',
    expectedOutput: ['config']
  },
  {
    name: 'Config Show',
    command: ['config', 'show'],
    description: 'Show current configuration',
    timeout: 5000
  },
  
  // Faucet commands
  {
    name: 'Faucet Help',
    command: ['faucet'],
    description: 'Display faucet help',
    expectedOutput: ['faucet', 'SOL']
  },
  
  // SDK commands
  {
    name: 'SDK Help',
    command: ['sdk', '--help'],
    description: 'Display SDK help',
    expectedOutput: ['SDK']
  },
  
  // Help system
  {
    name: 'Help Topics',
    command: ['help'],
    description: 'List help topics',
    expectedOutput: ['help topics', 'documentation']
  },
  {
    name: 'Help Search',
    command: ['help', '-s', 'agent'],
    description: 'Search help for "agent"',
    expectedOutput: ['agent']
  },
  
  // Aliases
  {
    name: 'Show Aliases',
    command: ['aliases'],
    description: 'Display command aliases',
    expectedOutput: ['aliases', 'shortcuts']
  },
  
  // Transaction history
  {
    name: 'Transaction History',
    command: ['transactions'],
    description: 'Show transaction history',
    expectedOutput: ['transaction']
  },
  
  // Onboarding
  {
    name: 'Onboarding Help',
    command: ['onboard', '--help'],
    description: 'Display onboarding help',
    expectedOutput: ['onboarding']
  },
  {
    name: 'Quickstart Help',
    command: ['quickstart'],
    description: 'Display quickstart help',
    expectedOutput: ['setup', 'quick']
  },
  
  // Error cases
  {
    name: 'Unknown Command',
    command: ['unknown-command'],
    description: 'Test unknown command handling',
    expectError: true
  },
  {
    name: 'Invalid Option',
    command: ['agent', '--invalid-option'],
    description: 'Test invalid option handling',
    expectError: true
  }
]

// Run a single CLI command
async function runCommand(args: string[], timeout = 10000): Promise<{
  stdout: string
  stderr: string
  exitCode: number | null
}> {
  return new Promise((resolve) => {
    const cliPath = join(__dirname, '../dist/index.js')
    const proc = spawn('node', [cliPath, ...args], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        GHOSTSPEAK_CONFIG_DIR: join(process.cwd(), '.ghostspeak-test')
      },
      timeout
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
      resolve({ stdout, stderr, exitCode: code })
    })

    proc.on('error', () => {
      resolve({ stdout, stderr, exitCode: -1 })
    })
  })
}

// Test result interface
interface TestResult {
  name: string
  command: string
  status: 'pass' | 'fail'
  duration: number
  output?: string
  error?: string
  details?: string
}

// Main test runner
async function testAllCommands() {
  console.log(`${colors.bold}${colors.cyan}🚀 GhostSpeak CLI Command Test Runner${colors.reset}\n`)
  console.log(`Testing ${testCommands.length} commands...\n`)

  const results: TestResult[] = []
  let passCount = 0
  let failCount = 0

  // Run each test
  for (let i = 0; i < testCommands.length; i++) {
    const test = testCommands[i]
    const commandStr = `gs ${test.command.join(' ')}`
    
    process.stdout.write(`[${i + 1}/${testCommands.length}] ${test.name}... `)
    
    const startTime = Date.now()
    
    try {
      const result = await runCommand(test.command, test.timeout)
      const duration = Date.now() - startTime
      
      let status: 'pass' | 'fail' = 'pass'
      let details = ''
      
      // Check exit code
      if (test.expectError) {
        if (result.exitCode === 0) {
          status = 'fail'
          details = 'Expected error but command succeeded'
        }
      } else {
        if (result.exitCode !== 0) {
          status = 'fail'
          details = `Exit code: ${result.exitCode}`
        }
      }
      
      // Check expected output
      if (status === 'pass' && test.expectedOutput) {
        const output = result.stdout.toLowerCase()
        for (const expected of test.expectedOutput) {
          if (!output.includes(expected.toLowerCase())) {
            status = 'fail'
            details = `Missing expected output: "${expected}"`
            break
          }
        }
      }
      
      // Record result
      results.push({
        name: test.name,
        command: commandStr,
        status,
        duration,
        output: result.stdout.slice(0, 200),
        error: result.stderr,
        details
      })
      
      if (status === 'pass') {
        console.log(`${colors.green}✓${colors.reset} (${duration}ms)`)
        passCount++
      } else {
        console.log(`${colors.red}✗${colors.reset} (${duration}ms)`)
        failCount++
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      console.log(`${colors.red}✗${colors.reset} (${duration}ms)`)
      
      results.push({
        name: test.name,
        command: commandStr,
        status: 'fail',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      failCount++
    }
  }

  // Generate report
  console.log('\n' + '━'.repeat(60) + '\n')
  console.log(`${colors.bold}📊 TEST SUMMARY${colors.reset}\n`)
  
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  
  console.log(`Total Tests: ${colors.bold}${testCommands.length}${colors.reset}`)
  console.log(`Passed: ${colors.green}${passCount}${colors.reset}`)
  console.log(`Failed: ${colors.red}${failCount}${colors.reset}`)
  console.log(`Total Duration: ${colors.blue}${totalDuration}ms${colors.reset}`)
  console.log(`Average Duration: ${colors.blue}${Math.round(totalDuration / testCommands.length)}ms${colors.reset}`)
  
  // Show failed tests
  if (failCount > 0) {
    console.log(`\n${colors.bold}${colors.red}❌ FAILED TESTS:${colors.reset}\n`)
    
    results.filter(r => r.status === 'fail').forEach(result => {
      console.log(`${colors.red}✗${colors.reset} ${result.name}`)
      console.log(`  Command: ${colors.cyan}${result.command}${colors.reset}`)
      if (result.details) {
        console.log(`  Details: ${result.details}`)
      }
      if (result.error) {
        console.log(`  Error: ${result.error.trim()}`)
      }
      console.log()
    })
  }
  
  // Generate detailed report
  const reportPath = join(__dirname, '../test-report.json')
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testCommands.length,
      passed: passCount,
      failed: failCount,
      duration: totalDuration
    },
    results
  }
  
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Detailed report saved to: ${colors.cyan}${reportPath}${colors.reset}`)
  
  // Exit with appropriate code
  if (failCount === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 All tests passed!${colors.reset}`)
    process.exit(0)
  } else {
    console.log(`\n${colors.red}${colors.bold}⚠️  Some tests failed${colors.reset}`)
    process.exit(1)
  }
}

// Create test directory if needed
const testDir = join(process.cwd(), '.ghostspeak-test')
if (!existsSync(testDir)) {
  mkdirSync(testDir, { recursive: true })
}

// Check if CLI is built
const cliPath = join(__dirname, '../dist/index.js')
if (!existsSync(cliPath)) {
  console.error(`${colors.red}Error: CLI not built. Run 'bun run build' first.${colors.reset}`)
  process.exit(1)
}

// Run tests
testAllCommands().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})