#!/usr/bin/env node

import { Command } from 'commander';
import { createDevelopCommand } from './commands/develop-sdk.js';
import { AdaptiveInterface } from './commands/adaptive-interface.js';
import { ContextDetector } from './utils/context-detector.js';
import { GhostSpeakCLI } from './cli.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('ghostspeak')
  .description('GhostSpeak Agent Commerce Protocol - Context-Aware CLI with Real Blockchain Integration')
  .version('0.1.0');

// Add traditional command structure for direct invocation
program.addCommand(createDevelopCommand());

// Add new real client demo command
program
  .command('demo')
  .description('Run the real blockchain demo with current 2025 Solana patterns')
  .action(async () => {
    try {
      const cli = new GhostSpeakCLI();
      await cli.run();
    } catch (error) {
      console.error(chalk.red('Demo error:'), error);
      process.exit(1);
    }
  });

// Default behavior: Show selection between adaptive interface and real demo
program.action(async () => {
  // If no specific command was provided, show options
  if (process.argv.length === 2) {
    try {
      const { select } = await import('@inquirer/prompts');
      
      console.clear();
      console.log(chalk.bold.magenta('🤖 GhostSpeak Agent Commerce Protocol'));
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log();

      const choice = await select({
        message: 'What would you like to run?',
        choices: [
          { 
            name: '🚀 Real Blockchain Demo (2025 Patterns)', 
            value: 'demo',
            description: 'Use real Solana Web3.js v2.0 with live blockchain connections'
          },
          { 
            name: '🔧 Adaptive Development Interface', 
            value: 'adaptive',
            description: 'Context-aware development tools and SDK management'
          },
          { 
            name: '❌ Exit', 
            value: 'exit' 
          }
        ]
      });

      switch (choice) {
        case 'demo':
          const cli = new GhostSpeakCLI();
          await cli.run();
          break;
        case 'adaptive':
          const adaptiveInterface = new AdaptiveInterface();
          await adaptiveInterface.run();
          break;
        case 'exit':
          console.log(chalk.green('Thanks for using GhostSpeak! 👋'));
          break;
      }
    } catch (error) {
      console.error(chalk.red('Error running GhostSpeak CLI:'), error);
      process.exit(1);
    }
  }
});

// Custom help that shows both options
program.on('--help', () => {
  console.log('');
  console.log(chalk.bold.blue('🤖 Usage Options:'));
  console.log('');
  console.log(chalk.gray('  Interactive selection:'));
  console.log(chalk.cyan('  $ ghostspeak'));
  console.log('');
  console.log(chalk.gray('  Real blockchain demo:'));
  console.log(chalk.cyan('  $ ghostspeak demo'));
  console.log('');
  console.log(chalk.gray('  Development tools:'));
  console.log(chalk.cyan('  $ ghostspeak develop --help'));
  console.log('');
  console.log(chalk.yellow('💡 New in 2025:'));
  console.log(chalk.gray('   • Real Solana Web3.js v2.0 integration'));
  console.log(chalk.gray('   • Live blockchain connections (no mocks)'));
  console.log(chalk.gray('   • Current 2025 development patterns'));
  console.log(chalk.gray('   • Functional transaction building with pipe()'));
  console.log(chalk.gray('   • Real agent registration and management'));
  console.log('');
  console.log(chalk.yellow('🔧 Context Detection:'));
  console.log(chalk.gray('   • Rust projects (Cargo.toml present)'));
  console.log(chalk.gray('   • TypeScript projects (package.json with ghostspeak deps)'));
  console.log(chalk.gray('   • Mixed workspaces (both SDKs)'));
  console.log(chalk.gray('   • GhostSpeak development workspace'));
});

// Handle the case where no arguments are provided or just 'ghostspeak' is called
if (process.argv.length === 2) {
  // Will be handled by the default action above
} else {
  // Parse commands normally when arguments are provided
  program.parse();
} 