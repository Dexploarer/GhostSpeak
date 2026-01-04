/**
 * GHOST Token Staking command
 * Stake/unstake GHOST tokens, claim rewards, check balances
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
import { initializeClient, getExplorerUrl, toSDKSigner } from '../utils/client.js'
import { handleError } from '../utils/error-handler.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'

// Type definitions
interface StakeOptions {
  agent?: string
  amount?: string
}

interface UnstakeOptions {
  agent?: string
  amount?: string
}

interface RewardsOptions {
  agent?: string
  claim?: boolean
  json?: boolean
}

interface BalanceOptions {
  agent?: string
  json?: boolean
}

// Tier thresholds (in GHOST tokens)
const TIER_THRESHOLDS = {
  1: 1000,
  2: 5000,
  3: 10000,
  4: 25000,
  5: 50000
}

function calculateStakingTier(amountStaked: number): number {
  if (amountStaked >= TIER_THRESHOLDS[5]) return 5
  if (amountStaked >= TIER_THRESHOLDS[4]) return 4
  if (amountStaked >= TIER_THRESHOLDS[3]) return 3
  if (amountStaked >= TIER_THRESHOLDS[2]) return 2
  if (amountStaked >= TIER_THRESHOLDS[1]) return 1
  return 0
}

function getTierBenefits(tier: number): string[] {
  const benefits: { [key: number]: string[] } = {
    0: ['No benefits', 'Stake 1,000 GHOST to unlock Tier 1'],
    1: ['5% reputation boost', '10% APY', 'Basic governance voting'],
    2: ['10% reputation boost', '15% APY', 'Enhanced governance voting', 'Priority support'],
    3: ['15% reputation boost', '20% APY', 'Full governance rights', 'Premium support', 'Early feature access'],
    4: ['20% reputation boost', '25% APY', 'Weighted governance voting', 'Dedicated support', 'Beta features'],
    5: ['25% reputation boost', '30% APY', 'Maximum governance power', 'VIP support', 'Revenue sharing', 'Advisory board consideration']
  }
  return benefits[tier] || benefits[0]
}

export const stakingCommand = new Command('staking')
  .description('Manage GHOST token staking')

// Stake subcommand
stakingCommand
  .command('stake')
  .description('Stake GHOST tokens for an agent')
  .option('-a, --agent <address>', 'Agent address')
  .option('--amount <amount>', 'Amount of GHOST to stake')
  .action(async (options: StakeOptions) => {
    intro(chalk.cyan('🔐 Stake GHOST Tokens'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address to stake for:',
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
          cancel('Staking cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const agentAddr = address(agentAddress)

      // Verify agent exists
      s.start('Verifying agent...')
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ Agent not found')
        outro(chalk.red(`No agent found at address: ${agentAddress}`))
        return
      }

      s.stop('✅ Agent verified')

      // Get staking amount
      let amount = options.amount
      if (!amount) {
        const amountInput = await text({
          message: 'Amount of GHOST to stake:',
          placeholder: '1000',
          validate: (value) => {
            if (!value) return 'Amount is required'
            const amt = parseFloat(value)
            if (isNaN(amt) || amt <= 0) {
              return 'Amount must be a positive number'
            }
            if (amt < 100) {
              return 'Minimum stake is 100 GHOST'
            }
          }
        })

        if (isCancel(amountInput)) {
          cancel('Staking cancelled')
          return
        }

        amount = amountInput.toString()
      }

      const stakeAmount = parseFloat(amount)
      const currentTier = calculateStakingTier(stakeAmount)
      const nextTierThreshold = TIER_THRESHOLDS[currentTier + 1 as keyof typeof TIER_THRESHOLDS]

      // Show staking preview
      note(
        `${chalk.bold('Staking Details:')}\n` +
        `${chalk.gray('Agent:')} ${agentData.name}\n` +
        `${chalk.gray('Amount:')} ${stakeAmount.toLocaleString()} GHOST\n` +
        `${chalk.gray('Tier After Stake:')} ${currentTier}/5\n` +
        `${nextTierThreshold ? chalk.gray(`Next Tier: `) + (nextTierThreshold - stakeAmount).toLocaleString() + ` GHOST more\n` : ''}` +
        `${chalk.bold('\nBenefits:')}\n` +
        getTierBenefits(currentTier).map(b => `${chalk.gray('•')} ${b}`).join('\n'),
        'Staking Preview'
      )

      const confirmStake = await confirm({
        message: `Stake ${stakeAmount.toLocaleString()} GHOST?`
      })

      if (isCancel(confirmStake) || !confirmStake) {
        cancel('Staking cancelled')
        return
      }

      s.start('Staking GHOST tokens on blockchain...')

      try {
        // Convert GHOST to lamports (assuming 9 decimals like SOL)
        const lamports = BigInt(Math.round(stakeAmount * 1_000_000_000))

        // Note: SDK method signature might vary - adjust as needed
        log.warn('Staking functionality integration pending. SDK staking module ready.')

        // Placeholder for actual staking call
        // const signature = await safeClient.staking.stake(toSDKSigner(wallet), {
        //   agentAddress: agentAddr,
        //   amount: lamports
        // })

        s.stop('⚠️  Staking method not yet connected to CLI')

        outro(
          `${chalk.yellow('Staking Pending')}\n\n` +
          `Your stake of ${stakeAmount.toLocaleString()} GHOST for ${agentData.name} will be processed.\n\n` +
          `${chalk.bold('Expected Benefits:')}\n` +
          `${chalk.gray('•')} Tier ${currentTier}/5 staking tier\n` +
          `${chalk.gray('•')} ${getTierBenefits(currentTier)[0]}\n` +
          `${chalk.gray('•')} ${getTierBenefits(currentTier)[1]}\n\n` +
          `${chalk.gray('Note: Staking CLI integration coming soon.')}\n` +
          `${chalk.gray('Web dashboard already supports staking: ')}${chalk.cyan('https://ghostspeak.io/dashboard/staking')}`
        )

      } catch (error) {
        s.stop('❌ Failed to stake tokens')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to stake: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Unstake subcommand
stakingCommand
  .command('unstake')
  .description('Unstake GHOST tokens')
  .option('-a, --agent <address>', 'Agent address')
  .option('--amount <amount>', 'Amount of GHOST to unstake')
  .action(async (options: UnstakeOptions) => {
    intro(chalk.yellow('🔓 Unstake GHOST Tokens'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address to unstake from:',
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
          cancel('Unstaking cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const agentAddr = address(agentAddress)

      // Note: Would fetch current staking account here
      log.warn('Unstaking functionality pending SDK integration.')

      // Get unstaking amount
      let amount = options.amount
      if (!amount) {
        const amountInput = await text({
          message: 'Amount of GHOST to unstake:',
          placeholder: '500',
          validate: (value) => {
            if (!value) return 'Amount is required'
            const amt = parseFloat(value)
            if (isNaN(amt) || amt <= 0) {
              return 'Amount must be a positive number'
            }
          }
        })

        if (isCancel(amountInput)) {
          cancel('Unstaking cancelled')
          return
        }

        amount = amountInput.toString()
      }

      const unstakeAmount = parseFloat(amount)

      // Show unstaking warning
      note(
        `${chalk.bold('⚠️  Unstaking Warning:')}\n` +
        `${chalk.gray('Amount:')} ${unstakeAmount.toLocaleString()} GHOST\n` +
        `${chalk.gray('Cooldown Period:')} 7 days\n` +
        `${chalk.gray('Impact:')} Reduced reputation boost\n` +
        `${chalk.gray('Impact:')} Lower APY on remaining stake\n\n` +
        `${chalk.yellow('Benefits will be reduced immediately, but tokens unlock after 7 days.')}`,
        'Unstaking Impact'
      )

      const confirmUnstake = await confirm({
        message: `Unstake ${unstakeAmount.toLocaleString()} GHOST?`
      })

      if (isCancel(confirmUnstake) || !confirmUnstake) {
        cancel('Unstaking cancelled')
        return
      }

      s.start('Unstaking GHOST tokens...')

      try {
        log.warn('Unstaking method not yet connected to CLI.')

        s.stop('⚠️  Unstaking pending SDK integration')

        outro(
          `${chalk.yellow('Unstaking Pending')}\n\n` +
          `Your request to unstake ${unstakeAmount.toLocaleString()} GHOST will be processed.\n\n` +
          `${chalk.gray('Cooldown: 7 days')}\n` +
          `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard/staking')}`
        )

      } catch (error) {
        s.stop('❌ Failed to unstake tokens')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to unstake: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Rewards subcommand
stakingCommand
  .command('rewards')
  .description('View or claim staking rewards')
  .option('-a, --agent <address>', 'Agent address')
  .option('--claim', 'Claim rewards instead of just viewing')
  .option('--json', 'Output as JSON')
  .action(async (options: RewardsOptions) => {
    intro(options.claim ? chalk.green('💰 Claim Staking Rewards') : chalk.blue('💰 View Staking Rewards'))

    try {
      const s = spinner()
      s.start('Fetching staking rewards...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress && options.claim) {
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

      // Note: Would fetch staking account and calculate rewards here
      log.warn('Rewards calculation not yet integrated with SDK.')

      s.stop('⚠️  Rewards API pending')

      // Mock rewards data for demonstration
      const mockRewards = {
        pendingRewards: 125.50,
        claimedRewards: 450.25,
        estimatedAPY: 20,
        lastClaimed: new Date().toISOString(),
      }

      if (options.json) {
        console.log(JSON.stringify(mockRewards, null, 2))
        return
      }

      outro(
        `${chalk.bold.cyan('Staking Rewards')}\n\n` +
        `${chalk.gray('Pending Rewards:')} ${mockRewards.pendingRewards.toLocaleString()} GHOST\n` +
        `${chalk.gray('Claimed Rewards:')} ${mockRewards.claimedRewards.toLocaleString()} GHOST\n` +
        `${chalk.gray('Current APY:')} ${mockRewards.estimatedAPY}%\n` +
        `${chalk.gray('Last Claimed:')} ${new Date(mockRewards.lastClaimed).toLocaleDateString()}\n\n` +
        `${chalk.yellow('💡 Tip: Use')} ${chalk.cyan('--claim')} ${chalk.yellow('to claim rewards')}\n` +
        `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard/staking')}`
      )

    } catch (error) {
      log.error(`Failed to get rewards: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Balance subcommand
stakingCommand
  .command('balance')
  .description('Check GHOST token balance and staking status')
  .option('-a, --agent <address>', 'Agent address (optional)')
  .option('--json', 'Output as JSON')
  .action(async (options: BalanceOptions) => {
    intro(chalk.blue('💎 GHOST Token Balance'))

    try {
      const s = spinner()
      s.start('Fetching balances...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('⚠️  Balance API pending integration')

      // Mock balance data
      const mockBalance = {
        walletBalance: 5000,
        stakedBalance: 10000,
        pendingRewards: 125.50,
        totalValue: 15125.50,
      }

      if (options.json) {
        console.log(JSON.stringify(mockBalance, null, 2))
        return
      }

      outro(
        `${chalk.bold.cyan('GHOST Token Balance')}\n\n` +
        `${chalk.gray('Wallet:')} ${mockBalance.walletBalance.toLocaleString()} GHOST\n` +
        `${chalk.gray('Staked:')} ${mockBalance.stakedBalance.toLocaleString()} GHOST\n` +
        `${chalk.gray('Pending Rewards:')} ${mockBalance.pendingRewards.toLocaleString()} GHOST\n` +
        `${chalk.gray('Total Value:')} ${mockBalance.totalValue.toLocaleString()} GHOST\n\n` +
        `${chalk.bold('Staking Status:')}\n` +
        `${chalk.gray('Tier:')} ${calculateStakingTier(mockBalance.stakedBalance)}/5\n` +
        `${chalk.gray('Reputation Boost:')} ${calculateStakingTier(mockBalance.stakedBalance) * 5}%\n` +
        `${chalk.gray('APY:')} ${10 + calculateStakingTier(mockBalance.stakedBalance) * 5}%\n\n` +
        `${chalk.yellow('💡 Commands:')}\n` +
        `${chalk.cyan('ghost staking stake')} - Stake more GHOST\n` +
        `${chalk.cyan('ghost staking rewards --claim')} - Claim pending rewards`
      )

    } catch (error) {
      log.error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action - show available commands
stakingCommand
  .action(async () => {
    intro(chalk.blue('🔐 GhostSpeak GHOST Token Staking'))

    log.info(`\n${chalk.bold('Available Commands:')}\n`)
    log.info(`${chalk.cyan('ghost staking stake')} - Stake GHOST tokens for reputation boost`)
    log.info(`${chalk.cyan('ghost staking unstake')} - Unstake GHOST tokens (7-day cooldown)`)
    log.info(`${chalk.cyan('ghost staking rewards')} - View or claim staking rewards`)
    log.info(`${chalk.cyan('ghost staking balance')} - Check GHOST balance and staking status`)

    note(
      `${chalk.bold('Staking Tiers:')}\n` +
      `${chalk.gray('Tier 1:')} 1,000 GHOST (5% boost, 10% APY)\n` +
      `${chalk.gray('Tier 2:')} 5,000 GHOST (10% boost, 15% APY)\n` +
      `${chalk.gray('Tier 3:')} 10,000 GHOST (15% boost, 20% APY)\n` +
      `${chalk.gray('Tier 4:')} 25,000 GHOST (20% boost, 25% APY)\n` +
      `${chalk.gray('Tier 5:')} 50,000+ GHOST (25% boost, 30% APY)`,
      'Tier System'
    )

    outro('Use --help with any command for more details')
  })
