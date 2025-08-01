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

// Clean type definitions
interface CreateMultisigOptions {
  name?: string
  members?: string
  threshold?: string
}

interface CreateProposalOptions {
  title?: string
  description?: string
  type?: string
}

interface VoteOptions {
  proposal?: string
  choice?: 'yes' | 'no' | 'abstain'
}

interface RBACOptions {
  action?: 'grant' | 'revoke'
  user?: string
  role?: string
}

export const governanceCommand = new Command('governance')
  .description('Participate in protocol governance')

// Multisig subcommand
const multisigCommand = new Command('multisig')
  .description('Manage multi-signature wallets')

multisigCommand
  .command('create')
  .description('Create a new multisig wallet')
  .option('-n, --name <name>', 'Multisig name')
  .option('-m, --members <members>', 'Comma-separated list of member addresses')
  .option('-t, --threshold <threshold>', 'Number of signatures required')
  .action(async (options: CreateMultisigOptions) => {
    intro(chalk.blue('🔐 Create Multisig Wallet'))

    try {
      const s = spinner()
      s.start('Connecting to network...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)
      
      s.stop('✅ Connected to devnet')

      // Get multisig name
      let name = options.name
      if (!name) {
        const nameInput = await text({
          message: 'Multisig wallet name:',
          placeholder: 'Treasury Multisig',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Multisig name is required'
            }
            if (value.length > 50) {
              return 'Name must be less than 50 characters'
            }
          }
        })

        if (isCancel(nameInput)) {
          cancel('Multisig creation cancelled')
          return
        }

        name = nameInput.toString()
      }

      // Get member addresses
      let members = options.members
      if (!members) {
        const membersInput = await text({
          message: 'Member addresses (comma-separated):',
          placeholder: 'addr1,addr2,addr3',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'At least one member address is required'
            }
            const addresses = value.split(',').map(a => a.trim())
            if (addresses.length < 2) {
              return 'Multisig requires at least 2 members'
            }
            if (addresses.length > 10) {
              return 'Maximum 10 members allowed'
            }
            // Validate each address format
            for (const addr of addresses) {
              try {
                address(addr)
              } catch {
                return `Invalid address format: ${addr}`
              }
            }
          }
        })

        if (isCancel(membersInput)) {
          cancel('Multisig creation cancelled')
          return
        }

        members = membersInput.toString()
      }

      const memberAddresses = members.split(',').map(a => a.trim())

      // Get threshold
      let threshold = options.threshold
      if (!threshold) {
        const thresholdInput = await select({
          message: 'Signature threshold:',
          options: [
            { value: '1', label: '1 signature', hint: 'Any member can execute' },
            { value: '2', label: '2 signatures', hint: 'Requires 2 members' },
            { value: Math.ceil(memberAddresses.length / 2).toString(), label: `${Math.ceil(memberAddresses.length / 2)} signatures`, hint: 'Simple majority' },
            { value: memberAddresses.length.toString(), label: `${memberAddresses.length} signatures`, hint: 'Unanimous (all members)' }
          ]
        })

        if (isCancel(thresholdInput)) {
          cancel('Multisig creation cancelled')
          return
        }

        threshold = thresholdInput.toString()
      }

      const thresholdNum = parseInt(threshold)

      // Show multisig preview
      note(
        `${chalk.bold('Multisig Details:')}\n` +
        `${chalk.gray('Name:')} ${name}\n` +
        `${chalk.gray('Members:')} ${memberAddresses.length}\n` +
        `${chalk.gray('Threshold:')} ${thresholdNum} of ${memberAddresses.length}\n` +
        `${chalk.gray('Creator:')} ${wallet.address.slice(0, 8)}...${wallet.address.slice(-8)}\n` +
        `${chalk.gray('Security:')} ${thresholdNum === memberAddresses.length ? 'Maximum' : thresholdNum === 1 ? 'Minimal' : 'Balanced'}`,
        'Multisig Preview'
      )

      const confirmCreate = await confirm({
        message: 'Create this multisig wallet?'
      })

      if (isCancel(confirmCreate) || !confirmCreate) {
        cancel('Multisig creation cancelled')
        return
      }

      s.start('Creating multisig on blockchain...')

      try {
        const signature = await safeClient.governance.createMultisig(toSDKSigner(wallet), {
          name,
          members: memberAddresses.map(addr => address(addr)),
          threshold: thresholdNum,
          multisigId: Date.now().toString()
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Multisig created successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('🔐 Multisig Created Successfully!')}\n\n` +
          `${chalk.bold('Multisig Details:')}\n` +
          `${chalk.gray('Name:')} ${name}\n` +
          `${chalk.gray('Members:')} ${memberAddresses.length}\n` +
          `${chalk.gray('Threshold:')} ${thresholdNum} signatures required\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Next Steps:')}\n` +
          `• Share multisig address with members\n` +
          `• Create proposals: ${chalk.cyan('gs governance proposal create')}\n` +
          `• Manage transactions through multisig approval process`
        )

      } catch (error) {
        s.stop('❌ Failed to create multisig')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to create multisig: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

multisigCommand
  .command('list')
  .description('List your multisig wallets')
  .action(async () => {
    intro(chalk.blue('📋 Your Multisig Wallets'))

    try {
      const s = spinner()
      s.start('Loading multisig wallets...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const multisigs = await safeClient.governance.listMultisigs({ creator: wallet.address })

      s.stop(`✅ Found ${multisigs.length} multisig wallets`)

      if (multisigs.length === 0) {
        outro(
          `${chalk.yellow('No multisig wallets found')}\n\n` +
          `${chalk.gray('• Create a multisig:')} ${chalk.cyan('gs governance multisig create')}\n` +
          `${chalk.gray('Get invited to existing multisigs by other members')}`
        )
        return
      }

      // Display multisigs
      log.info(`\n${chalk.bold('Your Multisig Wallets:')}\n`)
      
      multisigs.forEach((multisig, index) => {
        const isCreator = multisig.creator === wallet.address
        const role = isCreator ? chalk.green('CREATOR') : chalk.blue('MEMBER')
        
        log.info(
          `${chalk.bold(`${index + 1}. ${multisig.name}`)}\n` +
          `   ${chalk.gray('Address:')} ${multisig.address.slice(0, 8)}...${multisig.address.slice(-8)}\n` +
          `   ${chalk.gray('Members:')} ${multisig.members.length}\n` +
          `   ${chalk.gray('Threshold:')} ${multisig.threshold} of ${multisig.members.length}\n` +
          `   ${chalk.gray('Your Role:')} ${role}\n` +
          `   ${chalk.gray('Pending Proposals:')} ${multisig.pendingProposals ?? 0}\n`
        )
      })

      outro(
        `${chalk.yellow('💡 Commands:')}\n` +
        `${chalk.cyan('gs governance proposal create')} - Create proposal\n` +
        `${chalk.cyan('gs governance proposal list')} - View proposals\n` +
        `${chalk.cyan('gs governance vote')} - Vote on proposals`
      )

    } catch (error) {
      log.error(`Failed to load multisigs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

governanceCommand.addCommand(multisigCommand)

// Proposal subcommand
const proposalCommand = new Command('proposal')
  .description('Manage governance proposals')

proposalCommand
  .command('create')
  .description('Create a new governance proposal')
  .option('-t, --title <title>', 'Proposal title')
  .option('-d, --description <description>', 'Proposal description')
  .option('--type <type>', 'Proposal type (config, upgrade, transfer, custom)')
  .action(async (options: CreateProposalOptions) => {
    intro(chalk.yellow('📝 Create Governance Proposal'))

    try {
      const s = spinner()
      s.start('Loading your multisigs...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get user's multisigs
      const multisigs = await safeClient.governance.listMultisigs({ creator: wallet.address })
      
      s.stop(`✅ Found ${multisigs.length} multisig wallets`)

      if (multisigs.length === 0) {
        outro('No multisig wallets found. Create one first with: gs governance multisig create')
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
            { value: 'config', label: '⚙️ Configuration Change', hint: 'Modify protocol parameters' },
            { value: 'upgrade', label: '⬆️ Protocol Upgrade', hint: 'Upgrade smart contracts' },
            { value: 'transfer', label: '💸 Treasury Transfer', hint: 'Transfer funds from treasury' },
            { value: 'custom', label: '🔧 Custom Action', hint: 'Custom governance action' }
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
          multisigAddress: address(selectedMultisig.address),
          title,
          description,
          proposalType: type,
          votingPeriod: parseInt(duration) * 24 * 3600, // Convert days to seconds
          proposalId: Date.now().toString()
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Proposal created successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('📝 Proposal Created Successfully!')}\n\n` +
          `${chalk.bold('Proposal Details:')}\n` +
          `${chalk.gray('Title:')} ${title}\n` +
          `${chalk.gray('Type:')} ${type.toUpperCase()}\n` +
          `${chalk.gray('Multisig:')} ${selectedMultisig.name}\n` +
          `${chalk.gray('Voting Period:')} ${duration} days\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Next Steps:')}\n` +
          `• Notify multisig members about the proposal\n` +
          `• Members can vote: ${chalk.cyan('gs governance vote')}\n` +
          `• Monitor voting progress: ${chalk.cyan('gs governance proposal list')}`
        )

      } catch (error) {
        s.stop('❌ Failed to create proposal')
        handleTransactionError(error as Error)
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
    intro(chalk.yellow('📋 Governance Proposals'))

    try {
      const s = spinner()
      s.start('Loading proposals...')
      
      const { client, wallet: _wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get all proposals (SDK doesn't support filtering by participant)
      const proposals = await safeClient.governance.listProposals()

      s.stop(`✅ Found ${proposals.length} proposals`)

      if (proposals.length === 0) {
        outro(
          `${chalk.yellow('No proposals found')}\n\n` +
          `${chalk.gray('• Create a proposal:')} ${chalk.cyan('gs governance proposal create')}\n` +
          `${chalk.gray('• Join a multisig to participate in governance')}`
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
        `${chalk.yellow('💡 Commands:')}\n` +
        `${chalk.cyan('gs governance vote')} - Vote on active proposals\n` +
        `${chalk.cyan('gs governance proposal create')} - Create new proposal`
      )

    } catch (error) {
      log.error(`Failed to load proposals: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

governanceCommand.addCommand(proposalCommand)

// Vote subcommand
governanceCommand
  .command('vote')
  .description('Vote on governance proposals')
  .option('-p, --proposal <address>', 'Proposal address')
  .option('-c, --choice <choice>', 'Vote choice (yes, no, abstain)')
  .action(async (options: VoteOptions) => {
    intro(chalk.yellow('🗳️ Vote on Proposal'))

    try {
      const s = spinner()
      s.start('Loading active proposals...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get all proposals (SDK doesn't support filtering by participant)
      const proposals = await safeClient.governance.listProposals()

      s.stop(`✅ Found ${proposals.length} active proposals`)

      if (proposals.length === 0) {
        outro('No active proposals found to vote on')
        return
      }

      // Select proposal
      let selectedProposal = options.proposal
      if (!selectedProposal) {
        const proposalChoice = await select({
          message: 'Select proposal to vote on:',
          options: proposals.map(proposal => ({
            value: proposal.address,
            label: proposal.title,
            hint: `${proposal.type} • ${proposal.votesFor ?? 0} yes, ${proposal.votesAgainst ?? 0} no`
          }))
        })

        if (isCancel(proposalChoice)) {
          cancel('Voting cancelled')
          return
        }

        selectedProposal = proposalChoice.toString()
      }

      const proposal = proposals.find(p => p.address === selectedProposal)
      if (!proposal) {
        log.error('Proposal not found or not active')
        return
      }

      // Get vote choice
      let choice = options.choice
      if (!choice) {
        const voteChoice = await select({
          message: 'How do you vote?',
          options: [
            { value: 'yes', label: '✅ Yes (Approve)', hint: 'Vote in favor of the proposal' },
            { value: 'no', label: '❌ No (Reject)', hint: 'Vote against the proposal' },
            { value: 'abstain', label: '⚪ Abstain', hint: 'Do not vote either way' }
          ]
        })

        if (isCancel(voteChoice)) {
          cancel('Voting cancelled')
          return
        }

        choice = voteChoice as 'yes' | 'no' | 'abstain'
      }

      // Show voting preview
      note(
        `${chalk.bold('Vote Details:')}\n` +
        `${chalk.gray('Proposal:')} ${proposal.title}\n` +
        `${chalk.gray('Type:')} ${proposal.type.toUpperCase()}\n` +
        `${chalk.gray('Your Vote:')} ${choice.toUpperCase()}\n` +
        `${chalk.gray('Current Votes:')} ${proposal.votesFor ?? 0} yes, ${proposal.votesAgainst ?? 0} no\n` +
        `${chalk.gray('Required:')} ${proposal.threshold} votes to pass`,
        'Vote Confirmation'
      )

      const confirmVote = await confirm({
        message: `Cast your vote as "${choice.toUpperCase()}"?`
      })

      if (isCancel(confirmVote) || !confirmVote) {
        cancel('Voting cancelled')
        return
      }

      s.start('Casting vote on blockchain...')

      try {
        const signature = await safeClient.governance.vote(toSDKSigner(wallet), {
          proposal: address(selectedProposal!),
          vote: choice as 'yes' | 'no' | 'abstain'
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Vote cast successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('🗳️ Vote Cast Successfully!')}\n\n` +
          `${chalk.bold('Vote Details:')}\n` +
          `${chalk.gray('Proposal:')} ${proposal.title}\n` +
          `${chalk.gray('Your Vote:')} ${choice.toUpperCase()}\n` +
          `${chalk.gray('Status:')} Recorded on blockchain\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('💡 Your vote is now part of the governance process!')}`
        )

      } catch (error) {
        s.stop('❌ Failed to cast vote')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to vote: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// RBAC subcommand
const rbacCommand = new Command('rbac')
  .description('Manage role-based access control')

rbacCommand
  .command('grant')
  .description('Grant role to user')
  .option('-u, --user <address>', 'User address')
  .option('-r, --role <role>', 'Role to grant')
  .action(async (options: RBACOptions) => {
    intro(chalk.green('🛡️ Grant Role'))

    try {
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get user address
      let userAddress = options.user
      if (!userAddress) {
        const userInput = await text({
          message: 'User address to grant role to:',
          validate: (value) => {
            if (!value) return 'User address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(userInput)) {
          cancel('Role grant cancelled')
          return
        }

        userAddress = userInput.toString().trim()
      }

      // Get role
      let role = options.role
      if (!role) {
        const roleChoice = await select({
          message: 'Select role to grant:',
          options: [
            { value: 'admin', label: 'Admin', hint: 'Full system access' },
            { value: 'moderator', label: 'Moderator', hint: 'Moderation privileges' },
            { value: 'arbitrator', label: 'Arbitrator', hint: 'Dispute resolution' },
            { value: 'operator', label: 'Operator', hint: 'System operations' }
          ]
        })

        if (isCancel(roleChoice)) {
          cancel('Role grant cancelled')
          return
        }

        role = roleChoice.toString()
      }

      const confirmGrant = await confirm({
        message: `Grant ${role} role to ${userAddress}?`
      })

      if (isCancel(confirmGrant) || !confirmGrant) {
        cancel('Role grant cancelled')
        return
      }

      const s = spinner()
      s.start('Granting role on blockchain...')

      try {
        const signature = await safeClient.governance.grantRole({
          user: address(userAddress),
          role,
          granter: wallet.address,
          signer: toSDKSigner(wallet)
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Role granted successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('🛡️ Role Granted!')}\n\n` +
          `${chalk.gray('User:')} ${userAddress}\n` +
          `${chalk.gray('Role:')} ${role.toUpperCase()}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}`
        )

      } catch (error) {
        s.stop('❌ Failed to grant role')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to grant role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

rbacCommand
  .command('revoke')
  .description('Revoke role from user')
  .option('-u, --user <address>', 'User address')
  .option('-r, --role <role>', 'Role to revoke')
  .action(async (options: RBACOptions) => {
    intro(chalk.red('🚫 Revoke Role'))

    try {
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get user address
      let userAddress = options.user
      if (!userAddress) {
        const userInput = await text({
          message: 'User address to revoke role from:',
          validate: (value) => {
            if (!value) return 'User address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(userInput)) {
          cancel('Role revoke cancelled')
          return
        }

        userAddress = userInput.toString().trim()
      }

      // Get role
      let role = options.role
      if (!role) {
        const roleChoice = await select({
          message: 'Select role to revoke:',
          options: [
            { value: 'admin', label: 'Admin', hint: 'Remove admin access' },
            { value: 'moderator', label: 'Moderator', hint: 'Remove moderation privileges' },
            { value: 'arbitrator', label: 'Arbitrator', hint: 'Remove arbitration rights' },
            { value: 'operator', label: 'Operator', hint: 'Remove operation access' }
          ]
        })

        if (isCancel(roleChoice)) {
          cancel('Role revoke cancelled')
          return
        }

        role = roleChoice.toString()
      }

      const confirmRevoke = await confirm({
        message: `Revoke ${role} role from ${userAddress}?`
      })

      if (isCancel(confirmRevoke) || !confirmRevoke) {
        cancel('Role revoke cancelled')
        return
      }

      const s = spinner()
      s.start('Revoking role on blockchain...')

      try {
        const signature = await safeClient.governance.revokeRole({
          user: address(userAddress),
          role,
          revoker: wallet.address,
          signer: toSDKSigner(wallet)
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Role revoked successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.red('🚫 Role Revoked!')}\n\n` +
          `${chalk.gray('User:')} ${userAddress}\n` +
          `${chalk.gray('Role:')} ${role.toUpperCase()}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}`
        )

      } catch (error) {
        s.stop('❌ Failed to revoke role')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to revoke role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

governanceCommand.addCommand(rbacCommand)

// Default action - show available commands
governanceCommand
  .action(async () => {
    intro(chalk.blue('🏛️ GhostSpeak Governance'))
    
    log.info(`\n${chalk.bold('Available Commands:')}\n`)
    log.info(`${chalk.cyan('gs governance multisig')} - Manage multisig wallets`)
    log.info(`${chalk.cyan('gs governance proposal')} - Create and manage proposals`)
    log.info(`${chalk.cyan('gs governance vote')} - Vote on active proposals`)
    log.info(`${chalk.cyan('gs governance rbac')} - Manage roles and permissions`)
    
    outro('Use --help with any command for more details')
  })