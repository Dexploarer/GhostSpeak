/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import { EscrowModule } from '@ghostspeak/sdk'

// Clean type definitions
interface CreateEscrowOptions {
  client?: string
  provider?: string
  amount?: string
  title?: string
  description?: string
  deadline?: string
  yes?: boolean
}

interface ListEscrowOptions {
  asClient?: boolean
  asProvider?: boolean
  status?: string
}

interface ReleaseOptions {
  escrow?: string
  amount?: string
}

interface DisputeEscrowOptions {
  escrow?: string
  reason?: string
}

export const escrowCommand = new Command('escrow')
  .description('Manage secure escrow payments for work orders')

// Create escrow subcommand
escrowCommand
  .command('create')
  .description('Create a new escrow payment')
  .option('-c, --client <address>', 'Client address (defaults to your address)')
  .option('-p, --provider <address>', 'Service provider address')
  .option('-a, --amount <amount>', 'Escrow amount in SOL')
  .option('-t, --title <title>', 'Work order title')
  .option('--description <description>', 'Work description')
  .option('--deadline <hours>', 'Deadline in hours (default: 72)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (options: CreateEscrowOptions) => {
    intro(chalk.green('🔒 Create Escrow Payment'))

    try {
      const s = spinner()
      s.start('Connecting to network...')
      
      const { client, wallet } = await initializeClient('devnet')
      const _safeClient = createSafeSDKClient(client)
      
      s.stop('✅ Connected to devnet')

      // Get client address (default to user's wallet)
      const clientAddress = options.client ?? wallet.address

      // Get provider address
      let providerAddress = options.provider
      if (!providerAddress) {
        const providerInput = await text({
          message: 'Service provider address:',
          placeholder: 'Enter the agent or user address providing the service',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Provider address is required'
            }
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(providerInput)) {
          cancel('Escrow creation cancelled')
          return
        }

        providerAddress = providerInput.toString().trim()
      }

      // Get work order title
      let title = options.title
      if (!title) {
        const titleInput = await text({
          message: 'Work order title:',
          placeholder: 'AI Code Review and Optimization',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Work order title is required'
            }
            if (value.length < 5) {
              return 'Title must be at least 5 characters'
            }
            if (value.length > 100) {
              return 'Title must be less than 100 characters'
            }
          }
        })

        if (isCancel(titleInput)) {
          cancel('Escrow creation cancelled')
          return
        }

        title = titleInput.toString()
      }

      // Get escrow amount
      let amount = options.amount
      if (!amount) {
        const amountInput = await text({
          message: 'Escrow amount (SOL):',
          placeholder: '0.5',
          validate: (value) => {
            const num = parseFloat(value)
            if (isNaN(num) || num <= 0) {
              return 'Please enter a valid positive number'
            }
            if (num > 100) {
              return 'Escrow amount seems very high. Please confirm.'
            }
          }
        })

        if (isCancel(amountInput)) {
          cancel('Escrow creation cancelled')
          return
        }

        amount = amountInput.toString()
      }

      // Get work description
      let description: string | symbol = options.description ?? ''
      if (!description && !options.yes) {
        description = await text({
          message: 'Work description:',
          placeholder: 'Detailed description of the work to be performed...',
          validate: (value) => {
            if (!value || value.trim().length < 10) {
              return 'Please provide at least 10 characters describing the work'
            }
            if (value.length > 500) {
              return 'Description must be less than 500 characters'
            }
          }
        })

        if (isCancel(description)) {
          cancel('Escrow creation cancelled')
          return
        }
      }
      if (!description) {
        description = `Work order: ${title}`
      }

      // Get deadline
      let deadlineHours = options.deadline ?? '72'
      if (!options.deadline && !options.yes) {
        const deadlineChoice = await select({
          message: 'Work deadline:',
          options: [
            { value: '24', label: '24 hours', hint: 'Rush job' },
            { value: '72', label: '3 days', hint: 'Standard turnaround' },
            { value: '168', label: '1 week', hint: 'Complex work' },
            { value: '336', label: '2 weeks', hint: 'Major project' },
            { value: 'custom', label: 'Custom deadline', hint: 'Specify custom timeframe' }
          ]
        })

        if (isCancel(deadlineChoice)) {
          cancel('Escrow creation cancelled')
          return
        }

        deadlineHours = deadlineChoice.toString()
        if (deadlineHours === 'custom') {
          const customDeadline = await text({
            message: 'Deadline (hours from now):',
            placeholder: '48',
            validate: (value) => {
              const num = parseInt(value)
              if (isNaN(num) || num <= 0) {
                return 'Please enter a valid number of hours'
              }
              if (num > 8760) { // 1 year
                return 'Deadline cannot be more than 1 year'
              }
            }
          })

          if (isCancel(customDeadline)) {
            cancel('Escrow creation cancelled')
            return
          }

          deadlineHours = customDeadline.toString()
        }
      }

      // Show escrow preview
      const amountNum = parseFloat(amount)
      const fees = amountNum * 0.025 // 2.5% platform fee
      const totalCost = amountNum + fees

      note(
        `${chalk.bold('Escrow Details:')}\n` +
        `${chalk.gray('Client:')} ${clientAddress}\n` +
        `${chalk.gray('Provider:')} ${providerAddress}\n` +
        `${chalk.gray('Title:')} ${title}\n` +
        `${chalk.gray('Amount:')} ${amount} SOL\n` +
        `${chalk.gray('Platform Fee:')} ${fees.toFixed(4)} SOL (2.5%)\n` +
        `${chalk.gray('Total Cost:')} ${totalCost.toFixed(4)} SOL\n` +
        `${chalk.gray('Deadline:')} ${deadlineHours} hours from now`,
        'Escrow Preview'
      )

      if (!options.yes) {
        const confirmCreate = await confirm({
          message: `Create escrow for ${totalCost.toFixed(4)} SOL?`
        })

        if (isCancel(confirmCreate) || !confirmCreate) {
          cancel('Escrow creation cancelled')
          return
        }
      }

      s.start('Creating escrow on blockchain...')

      try {
        // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
        const amountLamports = Math.floor(amountNum * 1_000_000_000)
        // const _deadlineTimestamp = Math.floor(Date.now() / 1000) + (parseInt(deadlineHours) * 3600)

        // Create escrow module directly
        const escrowModule = new EscrowModule({
          rpc: client.config.rpc,
          programId: client.config.programId,
          commitment: 'confirmed',
          cluster: 'devnet'
        })

        // Use createWithSol for better UX - auto-wraps SOL!
        const signature = await escrowModule.createWithSol({
          signer: toSDKSigner(wallet),
          amount: BigInt(amountLamports),
          seller: address(providerAddress),
          description: description.toString()
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Escrow created successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('🔒 Escrow Created Successfully!')}\n\n` +
          `${chalk.bold('Escrow Details:')}\n` +
          `${chalk.gray('Title:')} ${title}\n` +
          `${chalk.gray('Amount:')} ${amount} SOL\n` +
          `${chalk.gray('Provider:')} ${providerAddress}\n` +
          `${chalk.gray('Deadline:')} ${deadlineHours} hours\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Next Steps:')}\n` +
          `• Provider can now begin work\n` +
          `• Monitor progress: ${chalk.cyan('ghost escrow list')}\n` +
          `• Release funds when work is complete: ${chalk.cyan('ghost escrow release')}`
        )

      } catch (error) {
        s.stop('❌ Failed to create escrow')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to create escrow: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// List escrows subcommand
escrowCommand
  .command('list')
  .description('List escrow payments')
  .option('--as-client', 'Show escrows where you are the client')
  .option('--as-provider', 'Show escrows where you are the provider')
  .option('-s, --status <status>', 'Filter by status (active, completed, disputed)')
  .action(async (options: ListEscrowOptions) => {
    intro(chalk.green('📋 Escrow Payments'))

    try {
      const s = spinner()
      s.start('Loading escrows...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const escrows = await safeClient.escrow.getEscrowsForUser(wallet.address)

      // Filter based on options
      let filteredEscrows = escrows
      if (options.asClient) {
        filteredEscrows = escrows.filter(e => e.client === wallet.address)
      } else if (options.asProvider) {
        filteredEscrows = escrows.filter(e => e.provider === wallet.address)
      }

      if (options.status) {
        filteredEscrows = filteredEscrows.filter(e => 
          e.status.toLowerCase() === options.status?.toLowerCase()
        )
      }

      s.stop(`✅ Found ${filteredEscrows.length} escrows`)

      if (filteredEscrows.length === 0) {
        outro(
          `${chalk.yellow('No escrows found')}\n\n` +
          `${chalk.gray('• Create an escrow:')} ${chalk.cyan('ghost escrow create')}\n` +
          `${chalk.gray('• Check all escrows:')} ${chalk.cyan('ghost escrow list')}`
        )
        return
      }

      // Display escrows
      log.info(`\n${chalk.bold('Your Escrows:')}\n`)
      
      filteredEscrows.forEach((escrow, index) => {
        const amount = (Number(escrow.paymentAmount) / 1_000_000_000).toFixed(4)
        const isClient = escrow.client === wallet.address
        const role = isClient ? chalk.blue('CLIENT') : chalk.green('PROVIDER')
        
        const statusColor = escrow.status === 'active' ? chalk.yellow : 
                           escrow.status === 'completed' ? chalk.green : 
                           escrow.status === 'disputed' ? chalk.red : chalk.gray

        log.info(
          `${chalk.bold(`${index + 1}. ${escrow.title}`)}\n` +
          `   ${chalk.gray('Address:')} ${escrow.address.slice(0, 8)}...${escrow.address.slice(-8)}\n` +
          `   ${chalk.gray('Amount:')} ${amount} SOL\n` +
          `   ${chalk.gray('Status:')} ${statusColor(escrow.status.toUpperCase())}\n` +
          `   ${chalk.gray('Your Role:')} ${role}\n` +
          `   ${chalk.gray('Other Party:')} ${isClient ? escrow.provider.slice(0, 8) + '...' : escrow.client.slice(0, 8) + '...'}\n`
        )
      })

      outro(
        `${chalk.yellow('💡 Commands:')}\n` +
        `${chalk.cyan('ghost escrow release')} - Release funds to provider\n` +
        `${chalk.cyan('ghost escrow dispute')} - File a dispute\n` +
        `${chalk.cyan('ghost escrow create')} - Create new escrow`
      )

    } catch (error) {
      log.error(`Failed to load escrows: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Release escrow subcommand
escrowCommand
  .command('release')
  .description('Release escrow funds to provider')
  .option('-e, --escrow <address>', 'Escrow address')
  .option('-a, --amount <amount>', 'Amount to release (optional for partial release)')
  .action(async (options: ReleaseOptions) => {
    intro(chalk.green('💰 Release Escrow Funds'))

    try {
      const s = spinner()
      s.start('Loading your escrows...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get escrows where user is the client
      const escrows = await safeClient.escrow.getEscrowsForUser(wallet.address)
      const clientEscrows = escrows.filter(e => 
        e.client === wallet.address && e.status.toLowerCase() === 'active'
      )

      s.stop(`✅ Found ${clientEscrows.length} active escrows`)

      if (clientEscrows.length === 0) {
        outro('No active escrows found where you are the client')
        return
      }

      // Select escrow
      let selectedEscrow = options.escrow
      if (!selectedEscrow) {
        const escrowChoice = await select({
          message: 'Select escrow to release funds from:',
          options: clientEscrows.map(escrow => {
            const amount = (Number(escrow.paymentAmount) / 1_000_000_000).toFixed(4)
            return {
              value: escrow.address,
              label: `${escrow.title} - ${amount} SOL`,
              hint: `Provider: ${escrow.provider.slice(0, 8)}...`
            }
          })
        })

        if (isCancel(escrowChoice)) {
          cancel('Fund release cancelled')
          return
        }

        selectedEscrow = escrowChoice.toString()
      }

      const escrow = clientEscrows.find(e => e.address === selectedEscrow)
      if (!escrow) {
        log.error('Escrow not found or you are not the client')
        return
      }

      const totalAmount = Number(escrow.paymentAmount) / 1_000_000_000

      // Determine release type
      const releaseType = await select({
        message: 'Release type:',
        options: [
          { value: 'full', label: 'Full Release', hint: `Release all ${totalAmount.toFixed(4)} SOL` },
          { value: 'partial', label: 'Partial Release', hint: 'Release a portion of the funds' }
        ]
      })

      if (isCancel(releaseType)) {
        cancel('Fund release cancelled')
        return
      }

      let releaseAmount = totalAmount
      if (releaseType === 'partial') {
        const amountInput = await text({
          message: `Amount to release (max ${totalAmount.toFixed(4)} SOL):`,
          placeholder: (totalAmount * 0.5).toFixed(4),
          validate: (value) => {
            const num = parseFloat(value)
            if (isNaN(num) || num <= 0) {
              return 'Please enter a valid positive number'
            }
            if (num > totalAmount) {
              return `Amount cannot exceed ${totalAmount.toFixed(4)} SOL`
            }
          }
        })

        if (isCancel(amountInput)) {
          cancel('Fund release cancelled')
          return
        }

        releaseAmount = parseFloat(amountInput.toString())
      }

      // Get release reason
      const releaseReason = await select({
        message: 'Reason for release:',
        options: [
          { value: 'work_completed', label: 'Work Completed', hint: 'All work has been completed satisfactorily' },
          { value: 'milestone', label: 'Milestone Reached', hint: 'Important milestone has been achieved' },
          { value: 'partial_delivery', label: 'Partial Delivery', hint: 'Part of the work has been delivered' },
          { value: 'other', label: 'Other Reason', hint: 'Custom release reason' }
        ]
      })

      if (isCancel(releaseReason)) {
        cancel('Fund release cancelled')
        return
      }

      let notes = ''
      if (releaseReason === 'other') {
        const notesInput = await text({
          message: 'Release notes:',
          placeholder: 'Explain why you are releasing the funds...'
        })

        if (isCancel(notesInput)) {
          cancel('Fund release cancelled')
          return
        }

        notes = notesInput.toString()
      }

      // Show release preview
      note(
        `${chalk.bold('Release Details:')}\n` +
        `${chalk.gray('Escrow:')} ${escrow.title}\n` +
        `${chalk.gray('Provider:')} ${escrow.provider}\n` +
        `${chalk.gray('Release Amount:')} ${releaseAmount.toFixed(4)} SOL\n` +
        `${chalk.gray('Remaining:')} ${(totalAmount - releaseAmount).toFixed(4)} SOL\n` +
        `${chalk.gray('Reason:')} ${releaseReason.replace('_', ' ')}\n` +
        `${notes ? chalk.gray('Notes: ') + notes : ''}`,
        'Release Preview'
      )

      const confirmRelease = await confirm({
        message: `Release ${releaseAmount.toFixed(4)} SOL to the provider?`
      })

      if (isCancel(confirmRelease) || !confirmRelease) {
        cancel('Fund release cancelled')
        return
      }

      s.start('Releasing funds on blockchain...')

      try {
        const signature = await safeClient.escrow.releaseFunds(toSDKSigner(wallet), selectedEscrow)

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Funds released successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('💰 Funds Released!')}\n\n` +
          `${chalk.bold('Release Details:')}\n` +
          `${chalk.gray('Escrow:')} ${escrow.title}\n` +
          `${chalk.gray('Amount Released:')} ${releaseAmount.toFixed(4)} SOL\n` +
          `${chalk.gray('Provider:')} ${escrow.provider}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('✅ The provider will receive the funds shortly')}`
        )

      } catch (error) {
        s.stop('❌ Failed to release funds')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to release funds: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Dispute escrow subcommand
escrowCommand
  .command('dispute')
  .description('File a dispute for an escrow payment')
  .option('-e, --escrow <address>', 'Escrow address')
  .option('-r, --reason <reason>', 'Dispute reason')
  .action(async (options: DisputeEscrowOptions) => {
    intro(chalk.red('⚖️ File Escrow Dispute'))

    try {
      const s = spinner()
      s.start('Loading your escrows...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get escrows where user is involved
      const escrows = await safeClient.escrow.getEscrowsForUser(wallet.address)
      const disputableEscrows = escrows.filter(e => 
        e.status.toLowerCase() === 'active' && 
        (e.client === wallet.address || e.provider === wallet.address)
      )

      s.stop(`✅ Found ${disputableEscrows.length} active escrows`)

      if (disputableEscrows.length === 0) {
        outro('No active escrows found that can be disputed')
        return
      }

      // Select escrow
      let selectedEscrow = options.escrow
      if (!selectedEscrow) {
        const escrowChoice = await select({
          message: 'Select escrow to dispute:',
          options: disputableEscrows.map(escrow => {
            const amount = (Number(escrow.paymentAmount) / 1_000_000_000).toFixed(4)
            const role = escrow.client === wallet.address ? 'CLIENT' : 'PROVIDER'
            return {
              value: escrow.address,
              label: `${escrow.title} - ${amount} SOL`,
              hint: `Your role: ${role}`
            }
          })
        })

        if (isCancel(escrowChoice)) {
          cancel('Dispute filing cancelled')
          return
        }

        selectedEscrow = escrowChoice.toString()
      }

      const escrow = disputableEscrows.find(e => e.address === selectedEscrow)
      if (!escrow) {
        log.error('Escrow not found or cannot be disputed')
        return
      }

      // Get dispute reason
      let reason = options.reason
      if (!reason) {
        const reasonChoice = await select({
          message: 'Dispute reason:',
          options: [
            { value: 'work_not_delivered', label: 'Work Not Delivered', hint: 'Provider has not delivered the work' },
            { value: 'poor_quality', label: 'Poor Quality Work', hint: 'Work quality is below expectations' },
            { value: 'missed_deadline', label: 'Missed Deadline', hint: 'Work was not completed on time' },
            { value: 'payment_issue', label: 'Payment Issue', hint: 'Problem with payment or terms' },
            { value: 'scope_disagreement', label: 'Scope Disagreement', hint: 'Disagreement about work scope' },
            { value: 'other', label: 'Other Issue', hint: 'Custom dispute reason' }
          ]
        })

        if (isCancel(reasonChoice)) {
          cancel('Dispute filing cancelled')
          return
        }

        reason = reasonChoice.toString()
      }

      // Get detailed explanation
      const explanation = await text({
        message: 'Explain the dispute in detail:',
        placeholder: 'Provide specific details about the issue...',
        validate: (value) => {
          if (!value || value.trim().length < 20) {
            return 'Please provide at least 20 characters explaining the dispute'
          }
          if (value.length > 1000) {
            return 'Explanation must be less than 1000 characters'
          }
        }
      })

      if (isCancel(explanation)) {
        cancel('Dispute filing cancelled')
        return
      }

      // Show dispute preview
      note(
        `${chalk.bold('Dispute Details:')}\n` +
        `${chalk.gray('Escrow:')} ${escrow.title}\n` +
        `${chalk.gray('Amount:')} ${(Number(escrow.paymentAmount) / 1_000_000_000).toFixed(4)} SOL\n` +
        `${chalk.gray('Reason:')} ${reason.replace('_', ' ')}\n` +
        `${chalk.gray('Explanation:')} ${explanation.toString().slice(0, 100)}...\n` +
        `${chalk.gray('Filing Fee:')} 0.01 SOL (refunded if dispute is upheld)`,
        'Dispute Preview'
      )

      const confirmDispute = await confirm({
        message: 'File this dispute? (This will freeze the escrow until resolved)'
      })

      if (isCancel(confirmDispute) || !confirmDispute) {
        cancel('Dispute filing cancelled')
        return
      }

      s.start('Filing dispute on blockchain...')

      try {
        const signature = await safeClient.escrow.fileDispute({
          escrow: address(selectedEscrow),
          reason,
          explanation: explanation.toString(),
          evidence: [],
          signer: toSDKSigner(wallet)
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Dispute filed successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.red('⚖️ Dispute Filed!')}\n\n` +
          `${chalk.bold('Dispute Details:')}\n` +
          `${chalk.gray('Escrow:')} ${escrow.title}\n` +
          `${chalk.gray('Reason:')} ${reason.replace('_', ' ')}\n` +
          `${chalk.gray('Status:')} Under Review\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Next Steps:')}\n` +
          `• The escrow is now frozen until resolution\n` +
          `• An arbitrator will review the dispute\n` +
          `• You can submit additional evidence if needed\n` +
          `• Check status: ${chalk.cyan('ghost dispute list --mine')}`
        )

      } catch (error) {
        s.stop('❌ Failed to file dispute')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to file dispute: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action - show escrow list
escrowCommand
  .action(async () => {
    // Redirect to list command
    await escrowCommand.commands.find(cmd => cmd.name() === 'list')?.parseAsync(process.argv)
  })