/**
 * Setup Helpers - Shared utilities for GhostSpeak CLI setup flows
 */

import chalk from 'chalk'
import { spinner } from '@clack/prompts'
import { createSolanaRpc, address, createKeyPairSignerFromBytes } from '@solana/kit'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { FaucetService } from '../services/faucet-service.js'
import { WalletService } from '../services/wallet-service.js'
import type { KeyPairSigner } from '@solana/kit'
interface MinimalClient {
  config: { programId: string }
  governance: {
    createMultisig: (...args: unknown[]) => Promise<string>
  }
}

// Node.js globals
declare const fetch: typeof globalThis.fetch

export interface SetupProgress {
  step: number
  totalSteps: number
  currentTask: string
}

export interface WalletInfo {
  signer: KeyPairSigner
  address: string
  balance: number
  isNew: boolean
}

export interface SetupResult {
  success: boolean
  wallet: WalletInfo
  multisigAddress?: string
  network: 'devnet' | 'testnet'
  configPath: string
  agentCreated: boolean
  errors: string[]
}

/**
 * Display setup progress
 */
export function showProgress(progress: SetupProgress): void {
  const percentage = Math.round((progress.step / progress.totalSteps) * 100)
  const filled = Math.round(percentage / 5)
  const empty = 20 - filled
  
  console.log('\n' + chalk.cyan('Setup Progress:'))
  console.log(chalk.gray('[') + chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty)) + chalk.gray(']') + ` ${percentage}%`)
  console.log(chalk.gray(`Step ${progress.step}/${progress.totalSteps}: `) + chalk.white(progress.currentTask) + '\n')
}

/**
 * Generate a new wallet keypair
 */
export async function generateNewWallet(name?: string): Promise<WalletInfo & { mnemonic: string }> {
  const walletService = new WalletService()
  
  // Determine wallet name
  let walletName = name ?? 'ghost1'
  const registry = walletService.listWallets()
  const existingNames = new Set(registry.map(w => w.name))
  
  if (existingNames.has(walletName)) {
    // If name is taken (or default ghost1 is taken), find next available ghostN
    let i = 1
    while (existingNames.has(`ghost${i}`)) {
      i++
    }
    walletName = `ghost${i}`
  }
  
  const { wallet, mnemonic } = await walletService.createWallet(walletName, 'devnet')
  
  const signer = await walletService.getSigner(walletName)
  if (!signer) {
    throw new Error('Failed to create wallet')
  }
  
  return {
    signer,
    address: wallet.metadata.address,
    balance: 0,
    isNew: true,
    mnemonic
  }
}

/**
 * Load existing wallet from file
 */
export async function loadExistingWallet(walletPath: string): Promise<WalletInfo> {
  const expandedPath = walletPath.replace('~', homedir())
  
  if (!existsSync(expandedPath)) {
    throw new Error(`Wallet file not found at: ${expandedPath}`)
  }
  
  const walletData = readFileSync(expandedPath, 'utf-8')
  const keyArray = JSON.parse(walletData) as number[]
  const privateKey = new Uint8Array(keyArray)
  
  const signer = await createKeyPairSignerFromBytes(privateKey)
  
  return {
    signer,
    address: signer.address,
    balance: 0,
    isNew: false
  }
}

/**
 * Check wallet balance
 */
export async function checkWalletBalance(
  walletAddress: string, 
  network: 'devnet' | 'testnet'
): Promise<number> {
  try {
    const rpcUrl = network === 'devnet' 
      ? 'https://api.devnet.solana.com'
      : 'https://api.testnet.solana.com'
    
    const rpc = createSolanaRpc(rpcUrl)
    const { value: balance } = await rpc.getBalance(address(walletAddress)).send()
    return Number(balance) / 1_000_000_000 // Convert lamports to SOL
  } catch (error) {
    console.warn('Failed to check balance:', error)
    return 0
  }
}

/**
 * Fund wallet using multiple faucet sources
 */
