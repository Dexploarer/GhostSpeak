/**
 * Bulk Deals Integration Tests
 * 
 * Comprehensive test suite for bulk deal functionality including
 * volume tiers, enterprise pricing, and batch execution.
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'
import { 
  Keypair,
  createSignerFromKeypair,
  generateKeyPairSigner,
  type Address,
  type TransactionSigner
} from '@solana/kit'
import { 
  GhostSpeakClient,
  type VolumeTier,
  type DealType
} from '../src/index.js'

// Mock RPC responses
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getRecentBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'MockBlockhash123',
      lastValidBlockHeight: 100
    }),
    getMinimumBalanceForRentExemption: jest.fn().mockResolvedValue(1000000),
    sendTransaction: jest.fn().mockResolvedValue('MockSignature123'),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    getAccountInfo: jest.fn().mockResolvedValue(null),
    getMultipleAccountsInfo: jest.fn().mockResolvedValue([])
  }))
}))

describe('Bulk Deals Integration Tests', () => {
  let client: GhostSpeakClient
  let enterprise: TransactionSigner
  let agent: TransactionSigner
  let bulkDealPda: Address

  beforeAll(async () => {
    // Initialize client
    client = new GhostSpeakClient({
      rpcEndpoint: 'http://localhost:8899',
      commitment: 'confirmed'
    })

    // Generate test signers
    enterprise = await generateKeyPairSigner()
    agent = await generateKeyPairSigner()
    
    // Mock PDA
    bulkDealPda = 'BulkDealPDA123' as Address
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('Bulk Deal Creation', () => {
    test('should create bulk deal with valid parameters', async () => {
      const params = {
        dealId: 1001n,
        dealType: { volumeDiscount: {} } as DealType,
        agent: agent.address,
        minimumVolume: 100n,
        maximumVolume: 10000n
      }

      // Mock successful transaction
      const mockSignature = 'BulkDealCreateSig123' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.createBulkDeal(
        enterprise,
        bulkDealPda,
        params
      )

      expect(signature).toBe(mockSignature)
      expect(client.bulkDeals.sendTransaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object)]),
        [enterprise]
      )
    })

    test('should create enterprise tier bulk deal', async () => {
      const params = {
        dealId: 2001n,
        dealType: { enterpriseTier: {} } as DealType,
        agent: agent.address,
        minimumVolume: 1000n,
        maximumVolume: 100000n
      }

      const mockSignature = 'EnterpriseDealSig456' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.createBulkDeal(
        enterprise,
        'EnterpriseDealPDA' as Address,
        params
      )

      expect(signature).toBe(mockSignature)
    })

    test('should create subscription-based bulk deal', async () => {
      const params = {
        dealId: 3001n,
        dealType: { subscription: {} } as DealType,
        minimumVolume: 500n,
        maximumVolume: 50000n
      }

      const mockSignature = 'SubscriptionDealSig789' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.createBulkDeal(
        enterprise,
        'SubscriptionDealPDA' as Address,
        params
      )

      expect(signature).toBe(mockSignature)
    })
  })

  describe('Batch Execution', () => {
    test('should execute batch transactions', async () => {
      const params = {
        bulkDeal: bulkDealPda,
        batchSize: 10,
        totalVolume: 1000n
      }

      const mockSignature = 'BatchExecSig123' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.executeBatch(
        enterprise,
        params
      )

      expect(signature).toBe(mockSignature)
    })

    test('should handle large batch execution', async () => {
      const params = {
        bulkDeal: bulkDealPda,
        batchSize: 100,
        totalVolume: 50000n
      }

      const mockSignature = 'LargeBatchSig456' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.executeBatch(
        enterprise,
        params
      )

      expect(signature).toBe(mockSignature)
    })

    test('should handle multiple batch executions', async () => {
      const batches = [
        { batchSize: 10, totalVolume: 1000n },
        { batchSize: 25, totalVolume: 2500n },
        { batchSize: 50, totalVolume: 5000n }
      ]

      const mockSignatures = batches.map((_, i) => `MultiBatchSig${i}` as any)
      mockSignatures.forEach(sig => {
        jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(sig)
      })

      const results = await Promise.all(
        batches.map((batch, i) => 
          client.bulkDeals.executeBatch(
            enterprise,
            {
              bulkDeal: bulkDealPda,
              ...batch
            }
          )
        )
      )

      expect(results).toHaveLength(3)
      results.forEach((sig, i) => {
        expect(sig).toBe(mockSignatures[i])
      })
    })
  })

  describe('Volume Tier Pricing', () => {
    test('should calculate tier pricing correctly', () => {
      const tiers: VolumeTier[] = [
        { minQuantity: 0, maxQuantity: 100, discountPercentage: 0 },
        { minQuantity: 100, maxQuantity: 500, discountPercentage: 5 },
        { minQuantity: 500, maxQuantity: 1000, discountPercentage: 10 },
        { minQuantity: 1000, maxQuantity: 5000, discountPercentage: 15 },
        { minQuantity: 5000, maxQuantity: 999999, discountPercentage: 20 }
      ]

      // Test various volumes
      const result1 = client.bulkDeals.calculateTierPricing(50, tiers)
      expect(result1?.discount).toBe(0)

      const result2 = client.bulkDeals.calculateTierPricing(250, tiers)
      expect(result2?.discount).toBe(5)

      const result3 = client.bulkDeals.calculateTierPricing(750, tiers)
      expect(result3?.discount).toBe(10)

      const result4 = client.bulkDeals.calculateTierPricing(2500, tiers)
      expect(result4?.discount).toBe(15)

      const result5 = client.bulkDeals.calculateTierPricing(10000, tiers)
      expect(result5?.discount).toBe(20)
    })

    test('should handle edge cases in tier calculation', () => {
      const tiers: VolumeTier[] = [
        { minQuantity: 100, maxQuantity: 500, discountPercentage: 10 },
        { minQuantity: 500, maxQuantity: 1000, discountPercentage: 20 }
      ]

      // Volume below minimum tier
      const result1 = client.bulkDeals.calculateTierPricing(50, tiers)
      expect(result1).toBeNull()

      // Volume exactly at tier boundary
      const result2 = client.bulkDeals.calculateTierPricing(500, tiers)
      expect(result2?.discount).toBe(20)

      // Empty tiers
      const result3 = client.bulkDeals.calculateTierPricing(100, [])
      expect(result3).toBeNull()
    })

    test('should handle complex tier structures', () => {
      const complexTiers: VolumeTier[] = [
        { minQuantity: 0, maxQuantity: 10, discountPercentage: 0 },
        { minQuantity: 10, maxQuantity: 50, discountPercentage: 2 },
        { minQuantity: 50, maxQuantity: 100, discountPercentage: 5 },
        { minQuantity: 100, maxQuantity: 250, discountPercentage: 7 },
        { minQuantity: 250, maxQuantity: 500, discountPercentage: 10 },
        { minQuantity: 500, maxQuantity: 1000, discountPercentage: 12 },
        { minQuantity: 1000, maxQuantity: 2500, discountPercentage: 15 },
        { minQuantity: 2500, maxQuantity: 5000, discountPercentage: 18 },
        { minQuantity: 5000, maxQuantity: 10000, discountPercentage: 20 },
        { minQuantity: 10000, maxQuantity: 999999, discountPercentage: 25 }
      ]

      const testCases = [
        { volume: 5, expected: 0 },
        { volume: 25, expected: 2 },
        { volume: 75, expected: 5 },
        { volume: 150, expected: 7 },
        { volume: 350, expected: 10 },
        { volume: 750, expected: 12 },
        { volume: 1500, expected: 15 },
        { volume: 3500, expected: 18 },
        { volume: 7500, expected: 20 },
        { volume: 15000, expected: 25 }
      ]

      testCases.forEach(({ volume, expected }) => {
        const result = client.bulkDeals.calculateTierPricing(volume, complexTiers)
        expect(result?.discount).toBe(expected)
      })
    })
  })

  describe('Enterprise Scenarios', () => {
    test('should handle SaaS provider bulk deal', async () => {
      // SaaS provider purchasing AI agent services in bulk
      const saasParams = {
        dealId: 4001n,
        dealType: { subscription: {} } as DealType,
        agent: agent.address,
        minimumVolume: 10000n, // 10,000 API calls minimum
        maximumVolume: 1000000n // Up to 1M API calls
      }

      const mockSignature = 'SaaSDealSig123' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.createBulkDeal(
        enterprise,
        'SaaSDealPDA' as Address,
        saasParams
      )

      expect(signature).toBe(mockSignature)

      // Execute monthly batch
      const batchParams = {
        bulkDeal: 'SaaSDealPDA' as Address,
        batchSize: 100,
        totalVolume: 50000n // 50k calls this month
      }

      const batchSignature = 'SaaSBatchSig456' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(batchSignature)

      const batchResult = await client.bulkDeals.executeBatch(
        enterprise,
        batchParams
      )

      expect(batchResult).toBe(batchSignature)
    })

    test('should handle marketplace aggregator bulk deal', async () => {
      // Marketplace aggregating multiple agent services
      const aggregatorParams = {
        dealId: 5001n,
        dealType: { volumeDiscount: {} } as DealType,
        minimumVolume: 5000n,
        maximumVolume: 500000n
      }

      const mockSignature = 'AggregatorDealSig789' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.createBulkDeal(
        enterprise,
        'AggregatorDealPDA' as Address,
        aggregatorParams
      )

      expect(signature).toBe(mockSignature)
    })

    test('should handle corporate licensing deal', async () => {
      // Corporation licensing AI agents for internal use
      const licenseParams = {
        dealId: 6001n,
        dealType: { enterpriseTier: {} } as DealType,
        agent: agent.address,
        minimumVolume: 100n, // 100 seat minimum
        maximumVolume: 10000n // Up to 10k seats
      }

      const mockSignature = 'LicenseDealSig321' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.createBulkDeal(
        enterprise,
        'LicenseDealPDA' as Address,
        licenseParams
      )

      expect(signature).toBe(mockSignature)
    })
  })

  describe('Error Handling', () => {
    test('should handle RPC errors gracefully', async () => {
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockRejectedValueOnce(
        new Error('RPC Error: Connection timeout')
      )

      await expect(
        client.bulkDeals.createBulkDeal(
          enterprise,
          bulkDealPda,
          {
            dealId: 9999n,
            dealType: { volumeDiscount: {} } as DealType,
            minimumVolume: 100n,
            maximumVolume: 1000n
          }
        )
      ).rejects.toThrow('RPC Error')
    })

    test('should handle invalid batch size', async () => {
      // In production, this would be validated on-chain
      const params = {
        bulkDeal: bulkDealPda,
        batchSize: 0, // Invalid
        totalVolume: 1000n
      }

      jest.spyOn(client.bulkDeals, 'sendTransaction').mockRejectedValueOnce(
        new Error('Invalid batch size')
      )

      await expect(
        client.bulkDeals.executeBatch(enterprise, params)
      ).rejects.toThrow('Invalid batch size')
    })

    test('should handle insufficient volume', async () => {
      const params = {
        bulkDeal: bulkDealPda,
        batchSize: 10,
        totalVolume: 50n // Below minimum
      }

      jest.spyOn(client.bulkDeals, 'sendTransaction').mockRejectedValueOnce(
        new Error('Volume below minimum threshold')
      )

      await expect(
        client.bulkDeals.executeBatch(enterprise, params)
      ).rejects.toThrow('Volume below minimum threshold')
    })
  })

  describe('Performance and Scale', () => {
    test('should handle high-frequency batch execution', async () => {
      // Simulate rapid batch execution
      const batches = Array(10).fill(null).map((_, i) => ({
        batchSize: 50 + i * 10,
        totalVolume: BigInt(5000 + i * 1000)
      }))

      const mockSignatures = batches.map((_, i) => `RapidBatchSig${i}` as any)
      let callCount = 0
      
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockImplementation(async () => {
        // Simulate some rate limiting
        if (callCount >= 7) {
          throw new Error('Rate limit exceeded')
        }
        return mockSignatures[callCount++]
      })

      const results = await Promise.allSettled(
        batches.map(batch => 
          client.bulkDeals.executeBatch(
            enterprise,
            {
              bulkDeal: bulkDealPda,
              ...batch
            }
          )
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      expect(successful.length).toBe(7)
      expect(failed.length).toBe(3)
    })

    test('should optimize tier calculation for large datasets', () => {
      // Generate large tier structure
      const largeTiers: VolumeTier[] = Array(100).fill(null).map((_, i) => ({
        minQuantity: i * 100,
        maxQuantity: (i + 1) * 100,
        discountPercentage: Math.min(i * 0.5, 30) // Cap at 30%
      }))

      const startTime = Date.now()
      
      // Test multiple calculations
      for (let i = 0; i < 1000; i++) {
        const volume = Math.floor(Math.random() * 10000)
        client.bulkDeals.calculateTierPricing(volume, largeTiers)
      }
      
      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Should complete 1000 calculations in under 100ms
      expect(executionTime).toBeLessThan(100)
    })
  })

  describe('Integration with Other Features', () => {
    test('should integrate with marketplace listings', async () => {
      // Create bulk deal for marketplace listed service
      const marketplaceParams = {
        dealId: 7001n,
        dealType: { volumeDiscount: {} } as DealType,
        agent: agent.address,
        minimumVolume: 1000n,
        maximumVolume: 100000n
      }

      const mockSignature = 'MarketplaceBulkSig123' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.createBulkDeal(
        enterprise,
        'MarketplaceBulkPDA' as Address,
        marketplaceParams
      )

      expect(signature).toBe(mockSignature)
    })

    test('should integrate with escrow for bulk payments', async () => {
      // Execute batch with escrow integration
      const escrowBatchParams = {
        bulkDeal: 'EscrowBulkPDA' as Address,
        batchSize: 25,
        totalVolume: 2500n
      }

      const mockSignature = 'EscrowBulkBatchSig456' as any
      jest.spyOn(client.bulkDeals, 'sendTransaction').mockResolvedValueOnce(mockSignature)

      const signature = await client.bulkDeals.executeBatch(
        enterprise,
        escrowBatchParams
      )

      expect(signature).toBe(mockSignature)
    })
  })
})