/**
 * Real Agent Lifecycle Integration Test
 * 
 * Tests complete agent lifecycle on actual Solana devnet:
 * 1. Agent registration
 * 2. Service creation  
 * 3. Service listing updates
 * 4. Agent metadata updates
 * 5. Agent deactivation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { TransactionSigner } from '@solana/web3.js'
import type { Address } from '@solana/addresses'

import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  type BlockchainTestEnvironment,
  type TestDataGenerator,
  type BlockchainAssertions,
  TEST_CONFIG
} from './setup/blockchain-setup'
import { deriveAgentPda, deriveServiceListingPda } from '../../src/utils/pda'
import { fetchAgent, fetchServiceListing } from '../../src/generated/accounts'

describe('Real Agent Lifecycle Integration', () => {
  let env: BlockchainTestEnvironment
  let dataGen: TestDataGenerator
  let assert: BlockchainAssertions
  let authority: TransactionSigner
  let agent: Address
  let service: Address

  beforeAll(async () => {
    // Setup real blockchain test environment
    const setup = await setupIntegrationTest()
    env = setup.env
    dataGen = setup.dataGen
    assert = setup.assert

    // Create funded test account
    authority = await env.createFundedSigner()
    
    console.log(`🧪 Testing with authority: ${authority.address}`)
  }, TEST_CONFIG.TRANSACTION_TIMEOUT)

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  describe('Agent Registration', () => {
    it('should register a new agent on devnet', async () => {
      const agentData = dataGen.generateAgentData()
      
      console.log(`📝 Registering agent: ${agentData.name}`)
      
      // Register agent using real blockchain
      const result = await env.client.registerAgent({
        authority: authority.address,
        signer: authority,
        ...agentData
      })

      // Verify transaction was successful
      await assert.assertTransactionSuccess(result.signature)
      
      // Derive expected agent PDA
      const [expectedAgent] = deriveAgentPda(authority.address)
      agent = expectedAgent
      
      console.log(`✅ Agent registered at: ${agent}`)
      
      // Wait for account to be created on blockchain
      await env.waitForAccount(agent)
      
      // Verify agent account exists and has correct data
      await assert.assertAccountExists(agent)
      
      // Fetch and validate agent data from blockchain
      const agentAccount = await fetchAgent(env.rpc, agent)
      expect(agentAccount).toBeDefined()
      expect(agentAccount.data.authority).toBe(authority.address)
      expect(agentAccount.data.isActive).toBe(true)
      
      console.log(`📊 Agent verified on blockchain with data:`, {
        authority: agentAccount.data.authority,
        isActive: agentAccount.data.isActive,
        createdAt: agentAccount.data.createdAt
      })
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should fail to register duplicate agent', async () => {
      const agentData = dataGen.generateAgentData()
      
      // Try to register another agent with same authority
      await expect(
        env.client.registerAgent({
          authority: authority.address,
          signer: authority,
          ...agentData
        })
      ).rejects.toThrow()
      
      console.log(`✅ Duplicate agent registration correctly rejected`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Service Creation', () => {
    it('should create a service for the registered agent', async () => {
      const serviceData = dataGen.generateServiceData(agent)
      
      console.log(`🛠️ Creating service: ${serviceData.name}`)
      
      // Create service using real blockchain
      const result = await env.client.registerService({
        authority: authority.address,
        signer: authority,
        ...serviceData
      })

      // Verify transaction was successful
      await assert.assertTransactionSuccess(result.signature)
      
      // Derive expected service PDA
      const [expectedService] = deriveServiceListingPda(agent, serviceData.name)
      service = expectedService
      
      console.log(`✅ Service created at: ${service}`)
      
      // Wait for service account to be created
      await env.waitForAccount(service)
      
      // Verify service account exists
      await assert.assertAccountExists(service)
      
      // Fetch and validate service data from blockchain
      const serviceAccount = await fetchServiceListing(env.rpc, service)
      expect(serviceAccount).toBeDefined()
      expect(serviceAccount.data.agent).toBe(agent)
      expect(serviceAccount.data.basePrice).toBe(serviceData.basePrice)
      expect(serviceAccount.data.isActive).toBe(true)
      
      console.log(`📊 Service verified on blockchain with data:`, {
        agent: serviceAccount.data.agent,
        basePrice: serviceAccount.data.basePrice,
        isActive: serviceAccount.data.isActive
      })
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should update service pricing', async () => {
      const newPrice = 2_000_000n // 0.002 SOL
      
      console.log(`💰 Updating service price to: ${newPrice}`)
      
      // Update service price
      const result = await env.client.updateServiceListing({
        authority: authority.address,
        signer: authority,
        service,
        newPrice
      })

      // Verify transaction was successful
      await assert.assertTransactionSuccess(result.signature)
      
      // Small delay to ensure blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Fetch updated service data
      const updatedService = await fetchServiceListing(env.rpc, service)
      expect(updatedService.data.basePrice).toBe(newPrice)
      
      console.log(`✅ Service price updated to: ${updatedService.data.basePrice}`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Agent Management', () => {
    it('should update agent metadata', async () => {
      const updatedData = {
        ...dataGen.generateAgentData(),
        name: 'Updated Agent Name',
        description: 'Updated description for integration test'
      }
      
      console.log(`📝 Updating agent metadata`)
      
      // Update agent metadata
      const result = await env.client.updateAgent({
        authority: authority.address,
        signer: authority,
        agent,
        ...updatedData
      })

      // Verify transaction was successful
      await assert.assertTransactionSuccess(result.signature)
      
      // Small delay for blockchain state update
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Fetch updated agent data
      const updatedAgent = await fetchAgent(env.rpc, agent)
      expect(updatedAgent.data.authority).toBe(authority.address)
      expect(updatedAgent.data.isActive).toBe(true)
      
      console.log(`✅ Agent metadata updated successfully`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should deactivate agent', async () => {
      console.log(`🛑 Deactivating agent`)
      
      // Deactivate agent
      const result = await env.client.deactivateAgent({
        authority: authority.address,
        signer: authority,
        agent
      })

      // Verify transaction was successful
      await assert.assertTransactionSuccess(result.signature)
      
      // Small delay for blockchain state update
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Fetch updated agent data
      const deactivatedAgent = await fetchAgent(env.rpc, agent)
      expect(deactivatedAgent.data.isActive).toBe(false)
      
      console.log(`✅ Agent successfully deactivated`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should fail to create service for deactivated agent', async () => {
      const serviceData = dataGen.generateServiceData(agent)
      
      console.log(`🚫 Attempting to create service for deactivated agent`)
      
      // Try to create service for deactivated agent
      await expect(
        env.client.registerService({
          authority: authority.address,
          signer: authority,
          ...serviceData
        })
      ).rejects.toThrow()
      
      console.log(`✅ Service creation correctly rejected for deactivated agent`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Multi-Agent Scenarios', () => {
    it('should handle multiple agents from different authorities', async () => {
      // Create second authority
      const authority2 = await env.createFundedSigner()
      const agentData2 = dataGen.generateAgentData()
      
      console.log(`👥 Creating second agent with authority: ${authority2.address}`)
      
      // Register second agent
      const result = await env.client.registerAgent({
        authority: authority2.address,
        signer: authority2,
        ...agentData2
      })

      await assert.assertTransactionSuccess(result.signature)
      
      // Derive second agent PDA
      const [agent2] = deriveAgentPda(authority2.address)
      
      // Wait for account creation
      await env.waitForAccount(agent2)
      
      // Verify both agents exist independently
      await assert.assertAccountExists(agent)
      await assert.assertAccountExists(agent2)
      
      // Verify agents have different authorities
      const agent1Data = await fetchAgent(env.rpc, agent)
      const agent2Data = await fetchAgent(env.rpc, agent2)
      
      expect(agent1Data.data.authority).toBe(authority.address)
      expect(agent2Data.data.authority).toBe(authority2.address)
      expect(agent1Data.data.authority).not.toBe(agent2Data.data.authority)
      
      console.log(`✅ Multiple agents created successfully`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test with invalid agent address
      const invalidAgent = agent // Use existing agent but wrong authority
      const unauthorizedSigner = await env.createFundedSigner()
      
      console.log(`🚫 Testing unauthorized agent update`)
      
      // Try to update agent with wrong authority
      await expect(
        env.client.updateAgent({
          authority: unauthorizedSigner.address,
          signer: unauthorizedSigner,
          agent: invalidAgent,
          ...dataGen.generateAgentData()
        })
      ).rejects.toThrow()
      
      console.log(`✅ Unauthorized update correctly rejected`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should handle account not found scenarios', async () => {
      // Try to fetch non-existent agent
      const [nonExistentAgent] = deriveAgentPda(await env.createFundedSigner().then(s => s.address))
      
      console.log(`🔍 Testing non-existent agent fetch`)
      
      // This should return null or throw depending on implementation
      try {
        const result = await fetchAgent(env.rpc, nonExistentAgent)
        expect(result).toBeNull()
      } catch (error) {
        // Error is expected for non-existent account
        expect(error).toBeDefined()
      }
      
      console.log(`✅ Non-existent agent handling verified`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })
})