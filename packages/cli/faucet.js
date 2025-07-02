#!/usr/bin/env node

/**
 * Ghostspeak Devnet SOL Faucet
 * Simple utility to help developers get devnet SOL for testing
 */

import { exec } from 'child_process';
import chalk from 'chalk';

const DEVNET_RPC = 'https://api.devnet.solana.com';

async function checkSolanaConfig() {
  return new Promise((resolve, reject) => {
    exec('solana config get', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function getWalletAddress() {
  return new Promise((resolve, reject) => {
    exec('solana address', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function getCurrentBalance() {
  return new Promise((resolve, reject) => {
    exec('solana balance', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function requestAirdrop(amount = 2) {
  return new Promise((resolve, reject) => {
    exec(`solana airdrop ${amount}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function setDevnetConfig() {
  return new Promise((resolve, reject) => {
    exec('solana config set --url devnet', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function main() {
  console.log(chalk.blue.bold('\n🚰 Ghostspeak Devnet SOL Faucet'));
  console.log(chalk.gray('=====================================\n'));

  try {
    // Check current Solana configuration
    console.log(chalk.yellow('📋 Checking Solana configuration...'));
    const config = await checkSolanaConfig();
    
    if (!config.includes('devnet')) {
      console.log(chalk.yellow('⚠️  Switching to devnet...'));
      await setDevnetConfig();
      console.log(chalk.green('✅ Switched to devnet'));
    } else {
      console.log(chalk.green('✅ Already on devnet'));
    }

    // Get wallet address
    console.log(chalk.yellow('\n📍 Getting wallet address...'));
    const walletAddress = await getWalletAddress();
    console.log(chalk.cyan(`Wallet: ${walletAddress}`));

    // Check current balance
    console.log(chalk.yellow('\n💰 Checking current balance...'));
    const currentBalance = await getCurrentBalance();
    console.log(chalk.cyan(`Current balance: ${currentBalance}`));

    // Request airdrop
    console.log(chalk.yellow('\n🚰 Requesting 2 SOL from devnet faucet...'));
    const airdropResult = await requestAirdrop(2);
    console.log(chalk.green('✅ Airdrop successful!'));
    
    // Check new balance
    console.log(chalk.yellow('\n💰 Checking new balance...'));
    const newBalance = await getCurrentBalance();
    console.log(chalk.green(`New balance: ${newBalance}`));

    console.log(chalk.blue.bold('\n🎉 Success! You now have devnet SOL for testing'));
    console.log(chalk.gray('You can now deploy and test ghostspeak features'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    
    if (error.message.includes('command not found')) {
      console.log(chalk.yellow('\n💡 Install Solana CLI first:'));
      console.log(chalk.gray('sh -c "$(curl -sSfL https://release.solana.com/stable/install)"'));
    } else if (error.message.includes('rate limit')) {
      console.log(chalk.yellow('\n⏳ Rate limited. Try again in a few minutes.'));
    } else if (error.message.includes('no such file')) {
      console.log(chalk.yellow('\n🔑 Generate a wallet first:'));
      console.log(chalk.gray('solana-keygen new'));
    }
    
    process.exit(1);
  }
}

// Allow running as CLI or import as module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as faucet }; 