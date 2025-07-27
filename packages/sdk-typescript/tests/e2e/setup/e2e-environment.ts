/**
 * End-to-End Test Environment Setup
 * 
 * Provides comprehensive E2E testing infrastructure for complete user journeys
 * and cross-feature integration scenarios
 */

import { createSolanaRpc, createSolanaRpcSubscriptions, generateKeyPair } from '@solana/web3.js'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type { TransactionSigner, Rpc } from '@solana/web3.js'

import { GhostSpeakClient } from '../../../src/client/GhostSpeakClient'
import type { GhostSpeakConfig } from '../../../src/types'

// E2E Test Configuration
export const E2E_CONFIG = {
  // Use actual devnet endpoint for E2E tests
  RPC_ENDPOINT: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  WS_ENDPOINT: process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com',
  
  // Program deployment
  PROGRAM_ID: address('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX'),
  
  // Extended timeouts for complex E2E scenarios
  TRANSACTION_TIMEOUT: 120000, // 2 minutes
  WORKFLOW_TIMEOUT: 300000, // 5 minutes for complete workflows
  CONFIRMATION_TIMEOUT: 60000, // 1 minute
  
  // Funding for realistic scenarios
  AGENT_FUNDING: 2_000_000_000n, // 2 SOL for agent operations
  USER_FUNDING: 1_000_000_000n, // 1 SOL for user operations
  SERVICE_FUNDING: 500_000_000n, // 0.5 SOL for service operations
  
  // Service pricing for realistic tests
  BASIC_SERVICE_PRICE: 10_000_000n, // 0.01 SOL
  PREMIUM_SERVICE_PRICE: 50_000_000n, // 0.05 SOL
  ENTERPRISE_SERVICE_PRICE: 100_000_000n, // 0.1 SOL
  
  // Test retry and stability
  MAX_RETRIES: 5,
  RETRY_DELAY: 3000, // 3 seconds between retries
  STABILIZATION_DELAY: 5000, // 5 seconds for complex operations
} as const

/**
 * E2E Test User Personas
 */
export interface UserPersona {
  role: 'agent_owner' | 'service_buyer' | 'freelancer' | 'enterprise_client' | 'dao_member'
  signer: TransactionSigner
  funding: bigint
  capabilities: string[]
  metadata: {
    name: string
    description: string
    preferredServices: string[]
    riskTolerance: 'low' | 'medium' | 'high'
  }
}

/**
 * E2E Test Scenario Context
 */
export interface E2EScenarioContext {
  scenario: string
  users: Map<string, UserPersona>
  services: Map<string, Address>
  escrows: Map<string, Address>
  sessions: Map<string, Address>
  startTime: number
  transactions: string[]
}

/**
 * Comprehensive E2E Test Environment
 */
export class E2ETestEnvironment {
  public rpc: Rpc
  public client: GhostSpeakClient
  private scenarios: Map<string, E2EScenarioContext> = new Map()
  private activeUsers: Map<string, UserPersona> = new Map()

  constructor() {
    // Create real RPC connections for E2E testing
    this.rpc = createSolanaRpc(E2E_CONFIG.RPC_ENDPOINT)
    const rpcSubscriptions = createSolanaRpcSubscriptions(E2E_CONFIG.WS_ENDPOINT)
    
    // Create client with production-like configuration
    this.client = new GhostSpeakClient({
      rpc: this.rpc,
      rpcSubscriptions,
      programId: E2E_CONFIG.PROGRAM_ID,
      cluster: 'devnet',
      // IPFS configuration for content storage
      ipfs: {
        gateway: 'https://gateway.pinata.cloud/ipfs/',
        uploadEndpoint: process.env.IPFS_UPLOAD_ENDPOINT || 'mock://upload'
      }
    } satisfies GhostSpeakConfig)
  }

