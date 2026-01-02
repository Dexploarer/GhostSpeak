/**
 * Multisig Commands
 * Create and manage multisignature wallets for shared agent control
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
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'

// Type definitions
interface CreateOptions {
  threshold?: string
  signers?: string
  json?: boolean
}

interface ProposeOptions {
  multisig?: string
  title?: string
  description?: string
}

interface ApproveOptions {
  proposal?: string
  multisig?: string
}

interface ExecuteOptions {
  proposal?: string
  multisig?: string
}

interface ListOptions {
  owner?: string
  json?: boolean
}

export const multisigCommand = new Command('multisig')
  .description('Manage multisignature wallets for shared agent control')

// Create subcommand
multisigCommand
  .command('create')
  .description('Create a new multisig wallet')
  .option('-t, --threshold <number>', 'Number of signatures required')
  .option('-s, --signers <addresses>', 'Comma-separated list of signer addresses')
  .option('--json', 'Output as JSON')
  .action(async (options: CreateOptions) => {
    intro(chalk.cyan('🔐 Create Multisig Wallet'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get signers
      let signerAddresses: Address[] = []
      if (options.signers) {
        signerAddresses = options.signers.split(',').map(s => address(s.trim()))
      } else {
        const signersInput = await text({
          message: 'Signer addresses (comma-separated):',
          placeholder: 'addr1, addr2, addr3',
          validate: (value) => {
            if (!value) return 'At least one signer address is required'
            const addrs = value.split(',').map(s => s.trim())
            if (addrs.length < 2) return 'Multisig requires at least 2 signers'
            try {
              addrs.forEach(a => address(a))
              return
            } catch {
              return 'Invalid address format'
            }
          }
        })

        if (isCancel(signersInput)) {
          cancel('Creation cancelled')
          return
        }

        signerAddresses = signersInput.toString().split(',').map(s => address(s.trim()))
      }

      // Add current wallet as a signer if not already included
      if (!signerAddresses.some(s => s === wallet.address)) {
        signerAddresses.push(wallet.address)
      }

      // Get threshold
      let threshold = options.threshold ? parseInt(options.threshold) : 0
      if (!threshold) {
        const thresholdInput = await text({
          message: `Approval threshold (1-${signerAddresses.length}):`,
          placeholder: '2',
          initialValue: Math.ceil(signerAddresses.length / 2).toString(),
          validate: (value) => {
            if (!value) return 'Threshold is required'
            const t = parseInt(value)
            if (isNaN(t) || t < 1 || t > signerAddresses.length) {
              return `Threshold must be between 1 and ${signerAddresses.length}`
            }
            return
          }
        })

        if (isCancel(thresholdInput)) {
          cancel('Creation cancelled')
          return
        }

        threshold = parseInt(thresholdInput.toString())
      }

      // Show multisig preview
      note(
        `${chalk.bold('Multisig Configuration:')}\n` +
        `${chalk.gray('Total Signers:')} ${signerAddresses.length}\n` +
        `${chalk.gray('Approval Threshold:')} ${threshold}/${signerAddresses.length}\n\n` +
        `${chalk.bold('Signers:')}\n` +
        signerAddresses.map((s, i) =>
          `${chalk.gray(`${i + 1}.`)} ${s}${s === wallet.address ? chalk.yellow(' (you)') : ''}`
        ).join('\n') + '\n\n' +
        `${chalk.yellow('This multisig will require ' + threshold + ' signature(s) to execute transactions.')}`,
        'Multisig Preview'
      )

      const confirmCreate = await confirm({
        message: 'Create this multisig wallet?'
      })

      if (isCancel(confirmCreate) || !confirmCreate) {
        cancel('Creation cancelled')
        return
      }

      s.start('Creating multisig on blockchain...')

      try {
        // Generate unique multisig ID
        const multisigId = BigInt(Date.now())

        const signature = await safeClient.multisigModule.createMultisig({
          owner: toSDKSigner(wallet),
          multisigId,
          threshold,
          signers: signerAddresses
        })

        s.stop('✅ Multisig created successfully')

        // Derive multisig PDA
        const { deriveMultisigPda } = await import('@ghostspeak/sdk')
        const [multisigAddress] = await deriveMultisigPda({
          programAddress: safeClient.programId,
          creator: wallet.address,
          multisigId
        })

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            multisigAddress,
            multisigId: multisigId.toString(),
            threshold,
            signers: signerAddresses,
            signature,
            explorerUrl
          }, null, 2))
          return
        }

        outro(
          `${chalk.green('✅ Multisig Created Successfully!')}\n\n` +
          `${chalk.bold('Multisig Details:')}\n` +
          `${chalk.gray('Address:')} ${chalk.cyan(multisigAddress)}\n` +
          `${chalk.gray('ID:')} ${multisigId}\n` +
          `${chalk.gray('Threshold:')} ${threshold}/${signerAddresses.length}\n` +
          `${chalk.gray('Transaction:')} ${signature}\n\n` +
          `${chalk.bold('Next Steps:')}\n` +
          `${chalk.gray('•')} Create proposals: ${chalk.cyan(`ghost multisig propose`)}\n` +
          `${chalk.gray('•')} List multisigs: ${chalk.cyan(`ghost multisig list`)}\n\n` +
          `${chalk.gray('Explorer:')} ${chalk.cyan(explorerUrl)}`
        )

      } catch (error) {
        s.stop('❌ Failed to create multisig')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to create multisig: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Propose subcommand
multisigCommand
  .command('propose')
  .description('Create a proposal for multisig approval')
  .option('-m, --multisig <address>', 'Multisig address')
  .option('-t, --title <title>', 'Proposal title')
  .option('-d, --description <desc>', 'Proposal description')
  .action(async (options: ProposeOptions) => {
    intro(chalk.blue('📝 Create Multisig Proposal'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get multisig address
      let multisigAddress = options.multisig
      if (!multisigAddress) {
        const addressInput = await text({
          message: 'Multisig address:',
          validate: (value) => {
            if (!value) return 'Multisig address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Invalid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Proposal cancelled')
          return
        }

        multisigAddress = addressInput.toString().trim()
      }

      const multisigAddr = address(multisigAddress)

      // Verify multisig exists
      s.start('Verifying multisig...')
      const multisigData = await safeClient.multisigModule.getMultisig(multisigAddr)

      if (!multisigData) {
        s.stop('❌ Multisig not found')
        outro(chalk.red(`No multisig found at: ${multisigAddress}`))
        return
      }

      s.stop('✅ Multisig verified')

      // Get title
      let title = options.title
      if (!title) {
        const titleInput = await text({
          message: 'Proposal title:',
          placeholder: 'Transfer 100 SOL to treasury',
          validate: (value) => {
            if (!value) return 'Title is required'
            if (value.length < 5) return 'Title must be at least 5 characters'
            return
          }
        })

        if (isCancel(titleInput)) {
          cancel('Proposal cancelled')
          return
        }

        title = titleInput.toString().trim()
      }

      // Get description
      let description = options.description
      if (!description) {
        const descInput = await text({
          message: 'Proposal description:',
          placeholder: 'Monthly treasury allocation for development',
          validate: (value) => {
            if (!value) return 'Description is required'
            return
          }
        })

        if (isCancel(descInput)) {
          cancel('Proposal cancelled')
          return
        }

        description = descInput.toString().trim()
      }

      // Show proposal preview
      note(
        `${chalk.bold('Proposal Details:')}\n` +
        `${chalk.gray('Multisig:')} ${multisigAddress}\n` +
        `${chalk.gray('Title:')} ${title}\n` +
        `${chalk.gray('Description:')} ${description}\n` +
        `${chalk.gray('Threshold:')} ${multisigData.threshold}/${multisigData.signers.length}\n\n` +
        `${chalk.yellow('This proposal will require ' + multisigData.threshold + ' approval(s).')}`,
        'Proposal Preview'
      )

      const confirmPropose = await confirm({
        message: 'Create this proposal?'
      })

      if (isCancel(confirmPropose) || !confirmPropose) {
        cancel('Proposal cancelled')
        return
      }

      s.start('Creating proposal on blockchain...')

      try {
        const proposalId = BigInt(Date.now())
        const { ProposalType } = await import('@ghostspeak/sdk')

        const signature = await safeClient.multisigModule.createProposal({
          multisigAddress: multisigAddr,
          title,
          description,
          proposalType: ProposalType.Custom,
          executionParams: {
            instructions: [],
            executionDelay: 0n,
            executionConditions: [],
            cancellable: true,
            autoExecute: false,
            executionAuthority: wallet.address
          },
          proposalId,
          proposer: toSDKSigner(wallet)
        })

        s.stop('✅ Proposal created successfully')

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        outro(
          `${chalk.green('✅ Proposal Created!')}\n\n` +
          `${chalk.gray('Proposal ID:')} ${proposalId}\n` +
          `${chalk.gray('Title:')} ${title}\n` +
          `${chalk.gray('Status:')} Pending approval\n` +
          `${chalk.gray('Required Approvals:')} ${multisigData.threshold}\n` +
          `${chalk.gray('Transaction:')} ${signature}\n\n` +
          `${chalk.bold('Next Steps:')}\n` +
          `${chalk.gray('•')} Other signers approve: ${chalk.cyan(`ghost multisig approve`)}\n` +
          `${chalk.gray('•')} Execute when approved: ${chalk.cyan(`ghost multisig execute`)}\n\n` +
          `${chalk.gray('Explorer:')} ${chalk.cyan(explorerUrl)}`
        )

      } catch (error) {
        s.stop('❌ Failed to create proposal')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to propose: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Approve subcommand
multisigCommand
  .command('approve')
  .description('Approve a multisig proposal')
  .option('-p, --proposal <address>', 'Proposal address')
  .option('-m, --multisig <address>', 'Multisig address')
  .action(async (options: ApproveOptions) => {
    intro(chalk.green('✅ Approve Multisig Proposal'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get proposal address
      let proposalAddress = options.proposal
      if (!proposalAddress) {
        const addressInput = await text({
          message: 'Proposal address:',
          validate: (value) => {
            if (!value) return 'Proposal address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Invalid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Approval cancelled')
          return
        }

        proposalAddress = addressInput.toString().trim()
      }

      const proposalAddr = address(proposalAddress)

      // Fetch proposal details
      s.start('Fetching proposal...')
      const proposalData = await safeClient.governanceModule.getProposal(proposalAddr)

      if (!proposalData) {
        s.stop('❌ Proposal not found')
        outro(chalk.red(`No proposal found at: ${proposalAddress}`))
        return
      }

      s.stop('✅ Proposal loaded')

      // Show proposal details
      note(
        `${chalk.bold('Proposal Details:')}\n` +
        `${chalk.gray('Title:')} ${proposalData.title}\n` +
        `${chalk.gray('Description:')} ${proposalData.description}\n` +
        `${chalk.gray('Current Approvals:')} ${proposalData.votesFor}/${proposalData.threshold}\n` +
        `${chalk.gray('Status:')} ${proposalData.status}`,
        'Proposal Info'
      )

      const confirmApprove = await confirm({
        message: 'Approve this proposal?'
      })

      if (isCancel(confirmApprove) || !confirmApprove) {
        cancel('Approval cancelled')
        return
      }

      s.start('Approving proposal on blockchain...')

      try {
        log.warn('Multisig approval method pending protocol_config integration')

        s.stop('⚠️  Approval API pending')

        outro(
          `${chalk.yellow('Approval Pending')}\n\n` +
          `Your approval for proposal ${proposalAddress} will be recorded.\n\n` +
          `${chalk.gray('Note: Use protocol_config voting instructions for multisig approvals.')}`
        )

      } catch (error) {
        s.stop('❌ Failed to approve proposal')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to approve: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Execute subcommand
multisigCommand
  .command('execute')
  .description('Execute an approved multisig proposal')
  .option('-p, --proposal <address>', 'Proposal address')
  .option('-m, --multisig <address>', 'Multisig address')
  .action(async (options: ExecuteOptions) => {
    intro(chalk.magenta('⚡ Execute Multisig Proposal'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get proposal address
      let proposalAddress = options.proposal
      if (!proposalAddress) {
        const addressInput = await text({
          message: 'Proposal address:',
          validate: (value) => {
            if (!value) return 'Proposal address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Invalid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Execution cancelled')
          return
        }

        proposalAddress = addressInput.toString().trim()
      }

      const proposalAddr = address(proposalAddress)

      // Fetch proposal
      s.start('Verifying proposal...')
      const proposalData = await safeClient.governanceModule.getProposal(proposalAddr)

      if (!proposalData) {
        s.stop('❌ Proposal not found')
        outro(chalk.red(`No proposal found at: ${proposalAddress}`))
        return
      }

      if (proposalData.votesFor < proposalData.threshold) {
        s.stop('❌ Proposal not approved')
        outro(
          chalk.red('Proposal does not have enough approvals') + '\n\n' +
          `${chalk.gray('Current:')} ${proposalData.votesFor}/${proposalData.threshold}\n` +
          `${chalk.gray('Required:')} ${proposalData.threshold - proposalData.votesFor} more approval(s)`
        )
        return
      }

      s.stop('✅ Proposal ready for execution')

      // Confirm execution
      const confirmExecute = await confirm({
        message: 'Execute this proposal?'
      })

      if (isCancel(confirmExecute) || !confirmExecute) {
        cancel('Execution cancelled')
        return
      }

      s.start('Executing proposal on blockchain...')

      try {
        const multisigAddr = options.multisig ? address(options.multisig) : proposalData.proposer

        const signature = await safeClient.multisigModule.executeProposal({
          proposalAddress: proposalAddr,
          executor: toSDKSigner(wallet),
          targetProgram: safeClient.programId
        })

        s.stop('✅ Proposal executed successfully')

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        outro(
          `${chalk.green('✅ Proposal Executed!')}\n\n` +
          `${chalk.gray('Proposal:')} ${proposalAddress}\n` +
          `${chalk.gray('Transaction:')} ${signature}\n\n` +
          `${chalk.gray('Explorer:')} ${chalk.cyan(explorerUrl)}`
        )

      } catch (error) {
        s.stop('❌ Failed to execute proposal')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to execute: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// List subcommand
multisigCommand
  .command('list')
  .description('List multisigs you are a signer for')
  .option('-o, --owner <address>', 'Filter by creator address')
  .option('--json', 'Output as JSON')
  .action(async (options: ListOptions) => {
    intro(chalk.blue('📋 List Multisigs'))

    try {
      const s = spinner()
      s.start('Fetching multisigs...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const ownerAddr = options.owner ? address(options.owner) : wallet.address

      // Fetch multisigs
      const multisigs = await safeClient.multisigModule.getMultisigsByCreator(ownerAddr)

      s.stop(`✅ Found ${multisigs.length} multisig(s)`)

      if (multisigs.length === 0) {
        outro(
          `${chalk.yellow('No multisigs found')}\n\n` +
          `${chalk.gray('Create a multisig:')}\n` +
          `${chalk.cyan('ghost multisig create')}`
        )
        return
      }

      if (options.json) {
        console.log(JSON.stringify(multisigs, null, 2))
        return
      }

      // Display multisigs
      for (let i = 0; i < multisigs.length; i++) {
        const multisig = multisigs[i]
        console.log(`\n${chalk.bold.cyan(`Multisig ${i + 1}:`)}`)
        console.log(`${chalk.gray('Address:')} ${multisig.address}`)
        console.log(`${chalk.gray('Threshold:')} ${multisig.data.threshold}/${multisig.data.signers.length}`)
        console.log(`${chalk.gray('Signers:')}`)
        multisig.data.signers.forEach((signer: Address, idx: number) => {
          console.log(`  ${chalk.gray(`${idx + 1}.`)} ${signer}`)
        })
      }

      outro(
        `\n${chalk.gray('Commands:')}\n` +
        `${chalk.cyan('ghost multisig propose')} - Create a proposal\n` +
        `${chalk.cyan('ghost multisig approve')} - Approve a proposal\n` +
        `${chalk.cyan('ghost multisig execute')} - Execute an approved proposal`
      )

    } catch (error) {
      log.error(`Failed to list multisigs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action
multisigCommand
  .action(async () => {
    intro(chalk.blue('🔐 GhostSpeak Multisig Management'))

    log.info(`\n${chalk.bold('Available Commands:')}\n`)
    log.info(`${chalk.cyan('ghost multisig create')} - Create a new multisig wallet`)
    log.info(`${chalk.cyan('ghost multisig propose')} - Create a proposal for approval`)
    log.info(`${chalk.cyan('ghost multisig approve')} - Approve a proposal`)
    log.info(`${chalk.cyan('ghost multisig execute')} - Execute an approved proposal`)
    log.info(`${chalk.cyan('ghost multisig list')} - List your multisigs`)

    note(
      `${chalk.bold('What are Multisigs?')}\n\n` +
      `Multisig wallets require multiple signatures to execute transactions,\n` +
      `providing shared control and enhanced security for agent management.\n\n` +
      `${chalk.yellow('Use Cases:')}\n` +
      `${chalk.gray('•')} Shared agent ownership between team members\n` +
      `${chalk.gray('•')} DAO treasury management\n` +
      `${chalk.gray('•')} Enhanced security for high-value agents\n` +
      `${chalk.gray('•')} Trustless escrow and governance`,
      'About Multisig'
    )

    outro('Use --help with any command for more details')
  })
