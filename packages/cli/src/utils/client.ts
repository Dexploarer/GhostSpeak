/**
 * Shared SDK client initialization for CLI commands - July 2025 Standards
 * Enhanced with connection pooling for optimal performance
 */

import type { KeyPairSigner} from '@solana/kit';
import { createSolanaRpc, createSolanaRpcSubscriptions, createKeyPairSignerFromBytes, address, type TransactionSigner } from '@solana/kit'
import { GhostSpeakClient, GHOSTSPEAK_PROGRAM_ID } from '@ghostspeak/sdk'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { log } from '@clack/prompts'
import { URL } from 'node:url'
import chalk from 'chalk'
import { loadConfig } from './config.js'
import { WalletService } from '../services/wallet-service.js'
import { connectionPoolManager, type NetworkType } from '../core/connection-pool.js'
import { rpcPoolManager } from '../services/blockchain/rpc-pool-manager.js'


/**
 * Get or create a wallet for CLI operations
 */
export async function getWallet(): Promise<KeyPairSigner> {
  const walletService = new WalletService()
  
  // First try to use the active wallet from the new wallet service
  const activeSigner = await walletService.getActiveSigner()
  if (activeSigner) {
    return activeSigner
  }
  
  // Check if we need to migrate old wallet
  await walletService.migrateOldWallet()
  
  // Try again after migration
  const postMigrationSigner = await walletService.getActiveSigner()
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
      await walletService.importWallet('migrated', new Uint8Array(walletData), config.network === 'localnet' ? 'devnet' : config.network as 'devnet' | 'testnet' | 'mainnet-beta')
      log.info('Migrated existing wallet to new wallet system')
      
      return signer
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.error(`Failed to load wallet from config: ${config.walletPath}`)
      log.error(`Error details: ${errorMessage}`)
      if (errorMessage.includes('ENOENT')) {
        log.info(`💡 Wallet file not found. Create a new wallet or check the path.`)
      } else if (errorMessage.includes('permission')) {
        log.info(`💡 Permission denied. Check file permissions for ${config.walletPath}`)
      } else if (errorMessage.includes('JSON')) {
        log.info(`💡 Wallet file appears to be corrupted. Try restoring from backup.`)
      }
    }
  }
  
  // Fall back to GhostSpeak CLI wallet
  const walletPath = join(homedir(), '.config', 'solana', 'ghostspeak-cli.json')
  if (existsSync(walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8')) as number[]
      const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData))
      
      // Import this wallet
      await walletService.importWallet('cli-wallet', new Uint8Array(walletData), config.network === 'localnet' ? 'devnet' : config.network as 'devnet' | 'testnet' | 'mainnet-beta')
      
      return signer
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.error('Failed to load GhostSpeak CLI wallet')
      log.error(`Error details: ${errorMessage}`)
      if (errorMessage.includes('ENOENT')) {
        log.info(`💡 GhostSpeak CLI wallet not found at ${walletPath}`)
      } else if (errorMessage.includes('JSON')) {
        log.info(`💡 GhostSpeak CLI wallet file appears corrupted. Delete ${walletPath} to create a new one.`)
      } else if (errorMessage.includes('Invalid')) {
        log.info(`💡 GhostSpeak CLI wallet contains invalid key data. Try recreating the wallet.`)
      }
    }
  }
  
  // Try default Solana CLI wallet
  const defaultWalletPath = join(homedir(), '.config', 'solana', 'id.json')
  if (existsSync(defaultWalletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(defaultWalletPath, 'utf-8')) as number[]
      const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData))
      
      // Import this wallet
      await walletService.importWallet('solana-cli', new Uint8Array(walletData), config.network === 'localnet' ? 'devnet' : config.network as 'devnet' | 'testnet' | 'mainnet-beta')
      
      return signer
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.error('Failed to load default Solana CLI wallet')
      log.error(`Error details: ${errorMessage}`)
      if (errorMessage.includes('ENOENT')) {
        log.info(`💡 Solana CLI wallet not found. Run 'solana-keygen new' to create one.`)
      } else if (errorMessage.includes('JSON')) {
        log.info(`💡 Solana CLI wallet file corrupted. Run 'solana-keygen recover' to restore.`)
      } else if (errorMessage.includes('Invalid')) {
        log.info(`💡 Invalid Solana wallet format. Generate a new keypair with 'solana-keygen new'.`)
      }
    }
  }
  
  // Create new wallet if none exists
  try {
    log.info('No wallet found. Creating a new one...')
    const { wallet, mnemonic } = await walletService.createWallet('default', config.network as 'devnet' | 'testnet' | 'mainnet-beta')
    
    log.success(`Created new wallet: ${wallet.metadata.address}`)
    log.warn('⚠️  Save your seed phrase:')
    log.warn(mnemonic)
    log.info('')
    log.info('Next steps:')
    log.info(`  1. Save your seed phrase securely`)
    log.info(`  2. Fund your wallet: ${chalk.cyan('gs faucet')}`)
    log.info(`  3. Create an agent: ${chalk.cyan('gs agent register')}`)
    
    const signer = await walletService.getActiveSigner()
    if (!signer) {
      throw new Error('Failed to retrieve newly created wallet')
    }
    
    return signer
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error('Failed to create new wallet')
    log.error(`Error details: ${errorMessage}`)
    if (errorMessage.includes('permission')) {
      log.info(`💡 Permission denied. Check write permissions in ~/.config/solana/`)
    } else if (errorMessage.includes('ENOSPC')) {
      log.info(`💡 No space left on device. Free up some disk space and try again.`)
    } else {
      log.info(`💡 Try running with elevated permissions or check your file system.`)
    }
    throw new Error(`Wallet creation failed: ${errorMessage}`)
  }
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
 * Initialize GhostSpeak SDK client with connection pooling for optimal performance
 */
