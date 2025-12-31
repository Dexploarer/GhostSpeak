#!/usr/bin/env bun

/**
 * Server Wallet Auto-Refill Script
 *
 * Monitors server wallet balance and sends alerts or auto-refills when low.
 * Can be run as a cron job or background process.
 *
 * Usage:
 *   bun run scripts/deployment/wallet-auto-refill.ts --check    # Check balance once
 *   bun run scripts/deployment/wallet-auto-refill.ts --monitor  # Continuous monitoring
 *   bun run scripts/deployment/wallet-auto-refill.ts --alert    # Send alert if low
 */

const MIN_BALANCE_SOL = 0.1 // Alert threshold
const CRITICAL_BALANCE_SOL = 0.05 // Critical threshold
const CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

interface WalletStatus {
  address: string
  balanceSol: number
  cluster: string
  status: 'healthy' | 'low' | 'critical'
}

async function checkWalletBalance(): Promise<WalletStatus> {
  const { getWalletInfo } = await import('../../lib/server-wallet')

  const info = await getWalletInfo()

  let status: 'healthy' | 'low' | 'critical'
  if (info.balanceSol <= CRITICAL_BALANCE_SOL) {
    status = 'critical'
  } else if (info.balanceSol <= MIN_BALANCE_SOL) {
    status = 'low'
  } else {
    status = 'healthy'
  }

  return {
    address: info.address,
    balanceSol: info.balanceSol,
    cluster: info.cluster,
    status,
  }
}

async function sendAlert(walletStatus: WalletStatus) {
  console.log('\n🚨 SERVER WALLET ALERT\n')
  console.log(`Status: ${walletStatus.status.toUpperCase()}`)
  console.log(`Address: ${walletStatus.address}`)
  console.log(`Balance: ${walletStatus.balanceSol.toFixed(4)} SOL`)
  console.log(`Cluster: ${walletStatus.cluster}`)

  // TODO: Send alerts via Sentry, Slack, email, etc.
  // Example integrations:

  // 1. Sentry
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureMessage(`Server wallet balance ${walletStatus.status}: ${walletStatus.balanceSol.toFixed(4)} SOL`, {
        level: walletStatus.status === 'critical' ? 'error' : 'warning',
        tags: {
          wallet: walletStatus.address,
          cluster: walletStatus.cluster,
        },
        contexts: {
          wallet: {
            balance: walletStatus.balanceSol,
            threshold: walletStatus.status === 'critical' ? CRITICAL_BALANCE_SOL : MIN_BALANCE_SOL,
          },
        },
      })
      console.log('✅ Alert sent to Sentry')
    } catch (error) {
      console.error('❌ Failed to send Sentry alert:', error)
    }
  }

  // 2. Slack (if webhook URL configured)
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Server Wallet ${walletStatus.status.toUpperCase()}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Server Wallet Balance Alert*\n\n` +
                  `Status: *${walletStatus.status.toUpperCase()}*\n` +
                  `Balance: ${walletStatus.balanceSol.toFixed(4)} SOL\n` +
                  `Threshold: ${walletStatus.status === 'critical' ? CRITICAL_BALANCE_SOL : MIN_BALANCE_SOL} SOL\n` +
                  `Cluster: ${walletStatus.cluster}\n` +
                  `Address: \`${walletStatus.address}\``,
              },
            },
          ],
        }),
      })
      console.log('✅ Alert sent to Slack')
    } catch (error) {
      console.error('❌ Failed to send Slack alert:', error)
    }
  }

  // 3. Email (if configured)
  // TODO: Add email integration (SendGrid, AWS SES, etc.)

  console.log('\n💡 Refill Instructions:')
  if (walletStatus.cluster === 'mainnet-beta') {
    console.log(`   1. Send SOL to: ${walletStatus.address}`)
    console.log(`   2. Recommended amount: 1 SOL`)
    console.log(`   3. Monitor at: https://explorer.solana.com/address/${walletStatus.address}`)
  } else {
    console.log(`   Run: bun run scripts/fund-server-wallet.ts --fund`)
  }
}

async function monitorContinuously() {
  console.log('🔄 Starting continuous wallet monitoring...')
  console.log(`   Check interval: ${CHECK_INTERVAL_MS / 1000} seconds`)
  console.log(`   Low threshold: ${MIN_BALANCE_SOL} SOL`)
  console.log(`   Critical threshold: ${CRITICAL_BALANCE_SOL} SOL\n`)

  let consecutiveCritical = 0

  while (true) {
    try {
      const status = await checkWalletBalance()

      console.log(`[${new Date().toISOString()}] Balance: ${status.balanceSol.toFixed(4)} SOL (${status.status})`)

      if (status.status === 'critical') {
        consecutiveCritical++

        // Send alert on first critical or every 10th check
        if (consecutiveCritical === 1 || consecutiveCritical % 10 === 0) {
          await sendAlert(status)
        }
      } else if (status.status === 'low') {
        consecutiveCritical = 0

        // Send alert once when low
        if (consecutiveCritical === 0) {
          await sendAlert(status)
        }
      } else {
        consecutiveCritical = 0
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error checking wallet:`, error)
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS))
  }
}

async function runSingleCheck() {
  console.log('💰 Checking server wallet balance...\n')

  const status = await checkWalletBalance()

  console.log(`Address: ${status.address}`)
  console.log(`Balance: ${status.balanceSol.toFixed(4)} SOL`)
  console.log(`Cluster: ${status.cluster}`)
  console.log(`Status:  ${status.status === 'healthy' ? '✅' : status.status === 'low' ? '⚠️' : '🚨'} ${status.status.toUpperCase()}\n`)

  if (status.status !== 'healthy') {
    console.log('⚠️  Wallet balance is low. Consider refilling.\n')
  }
}

async function runAlertCheck() {
  console.log('🔔 Running alert check...\n')

  const status = await checkWalletBalance()

  if (status.status !== 'healthy') {
    await sendAlert(status)
  } else {
    console.log('✅ Wallet balance is healthy. No alerts sent.\n')
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || '--check'

  switch (command) {
    case '--check':
      await runSingleCheck()
      break

    case '--monitor':
      await monitorContinuously()
      break

    case '--alert':
      await runAlertCheck()
      break

    case '--help':
    case '-h':
      console.log(`
Usage:
  bun run scripts/deployment/wallet-auto-refill.ts [command]

Commands:
  --check    Check wallet balance once and display status (default)
  --monitor  Continuously monitor wallet and send alerts when low
  --alert    Check balance and send alert if low (for cron jobs)
  --help     Show this help message

Environment Variables:
  SLACK_WEBHOOK_URL         Slack webhook URL for alerts (optional)
  NEXT_PUBLIC_SENTRY_DSN    Sentry DSN for error tracking (optional)

Examples:
  bun run scripts/deployment/wallet-auto-refill.ts --check
  bun run scripts/deployment/wallet-auto-refill.ts --monitor
  bun run scripts/deployment/wallet-auto-refill.ts --alert

Cron Job Setup (check every 5 minutes):
  */5 * * * * cd /path/to/ghostspeak && bun run packages/web/scripts/deployment/wallet-auto-refill.ts --alert
      `)
      break

    default:
      console.error(`❌ Unknown command: ${command}`)
      console.log('Run with --help for usage information')
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
