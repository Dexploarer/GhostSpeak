#!/usr/bin/env tsx
/**
 * Fund Wallets Script
 * 
 * Pre-fund test wallets for GhostSpeak development and testing.
 * Supports multiple funding strategies and can save wallet configurations.
 */

import { 
  createKeyPairSignerFromBytes, 
  generateKeyPairSigner,
  KeyPairSigner,
  address
} from '@solana/kit'
import { WalletFundingService } from '@ghostspeak/sdk'
import chalk from 'chalk'
import { promises as fs } from 'fs'
import path from 'path'
import { config } from 'dotenv'
import { Command } from 'commander'

// Load environment variables
config()

interface FundWalletOptions {
  amount: string
  count: number
  save: boolean
  output: string
  treasury?: string
  network: string
  verbose: boolean
}

interface WalletConfig {
  address: string
  privateKey: number[]
  balance: string
  fundingMethod: string
  createdAt: string
}

interface FundingReport {
  network: string
  timestamp: string
  wallets: WalletConfig[]
  summary: {
    total: number
    successful: number
    failed: number
    totalFunded: string
  }
}

async function fundWallets(options: FundWalletOptions) {
  const rpcUrl = process.env.GHOSTSPEAK_RPC_URL || 
    (options.network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com')
  
  console.log(chalk.cyan('💰 GhostSpeak Wallet Funding Tool'))
  console.log(chalk.gray(`Network: ${options.network}`))
  console.log(chalk.gray(`RPC URL: ${rpcUrl}`))
  console.log(chalk.gray(`Amount per wallet: ${options.amount} SOL`))
  console.log(chalk.gray(`Number of wallets: ${options.count}\n`))

  const fundingService = new WalletFundingService(rpcUrl)
  const amountLamports = BigInt(Math.floor(parseFloat(options.amount) * 1_000_000_000))
  
  // Load treasury wallet if provided
  let treasuryWallet: KeyPairSigner | undefined
  if (options.treasury) {
    try {
      if (options.treasury.startsWith('~/')) {
        options.treasury = path.join(process.env.HOME || '', options.treasury.slice(2))
      }
      
      const treasuryData = JSON.parse(await fs.readFile(options.treasury, 'utf-8')) as number[]
      treasuryWallet = await createKeyPairSignerFromBytes(new Uint8Array(treasuryData))
      console.log(chalk.gray(`Treasury wallet loaded: ${treasuryWallet.address}\n`))
    } catch (error) {
      console.error(chalk.red('Failed to load treasury wallet:'), error)
      process.exit(1)
    }
  }

  const walletConfigs: WalletConfig[] = []
  let successCount = 0
  let totalFunded = 0n

  // Create and fund wallets
  for (let i = 0; i < options.count; i++) {
    console.log(chalk.yellow(`\nWallet ${i + 1}/${options.count}:`))
    
    try {
      // Generate new wallet
      const wallet = await generateKeyPairSigner()
      console.log(chalk.gray(`Address: ${wallet.address}`))
      
      // Fund the wallet
      const result = await fundingService.fundWallet(wallet.address, {
        amount: amountLamports,
        maxRetries: 3,
        retryDelay: 2000,
        useTreasury: !!treasuryWallet,
        treasuryWallet,
        verbose: options.verbose
      })

      if (result.success) {
        successCount++
        totalFunded += result.balance
        
        console.log(chalk.green(`✅ Funded successfully!`))
        console.log(chalk.gray(`   Balance: ${(Number(result.balance) / 1_000_000_000).toFixed(4)} SOL`))
        console.log(chalk.gray(`   Method: ${result.method}`))
        if (result.signature) {
          console.log(chalk.gray(`   Signature: ${result.signature}`))
        }

        // Save wallet config
        const privateKeyArray = Array.from((wallet as any).secretKey || new Uint8Array(64)) as number[]
        walletConfigs.push({
          address: wallet.address,
          privateKey: privateKeyArray,
          balance: (Number(result.balance) / 1_000_000_000).toFixed(4),
          fundingMethod: result.method,
          createdAt: new Date().toISOString()
        })
      } else {
        console.log(chalk.red(`❌ Funding failed: ${result.error}`))
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }

  // Summary
  console.log(chalk.cyan('\n📊 Funding Summary:'))
  console.log(chalk.green(`✅ Successful: ${successCount}/${options.count}`))
  console.log(chalk.gray(`💰 Total funded: ${(Number(totalFunded) / 1_000_000_000).toFixed(4)} SOL`))

  // Save wallet configurations if requested
  if (options.save && walletConfigs.length > 0) {
    const report: FundingReport = {
      network: options.network,
      timestamp: new Date().toISOString(),
      wallets: walletConfigs,
      summary: {
        total: options.count,
        successful: successCount,
        failed: options.count - successCount,
        totalFunded: (Number(totalFunded) / 1_000_000_000).toFixed(4)
      }
    }

    const outputPath = path.resolve(options.output)
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2))
    console.log(chalk.gray(`\nWallet configurations saved to: ${outputPath}`))
    
    // Also save a simple format for easy loading
    const simpleWalletsPath = outputPath.replace('.json', '-simple.json')
    const simpleWallets = walletConfigs.map(w => w.privateKey)
    await fs.writeFile(simpleWalletsPath, JSON.stringify(simpleWallets, null, 2))
    console.log(chalk.gray(`Simple wallet array saved to: ${simpleWalletsPath}`))
  }
}

// CLI setup
const program = new Command()
  .name('fund-wallets')
  .description('Pre-fund test wallets for GhostSpeak development')
  .version('1.0.0')

program
  .command('fund')
  .description('Create and fund new wallets')
  .option('-a, --amount <sol>', 'Amount of SOL per wallet', '0.1')
  .option('-c, --count <number>', 'Number of wallets to create', '5')
  .option('-s, --save', 'Save wallet configurations', false)
  .option('-o, --output <path>', 'Output file for wallet configs', './funded-wallets.json')
  .option('-t, --treasury <path>', 'Path to treasury wallet for funding')
  .option('-n, --network <network>', 'Network to use', 'devnet')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options: FundWalletOptions) => {
    await fundWallets(options)
  })

