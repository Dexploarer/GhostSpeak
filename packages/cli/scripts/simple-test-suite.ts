#!/usr/bin/env bun
/**
 * Simple Working Test Suite for GhostSpeak CLI & SDK
 * 
 * This is a minimal, non-hanging test suite that actually works
 * and tests real functionality without getting stuck.
 */

import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface TestResult {
  name: string
  success: boolean
  duration: number
  output?: string
  error?: string
}

// Simple CLI command executor with short timeout
async function runCLICommand(command: string[], timeoutMs: number = 5000): Promise<{
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
}> {
  return new Promise((resolve) => {
    const cliPath = join(__dirname, '../dist/index.js')
    const child = spawn('node', [cliPath, ...command], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    })
    
    let stdout = ''
    let stderr = ''
    let resolved = false
    
    const cleanup = () => {
      if (!resolved) {
        resolved = true
        try {
          child.kill('SIGTERM')
        } catch (e) {
          // Ignore
        }
      }
    }
    
    child.stdout?.on('data', (data) => { stdout += data.toString() })
    child.stderr?.on('data', (data) => { stderr += data.toString() })
    
    child.on('close', (code) => {
      if (!resolved) {
        resolved = true
        resolve({
          success: (code ?? -1) === 0,
          stdout,
          stderr,
          exitCode: code ?? -1
        })
      }
    })
    
    child.on('error', (error) => {
      cleanup()
      if (!resolved) {
        resolved = true
        resolve({
          success: false,
          stdout,
          stderr: stderr + `\nProcess error: ${error.message}`,
          exitCode: -1
        })
      }
    })
    
    // Short timeout to prevent hanging
    setTimeout(() => {
      cleanup()
      if (!resolved) {
        resolved = true
        resolve({
          success: false,
          stdout,
          stderr: stderr + `\nTimeout after ${timeoutMs}ms`,
          exitCode: -1
        })
      }
    }, timeoutMs)
  })
}

// Test functions
async function testCLIBasics(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const result = await runCLICommand(['--help'])
    
    return {
      name: 'CLI Basic Help Command',
      success: result.success && result.stdout.includes('GhostSpeak'),
      duration: Date.now() - startTime,
      output: result.stdout.slice(0, 200)
    }
  } catch (error) {
    return {
      name: 'CLI Basic Help Command',
      success: false,
      duration: Date.now() - startTime,
      error: String(error)
    }
  }
}

async function testAgentCommands(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const result = await runCLICommand(['agent', '--help'])
    
    return {
      name: 'Agent Commands Available',
      success: result.success && result.stdout.includes('agent'),
      duration: Date.now() - startTime,
      output: result.stdout.slice(0, 200)
    }
  } catch (error) {
    return {
      name: 'Agent Commands Available',
      success: false,
      duration: Date.now() - startTime,
      error: String(error)
    }
  }
}

async function testMarketplaceCommands(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const result = await runCLICommand(['marketplace', '--help'])
    
    return {
      name: 'Marketplace Commands Available',
      success: result.success && result.stdout.includes('marketplace'),
      duration: Date.now() - startTime,
      output: result.stdout.slice(0, 200)
    }
  } catch (error) {
    return {
      name: 'Marketplace Commands Available',
      success: false,
      duration: Date.now() - startTime,
      error: String(error)
    }
  }
}

async function testEscrowCommands(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const result = await runCLICommand(['escrow', '--help'])
    
    return {
      name: 'Escrow Commands Available',
      success: result.success && result.stdout.includes('escrow'),
      duration: Date.now() - startTime,
      output: result.stdout.slice(0, 200)
    }
  } catch (error) {
    return {
      name: 'Escrow Commands Available',
      success: false,
      duration: Date.now() - startTime,
      error: String(error)
    }
  }
}

async function testGovernanceCommands(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const result = await runCLICommand(['governance', '--help'])
    
    return {
      name: 'Governance Commands Available',
      success: result.success && result.stdout.includes('governance'),
      duration: Date.now() - startTime,
      output: result.stdout.slice(0, 200)
    }
  } catch (error) {
    return {
      name: 'Governance Commands Available',
      success: false,
      duration: Date.now() - startTime,
      error: String(error)
    }
  }
}

async function testWalletCommands(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const result = await runCLICommand(['wallet', '--help'])
    
    return {
      name: 'Wallet Commands Available',
      success: result.success && result.stdout.includes('wallet'),
      duration: Date.now() - startTime,
      output: result.stdout.slice(0, 200)
    }
  } catch (error) {
    return {
      name: 'Wallet Commands Available',
      success: false,
      duration: Date.now() - startTime,
      error: String(error)
    }
  }
}

async function testConfigCommands(): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const result = await runCLICommand(['config', '--help'])
    
    return {
      name: 'Config Commands Available',
      success: result.success && result.stdout.includes('config'),
      duration: Date.now() - startTime,
      output: result.stdout.slice(0, 200)
    }
  } catch (error) {
    return {
      name: 'Config Commands Available',
      success: false,
      duration: Date.now() - startTime,
      error: String(error)
    }
  }
}

// Main test execution
async function main() {
  console.log('🚀 Simple GhostSpeak Test Suite')
  console.log('Testing core CLI functionality without hanging\n')
  
  const tests = [
    testCLIBasics,
    testAgentCommands,
    testMarketplaceCommands,
    testEscrowCommands,
    testGovernanceCommands,
    testWalletCommands,
    testConfigCommands
  ]
  
  const results: TestResult[] = []
  let passed = 0
  let failed = 0
  
  for (let i = 0; i < tests.length; i++) {
    const testFn = tests[i]
    process.stdout.write(`[${i + 1}/${tests.length}] Running ${testFn.name}... `)
    
    try {
      const result = await testFn()
      results.push(result)
      
      if (result.success) {
        console.log(`✓ (${result.duration}ms)`)
        passed++
      } else {
        console.log(`✗ (${result.duration}ms)`)
        if (result.error) {
          console.log(`    Error: ${result.error}`)
        }
        failed++
      }
    } catch (error) {
      console.log(`✗ (crashed)`)
      console.log(`    Error: ${error}`)
      failed++
    }
  }
  
  console.log('\n📊 Test Results Summary:')
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • ${r.name}: ${r.error || 'Unknown error'}`)
    })
  }
  
  console.log('\n🎉 Simple test suite completed!')
  
  return passed === tests.length
}

// Run the tests
main().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Test suite crashed:', error)
  process.exit(1)
})