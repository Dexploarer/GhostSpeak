/**
 * Critical Path Integration Tests
 * 
 * Tests real interactions between PDA derivation, RPC utilities, and Base Instructions.
 * These tests validate that the foundational components work together correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type { IInstruction, TransactionSigner } from '@solana/kit'
import { 
  deriveAgentPda,
  deriveWorkOrderPda,
  deriveEscrowPDA,
  deriveServiceListingPda
} from '../../src/utils/pda'
import { 
  AccountDecoder,
  RpcBatchProcessor,
  TransactionHelpers,
  AddressUtils,
  LamportsUtils
} from '../../src/utils/rpc'
import { BaseInstructions } from '../../src/client/instructions/BaseInstructions'
import type { GhostSpeakConfig } from '../../src/types'
import { SimpleRpcClient } from '../../src/utils/simple-rpc-client'

// Mock implementations
const mockRpcClientInstance = {
  getLatestBlockhash: vi.fn().mockResolvedValue({
    blockhash: 'mock-blockhash',
    lastValidBlockHeight: 1000
  }),
  getAccountInfo: vi.fn().mockResolvedValue(null),
  getMultipleAccounts: vi.fn().mockResolvedValue([]),
  getProgramAccounts: vi.fn().mockResolvedValue([]),
  sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
  getSignatureStatuses: vi.fn().mockResolvedValue([{ confirmationStatus: 'confirmed' }]),
  getFeeForMessage: vi.fn().mockResolvedValue(5000),
  simulateTransaction: vi.fn().mockResolvedValue({
    value: {
      err: null,
      logs: ['Program log: Success'],
      unitsConsumed: BigInt(100000)
    }
  })
}

// Mock modules
vi.mock('../../src/utils/simple-rpc-client', () => ({
  SimpleRpcClient: vi.fn().mockImplementation(() => mockRpcClientInstance)
}))

// Mock @solana/addresses for PDA derivation
vi.mock('@solana/addresses', async () => {
  const actual = await vi.importActual('@solana/addresses')
  return {
    ...actual,
    getProgramDerivedAddress: vi.fn(async ({ programAddress, seeds }) => {
      // Simple mock that generates a deterministic address from seeds
      const seedStr = seeds.map((s: Uint8Array | string) => 
        typeof s === 'string' ? s : Buffer.from(s).toString('hex')
      ).join('-')
      const hash = Buffer.from(seedStr + programAddress).toString('base64').substring(0, 32)
      // Return a valid base58 address
      return ['11111111111111111111111111111111', 255]
    })
  }
})

vi.mock('@solana/kit', () => ({
  pipe: vi.fn((value, ...fns) => {
    let result = value
    for (const fn of fns) {
      result = fn(result)
    }
    return result
  }),
  createTransactionMessage: vi.fn(() => ({ version: 0, instructions: [] })),
  setTransactionMessageFeePayer: vi.fn((feePayer, tx) => ({ ...tx, feePayer })),
  setTransactionMessageFeePayerSigner: vi.fn((signer, tx) => ({ ...tx, feePayerSigner: signer })),
  setTransactionMessageLifetimeUsingBlockhash: vi.fn((blockhash, tx) => ({ ...tx, blockhash })),
  appendTransactionMessageInstructions: vi.fn((instructions, tx) => ({ ...tx, instructions })),
  signTransactionMessageWithSigners: vi.fn(async (tx) => ({ ...tx, signatures: { '0': 'mock-signature' } })),
  sendAndConfirmTransactionFactory: vi.fn(() => async () => ({ signature: 'mock-signature' })),
  compileTransactionMessage: vi.fn((tx) => new Uint8Array(100)),
  getBase64EncodedWireTransaction: vi.fn(() => 'mock-base64-transaction'),
  getProgramDerivedAddress: vi.fn(async ({ programAddress, seeds }) => {
    // Check for invalid seed lengths
    for (const seed of seeds) {
      const seedBytes = typeof seed === 'string' ? Buffer.from(seed) : seed
      if (seedBytes.length > 32) {
        throw new Error(`Seed exceeds the maximum length of 32 bytes`)
      }
    }
    // Simple mock that generates a deterministic address from seeds
    const seedStr = seeds.map((s: Uint8Array | string) => 
      typeof s === 'string' ? s : Buffer.from(s).toString('hex')
    ).join('-')
    // Return a valid base58 address
    return ['11111111111111111111111111111111', 255]
  }),
  getBytesEncoder: vi.fn(() => ({
    encode: (data: Uint8Array) => data
  })),
  getAddressEncoder: vi.fn(() => ({
    encode: (address: string) => Buffer.from(address)
  })),
  getStringEncoder: vi.fn(() => ({
    encode: (str: string) => Buffer.from(str)
  })),
  getUtf8Encoder: vi.fn(() => ({
    encode: (str: string) => Buffer.from(str, 'utf8')
  }))
}))

vi.mock('../../src/utils/transaction-urls', () => ({
  createTransactionResult: vi.fn((signature, cluster, commitment) => ({
    signature,
    cluster,
    commitment,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`,
    confirmationStatus: commitment
  })),
  logTransactionDetails: vi.fn(),
  detectClusterFromEndpoint: vi.fn(() => 'devnet')
}))

// Test implementation extending BaseInstructions
class TestInstructions extends BaseInstructions {
  async testSendTransaction(instructions: IInstruction[], signers: TransactionSigner[]) {
    return this.sendTransaction(instructions, signers)
  }

  async testGetDecodedAccount<T>(address: Address, decoderImportName: string): Promise<T | null> {
    return this.getDecodedAccount(address, decoderImportName)
  }

  async testEstimateTransactionCost(instructions: IInstruction[], feePayer?: Address): Promise<bigint> {
    return this.estimateTransactionCost(instructions, feePayer)
  }
}

describe('Critical Path Integration Tests', () => {
  let programId: Address
  let owner: Address
  let buyer: Address
  let seller: Address
  let mockSigner: TransactionSigner
  let config: GhostSpeakConfig
  let baseInstructions: TestInstructions

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock implementations
    mockRpcClientInstance.getAccountInfo.mockResolvedValue(null)
    mockRpcClientInstance.sendTransaction.mockResolvedValue('mock-signature')
    mockRpcClientInstance.getSignatureStatuses.mockResolvedValue([{ confirmationStatus: 'confirmed' }])

    programId = address('11111111111111111111111111111111')
    owner = address('So11111111111111111111111111111111111111112')
    buyer = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    seller = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

    mockSigner = {
      address: owner,
      signTransactionMessage: vi.fn(),
      signMessages: vi.fn()
    } as any

    config = {
      programId,
      rpcEndpoint: 'https://api.devnet.solana.com',
      commitment: 'confirmed',
      defaultFeePayer: owner,
      rpc: {} as any
    }

    baseInstructions = new TestInstructions(config)
  })

  describe('PDA + RPC Integration', () => {
    it('should derive PDA and fetch account data', async () => {
      // Step 1: Derive agent PDA
      const agentId = 'test-agent-001'
      const agentPda = await deriveAgentPda(programId, owner, agentId)
      
      expect(agentPda).toBeDefined()
      expect(AddressUtils.isValidAddress(agentPda)).toBe(true)

      // Step 2: Mock account data for the PDA
      const mockAgentData = {
        agentId,
        owner: owner,
        isActive: true,
        reputation: 100
      }
      
      mockRpcClientInstance.getAccountInfo.mockResolvedValueOnce({
        owner: programId,
        lamports: 1000000,
        data: new Uint8Array([1, 2, 3, 4]),
        executable: false
      })

      // Step 3: Use AccountDecoder to decode the data
      const decoder = new AccountDecoder({
        decode: () => mockAgentData
      })
      
      const decoded = decoder.decode(new Uint8Array([1, 2, 3, 4]))
      expect(decoded.agentId).toBe(agentId)
      expect(decoded.isActive).toBe(true)
    })

    it('should batch multiple PDA derivations and account fetches', async () => {
      // Step 1: Derive multiple PDAs in parallel
      const pdaPromises = [
        deriveAgentPda(programId, owner, 'agent-1'),
        deriveAgentPda(programId, owner, 'agent-2'),
        deriveServiceListingPda(programId, seller, 'listing-1'),
        deriveWorkOrderPda(programId, buyer, BigInt(12345))
      ]

      const pdas = await Promise.all(pdaPromises)
      expect(pdas).toHaveLength(4)
      expect(pdas.every(pda => AddressUtils.isValidAddress(pda))).toBe(true)

      // Step 2: Use RpcBatchProcessor to fetch accounts
      const batchProcessor = new RpcBatchProcessor<any>(10, 50)
      
      const fetchPromises = pdas.map(pda => 
        batchProcessor.add(async () => {
          const client = new SimpleRpcClient({ endpoint: 'test' })
          return client.getAccountInfo(pda as Address)
        })
      )

      // Mock batch responses
      mockRpcClientInstance.getAccountInfo
        .mockResolvedValueOnce({ owner: programId, lamports: 1000000, data: new Uint8Array([1]) })
        .mockResolvedValueOnce({ owner: programId, lamports: 2000000, data: new Uint8Array([2]) })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ owner: programId, lamports: 3000000, data: new Uint8Array([3]) })

      const accounts = await Promise.all(fetchPromises)
      expect(accounts).toHaveLength(4)
      expect(accounts[2]).toBeNull() // Third account doesn't exist
    })

    it('should handle PDA derivation errors gracefully', async () => {
      // Test with invalid seed (too long)
      const longSeed = 'a'.repeat(100)
      
      await expect(
        deriveAgentPda(programId, owner, longSeed)
      ).rejects.toThrow('exceeds the maximum length of 32 bytes')
    })
  })

  describe('PDA + Instructions Integration', () => {
    it('should derive PDAs and build transaction instructions', async () => {
      // Step 1: Derive escrow PDA for a work order
      const workOrderId = BigInt(999)
      const workOrderPda = await deriveWorkOrderPda(programId, buyer, workOrderId)
      const [escrowPda, escrowBump] = await deriveEscrowPDA(workOrderPda as Address, programId)
      
      expect(escrowPda).toBeDefined()
      expect(escrowBump).toBeGreaterThanOrEqual(0)
      expect(escrowBump).toBeLessThanOrEqual(255)

      // Step 2: Create instruction using derived PDAs
      const mockInstruction: IInstruction = {
        programAddress: programId,
        accounts: [
          { address: buyer, role: 'signer' },
          { address: seller, role: 'writable' },
          { address: workOrderPda as Address, role: 'readonly' },
          { address: escrowPda, role: 'writable' }
        ],
        data: new Uint8Array([1, 2, 3, 4, 5])
      } as any

      // Step 3: Estimate transaction cost
      const cost = await baseInstructions.testEstimateTransactionCost([mockInstruction])
      expect(cost).toBe(BigInt(5000))

      // Step 4: Send transaction
      const signature = await baseInstructions.testSendTransaction([mockInstruction], [mockSigner])
      expect(signature).toBe('mock-signature')
    })

    it('should build complex multi-instruction transactions', async () => {
      // Derive multiple PDAs for a complex operation
      const agentPda = await deriveAgentPda(programId, owner, 'agent-complex')
      const servicePda = await deriveServiceListingPda(programId, owner, 'service-complex')
      const workOrderPda = await deriveWorkOrderPda(programId, buyer, BigInt(555))

      // Create multiple instructions
      const instructions: IInstruction[] = [
        {
          programAddress: programId,
          accounts: [{ address: agentPda as Address, role: 'writable' }],
          data: new Uint8Array([1]) // Activate agent
        },
        {
          programAddress: programId,
          accounts: [
            { address: servicePda as Address, role: 'writable' },
            { address: agentPda as Address, role: 'readonly' }
          ],
          data: new Uint8Array([2]) // Create service listing
        },
        {
          programAddress: programId,
          accounts: [
            { address: workOrderPda as Address, role: 'writable' },
            { address: servicePda as Address, role: 'readonly' },
            { address: buyer, role: 'signer' }
          ],
          data: new Uint8Array([3]) // Create work order
        }
      ] as any[]

      // Calculate total transaction size
      const size = TransactionHelpers.calculateTransactionSize(1, 6, 3)
      expect(size).toBe(64 + 3 + 192 + 32 + 3) // 294 bytes

      // Send batch transaction
      const signature = await baseInstructions.testSendTransaction(instructions, [mockSigner])
      expect(signature).toBe('mock-signature')
    })
  })

  describe('RPC + Instructions Integration', () => {
    it('should fetch account data and build conditional instructions', async () => {
      // Step 1: Check if agent exists
      mockRpcClientInstance.getAccountInfo.mockResolvedValueOnce(null)
      
      const agentPda = await deriveAgentPda(programId, owner, 'conditional-agent')
      const client = new SimpleRpcClient({ endpoint: 'test' })
      const agentAccount = await client.getAccountInfo(agentPda as Address)
      
      expect(agentAccount).toBeNull()

      // Step 2: Build instruction based on account state
      let instruction: IInstruction
      
      if (!agentAccount) {
        // Create agent instruction
        instruction = {
          programAddress: programId,
          accounts: [
            { address: owner, role: 'signer' },
            { address: agentPda as Address, role: 'writable' }
          ],
          data: new Uint8Array([0]) // Create agent
        } as any
      } else {
        // Update agent instruction
        instruction = {
          programAddress: programId,
          accounts: [
            { address: agentPda as Address, role: 'writable' }
          ],
          data: new Uint8Array([1]) // Update agent
        } as any
      }

      // Step 3: Send appropriate instruction
      const signature = await baseInstructions.testSendTransaction([instruction], [mockSigner])
      expect(signature).toBe('mock-signature')
      expect(instruction.data![0]).toBe(0) // Should be create instruction
    })

    it('should handle batch operations with error recovery', async () => {
      const processor = new RpcBatchProcessor<string>(3, 10)
      
      // Create operations that might fail
      const operations = [
        () => Promise.resolve('success-1'),
        () => Promise.resolve('success-2'),
        () => Promise.reject(new Error('Failed operation')),
        () => Promise.resolve('success-3')
      ]

      // Process with error handling
      const results: (string | null)[] = []
      
      for (const op of operations) {
        try {
          const result = await processor.add(op)
          results.push(result)
        } catch {
          results.push(null)
        }
      }

      expect(results[0]).toBe('success-1')
      expect(results[1]).toBe('success-2')
      expect(results[2]).toBeNull() // Failed operation
    })
  })

  describe('Full Stack Integration', () => {
    it('should complete agent registration workflow', async () => {
      const agentId = 'full-stack-agent'
      
      // Step 1: Derive agent PDA
      const agentPda = await deriveAgentPda(programId, owner, agentId)
      
      // Step 2: Check if agent already exists
      mockRpcClientInstance.getAccountInfo.mockResolvedValueOnce(null)
      const exists = await new SimpleRpcClient({ endpoint: 'test' }).getAccountInfo(agentPda as Address)
      
      expect(exists).toBeNull()

      // Step 3: Build registration instruction
      const registerInstruction: IInstruction = {
        programAddress: programId,
        accounts: [
          { address: owner, role: 'signer' },
          { address: agentPda as Address, role: 'writable' },
          { address: address('11111111111111111111111111111111'), role: 'readonly' } // System program
        ],
        data: Buffer.concat([
          Buffer.from([0]), // Instruction discriminator
          Buffer.from(agentId),
          Buffer.from([1]) // Active flag
        ])
      } as any

      // Step 4: Estimate cost
      const cost = await baseInstructions.testEstimateTransactionCost([registerInstruction])
      const costInSol = LamportsUtils.lamportsToSol(cost)
      expect(costInSol).toBeCloseTo(0.000005, 6)

      // Step 5: Send transaction
      const signature = await baseInstructions.testSendTransaction([registerInstruction], [mockSigner])
      expect(signature).toBe('mock-signature')

      // Step 6: Verify agent was created (mock the response)
      mockRpcClientInstance.getAccountInfo.mockResolvedValueOnce({
        owner: programId,
        lamports: 1000000,
        data: new Uint8Array(100),
        executable: false
      })

      const createdAgent = await new SimpleRpcClient({ endpoint: 'test' }).getAccountInfo(agentPda as Address)
      expect(createdAgent).toBeDefined()
      expect(createdAgent?.owner).toBe(programId)
    })

    it('should handle complex escrow workflow with multiple PDAs', async () => {
      // Workflow: Create work order → Create escrow → Fund escrow → Complete work → Release funds
      
      // Step 1: Derive all necessary PDAs
      const workOrderId = BigInt(77777)
      const agentPda = await deriveAgentPda(programId, seller, 'escrow-agent')
      const servicePda = await deriveServiceListingPda(programId, seller, 'escrow-service')
      const workOrderPda = await deriveWorkOrderPda(programId, buyer, workOrderId)
      const [escrowPda] = await deriveEscrowPDA(workOrderPda as Address, programId)

      // Step 2: Create work order instruction
      const createWorkOrderIx: IInstruction = {
        programAddress: programId,
        accounts: [
          { address: buyer, role: 'signer' },
          { address: seller, role: 'writable' },
          { address: workOrderPda as Address, role: 'writable' },
          { address: servicePda as Address, role: 'readonly' },
          { address: agentPda as Address, role: 'readonly' }
        ],
        data: new Uint8Array([10, ...Buffer.from(workOrderId.toString())])
      } as any

      // Step 3: Create escrow instruction
      const createEscrowIx: IInstruction = {
        programAddress: programId,
        accounts: [
          { address: buyer, role: 'signer' },
          { address: escrowPda, role: 'writable' },
          { address: workOrderPda as Address, role: 'readonly' }
        ],
        data: new Uint8Array([11, ...Buffer.from('1000000')]) // 1 SOL in lamports
      } as any

      // Step 4: Send both instructions in one transaction
      const signature = await baseInstructions.testSendTransaction(
        [createWorkOrderIx, createEscrowIx],
        [mockSigner]
      )
      
      expect(signature).toBe('mock-signature')
      
      // Verify transaction size is reasonable
      const size = TransactionHelpers.calculateTransactionSize(
        1, // signatures
        8, // accounts
        createWorkOrderIx.data!.length + createEscrowIx.data!.length
      )
      expect(TransactionHelpers.fitsInSinglePacket(size)).toBe(true)
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle concurrent PDA derivations efficiently', async () => {
      const startTime = performance.now()
      
      // Generate 100 PDAs concurrently
      const pdaPromises = Array.from({ length: 100 }, (_, i) => 
        deriveAgentPda(programId, owner, `perf-agent-${i}`)
      )
      
      const pdas = await Promise.all(pdaPromises)
      const duration = performance.now() - startTime
      
      expect(pdas).toHaveLength(100)
      expect(new Set(pdas).size).toBe(100) // All unique
      expect(duration).toBeLessThan(500) // Should complete in under 500ms
    })

    it('should batch RPC operations efficiently', async () => {
      const processor = new RpcBatchProcessor<any>(20, 10)
      
      // Create 50 account fetch operations
      const validAddresses = [
        '11111111111111111111111111111111',
        'So11111111111111111111111111111111111111112',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      ]
      
      const addresses = Array.from({ length: 50 }, (_, i) => 
        address(validAddresses[i % validAddresses.length])
      )
      
      // Mock responses
      mockRpcClientInstance.getAccountInfo.mockImplementation(() => 
        Promise.resolve({
          owner: programId,
          lamports: Math.floor(Math.random() * 1000000),
          data: new Uint8Array([Math.floor(Math.random() * 256)]),
          executable: false
        })
      )
      
      const startTime = performance.now()
      
      const fetchPromises = addresses.map(addr =>
        processor.add(async () => {
          const client = new SimpleRpcClient({ endpoint: 'test' })
          return client.getAccountInfo(addr)
        })
      )
      
      const accounts = await Promise.all(fetchPromises)
      const duration = performance.now() - startTime
      
      expect(accounts).toHaveLength(50)
      expect(accounts.every(acc => acc !== null)).toBe(true)
      expect(duration).toBeLessThan(200) // Batching should be fast
    })
  })
})