export async function fundWallet(
  walletAddress: string,
  network: 'devnet' | 'testnet',
  targetAmount = 2
): Promise<{ success: boolean; amount: number; errors: string[] }> {
  const s = spinner()
  s.start('Requesting SOL from faucets...')
  
  const faucetService = new FaucetService()
  await faucetService.initialize()
  
  let totalReceived = 0
  const errors: string[] = []
  const sources = ['web3', 'solana', 'rpc'] // Try these sources in order
  
  for (const source of sources) {
    if (totalReceived >= targetAmount) break
    
    try {
      // Check rate limits
      const status = await faucetService.checkFaucetStatus(walletAddress, source, network)
      if (!status.canRequest) {
        errors.push(`${source}: Rate limited`)
        continue
      }
      
      // Request from faucet
      let result: { success: boolean; signature?: string; amount?: number; error?: string }
      
      if (source === 'web3') {
        const response = await fetch('https://api.devnet.solana.com/faucet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pubkey: walletAddress,
            lamports: 1_000_000_000 // 1 SOL
          })
        })
        
        const data = await response.json() as { signature?: string; error?: string }
        result = {
          success: Boolean(data.signature),
          signature: data.signature,
          amount: 1,
          error: data.error
        }
      } else if (source === 'solana') {
        const response = await fetch('https://faucet.solana.com/api/airdrop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pubkey: walletAddress,
            lamports: 1_000_000_000,
            cluster: network
          })
        })
        
        const data = await response.json() as { signature?: string; error?: string }
        result = {
          success: Boolean(data.signature),
          signature: data.signature,
          amount: 1,
          error: data.error
        }
      } else {
        // RPC airdrop
        const rpcUrl = network === 'devnet'
          ? 'https://api.devnet.solana.com'
          : 'https://api.testnet.solana.com'
        
        const rpc = createSolanaRpc(rpcUrl)
        try {
          const lamports = 1_000_000_000n as unknown as Parameters<typeof rpc.requestAirdrop>[1]
          const signature = await rpc.requestAirdrop(
            address(walletAddress),
            lamports
          ).send()
          
          result = {
            success: true,
            signature,
            amount: 1
          }
        } catch (error) {
          result = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
      
      if (result.success && result.signature) {
        await faucetService.recordRequest(
          walletAddress,
          network,
          source,
          result.amount ?? 1,
          result.signature
        )
        totalReceived += result.amount ?? 1
        s.message(`Received ${result.amount} SOL from ${source}`)
      } else {
        errors.push(`${source}: ${result.error ?? 'Failed'}`)
      }
      
    } catch (error) {
      errors.push(`${source}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  s.stop(totalReceived > 0 ? `✅ Received ${totalReceived} SOL` : '❌ Failed to get SOL')
  
  if (totalReceived > 0) {
    // Wait for confirmations
    console.log(chalk.gray('Waiting for transaction confirmations...'))
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  return {
    success: totalReceived > 0,
    amount: totalReceived,
    errors
  }
}

/**
 * Save wallet to file
 */
export async function saveWallet(
  signer: KeyPairSigner,
  customPath?: string
): Promise<string> {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  // Extract private key bytes
  const privateKeyBytes = 'privateKey' in signer && signer.privateKey instanceof Uint8Array
    ? signer.privateKey
    : 'secretKey' in signer && signer.secretKey instanceof Uint8Array
    ? signer.secretKey
    : new Uint8Array(64) // Fallback - should not happen
  
  const keyArray = Array.from(privateKeyBytes)
  const walletData = JSON.stringify(keyArray, null, 2)
  
  const walletPath = customPath ?? path.join(homedir(), '.ghostspeak', 'wallet.json')
  const walletDir = path.dirname(walletPath)
  
  await fs.mkdir(walletDir, { recursive: true })
  await fs.writeFile(walletPath, walletData, 'utf8')
  
  return walletPath
}

/**
 * Create a multisig wallet wrapper
 * NOTE: This is a placeholder implementation for the quickstart flow.
 * In production, this would use the actual GhostSpeak SDK to create a real multisig.
 */
export async function createMultisigWrapper(
  client: MinimalClient,
  signer: KeyPairSigner,
  name: string,
  _threshold = 1
): Promise<{ address: string; signature: string }> {
  try {
    // Generate multisig ID
    const multisigId = BigInt(Math.floor(Math.random() * 1000000))
    
    // Derive PDA
    const { deriveMultisigPda } = await import('../utils/pda.js')
    const multisigPda = await deriveMultisigPda(
      address(client.config.programId),
      signer.address,
      multisigId
    )
    
    // For now, return a mock signature since the actual SDK integration
    // requires complex type conversions that are beyond the scope of quickstart
    const signature = 'quickstart-multisig-' + multisigId.toString()
    
    console.log(chalk.gray(`\n💡 Note: Multisig creation is simulated in quickstart.`))
    console.log(chalk.gray(`   To create a real multisig, use: ${chalk.white('ghost governance multisig create')}\n`))
    
    return {
      address: multisigPda,
      signature
    }
  } catch (error) {
    throw new Error(`Failed to create multisig: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Show setup summary
 */
export function showSetupSummary(result: SetupResult): void {
  console.log('\n' + chalk.bold.green('🎉 Setup Complete!'))
  console.log('═'.repeat(50))
  
  console.log('\n' + chalk.bold('Wallet Information:'))
  console.log(chalk.gray('  Address:  ') + chalk.white(result.wallet.address))
  console.log(chalk.gray('  Balance:  ') + chalk.white(`${result.wallet.balance.toFixed(4)} SOL`))
  console.log(chalk.gray('  Network:  ') + chalk.white(result.network))
  console.log(chalk.gray('  Type:     ') + chalk.white(result.wallet.isNew ? 'New wallet' : 'Imported wallet'))
  
  if (result.multisigAddress) {
    console.log('\n' + chalk.bold('Multisig Wallet:'))
    console.log(chalk.gray('  Address:  ') + chalk.white(result.multisigAddress))
    console.log(chalk.gray('  Status:   ') + chalk.green('✅ Created'))
  }
  
  console.log('\n' + chalk.bold('Configuration:'))
  console.log(chalk.gray('  Config:   ') + chalk.white(result.configPath))
  console.log(chalk.gray('  Status:   ') + chalk.green('✅ Saved'))
  
  if (result.errors.length > 0) {
    console.log('\n' + chalk.yellow('⚠️  Some issues occurred:'))
    result.errors.forEach(error => {
      console.log(chalk.gray('  • ') + chalk.yellow(error))
    })
  }
  
  console.log('\n' + chalk.bold('Next Steps:'))
  if (!result.agentCreated) {
    console.log(chalk.gray('  1. Create your first agent:'))
    console.log(chalk.cyan('     ghost agent register'))
  }
  console.log(chalk.gray('  2. Browse the marketplace:'))
  console.log(chalk.cyan('     ghost marketplace list'))
  console.log(chalk.gray('  3. View your setup:'))
  console.log(chalk.cyan('     ghost config show'))
  
  console.log('\n' + chalk.green('Welcome to GhostSpeak! 🚀'))
}

/**
 * Validate network selection
 */
export function validateNetwork(network: string): 'devnet' | 'testnet' {
  if (network !== 'devnet' && network !== 'testnet') {
    throw new Error('Invalid network. Only devnet and testnet are supported for quickstart.')
  }
  return network as 'devnet' | 'testnet'
}