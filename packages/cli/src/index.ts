#!/usr/bin/env node

import { program } from 'commander'
import chalk from 'chalk'
import figlet from 'figlet'
import { intro, outro } from '@clack/prompts'
import { agentCommand } from './commands/agent/index.js'
import { marketplaceCommand } from './commands/marketplace/index.js'
import { escrowCommand } from './commands/escrow.js'
import { channelCommand } from './commands/channel.js'
import { configCommand } from './commands/config.js'
import { setupFaucetCommand } from './commands/faucet.js'
import { sdkCommand } from './commands/sdk.js'
import { updateCommand } from './commands/update.js'
import { auctionCommand } from './commands/auction.js'
import { disputeCommand } from './commands/dispute.js'
import { governanceCommand } from './commands/governance.js'
import { quickstartCommand } from './commands/quickstart.js'
import { walletCommand } from './commands/wallet.js'
import { checkForUpdates } from './utils/update-check.js'
import { InteractiveMenu, shouldRunInteractive } from './utils/interactive-menu.js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import { resolveAlias, showAliases } from './utils/command-aliases.js'
import { showTransactionHistory } from './services/transaction-monitor.js'
import { showContextualHelp, showTopicHelp, showAvailableTopics, searchHelp } from './utils/help-system.js'
import { startOnboarding, hasCompletedOnboarding } from './utils/onboarding.js'
import { bootstrapServices } from './core/bootstrap.js'

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
  console.log(chalk.gray(`CLI v${version} | SDK v1.5.0\n`))
}

// Main CLI setup
async function main() {
  try {
    // Initialize services
    bootstrapServices()
    
    // Get current version
    let currentVersion = '1.12.0' // Fallback version
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
          const pkg = JSON.parse(readFileSync(path, 'utf-8')) as { name?: string; version?: string }
          if (pkg.name === '@ghostspeak/cli' && pkg.version) {
            currentVersion = pkg.version
            break
          }
        }
      }
    } catch (error) {
      // Use fallback version
      void error
    }
    
    // Show banner with version
    showBanner(currentVersion)
    
    // Check for first run and handle onboarding
    const configPath = join(homedir(), '.ghostspeak', 'config.json')
    const isFirstRun = !existsSync(configPath) && !hasCompletedOnboarding()
    
    // Check if this is a simple command that should trigger onboarding
    const shouldTriggerOnboarding = isFirstRun && (
      process.argv.length === 2 || 
      process.argv.includes('--help') ||
      process.argv.includes('-h')
    )
    
    if (shouldTriggerOnboarding && process.argv.length === 2) {
      console.log(chalk.yellow('👋 Welcome to GhostSpeak! It looks like this is your first time.'))
      console.log(chalk.cyan('\nQuick Start Options:'))
      console.log(chalk.gray('  • Run'), chalk.bold.white('gs quickstart'), chalk.gray('for complete guided setup'))
      console.log(chalk.gray('  • Run'), chalk.bold.white('gs onboard'), chalk.gray('for interactive onboarding'))
      console.log(chalk.gray('  • Run'), chalk.bold.white('gs -i'), chalk.gray('for interactive menu mode'))
      console.log(chalk.gray('  • Run'), chalk.bold.white('gs help getting-started'), chalk.gray('for help documentation\n'))
    }
    
    // Check for updates in background
    void checkForUpdates(currentVersion)
    
    program
      .name('ghostspeak')
      .description('Command-line interface for GhostSpeak AI Agent Commerce Protocol')
      .version(currentVersion)
      .option('-i, --interactive', 'Run in interactive mode')
      .option('--debug', 'Enable debug output')
      .option('--dry-run', 'Show what would be done without executing')

    // Add UX enhancement commands
    program
      .command('onboard')
      .description('Complete interactive onboarding for new users')
      .option('--skip-welcome', 'Skip welcome message')
      .option('--network <network>', 'Target network (devnet, testnet, mainnet)')
      .option('--auto-faucet', 'Automatically request faucet funds')
      .action(async (options: { network?: string; autoFaucet?: boolean; skipWelcome?: boolean }) => {
        await startOnboarding({
          network: options.network as 'devnet' | 'testnet' | 'mainnet-beta' | undefined,
          autoFaucet: options.autoFaucet,
          skipSteps: options.skipWelcome ? ['welcome'] : undefined
        })
      })
      
    program
      .command('help [topic]')
      .description('Show contextual help or help for a specific topic')
      .option('-s, --search <query>', 'Search help content')
      .action(async (topic: string | undefined, options: { search?: string }) => {
        if (options.search) {
          searchHelp(options.search)
        } else if (topic) {
          showTopicHelp(topic)
        } else {
          showAvailableTopics()
        }
      })
      
    program
      .command('aliases')
      .description('Show available command shortcuts and aliases')
      .action(() => {
        showAliases()
      })
      
    program
      .command('tx')
      .alias('transactions')
      .description('Show recent transaction history')
      .option('-l, --limit <number>', 'Number of transactions to show', '10')
      .action((options: { limit?: string }) => {
        showTransactionHistory(parseInt(options.limit ?? '10'))
      })
    
    // Add command modules - ordered for best first-time UX
    // 1. Essential setup commands first
    program.addCommand(quickstartCommand)  // Quick start for easy onboarding
    program.addCommand(walletCommand)      // Wallet management
    program.addCommand(configCommand)      // Manual setup option
    setupFaucetCommand(program)            // Get SOL to start
    
    // 2. Core features
    program.addCommand(agentCommand)       // Create and manage agents
    program.addCommand(marketplaceCommand) // Use agents in marketplace
    
    // 3. Transaction and payment features
    program.addCommand(escrowCommand)      // Secure payments
    program.addCommand(channelCommand)     // Agent communication
    program.addCommand(auctionCommand)     // Advanced marketplace feature
    
    // 4. Support and advanced features
    program.addCommand(disputeCommand)     // Conflict resolution
    program.addCommand(governanceCommand)  // Protocol governance
    
    // 5. Developer and maintenance tools
    program.addCommand(sdkCommand)         // SDK management
    program.addCommand(updateCommand)      // CLI updates

    // Process command aliases before parsing
    const originalArgs = process.argv.slice(2)
    let processedArgs = [...originalArgs]
    
    // Try to resolve aliases for the command
    if (originalArgs.length > 0) {
      const potentialAlias = originalArgs.join(' ')
      const resolvedCommand = resolveAlias(potentialAlias)
      
      if (resolvedCommand) {
        processedArgs = resolvedCommand.split(' ')
        console.log(chalk.gray(`→ Resolved "${potentialAlias}" to "${resolvedCommand}"`))
      }
    }
    
    // Update process.argv for commander to use
    process.argv = [process.argv[0], process.argv[1], ...processedArgs]
    
    // Check if we should run in interactive mode
    if (shouldRunInteractive(process.argv)) {
      // Don't show banner again since it's already shown
      const menu = new InteractiveMenu(program)
      await menu.showMainMenu()
      return
    }

    // Normal CLI mode
    intro(chalk.inverse(' Welcome to GhostSpeak CLI '))

    // Show contextual help if no command provided
    if (!processedArgs.length) {
      showContextualHelp()
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