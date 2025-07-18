import { generateKeyPairSigner, createKeyPairSignerFromBytes } from '@solana/kit'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity } from '@metaplex-foundation/umi'
import { createTree } from '@metaplex-foundation/mpl-bubblegum'
import { generateSigner } from '@metaplex-foundation/umi'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { randomUUID } from 'crypto'
import type { KeyPairSigner } from '@solana/kit'
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'

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
      return JSON.parse(data)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
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
    secretKey: number[]
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
  }> {
    // Generate new keypair for agent
    const agentWallet = await generateKeyPairSigner()
    
    // Create agent ID from name
    const agentId = agentName.toLowerCase().replace(/\s+/g, '-')
    
    // Generate UUID for agent
    const uuid = randomUUID()
    
    // Create credentials object
    const credentials: AgentCredentials = {
      agentId,
      uuid,
      name: agentName,
      description,
      agentWallet: {
        publicKey: agentWallet.address.toString(),
        secretKey: Array.from(agentWallet.keyPair.privateKey)
      },
      ownerWallet: ownerWallet.toString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    return {
      agentWallet,
      credentials
    }
  }
  
  /**
   * Save agent credentials to file system
   */
  static async saveCredentials(credentials: AgentCredentials): Promise<void> {
    // Ensure credentials directory exists
    await fs.mkdir(AGENT_CREDENTIALS_DIR, { recursive: true })
    
    // Create agent-specific directory
    const agentDir = join(AGENT_CREDENTIALS_DIR, credentials.agentId)
    await fs.mkdir(agentDir, { recursive: true })
    
    // Save credentials
    const credentialsPath = join(agentDir, 'credentials.json')
    await fs.writeFile(credentialsPath, JSON.stringify(credentials, null, 2))
    
    // Save UUID mapping for easy lookup with atomic operations
    const uuidMappingPath = join(AGENT_CREDENTIALS_DIR, 'uuid-mapping.json')
    
    try {
      let uuidMapping: Record<string, string> = await AtomicFileManager.readJSON(uuidMappingPath) || {}
      
      // Update mapping
      uuidMapping[credentials.uuid] = credentials.agentId
      
      // Atomic write to prevent corruption
      await AtomicFileManager.writeJSON(uuidMappingPath, uuidMapping)
      
    } catch (error: any) {
      console.error('Error updating UUID mapping:', error.message)
      throw new Error(`Failed to update UUID mapping: ${error.message}`)
    }
  }
  
  /**
   * Load agent credentials by agent ID
   */
  static async loadCredentials(agentId: string): Promise<AgentCredentials | null> {
    try {
      const credentialsPath = join(AGENT_CREDENTIALS_DIR, agentId, 'credentials.json')
      const credentialsData = await fs.readFile(credentialsPath, 'utf-8')
      return JSON.parse(credentialsData)
    } catch (error: any) {
      // Only return null for expected errors (file not found)
      if (error.code === 'ENOENT') {
        return null
      }
      console.error(`Error reading agent credentials for ${agentId}:`, error.message)
      throw new Error(`Failed to read agent credentials for ${agentId}: ${error.message}`)
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
      const uuidMapping = JSON.parse(mappingData)
      
      const agentId = uuidMapping[uuid]
      if (!agentId) return null
      
      return await this.loadCredentials(agentId)
    } catch (error: any) {
      // Only return null for expected errors (file not found)
      if (error.code === 'ENOENT') {
        return null
      }
      console.error(`Error loading credentials by UUID ${uuid}:`, error.message)
      throw new Error(`Failed to load credentials by UUID: ${error.message}`)
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
    } catch (error: any) {
      // Only return empty array for expected errors (directory not found)
      if (error.code === 'ENOENT') {
        return []
      }
      console.error(`Error getting agents by owner ${ownerAddress}:`, error.message)
      throw new Error(`Failed to get agents by owner: ${error.message}`)
    }
  }
  
  /**
   * Create agent wallet signer from credentials
   */
  static async createAgentSigner(credentials: AgentCredentials): Promise<KeyPairSigner> {
    const secretKey = new Uint8Array(credentials.agentWallet.secretKey)
    return createKeyPairSignerFromBytes(secretKey)
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
      const uuidMapping: Record<string, string> = await AtomicFileManager.readJSON(uuidMappingPath) || {}
      
      // Remove the mapping
      delete uuidMapping[credentials.uuid]
      
      // Atomic write to prevent corruption
      await AtomicFileManager.writeJSON(uuidMappingPath, uuidMapping)
      
    } catch (error: any) {
      console.error('Error updating UUID mapping during deletion:', error.message)
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
    } catch (error: any) {
      // Only return empty array for expected errors (directory not found)
      if (error.code === 'ENOENT') {
        return []
      }
      console.error('Error listing agent IDs:', error.message)
      throw new Error(`Failed to list agent IDs: ${error.message}`)
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
    rpcUrl: string
  ): Promise<{
    cnftMint: string
    merkleTree: string
  }> {
    // Initialize Umi with connection
    const umi = createUmi(rpcUrl)
    
    // Create proper keypair identity from the signer
    // The ownerWallet is a KeyPairSigner which has the private key internally
    // We need to extract the bytes properly for Umi
    const walletBytes = await ownerWallet.keyPair
    const secretKey = new Uint8Array(64)
    // Ed25519 keypairs are 64 bytes: 32 bytes private key + 32 bytes public key
    if ('privateKey' in walletBytes && walletBytes.privateKey instanceof Uint8Array) {
      secretKey.set(walletBytes.privateKey, 0)
      secretKey.set(walletBytes.publicKey, 32)
    } else {
      throw new Error('Unable to extract private key from wallet signer')
    }
    
    umi.use(keypairIdentity({
      publicKey: ownerWallet.address,
      secretKey: secretKey
    }))
    
    // Create a new merkle tree for the CNFT
    const merkleTreeSigner = generateSigner(umi)
    
    // Create the merkle tree
    await createTree(umi, {
      merkleTree: merkleTreeSigner,
      maxDepth: 14, // Supports up to 16,384 NFTs
      maxBufferSize: 64,
      canopyDepth: 10
    })
    
    // For now, return mock data - this would be implemented with actual CNFT minting
    const cnftMint = 'mockCNFTMint123'
    const merkleTree = merkleTreeSigner.publicKey.toString()
    
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
    rpcUrl: string
  ): Promise<boolean> {
    const credentials = await AgentWalletManager.loadCredentialsByUuid(agentUuid)
    if (!credentials) return false
    
    // Check if owner wallet matches
    if (credentials.ownerWallet !== ownerWallet.toString()) return false
    
    // If no CNFT minted yet, verify via credentials only
    if (!credentials.cnftMint) {
      return true
    }
    
    // TODO: Implement actual CNFT ownership verification
    // This would check if the owner wallet holds the CNFT
    return true
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
    const backup = JSON.parse(backupData)
    
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