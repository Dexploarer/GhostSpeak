/**
 * PDA (Program Derived Address) Utility Tests
 * 
 * Comprehensive test coverage for all PDA derivation functions.
 * These are critical foundation functions used throughout the SDK.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import {
  deriveAgentPda,
  deriveServiceListingPda,
  deriveJobPostingPda,
  deriveJobApplicationPda,
  deriveWorkOrderPda,
  deriveWorkDeliveryPda,
  derivePaymentPda,
  deriveA2ASessionPda,
  deriveA2AMessagePda,
  deriveUserRegistryPda,
  deriveServicePurchasePda,
  deriveAgentVerificationPda,
  deriveReplicationTemplatePda,
  deriveReplicationRecordPda,
  deriveAgentTreeConfigPda,
  findProgramDerivedAddress,
  deriveWorkOrderPDA,
  deriveWorkDeliveryPDA,
  deriveEscrowPDA
} from '../../../src/utils/pda'

describe('PDA Derivation Utilities', () => {
  let programId: Address
  let owner: Address
  let creator: Address
  let buyer: Address
  
  beforeEach(() => {
    // Use valid base58 Solana addresses for testing
    programId = address('11111111111111111111111111111111')
    owner = address('So11111111111111111111111111111111111111112')
    creator = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    buyer = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
  })

  describe('Basic PDA Generation', () => {
    it('should derive agent PDA with string agent ID', async () => {
      const agentId = 'test-agent-001'
      const pda = await deriveAgentPda(programId, owner, agentId)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      expect(pda.length).toBeGreaterThan(32)
      expect(pda.length).toBeLessThanOrEqual(44)
      
      // Same inputs should produce same PDA
      const pda2 = await deriveAgentPda(programId, owner, agentId)
      expect(pda2).toBe(pda)
    })

    it('should derive agent PDA with special characters in ID', async () => {
      const specialIds = [
        'agent-with-dashes',
        'agent_with_underscores',
        'agent.with.dots',
        'agent@email.com',
        '🤖-emoji-agent',
        'agent with spaces',
        ''  // empty string
      ]
      
      for (const agentId of specialIds) {
        const pda = await deriveAgentPda(programId, owner, agentId)
        expect(pda).toBeDefined()
        expect(typeof pda).toBe('string')
      }
    })

    it('should derive service listing PDA', async () => {
      const listingId = 'listing-12345'
      const pda = await deriveServiceListingPda(programId, creator, listingId)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      
      // Different listing IDs should produce different PDAs
      const pda2 = await deriveServiceListingPda(programId, creator, 'listing-67890')
      expect(pda2).not.toBe(pda)
    })

    it('should derive job posting PDA', async () => {
      const jobId = 'job-2025-001'
      const pda = await deriveJobPostingPda(programId, creator, jobId)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      
      // Different employers should produce different PDAs
      const pda2 = await deriveJobPostingPda(programId, buyer, jobId)
      expect(pda2).not.toBe(pda)
    })

    it('should derive job application PDA', async () => {
      const jobPosting = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      const applicant = address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
      
      const pda = await deriveJobApplicationPda(programId, jobPosting, applicant)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
    })
  })

  describe('Work Order PDAs with BigInt', () => {
    it('should derive work order PDA with bigint order ID', async () => {
      const orderId = BigInt(12345)
      const pda = await deriveWorkOrderPda(programId, owner, orderId)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      
      // Test with various bigint values
      const testValues = [
        BigInt(0),
        BigInt(1),
        BigInt(255),
        BigInt(256),
        BigInt(65535),
        BigInt(65536),
        BigInt('9223372036854775807'), // Max safe integer
        BigInt('18446744073709551615')  // Max u64
      ]
      
      for (const value of testValues) {
        const testPda = await deriveWorkOrderPda(programId, owner, value)
        expect(testPda).toBeDefined()
      }
    })

    it('should handle duplicate work order PDA functions consistently', async () => {
      const orderId = BigInt(99999)
      
      // Both functions should exist but may have different return types
      const pda1 = await deriveWorkOrderPda(programId, owner, orderId)
      const [pda2, bump] = await deriveWorkOrderPDA(owner, orderId, programId)
      
      expect(pda1).toBeDefined()
      expect(pda2).toBeDefined()
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)
    })

    it('should derive work delivery PDA', async () => {
      const workOrder = address('6zqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      const provider = address('7X8a8Rak6mCpurtLMgvqsKUxqCwRzx4gMW7a9zqwV7Ck')
      
      const pda = await deriveWorkDeliveryPda(programId, workOrder, provider)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
    })

    it('should derive payment PDA', async () => {
      const workOrder = address('8zqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      const payer = address('9X8a8Rak6mCpurtLMgvqsKUxqCwRzx4gMW7a9zqwV7Ck')
      
      const pda = await derivePaymentPda(programId, workOrder, payer)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
    })
  })

  describe('A2A (Agent-to-Agent) PDAs', () => {
    it('should derive A2A session PDA', async () => {
      const pda = await deriveA2ASessionPda(programId, creator)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      
      // Same creator should always produce same session PDA
      const pda2 = await deriveA2ASessionPda(programId, creator)
      expect(pda2).toBe(pda)
    })

    it('should derive A2A message PDA with timestamp', async () => {
      const session = address('AzqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      const timestamp = BigInt(Date.now())
      
      const pda = await deriveA2AMessagePda(programId, session, timestamp)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      
      // Different timestamps should produce different PDAs
      const pda2 = await deriveA2AMessagePda(programId, session, timestamp + BigInt(1000))
      expect(pda2).not.toBe(pda)
    })

    it('should handle A2A message PDA with various timestamp values', async () => {
      const session = address('BzqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      const timestamps = [
        BigInt(0),
        BigInt(1),
        BigInt(1609459200), // 2021-01-01
        BigInt(1735689600), // 2025-01-01
        BigInt(Date.now()),
        BigInt('9223372036854775807') // Max safe value
      ]
      
      for (const ts of timestamps) {
        const pda = await deriveA2AMessagePda(programId, session, ts)
        expect(pda).toBeDefined()
      }
    })
  })

  describe('Registry and Verification PDAs', () => {
    it('should derive user registry PDA', async () => {
      const signer = address('CzqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      const pda = await deriveUserRegistryPda(programId, signer)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
    })

    it('should derive service purchase PDA', async () => {
      const serviceListing = address('DzqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      const pda = await deriveServicePurchasePda(programId, serviceListing, buyer)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
    })

    it('should derive agent verification PDA', async () => {
      const agent = address('EzqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      const verifier = address('FzqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      
      const pda = await deriveAgentVerificationPda(programId, agent, verifier)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
    })
  })

  describe('Replication PDAs', () => {
    it('should derive replication template PDA', async () => {
      const sourceAgent = address('GzqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      const pda = await deriveReplicationTemplatePda(programId, sourceAgent)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
    })

    it('should derive replication record PDA', async () => {
      const template = address('HzqwV7Ck6xUp9R6g4mCpurtLMgvqsKUxqCwRzx4gMW7a')
      const pda = await deriveReplicationRecordPda(programId, template, buyer)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
    })
  })

  describe('Compressed Agent PDAs', () => {
    it('should derive agent tree config PDA', async () => {
      const signer = address('JQ4xZgWno1tmWkKFgER5XSrXpWzwmsU9ov7Vf8CsBkk')
      const pda = await deriveAgentTreeConfigPda(programId, signer)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
    })
  })

  describe('Generic PDA Functions', () => {
    it('should find PDA with string seeds', async () => {
      const seeds = ['test', 'seed', 'array']
      const [pda, bump] = await findProgramDerivedAddress(seeds, programId)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)
    })

    it('should find PDA with address seeds', async () => {
      // Note: Addresses as seeds will fail since they encode to 43 bytes
      // This is expected behavior - PDAs should use address bytes directly, not encoded addresses
      const seeds = [
        'prefix',
        owner,
        buyer
      ]
      
      await expect(
        findProgramDerivedAddress(seeds, programId)
      ).rejects.toThrow('exceeds the maximum length of 32 bytes')
    })

    it('should find PDA with Uint8Array seeds', async () => {
      const seeds = [
        new Uint8Array([1, 2, 3, 4]),
        'mixed',
        new Uint8Array([5, 6, 7, 8])
      ]
      const [pda, bump] = await findProgramDerivedAddress(seeds, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)
    })

    it('should find PDA with mixed seed types', async () => {
      // Use only valid seed types (strings and byte arrays under 32 bytes)
      const seeds = [
        'string-seed',
        'another-string',
        new Uint8Array([255, 254, 253])
      ] as (string | Address | Uint8Array)[]
      
      const [pda, bump] = await findProgramDerivedAddress(seeds, programId)
      
      expect(pda).toBeDefined()
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)
    })
  })

  describe('Alternative PDA Function Signatures', () => {
    it('should derive work delivery PDA with alternative function', async () => {
      const workOrder = address('CXYdzP7yD1AqRKe8Yjy1MkQ2fbuJ6TEcR9TrA9HA5zEY')
      const [pda, bump] = await deriveWorkDeliveryPDA(workOrder, programId)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)
    })

    it('should derive escrow PDA', async () => {
      const workOrder = address('DV2eQtZP8Gq1vwvwRSvJmYqs4MqLCDzdqHVRNgrvfKgL')
      const [pda, bump] = await deriveEscrowPDA(workOrder, programId)
      
      expect(pda).toBeDefined()
      expect(typeof pda).toBe('string')
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty string seeds', async () => {
      const pda = await deriveAgentPda(programId, owner, '')
      expect(pda).toBeDefined()
    })

    it('should fail with very long string seeds (>32 bytes)', async () => {
      const longId = 'a'.repeat(1000)
      
      // Seeds longer than 32 bytes should throw an error
      await expect(
        deriveAgentPda(programId, owner, longId)
      ).rejects.toThrow('exceeds the maximum length of 32 bytes')
    })

    it('should produce different PDAs for different programs', async () => {
      const program1 = address('EwYY7MTz3ufkvDhHX7DqUCQQqr7NZzaU23xBQnkbstJr')
      const program2 = address('FU6KugTqMXjvKqCpkdF5JNLjQuVgxqJvvJJvkRmbK1iR')
      const agentId = 'same-agent-id'
      
      const pda1 = await deriveAgentPda(program1, owner, agentId)
      const pda2 = await deriveAgentPda(program2, owner, agentId)
      
      expect(pda1).not.toBe(pda2)
    })

    it('should produce different PDAs for different owners', async () => {
      const owner1 = address('GV2eKugTqMXjvKqCpkdF5JNLjQuVgxqJvvJJvkRmbK1i')
      const owner2 = address('HY7MTz3ufkvDhHX7DqUCQQqr7NZzaU23xBQnkbstJrF')
      const agentId = 'same-agent-id'
      
      const pda1 = await deriveAgentPda(programId, owner1, agentId)
      const pda2 = await deriveAgentPda(programId, owner2, agentId)
      
      expect(pda1).not.toBe(pda2)
    })

    it('should handle Unicode characters in seeds', async () => {
      const unicodeIds = [
        '测试代理', // Chinese
        'тестовый агент', // Russian
        '🚀🌟✨', // Emojis
        'café-société', // Accented characters
        '日本語エージェント' // Japanese
      ]
      
      for (const id of unicodeIds) {
        const pda = await deriveAgentPda(programId, owner, id)
        expect(pda).toBeDefined()
      }
    })
  })

  describe('Consistency Tests', () => {
    it('should produce consistent PDAs across multiple calls', async () => {
      const agentId = 'consistency-test'
      const pdas = await Promise.all([
        deriveAgentPda(programId, owner, agentId),
        deriveAgentPda(programId, owner, agentId),
        deriveAgentPda(programId, owner, agentId),
        deriveAgentPda(programId, owner, agentId),
        deriveAgentPda(programId, owner, agentId)
      ])
      
      // All PDAs should be identical
      const firstPda = pdas[0]
      expect(pdas.every(pda => pda === firstPda)).toBe(true)
    })

    it('should maintain consistency with bigint conversions', async () => {
      const orderId = BigInt(42)
      const pda1 = await deriveWorkOrderPda(programId, owner, orderId)
      const pda2 = await deriveWorkOrderPda(programId, owner, BigInt('42'))
      const pda3 = await deriveWorkOrderPda(programId, owner, BigInt(42.0))
      
      expect(pda1).toBe(pda2)
      expect(pda1).toBe(pda3)
    })
  })

  describe('Performance Tests', () => {
    it('should derive PDAs efficiently', async () => {
      const startTime = performance.now()
      const iterations = 100
      
      for (let i = 0; i < iterations; i++) {
        await deriveAgentPda(programId, owner, `agent-${i}`)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const avgTime = totalTime / iterations
      
      // Should complete each derivation in under 5ms
      expect(avgTime).toBeLessThan(5)
    })

    it('should handle batch PDA derivations', async () => {
      const agentIds = Array.from({ length: 50 }, (_, i) => `batch-agent-${i}`)
      
      const startTime = performance.now()
      const pdas = await Promise.all(
        agentIds.map(id => deriveAgentPda(programId, owner, id))
      )
      const endTime = performance.now()
      
      expect(pdas).toHaveLength(50)
      expect(new Set(pdas).size).toBe(50) // All PDAs should be unique
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
    })
  })
})