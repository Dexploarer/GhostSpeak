/**
 * Wallet Service - Comprehensive wallet management for GhostSpeak CLI
 */

import { 
  createKeyPairSignerFromBytes,
  address,
  createSolanaRpc,
  type KeyPairSigner 
} from '@solana/kit'
import type { Address } from '@solana/addresses'
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, renameSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as bip39 from 'bip39'
import { derivePath } from 'ed25519-hd-key'
import type { IWalletService, WalletInfo } from '../types/services.js'

export interface WalletMetadata {
  name: string
  address: string
  network: 'devnet' | 'testnet' | 'mainnet-beta'
  createdAt: number
  lastUsed: number
  isActive: boolean
}

export interface WalletData {
  metadata: WalletMetadata
  keypair: number[] // Store as array for JSON serialization
}

export interface WalletsRegistry {
  activeWallet: string | null
  wallets: Record<string, WalletMetadata>
}

export class WalletService implements IWalletService {
  private walletsDir: string
  private registryPath: string
  
  constructor() {
    const ghostspeakDir = join(homedir(), '.ghostspeak')
    this.walletsDir = join(ghostspeakDir, 'wallets')
    this.registryPath = join(this.walletsDir, 'registry.json')
    
    // Ensure directories exist
    if (!existsSync(ghostspeakDir)) {
      mkdirSync(ghostspeakDir, { recursive: true })
    }
    if (!existsSync(this.walletsDir)) {
      mkdirSync(this.walletsDir, { recursive: true })
    }
  }
  
  /**
   * Get or create the wallets registry
   */
  private getRegistry(): WalletsRegistry {
    if (existsSync(this.registryPath)) {
      try {
        return JSON.parse(readFileSync(this.registryPath, 'utf-8')) as WalletsRegistry
      } catch {
        // If corrupted, start fresh
      }
    }
    
    return {
      activeWallet: null,
      wallets: {}
    }
  }
  
  /**
   * Save the registry
   */
  private saveRegistry(registry: WalletsRegistry): void {
    writeFileSync(this.registryPath, JSON.stringify(registry, null, 2))
  }
  
  /**
   * Generate a new mnemonic seed phrase
   */
  generateMnemonic(): string {
    return bip39.generateMnemonic(256) // 24 words for max security
  }
  
  /**
   * Create keypair from mnemonic with proper BIP44 derivation
   */
  async keypairFromMnemonic(mnemonic: string, index = 0): Promise<KeyPairSigner> {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase')
    }
    