program
  .command('check <wallet>')
  .description('Check wallet balance')
  .option('-n, --network <network>', 'Network to use', 'devnet')
  .action(async (walletAddress: string, options: { network: string }) => {
    const rpcUrl = process.env.GHOSTSPEAK_RPC_URL || 
      (options.network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com')
    
    const fundingService = new WalletFundingService(rpcUrl)
    const balance = await fundingService['getBalance'](address(walletAddress))
    
    console.log(chalk.cyan('💰 Wallet Balance Check'))
    console.log(chalk.gray(`Address: ${walletAddress}`))
    console.log(chalk.gray(`Network: ${options.network}`))
    console.log(chalk.green(`Balance: ${(Number(balance) / 1_000_000_000).toFixed(4)} SOL`))
  })

program
  .command('top-up <wallet>')
  .description('Top up existing wallet to minimum balance')
  .option('-m, --min <sol>', 'Minimum balance in SOL', '0.1')
  .option('-t, --treasury <path>', 'Path to treasury wallet for funding')
  .option('-n, --network <network>', 'Network to use', 'devnet')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (walletAddress: string, options: any) => {
    const rpcUrl = process.env.GHOSTSPEAK_RPC_URL || 
      (options.network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com')
    
    const fundingService = new WalletFundingService(rpcUrl)
    const minLamports = BigInt(Math.floor(parseFloat(options.min) * 1_000_000_000))
    
    // Load treasury wallet if provided
    let treasuryWallet: KeyPairSigner | undefined
    if (options.treasury) {
      try {
        const treasuryData = JSON.parse(await fs.readFile(options.treasury, 'utf-8')) as number[]
        treasuryWallet = await createKeyPairSignerFromBytes(new Uint8Array(treasuryData))
      } catch (error) {
        console.error(chalk.red('Failed to load treasury wallet:'), error)
        process.exit(1)
      }
    }
    
    console.log(chalk.cyan('💰 Topping up wallet...'))
    
    const result = await fundingService.ensureMinimumBalance(
      address(walletAddress),
      minLamports,
      {
        useTreasury: !!treasuryWallet,
        treasuryWallet,
        verbose: options.verbose
      }
    )
    
    if (result.success) {
      console.log(chalk.green('✅ Wallet topped up successfully!'))
      console.log(chalk.gray(`Balance: ${(Number(result.balance) / 1_000_000_000).toFixed(4)} SOL`))
      console.log(chalk.gray(`Method: ${result.method}`))
    } else {
      console.log(chalk.red(`❌ Top-up failed: ${result.error}`))
    }
  })

program.parse(process.argv)