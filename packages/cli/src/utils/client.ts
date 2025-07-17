/**
 * Shared SDK client initialization for CLI commands - July 2025 Standards
 */

import { createSolanaRpc, KeyPairSigner, createKeyPairSignerFromBytes, address } from '@solana/kit'
import { GhostSpeakClient, GHOSTSPEAK_PROGRAM_ID } from '@ghostspeak/sdk'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { log } from '@clack/prompts'
import chalk from 'chalk'
import { loadConfig } from './config.js'

/**
 * Get or create a wallet for CLI operations
 */
export function getWallet(): KeyPairSigner {
  const config = loadConfig()
  
  // First try to use the configured wallet
  if (config.walletPath && existsSync(config.walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(config.walletPath, 'utf-8'))
      return createKeyPairSignerFromBytes(new Uint8Array(walletData))
    } catch (error) {
      log.warn(`Failed to load wallet from config: ${config.walletPath}`)
    }
  }
  
  // Fall back to GhostSpeak CLI wallet
  const walletPath = join(homedir(), '.config', 'solana', 'ghostspeak-cli.json')
  if (existsSync(walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'))
      return createKeyPairSignerFromBytes(new Uint8Array(walletData))
    } catch (error) {
      log.warn('Failed to load GhostSpeak CLI wallet')
    }
  }
  
  // Try default Solana CLI wallet
  const defaultWalletPath = join(homedir(), '.config', 'solana', 'id.json')
  if (existsSync(defaultWalletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(defaultWalletPath, 'utf-8'))
      return createKeyPairSignerFromBytes(new Uint8Array(walletData))
    } catch (error) {
      log.warn('Failed to load default Solana wallet')
    }
  }
  
  // Create new wallet if none exists
  const newWallet = crypto.getRandomValues(new Uint8Array(64))
  const signer = createKeyPairSignerFromBytes(newWallet)
  
  // Save the new wallet
  writeFileSync(walletPath, JSON.stringify([...newWallet]))
  log.info(`Created new wallet: ${signer.address}`)
  log.warn(`Please configure your wallet using: gs config setup`)
  log.warn(`Or request SOL from faucet using: gs faucet --save`)
  
  return signer
}

/**
 * Initialize GhostSpeak SDK client
 */
export async function initializeClient(network?: 'devnet' | 'testnet' | 'mainnet-beta'): Promise<{
  client: GhostSpeakClient
  wallet: KeyPairSigner
  rpc: any
}> {
  const config = loadConfig()
  
  // Use network from config if not provided
  const selectedNetwork = network || config.network || 'devnet'
  
  // Set up RPC connection with proper URL validation
  let rpcUrl = config.rpcUrl
  if (!rpcUrl) {
    switch (selectedNetwork) {
      case 'mainnet-beta':
      case 'mainnet':
        rpcUrl = 'https://api.mainnet-beta.solana.com'
        break
      case 'testnet':
        rpcUrl = 'https://api.testnet.solana.com'
        break
      case 'devnet':
      default:
        rpcUrl = 'https://api.devnet.solana.com'
        break
    }
  }
  
  // Validate URL format
  if (!rpcUrl || typeof rpcUrl !== 'string') {
    throw new Error('Invalid RPC URL configuration')
  }
  
  try {
    new URL(rpcUrl) // Validate URL format
  } catch {
    throw new Error(`Invalid RPC endpoint URL: ${rpcUrl}`)
  }
  
  const rpc = createSolanaRpc(rpcUrl)
  
  // Get wallet
  const wallet = getWallet()
  
  // Initialize client with the program ID from config or default
  const programId = config.programId || GHOSTSPEAK_PROGRAM_ID
  const client = new GhostSpeakClient({
    rpc,
    signer: wallet,
    programId: address(programId)
  })
  
  // Check wallet balance
  try {
    const balanceResponse = await rpc.getBalance(wallet.address).send()
    const balance = balanceResponse.value
    if (balance === 0n) {
      log.warn(chalk.yellow('⚠️  Your wallet has 0 SOL. You need SOL to perform transactions.'))
      log.info(chalk.dim('Run: npx ghostspeak faucet --save'))
    }
  } catch (error) {
    // Log but don't fail on balance check errors
    console.warn('Balance check failed:', error.message)
  }
  
  return { client, wallet, rpc }
}

/**
 * Format transaction signature into explorer URL
 */
export function getExplorerUrl(signature: string, network: string = 'devnet'): string {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
  return `https://explorer.solana.com/tx/${signature}${cluster}`
}

/**
 * Format address into explorer URL
 */
export function getAddressExplorerUrl(address: string, network: string = 'devnet'): string {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
  return `https://explorer.solana.com/address/${address}${cluster}`
}

/**
 * Handle transaction errors with user-friendly messages
 */
export function handleTransactionError(error: any): string {
  if (error.message?.includes('insufficient funds')) {
    return 'Insufficient SOL balance. Run: npx ghostspeak faucet --save'
  }
  
  if (error.message?.includes('blockhash not found')) {
    return 'Transaction expired. Please try again.'
  }
  
  if (error.message?.includes('already in use')) {
    return 'Account already exists. Try a different ID.'
  }
  
  // Return original error if no specific handling
  return error.message || 'Transaction failed'
}