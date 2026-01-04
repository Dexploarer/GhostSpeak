/**
 * Account Creation Tests
 *
 * Tests account creation utilities including:
 * - Agent account creation
 * - Proper PDA derivation
 * - Validation of input parameters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { TransactionSigner } from '@solana/kit'
import type { Address } from '@solana/addresses'

import { AccountCreationHelper } from '../../../src/utils/account-creation'
import type { GhostSpeakConfig } from '../../../src/types'
import { TEST_ADDRESSES } from '../../helpers/setup'

// Mock PDA module
vi.mock('../../../src/utils/pda.js', () => ({
  deriveAgentPda: vi.fn().mockImplementation(async ({ agentId }: { agentId: string }) => {
    // Return different addresses for different agentIds
    return [`MockAgentPDA_${agentId}` as unknown as Address, 255]
  }),
  deriveUserRegistryPda: vi.fn().mockImplementation(async () => {
    return 'MockUserRegistryPDA123456789012345678901234' as unknown as Address
  })
}))

describe('Account Creation', () => {
  let helper: AccountCreationHelper
  let config: GhostSpeakConfig
  let signer: TransactionSigner

  beforeEach(() => {
    vi.clearAllMocks()

    config = {
      programId: TEST_ADDRESSES.systemProgram,
      cluster: 'devnet',
      commitment: 'confirmed'
    }

    helper = new AccountCreationHelper(config)

    signer = {
      address: TEST_ADDRESSES.user,
      signTransactionMessage: vi.fn().mockResolvedValue({
        signature: new Uint8Array(64)
      })
    } as unknown as TransactionSigner
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

      // PDAs should be identical for same inputs
      expect(result1.agentAddress).toBe(result2.agentAddress)
      expect(result1.userRegistryAddress).toBe(result2.userRegistryAddress)
    })

    it('should validate agent type range', async () => {
      const agentId = 'test-agent'
      const metadataUri = 'https://example.com/metadata.json'

      // Test invalid agent types
      await expect(
        helper.createAgentAccount(signer, agentId, -1, metadataUri)
      ).rejects.toThrow(/Invalid agent type/)

      await expect(
        helper.createAgentAccount(signer, agentId, 11, metadataUri)
      ).rejects.toThrow(/Invalid agent type/)

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
      ).rejects.toThrow(/Invalid metadata URI/)

      // Test valid URIs
      const validUris = [
        'https://example.com/metadata.json',
        'http://localhost:8080/agent.json'
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
        { type: 5, name: 'Gaming' },
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

  describe('Complex Account Creation Scenarios', () => {
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
      // All PDAs should be unique (different agentIds)
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

      // All results should be identical (same inputs = same PDAs)
      expect(results[0].agentAddress).toBe(results[1].agentAddress)
      expect(results[1].agentAddress).toBe(results[2].agentAddress)
      expect(results[0].userRegistryAddress).toBe(results[1].userRegistryAddress)
    })
  })

  describe('Static utility methods', () => {
    it('should generate unique IDs', () => {
      const id1 = AccountCreationHelper.generateUniqueId()
      const id2 = AccountCreationHelper.generateUniqueId()

      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
    })

    it('should generate unique bigint IDs', () => {
      const id1 = AccountCreationHelper.generateUniqueBigIntId()
      const id2 = AccountCreationHelper.generateUniqueBigIntId()

      expect(typeof id1).toBe('bigint')
      expect(typeof id2).toBe('bigint')
      // IDs should be different (with very high probability)
      expect(id1).not.toBe(id2)
    })
  })
})
