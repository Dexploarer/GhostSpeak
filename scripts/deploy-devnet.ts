#!/usr/bin/env tsx
/**
 * Quick deploy GhostSpeak program to Devnet
 * 
 * This is a simplified wrapper around the automated deployment system
 * For advanced options, use: tsx scripts/automated-deployment.ts
 * 
 * Usage: npm run deploy:devnet
 */

import { AutomatedDeployment } from './automated-deployment.js';
import chalk from 'chalk';

async function quickDeployToDevnet() {
  console.log(chalk.blue('🚀 Quick Deploy to Devnet...'));
  console.log(chalk.gray('Using automated deployment system with safe defaults\n'));
  
  const deployment = new AutomatedDeployment({
    environment: 'devnet',
    skipTests: true,           // Skip for quick deployment
    skipHealthCheck: false,    // Keep health check for safety
    autoConfirm: true,         // Auto-confirm for devnet
    backupFirst: false         // Skip backup for quick deploy
  });
  
  try {
    const result = await deployment.deploy();
    console.log(chalk.green(`\n✅ Quick deployment completed!`));
    console.log(chalk.cyan(`📋 Program ID: ${result.programId}`));
    console.log(chalk.gray(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`));
    console.log(chalk.gray(`\n💡 For full deployment options, use: tsx scripts/automated-deployment.ts`));
  } catch (error) {
    console.error(chalk.red('❌ Quick deployment failed:'), error);
    process.exit(1);
  }
}

// Run deployment
quickDeployToDevnet().catch(console.error);