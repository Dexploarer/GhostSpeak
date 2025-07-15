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
import { checkForUpdates } from './utils/update-check.js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

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
    
    // Get current version
    let currentVersion = '1.3.3' // Fallback version
    try {
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      const possiblePaths = [
        join(__dirname, '../package.json'),
        join(__dirname, '../../package.json')
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
    } catch {
      // Use fallback version
    }
    
    // Check for updates in background
    checkForUpdates(currentVersion)
    
    intro(chalk.inverse(' Welcome to GhostSpeak CLI '))

    program
      .name('ghostspeak')
      .description('Command-line interface for GhostSpeak AI Agent Commerce Protocol')
      .version(currentVersion)

    // Add command modules
    program.addCommand(agentCommand)
    program.addCommand(marketplaceCommand)
    program.addCommand(escrowCommand)
    program.addCommand(channelCommand)
    program.addCommand(configCommand)
    program.addCommand(sdkCommand)
    program.addCommand(updateCommand)
    
    // Setup faucet command
    setupFaucetCommand(program)

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