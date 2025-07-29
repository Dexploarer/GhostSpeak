/**
 * Shared SDK client initialization for CLI commands - July 2025 Standards
 */

import { createSolanaRpc, createSolanaRpcSubscriptions, KeyPairSigner, createKeyPairSignerFromBytes, address, type TransactionSigner } from '@solana/kit'
import { GhostSpeakClient, GHOSTSPEAK_PROGRAM_ID } from '@ghostspeak/sdk'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { log } from '@clack/prompts'
import { URL } from 'node:url'
import chalk from 'chalk'
import { loadConfig } from './config.js'
import { WalletService } from '../services/wallet-service.js'

// Node.js globals
declare const crypto: typeof globalThis.crypto

/**
 * Get or create a wallet for CLI operations
 */
export async function getWallet(): Promise<KeyPairSigner> {
  const walletService = new WalletService()
  
  // First try to use the active wallet from the new wallet service
  const activeSigner = walletService.getActiveSigner()
  if (activeSigner) {
    return activeSigner
  }
  
  // Check if we need to migrate old wallet
  await walletService.migrateOldWallet()
  
  // Try again after migration
  const postMigrationSigner = walletService.getActiveSigner()
  if (postMigrationSigner) {
    return postMigrationSigner
  }
  
  const config = loadConfig()
  
  // Try to load from configured wallet path (old style)
  if (config.walletPath && existsSync(config.walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(config.walletPath, 'utf-8')) as number[]
      const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData))
      
      // Import this wallet into the new system
      await walletService.importWallet('migrated', new Uint8Array(walletData), config.network || 'devnet')
      log.info('Migrated existing wallet to new wallet system')
      
      return signer
    } catch (error) {
      // Acknowledge error for future error handling
      void error
      log.warn(`Failed to load wallet from config: ${config.walletPath}`)
    }
  }
  
  // Fall back to GhostSpeak CLI wallet
  const walletPath = join(homedir(), '.config', 'solana', 'ghostspeak-cli.json')
  if (existsSync(walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8')) as number[]
      const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData))
      
      // Import this wallet
      await walletService.importWallet('cli-wallet', new Uint8Array(walletData), config.network || 'devnet')
      
      return signer
    } catch (error) {
      // Acknowledge error for future error handling
      void error
      log.warn('Failed to load GhostSpeak CLI wallet')
    }
  }
  
  // Try default Solana CLI wallet
  const defaultWalletPath = join(homedir(), '.config', 'solana', 'id.json')
  if (existsSync(defaultWalletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(defaultWalletPath, 'utf-8')) as number[]
      const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData))
      
      // Import this wallet
      await walletService.importWallet('solana-cli', new Uint8Array(walletData), config.network || 'devnet')
      
      return signer
    } catch (error) {
      // Acknowledge error for future error handling
      void error
      log.warn('Failed to load default Solana wallet')
    }
  }
  
  // Create new wallet if none exists
  log.info('No wallet found. Creating a new one...')
  const { wallet, mnemonic } = await walletService.createWallet('default', config.network || 'devnet')
  
  log.success(`Created new wallet: ${wallet.metadata.address}`)
  log.warn('⚠️  Save your seed phrase:')
  log.warn(mnemonic)
  log.info('')
  log.info('Next steps:')
  log.info(`  1. Save your seed phrase securely`)
  log.info(`  2. Fund your wallet: ${chalk.cyan('gs faucet')}`)
  log.info(`  3. Create an agent: ${chalk.cyan('gs agent register')}`)
  
  const signer = walletService.getActiveSigner()
  if (!signer) {
    throw new Error('Failed to create wallet')
  }
  
  return signer
}

/**
 * Convert CLI KeyPairSigner to TransactionSigner for SDK compatibility
 * Since KeyPairSigner already implements TransactionPartialSigner, which is part of TransactionSigner,
 * we can directly cast it to TransactionSigner.
 */
export function toSDKSigner(signer: KeyPairSigner): TransactionSigner {
  // KeyPairSigner from @solana/kit already implements TransactionPartialSigner
  // which is part of the TransactionSigner union type, so direct casting is safe
  return signer as TransactionSigner
}

/**
 * Initialize GhostSpeak SDK client
 */
export async function initializeClient(network?: 'devnet' | 'testnet' | 'mainnet-beta'): Promise<{
  client: GhostSpeakClient
  wallet: KeyPairSigner
  rpc: ReturnType<typeof createSolanaRpc>
}> {
  const config = loadConfig()
  
  // Use network from config if not provided
  const selectedNetwork = network ?? config.network ?? 'devnet'
  
  // Set up RPC connection with proper URL validation
  let rpcUrl = config.rpcUrl
  if (!rpcUrl) {
    switch (selectedNetwork) {
      case 'mainnet-beta':
        rpcUrl = 'https://api.mainnet-beta.solana.com'
        break
      case 'testnet':
        rpcUrl = 'https://api.testnet.solana.com'
        break
      case 'localnet':
        rpcUrl = 'http://localhost:8899'
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
  let rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions> | undefined
  try {
    const wsUrl = rpcUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')
      .replace('api.devnet', 'api.devnet')
      .replace('api.testnet', 'api.testnet')
      .replace('api.mainnet-beta', 'api.mainnet-beta')
    
    rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl)
  } catch {
    console.warn('Warning: Could not create RPC subscriptions, transaction confirmations may be slower')
  }
  
  // Get wallet
  const wallet = await getWallet()
  
  // Initialize client with the program ID from config or default
  const programId = config.programId || GHOSTSPEAK_PROGRAM_ID
  
  // Cast to ExtendedRpcApi - the Solana RPC does support all these methods
  const extendedRpc = rpc
  
  const client = new GhostSpeakClient({
    rpc: extendedRpc,
    rpcSubscriptions: rpcSubscriptions ?? undefined,
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
    console.warn('Balance check failed:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  // Add cleanup method to client
  const originalClient = client
  const enhancedClient = {
    ...originalClient,
    cleanup: async () => {
      try {
        // Close RPC subscriptions if they exist
        if (rpcSubscriptions) {
          if ('close' in rpcSubscriptions && typeof rpcSubscriptions.close === 'function') {
            const closeMethod = rpcSubscriptions.close as () => Promise<void>
            await closeMethod.call(rpcSubscriptions)
          }
        }
        
        // Close HTTP connections if possible
        // HTTP connections don't need explicit closing in most cases
        // If RPC has a close method in future versions, it can be called here
      } catch (error) {
        // Silent cleanup - don't throw errors during cleanup
        console.debug('Client cleanup warning:', error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  return { 
    // @ts-expect-error Client type includes our cleanup method
    client: enhancedClient as GhostSpeakClient, 
    wallet, 
    rpc 
  }
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
 * @deprecated Use handleError from error-handler.ts instead
 */
export function handleTransactionError(error: Error | unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  
  if (message.includes('insufficient funds')) {
    return 'Insufficient SOL balance. Run: npx ghostspeak faucet --save'
  }
  
  if (message.includes('blockhash not found')) {
    return 'Transaction expired. Please try again.'
  }
  
  if (message.includes('already in use')) {
    return 'Account already exists. Try a different ID.'
  }
  
  // Return original error if no specific handling
  return message || 'Transaction failed'
}