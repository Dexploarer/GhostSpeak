/**
 * Real Blockchain Test Infrastructure
 * 
 * Provides utilities for testing against actual Solana devnet blockchain
 * instead of mocked RPC responses
 */

import { createSolanaRpc, createSolanaRpcSubscriptions, generateKeyPair } from '@solana/web3.js'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type { TransactionSigner, Rpc } from '@solana/web3.js'

import { GhostSpeakClient } from '../../../src/client/GhostSpeakClient'
import type { GhostSpeakConfig } from '../../../src/types'

// Test configuration
export const TEST_CONFIG = {
  // Use actual devnet endpoint
  RPC_ENDPOINT: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  WS_ENDPOINT: process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com',
  
  // Deployed program ID on devnet
  PROGRAM_ID: address('5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG'),
  
  // Test timeouts
  TRANSACTION_TIMEOUT: 60000, // 60 seconds
  CONFIRMATION_TIMEOUT: 30000, // 30 seconds
  
  // Funding amounts
  MIN_BALANCE: 100_000_000n, // 0.1 SOL minimum
  FUNDING_AMOUNT: 1_000_000_000n, // 1 SOL for testing
  
  // Test retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
} as const

/**
 * Real blockchain test environment setup
 */
export class BlockchainTestEnvironment {
  public rpc: Rpc
  public client: GhostSpeakClient
  private fundedAccounts: Set<string> = new Set()

  constructor() {
    // Create real RPC connections
    this.rpc = createSolanaRpc(TEST_CONFIG.RPC_ENDPOINT)
    const rpcSubscriptions = createSolanaRpcSubscriptions(TEST_CONFIG.WS_ENDPOINT)
    
    // Create client with real blockchain connection
    this.client = new GhostSpeakClient({
      rpc: this.rpc,
      rpcSubscriptions,
      programId: TEST_CONFIG.PROGRAM_ID,
      cluster: 'devnet'
    } satisfies GhostSpeakConfig)
  }

  /**
   * Create a test signer with funded account
   */
  async createFundedSigner(): Promise<TransactionSigner> {
    const keyPair = await generateKeyPair()
    const signer = await createKeyPairSignerFromBytes(keyPair.privateKey)
    
    // Fund the account if not already funded
    await this.ensureFunding(signer.address)
    
    return signer
  }

  /**
   * Ensure an account has minimum balance for testing
   */
  async ensureFunding(address: Address): Promise<void> {
    const addressString = address.toString()
    
    // Skip if already funded
    if (this.fundedAccounts.has(addressString)) {
      return
    }

    try {
      // Check current balance
      const balance = await this.rpc.getBalance(address).send()
      
      if (balance < TEST_CONFIG.MIN_BALANCE) {
        console.log(`🔋 Funding test account ${addressString.slice(0, 8)}...`)
        await this.requestAirdrop(address, TEST_CONFIG.FUNDING_AMOUNT)
      }
      
      this.fundedAccounts.add(addressString)
    } catch (error) {
      console.warn(`⚠️ Funding failed for ${addressString}:`, error)
      // Continue with test - might work with existing balance
    }
  }

  /**
   * Request airdrop with retry logic
   */
  private async requestAirdrop(address: Address, amount: bigint): Promise<void> {
    for (let attempt = 0; attempt < TEST_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const signature = await this.rpc.requestAirdrop(address, amount).send()
        
        // Wait for confirmation
        await this.confirmTransaction(signature)
        
        console.log(`✅ Airdrop successful: ${signature}`)
        return
      } catch (error) {
        console.log(`🔄 Airdrop attempt ${attempt + 1} failed:`, error)
        
        if (attempt === TEST_CONFIG.MAX_RETRIES - 1) {
          throw new Error(`Airdrop failed after ${TEST_CONFIG.MAX_RETRIES} attempts`)
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.RETRY_DELAY))
      }
    }
  }

  /**
   * Confirm transaction with timeout
   */
  async confirmTransaction(signature: string): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < TEST_CONFIG.CONFIRMATION_TIMEOUT) {
      try {
        const statuses = await this.rpc.getSignatureStatuses([signature]).send()
        const status = statuses.value[0]
        
        if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
          if (status.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
          }
          return
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.warn('Error checking transaction status:', error)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    throw new Error(`Transaction confirmation timeout: ${signature}`)
  }

  /**
   * Wait for account to exist on blockchain
   */
  async waitForAccount(address: Address, timeoutMs = 30000): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const accountInfo = await this.rpc.getAccountInfo(address).send()
        if (accountInfo) {
          return
        }
      } catch (error) {
        // Account doesn't exist yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    throw new Error(`Account ${address} not found after ${timeoutMs}ms`)
  }

  /**
   * Get current slot for testing timing
   */
  async getCurrentSlot(): Promise<bigint> {
    return this.rpc.getSlot().send()
  }

  /**
   * Check if we're connected to devnet
   */
  async validateNetwork(): Promise<void> {
    try {
      const genesisHash = await this.rpc.getGenesisHash().send()
      console.log(`🌐 Connected to network with genesis: ${genesisHash}`)
      
      // Verify we can get basic network info
      const slot = await this.getCurrentSlot()
      console.log(`📊 Current slot: ${slot}`)
      
      // Check our program exists
      const programInfo = await this.rpc.getAccountInfo(TEST_CONFIG.PROGRAM_ID).send()
      if (!programInfo) {
        throw new Error(`Program ${TEST_CONFIG.PROGRAM_ID} not found on network`)
      }
      
      console.log(`✅ GhostSpeak program found on devnet`)
    } catch (error) {
      throw new Error(`Network validation failed: ${error}`)
    }
  }

  /**
   * Clean up test data (best effort)
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test environment...')
    // Note: On devnet, we typically don't need to clean up accounts
    // as they'll be reset periodically
    this.fundedAccounts.clear()
  }
}

/**
 * Test data generator for consistent test scenarios
 */
