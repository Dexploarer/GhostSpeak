#!/usr/bin/env tsx
/**
 * Example: How to use the wallet funding system
 * 
 * This script demonstrates various ways to fund wallets reliably
 * without depending solely on devnet airdrops.
 */

import { 
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  address
} from '@solana/kit'
import { 
  WalletFundingService,
  fundWallet,
  ensureMinimumBalance 
} from '@ghostspeak/sdk'
import chalk from 'chalk'
import { promises as fs } from 'fs'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables
config()

async function main() {
  console.log(chalk.cyan('🚀 Wallet Funding Examples\n'))

  // Example 1: Simple funding with default settings
  console.log(chalk.yellow('Example 1: Simple wallet funding'))
  const wallet1 = await generateKeyPairSigner()
  console.log(`Wallet address: ${wallet1.address}`)
  
  const result1 = await fundWallet(wallet1.address, 0.1) // 0.1 SOL
  
  if (result1.success) {
    console.log(chalk.green(`✅ Funded successfully via ${result1.method}`))
    console.log(`Balance: ${(Number(result1.balance) / 1_000_000_000).toFixed(4)} SOL\n`)
  } else {
    console.log(chalk.red(`❌ Funding failed: ${result1.error}\n`))
  }

  // Example 2: Ensure minimum balance
  console.log(chalk.yellow('Example 2: Ensure minimum balance'))
  const wallet2 = await generateKeyPairSigner()
  console.log(`Wallet address: ${wallet2.address}`)
  
  const result2 = await ensureMinimumBalance(wallet2.address, 0.05) // 0.05 SOL minimum
  
  if (result2.success) {
    console.log(chalk.green(`✅ Balance ensured via ${result2.method}`))
    console.log(`Balance: ${(Number(result2.balance) / 1_000_000_000).toFixed(4)} SOL\n`)
  }

  // Example 3: Advanced funding with treasury wallet
  console.log(chalk.yellow('Example 3: Advanced funding with treasury'))
  
  const fundingService = new WalletFundingService(
    process.env.GHOSTSPEAK_RPC_URL || 'https://api.devnet.solana.com'
  )
  
  const wallet3 = await generateKeyPairSigner()
  console.log(`Wallet address: ${wallet3.address}`)
  
  // Try to load treasury wallet from environment
  let treasuryWallet
  if (process.env.GHOSTSPEAK_TREASURY_WALLET_PATH) {
    try {
      const treasuryPath = process.env.GHOSTSPEAK_TREASURY_WALLET_PATH.replace('~', process.env.HOME || '')
      const treasuryData = JSON.parse(await fs.readFile(treasuryPath, 'utf-8')) as number[]
      treasuryWallet = await createKeyPairSignerFromBytes(new Uint8Array(treasuryData))
      console.log(chalk.gray(`Treasury wallet loaded: ${treasuryWallet.address}`))
    } catch (error) {
      console.log(chalk.gray('No treasury wallet available'))
    }
  }
  
  const result3 = await fundingService.fundWallet(wallet3.address, {
    amount: BigInt(200_000_000), // 0.2 SOL
    minAmount: BigInt(50_000_000), // 0.05 SOL minimum
    maxRetries: 3,
    retryDelay: 2000,
    useTreasury: !!treasuryWallet,
    treasuryWallet,
    verbose: true
  })
  
  if (result3.success) {
    console.log(chalk.green(`✅ Funded successfully via ${result3.method}`))
    console.log(`Balance: ${(Number(result3.balance) / 1_000_000_000).toFixed(4)} SOL\n`)
  } else {
    console.log(chalk.red(`❌ Funding failed: ${result3.error}\n`))
  }

  // Example 4: Create and fund multiple test wallets
  console.log(chalk.yellow('Example 4: Create and fund multiple test wallets'))
  
  const testWallets = await fundingService.createAndFundTestWallets(
    3, // Create 3 wallets
    BigInt(50_000_000), // 0.05 SOL each
    {
      maxRetries: 2,
      useTreasury: !!treasuryWallet,
      treasuryWallet,
      verbose: false
    }
  )
  
  console.log(chalk.green(`\nCreated ${testWallets.length} funded test wallets`))

  // Example 5: Check wallet balance
  console.log(chalk.yellow('\nExample 5: Check wallet balances'))
  
  for (const wallet of testWallets) {
    const balance = await fundingService.getBalance(wallet.address)
    console.log(`${wallet.address}: ${(Number(balance) / 1_000_000_000).toFixed(4)} SOL`)
  }

  // Tips for users
  console.log(chalk.cyan('\n💡 Tips for reliable wallet funding:'))
  console.log('1. Set up a treasury wallet:')
  console.log(chalk.gray('   export GHOSTSPEAK_TREASURY_WALLET_PATH=~/.config/solana/treasury.json'))
  console.log('2. Pre-fund test wallets:')
  console.log(chalk.gray('   npm run fund-wallets -- fund --count 10 --amount 0.1 --save'))
  console.log('3. Use minimum balance checks instead of always requesting full amounts')
  console.log('4. Implement retry logic and fallback strategies in your tests')
}

// Run the examples
main().catch(console.error)