import { Command } from 'commander'
import chalk from 'chalk'
import { intro, outro, log } from '@clack/prompts'
import { multisigCommand } from './multisig.js'
import { proposalCommand } from './proposal.js'
import { voteCommand } from './vote.js'
import { rbacCommand } from './rbac.js'

export const governanceCommand = new Command('governance')
  .description('Participate in protocol governance')

// Add subcommands
governanceCommand.addCommand(multisigCommand)
governanceCommand.addCommand(proposalCommand)
governanceCommand.addCommand(voteCommand)
governanceCommand.addCommand(rbacCommand)

// Default action - show available commands
governanceCommand
  .action(async () => {
    intro(chalk.blue('GhostSpeak Governance'))

    log.info(`\n${chalk.bold('Available Commands:')}\n`)
    log.info(`${chalk.cyan('ghost governance multisig')} - Manage multisig wallets`)
    log.info(`${chalk.cyan('ghost governance proposal')} - Create and manage proposals`)
    log.info(`${chalk.cyan('ghost governance vote')} - Vote on active proposals`)
    log.info(`${chalk.cyan('ghost governance rbac')} - Manage roles and permissions`)

    outro('Use --help with any command for more details')
  })

// Re-export types for external use
export * from './types.js'