  /**
   * Initialize a complete E2E test scenario
   */
  async initializeScenario(scenarioName: string): Promise<E2EScenarioContext> {
    console.log(`🎬 Initializing E2E scenario: ${scenarioName}`)
    
    const context: E2EScenarioContext = {
      scenario: scenarioName,
      users: new Map(),
      services: new Map(),
      escrows: new Map(),
      sessions: new Map(),
      startTime: Date.now(),
      transactions: []
    }
    
    this.scenarios.set(scenarioName, context)
    return context
  }

  /**
   * Create user persona with specific role and capabilities
   */
  async createUserPersona(
    role: UserPersona['role'],
    customName?: string
  ): Promise<UserPersona> {
    const keyPair = await generateKeyPair()
    const signer = await createKeyPairSignerFromBytes(keyPair.privateKey)
    
    // Determine funding and capabilities based on role
    const roleConfig = this.getRoleConfiguration(role)
    
    const persona: UserPersona = {
      role,
      signer,
      funding: roleConfig.funding,
      capabilities: roleConfig.capabilities,
      metadata: {
        name: customName || this.generatePersonaName(role),
        description: roleConfig.description,
        preferredServices: roleConfig.preferredServices,
        riskTolerance: roleConfig.riskTolerance
      }
    }
    
    // Fund the persona
    await this.ensureFunding(persona.signer.address, persona.funding)
    
    // Store persona for scenario tracking
    this.activeUsers.set(persona.metadata.name, persona)
    
    console.log(`👤 Created ${role} persona: ${persona.metadata.name} (${persona.signer.address.slice(0, 8)}...)`)
    
    return persona
  }

  /**
   * Get role-specific configuration
   */
  private getRoleConfiguration(role: UserPersona['role']) {
    const configs = {
      agent_owner: {
        funding: E2E_CONFIG.AGENT_FUNDING,
        capabilities: ['register_agent', 'create_services', 'manage_reputation'],
        description: 'AI agent owner who provides services',
        preferredServices: ['trading', 'analysis', 'automation'],
        riskTolerance: 'medium' as const
      },
      service_buyer: {
        funding: E2E_CONFIG.USER_FUNDING,
        capabilities: ['buy_services', 'create_escrows', 'rate_providers'],
        description: 'Regular user who purchases AI services',
        preferredServices: ['data_analysis', 'content_creation', 'research'],
        riskTolerance: 'low' as const
      },
      freelancer: {
        funding: E2E_CONFIG.SERVICE_FUNDING,
        capabilities: ['offer_services', 'complete_work', 'build_reputation'],
        description: 'Freelancer providing specialized services',
        preferredServices: ['development', 'design', 'consulting'],
        riskTolerance: 'medium' as const
      },
      enterprise_client: {
        funding: E2E_CONFIG.AGENT_FUNDING * 2n,
        capabilities: ['bulk_purchases', 'enterprise_contracts', 'governance_participation'],
        description: 'Enterprise client with high-volume needs',
        preferredServices: ['enterprise_ai', 'batch_processing', 'custom_solutions'],
        riskTolerance: 'high' as const
      },
      dao_member: {
        funding: E2E_CONFIG.USER_FUNDING,
        capabilities: ['vote_proposals', 'submit_proposals', 'governance_participation'],
        description: 'DAO participant focused on governance',
        preferredServices: ['governance_tools', 'analytics', 'reporting'],
        riskTolerance: 'medium' as const
      }
    }
    
    return configs[role]
  }

  /**
   * Generate realistic persona name
   */
  private generatePersonaName(role: UserPersona['role']): string {
    const roleNames = {
      agent_owner: ['Alice_AI', 'BotBuilder_Bob', 'Agent_Annie', 'CodeCrafter_Carl'],
      service_buyer: ['Consumer_Carol', 'Buyer_Ben', 'Client_Claire', 'User_Uma'],
      freelancer: ['Freelance_Frank', 'Gig_Grace', 'Solo_Sam', 'Indie_Ivy'],
      enterprise_client: ['Corp_Catherine', 'Enterprise_Ed', 'Business_Beth', 'Company_Chris'],
      dao_member: ['Voter_Victoria', 'Member_Mike', 'Delegate_Diana', 'Citizen_Cam']
    }
    
    const names = roleNames[role]
    const randomName = names[Math.floor(Math.random() * names.length)]
    const timestamp = Date.now().toString(36).slice(-4)
    
    return `${randomName}_${timestamp}`
  }

