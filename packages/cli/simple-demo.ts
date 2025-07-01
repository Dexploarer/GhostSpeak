#!/usr/bin/env node

/**
 * GhostSpeak Simple Demo - 2025 Real Client
 * 
 * Quick demo using REAL Solana Web3.js v2.0 patterns instead of mock data
 */

import { GhostSpeakCLI } from './src/cli.js';
import chalk from 'chalk';

async function runDemo() {
  console.log(chalk.bold.blue('🚀 Starting GhostSpeak Real Client Demo'));
  console.log(chalk.gray('Using current 2025 Solana Web3.js v2.0 patterns'));
  console.log();

  try {
    const cli = new GhostSpeakCLI();
    await cli.run();
  } catch (error) {
    console.error(chalk.red('Demo failed:'), error);
    process.exit(1);
  }
}

runDemo(); 