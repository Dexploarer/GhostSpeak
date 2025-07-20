#!/usr/bin/env tsx
/**
 * Deploy GhostSpeak program to Devnet
 * 
 * Usage: npm run deploy:devnet
 */

import { execSync } from 'child_process'
import chalk from 'chalk'

async function deployToDevnet() {
  console.log(chalk.blue('🚀 Deploying GhostSpeak to Devnet...'))
  
  try {
    // Build the program
    console.log(chalk.yellow('📦 Building program...'))
    execSync('anchor build', { stdio: 'inherit' })
    
    // Deploy to devnet
    console.log(chalk.yellow('🌐 Deploying to devnet...'))
    execSync('anchor deploy --provider.cluster devnet', { stdio: 'inherit' })
    
    console.log(chalk.green('✅ Deployment successful!'))
    
    // Get program ID
    const programId = execSync('anchor keys list').toString().trim()
    console.log(chalk.cyan(`📋 Program ID: ${programId}`))
    
  } catch (error) {
    console.error(chalk.red('❌ Deployment failed:'), error)
    process.exit(1)
  }
}

// Run deployment
deployToDevnet().catch(console.error)