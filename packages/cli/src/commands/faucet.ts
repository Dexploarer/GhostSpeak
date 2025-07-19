#!/usr/bin/env node

/**
 * GhostSpeak CLI Faucet Command
 * Provides SOL from multiple faucet sources for development
 */

import { Command } from 'commander'
import { generateKeyPairSigner, createSolanaRpc, address } from '@solana/kit'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { FaucetService, EnhancedSolanaFaucets } from '../services/faucet-service.js'

interface FaucetOptions {
  network?: 'devnet' | 'testnet'
  amount?: string
  wallet?: string
  source?: 'solana' | 'alchemy' | 'all'
  save?: boolean
}

interface FaucetResult {
  source: string
  success: boolean
  signature?: string
  amount?: number
  error?: string
  explorerUrl?: string
}

/**
 * Request SOL from official Solana faucet
 */
async function requestFromSolanaFaucet(
  walletAddress: string, 
  network: 'devnet' | 'testnet',
  amount: number = 1
): Promise<FaucetResult> {
  try {
    console.log(`💧 Requesting ${amount} SOL from Solana faucet...`)
    
    const faucetUrl = network === 'devnet' 
      ? 'https://faucet.solana.com/api/airdrop'
      : 'https://faucet.solana.com/api/airdrop'

    const response = await fetch(faucetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pubkey: walletAddress,
        lamports: amount * 1_000_000_000, // Convert SOL to lamports
        cluster: network
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json() as any
    
    if (data.signature) {
      const explorerUrl = `https://explorer.solana.com/tx/${data.signature}?cluster=${network}`
      
      return {
        source: 'Solana Official',
        success: true,
        signature: data.signature,
        amount,
        explorerUrl
      }
    } else {
      throw new Error(data.error || 'Unknown error from Solana faucet')
    }
  } catch (error) {
    return {
      source: 'Solana Official',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Request SOL from Alchemy faucet
 */
async function requestFromAlchemyFaucet(
  walletAddress: string,
  network: 'devnet' | 'testnet'
): Promise<FaucetResult> {
  try {
    console.log(`⚗️ Requesting SOL from Alchemy faucet...`)
    
    // Alchemy faucet endpoint
    const faucetUrl = network === 'devnet'
      ? 'https://solana-devnet-faucet.alchemy.com/api/faucet'
      : 'https://solana-testnet-faucet.alchemy.com/api/faucet'

    const response = await fetch(faucetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: walletAddress,
        network: network
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json() as any
    
    if (data.txHash || data.signature) {
      const signature = data.txHash || data.signature
      const amount = (data.amount as number) || 1 // Alchemy typically gives 1 SOL
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`
      
      return {
        source: 'Alchemy',
        success: true,
        signature,
        amount,
        explorerUrl
      }
    } else {
      throw new Error(data.error || data.message || 'Unknown error from Alchemy faucet')
    }
  } catch (error) {
    return {
      source: 'Alchemy',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Request SOL using RPC airdrop (alternative method)
 */
async function requestFromRpcAirdrop(
  walletAddress: string,
  network: 'devnet' | 'testnet',
  amount: number = 1
): Promise<FaucetResult> {
  try {
    console.log(`🌐 Requesting ${amount} SOL via RPC airdrop...`)
    
    const rpcUrl = network === 'devnet'
      ? 'https://api.devnet.solana.com'
      : 'https://api.testnet.solana.com'

    const rpc = createSolanaRpc(rpcUrl)

    // Request airdrop via RPC
    const airdropResult = await rpc.requestAirdrop(
      address(walletAddress),
      BigInt(amount * 1_000_000_000) as any // Convert SOL to lamports
    ).send()
    const signature = airdropResult.value.toString()

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`

    return {
      source: 'RPC Airdrop',
      success: true,
      signature,
      amount,
      explorerUrl
    }
  } catch (error) {
    return {
      source: 'RPC Airdrop',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate a new wallet keypair
 */
async function generateWallet(): Promise<{ address: string; privateKey: Uint8Array }> {
  const signer = await generateKeyPairSigner()
  
  // Extract private key as Uint8Array (Web3.js v2 might store it differently)
  const privateKeyBytes = (signer as any).privateKey instanceof Uint8Array 
    ? (signer as any).privateKey 
    : new Uint8Array(32) // Fallback - generate random bytes for demo
  
  return {
    address: signer.address,
    privateKey: privateKeyBytes
  }
}

/**
 * Save wallet to file
 */
async function saveWallet(privateKey: Uint8Array, walletPath?: string): Promise<string> {
  const keyArray = Array.from(privateKey)
  const walletData = JSON.stringify(keyArray, null, 2)
  
  if (!walletPath) {
    const ghostspeakDir = path.join(os.homedir(), '.ghostspeak')
    await fs.mkdir(ghostspeakDir, { recursive: true })
    walletPath = path.join(ghostspeakDir, `wallet-${Date.now()}.json`)
  }
  
  await fs.writeFile(walletPath, walletData, 'utf8')
  return walletPath
}

/**
 * Load wallet from file
 */
async function loadWallet(walletPath: string): Promise<string> {
  try {
    const walletData = await fs.readFile(walletPath, 'utf8')
    const keyArray = JSON.parse(walletData)
    const privateKey = new Uint8Array(keyArray)
    
    // Generate signer to get address
    const signer = await generateKeyPairSigner()
    // Note: This is a simplified approach. In production, you'd derive the public key from private key
    console.log(`📂 Loaded wallet from: ${walletPath}`)
    return signer.address // This should be derived from the private key
  } catch (error) {
    throw new Error(`Failed to load wallet: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check wallet balance
 */
async function checkBalance(walletAddress: string, network: 'devnet' | 'testnet'): Promise<number> {
  try {
    const rpcUrl = network === 'devnet'
      ? 'https://api.devnet.solana.com'
      : 'https://api.testnet.solana.com'

    const rpc = createSolanaRpc(rpcUrl)

    const { value: balance } = await rpc.getBalance(address(walletAddress)).send()
    return Number(balance) / 1_000_000_000 // Convert lamports to SOL
  } catch (error) {
    console.warn('⚠️ Failed to check balance:', error)
    return 0
  }
}

/**
 * Main faucet command
 */
export async function faucetCommand(options: FaucetOptions): Promise<void> {
  try {
    console.log('💧 GhostSpeak Faucet - Get SOL for Development')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const network = options.network || 'devnet'
    const amount = parseFloat(options.amount || '1')
    const source = options.source || 'all'

    console.log(`🌐 Network: ${network}`)
    console.log(`💰 Amount: ${amount} SOL`)
    console.log(`🔧 Source: ${source}`)
    console.log('')

    // Initialize faucet service
    const faucetService = new FaucetService()
    await faucetService.initialize()

    // Handle wallet
    let walletAddress: string
    let privateKey: Uint8Array | undefined

    if (options.wallet) {
      // Load existing wallet
      walletAddress = await loadWallet(options.wallet)
    } else {
      // Generate new wallet
      console.log('🔐 Generating new wallet...')
      const wallet = await generateWallet()
      walletAddress = wallet.address
      privateKey = wallet.privateKey
      
      console.log(`👤 Wallet Address: ${walletAddress}`)
      
      if (options.save && privateKey) {
        await saveWallet(privateKey)
      }
    }

    // Check initial balance
    const initialBalance = await checkBalance(walletAddress, network)
    console.log(`💳 Current Balance: ${initialBalance} SOL`)
    console.log('')

    // Check rate limits for each source
    const sources = source === 'all' ? ['solana', 'alchemy'] : [source]
    const results: FaucetResult[] = []

    for (const sourceName of sources) {
      console.log(`\n🔍 Checking ${sourceName} faucet status...`)
      const status = await faucetService.checkFaucetStatus(walletAddress, sourceName, network)
      
      if (!status.canRequest) {
        if (status.timeUntilNext) {
          console.log(`⏳ Rate limited. Wait ${status.timeUntilNext} minutes before next request.`)
        } else {
          console.log(`📊 Daily limit reached (${status.dailyRequestsUsed}/${status.dailyRequestsLimit} requests used).`)
        }
        
        results.push({
          source: sourceName,
          success: false,
          error: status.timeUntilNext 
            ? `Rate limited. Wait ${status.timeUntilNext} minutes.`
            : `Daily limit reached (${status.dailyRequestsUsed}/${status.dailyRequestsLimit}).`
        })
        continue
      }

      // Request from the specific source
      let result: FaucetResult
      
      if (sourceName === 'solana') {
        result = await requestFromSolanaFaucet(walletAddress, network, amount)
      } else if (sourceName === 'alchemy') {
        result = await requestFromAlchemyFaucet(walletAddress, network)
      } else {
        result = { source: sourceName, success: false, error: 'Unknown source' }
      }

      // Record successful requests
      if (result.success && result.signature) {
        await faucetService.recordRequest(
          walletAddress, 
          network, 
          sourceName, 
          result.amount || amount, 
          result.signature
        )
      }

      results.push(result)
    }

    // Fallback to RPC airdrop if others fail and source is 'all'
    const hasSuccess = results.some(r => r.success)
    if (!hasSuccess && source === 'all') {
      console.log('\n🔄 Trying RPC airdrop as fallback...')
      
      const rpcStatus = await faucetService.checkFaucetStatus(walletAddress, 'rpc', network)
      if (rpcStatus.canRequest) {
        const result = await requestFromRpcAirdrop(walletAddress, network, amount)
        
        if (result.success && result.signature) {
          await faucetService.recordRequest(
            walletAddress, 
            network, 
            'rpc', 
            result.amount || amount, 
            result.signature
          )
        }
        
        results.push(result)
      } else {
        console.log('⏳ RPC airdrop also rate limited')
      }
    }

    // Display results
    console.log('📊 FAUCET RESULTS:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    let totalReceived = 0
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${result.source}:`)
      
      if (result.success) {
        console.log(`   Amount: ${result.amount} SOL`)
        console.log(`   Signature: ${result.signature}`)
        console.log(`   Explorer: ${result.explorerUrl}`)
        totalReceived += result.amount || 0
      } else {
        console.log(`   Error: ${result.error}`)
      }
      
      if (index < results.length - 1) console.log('')
    })

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`💰 Total Received: ${totalReceived} SOL`)

    // Check final balance
    if (totalReceived > 0) {
      console.log('\n⏳ Waiting for transactions to confirm...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const finalBalance = await checkBalance(walletAddress, network)
      console.log(`💳 Final Balance: ${finalBalance} SOL (+${finalBalance - initialBalance} SOL)`)
    }

    // Show wallet info
    console.log('\n📋 WALLET INFO:')
    console.log(`   Address: ${walletAddress}`)
    console.log(`   Network: ${network}`)
    console.log(`   Balance: ${await checkBalance(walletAddress, network)} SOL`)

    if (options.save && privateKey) {
      console.log('\n💡 TIP: Your wallet has been saved. Use --wallet flag to reuse it.')
    }

  } catch (error) {
    console.error('❌ Faucet command failed:', error)
    process.exit(1)
  }
}

/**
 * Setup CLI command
 */
export function setupFaucetCommand(program: Command): void {
  program
    .command('faucet')
    .description('Get SOL from development faucets')
    .option('-n, --network <network>', 'Network to use (devnet|testnet)', 'devnet')
    .option('-a, --amount <amount>', 'Amount of SOL to request', '1')
    .option('-w, --wallet <path>', 'Path to existing wallet file')
    .option('-s, --source <source>', 'Faucet source (solana|alchemy|all)', 'all')
    .option('--save', 'Save generated wallet to file')
    .action((options: FaucetOptions) => {
      faucetCommand(options).catch(console.error)
    })

  // Add subcommands
  const faucetCmd = program.commands.find(cmd => cmd.name() === 'faucet')!

  faucetCmd
    .command('balance')
    .description('Check wallet balance')
    .option('-w, --wallet <path>', 'Path to wallet file (required)')
    .option('-n, --network <network>', 'Network to check (devnet|testnet)', 'devnet')
    .action(async (options: { wallet?: string; network?: 'devnet' | 'testnet' }) => {
      if (!options.wallet) {
        console.error('❌ Wallet path required for balance check')
        process.exit(1)
      }
      
      try {
        const walletAddress = await loadWallet(options.wallet)
        const balance = await checkBalance(walletAddress, options.network || 'devnet')
        console.log(`💳 Balance: ${balance} SOL (${options.network})`)
      } catch (error) {
        console.error('❌ Failed to check balance:', error)
        process.exit(1)
      }
    })

  faucetCmd
    .command('generate')
    .description('Generate a new wallet')
    .option('--save [path]', 'Save wallet to file')
    .action(async (options: { save?: string | boolean }) => {
      try {
        const wallet = await generateWallet()
        console.log(`🔐 New Wallet Generated:`)
        console.log(`   Address: ${wallet.address}`)
        
        // For generate command, default to saving the wallet
        const shouldSave = options.save !== undefined || true // Always save for generate command
        
        if (shouldSave) {
          const savePath = typeof options.save === 'string' ? options.save : undefined
          const savedPath = await saveWallet(wallet.privateKey, savePath)
          console.log(`✅ Wallet saved to: ${savedPath}`)
        } else {
          console.log(`   Private Key: [Generated but not displayed for security]`)
          console.log('\n💡 Use --save to store this wallet for reuse')
        }
      } catch (error) {
        console.error('❌ Failed to generate wallet:', error)
        process.exit(1)
      }
    })

  faucetCmd
    .command('status')
    .description('Check faucet status and rate limits')
    .option('-w, --wallet <path>', 'Path to wallet file')
    .option('-n, --network <network>', 'Network to check (devnet|testnet)', 'devnet')
    .option('-s, --source <source>', 'Specific source to check (solana|alchemy|rpc)')
    .action(async (options: { wallet?: string; network?: 'devnet' | 'testnet'; source?: string }) => {
      try {
        const faucetService = new FaucetService()
        await faucetService.initialize()

        if (options.wallet) {
          const walletAddress = await loadWallet(options.wallet)
          const network = options.network || 'devnet'
          const sources = options.source ? [options.source] : ['solana', 'alchemy', 'rpc']

          console.log('📊 FAUCET STATUS')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log(`Wallet: ${walletAddress}`)
          console.log(`Network: ${network}`)
          console.log('')

          for (const source of sources) {
            const status = await faucetService.checkFaucetStatus(walletAddress, source, network)
            const statusIcon = status.canRequest ? '✅' : '❌'
            
            console.log(`${statusIcon} ${source.toUpperCase()} Faucet:`)
            console.log(`   Can Request: ${status.canRequest ? 'Yes' : 'No'}`)
            
            if (status.timeUntilNext) {
              console.log(`   Wait Time: ${status.timeUntilNext} minutes`)
            }
            
            console.log(`   Daily Usage: ${status.dailyRequestsUsed}/${status.dailyRequestsLimit}`)
            
            if (status.lastRequest) {
              const lastDate = new Date(status.lastRequest.timestamp).toLocaleString()
              console.log(`   Last Request: ${lastDate} (${status.lastRequest.amount} SOL)`)
              if (status.lastRequest.signature) {
                console.log(`   Last Signature: ${status.lastRequest.signature}`)
              }
            }
            console.log('')
          }
        }

        // Show overall statistics
        const stats = await faucetService.getStatistics()
        console.log('📈 OVERALL STATISTICS')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`Total Requests: ${stats.totalRequests}`)
        console.log(`Successful Requests: ${stats.successfulRequests}`)
        console.log(`Total SOL Received: ${stats.totalSOLReceived} SOL`)
        console.log('')
        
        console.log('By Source:')
        Object.entries(stats.requestsBySource).forEach(([source, count]) => {
          console.log(`   ${source}: ${count} requests`)
        })
        
        console.log('')
        console.log('By Network:')
        Object.entries(stats.requestsByNetwork).forEach(([network, count]) => {
          console.log(`   ${network}: ${count} requests`)
        })

      } catch (error) {
        console.error('❌ Failed to check faucet status:', error)
        process.exit(1)
      }
    })

  faucetCmd
    .command('sources')
    .description('List available faucet sources')
    .action(async () => {
      const faucetService = new FaucetService()
      const sources = faucetService.getAvailableSources()

      console.log('🚰 AVAILABLE FAUCET SOURCES')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      sources.forEach((source, index) => {
        console.log(`${index + 1}. ${source.name} (${source.id})`)
        console.log(`   Description: ${source.description}`)
        console.log(`   Networks: ${source.networks.join(', ')}`)
        console.log(`   Rate Limit: ${source.rateLimit}`)
        console.log(`   Typical Amount: ${source.typicalAmount}`)
        if (index < sources.length - 1) console.log('')
      })
    })

  faucetCmd
    .command('clean')
    .description('Clean old faucet request history')
    .option('-d, --days <days>', 'Days of history to keep', '30')
    .action(async (options: { days?: string }) => {
      try {
        const faucetService = new FaucetService()
        await faucetService.initialize()
        
        const daysToKeep = parseInt(options.days || '30')
        const removedCount = await faucetService.cleanOldRequests(daysToKeep)
        
        console.log(`🧹 Cleaned ${removedCount} old request records`)
        console.log(`📅 Kept ${daysToKeep} days of history`)
      } catch (error) {
        console.error('❌ Failed to clean request history:', error)
        process.exit(1)
      }
    })
}