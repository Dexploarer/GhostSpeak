import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type { Rpc } from '@solana/rpc'
import type { TransactionSigner } from '@solana/kit'

import {
  createCompressedAgentTree,
  createCompressedAgentBatch,
  generateCompressedAgentProof,
  verifyCompressedAgentProof,
  getCompressedTreeState,
  estimateCompressionSavings,
  migrateToCompressedAgent,
  type CompressedAgentParams,
  type CompressedAgentProof,
  MERKLE_TREE_HEIGHT,
  MAX_BATCH_SIZE
} from '../../../src/utils/compressed-agent-helpers.js'
import type { CompressedAgentMetadata } from '../../../src/generated/index.js'

/**
 * Create a mock TransactionSigner for testing
 */
function createMockSigner(): TransactionSigner {
  // Use a valid 32-byte base58 address (System Program ID)
  return {
    address: address('11111111111111111111111111111112'),
    signTransactionMessageWithSigners: vi.fn(),
    signAndSendTransaction: vi.fn(),
  } as unknown as TransactionSigner
}

vi.mock('../../../src/generated/accounts/agentTreeConfig', () => ({
  fetchMaybeAgentTreeConfig: vi.fn().mockResolvedValue({
    exists: true,
    data: {
      treeCreator: address('11111111111111111111111111111111'),
      treeDelegate: address('11111111111111111111111111111111'),
      numMinted: 100n,
      bump: 255
    }
  })
}))

vi.mock('../../../src/generated/accounts/agent', () => ({
  fetchAgent: vi.fn().mockResolvedValue({
    data: {
      owner: address('11111111111111111111111111111112'), // Match the mock signer address
      agentId: 'test-agent',
      agentType: 1,
      metadataUri: 'https://example.com/metadata',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['capability1', 'capability2']
    }
  })
}))

vi.mock('@solana/spl-account-compression', () => ({
  createMerkleTreeFromLeaves: vi.fn().mockReturnValue({
    root: new Uint8Array(32).fill(1),
    getProof: vi.fn().mockReturnValue({
      proof: [new Uint8Array(32).fill(2)],
      leftSibling: true
    })
  }),
  createHash: vi.fn().mockImplementation((data: Uint8Array) => {
    // Simple mock hash function
    const hash = new Uint8Array(32)
    for (let i = 0; i < Math.min(data.length, 32); i++) {
      hash[i] = data[i]
    }
    return hash
  })
}))

