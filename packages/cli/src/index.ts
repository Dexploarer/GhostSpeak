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
import { setupFaucetCommand } from './commands/faucet.js'
import { sdkCommand } from './commands/sdk.js'
import { updateCommand } from './commands/update.js'
import { auctionCommand } from './commands/auction.js'
import { disputeCommand } from './commands/dispute.js'
import { governanceCommand } from './commands/governance.js'
import { checkForUpdates } from './utils/update-check.js'
import { InteractiveMenu, shouldRunInteractive } from './utils/interactive-menu.js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ASCII art banner
function showBanner(version: string) {
  console.log(
    chalk.cyan(
      figlet.textSync('GhostSpeak', {
        font: 'Small',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      })
    )
  )
  console.log(chalk.gray('AI Agent Commerce Protocol CLI'))
  console.log(chalk.gray(`CLI v${version} | SDK v1.4.0 | Built with ❤️  for Web3 developers\n`))
}

// Main CLI setup
async function main() {
  try {
    
    // Get current version
    let currentVersion = '1.7.0' // Fallback version
    try {
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      const possiblePaths = [
        join(__dirname, '../package.json'),
        join(__dirname, '../../package.json'),
        join(__dirname, '../../cli/package.json')
      ]
      
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          const pkg = JSON.parse(readFileSync(path, 'utf-8'))
          if (pkg.name === '@ghostspeak/cli') {
            currentVersion = pkg.version
            break
          }
        }
      }
    } catch (error) {
      // Use fallback version
    }
    
    // Show banner with version
    showBanner(currentVersion)
    
    // Check for updates in background
    checkForUpdates(currentVersion)
    
    program
      .name('ghostspeak')
      .description('Command-line interface for GhostSpeak AI Agent Commerce Protocol')
      .version(currentVersion)
      .option('-i, --interactive', 'Run in interactive mode')

    // Add command modules
    program.addCommand(agentCommand)
    program.addCommand(marketplaceCommand)
    program.addCommand(escrowCommand)
    program.addCommand(channelCommand)
    program.addCommand(auctionCommand)
    program.addCommand(disputeCommand)
    program.addCommand(governanceCommand)
    program.addCommand(configCommand)
    program.addCommand(sdkCommand)
    program.addCommand(updateCommand)
    
    // Setup faucet command
    setupFaucetCommand(program)

    // Check if we should run in interactive mode
    if (shouldRunInteractive(process.argv)) {
      // Don't show banner again since it's already shown
      const menu = new InteractiveMenu(program)
      await menu.showMainMenu()
      return
    }

    // Normal CLI mode
    intro(chalk.inverse(' Welcome to GhostSpeak CLI '))

    // Show help if no command provided (shouldn't happen due to interactive check)
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