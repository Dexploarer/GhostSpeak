import { describe, it, expect, beforeAll } from 'vitest'
import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import { generateKeyPairSigner } from '@solana/signers'
import type { TransactionSigner } from '@solana/kit'
import { airdropFactory } from '@solana-program/system'
import { GhostSpeakClient } from '../../src/client/GhostSpeakClient'
import type { CompressedAgentParams } from '../../src/utils/compressed-agent-helpers'

describe('Compressed Agents Integration', () => {
  let client: GhostSpeakClient
  let payer: TransactionSigner
  let merkleTree: string
  let treeAuthority: string

  beforeAll(async () => {
    // Initialize connection and client
    const rpc = createSolanaRpc(process.env.RPC_URL || 'http://localhost:8899')
    payer = await generateKeyPairSigner()
    
    // Airdrop SOL for testing
    const airdrop = airdropFactory({ rpc })
    await airdrop({
      commitment: 'confirmed',
      recipientAddress: payer.address,
      lamports: 2_000_000_000n, // 2 SOL
    })

    client = new GhostSpeakClient({
      rpc,
      programId: address(process.env.PROGRAM_ID || 'GHOSTSPEAKProgramAddress'),
    })
  })

  describe('Tree Creation', () => {
    it('should create a new Merkle tree for compressed agents', async () => {
      const result = await client.agents.createCompressedTree(payer, {
        maxDepth: 10, // Smaller tree for testing
        canopyDepth: 2
      })

      expect(result.signature).toBeTruthy()
      expect(result.treeAddress).toBeTruthy()
      expect(result.treeAuthority).toBeTruthy()

      merkleTree = result.treeAddress
      treeAuthority = result.treeAuthority

      console.log('Created tree:', {
        tree: merkleTree,
        authority: treeAuthority,
        signature: result.signature
      })
    })

    it('should get tree state after creation', async () => {
      const state = await client.agents.getTreeState(address(treeAuthority))

      expect(state.numMinted).toBe(0)
      expect(state.capacity).toBe(Math.pow(2, 10)) // 1024 for depth 10
      expect(state.utilizationPercent).toBe(0)
      expect(state.treeCreator).toBe(payer.address)
    })
  })

  describe('Single Agent Creation', () => {
    it('should create a compressed agent with metadata', async () => {
      const result = await client.agents.createCompressedAgentWithMetadata(payer, {
        merkleTree: address(merkleTree),
        name: 'Test AI Agent',
        description: 'A test agent for integration testing',
        category: 'coding',
        capabilities: ['testing', 'debugging', 'automation'],
        serviceEndpoint: 'https://test.example.com/agent'
      })

      expect(result.signature).toBeTruthy()
      expect(result.agentId).toContain('compressed_agent_')
      expect(result.treeAuthority).toBe(address(treeAuthority))

      console.log('Created compressed agent:', {
        agentId: result.agentId,
        signature: result.signature
      })
    })

    it('should update tree state after agent creation', async () => {
      const state = await client.agents.getTreeState(address(treeAuthority))

      expect(state.numMinted).toBe(1)
      expect(state.utilizationPercent).toBeGreaterThan(0)
      expect(state.utilizationPercent).toBeLessThan(1)
    })
  })

  describe('Batch Creation', () => {
    it('should create multiple agents in a single batch', async () => {
      const agents: CompressedAgentParams[] = Array(5).fill(null).map((_, i) => ({
        owner: payer.address,
        agentId: `batch_agent_${i}_${Date.now()}`,
        agentType: (i % 4) + 1,
        name: `Batch Agent ${i}`,
        description: `Test batch agent number ${i}`,
        capabilities: ['capability1', 'capability2'],
        metadataUri: `https://test.example.com/agent${i}`,
        serviceEndpoint: `https://api.test.com/agent${i}`,
        pricingModel: 'Fixed' as const
      }))

      const result = await client.agents.createCompressedBatch(
        payer,
        address(merkleTree),
        agents
      )

      expect(result.signatures).toHaveLength(1) // All in one transaction
      expect(result.agentIds).toHaveLength(5)
      expect(result.costReduction).toBeGreaterThan(100) // Should be significantly cheaper
      expect(result.merkleTree).toBe(address(merkleTree))

      console.log('Batch creation result:', {
        agentCount: result.agentIds.length,
        costReduction: `${result.costReduction}x`,
        signature: result.signatures[0]
      })
    })

    it('should correctly update tree state after batch', async () => {
      const state = await client.agents.getTreeState(address(treeAuthority))

      expect(state.numMinted).toBe(6) // 1 from single + 5 from batch
      expect(state.utilizationPercent).toBeCloseTo(6 / 1024 * 100, 1)
    })
  })

  describe('Cost Estimation', () => {
    it('should accurately estimate cost savings', () => {
      // Test various batch sizes
      const testCases = [
        { agents: 10, minReduction: 10 },
        { agents: 100, minReduction: 100 },
        { agents: 1000, minReduction: 1000 },
        { agents: 10000, minReduction: 4000 }
      ]

      testCases.forEach(({ agents, minReduction }) => {
        const savings = client.agents.estimateSavings(agents)

        expect(savings.regularCostSOL).toBeGreaterThan(0)
        expect(savings.compressedCostSOL).toBeGreaterThan(0)
        expect(savings.compressedCostSOL).toBeLessThan(savings.regularCostSOL)
        expect(savings.savingsSOL).toBeGreaterThan(0)
        expect(savings.savingsPercent).toBeGreaterThan(90) // At least 90% savings
        expect(savings.costReductionFactor).toBeGreaterThan(minReduction)

        console.log(`Cost estimation for ${agents} agents:`, {
          regularCost: `${savings.regularCostSOL.toFixed(4)} SOL`,
          compressedCost: `${savings.compressedCostSOL.toFixed(4)} SOL`,
          savings: `${savings.savingsPercent.toFixed(1)}%`,
          reduction: `${Math.round(savings.costReductionFactor)}x`
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty batch gracefully', async () => {
      await expect(
        client.agents.createCompressedBatch(payer, address(merkleTree), [])
      ).rejects.toThrow('No agents provided')
    })

    it('should handle very long agent IDs', async () => {
      const longId = 'a'.repeat(32) // Maximum allowed length
      
      const result = await client.agents.createCompressedAgent(payer, {
        merkleTree: address(merkleTree),
        agentType: 1,
        metadataUri: 'https://test.com/metadata',
        agentId: longId
      })

      expect(result.signature).toBeTruthy()
    })

    it('should reject agent IDs that are too long', async () => {
      const tooLongId = 'a'.repeat(33) // One char over limit
      
      await expect(
        client.agents.createCompressedAgent(payer, {
          merkleTree: address(merkleTree),
          agentType: 1,
          metadataUri: 'https://test.com/metadata',
          agentId: tooLongId
        })
      ).rejects.toThrow()
    })
  })

  describe('Performance', () => {
    it('should demonstrate significant performance improvement', async () => {
      // Create a reasonable batch to test performance
      const batchSize = 8 // Maximum single transaction batch
      const agents: CompressedAgentParams[] = Array(batchSize).fill(null).map((_, i) => ({
        owner: payer.address,
        agentId: `perf_agent_${i}_${Date.now()}`,
        agentType: 1,
        name: `Performance Test Agent ${i}`,
        description: 'Testing batch performance',
        capabilities: ['performance', 'testing'],
        metadataUri: 'https://test.com/perf',
        pricingModel: 'Fixed' as const
      }))

      const startTime = Date.now()
      const result = await client.agents.createCompressedBatch(
        payer,
        address(merkleTree),
        agents
      )
      const endTime = Date.now()

      const timePerAgent = (endTime - startTime) / batchSize

      console.log('Performance metrics:', {
        totalTime: `${endTime - startTime}ms`,
        timePerAgent: `${timePerAgent.toFixed(2)}ms`,
        agentsCreated: batchSize,
        costReduction: `${result.costReduction}x`
      })

      expect(timePerAgent).toBeLessThan(1000) // Should be under 1 second per agent
    })
  })
})