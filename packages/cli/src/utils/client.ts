/**
 * Shared SDK client initialization for CLI commands - July 2025 Standards
 */

import { createSolanaRpc, KeyPairSigner, createKeyPairSignerFromBytes } from '@solana/kit'
import { GhostSpeakClient, GHOSTSPEAK_PROGRAM_ID } from '@ghostspeak/sdk'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { log } from '@clack/prompts'
import chalk from 'chalk'

/**
 * Get or create a wallet for CLI operations
 */
export function getWallet(): KeyPairSigner {
  const walletPath = join(homedir(), '.config', 'solana', 'ghostspeak-cli.json')
  
  if (existsSync(walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'))
      return createKeyPairSignerFromBytes(new Uint8Array(walletData))
    } catch (error) {
      log.warn('Failed to load existing wallet, creating new one')
    }
  }
  
  // Use default Solana CLI wallet
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
  log.warn(`Please save your wallet or request SOL from faucet using: npx ghostspeak faucet --save`)
  
  return signer
}

/**
 * Initialize GhostSpeak SDK client
 */
export async function initializeClient(network: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet'): Promise<{
  client: GhostSpeakClient
  wallet: KeyPairSigner
  rpc: any
}> {
  // Set up RPC connection using July 2025 patterns
  const rpcUrl = network === 'mainnet-beta' 
    ? 'https://api.mainnet-beta.solana.com'
    : `https://api.${network}.solana.com`
    
  const rpc = createSolanaRpc(rpcUrl)
  
  // Get wallet
  const wallet = getWallet()
  
  // Initialize client with the latest program ID
  const client = new GhostSpeakClient({
    rpc,
    signer: wallet,
    programId: GHOSTSPEAK_PROGRAM_ID
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
    // Ignore balance check errors
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