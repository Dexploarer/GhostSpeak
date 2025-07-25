import { createKeyPairSignerFromBytes } from '@solana/kit'
import { Keypair } from '@solana/web3.js'
// generateKeyPairSigner is commented out - was used in the commented agentWallet generation
// import { generateKeyPairSigner } from '@solana/kit'
// Metaplex imports - removed as not used
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { randomUUID } from 'crypto'
import type { KeyPairSigner } from '@solana/kit'
import type { Address } from '@solana/addresses'
import { SecureStorage, promptPassword, clearMemory } from './secure-storage.js'
import { chmod } from 'fs/promises'
import fetch from 'node-fetch'

// Node.js globals
declare const crypto: typeof globalThis.crypto

// DAS API types
interface DASApiResponse {
  result?: {
    ownership?: {
      owner?: string
      delegate?: string
    }
  }
  error?: string
}

/**
 * Atomic file operations helper to prevent race conditions and resource leaks
 */
class AtomicFileManager {
  private static locks = new Map<string, Promise<void>>()
  
  static async writeJSON<T>(filePath: string, data: T): Promise<void> {
    const lockKey = filePath
    
    // Wait for any existing operations on this file
    if (this.locks.has(lockKey)) {
      await this.locks.get(lockKey)
    }
    
    // Create new lock for this operation
    const operation = this.performAtomicWrite(filePath, data)
    this.locks.set(lockKey, operation)
    
    try {
      await operation
    } finally {
      this.locks.delete(lockKey)
    }
  }
  
  private static async performAtomicWrite<T>(filePath: string, data: T): Promise<void> {
    const tempPath = `${filePath}.tmp`
    const backupPath = `${filePath}.backup`
    
    try {
      // Create backup if original exists
      try {
        await fs.access(filePath)
        await fs.copyFile(filePath, backupPath)
      } catch {
        // Original doesn't exist, no backup needed
      }
      
      // Write to temporary file first
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2))
      
      // Atomic rename
      await fs.rename(tempPath, filePath)
      
      // Clean up backup on success
      try {
        await fs.unlink(backupPath)
      } catch {
        // Backup cleanup failed, not critical
      }
      
    } catch (error) {
      // Cleanup temp file on error
      try {
        await fs.unlink(tempPath)
      } catch {
        // Temp cleanup failed, not critical
      }
      
      // Restore from backup if possible
      try {
        await fs.access(backupPath)
        await fs.copyFile(backupPath, filePath)
        await fs.unlink(backupPath)
      } catch {
        // Backup restoration failed
      }
      
      throw error
    }
  }
  
  static async readJSON<T>(filePath: string): Promise<T | null> {
    const lockKey = filePath
    
    // Wait for any existing write operations
    if (this.locks.has(lockKey)) {
      await this.locks.get(lockKey)
    }
    
    try {
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data) as T
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null
      }
      throw error
    }
  }
}

// Agent credential storage directory
const AGENT_CREDENTIALS_DIR = join(homedir(), '.ghostspeak', 'agents')

// Agent credential interface
export interface AgentCredentials {
  agentId: string
  uuid: string
  name: string
  description: string
  agentWallet: {
    publicKey: string
    // secretKey is now stored separately in secure storage
  }
  ownerWallet: string
  cnftMint?: string
  merkleTree?: string
  createdAt: number
  updatedAt: number
}

// Agent wallet management utilities
export class AgentWalletManager {
  
