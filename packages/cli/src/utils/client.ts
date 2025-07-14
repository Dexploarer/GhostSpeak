/**
 * Shared SDK client initialization for CLI commands
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { log } from '@clack/prompts'
import chalk from 'chalk'

/**
 * Get or create a wallet for CLI operations
 */
export function getWallet(): Keypair {
  const walletPath = join(homedir(), '.config', 'solana', 'ghostspeak-cli.json')
  
  if (existsSync(walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'))
      return Keypair.fromSecretKey(new Uint8Array(walletData))
    } catch (error) {
      log.warn('Failed to load existing wallet, creating new one')
    }
  }
  
  // Create new wallet if none exists
  const newWallet = Keypair.generate()
  log.info(`Created new wallet: ${newWallet.publicKey.toBase58()}`)
  log.warn(`Please save your wallet or request SOL from faucet using: npx ghostspeak faucet --save`)
  
  return newWallet
}

/**
 * Initialize GhostSpeak SDK client
 */
export async function initializeClient(network: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet'): Promise<{
  client: GhostSpeakClient
  wallet: Keypair
  connection: Connection
}> {
  // Set up connection
  const rpcUrl = network === 'mainnet-beta' 
    ? 'https://api.mainnet-beta.solana.com'
    : `https://api.${network}.solana.com`
    
  const connection = new Connection(rpcUrl, 'confirmed')
  
  // Get wallet
  const wallet = getWallet()
  
  // Initialize client with the correct program ID
  const programId = new PublicKey('367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK')
  
  const client = new GhostSpeakClient({
    connection,
    wallet,
    programId
  })
  
  // Check wallet balance
  try {
    const balance = await connection.getBalance(wallet.publicKey)
    if (balance === 0) {
      log.warn(chalk.yellow('⚠️  Your wallet has 0 SOL. You need SOL to perform transactions.'))
      log.info(chalk.dim('Run: npx ghostspeak faucet --save'))
    }
  } catch (error) {
    // Ignore balance check errors
  }
  
  return { client, wallet, connection }
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