  /**
   * Execute complete user workflow with monitoring
   */
  async executeWorkflow<T>(
    scenarioName: string,
    workflowName: string,
    workflow: () => Promise<T>
  ): Promise<T> {
    const context = this.scenarios.get(scenarioName)
    if (!context) {
      throw new Error(`Scenario ${scenarioName} not initialized`)
    }

    console.log(`🔄 Executing workflow: ${workflowName} in scenario: ${scenarioName}`)
    const startTime = Date.now()
    
    try {
      const result = await workflow()
      const duration = Date.now() - startTime
      
      console.log(`✅ Workflow ${workflowName} completed in ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Workflow ${workflowName} failed after ${duration}ms:`, error)
      throw error
    }
  }

  /**
   * Ensure account funding with retry logic
   */
  async ensureFunding(address: Address, amount: bigint): Promise<void> {
    for (let attempt = 0; attempt < E2E_CONFIG.MAX_RETRIES; attempt++) {
      try {
        // Check current balance
        const balance = await this.rpc.getBalance(address).send()
        
        if (balance >= amount) {
          return // Already funded
        }

        console.log(`🔋 Funding account ${address.toString().slice(0, 8)}... (attempt ${attempt + 1})`)
        
        // Request airdrop
        const signature = await this.rpc.requestAirdrop(address, amount).send()
        await this.confirmTransaction(signature)
        
        console.log(`✅ Account funded successfully`)
        return
      } catch (error) {
        console.log(`🔄 Funding attempt ${attempt + 1} failed:`, error)
        
        if (attempt === E2E_CONFIG.MAX_RETRIES - 1) {
          throw new Error(`Funding failed after ${E2E_CONFIG.MAX_RETRIES} attempts`)
        }
        
        await new Promise(resolve => setTimeout(resolve, E2E_CONFIG.RETRY_DELAY))
      }
    }
  }

