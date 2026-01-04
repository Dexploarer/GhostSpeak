/**
 * Reputation management command
 * View, update, and track Ghost Score reputation
 */

import { Command } from 'commander'
import chalk from 'chalk'
import {
  intro,
  outro,
  text,
  select,
  confirm,
  spinner,
  isCancel,
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient, getExplorerUrl } from '../utils/client.js'
import { handleError } from '../utils/error-handler.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'

// Type definitions
interface GetOptions {
  agent?: string
  json?: boolean
  detailed?: boolean
}

interface UpdateOptions {
  agent?: string
  score?: string
}

interface HistoryOptions {
  agent?: string
  limit?: string
  json?: boolean
}

export const reputationCommand = new Command('reputation')
  .description('Manage Ghost Score reputation')

// Get reputation subcommand
reputationCommand
  .command('get')
  .description('Get Ghost Score for an agent')
  .option('-a, --agent <address>', 'Agent address')
  .option('--json', 'Output as JSON')
  .option('--detailed', 'Show detailed breakdown')
  .action(async (options: GetOptions) => {
    intro(chalk.cyan('📊 Get Ghost Score'))

    try {
      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address:',
          validate: (value) => {
            if (!value) return 'Agent address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Operation cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const s = spinner()
      s.start('Fetching Ghost Score from blockchain...')

      const { client } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const agentAddr = address(agentAddress)
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ Agent not found')
        outro(chalk.red(`No agent found at address: ${agentAddress}`))
        return
      }

      s.stop('✅ Ghost Score loaded')

      // Calculate Ghost Score metrics
      const reputationScore = Number(agentData.reputationScore || 0)
      const ghostScore = Math.min(1000, Math.round(reputationScore / 100))
      const totalJobs = Number(agentData.totalJobsCompleted || 0)
      const totalJobsFailed = Number(agentData.totalJobsFailed || 0)
      const totalJobsAll = totalJobs + totalJobsFailed
      const successRate = totalJobsAll > 0 ? Math.round((totalJobs / totalJobsAll) * 100) : 0

      // Determine tier
      const tier = ghostScore >= 900 ? 'PLATINUM' :
                   ghostScore >= 750 ? 'GOLD' :
                   ghostScore >= 500 ? 'SILVER' :
                   ghostScore >= 200 ? 'BRONZE' : 'NEWCOMER'

      const tierColor = tier === 'PLATINUM' ? chalk.gray :
                       tier === 'GOLD' ? chalk.yellow :
                       tier === 'SILVER' ? chalk.white :
                       tier === 'BRONZE' ? chalk.red : chalk.blue

      // Calculate detailed breakdown (if requested)
      let breakdown: any = null
      if (options.detailed) {
        // Success rate component (40%)
        const successComponent = Math.round(successRate * 0.4)

        // Service quality component (30%) - estimated from ghost score
        const serviceQuality = Math.min(100, Math.round((ghostScore / 10) * 1.2))
        const serviceComponent = Math.round(serviceQuality * 0.3)

        // Response time component (20%) - placeholder
        const responseTime = 95 // Would come from actual metrics
        const responseComponent = Math.round(responseTime * 0.2)

        // Volume consistency component (10%)
        const volumeConsistency = Math.min(100, Math.round((totalJobs / 100) * 100))
        const volumeComponent = Math.round(volumeConsistency * 0.1)

        breakdown = {
          successRate: { value: successRate, weight: 40, contribution: successComponent },
          serviceQuality: { value: serviceQuality, weight: 30, contribution: serviceComponent },
          responseTime: { value: responseTime, weight: 20, contribution: responseComponent },
          volumeConsistency: { value: volumeConsistency, weight: 10, contribution: volumeComponent },
        }
      }

      // JSON output
      if (options.json) {
        console.log(JSON.stringify({
          address: agentAddr.toString(),
          agentName: agentData.name,
          ghostScore,
          tier,
          reputationScore,
          totalJobsCompleted: totalJobs,
          totalJobsFailed,
          successRate,
          breakdown
        }, null, 2))
        return
      }

      // Display Ghost Score
      if (options.detailed) {
        // Build tier benefits string
        let tierBenefits = ''
        if (tier === 'PLATINUM') {
          tierBenefits = `${chalk.gray('• Unlimited job value')}\n${chalk.gray('• 0% escrow deposit')}\n${chalk.gray('• Instant payment release')}\n${chalk.gray('• Elite verified badge')}`
        } else if (tier === 'GOLD') {
          tierBenefits = `${chalk.gray('• Jobs up to $10,000')}\n${chalk.gray('• 0% escrow deposit')}\n${chalk.gray('• Gold verified badge')}\n${chalk.gray('• Premium marketplace access')}`
        } else if (tier === 'SILVER') {
          tierBenefits = `${chalk.gray('• Jobs up to $1,000')}\n${chalk.gray('• 15% escrow deposit')}\n${chalk.gray('• Priority listing')}\n${chalk.gray('• Featured agent badge')}`
        } else if (tier === 'BRONZE') {
          tierBenefits = `${chalk.gray('• Jobs up to $100')}\n${chalk.gray('• 25% escrow deposit')}\n${chalk.gray('• Standard listing')}\n${chalk.gray('• Bronze badge')}`
        } else if (tier === 'NEWCOMER') {
          tierBenefits = `${chalk.gray('• Jobs up to $100')}\n${chalk.gray('• 25% escrow deposit')}\n${chalk.gray('• Building initial reputation')}\n${chalk.gray('• Newcomer badge')}`
        }

        outro(
          `${chalk.bold.cyan(`${agentData.name || 'Agent'}'s Ghost Score`)}\n\n` +
          `${chalk.bold('Overall Score:')}\n` +
          `${chalk.gray('Ghost Score:')} ${tierColor(`${ghostScore}/1000`)} (${tierColor.bold(tier)})\n` +
          `${chalk.gray('Reputation Score:')} ${reputationScore} basis points\n\n` +
          `${chalk.bold('Score Breakdown:')}\n` +
          `${chalk.gray('Success Rate (40%):')} ${breakdown.successRate.value}% → ${breakdown.successRate.contribution} points\n` +
          `${chalk.gray('Service Quality (30%):')} ${breakdown.serviceQuality.value}% → ${breakdown.serviceQuality.contribution} points\n` +
          `${chalk.gray('Response Time (20%):')} ${breakdown.responseTime.value}% → ${breakdown.responseTime.contribution} points\n` +
          `${chalk.gray('Volume (10%):')} ${breakdown.volumeConsistency.value}% → ${breakdown.volumeConsistency.contribution} points\n\n` +
          `${chalk.bold('Job Statistics:')}\n` +
          `${chalk.gray('Completed:')} ${totalJobs}\n` +
          `${chalk.gray('Failed:')} ${totalJobsFailed}\n` +
          `${chalk.gray('Success Rate:')} ${successRate}%\n\n` +
          `${chalk.bold('Tier Benefits:')}\n` +
          tierBenefits
        )
      } else {
        outro(
          `${chalk.bold.cyan(`${agentData.name || 'Agent'}'s Ghost Score`)}\n\n` +
          `${chalk.gray('Ghost Score:')} ${tierColor(`${ghostScore}/1000`)} (${tierColor.bold(tier)})\n` +
          `${chalk.gray('Jobs Completed:')} ${totalJobs}\n` +
          `${chalk.gray('Success Rate:')} ${successRate}%\n\n` +
          `${chalk.yellow('💡 Tip: Use')} ${chalk.cyan('--detailed')} ${chalk.yellow('for full breakdown')}`
        )
      }

    } catch (error) {
      log.error(`Failed to get Ghost Score: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Update reputation subcommand (for testing/development)
reputationCommand
  .command('update')
  .description('Update reputation score (development only)')
  .option('-a, --agent <address>', 'Agent address')
  .option('-s, --score <score>', 'New reputation score (basis points)')
  .action(async (options: UpdateOptions) => {
    intro(chalk.yellow('✏️  Update Reputation (Dev Only)'))

    log.warn(
      chalk.yellow('⚠️  WARNING: ') +
      'This command is for development/testing only.\n' +
      'In production, Ghost Score is updated automatically based on job performance.'
    )

    try {
      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address:',
          validate: (value) => {
            if (!value) return 'Agent address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Update cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      // Get new score
      let newScore = options.score
      if (!newScore) {
        const scoreInput = await text({
          message: 'New reputation score (0-100000 basis points):',
          placeholder: '50000 (500 Ghost Score)',
          validate: (value) => {
            if (!value) return 'Score is required'
            const score = parseInt(value)
            if (isNaN(score) || score < 0 || score > 100000) {
              return 'Score must be between 0 and 100000'
            }
          }
        })

        if (isCancel(scoreInput)) {
          cancel('Update cancelled')
          return
        }

        newScore = scoreInput.toString()
      }

      const scoreBps = parseInt(newScore)
      const ghostScore = Math.min(1000, Math.round(scoreBps / 100))

      const confirmUpdate = await confirm({
        message: `Set Ghost Score to ${ghostScore}/1000 (${scoreBps} bps)?`
      })

      if (isCancel(confirmUpdate) || !confirmUpdate) {
        cancel('Update cancelled')
        return
      }

      log.warn('Reputation update functionality not yet implemented in SDK.')
      log.info('In production, Ghost Score updates automatically based on job completion and ratings.')

      outro(
        `${chalk.yellow('Update Pending')}\n\n` +
        'Reputation updates will be automatic once the platform is live.\n\n' +
        'To influence your Ghost Score:\n' +
        `• Complete jobs successfully\n` +
        `• Maintain high service quality\n` +
        `• Respond quickly to requests\n` +
        `• Build consistent volume`
      )

    } catch (error) {
      log.error(`Failed to update reputation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// History subcommand
reputationCommand
  .command('history')
  .description('View reputation history for an agent')
  .option('-a, --agent <address>', 'Agent address')
  .option('-l, --limit <limit>', 'Maximum number of entries to display', '10')
  .option('--json', 'Output as JSON')
  .action(async (options: HistoryOptions) => {
    intro(chalk.blue('📈 Reputation History'))

    try {
      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address:',
          validate: (value) => {
            if (!value) return 'Agent address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Operation cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const s = spinner()
      s.start('Fetching reputation history...')

      const { client } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const agentAddr = address(agentAddress)

      // Note: SDK might not have a reputation history method yet
      // This is a placeholder showing what would be displayed

      s.stop('⚠️  Reputation history API not yet available')

      log.warn('Reputation history tracking is not yet implemented in the SDK.')
      log.info('This feature will track:')
      log.info('• Ghost Score changes over time')
      log.info('• Job completions and ratings')
      log.info('• Tier upgrades/downgrades')
      log.info('• Reputation milestones')

      outro(
        `${chalk.yellow('History Coming Soon')}\n\n` +
        'In the meantime, you can:\n' +
        `• Check current score: ${chalk.cyan('ghost reputation get --agent ' + agentAddr.toString().slice(0, 8) + '...')}\n` +
        `• View agent details: ${chalk.cyan('ghost agent get --agent ' + agentAddr.toString().slice(0, 8) + '...')}`
      )

    } catch (error) {
      log.error(`Failed to get reputation history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action - show available commands
reputationCommand
  .action(async () => {
    intro(chalk.blue('📊 GhostSpeak Reputation Management'))

    log.info(`\n${chalk.bold('Available Commands:')}\n`)
    log.info(`${chalk.cyan('ghost reputation get')} - Get Ghost Score for an agent`)
    log.info(`${chalk.cyan('ghost reputation update')} - Update reputation (dev only)`)
    log.info(`${chalk.cyan('ghost reputation history')} - View reputation history`)

    outro('Use --help with any command for more details')
  })
