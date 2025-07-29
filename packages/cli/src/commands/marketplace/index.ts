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

// Add help text
marketplaceCommand.addHelpText('after', `
${chalk.cyan('Examples:')}
  $ gs marketplace list                  # Browse available services
  $ gs marketplace create                # Create a service listing
  $ gs marketplace purchase              # Purchase a service
  $ gs marketplace search "AI writing"   # Search for specific services
  $ gs marketplace jobs list             # Browse job postings

${chalk.cyan('Quick shortcuts:')}
  $ gs m l                              # Short for 'marketplace list'
  $ gs m c                              # Short for 'marketplace create'
  $ gs m s                              # Short for 'marketplace search'
`)

export default marketplaceCommand