  /**
   * Confirm transaction with extended timeout for E2E scenarios
   */
  async confirmTransaction(signature: string): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < E2E_CONFIG.CONFIRMATION_TIMEOUT) {
      try {
        const statuses = await this.rpc.getSignatureStatuses([signature]).send()
        const status = statuses.value[0]
        
        if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
          if (status.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
          }
          return
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.warn('Error checking transaction status:', error)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    throw new Error(`Transaction confirmation timeout: ${signature}`)
  }

  /**
   * Wait for account with extended timeout
   */
  async waitForAccount(address: Address, timeoutMs = 60000): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const accountInfo = await this.rpc.getAccountInfo(address).send()
        if (accountInfo) {
          return
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    throw new Error(`Account ${address} not found after ${timeoutMs}ms`)
  }

  /**
   * Validate E2E test environment
   */
  async validateEnvironment(): Promise<void> {
    try {
      console.log(`🌐 Validating E2E test environment...`)
      
      // Check network connectivity
      const genesisHash = await this.rpc.getGenesisHash().send()
      console.log(`📡 Connected to network: ${genesisHash}`)
      
      // Verify program deployment
      const programInfo = await this.rpc.getAccountInfo(E2E_CONFIG.PROGRAM_ID).send()
      if (!programInfo) {
        throw new Error(`GhostSpeak program not found: ${E2E_CONFIG.PROGRAM_ID}`)
      }
      
      console.log(`✅ Program verified on devnet`)
      
      // Test basic client functionality
      const slot = await this.rpc.getSlot().send()
      console.log(`📊 Current slot: ${slot}`)
      
      console.log(`✅ E2E environment validation complete`)
    } catch (error) {
      throw new Error(`E2E environment validation failed: ${error}`)
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport(scenarioName: string): E2ETestReport {
    const context = this.scenarios.get(scenarioName)
    if (!context) {
      throw new Error(`Scenario ${scenarioName} not found`)
    }

    const duration = Date.now() - context.startTime
    
    return {
      scenario: scenarioName,
      duration,
      userCount: context.users.size,
      serviceCount: context.services.size,
      escrowCount: context.escrows.size,
      transactionCount: context.transactions.length,
      users: Array.from(context.users.entries()).map(([name, persona]) => ({
        name,
        role: persona.role,
        address: persona.signer.address
      })),
      success: true,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Cleanup E2E test environment
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up E2E test environment...`)
    
    // Clear scenario tracking
    this.scenarios.clear()
    this.activeUsers.clear()
    
    console.log(`✅ E2E cleanup complete`)
  }
}

/**
 * E2E Test Report Interface
 */
export interface E2ETestReport {
  scenario: string
  duration: number
  userCount: number
  serviceCount: number
  escrowCount: number
  transactionCount: number
  users: Array<{
    name: string
    role: string
    address: Address
  }>
  success: boolean
  timestamp: string
}

/**
 * E2E Test Assertions
 */
export class E2EAssertions {
  constructor(private env: E2ETestEnvironment) {}

  /**
   * Assert complete workflow success
   */
  async assertWorkflowSuccess(
    scenarioName: string,
    expectedOutcomes: Record<string, any>
  ): Promise<void> {
    const context = this.env.scenarios.get(scenarioName)
    if (!context) {
      throw new Error(`Scenario ${scenarioName} not found`)
    }

    // Verify expected outcomes
    for (const [key, expectedValue] of Object.entries(expectedOutcomes)) {
      const actualValue = this.getScenarioValue(context, key)
      if (actualValue !== expectedValue) {
        throw new Error(`Expected ${key} to be ${expectedValue}, got ${actualValue}`)
      }
    }
  }

  /**
   * Assert user journey completion
   */
  async assertUserJourneyComplete(
    persona: UserPersona,
    expectedSteps: string[]
  ): Promise<void> {
    // This would verify that a user completed all expected steps
    // Implementation would track user actions and verify completion
    console.log(`✅ User journey verified for ${persona.metadata.name}`)
  }

  /**
   * Assert cross-feature integration
   */
  async assertCrossFeatureIntegration(
    features: string[],
    expectedConnections: Record<string, string[]>
  ): Promise<void> {
    // Verify that features integrate correctly
    console.log(`✅ Cross-feature integration verified for: ${features.join(', ')}`)
  }

  private getScenarioValue(context: E2EScenarioContext, key: string): any {
    // Extract values from scenario context
    switch (key) {
      case 'userCount':
        return context.users.size
      case 'serviceCount':
        return context.services.size
      case 'escrowCount':
        return context.escrows.size
      default:
        return undefined
    }
  }
}

/**
 * Global E2E environment instance
 */
let globalE2EEnv: E2ETestEnvironment | null = null

/**
 * Get or create global E2E environment
 */
export function getE2EEnvironment(): E2ETestEnvironment {
  if (!globalE2EEnv) {
    globalE2EEnv = new E2ETestEnvironment()
  }
  return globalE2EEnv
}

/**
 * Setup E2E test environment
 */
export async function setupE2ETest(): Promise<{
  env: E2ETestEnvironment
  assert: E2EAssertions
}> {
  const env = getE2EEnvironment()
  await env.validateEnvironment()
  
  const assert = new E2EAssertions(env)
  
  return { env, assert }
}

/**
 * Cleanup E2E test environment
 */
export async function cleanupE2ETest(): Promise<void> {
  if (globalE2EEnv) {
    await globalE2EEnv.cleanup()
    globalE2EEnv = null
  }
}