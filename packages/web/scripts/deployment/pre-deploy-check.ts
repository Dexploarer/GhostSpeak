#!/usr/bin/env bun

/**
 * Pre-Deployment Checklist Validator
 *
 * Validates that all critical systems and configurations are ready for mainnet deployment.
 * Run this before deploying to catch issues early.
 *
 * Usage:
 *   bun run scripts/deployment/pre-deploy-check.ts
 */

interface CheckResult {
  name: string
  passed: boolean
  message: string
  critical: boolean // If true, deployment should be blocked
}

const checks: CheckResult[] = []

function addCheck(name: string, passed: boolean, message: string, critical = true) {
  checks.push({ name, passed, message, critical })
}

async function checkEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...\n')

  // Critical production variables
  const required = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SOLANA_RPC_URL',
    'NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID',
    'NEXT_PUBLIC_GHOST_TOKEN_MINT',
    'CROSSMINT_SECRET_KEY',
    'NEXT_PUBLIC_CROSSMINT_API_KEY',
    'CROSSMINT_API_URL',
    'PAYMENT_RECORDER_PRIVATE_KEY',
    'NEXT_PUBLIC_CONVEX_URL',
  ]

  for (const varName of required) {
    const value = process.env[varName]
    const passed = !!value && value.length > 0

    addCheck(`ENV: ${varName}`, passed, passed ? '✅ Configured' : '❌ Missing or empty', true)
  }

  // Check that URLs are production (not localhost)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const isProductionUrl = !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')

  addCheck(
    'ENV: Production URL',
    isProductionUrl,
    isProductionUrl
      ? `✅ Using production URL: ${appUrl}`
      : `⚠️  Still using development URL: ${appUrl}`,
    true
  )

  // Check RPC is mainnet
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || ''
  const isMainnetRpc = rpcUrl.includes('mainnet')

  addCheck(
    'ENV: Mainnet RPC',
    isMainnetRpc,
    isMainnetRpc ? `✅ Using mainnet RPC` : `⚠️  Using non-mainnet RPC: ${rpcUrl}`,
    true
  )

  // Check Crossmint is production
  const crossmintUrl = process.env.CROSSMINT_API_URL || ''
  const isProductionCrossmint = crossmintUrl.includes('www.crossmint.com')

  addCheck(
    'ENV: Crossmint Production',
    isProductionCrossmint,
    isProductionCrossmint
      ? '✅ Using production Crossmint'
      : `⚠️  Using staging Crossmint: ${crossmintUrl}`,
    false // Warn but don't block
  )
}

async function checkServerWallet() {
  console.log('\n💰 Checking Server Wallet...\n')

  try {
    const { getWalletInfo, isServerWalletConfigured } = await import('../../lib/server-wallet')

    if (!isServerWalletConfigured()) {
      addCheck('Server Wallet', false, '❌ Not configured', true)
      return
    }

    const walletInfo = await getWalletInfo()

    // Check balance is sufficient
    const minBalance = 0.5 // Recommend 0.5 SOL minimum for mainnet
    const hasBalance = walletInfo.balanceSol >= minBalance

    addCheck(
      'Server Wallet Balance',
      hasBalance,
      hasBalance
        ? `✅ Balance: ${walletInfo.balanceSol.toFixed(4)} SOL`
        : `⚠️  Low balance: ${walletInfo.balanceSol.toFixed(4)} SOL (minimum: ${minBalance} SOL)`,
      true
    )

    console.log(`   Address: ${walletInfo.address}`)
    console.log(`   Cluster: ${walletInfo.cluster}`)
    console.log(`   Balance: ${walletInfo.balanceSol.toFixed(4)} SOL`)
  } catch (error) {
    addCheck(
      'Server Wallet',
      false,
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      true
    )
  }
}

async function checkHealthEndpoints() {
  console.log('\n🏥 Checking Health Endpoints...\n')

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Check health endpoint
    const healthResponse = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(10000),
    })

    const healthPassed = healthResponse.ok
    addCheck(
      'Health Endpoint',
      healthPassed,
      healthPassed ? '✅ Responding' : `❌ HTTP ${healthResponse.status}`,
      true
    )

    if (healthPassed) {
      const healthData = await healthResponse.json()
      console.log(`   Status: ${healthData.healthy ? '✅ Healthy' : '⚠️  Degraded'}`)
      console.log(`   Checks:`)
      console.log(`     - Convex: ${healthData.checks?.convex?.status || 'unknown'}`)
      console.log(`     - Solana: ${healthData.checks?.solana?.status || 'unknown'}`)
      console.log(`     - Wallet: ${healthData.checks?.serverWallet?.status || 'unknown'}`)
      console.log(`     - Crossmint: ${healthData.checks?.crossmint?.status || 'unknown'}`)
    }
  } catch (error) {
    addCheck(
      'Health Endpoint',
      false,
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      true
    )
  }
}

