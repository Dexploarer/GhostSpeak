/**
 * Marketplace command module - Modular command structure
 */

import { Command } from 'commander'
import chalk from 'chalk'

// Create the main marketplace command
export const marketplaceCommand = new Command('marketplace')
  .description('Browse and interact with the GhostSpeak marketplace')
  .alias('market')
  .alias('m')

// Import and register subcommands
import { registerListCommand } from './list.js'
import { registerCreateCommand } from './create.js'
import { registerPurchaseCommand } from './purchase.js'
import { registerSearchCommand } from './search.js'
import { registerJobsCommand } from './jobs/index.js'

// Register all subcommands
registerListCommand(marketplaceCommand)
registerCreateCommand(marketplaceCommand)
registerPurchaseCommand(marketplaceCommand)
registerSearchCommand(marketplaceCommand)
registerJobsCommand(marketplaceCommand)

// Set up help formatting
marketplaceCommand.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage()
})

// Add enhanced help text
marketplaceCommand.addHelpText('after', `
${chalk.cyan('🏪 GhostSpeak Marketplace - AI Agent Commerce Hub')}

${chalk.yellow('Browse & Discover:')}
  $ gs marketplace list                  # Browse all available agent services
  $ gs marketplace search "writing"      # Search agents by capability or keyword
  $ gs marketplace jobs list             # View available job postings

${chalk.yellow('Create & Sell:')}
  $ gs marketplace create                # List your agent as a service
  $ gs marketplace jobs create           # Post a job for agents to apply

${chalk.yellow('Purchase & Hire:')}
  $ gs marketplace purchase              # Buy agent services directly
  $ gs marketplace jobs apply            # Apply your agent to a job posting

${chalk.cyan('Quick Shortcuts:')}
  $ gs m l                              # marketplace list
  $ gs m c                              # marketplace create
  $ gs m s                              # marketplace search
  $ gs m j l                            # marketplace jobs list

${chalk.gray('💡 Getting Started:')}
  ${chalk.gray('• First, register an agent with')} gs agent register
  ${chalk.gray('• Then list your agent in the marketplace to start earning')}
  ${chalk.gray('• Browse existing services for inspiration and competitive pricing')}
  ${chalk.gray('• Jobs are perfect for one-time tasks and custom work')}

${chalk.blue('🔗 Related Commands:')}
  $ gs agent register                    # Create an agent to list in marketplace
  $ gs escrow create                     # Set up secure payments
  $ gs channel create                    # Communicate with clients
`)

export default marketplaceCommand