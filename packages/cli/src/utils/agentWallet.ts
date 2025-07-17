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
    
    // Save UUID mapping for easy lookup
    const uuidMappingPath = join(AGENT_CREDENTIALS_DIR, 'uuid-mapping.json')
    let uuidMapping: Record<string, string> = {}
    
    try {
      const existingMapping = await fs.readFile(uuidMappingPath, 'utf-8')
      uuidMapping = JSON.parse(existingMapping)
    } catch (error) {
      // File doesn't exist, start with empty mapping
    }
    
    uuidMapping[credentials.uuid] = credentials.agentId
    await fs.writeFile(uuidMappingPath, JSON.stringify(uuidMapping, null, 2))
  }
  
  /**
   * Load agent credentials by agent ID
   */
  static async loadCredentials(agentId: string): Promise<AgentCredentials | null> {
    try {
      const credentialsPath = join(AGENT_CREDENTIALS_DIR, agentId, 'credentials.json')
      const credentialsData = await fs.readFile(credentialsPath, 'utf-8')
      return JSON.parse(credentialsData)
    } catch (error) {
      return null
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
    } catch (error) {
      return null
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
      return []
    }
  }
  
  /**
   * Create agent wallet signer from credentials
   */
  static async createAgentSigner(credentials: AgentCredentials): Promise<KeyPairSigner> {
    const secretKey = new Uint8Array(credentials.agentWallet.secretKey)
    return await createKeyPairSignerFromBytes(secretKey)
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
    
    // Remove from UUID mapping
    const uuidMappingPath = join(AGENT_CREDENTIALS_DIR, 'uuid-mapping.json')
    try {
      const mappingData = await fs.readFile(uuidMappingPath, 'utf-8')
      const uuidMapping = JSON.parse(mappingData)
      delete uuidMapping[credentials.uuid]
      await fs.writeFile(uuidMappingPath, JSON.stringify(uuidMapping, null, 2))
    } catch (error) {
      // Ignore if mapping file doesn't exist
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
      return []
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
    umi.use(keypairIdentity({
      publicKey: ownerWallet.address,
      secretKey: new Uint8Array(64) // This would need the actual secret key
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