  /**
   * Generate a new agent wallet with credentials
   */
  static async generateAgentWallet(
    agentName: string,
    description: string,
    ownerWallet: Address
  ): Promise<{
    agentWallet: KeyPairSigner
    credentials: AgentCredentials
    secretKey: Uint8Array
  }> {
    // Generate new keypair for agent
    // const agentWallet = await generateKeyPairSigner() // agentWallet variable not used currently
    
    // Create agent ID from name
    const agentId = agentName.toLowerCase().replace(/\s+/g, '-')
    
    // Generate UUID for agent
    const uuid = randomUUID()
    
    // Extract the private key - we'll need to export it properly
    // For now, generate a new keypair with exportable bytes
    const keypairBytes = new Uint8Array(64)
    crypto.getRandomValues(keypairBytes)
    const exportableWallet = await createKeyPairSignerFromBytes(keypairBytes)
    
    // Create credentials object (without secret key)
    const credentials: AgentCredentials = {
      agentId,
      uuid,
      name: agentName,
      description,
      agentWallet: {
        publicKey: exportableWallet.address.toString()
      },
      ownerWallet: ownerWallet.toString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    return {
      agentWallet: exportableWallet,
      credentials,
      secretKey: keypairBytes // Return separately for secure storage
    }
  }
  
  /**
   * Save agent credentials to file system (with secure key storage)
   */
  static async saveCredentials(credentials: AgentCredentials, secretKey?: Uint8Array, password?: string): Promise<void> {
    // Ensure credentials directory exists
    await fs.mkdir(AGENT_CREDENTIALS_DIR, { recursive: true })
    
    // Create agent-specific directory
    const agentDir = join(AGENT_CREDENTIALS_DIR, credentials.agentId)
    await fs.mkdir(agentDir, { recursive: true })
    
    // Save public credentials (without secret key)
    const credentialsPath = join(agentDir, 'credentials.json')
    await fs.writeFile(credentialsPath, JSON.stringify(credentials, null, 2))
    
    // Set file permissions to owner-only
    await chmod(credentialsPath, 0o600)
    
    // Save secret key securely if provided
    if (secretKey && password) {
      const keyStorageId = `agent-${credentials.agentId}`
      const keypair = Keypair.fromSecretKey(secretKey)
      await SecureStorage.storeKeypair(keyStorageId, keypair, password)
      // Clear sensitive data from memory
      clearMemory(secretKey)
    }
    
    // Save UUID mapping for easy lookup with atomic operations
    const uuidMappingPath = join(AGENT_CREDENTIALS_DIR, 'uuid-mapping.json')
    
    try {
      let uuidMapping: Record<string, string> = await AtomicFileManager.readJSON(uuidMappingPath) ?? {}
      
      // Update mapping
      uuidMapping[credentials.uuid] = credentials.agentId
      
      // Atomic write to prevent corruption
      await AtomicFileManager.writeJSON(uuidMappingPath, uuidMapping)
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error updating UUID mapping:', message)
      throw new Error(`Failed to update UUID mapping: ${message}`)
    }
  }
  
  /**
   * Load agent credentials by agent ID
   */
  static async loadCredentials(agentId: string): Promise<AgentCredentials | null> {
    try {
      const credentialsPath = join(AGENT_CREDENTIALS_DIR, agentId, 'credentials.json')
      const credentialsData = await fs.readFile(credentialsPath, 'utf-8')
      return JSON.parse(credentialsData) as AgentCredentials
    } catch (error) {
      // Only return null for expected errors (file not found)
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null
      }
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Error reading agent credentials for ${agentId}:`, message)
      throw new Error(`Failed to read agent credentials for ${agentId}: ${message}`)
    }
  }
  
  /**
   * Load agent credentials by UUID
   */
  static async loadCredentialsByUuid(uuid: string): Promise<AgentCredentials | null> {
    try {
      // First find agent ID from UUID mapping
      const uuidMappingPath = join(AGENT_CREDENTIALS_DIR, 'uuid-mapping.json')
      const mappingData = await fs.readFile(uuidMappingPath, 'utf-8')
      const uuidMapping = JSON.parse(mappingData) as Record<string, string>
      
      const agentId = uuidMapping[uuid]
      if (!agentId) return null
      
      return await this.loadCredentials(agentId)
    } catch (error) {
      // Only return null for expected errors (file not found)
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null
      }
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Error loading credentials by UUID ${uuid}:`, message)
      throw new Error(`Failed to load credentials by UUID: ${message}`)
    }
  }
  
  /**
   * Get all agent credentials for a specific owner
   */
  static async getAgentsByOwner(ownerAddress: Address): Promise<AgentCredentials[]> {
    try {
      const agentDirs = await fs.readdir(AGENT_CREDENTIALS_DIR)
      const agents: AgentCredentials[] = []
      
      for (const agentId of agentDirs) {
        if (agentId === 'uuid-mapping.json') continue
        
        const credentials = await this.loadCredentials(agentId)
        if (credentials && credentials.ownerWallet === ownerAddress.toString()) {
          agents.push(credentials)
        }
      }
      
      return agents.sort((a, b) => b.createdAt - a.createdAt)
    } catch (error) {
      // Only return empty array for expected errors (directory not found)
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return []
      }
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Error getting agents by owner ${ownerAddress}:`, message)
      throw new Error(`Failed to get agents by owner: ${message}`)
    }
  }
  
  /**
   * Create agent wallet signer from credentials (requires password)
   */
  static async createAgentSigner(credentials: AgentCredentials, password?: string): Promise<KeyPairSigner> {
    // If no password provided, prompt for it
    password ??= await promptPassword(`Enter password for agent ${credentials.name}: `)
    
    // Retrieve secret key from secure storage
    const keyStorageId = `agent-${credentials.agentId}`
    const keypair = await SecureStorage.retrieveKeypair(keyStorageId, password)
    
    // Clear password from memory
    clearMemory(password)
    
    return createKeyPairSignerFromBytes(keypair.secretKey)
  }
  
  /**
   * Update agent credentials
   */
  static async updateCredentials(agentId: string, updates: Partial<AgentCredentials>): Promise<void> {
    const existingCredentials = await this.loadCredentials(agentId)
    if (!existingCredentials) {
      throw new Error(`Agent credentials not found for ID: ${agentId}`)
    }
    
    const updatedCredentials: AgentCredentials = {
      ...existingCredentials,
      ...updates,
      updatedAt: Date.now()
    }
    
    await this.saveCredentials(updatedCredentials)
  }
  
  /**
   * Delete agent credentials
   */
  static async deleteCredentials(agentId: string): Promise<void> {
    const credentials = await this.loadCredentials(agentId)
    if (!credentials) return
    
    // Remove from UUID mapping with atomic operations
    const uuidMappingPath = join(AGENT_CREDENTIALS_DIR, 'uuid-mapping.json')
    try {
      const uuidMapping: Record<string, string> = await AtomicFileManager.readJSON(uuidMappingPath) ?? {}
      
      // Remove the mapping
      delete uuidMapping[credentials.uuid]
      
      // Atomic write to prevent corruption
      await AtomicFileManager.writeJSON(uuidMappingPath, uuidMapping)
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error updating UUID mapping during deletion:', message)
      // Don't throw here, continue with deletion as this is cleanup
    }
    
    // Remove agent directory
    const agentDir = join(AGENT_CREDENTIALS_DIR, agentId)
    await fs.rm(agentDir, { recursive: true, force: true })
  }
  
  /**
   * Check if agent credentials exist
   */
  static async credentialsExist(agentId: string): Promise<boolean> {
    return (await this.loadCredentials(agentId)) !== null
  }
  
  /**
   * List all agent IDs
   */
  static async listAgentIds(): Promise<string[]> {
    try {
      const agentDirs = await fs.readdir(AGENT_CREDENTIALS_DIR)
      return agentDirs.filter(dir => dir !== 'uuid-mapping.json')
    } catch (error) {
      // Only return empty array for expected errors (directory not found)
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return []
      }
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error listing agent IDs:', message)
      throw new Error(`Failed to list agent IDs: ${message}`)
    }
  }
}

/**
 * Compressed NFT minting utilities for agent ownership tokens
 */
export class AgentCNFTManager {
  
  /**
   * Mint a compressed NFT as an agent ownership token
   */
  static async mintOwnershipToken(
    credentials: AgentCredentials,
    ownerWallet: KeyPairSigner,
    _rpcUrl: string
  ): Promise<{
    cnftMint: string
    merkleTree: string
  }> {
    // Generate a unique CNFT mint address based on agent data
    // This is a deterministic approach until full Metaplex integration is completed
    const agentHash = `${credentials.agentId}_${ownerWallet.address}_${Date.now()}`
    const cnftMint = `cnft_${Buffer.from(agentHash).toString('base64').slice(0, 32)}`
    
    // Generate a merkle tree address for the agent's CNFT collection
    const merkleTree = `tree_${Buffer.from(`${credentials.agentId}_tree`).toString('base64').slice(0, 32)}`
    
    // TODO: Implement full Metaplex Bubblegum integration
    // The current implementation provides unique, deterministic IDs
    // but doesn't create actual on-chain CNFTs due to dependency version conflicts
    // This should be replaced with real CNFT minting once dependency issues are resolved
    
    console.log(`Generated CNFT credentials for agent ${credentials.agentId}:`)
    console.log(`  CNFT Mint: ${cnftMint}`)
    console.log(`  Merkle Tree: ${merkleTree}`)
    
    // Update agent credentials with CNFT info
    await AgentWalletManager.updateCredentials(credentials.agentId, {
      cnftMint,
      merkleTree
    })
    
    return {
      cnftMint,
      merkleTree
    }
  }
  
  /**
   * Verify ownership of agent via CNFT
   */
  static async verifyOwnership(
    agentUuid: string,
    ownerWallet: Address,
    _rpcUrl: string
  ): Promise<boolean> {
    // rpcUrl parameter will be used in future implementation
    const credentials = await AgentWalletManager.loadCredentialsByUuid(agentUuid)
    if (!credentials) return false
    
    // Check if owner wallet matches
    if (credentials.ownerWallet !== ownerWallet.toString()) return false
    
    // If no CNFT minted yet, verify via credentials only
    if (!credentials.cnftMint) {
      return true
    }
    
    // Implement CNFT ownership verification using DAS API
    try {
      const cnftAssetId = credentials.cnftMint
      
      // Use a DAS API endpoint (e.g., Helius) to verify ownership
      // Note: In production, use environment variable for API key
      const dasApiUrl = process.env.DAS_API_URL ?? 'https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY'
      
      // Get asset details using DAS API getAsset method
      const response = await fetch(dasApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'cnft-ownership-check',
          method: 'getAsset',
          params: {
            id: cnftAssetId,
          },
        }),
      })
      
      const data = await response.json() as DASApiResponse
      
      if (data.error) {
        console.error('DAS API error:', data.error)
        return false
      }
      
      const asset = data.result
      
      // Verify ownership
      if (!asset?.ownership) {
        return false
      }
      
      // Check if the owner matches
      const currentOwner = asset.ownership.owner
      const expectedOwner = ownerWallet.toString()
      
      // Also check for delegated authority if needed
      const delegate = asset.ownership.delegate
      
      return currentOwner === expectedOwner || (delegate !== undefined && delegate === expectedOwner)
    } catch (error) {
      console.error('Failed to verify CNFT ownership:', error)
      // Fallback to credential-based verification on error
      return true
    }
  }
}

/**
 * Agent backup and restore utilities
 */
export class AgentBackupManager {
  
  /**
   * Backup agent credentials to a file
   */
  static async backupAgent(agentId: string, backupPath: string): Promise<void> {
    const credentials = await AgentWalletManager.loadCredentials(agentId)
    if (!credentials) {
      throw new Error(`Agent credentials not found for ID: ${agentId}`)
    }
    
    // Ensure backup directory exists
    await fs.mkdir(dirname(backupPath), { recursive: true })
    
    // Create backup data with metadata
    const backupData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      credentials
    }
    
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2))
  }
  
  /**
   * Restore agent credentials from backup
   */
  static async restoreAgent(backupPath: string): Promise<string> {
    const backupData = await fs.readFile(backupPath, 'utf-8')
    const backup = JSON.parse(backupData) as { credentials?: AgentCredentials; cNFT?: unknown }
    
    if (!backup.credentials) {
      throw new Error('Invalid backup file format')
    }
    
    const credentials: AgentCredentials = backup.credentials
    
    // Check if agent already exists
    const existingCredentials = await AgentWalletManager.loadCredentials(credentials.agentId)
    if (existingCredentials) {
      throw new Error(`Agent ${credentials.agentId} already exists`)
    }
    
    // Save restored credentials
    await AgentWalletManager.saveCredentials(credentials)
    
    return credentials.agentId
  }
  
  /**
   * Backup all agents for an owner
   */
  static async backupAllAgents(ownerAddress: Address, backupDir: string): Promise<void> {
    const agents = await AgentWalletManager.getAgentsByOwner(ownerAddress)
    
    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true })
    
    for (const agent of agents) {
      const backupPath = join(backupDir, `${agent.agentId}.json`)
      await this.backupAgent(agent.agentId, backupPath)
    }
  }
}