export class TestDataGenerator {
  private counter = 0

  /**
   * Generate unique test names
   */
  generateTestName(prefix: string): string {
    this.counter++
    const timestamp = Date.now().toString(36)
    return `${prefix}-test-${this.counter}-${timestamp}`
  }

  /**
   * Generate test agent data
   */
  generateAgentData() {
    return {
      name: this.generateTestName('agent'),
      description: 'Integration test agent for GhostSpeak protocol',
      website: 'https://ghostspeak.ai/test',
      imageUrl: 'https://ghostspeak.ai/images/test-agent.png',
      capabilities: ['trading', 'analysis', 'testing'],
      category: 'defi' as const,
      isActive: true
    }
  }

  /**
   * Generate test service data
   */
  generateServiceData(agentAddress: Address) {
    return {
      agent: agentAddress,
      name: this.generateTestName('service'),
      description: 'Test service for integration testing',
      category: 'analysis' as const,
      basePrice: 1_000_000n, // 0.001 SOL
      pricing: {
        basePrice: 1_000_000n,
        priceType: 'fixed' as const,
        currency: address('So11111111111111111111111111111111111111112') // SOL
      }
    }
  }

  /**
   * Generate test escrow data
   */
  generateEscrowData(buyer: Address, seller: Address) {
    return {
      buyer,
      seller,
      amount: 5_000_000n, // 0.005 SOL
      description: 'Test escrow for integration testing',
      deliveryTime: 3600, // 1 hour
      requiresApproval: false
    }
  }
}

/**
 * Test assertion helpers for blockchain state
 */
export class BlockchainAssertions {
  constructor(private env: BlockchainTestEnvironment) {}

  /**
   * Assert account exists with expected data
   */
  async assertAccountExists(address: Address): Promise<void> {
    const accountInfo = await this.env.rpc.getAccountInfo(address).send()
    if (!accountInfo) {
      throw new Error(`Expected account ${address} to exist`)
    }
  }

  /**
   * Assert account has minimum balance
   */
  async assertMinimumBalance(address: Address, minBalance: bigint): Promise<void> {
    const balance = await this.env.rpc.getBalance(address).send()
    if (balance < minBalance) {
      throw new Error(`Account ${address} has ${balance} lamports, expected at least ${minBalance}`)
    }
  }

  /**
   * Assert transaction was successful
   */
  async assertTransactionSuccess(signature: string): Promise<void> {
    const statuses = await this.env.rpc.getSignatureStatuses([signature]).send()
    const status = statuses.value[0]
    
    if (!status) {
      throw new Error(`Transaction ${signature} not found`)
    }
    
    if (status.err) {
      throw new Error(`Transaction ${signature} failed: ${JSON.stringify(status.err)}`)
    }
    
    if (status.confirmationStatus !== 'confirmed' && status.confirmationStatus !== 'finalized') {
      throw new Error(`Transaction ${signature} not confirmed`)
    }
  }
}

/**
 * Global test environment instance
 */
let globalTestEnv: BlockchainTestEnvironment | null = null

/**
 * Get or create global test environment
 */
export function getTestEnvironment(): BlockchainTestEnvironment {
  if (!globalTestEnv) {
    globalTestEnv = new BlockchainTestEnvironment()
  }
  return globalTestEnv
}

/**
 * Setup test environment for integration tests
 */
export async function setupIntegrationTest(): Promise<{
  env: BlockchainTestEnvironment
  dataGen: TestDataGenerator
  assert: BlockchainAssertions
}> {
  const env = getTestEnvironment()
  
  // Validate network connection
  await env.validateNetwork()
  
  const dataGen = new TestDataGenerator()
  const assert = new BlockchainAssertions(env)
  
  return { env, dataGen, assert }
}

/**
 * Cleanup after integration tests
 */
export async function cleanupIntegrationTest(): Promise<void> {
  if (globalTestEnv) {
    await globalTestEnv.cleanup()
  }
}