    try {
      // Generate seed from mnemonic
      const seed = await bip39.mnemonicToSeed(mnemonic)
      
      // Use Solana's standard derivation path: m/44'/501'/index'/0'
      const derivationPath = `m/44'/501'/${index}'/0'`
      const { key } = derivePath(derivationPath, seed.toString('hex'))
      
      // The key from derivePath is 32 bytes, but we need to use it as a private key
      // For Solana v2, we should use the 32-byte private key directly with createKeyPairFromPrivateKeyBytes
      const { createKeyPairFromPrivateKeyBytes } = await import('@solana/keys')
      const { createSignerFromKeyPair } = await import('@solana/signers')
      
      // Create keypair from 32-byte private key
      const keyPair = await createKeyPairFromPrivateKeyBytes(new Uint8Array(key))
      
      // Create signer from keypair
      return await createSignerFromKeyPair(keyPair)
    } catch (error) {
      throw new Error(`Failed to derive keypair from mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Create a new wallet
   */
  async createWallet(
    name: string, 
    network: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet',
    mnemonic?: string
  ): Promise<{ wallet: WalletData; mnemonic: string }> {
    const registry = this.getRegistry()
    
    // Check if name already exists
    if (name in registry.wallets) {
      throw new Error(`Wallet with name "${name}" already exists`)
    }
    
    // Generate or use provided mnemonic
    const seedPhrase = mnemonic ?? this.generateMnemonic()
    const signer = await this.keypairFromMnemonic(seedPhrase)
    
    // Get private key bytes
    const privateKeyBytes = 'privateKey' in signer && signer.privateKey instanceof Uint8Array
      ? signer.privateKey
      : 'secretKey' in signer && signer.secretKey instanceof Uint8Array
      ? signer.secretKey
      : new Uint8Array(64)
    
    const walletData: WalletData = {
      metadata: {
        name,
        address: signer.address.toString(),
        network,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        isActive: Object.keys(registry.wallets).length === 0 // First wallet is active by default
      },
      keypair: Array.from(privateKeyBytes)
    }
    
    // Save wallet file
    const walletPath = join(this.walletsDir, `${name}.json`)
    writeFileSync(walletPath, JSON.stringify(walletData, null, 2))
    
    // Update registry
    registry.wallets[name] = walletData.metadata
    if (walletData.metadata.isActive) {
      registry.activeWallet = name
    }
    this.saveRegistry(registry)
    
    return { wallet: walletData, mnemonic: seedPhrase }
  }
  
  /**
   * Import wallet from private key or mnemonic
   */
  async importWallet(
    name: string,
    secretKeyOrMnemonic: string | Uint8Array,
    network: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet'
  ): Promise<WalletData> {
    const registry = this.getRegistry()
    
    if (name in registry.wallets) {
      throw new Error(`Wallet with name "${name}" already exists`)
    }
    
    let signer: KeyPairSigner
    let privateKeyBytes: Uint8Array
    
    if (typeof secretKeyOrMnemonic === 'string') {
      // Check if it's a mnemonic
      if (bip39.validateMnemonic(secretKeyOrMnemonic)) {
        signer = await this.keypairFromMnemonic(secretKeyOrMnemonic)
        // For mnemonic-derived keys, we need to extract the private key differently
        const privateKey = 'privateKey' in signer && signer.privateKey instanceof Uint8Array
          ? signer.privateKey
          : 'secretKey' in signer && signer.secretKey instanceof Uint8Array
          ? signer.secretKey
          : null
        
        if (!privateKey) {
          throw new Error('Failed to extract private key from mnemonic-derived signer')
        }
        privateKeyBytes = privateKey
      } else {
        // Try to parse as JSON array or base58
        try {
          const bytes = JSON.parse(secretKeyOrMnemonic) as number[]
          privateKeyBytes = new Uint8Array(bytes)
          signer = await createKeyPairSignerFromBytes(privateKeyBytes)
        } catch {
          throw new Error('Invalid private key or mnemonic format')
        }
      }
    } else {
      // Use the raw bytes directly - this is the most reliable approach
      privateKeyBytes = secretKeyOrMnemonic
      signer = await createKeyPairSignerFromBytes(secretKeyOrMnemonic)
    }
    
    const walletData: WalletData = {
      metadata: {
        name,
        address: signer.address.toString(),
        network,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        isActive: Object.keys(registry.wallets).length === 0
      },
      keypair: Array.from(privateKeyBytes)
    }
    
    // Save wallet
    const walletPath = join(this.walletsDir, `${name}.json`)
    writeFileSync(walletPath, JSON.stringify(walletData, null, 2))
    
    // Update registry
    registry.wallets[name] = walletData.metadata
    if (walletData.metadata.isActive) {
      registry.activeWallet = name
    }
    this.saveRegistry(registry)
    
    return walletData
  }
  
  /**
   * List all wallets
   */
  listWallets(): WalletMetadata[] {
    const registry = this.getRegistry()
    return Object.values(registry.wallets).sort((a, b) => b.lastUsed - a.lastUsed)
  }
  
  /**
   * Get active wallet
   */
  getActiveWallet(): WalletData | null {
    const registry = this.getRegistry()
    if (!registry.activeWallet) {
      return null
    }
    
    return this.getWallet(registry.activeWallet)
  }
  
  /**
   * Get wallet by name
   */
  getWallet(name: string): WalletData | null {
    const registry = this.getRegistry()
    if (!(name in registry.wallets)) {
      return null
    }
    
    const walletPath = join(this.walletsDir, `${name}.json`)
    if (!existsSync(walletPath)) {
      return null
    }
    
    try {
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8')) as WalletData
      // Update last used
      walletData.metadata.lastUsed = Date.now()
      registry.wallets[name].lastUsed = Date.now()
      this.saveRegistry(registry)
      
      return walletData
    } catch {
      return null
    }
  }
  
  /**
   * Set active wallet
   */
  setActiveWallet(name: string): void {
    const registry = this.getRegistry()
    if (!(name in registry.wallets)) {
      throw new Error(`Wallet "${name}" not found`)
    }
    
    // Update active status
    Object.keys(registry.wallets).forEach(walletName => {
      registry.wallets[walletName].isActive = walletName === name
    })
    
    registry.activeWallet = name
    this.saveRegistry(registry)
  }
  
  /**
   * Rename wallet
   */
  renameWallet(oldName: string, newName: string): void {
    const registry = this.getRegistry()
    
    if (!(oldName in registry.wallets)) {
      throw new Error(`Wallet "${oldName}" not found`)
    }
    
    if (newName in registry.wallets) {
      throw new Error(`Wallet "${newName}" already exists`)
    }
    
    // Rename file
    const oldPath = join(this.walletsDir, `${oldName}.json`)
    const newPath = join(this.walletsDir, `${newName}.json`)
    
    if (existsSync(oldPath)) {
      const walletData = JSON.parse(readFileSync(oldPath, 'utf-8')) as WalletData
      walletData.metadata.name = newName
      writeFileSync(newPath, JSON.stringify(walletData, null, 2))
      
      // Remove old file
      unlinkSync(oldPath)
    }
    
    // Update registry
    const metadata = registry.wallets[oldName]
    metadata.name = newName
    registry.wallets[newName] = metadata
    delete registry.wallets[oldName]
    
    if (registry.activeWallet === oldName) {
      registry.activeWallet = newName
    }
    
    this.saveRegistry(registry)
  }
  
  /**
   * Delete wallet
   */
  deleteWallet(name: string): void {
    const registry = this.getRegistry()
    
    if (!(name in registry.wallets)) {
      throw new Error(`Wallet "${name}" not found`)
    }
    
    // Don't delete active wallet if there are others
    if (registry.activeWallet === name && Object.keys(registry.wallets).length > 1) {
      throw new Error('Cannot delete active wallet. Switch to another wallet first.')
    }
    
    // Delete file
    const walletPath = join(this.walletsDir, `${name}.json`)
    if (existsSync(walletPath)) {
      unlinkSync(walletPath)
    }
    
    // Update registry
    delete registry.wallets[name]
    
    if (registry.activeWallet === name) {
      // Set another wallet as active if available
      const remainingWallets = Object.keys(registry.wallets)
      registry.activeWallet = remainingWallets.length > 0 ? remainingWallets[0] : null
      if (registry.activeWallet) {
        registry.wallets[registry.activeWallet].isActive = true
      }
    }
    
    this.saveRegistry(registry)
  }
  
  /**
   * Get wallet balance
   */
  async getBalance(walletAddress: string, network: string): Promise<number> {
    try {
      const rpcUrl = network === 'devnet' 
        ? 'https://api.devnet.solana.com'
        : network === 'testnet'
        ? 'https://api.testnet.solana.com'
        : 'https://api.mainnet-beta.solana.com'
      
      const rpc = createSolanaRpc(rpcUrl)
      const { value: balance } = await rpc.getBalance(address(walletAddress)).send()
      return Number(balance) / 1_000_000_000 // Convert lamports to SOL
    } catch {
      return 0
    }
  }
  
  /**
   * Get signer for a wallet
   */
  async getSigner(name: string): Promise<KeyPairSigner | null> {
    const wallet = this.getWallet(name)
    if (!wallet) {
      return null
    }
    
    return createKeyPairSignerFromBytes(new Uint8Array(wallet.keypair))
  }
  
  /**
   * Get active signer
   */
  async getActiveSigner(): Promise<KeyPairSigner | null> {
    const wallet = this.getActiveWallet()
    if (!wallet) {
      return null
    }
    
    return createKeyPairSignerFromBytes(new Uint8Array(wallet.keypair))
  }
  
  /**
   * Interface-compatible method: Create wallet with return type for IWalletService
   */
  async createWalletInterface(name: string, network: string): Promise<{ wallet: WalletInfo; mnemonic: string }> {
    const mnemonic = bip39.generateMnemonic()
    const { wallet: walletData } = await this.createWallet(name, network as 'devnet' | 'testnet' | 'mainnet-beta', mnemonic)
    
    const walletInfo: WalletInfo = {
      address: address(walletData.metadata.address),
      name: walletData.metadata.name,
      network: walletData.metadata.network,
      metadata: {
        createdAt: walletData.metadata.createdAt,
        lastUsed: walletData.metadata.lastUsed,
        isActive: walletData.metadata.isActive
      }
    }
    
    return { wallet: walletInfo, mnemonic }
  }

  /**
   * Interface-compatible method: Import wallet from mnemonic
   */
  async importWalletInterface(name: string, mnemonic: string, network: string): Promise<WalletInfo> {
    const walletData = await this.importWallet(name, mnemonic, network as 'devnet' | 'testnet' | 'mainnet-beta')
    
    return {
      address: address(walletData.metadata.address),
      name: walletData.metadata.name,
      network: walletData.metadata.network,
      metadata: {
        createdAt: walletData.metadata.createdAt,
        lastUsed: walletData.metadata.lastUsed,
        isActive: walletData.metadata.isActive
      }
    }
  }

  /**
   * Interface-compatible method: List wallets as WalletInfo[]
   */
  async listWalletsInterface(): Promise<WalletInfo[]> {
    const wallets = this.listWallets()
    return wallets.map(wallet => ({
      address: address(wallet.address),
      name: wallet.name,
      network: wallet.network,
      metadata: {
        createdAt: wallet.createdAt,
        lastUsed: wallet.lastUsed,
        isActive: wallet.isActive
      }
    }))
  }

  /**
   * Interface-compatible method: Get active wallet as WalletInfo
   */
  getActiveWalletInterface(): WalletInfo | null {
    const wallet = this.getActiveWallet()
    if (!wallet) return null
    
    return {
      address: address(wallet.metadata.address),
      name: wallet.metadata.name,
      network: wallet.metadata.network,
      metadata: {
        createdAt: wallet.metadata.createdAt,
        lastUsed: wallet.metadata.lastUsed,
        isActive: wallet.metadata.isActive
      }
    }
  }

  /**
   * Interface-compatible method: Set active wallet
   */
  async setActiveWalletInterface(name: string): Promise<void> {
    this.setActiveWallet(name)
  }

  /**
   * Interface-compatible method: Get balance for address
   */
  async getBalanceInterface(walletAddress: Address): Promise<bigint> {
    const balance = await this.getBalance(walletAddress.toString(), 'devnet')
    return BigInt(Math.floor(balance * 1_000_000_000)) // Convert SOL to lamports
  }

  /**
   * Interface-compatible method: Sign transaction
   */
  async signTransaction(signer: KeyPairSigner, transaction: unknown): Promise<string> {
    try {
      // Import necessary types and functions
      const { signTransaction: signTransactionKit } = await import('@solana/kit')
      
      // Use the transaction directly - types will be checked at import time
      const tx = transaction
      
      // Sign the transaction using @solana/kit
      const signedTransaction = await signTransactionKit([signer], tx)
      
      // Extract the signature from the signed transaction
      // The first signature is from our signer
      if (signedTransaction.signatures && signedTransaction.signatures.length > 0) {
        const signature = signedTransaction.signatures[0]
        console.log(`✅ Transaction signed by ${signer.address.toString()}`)
        return signature.toString()
      } else {
        throw new Error('No signature found in signed transaction')
      }
    } catch (error) {
      console.error('Failed to sign transaction:', error)
      throw new Error(`Transaction signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Migrate old wallet.json to new system
   */
  async migrateOldWallet(): Promise<void> {
    const oldWalletPath = join(homedir(), '.ghostspeak', 'wallet.json')
    if (!existsSync(oldWalletPath)) {
      return
    }
    
    try {
      const oldWalletData = JSON.parse(readFileSync(oldWalletPath, 'utf-8')) as number[]
      
      // Import as "main" wallet
      await this.importWallet('main', new Uint8Array(oldWalletData), 'devnet')
      
      // Optionally rename the old file
      renameSync(oldWalletPath, oldWalletPath + '.backup')
      
    } catch (error) {
      console.warn('Failed to migrate old wallet:', error)
    }
  }
}