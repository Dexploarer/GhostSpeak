#!/usr/bin/env bun

/**
 * Smart test runner that manages test execution based on available resources
 * and test characteristics
 */

import { spawn } from 'child_process'
import { cpus } from 'os'

interface TestGroup {
  name: string
  pattern: string
  timeout: number
  workers?: number
}

const testGroups: TestGroup[] = [
  {
    name: 'Quick Utils',
    pattern: 'tests/unit/utils/*.test.ts !tests/unit/utils/wasm-crypto-bridge.test.ts !tests/unit/utils/bulletproofs.test.ts',
    timeout: 10000,
    workers: 4
  },
  {
    name: 'Client Tests',
    pattern: 'tests/unit/client/**/*.test.ts',
    timeout: 15000,
    workers: 2
  },
  {
    name: 'Crypto Tests (Fast)',
    pattern: 'tests/unit/crypto/*.test.ts !tests/unit/crypto/elgamal-complete.test.ts',
    timeout: 20000,
    workers: 2
  },
  {
    name: 'Heavy Crypto Tests',
    pattern: 'tests/unit/crypto/elgamal-complete.test.ts tests/unit/utils/bulletproofs.test.ts tests/unit/utils/wasm-crypto-bridge.test.ts',
    timeout: 120000,
    workers: 1
  },
  {
    name: 'Integration Tests',
    pattern: 'tests/integration/**/*.test.ts',
    timeout: 30000,
    workers: 1
  }
]

async function runTestGroup(group: TestGroup) {
  console.log(`\n🧪 Running ${group.name}...`)
  
  const env = {
    ...process.env,
    VITEST_POOL_WORKERS: String(group.workers || 1),
    VITEST_TEST_TIMEOUT: String(group.timeout)
  }
  
  return new Promise<boolean>((resolve) => {
    const child = spawn('vitest', ['run', group.pattern, '--reporter=dot'], {
      stdio: 'inherit',
      env,
      shell: true
    })
    
    child.on('exit', (code) => {
      resolve(code === 0)
    })
  })
}

async function main() {
  const args = process.argv.slice(2)
  const runAll = args.includes('--all')
  const runQuick = args.includes('--quick')
  const runCoverage = args.includes('--coverage')
  
  console.log('🚀 GhostSpeak Test Runner')
  console.log(`📊 CPU cores available: ${cpus().length}`)
  
  let groupsToRun = testGroups
  
  if (runQuick) {
    groupsToRun = testGroups.filter(g => !g.name.includes('Heavy') && !g.name.includes('Integration'))
    console.log('⚡ Running quick tests only')
  }
  
  const startTime = Date.now()
  const results: { group: string; success: boolean }[] = []
  
  for (const group of groupsToRun) {
    const success = await runTestGroup(group)
    results.push({ group: group.name, success })
    
    if (!success && !runAll) {
      console.error(`❌ ${group.name} failed. Stopping test run.`)
      break
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  
  console.log('\n📋 Test Summary:')
  console.log('================')
  
  let allPassed = true
  for (const result of results) {
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${result.group}`)
    if (!result.success) allPassed = false
  }
  
  console.log(`\n⏱️  Total time: ${duration}s`)
  
  if (runCoverage && allPassed) {
    console.log('\n📊 Running coverage report...')
    spawn('vitest', ['run', '--coverage'], { stdio: 'inherit' })
  }
  
  process.exit(allPassed ? 0 : 1)
}

main().catch(console.error)