export async function initializeClient(network?: 'devnet' | 'testnet' | 'mainnet-beta'): Promise<{
  client: GhostSpeakClient
  wallet: KeyPairSigner
  rpc: ReturnType<typeof createSolanaRpc>
  pooledRpc?: any // PooledRpcClient instance
}> {
  const config = loadConfig()
  
  // Use network from config if not provided
  const selectedNetwork = network ?? config.network
  
  // Set up RPC connection with connection pooling for optimal performance
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
  
  // Use connection pool for improved performance
  const networkType = (selectedNetwork === 'localnet' ? 'devnet' : selectedNetwork) as NetworkType
  const pooledRpcClient = rpcPoolManager.getClient(networkType)
  
  // Create traditional RPC client for compatibility
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
  console.log('🔍 [DEBUG] Program ID from config:', programId)
  console.log('🔍 [DEBUG] Program ID length:', programId.length)
  console.log('🔍 [DEBUG] GHOSTSPEAK_PROGRAM_ID fallback:', GHOSTSPEAK_PROGRAM_ID)
  
  // Cast to ExtendedRpcApi - the Solana RPC does support all these methods  
  // Use the proper typed casting function instead of unsafe 'any' casting
  const extendedRpc = rpc as import('@ghostspeak/sdk').ExtendedRpcApi
  const client = new GhostSpeakClient({
    rpc: extendedRpc,
    programId: address(programId),
    commitment: 'confirmed'
  })
  
  // Check wallet balance
  try {
    // Ensure wallet has a valid address
    if (wallet.address) {
      const balanceResponse = await rpc.getBalance(wallet.address).send()
      const balance = balanceResponse.value
      if (balance === 0n) {
        log.warn(chalk.yellow('⚠️  Your wallet has 0 SOL. You need SOL to perform transactions.'))
        log.info(chalk.dim('Run: npx ghostspeak faucet --save'))
      }
    }
  } catch {
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
      } catch {
        // Silent cleanup - don't throw errors during cleanup
        console.debug('Client cleanup warning:', error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  return { 
    client: enhancedClient, 
    wallet, 
    rpc,
    pooledRpc: pooledRpcClient
  }
}

/**
 * Format transaction signature into explorer URL
 */
export function getExplorerUrl(signature: string, network = 'devnet'): string {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
  return `https://explorer.solana.com/tx/${signature}${cluster}`
}

/**
 * Format address into explorer URL
 */
export function getAddressExplorerUrl(address: string, network = 'devnet'): string {
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