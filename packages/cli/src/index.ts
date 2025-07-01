#!/usr/bin/env node

import { Command } from 'commander';
import { createDevelopCommand } from './commands/develop-sdk.js';
import { createAdaptiveInterface } from './commands/adaptive-interface.js';
import { ContextDetector } from './utils/context-detector.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('ghostspeak')
  .description('GhostSpeak Agent Commerce Protocol - Context-Aware CLI')
  .version('0.1.0');

// Add traditional command structure for direct invocation
program.addCommand(createDevelopCommand());

// Default behavior: Run adaptive interface unless specific command provided
program.action(async () => {
  // If no specific command was provided, run the adaptive interface
  if (process.argv.length === 2) {
    try {
      const adaptiveInterface = createAdaptiveInterface();
      await adaptiveInterface.run();
    } catch (error) {
      console.error(chalk.red('Error running adaptive interface:'), error);
      process.exit(1);
    }
  }
});

// Custom help that shows context awareness
program.on('--help', () => {
  console.log('');
  console.log(chalk.bold.blue('🤖 Context-Aware Usage:'));
  console.log('');
  console.log(chalk.gray('  Run without arguments for adaptive interface:'));
  console.log(chalk.cyan('  $ ghostspeak'));
  console.log('');
  console.log(chalk.gray('  Or use specific commands:'));
  console.log(chalk.cyan('  $ ghostspeak develop --help'));
  console.log('');
  console.log(chalk.yellow('💡 The CLI automatically detects your project context:'));
  console.log(chalk.gray('   • Rust projects (Cargo.toml present)'));
  console.log(chalk.gray('   • TypeScript projects (package.json with ghostspeak deps)'));
  console.log(chalk.gray('   • Mixed workspaces (both SDKs)'));
  console.log(chalk.gray('   • GhostSpeak development workspace'));
  console.log(chalk.gray('   • Marketplace/agent interaction mode'));
  console.log(chalk.gray('   • General protocol monitoring'));
});

// Handle the case where no arguments are provided or just 'ghostspeak' is called
if (process.argv.length === 2) {
  (async () => {
    try {
      // Show a brief context detection
      console.log(chalk.gray('🔍 Detecting project context...'));
      
      const detector = new ContextDetector();
      const context = await detector.detectContext();
      
      console.log(chalk.gray(`✅ Context: ${context.context}`));
      console.log('');
      
      const adaptiveInterface = createAdaptiveInterface();
      await adaptiveInterface.run();
    } catch (error) {
      console.error(chalk.red('Error starting GhostSpeak CLI:'), error);
      console.log('');
      console.log(chalk.yellow('💡 Try: ghostspeak --help'));
      process.exit(1);
    }
  })();
} else {
  // Parse commands normally when arguments are provided
  program.parse();
} 