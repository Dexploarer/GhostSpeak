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
import type { CreateMultisigOptions } from './types.js'

export const multisigCommand = new Command('multisig')
  .description('Manage multi-signature wallets')

multisigCommand
  .command('create')
  .description('Create a new multisig wallet')
  .option('-n, --name <name>', 'Multisig name')
  .option('-m, --members <members>', 'Comma-separated list of member addresses')
  .option('-t, --threshold <threshold>', 'Number of signatures required')
  .action(async (options: CreateMultisigOptions) => {
    intro(chalk.blue('Create Multisig Wallet'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('Connected to devnet')

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
          signers: memberAddresses.map(addr => address(addr)),
          threshold: thresholdNum,
          multisigId: BigInt(Date.now()),
          name: `Multisig-${Date.now()}`,
          multisigType: 'standard' as const
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('Multisig created successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        outro(
          `${chalk.green('Multisig Created Successfully!')}\n\n` +
          `${chalk.bold('Multisig Details:')}\n` +
          `${chalk.gray('Name:')} ${name}\n` +
          `${chalk.gray('Members:')} ${memberAddresses.length}\n` +
          `${chalk.gray('Threshold:')} ${thresholdNum} signatures required\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Next Steps:')}\n` +
          `- Share multisig address with members\n` +
          `- Create proposals: ${chalk.cyan('ghost governance proposal create')}\n` +
          `- Manage transactions through multisig approval process`
        )

      } catch (error) {
        s.stop('Failed to create multisig')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to create multisig: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

multisigCommand
  .command('list')
  .description('List your multisig wallets')
  .action(async () => {
    intro(chalk.blue('Your Multisig Wallets'))

    try {
      const s = spinner()
      s.start('Loading multisig wallets...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const multisigs = await safeClient.governance.listMultisigs({ creator: wallet.address })

      s.stop(`Found ${multisigs.length} multisig wallets`)

      if (multisigs.length === 0) {
        outro(
          `${chalk.yellow('No multisig wallets found')}\n\n` +
          `${chalk.gray('- Create a multisig:')} ${chalk.cyan('ghost governance multisig create')}\n` +
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
        `${chalk.yellow('Commands:')}\n` +
        `${chalk.cyan('ghost governance proposal create')} - Create proposal\n` +
        `${chalk.cyan('ghost governance proposal list')} - View proposals\n` +
        `${chalk.cyan('ghost governance vote')} - Vote on proposals`
      )

    } catch (error) {
      log.error(`Failed to load multisigs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
