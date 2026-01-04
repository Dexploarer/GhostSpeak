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
import { initializeClient, getExplorerUrl, toSDKSigner } from '../../utils/client.js'
import { handleError } from '../../utils/error-handler.js'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { CreateProposalOptions } from './types.js'

export const proposalCommand = new Command('proposal')
  .description('Manage governance proposals')

proposalCommand
  .command('create')
  .description('Create a new governance proposal')
  .option('-t, --title <title>', 'Proposal title')
  .option('-d, --description <description>', 'Proposal description')
  .option('--type <type>', 'Proposal type (config, upgrade, transfer, custom)')
  .action(async (options: CreateProposalOptions) => {
    intro(chalk.yellow('Create Governance Proposal'))

    try {
      const s = spinner()
      s.start('Loading your multisigs...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get user's multisigs
      const multisigs = await safeClient.governance.listMultisigs({ creator: wallet.address })

      s.stop(`Found ${multisigs.length} multisig wallets`)

      if (multisigs.length === 0) {
        outro('No multisig wallets found. Create one first with: ghost governance multisig create')
        return
      }

      // Select multisig
      const multisigChoice = await select({
        message: 'Select multisig for proposal:',
        options: multisigs.map(ms => ({
          value: ms.address,
          label: ms.name,
          hint: `${ms.threshold} of ${ms.members.length} signatures required`
        }))
      })

      if (isCancel(multisigChoice)) {
        cancel('Proposal creation cancelled')
        return
      }

      const selectedMultisig = multisigs.find(ms => ms.address === multisigChoice.toString())!

      // Get proposal title
      let title = options.title
      if (!title) {
        const titleInput = await text({
          message: 'Proposal title:',
          placeholder: 'Increase transaction fee threshold',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Proposal title is required'
            }
            if (value.length > 100) {
              return 'Title must be less than 100 characters'
            }
          }
        })

        if (isCancel(titleInput)) {
          cancel('Proposal creation cancelled')
          return
        }

        title = titleInput.toString()
      }

      // Get proposal type
      let type = options.type
      if (!type) {
        const typeChoice = await select({
          message: 'Proposal type:',
          options: [
            { value: 'config', label: 'Configuration Change', hint: 'Modify protocol parameters' },
            { value: 'upgrade', label: 'Protocol Upgrade', hint: 'Upgrade smart contracts' },
            { value: 'transfer', label: 'Treasury Transfer', hint: 'Transfer funds from treasury' },
            { value: 'custom', label: 'Custom Action', hint: 'Custom governance action' }
          ]
        })

        if (isCancel(typeChoice)) {
          cancel('Proposal creation cancelled')
          return
        }

        type = typeChoice.toString()
      }

      // Get proposal description
      let description = options.description
      if (!description) {
        const descriptionInput = await text({
          message: 'Proposal description:',
          placeholder: 'Detailed explanation of what this proposal does and why...',
          validate: (value) => {
            if (!value || value.trim().length < 20) {
              return 'Please provide at least 20 characters describing the proposal'
            }
            if (value.length > 1000) {
              return 'Description must be less than 1000 characters'
            }
          }
        })

        if (isCancel(descriptionInput)) {
          cancel('Proposal creation cancelled')
          return
        }

        description = descriptionInput.toString()
      }

      // Get voting duration
      const duration = await select({
        message: 'Voting period:',
        options: [
          { value: '1', label: '1 day', hint: 'Quick decision' },
          { value: '3', label: '3 days', hint: 'Standard period' },
          { value: '7', label: '1 week', hint: 'Extended discussion' },
          { value: '14', label: '2 weeks', hint: 'Complex proposals' }
        ]
      })

      if (isCancel(duration)) {
        cancel('Proposal creation cancelled')
        return
      }

      // Show proposal preview
      note(
        `${chalk.bold('Proposal Details:')}\n` +
        `${chalk.gray('Multisig:')} ${selectedMultisig.name}\n` +
        `${chalk.gray('Title:')} ${title}\n` +
        `${chalk.gray('Type:')} ${type.toUpperCase()}\n` +
        `${chalk.gray('Description:')} ${description.slice(0, 100)}${description.length > 100 ? '...' : ''}\n` +
        `${chalk.gray('Voting Period:')} ${duration} days\n` +
        `${chalk.gray('Required Votes:')} ${selectedMultisig.threshold} of ${selectedMultisig.members.length}`,
        'Proposal Preview'
      )

      const confirmCreate = await confirm({
        message: 'Create this proposal?'
      })

      if (isCancel(confirmCreate) || !confirmCreate) {
        cancel('Proposal creation cancelled')
        return
      }

      s.start('Creating proposal on blockchain...')

      try {
        const signature = await safeClient.governance.createProposal(toSDKSigner(wallet), {
          multisig: address(selectedMultisig.address),
          title,
          description,
          proposalType: type,
          votingDuration: parseInt(duration as string) * 24 * 3600, // Convert days to seconds
          proposalId: BigInt(Date.now())
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('Proposal created successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        outro(
          `${chalk.green('Proposal Created Successfully!')}\n\n` +
          `${chalk.bold('Proposal Details:')}\n` +
          `${chalk.gray('Title:')} ${title}\n` +
          `${chalk.gray('Type:')} ${type.toUpperCase()}\n` +
          `${chalk.gray('Multisig:')} ${selectedMultisig.name}\n` +
          `${chalk.gray('Voting Period:')} ${duration} days\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Next Steps:')}\n` +
          `- Notify multisig members about the proposal\n` +
          `- Members can vote: ${chalk.cyan('ghost governance vote')}\n` +
          `- Monitor voting progress: ${chalk.cyan('ghost governance proposal list')}`
        )

      } catch (error) {
        s.stop('Failed to create proposal')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to create proposal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

proposalCommand
  .command('list')
  .description('List governance proposals')
  .option('--active', 'Show only active proposals')
  .action(async (_options: { active?: boolean }) => {
    intro(chalk.yellow('Governance Proposals'))

    try {
      const s = spinner()
      s.start('Loading proposals...')

      const { client, wallet: _wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get all proposals (SDK doesn't support filtering by participant)
      const proposals = await safeClient.governance.listProposals()

      s.stop(`Found ${proposals.length} proposals`)

      if (proposals.length === 0) {
        outro(
          `${chalk.yellow('No proposals found')}\n\n` +
          `${chalk.gray('- Create a proposal:')} ${chalk.cyan('ghost governance proposal create')}\n` +
          `${chalk.gray('- Join a multisig to participate in governance')}`
        )
        return
      }

      // Display proposals
      log.info(`\n${chalk.bold('Governance Proposals:')}\n`)

      proposals.forEach((proposal, index) => {
        const status = proposal.status.toLowerCase()
        const statusColor = status === 'active' ? chalk.yellow :
                           status === 'passed' ? chalk.green :
                           status === 'failed' ? chalk.red : chalk.gray

        const votesFor = proposal.votesFor ?? 0
        const votesAgainst = proposal.votesAgainst ?? 0
        const totalVotes = votesFor + votesAgainst
        const threshold = proposal.threshold

        log.info(
          `${chalk.bold(`${index + 1}. ${proposal.title}`)}\n` +
          `   ${chalk.gray('Type:')} ${proposal.type.toUpperCase()}\n` +
          `   ${chalk.gray('Status:')} ${statusColor(status.toUpperCase())}\n` +
          `   ${chalk.gray('Votes:')} ${votesFor} yes, ${votesAgainst} no (${totalVotes}/${threshold} required)\n` +
          `   ${chalk.gray('Creator:')} ${proposal.creator.slice(0, 8)}...${proposal.creator.slice(-8)}\n` +
          `   ${chalk.gray('Deadline:')} ${proposal.deadline ? new Date(Number(proposal.deadline) * 1000).toLocaleDateString() : 'N/A'}\n`
        )
      })

      outro(
        `${chalk.yellow('Commands:')}\n` +
        `${chalk.cyan('ghost governance vote')} - Vote on active proposals\n` +
        `${chalk.cyan('ghost governance proposal create')} - Create new proposal`
      )

    } catch (error) {
      log.error(`Failed to load proposals: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
