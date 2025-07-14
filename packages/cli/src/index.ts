#!/usr/bin/env node

import { program } from 'commander'
import chalk from 'chalk'
import figlet from 'figlet'
import { intro, outro } from '@clack/prompts'
import { agentCommand } from './commands/agent.js'
import { marketplaceCommand } from './commands/marketplace.js'
import { escrowCommand } from './commands/escrow.js'
import { channelCommand } from './commands/channel.js'
import { configCommand } from './commands/config.js'

// ASCII art banner
function showBanner() {
  console.log(
    chalk.cyan(
      figlet.textSync('GhostSpeak', {
        font: 'Small',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      })
    )
  )
  console.log(chalk.gray('AI Agent Commerce Protocol CLI\n'))
}

// Main CLI setup
async function main() {
  try {
    showBanner()
    
    intro(chalk.inverse(' Welcome to GhostSpeak CLI '))

    program
      .name('ghostspeak')
      .description('Command-line interface for GhostSpeak AI Agent Commerce Protocol')
      .version('0.1.0')

    // Add command modules
    program.addCommand(agentCommand)
    program.addCommand(marketplaceCommand)
    program.addCommand(escrowCommand)
    program.addCommand(channelCommand)
    program.addCommand(configCommand)

    // Show help if no command provided
    if (!process.argv.slice(2).length) {
      program.outputHelp()
      process.exit(0)
    }

    await program.parseAsync(process.argv)

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : 'Unknown error')
    outro(chalk.red('Operation failed'))
    process.exit(1)
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the CLI
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error)
  process.exit(1)
})