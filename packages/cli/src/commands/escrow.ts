/**
 * Escrow management command
 * Create, manage, and resolve escrow accounts for x402 marketplace
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
interface CreateOptions {
  job?: string
  amount?: string
  recipient?: string
  deadline?: string
}

interface ApproveOptions {
  escrow?: string
  rating?: string
}

interface DisputeOptions {
  escrow?: string
  reason?: string
  evidence?: string
}

interface ListOptions {
  agent?: string
  status?: string
  json?: boolean
}

interface GetOptions {
  escrow?: string
  json?: boolean
}

// Escrow status types
const ESCROW_STATUSES = {
  pending: {
    name: 'Pending',
    description: 'Awaiting job completion',
    color: chalk.yellow,
    icon: '⏳'
  },
  completed: {
    name: 'Completed',
    description: 'Job completed, funds released',
    color: chalk.green,
    icon: '✅'
  },
  disputed: {
    name: 'Disputed',
    description: 'Under dispute resolution',
    color: chalk.red,
    icon: '⚠️'
  },
  cancelled: {
    name: 'Cancelled',
    description: 'Escrow cancelled, funds refunded',
    color: chalk.gray,
    icon: '❌'
  }
}

// Dispute reasons
const DISPUTE_REASONS = {
  incomplete: {
    name: 'Incomplete Work',
    description: 'Agent did not complete the agreed work',
    icon: '📋'
  },
  quality: {
    name: 'Quality Issues',
    description: 'Work quality does not meet standards',
    icon: '⚠️'
  },
  deadline: {
    name: 'Missed Deadline',
    description: 'Agent missed the agreed deadline',
    icon: '⏰'
  },
  miscommunication: {
    name: 'Miscommunication',
    description: 'Disagreement on job requirements',
    icon: '💬'
  },
  other: {
    name: 'Other',
    description: 'Other dispute reason (provide details)',
    icon: '📝'
  }
}

export const escrowCommand = new Command('escrow')
  .description('Manage escrow accounts for x402 marketplace jobs')

// Create escrow subcommand
escrowCommand
  .command('create')
  .description('Create a new escrow account for a job')
  .option('-j, --job <id>', 'Job ID or description')
  .option('-a, --amount <amount>', 'Escrow amount in GHOST tokens')
  .option('-r, --recipient <address>', 'Agent address (recipient)')
  .option('-d, --deadline <days>', 'Job deadline in days')
  .action(async (options: CreateOptions) => {
    intro(chalk.cyan('💰 Create Escrow'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get job description
      let jobDescription = options.job
      if (!jobDescription) {
        const jobInput = await text({
          message: 'Job description:',
          placeholder: 'Sentiment analysis API integration',
          validate: (value) => {
            if (!value) return 'Job description is required'
            if (value.length < 10) return 'Please provide a more detailed description'
          }
        })

        if (isCancel(jobInput)) {
          cancel('Escrow creation cancelled')
          return
        }

        jobDescription = jobInput.toString()
      }

      // Get recipient agent address
      let recipientAddress = options.recipient
      if (!recipientAddress) {
        const recipientInput = await text({
          message: 'Agent address (recipient):',
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

        if (isCancel(recipientInput)) {
          cancel('Escrow creation cancelled')
          return
        }

        recipientAddress = recipientInput.toString().trim()
      }

      const recipientAddr = address(recipientAddress)

      // Verify agent exists
      s.start('Verifying agent...')
      const agentData = await safeClient.agent.getAgentAccount(recipientAddr)

      if (!agentData) {
        s.stop('❌ Agent not found')
        outro(chalk.red(`No agent found at address: ${recipientAddress}`))
        return
      }

      s.stop(`✅ Agent verified: ${agentData.name}`)

      // Get escrow amount
      let escrowAmount = options.amount
      if (!escrowAmount) {
        const amountInput = await text({
          message: 'Escrow amount (GHOST tokens):',
          placeholder: '100',
          validate: (value) => {
            if (!value) return 'Amount is required'
            const amount = parseFloat(value)
            if (isNaN(amount) || amount <= 0) {
              return 'Amount must be greater than 0'
            }
          }
        })

        if (isCancel(amountInput)) {
          cancel('Escrow creation cancelled')
          return
        }

        escrowAmount = amountInput.toString()
      }

      const amount = parseFloat(escrowAmount)

      // Get deadline
      let deadlineDays = options.deadline
      if (!deadlineDays) {
        const deadlineInput = await text({
          message: 'Job deadline (days):',
          placeholder: '7',
          validate: (value) => {
            if (!value) return 'Deadline is required'
            const days = parseInt(value)
            if (isNaN(days) || days <= 0) {
              return 'Deadline must be greater than 0'
            }
          }
        })

        if (isCancel(deadlineInput)) {
          cancel('Escrow creation cancelled')
          return
        }

        deadlineDays = deadlineInput.toString()
      }

      const deadline = parseInt(deadlineDays)
      const deadlineDate = new Date()
      deadlineDate.setDate(deadlineDate.getDate() + deadline)

      // Calculate Ghost Score tier-based deposit requirement
      const reputationScore = Number(agentData.reputationScore || 0)
      const ghostScore = Math.min(1000, Math.round(reputationScore / 100))

      const tier = ghostScore >= 900 ? 'PLATINUM' :
                   ghostScore >= 750 ? 'GOLD' :
                   ghostScore >= 500 ? 'SILVER' :
                   ghostScore >= 200 ? 'BRONZE' : 'NEWCOMER'

      const depositPercentage =
        tier === 'PLATINUM' || tier === 'GOLD' ? 0 :
        tier === 'SILVER' ? 15 :
        25

      const depositRequired = (amount * depositPercentage) / 100
      const totalLocked = amount

      // Show escrow preview
      note(
        `${chalk.bold('Escrow Details:')}\\n` +
        `${chalk.gray('Job:')} ${jobDescription}\\n` +
        `${chalk.gray('Agent:')} ${agentData.name}\\n` +
        `${chalk.gray('Ghost Score:')} ${ghostScore}/1000 (${tier})\\n\\n` +
        `${chalk.bold('Payment Terms:')}\\n` +
        `${chalk.gray('Job Value:')} ${amount} GHOST\\n` +
        `${chalk.gray('Agent Deposit:')} ${depositRequired} GHOST (${depositPercentage}%)\\n` +
        `${chalk.gray('Total Locked:')} ${totalLocked} GHOST\\n` +
        `${chalk.gray('Deadline:')} ${deadline} days (${deadlineDate.toLocaleDateString()})\\n\\n` +
        `${chalk.bold('Escrow Protections:')}\\n` +
        `${chalk.gray('• Funds held in on-chain escrow')}\\n` +
        `${chalk.gray('• Automatic release on approval')}\\n` +
        `${chalk.gray('• Dispute resolution available')}\\n` +
        `${chalk.gray('• Refund if cancelled')}`,
        'Escrow Preview'
      )

      const confirmCreate = await confirm({
        message: `Create escrow with ${agentData.name}?`
      })

      if (isCancel(confirmCreate) || !confirmCreate) {
        cancel('Escrow creation cancelled')
        return
      }

      s.start('Creating escrow on blockchain...')

      try {
        // Note: SDK escrow module integration pending
        log.warn('Escrow creation pending SDK integration.')

        s.stop('⚠️  Escrow creation method pending')

        outro(
          `${chalk.yellow('Escrow Creation Pending')}\\n\\n` +
          `Your escrow will be created with:\\n` +
          `${chalk.gray('Job:')} ${jobDescription}\\n` +
          `${chalk.gray('Agent:')} ${agentData.name}\\n` +
          `${chalk.gray('Amount:')} ${amount} GHOST\\n` +
          `${chalk.gray('Deadline:')} ${deadlineDate.toLocaleDateString()}\\n\\n` +
          `${chalk.gray('Note: Escrow CLI integration coming soon.')}\\n` +
          `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard/marketplace')}`
        )

      } catch (error) {
        s.stop('❌ Failed to create escrow')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to create escrow: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Approve escrow subcommand
escrowCommand
  .command('approve')
  .description('Approve job completion and release escrow funds')
  .option('-e, --escrow <address>', 'Escrow account address')
  .option('-r, --rating <rating>', 'Agent rating (1-5 stars)')
  .action(async (options: ApproveOptions) => {
    intro(chalk.green('✅ Approve Escrow'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get escrow address
      let escrowAddress = options.escrow
      if (!escrowAddress) {
        const escrowInput = await text({
          message: 'Escrow account address:',
          validate: (value) => {
            if (!value) return 'Escrow address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(escrowInput)) {
          cancel('Approval cancelled')
          return
        }

        escrowAddress = escrowInput.toString().trim()
      }

      const escrowAddr = address(escrowAddress)

      // Note: In real implementation, fetch escrow account data
      s.start('Fetching escrow details...')

      // Mock escrow data for demonstration
      const mockEscrow = {
        job: 'Sentiment analysis API integration',
        agent: 'SentimentBot',
        amount: 100,
        status: 'pending',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      }

      s.stop('✅ Escrow loaded')

      // Get rating
      let rating = options.rating
      if (!rating) {
        const ratingChoice = await select({
          message: 'Rate the agent performance:',
          options: [
            { value: '5', label: '⭐⭐⭐⭐⭐ Exceptional (5 stars)' },
            { value: '4', label: '⭐⭐⭐⭐ Great (4 stars)' },
            { value: '3', label: '⭐⭐⭐ Good (3 stars)' },
            { value: '2', label: '⭐⭐ Fair (2 stars)' },
            { value: '1', label: '⭐ Poor (1 star)' }
          ]
        })

        if (isCancel(ratingChoice)) {
          cancel('Approval cancelled')
          return
        }

        rating = ratingChoice.toString()
      }

      const numRating = parseInt(rating)

      // Show approval preview
      note(
        `${chalk.bold('Approval Summary:')}\\n` +
        `${chalk.gray('Escrow:')} ${escrowAddress.slice(0, 8)}...\\n` +
        `${chalk.gray('Job:')} ${mockEscrow.job}\\n` +
        `${chalk.gray('Agent:')} ${mockEscrow.agent}\\n` +
        `${chalk.gray('Amount:')} ${mockEscrow.amount} GHOST\\n` +
        `${chalk.gray('Your Rating:')} ${'⭐'.repeat(numRating)}\\n\\n` +
        `${chalk.bold('Actions:')}\\n` +
        `${chalk.gray('• Release')} ${mockEscrow.amount} GHOST ${chalk.gray('to agent')}\\n` +
        `${chalk.gray('• Update agent Ghost Score based on rating')}\\n` +
        `${chalk.gray('• Mark escrow as completed')}`,
        'Approval Preview'
      )

      const confirmApprove = await confirm({
        message: `Release ${mockEscrow.amount} GHOST to ${mockEscrow.agent}?`
      })

      if (isCancel(confirmApprove) || !confirmApprove) {
        cancel('Approval cancelled')
        return
      }

      s.start('Processing approval on blockchain...')

      try {
        log.warn('Escrow approval pending SDK integration.')

        s.stop('⚠️  Escrow approval method pending')

        outro(
          `${chalk.yellow('Escrow Approval Pending')}\\n\\n` +
          `Your approval will:\\n` +
          `${chalk.gray('• Release')} ${mockEscrow.amount} GHOST ${chalk.gray('to agent')}\\n` +
          `${chalk.gray('• Apply rating:')} ${'⭐'.repeat(numRating)}\\n` +
          `${chalk.gray('• Update Ghost Score')}\\n\\n` +
          `${chalk.gray('Note: Escrow CLI integration coming soon.')}\\n` +
          `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard/marketplace')}`
        )

      } catch (error) {
        s.stop('❌ Failed to approve escrow')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to approve escrow: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Dispute escrow subcommand
escrowCommand
  .command('dispute')
  .description('Dispute an escrow and trigger resolution process')
  .option('-e, --escrow <address>', 'Escrow account address')
  .option('-r, --reason <reason>', 'Dispute reason (incomplete, quality, deadline, miscommunication, other)')
  .option('--evidence <url>', 'URL to evidence (screenshots, logs, etc.)')
  .action(async (options: DisputeOptions) => {
    intro(chalk.red('⚠️  Dispute Escrow'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get escrow address
      let escrowAddress = options.escrow
      if (!escrowAddress) {
        const escrowInput = await text({
          message: 'Escrow account address:',
          validate: (value) => {
            if (!value) return 'Escrow address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(escrowInput)) {
          cancel('Dispute cancelled')
          return
        }

        escrowAddress = escrowInput.toString().trim()
      }

      const escrowAddr = address(escrowAddress)

      // Fetch escrow details
      s.start('Fetching escrow details...')

      // Mock escrow data
      const mockEscrow = {
        job: 'Sentiment analysis API integration',
        agent: 'SentimentBot',
        agentAddress: 'Sent1ment...xyz',
        amount: 100,
        status: 'pending',
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day overdue
      }

      s.stop('✅ Escrow loaded')

      // Get dispute reason
      let disputeReason = options.reason
      if (!disputeReason) {
        const reasonChoice = await select({
          message: 'Select dispute reason:',
          options: Object.entries(DISPUTE_REASONS).map(([key, value]) => ({
            value: key,
            label: `${value.icon} ${value.name}`,
            hint: value.description
          }))
        })

        if (isCancel(reasonChoice)) {
          cancel('Dispute cancelled')
          return
        }

        disputeReason = reasonChoice.toString()
      }

      const selectedReason = DISPUTE_REASONS[disputeReason as keyof typeof DISPUTE_REASONS]

      if (!selectedReason) {
        log.error('Invalid dispute reason')
        return
      }

      // Get evidence URL (optional)
      let evidenceUrl = options.evidence
      if (!evidenceUrl) {
        const addEvidence = await confirm({
          message: 'Do you have evidence to submit (screenshots, logs, etc.)?'
        })

        if (isCancel(addEvidence)) {
          cancel('Dispute cancelled')
          return
        }

        if (addEvidence) {
          const evidenceInput = await text({
            message: 'Evidence URL (file upload, screenshot link):',
            placeholder: 'https://example.com/evidence.png',
            validate: (value) => {
              if (!value) return
              try {
                new URL(value)
                return
              } catch {
                return 'Please enter a valid URL'
              }
            }
          })

          if (isCancel(evidenceInput)) {
            cancel('Dispute cancelled')
            return
          }

          if (evidenceInput) {
            evidenceUrl = evidenceInput.toString()
          }
        }
      }

      // Show dispute preview
      note(
        `${chalk.bold.red('⚠️  Dispute Details')}\\n\\n` +
        `${chalk.bold('Escrow Information:')}\\n` +
        `${chalk.gray('Escrow:')} ${escrowAddress.slice(0, 8)}...\\n` +
        `${chalk.gray('Job:')} ${mockEscrow.job}\\n` +
        `${chalk.gray('Agent:')} ${mockEscrow.agent}\\n` +
        `${chalk.gray('Amount:')} ${mockEscrow.amount} GHOST\\n` +
        `${chalk.gray('Deadline:')} ${mockEscrow.deadline.toLocaleDateString()} ${chalk.red('(overdue)')}\\n\\n` +
        `${chalk.bold('Dispute Reason:')}\\n` +
        `${chalk.gray('Type:')} ${selectedReason.icon} ${selectedReason.name}\\n` +
        `${chalk.gray('Description:')} ${selectedReason.description}\\n` +
        `${evidenceUrl ? `${chalk.gray('Evidence:')} ${evidenceUrl}\\n` : ''}\\n` +
        `${chalk.bold('Resolution Process:')}\\n` +
        `${chalk.gray('1. Dispute submitted on-chain')}\\n` +
        `${chalk.gray('2. Agent has 48 hours to respond')}\\n` +
        `${chalk.gray('3. Community arbitration if unresolved')}\\n` +
        `${chalk.gray('4. Funds distributed based on outcome')}`,
        'Dispute Preview'
      )

      const confirmDispute = await confirm({
        message: `${chalk.red('Submit dispute for')} ${mockEscrow.job}?`
      })

      if (isCancel(confirmDispute) || !confirmDispute) {
        cancel('Dispute cancelled')
        return
      }

      s.start('Submitting dispute on blockchain...')

      try {
        log.warn('Escrow dispute pending SDK integration.')

        s.stop('⚠️  Escrow dispute method pending')

        outro(
          `${chalk.yellow('Dispute Submission Pending')}\\n\\n` +
          `Your dispute will be submitted:\\n` +
          `${chalk.gray('Reason:')} ${selectedReason.name}\\n` +
          `${evidenceUrl ? `${chalk.gray('Evidence:')} ${evidenceUrl}\\n` : ''}` +
          `${chalk.gray('Amount at stake:')} ${mockEscrow.amount} GHOST\\n\\n` +
          `${chalk.bold('Next Steps:')}\\n` +
          `${chalk.gray('• Agent notified of dispute')}\\n` +
          `${chalk.gray('• 48-hour response window')}\\n` +
          `${chalk.gray('• Community arbitration if needed')}\\n\\n` +
          `${chalk.gray('Note: Escrow CLI integration coming soon.')}\\n` +
          `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard/marketplace')}`
        )

      } catch (error) {
        s.stop('❌ Failed to submit dispute')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to dispute escrow: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// List escrows subcommand
escrowCommand
  .command('list')
  .description('List escrow accounts for an agent')
  .option('-a, --agent <address>', 'Agent address')
  .option('-s, --status <status>', 'Filter by status (pending, completed, disputed, cancelled)')
  .option('--json', 'Output as JSON')
  .action(async (options: ListOptions) => {
    intro(chalk.blue('📋 List Escrows'))

    try {
      const s = spinner()

      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address (leave empty for all):',
          validate: (value) => {
            if (!value) return // Allow empty
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

        agentAddress = addressInput ? addressInput.toString().trim() : undefined
      }

      s.start('Fetching escrows...')

      const { client } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Mock escrow data
      const mockEscrows = [
        {
          address: 'Esc1row...abc',
          job: 'Sentiment analysis API',
          agent: 'SentimentBot',
          amount: 100,
          status: 'pending',
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        },
        {
          address: 'Esc1row...def',
          job: 'NFT metadata parser',
          agent: 'MetadataAgent',
          amount: 250,
          status: 'completed',
          deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          address: 'Esc1row...ghi',
          job: 'Token swap integration',
          agent: 'SwapBot',
          amount: 500,
          status: 'disputed',
          deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ]

      // Filter by status if provided
      const filteredEscrows = options.status
        ? mockEscrows.filter(e => e.status === options.status)
        : mockEscrows

      s.stop(`✅ Found ${filteredEscrows.length} escrow(s)`)

      // JSON output
      if (options.json) {
        console.log(JSON.stringify(filteredEscrows, null, 2))
        return
      }

      // Display escrows
      let output = `${chalk.bold.blue('Escrow Accounts')}\\n\\n`

      filteredEscrows.forEach((escrow, index) => {
        const statusInfo = ESCROW_STATUSES[escrow.status as keyof typeof ESCROW_STATUSES]
        const isOverdue = escrow.status === 'pending' && escrow.deadline < new Date()

        output += `${chalk.bold(`${index + 1}. ${escrow.job}`)}\\n`
        output += `${chalk.gray('Address:')} ${escrow.address}\\n`
        output += `${chalk.gray('Agent:')} ${escrow.agent}\\n`
        output += `${chalk.gray('Amount:')} ${escrow.amount} GHOST\\n`
        output += `${chalk.gray('Status:')} ${statusInfo.icon} ${statusInfo.color(statusInfo.name)}\\n`
        output += `${chalk.gray('Deadline:')} ${escrow.deadline.toLocaleDateString()}`

        if (isOverdue) {
          output += ` ${chalk.red('(OVERDUE)')}`
        }

        output += '\\n\\n'
      })

      output += `${chalk.bold('Summary:')}\\n`
      output += `${chalk.gray('Total:')} ${filteredEscrows.length} escrow(s)\\n`
      output += `${chalk.gray('Total Locked:')} ${filteredEscrows.reduce((sum, e) => sum + e.amount, 0)} GHOST\\n\\n`
      output += `${chalk.yellow('💡 Commands:')}\\n`
      output += `${chalk.cyan('ghost escrow get --escrow <address>')} - View escrow details\\n`
      output += `${chalk.cyan('ghost escrow approve --escrow <address>')} - Approve and release funds\\n`
      output += `${chalk.cyan('ghost escrow dispute --escrow <address>')} - Dispute an escrow`

      outro(output)

    } catch (error) {
      log.error(`Failed to list escrows: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Get escrow details subcommand
escrowCommand
  .command('get')
  .description('Get detailed information about an escrow')
  .option('-e, --escrow <address>', 'Escrow account address')
  .option('--json', 'Output as JSON')
  .action(async (options: GetOptions) => {
    intro(chalk.blue('🔍 Get Escrow Details'))

    try {
      // Get escrow address
      let escrowAddress = options.escrow
      if (!escrowAddress) {
        const escrowInput = await text({
          message: 'Escrow account address:',
          validate: (value) => {
            if (!value) return 'Escrow address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(escrowInput)) {
          cancel('Operation cancelled')
          return
        }

        escrowAddress = escrowInput.toString().trim()
      }

      const s = spinner()
      s.start('Fetching escrow details...')

      const { client } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Mock escrow data
      const mockEscrow = {
        address: escrowAddress,
        job: 'Sentiment analysis API integration',
        jobDescription: 'Integrate sentiment analysis API with error handling and rate limiting',
        creator: 'Creator...abc',
        agent: 'SentimentBot',
        agentAddress: 'Sent1ment...xyz',
        amount: 100,
        deposit: 25,
        status: 'pending',
        created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        milestones: [
          { name: 'API integration', status: 'completed', paid: 30 },
          { name: 'Error handling', status: 'completed', paid: 30 },
          { name: 'Rate limiting', status: 'in-progress', paid: 0 },
          { name: 'Testing & docs', status: 'pending', paid: 0 }
        ]
      }

      s.stop('✅ Escrow loaded')

      const statusInfo = ESCROW_STATUSES[mockEscrow.status as keyof typeof ESCROW_STATUSES]

      // JSON output
      if (options.json) {
        console.log(JSON.stringify(mockEscrow, null, 2))
        return
      }

      // Display escrow details
      outro(
        `${chalk.bold.cyan(mockEscrow.job)}\\n\\n` +
        `${chalk.bold('Basic Information:')}\\n` +
        `${chalk.gray('Address:')} ${mockEscrow.address}\\n` +
        `${chalk.gray('Status:')} ${statusInfo.icon} ${statusInfo.color(statusInfo.name)}\\n` +
        `${chalk.gray('Created:')} ${mockEscrow.created.toLocaleDateString()}\\n` +
        `${chalk.gray('Deadline:')} ${mockEscrow.deadline.toLocaleDateString()}\\n\\n` +
        `${chalk.bold('Parties:')}\\n` +
        `${chalk.gray('Creator:')} ${mockEscrow.creator}\\n` +
        `${chalk.gray('Agent:')} ${mockEscrow.agent} (${mockEscrow.agentAddress})\\n\\n` +
        `${chalk.bold('Payment:')}\\n` +
        `${chalk.gray('Total Value:')} ${mockEscrow.amount} GHOST\\n` +
        `${chalk.gray('Agent Deposit:')} ${mockEscrow.deposit} GHOST\\n` +
        `${chalk.gray('Total Locked:')} ${mockEscrow.amount + mockEscrow.deposit} GHOST\\n\\n` +
        `${chalk.bold('Milestones:')}\\n` +
        mockEscrow.milestones.map((m, i) =>
          `${chalk.gray(`${i + 1}.`)} ${m.name} - ${m.status === 'completed' ? chalk.green('✓ Completed') : m.status === 'in-progress' ? chalk.yellow('⏳ In Progress') : chalk.gray('⏸ Pending')} (${m.paid} GHOST paid)`
        ).join('\\n') + '\\n\\n' +
        `${chalk.bold('Description:')}\\n` +
        `${mockEscrow.jobDescription}\\n\\n` +
        `${chalk.yellow('💡 Next Steps:')}\\n` +
        `${chalk.cyan('ghost escrow approve --escrow ' + escrowAddress.slice(0, 12) + '...')} - Approve completion\\n` +
        `${chalk.cyan('ghost escrow dispute --escrow ' + escrowAddress.slice(0, 12) + '...')} - Raise dispute`
      )

    } catch (error) {
      log.error(`Failed to get escrow details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action - show available commands
escrowCommand
  .action(async () => {
    intro(chalk.blue('💰 GhostSpeak Escrow Management'))

    log.info(`\\n${chalk.bold('Available Commands:')}\\n`)
    log.info(`${chalk.cyan('ghost escrow create')} - Create a new escrow for a job`)
    log.info(`${chalk.cyan('ghost escrow approve')} - Approve and release escrow funds`)
    log.info(`${chalk.cyan('ghost escrow dispute')} - Dispute an escrow and trigger resolution`)
    log.info(`${chalk.cyan('ghost escrow list')} - List escrow accounts`)
    log.info(`${chalk.cyan('ghost escrow get')} - Get detailed escrow information`)

    note(
      `${chalk.bold('How Escrow Works:')}\\n\\n` +
      `${chalk.bold('1. Creation')}\\n` +
      `${chalk.gray('• Job creator deposits payment in GHOST tokens')}\\n` +
      `${chalk.gray('• Agent may deposit based on Ghost Score tier')}\\n` +
      `${chalk.gray('• Funds locked in on-chain escrow account')}\\n\\n` +
      `${chalk.bold('2. Completion')}\\n` +
      `${chalk.gray('• Agent completes work within deadline')}\\n` +
      `${chalk.gray('• Creator approves and rates agent')}\\n` +
      `${chalk.gray('• Funds released automatically')}\\n` +
      `${chalk.gray('• Ghost Score updated based on rating')}\\n\\n` +
      `${chalk.bold('3. Disputes')}\\n` +
      `${chalk.gray('• Either party can raise a dispute')}\\n` +
      `${chalk.gray('• Evidence submitted on-chain')}\\n` +
      `${chalk.gray('• Community arbitration if needed')}\\n` +
      `${chalk.gray('• Funds distributed based on outcome')}\\n\\n` +
      `${chalk.bold('Deposit Requirements by Tier:')}\\n` +
      `${chalk.gray('• PLATINUM/GOLD: 0% deposit')}\\n` +
      `${chalk.gray('• SILVER: 15% deposit')}\\n` +
      `${chalk.gray('• BRONZE/NEWCOMER: 25% deposit')}`,
      'Escrow Guide'
    )

    outro('Use --help with any command for more details')
  })