async function checkDependencies() {
  console.log('\n📦 Checking Dependencies...\n')

  try {
    // Run bun audit
    const { execSync } = await import('child_process')

    const auditOutput = execSync('bun audit --json', {
      cwd: '/Users/home/projects/GhostSpeak/packages/web',
      encoding: 'utf-8',
    })

    const auditData = JSON.parse(auditOutput)
    const criticalVulns = auditData.vulnerabilities?.critical || 0
    const highVulns = auditData.vulnerabilities?.high || 0

    const passed = criticalVulns === 0 && highVulns === 0

    addCheck(
      'Dependency Security',
      passed,
      passed
        ? '✅ No critical or high vulnerabilities'
        : `⚠️  ${criticalVulns} critical, ${highVulns} high vulnerabilities`,
      true
    )
  } catch (error) {
    addCheck('Dependency Security', false, `⚠️  Could not run audit: ${String(error)}`, false)
  }
}

async function checkBuild() {
  console.log('\n🔨 Checking Build...\n')

  try {
    const { existsSync } = await import('fs')
    const buildExists = existsSync('/Users/home/projects/GhostSpeak/packages/web/.next')

    addCheck(
      'Next.js Build',
      buildExists,
      buildExists ? '✅ Build directory exists' : '⚠️  No build found (run: bun run build)',
      false // Warn but don't block (might be CI/CD)
    )
  } catch (error) {
    addCheck('Next.js Build', false, `❌ Error: ${String(error)}`, false)
  }
}

async function checkGitStatus() {
  console.log('\n📝 Checking Git Status...\n')

  try {
    const { execSync } = await import('child_process')

    // Check for uncommitted changes
    const gitStatus = execSync('git status --porcelain', {
      cwd: '/Users/home/projects/GhostSpeak',
      encoding: 'utf-8',
    })

    const hasUncommitted = gitStatus.trim().length > 0

    addCheck(
      'Git Working Directory',
      !hasUncommitted,
      hasUncommitted ? '⚠️  Uncommitted changes detected' : '✅ Clean working directory',
      false // Warn but don't block
    )

    // Check current branch
    const currentBranch = execSync('git branch --show-current', {
      cwd: '/Users/home/projects/GhostSpeak',
      encoding: 'utf-8',
    }).trim()

    console.log(`   Current branch: ${currentBranch}`)
  } catch (error) {
    addCheck('Git Status', false, `⚠️  Could not check git status: ${String(error)}`, false)
  }
}

async function printResults() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 PRE-DEPLOYMENT CHECK RESULTS')
  console.log('='.repeat(80) + '\n')

  const criticalChecks = checks.filter((c) => c.critical)
  const warningChecks = checks.filter((c) => !c.critical)

  const criticalPassed = criticalChecks.every((c) => c.passed)
  const allPassed = checks.every((c) => c.passed)

  console.log('🔴 Critical Checks:\n')
  for (const check of criticalChecks) {
    const icon = check.passed ? '✅' : '❌'
    console.log(`   ${icon} ${check.name}: ${check.message}`)
  }

  console.log('\n⚠️  Warning Checks:\n')
  for (const check of warningChecks) {
    const icon = check.passed ? '✅' : '⚠️ '
    console.log(`   ${icon} ${check.name}: ${check.message}`)
  }

  console.log('\n' + '='.repeat(80))

  if (!criticalPassed) {
    console.log('❌ DEPLOYMENT BLOCKED')
    console.log('   Some critical checks failed. Please fix them before deploying.\n')
    process.exit(1)
  } else if (!allPassed) {
    console.log('⚠️  DEPLOYMENT READY (with warnings)')
    console.log('   All critical checks passed, but some warnings were found.')
    console.log('   Review the warnings above before proceeding.\n')
    process.exit(0)
  } else {
    console.log('✅ DEPLOYMENT READY')
    console.log("   All checks passed! You're ready to deploy to mainnet.\n")
    process.exit(0)
  }
}

// @ts-ignore - Duplicate function error from TypeScript, but this is the only main function
async function main() {
  console.log('🚀 GhostSpeak Pre-Deployment Checklist\n')
  console.log('This script validates that your environment is ready for mainnet deployment.')

  await checkEnvironmentVariables()
  await checkServerWallet()
  await checkHealthEndpoints()
  await checkDependencies()
  await checkBuild()
  await checkGitStatus()

  await printResults()
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
