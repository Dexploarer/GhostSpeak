/**
 * Shared SDK client initialization for CLI commands - July 2025 Standards
 */

import { createSolanaRpc, createSolanaRpcSubscriptions, KeyPairSigner, createKeyPairSignerFromBytes, address } from '@solana/kit'
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
export async function getWallet(): Promise<KeyPairSigner> {
  const config = loadConfig()
  
  // First try to use the configured wallet
  if (config.walletPath && existsSync(config.walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(config.walletPath, 'utf-8'))
      return await createKeyPairSignerFromBytes(new Uint8Array(walletData))
    } catch (error) {
      log.warn(`Failed to load wallet from config: ${config.walletPath}`)
    }
  }
  
  // Fall back to GhostSpeak CLI wallet
  const walletPath = join(homedir(), '.config', 'solana', 'ghostspeak-cli.json')
  if (existsSync(walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'))
      return await createKeyPairSignerFromBytes(new Uint8Array(walletData))
    } catch (error) {
      log.warn('Failed to load GhostSpeak CLI wallet')
    }
  }
  
  // Try default Solana CLI wallet
  const defaultWalletPath = join(homedir(), '.config', 'solana', 'id.json')
  if (existsSync(defaultWalletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(defaultWalletPath, 'utf-8'))
      return await createKeyPairSignerFromBytes(new Uint8Array(walletData))
    } catch (error) {
      log.warn('Failed to load default Solana wallet')
    }
  }
  
  // Create new wallet if none exists
  const newWallet = crypto.getRandomValues(new Uint8Array(64))
  const signer = await createKeyPairSignerFromBytes(newWallet)
  
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
  
  // Create RPC subscriptions for websocket connections
  let rpcSubscriptions
  try {
    const wsUrl = rpcUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')
      .replace('api.devnet', 'api.devnet')
      .replace('api.testnet', 'api.testnet')
      .replace('api.mainnet-beta', 'api.mainnet-beta')
    
    rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl)
  } catch (error) {
    console.warn('Warning: Could not create RPC subscriptions, transaction confirmations may be slower')
  }
  
  // Get wallet
  const wallet = await getWallet()
  
  // Initialize client with the program ID from config or default
  const programId = config.programId || GHOSTSPEAK_PROGRAM_ID
  
  // Cast to ExtendedRpcApi - the Solana RPC does support all these methods
  const extendedRpc = rpc as any
  
  const client = new GhostSpeakClient({
    rpc: extendedRpc,
    rpcSubscriptions,
    programId: address(programId),
    defaultFeePayer: wallet.address,
    commitment: 'confirmed',
    cluster: selectedNetwork === 'mainnet-beta' ? 'mainnet-beta' : selectedNetwork as 'devnet' | 'testnet' | 'localnet',
    rpcEndpoint: rpcUrl
  })
  
  // Check wallet balance
  try {
    // Ensure wallet has a valid address
    if (!wallet || !wallet.address) {
      log.warn(chalk.yellow('⚠️  Wallet loaded but address not available'))
    } else {
      const balanceResponse = await rpc.getBalance(wallet.address).send()
      const balance = balanceResponse.value
      if (balance === 0n) {
        log.warn(chalk.yellow('⚠️  Your wallet has 0 SOL. You need SOL to perform transactions.'))
        log.info(chalk.dim('Run: npx ghostspeak faucet --save'))
      }
    }
  } catch (error) {
    // Log but don't fail on balance check errors
    console.warn('Balance check failed:', error.message)
  }
  
  // Add cleanup method to client
  const originalClient = client
  const enhancedClient = {
    ...originalClient,
    cleanup: async () => {
      try {
        // Close RPC subscriptions if they exist
        if (rpcSubscriptions && typeof rpcSubscriptions.close === 'function') {
          await rpcSubscriptions.close()
        }
        
        // Close HTTP connections if possible
        if (rpc && typeof rpc.close === 'function') {
          await rpc.close()
        }
      } catch (error: any) {
        // Silent cleanup - don't throw errors during cleanup
        console.debug('Client cleanup warning:', error?.message)
      }
    }
  }

  return { client: enhancedClient, wallet, rpc, rpcSubscriptions }
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