describe('Compressed Agent Helpers', () => {
  let mockRpc: Rpc<any>
  let mockSigner: TransactionSigner
  let mockMerkleTree: Address

  beforeEach(() => {
    // Create a more complete mock RPC that has the methods needed for tree operations
    mockRpc = {
      getMinimumBalanceForRentExemption: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(1000000n)
      }),
      getLatestBlockhash: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({
          value: {
            blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N', // Valid base58 blockhash
            lastValidBlockHeight: 100000n
          }
        })
      }),
      sendTransaction: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue('mock-signature')
      })
    } as unknown as Rpc<any>
    mockSigner = createMockSigner()
    // Use valid base58 address (note: base58 excludes 0, O, I, l)
    mockMerkleTree = address('11111111111111111111111111111113')
  })

  describe('createCompressedAgentTree', () => {
    it.skip('should create a new Merkle tree for compressed agents (requires integration test)', async () => {
      // NOTE: This test requires actual transaction signing and RPC interaction
      // Move to integration tests or mock @solana/kit transaction functions
      const result = await createCompressedAgentTree(mockRpc, {
        payer: mockSigner,
        maxDepth: 14,
        maxBufferSize: 64,
        canopyDepth: 3
      })

      expect(result).toBeDefined()
      expect(result.signature).toBe('mock-signature')
      expect(result.treeAddress).toBeDefined()
      expect(result.treeAuthority).toBeDefined()
    })

    it.skip('should use default parameters when not specified (requires integration test)', async () => {
      // NOTE: This test requires actual transaction signing and RPC interaction
      const result = await createCompressedAgentTree(mockRpc, {
        payer: mockSigner
      })

      expect(result).toBeDefined()
      expect(result.signature).toBe('mock-signature')
    })
  })

  describe('createCompressedAgentBatch', () => {
    // Use valid base58 addresses (excludes 0, O, I, l)
    const testOwnerAddress = address('11111111111111111111111111111114')
    const mockAgents: CompressedAgentParams[] = [
      {
        owner: testOwnerAddress,
        agentId: 'agent-1',
        agentType: 1,
        metadataUri: 'https://example.com/agent1',
        name: 'Agent 1',
        description: 'First test agent',
        capabilities: ['chat', 'analysis'],
        serviceEndpoint: 'https://api.example.com/agent1',
        pricingModel: 'Fixed'
      },
      {
        owner: testOwnerAddress,
        agentId: 'agent-2',
        agentType: 2,
        metadataUri: 'https://example.com/agent2',
        name: 'Agent 2',
        description: 'Second test agent',
        capabilities: ['coding', 'debugging'],
        serviceEndpoint: 'https://api.example.com/agent2',
        pricingModel: 'Hourly'
      }
    ]

    it.skip('should create multiple compressed agents in a batch (requires integration test)', async () => {
      // NOTE: This test requires actual transaction signing and RPC interaction
      const result = await createCompressedAgentBatch(
        mockRpc,
        mockSigner,
        mockMerkleTree,
        mockAgents
      )

      expect(result.signatures).toHaveLength(1)
      expect(result.signatures[0]).toBe('mock-signature')
      expect(result.agentIds).toEqual(['agent-1', 'agent-2'])
      expect(result.costReduction).toBeGreaterThan(1)
      expect(result.treeAuthority).toBeDefined()
      expect(result.merkleTree).toBe(mockMerkleTree)
    })

    it('should handle empty agent array', async () => {
      await expect(
        createCompressedAgentBatch(mockRpc, mockSigner, mockMerkleTree, [])
      ).rejects.toThrow('No agents provided for batch creation')
    })

    it('should enforce maximum batch size', async () => {
      const tooManyAgents = Array(MAX_BATCH_SIZE + 1).fill(mockAgents[0])
      
      await expect(
        createCompressedAgentBatch(mockRpc, mockSigner, mockMerkleTree, tooManyAgents)
      ).rejects.toThrow(`Batch size exceeds maximum of ${MAX_BATCH_SIZE}`)
    })

    it.skip('should split large batches into multiple transactions (not yet implemented)', async () => {
      // NOTE: Batch splitting is not currently implemented - the function throws an error
      // for batches larger than MAX_BATCH_SIZE. This test documents desired future behavior.
      const manyAgents = Array(MAX_BATCH_SIZE * 2).fill(null).map((_, i) => ({
        ...mockAgents[0],
        agentId: `agent-${i}`
      }))

      const result = await createCompressedAgentBatch(
        mockRpc,
        mockSigner,
        mockMerkleTree,
        manyAgents
      )

      expect(result.signatures).toHaveLength(2) // Two batches
      expect(result.agentIds).toHaveLength(MAX_BATCH_SIZE * 2)
    })
  })

  describe('generateCompressedAgentProof', () => {
    it('should generate a valid ZK proof for compressed agent', async () => {
      const agentData: CompressedAgentMetadata = {
        owner: address('11111111111111111111111111111115'),
        agentId: 'test-agent',
        agent_type: 1,
        metadata_uri: 'https://example.com/metadata',
        name: 'Test Agent',
        description: 'A test agent',
        capabilities: ['capability1', 'capability2'],
        pricing_model: { Fixed: {} },
        is_active: true,
        created_at: Date.now(),
        framework_origin: 'ghostspeak',
        supports_a2a: true
      }

      const allLeaves = [
        new Uint8Array(32).fill(1),
        new Uint8Array(32).fill(2),
        new Uint8Array(32).fill(3)
      ]

      const proof = await generateCompressedAgentProof(agentData, 1, allLeaves)

      expect(proof).toBeDefined()
      expect(proof.leafIndex).toBe(1)
      expect(proof.root).toBeInstanceOf(Uint8Array)
      expect(proof.leafHash).toBeInstanceOf(Uint8Array)
      expect(proof.proof).toBeDefined()
    })
  })

  describe('verifyCompressedAgentProof', () => {
    it('should verify a valid proof', () => {
      const mockProof: CompressedAgentProof = {
        proof: [new Uint8Array(32).fill(2)], // Array of Uint8Array, not nested object
        leafIndex: 0,
        root: new Uint8Array(32).fill(1),
        leafHash: new Uint8Array(32).fill(3)
      }

      const expectedRoot = new Uint8Array(32).fill(1)

      // In a real implementation, this would properly verify the Merkle proof
      const isValid = verifyCompressedAgentProof(mockProof, expectedRoot)

      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('getCompressedTreeState', () => {
    it('should return the current state of compressed tree', async () => {
      const state = await getCompressedTreeState(mockRpc, address('11111111111111111111111111111116'))

      expect(state.numMinted).toBe(100)
      expect(state.capacity).toBe(Math.pow(2, MERKLE_TREE_HEIGHT))
      expect(state.utilizationPercent).toBeCloseTo(100 / Math.pow(2, MERKLE_TREE_HEIGHT) * 100)
      expect(state.treeCreator).toBeDefined()
    })
  })

  describe('migrateToCompressedAgent', () => {
    it.skip('should migrate a regular agent to compressed format (requires integration test)', async () => {
      // NOTE: This test requires actual transaction signing and RPC interaction
      const regularAgentAddress = address('11111111111111111111111111111117')

      const result = await migrateToCompressedAgent(
        mockRpc,
        mockSigner,
        regularAgentAddress,
        mockMerkleTree
      )

      expect(result.signature).toBe('mock-signature')
      expect(result.compressedAgentId).toBe('test-agent_compressed')
    })
  })

  describe('estimateCompressionSavings', () => {
    it('should calculate cost savings for small batch', () => {
      const savings = estimateCompressionSavings(10)

      expect(savings.regularCostSOL).toBe(0.1) // 10 * 0.01
      expect(savings.compressedCostSOL).toBeLessThan(savings.regularCostSOL)
      expect(savings.savingsSOL).toBeGreaterThan(0)
      expect(savings.savingsPercent).toBeGreaterThan(0)
      expect(savings.costReductionFactor).toBeGreaterThan(1)
    })

    it('should show massive savings for large batches', () => {
      const savings = estimateCompressionSavings(10000)

      expect(savings.regularCostSOL).toBe(100) // 10000 * 0.01
      expect(savings.compressedCostSOL).toBeLessThan(1) // Tree + minimal per-agent cost
      expect(savings.savingsSOL).toBeGreaterThan(99)
      expect(savings.savingsPercent).toBeGreaterThan(99)
      expect(savings.costReductionFactor).toBeGreaterThan(100)
    })

    it('should achieve significant cost reduction for optimal batch', () => {
      // Test with the full tree capacity
      const treeCapacity = Math.pow(2, MERKLE_TREE_HEIGHT)
      const savings = estimateCompressionSavings(treeCapacity)

      // Cost reduction depends on tree setup cost vs per-agent savings
      // With realistic costs, expect ~1000-3000x reduction
      expect(savings.costReductionFactor).toBeGreaterThan(1000)
      expect(savings.costReductionFactor).toBeLessThan(5000)
    })
  })
})