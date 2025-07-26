/**
 * Account Creation Tests
 * 
 * Tests account creation utilities including:
 * - Agent account creation
 * - Service account creation
 * - Proper PDA derivation
 * - Validation of input parameters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'

import { AccountCreationHelper } from '../../../src/utils/account-creation'
import type { GhostSpeakConfig } from '../../../src/types'
import { generateTestKeypair, TEST_ADDRESSES } from '../../helpers/setup'

describe('Account Creation', () => {
  let helper: AccountCreationHelper
  let config: GhostSpeakConfig
  let signer: TransactionSigner
  
  beforeEach(() => {
    config = {
      programId: TEST_ADDRESSES.systemProgram,
      cluster: 'devnet',
      commitment: 'confirmed'
    }
    
    helper = new AccountCreationHelper(config)
    
    const testKeypair = generateTestKeypair()
    signer = {
      address: TEST_ADDRESSES.user,
      signTransactionMessage: vi.fn().mockResolvedValue({ 
        signature: new Uint8Array(64) 
      })
    }
  })

  describe('Agent Account Creation', () => {
    it('should create agent account with valid parameters', async () => {
      const agentId = 'test-agent-001'
      const agentType = 1 // AI Trading Agent
      const metadataUri = 'https://example.com/metadata.json'

      const result = await helper.createAgentAccount(
        signer,
        agentId,
        agentType,
        metadataUri
      )

      expect(result.agentAddress).toBeDefined()
      expect(result.userRegistryAddress).toBeDefined()
      expect(result.agentType).toBe(agentType)
      expect(result.metadataUri).toBe(metadataUri)
    })

    it('should derive deterministic agent PDA', async () => {
      const agentId = 'deterministic-agent'
      const agentType = 2
      const metadataUri = 'https://example.com/agent.json'

      // Create same agent twice
      const result1 = await helper.createAgentAccount(
        signer,
        agentId,
        agentType,
        metadataUri
      )

      const result2 = await helper.createAgentAccount(
        signer,
        agentId,
        agentType,
        metadataUri
      )

      // PDAs should be identical
      expect(result1.agentAddress).toBe(result2.agentAddress)
      expect(result1.userRegistryAddress).toBe(result2.userRegistryAddress)
    })

    it('should validate agent type range', async () => {
      const agentId = 'test-agent'
      const metadataUri = 'https://example.com/metadata.json'

      // Test invalid agent types
      await expect(
        helper.createAgentAccount(signer, agentId, -1, metadataUri)
      ).rejects.toThrow('Invalid agent type: -1')

      await expect(
        helper.createAgentAccount(signer, agentId, 11, metadataUri)
      ).rejects.toThrow('Invalid agent type: 11')

      // Test valid edge cases
      await expect(
        helper.createAgentAccount(signer, agentId, 0, metadataUri)
      ).resolves.toBeDefined()

      await expect(
        helper.createAgentAccount(signer, agentId, 10, metadataUri)
      ).resolves.toBeDefined()
    })

    it('should validate metadata URI', async () => {
      const agentId = 'test-agent'
      const agentType = 1

      // Test empty metadata URI
      await expect(
        helper.createAgentAccount(signer, agentId, agentType, '')
      ).rejects.toThrow('Metadata URI is required')

      // Test invalid URI format
      await expect(
        helper.createAgentAccount(signer, agentId, agentType, 'not-a-url')
      ).rejects.toThrow('Invalid metadata URI format')

      // Test valid URIs
      const validUris = [
        'https://example.com/metadata.json',
        'http://localhost:8080/agent.json',
        'ipfs://QmHash123/metadata.json',
        'arweave://transaction-id/data.json'
      ]

      for (const uri of validUris) {
        await expect(
          helper.createAgentAccount(signer, agentId, agentType, uri)
        ).resolves.toBeDefined()
      }
    })

    it('should handle different agent types correctly', async () => {
      const agentTypes = [
        { type: 0, name: 'General' },
        { type: 1, name: 'AI Trading' },
        { type: 2, name: 'Analytics' },
        { type: 3, name: 'NFT' },
        { type: 4, name: 'DeFi' },
        { type: 5, name: 'Gaming' },
        { type: 6, name: 'Social' },
        { type: 7, name: 'Oracle' },
        { type: 8, name: 'Governance' },
        { type: 9, name: 'Infrastructure' },
        { type: 10, name: 'Custom' }
      ]

      for (const { type, name } of agentTypes) {
        const result = await helper.createAgentAccount(
          signer,
          `agent-${name.toLowerCase()}`,
          type,
          `https://example.com/${name.toLowerCase()}.json`
        )

        expect(result.agentType).toBe(type)
        expect(result.agentAddress).toBeDefined()
      }
    })
  })

  describe('Service Listing Creation', () => {
    it('should create service listing with valid parameters', async () => {
      const agentAddress = TEST_ADDRESSES.agent
      const serviceId = 'trading-signals-v1'
      const basePrice = 1000000n // 0.001 SOL

      const result = await helper.createServiceListing(
        signer,
        agentAddress,
        serviceId,
        basePrice
      )

      expect(result.serviceAddress).toBeDefined()
      expect(result.agentAddress).toBe(agentAddress)
      expect(result.serviceId).toBe(serviceId)
      expect(result.basePrice).toBe(basePrice)
    })

    it('should derive deterministic service PDA', async () => {
      const agentAddress = TEST_ADDRESSES.agent
      const serviceId = 'analytics-service'
      const basePrice = 5000000n

      // Create same service twice
      const result1 = await helper.createServiceListing(
        signer,
        agentAddress,
        serviceId,
        basePrice
      )

      const result2 = await helper.createServiceListing(
        signer,
        agentAddress,
        serviceId,
        basePrice
      )

      // PDAs should be identical
      expect(result1.serviceAddress).toBe(result2.serviceAddress)
    })

    it('should validate base price', async () => {
      const agentAddress = TEST_ADDRESSES.agent
      const serviceId = 'test-service'

      // Test zero price
      await expect(
        helper.createServiceListing(signer, agentAddress, serviceId, 0n)
      ).rejects.toThrow('Base price must be greater than 0')

      // Test negative price (should not be possible with bigint, but test anyway)
      await expect(
        helper.createServiceListing(signer, agentAddress, serviceId, -1000n)
      ).rejects.toThrow('Base price must be greater than 0')

      // Test valid prices
      const validPrices = [1n, 1000n, 1000000n, 1000000000n]
      for (const price of validPrices) {
        await expect(
          helper.createServiceListing(signer, agentAddress, serviceId, price)
        ).resolves.toBeDefined()
      }
    })

    it('should validate service ID', async () => {
      const agentAddress = TEST_ADDRESSES.agent
      const basePrice = 1000000n

      // Test empty service ID
      await expect(
        helper.createServiceListing(signer, agentAddress, '', basePrice)
      ).rejects.toThrow('Service ID is required')

      // Test service ID length
      const longServiceId = 'a'.repeat(65) // Assuming 64 char limit
      await expect(
        helper.createServiceListing(signer, agentAddress, longServiceId, basePrice)
      ).rejects.toThrow('Service ID too long')

      // Test valid service IDs
      const validIds = [
        'service-1',
        'trading_signals_v2',
        'analytics.premium',
        'nft-minter-2024'
      ]

      for (const id of validIds) {
        await expect(
          helper.createServiceListing(signer, agentAddress, id, basePrice)
        ).resolves.toBeDefined()
      }
    })
  })

  describe('Complex Account Creation Scenarios', () => {
    it('should create agent and multiple services', async () => {
      // Create agent
      const agentResult = await helper.createAgentAccount(
        signer,
        'multi-service-agent',
        1,
        'https://example.com/agent.json'
      )

      // Create multiple services for the agent
      const services = [
        { id: 'basic-trading', price: 1000000n },
        { id: 'premium-analytics', price: 5000000n },
        { id: 'custom-strategies', price: 10000000n }
      ]

      const serviceResults = []
      for (const service of services) {
        const result = await helper.createServiceListing(
          signer,
          agentResult.agentAddress,
          service.id,
          service.price
        )
        serviceResults.push(result)
      }

      expect(serviceResults).toHaveLength(3)
      expect(serviceResults[0].serviceId).toBe('basic-trading')
      expect(serviceResults[1].serviceId).toBe('premium-analytics')
      expect(serviceResults[2].serviceId).toBe('custom-strategies')
    })

    it('should handle concurrent account creation', async () => {
      const promises = []

      // Create multiple agents concurrently
      for (let i = 0; i < 5; i++) {
        promises.push(
          helper.createAgentAccount(
            signer,
            `concurrent-agent-${i}`,
            i % 11, // Cycle through agent types
            `https://example.com/agent-${i}.json`
          )
        )
      }

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      // All PDAs should be unique
      const addresses = results.map(r => r.agentAddress)
      const uniqueAddresses = new Set(addresses)
      expect(uniqueAddresses.size).toBe(5)
    })

    it('should maintain account creation idempotency', async () => {
      const agentId = 'idempotent-agent'
      const agentType = 3
      const metadataUri = 'https://example.com/idempotent.json'

      // Create agent multiple times
      const results = []
      for (let i = 0; i < 3; i++) {
        const result = await helper.createAgentAccount(
          signer,
          agentId,
          agentType,
          metadataUri
        )
        results.push(result)
      }

      // All results should be identical
      expect(results[0].agentAddress).toBe(results[1].agentAddress)
      expect(results[1].agentAddress).toBe(results[2].agentAddress)
      expect(results[0].userRegistryAddress).toBe(results[1].userRegistryAddress)
    })
  })
})