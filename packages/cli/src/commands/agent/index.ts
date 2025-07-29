/**
 * Agent command module - Modular command structure
 */

import { Command } from 'commander'
import chalk from 'chalk'

// Create the main agent command
export const agentCommand = new Command('agent')
  .description('Manage AI agents in the GhostSpeak protocol')
  .alias('a')

// Import and register subcommands
import { registerRegisterCommand } from './register.js'
import { registerListCommand } from './list.js'
import { registerSearchCommand } from './search.js'
import { registerStatusCommand } from './status.js'
import { registerUpdateCommand } from './update.js'
import { registerVerifyCommand } from './verify.js'
import { registerAnalyticsCommand } from './analytics.js'
import { registerCredentialsCommand } from './credentials.js'
import { registerUuidCommand } from './uuid.js'

// Register all subcommands
registerRegisterCommand(agentCommand)
registerListCommand(agentCommand)
registerSearchCommand(agentCommand)
registerStatusCommand(agentCommand)
registerUpdateCommand(agentCommand)
registerVerifyCommand(agentCommand)
registerAnalyticsCommand(agentCommand)
registerCredentialsCommand(agentCommand)
registerUuidCommand(agentCommand)

// Set up help formatting
agentCommand.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage()
})

// Add help text
agentCommand.addHelpText('after', `
${chalk.cyan('Examples:')}
  $ gs agent register                    # Register a new AI agent
  $ gs agent list                        # List all your agents
  $ gs agent status                      # Check agent status
  $ gs agent analytics                   # View performance metrics
  $ gs agent credentials                 # Manage agent credentials

${chalk.cyan('Quick shortcuts:')}
  $ gs a r                              # Short for 'agent register'
  $ gs a l                              # Short for 'agent list'
  $ gs a s                              # Short for 'agent status'
`)

export default agentCommand