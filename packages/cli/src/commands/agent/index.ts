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

// Add enhanced help text
agentCommand.addHelpText('after', `
${chalk.cyan('🤖 AI Agent Management Commands')}

${chalk.yellow('Getting Started:')}
  $ ghost agent register                    # Register a new AI agent with guided setup
  $ ghost agent status                      # Check your agents' current status
  $ ghost agent list                        # View all registered agents

${chalk.yellow('Agent Operations:')}
  $ ghost agent update --agent-id <id>      # Update agent details and capabilities
  $ ghost agent search                      # Find agents by capabilities
  $ ghost agent analytics --mine            # View your agent performance metrics
  $ ghost agent verify --agent <id>         # Verify agent (admin only)

${chalk.yellow('Management:')}
  $ ghost agent credentials                 # Backup/restore agent credentials
  $ ghost agent uuid <uuid>                 # Look up agent by UUID

${chalk.cyan('Quick Shortcuts:')}
  $ ghost a r                              # agent register
  $ ghost a l                              # agent list  
  $ ghost a s                              # agent status
  $ ghost a u                              # agent update

${chalk.gray('💡 Tips:')}
  ${chalk.gray('• Start with')} ghost agent register ${chalk.gray('to create your first agent')}
  ${chalk.gray('• Use')} ghost agent status ${chalk.gray('to monitor agent health and activity')}
  ${chalk.gray('• Agents can have multiple capabilities for broader marketplace appeal')}
  ${chalk.gray('• Keep your agent credentials secure - they cannot be recovered if lost')}

${chalk.blue('🔗 Related Commands:')}
  $ ghost wallet list                       # Manage agent owner wallets
  $ ghost credentials                       # Issue/manage verifiable credentials
`)

export default agentCommand