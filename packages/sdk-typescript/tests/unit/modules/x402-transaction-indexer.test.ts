/**
 * X402TransactionIndexer Unit Tests
 *
 * Tests on-chain polling and transaction parsing for x402 payments
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { X402TransactionIndexer } from '../../../src/modules/indexer/X402TransactionIndexer.js'
import { address } from '@solana/addresses'
import type { Rpc } from '@solana/rpc'

// Suppress console output during tests
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('X402TransactionIndexer', () => {
  let indexer: X402TransactionIndexer
  let mockRpc: Rpc<any>
  // Use valid Solana addresses (base58, 32 bytes)
  const mockFacilitatorAddress = address('11111111111111111111111111111112')
  const mockMerchantAddress = address('11111111111111111111111111111113')
  const mockPayerAddress = address('11111111111111111111111111111114')

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock RPC client with proper chain pattern
    mockRpc = {
      getSignaturesForAddress: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue([])
      }),
      getTransaction: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(null)
      }),
    } as unknown as Rpc<any>

    // Create indexer instance
    indexer = new X402TransactionIndexer({
      rpc: mockRpc,
      facilitatorAddress: mockFacilitatorAddress,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(indexer).toBeDefined()
    })

    it('should accept custom batch size', () => {
      const customIndexer = new X402TransactionIndexer({
        rpc: mockRpc,
        facilitatorAddress: mockFacilitatorAddress,
        batchSize: 50,
      })
      expect(customIndexer).toBeDefined()
    })
  })

  describe('pollTransactions', () => {
    it('should poll for new transactions without lastSignature', async () => {
      const mockSignatures = [
        { signature: 'sig123', slot: 12345n, blockTime: 1234567890n, err: null },
        { signature: 'sig456', slot: 12346n, blockTime: 1234567891n, err: null },
      ]

      // Setup mocks with proper chain pattern
      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockSignatures)
      })

      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction('sig'))
      })

      const payments = await indexer.pollTransactions()

      expect(payments).toHaveLength(2)
      expect(payments[0].signature).toBe('sig123')
      expect(payments[1].signature).toBe('sig456')
    })

    it('should poll from specific signature', async () => {
      const lastSignature = 'lastSig789'
      const mockSignatures = [
        { signature: 'newSig001', slot: 12347n, blockTime: 1234567892n, err: null },
      ]

      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockSignatures)
      })

      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction('newSig001'))
      })

      const payments = await indexer.pollTransactions(lastSignature as any)

      expect(payments).toHaveLength(1)
      expect(payments[0].signature).toBe('newSig001')
    })

    it('should respect custom batch size', async () => {
      const customBatchSize = 25
      const mockSignatures = Array.from({ length: customBatchSize }, (_, i) => ({
        signature: `sig${i}`,
        slot: BigInt(12300 + i),
        blockTime: BigInt(1234567800 + i),
        err: null,
      }))

      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockSignatures)
      })

      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction('sig'))
      })

      const payments = await indexer.pollTransactions(undefined, customBatchSize)

      expect(payments).toHaveLength(customBatchSize)
    })

    it('should filter out non-x402 transactions', async () => {
      const mockSignatures = [
        { signature: 'x402Sig', slot: 12345n, blockTime: 1234567890n, err: null },
        { signature: 'normalSig', slot: 12346n, blockTime: 1234567891n, err: null },
      ]

      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockSignatures)
      })

      // First call returns x402, second returns normal
      let callCount = 0
      mockRpc.getTransaction = vi.fn().mockImplementation(() => ({
        send: vi.fn().mockImplementation(() => {
          callCount++
          return callCount === 1
            ? Promise.resolve(createMockX402Transaction('x402Sig'))
            : Promise.resolve(createMockNormalTransaction('normalSig'))
        })
      }))

      const payments = await indexer.pollTransactions()

      // Should only return x402 payment
      expect(payments).toHaveLength(1)
      expect(payments[0].signature).toBe('x402Sig')
    })

    it('should handle failed transactions', async () => {
      const mockSignatures = [
        { signature: 'failedSig', slot: 12345n, blockTime: 1234567890n, err: { err: 'Error' } },
      ]

      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockSignatures)
      })

      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction('failedSig', false))
      })

      const payments = await indexer.pollTransactions()

      expect(payments).toHaveLength(1)
      expect(payments[0].success).toBe(false)
    })

    it('should return empty array when no new transactions', async () => {
      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue([])
      })

      const payments = await indexer.pollTransactions()

      expect(payments).toEqual([])
    })

    it('should handle RPC errors gracefully', async () => {
      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('RPC timeout'))
      })

      await expect(indexer.pollTransactions()).rejects.toThrow('RPC timeout')
    })
  })

  describe('parseTransaction', () => {
    it('should parse x402 SPL token transfer', async () => {
      const mockSignature = 'parseSig123'
      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction(mockSignature))
      })

      const payment = await indexer.parseTransaction(mockSignature)

      expect(payment).toBeDefined()
      expect(payment?.signature).toBe(mockSignature)
      expect(payment?.merchant).toBe(mockFacilitatorAddress.toString())
      expect(payment?.success).toBe(true)
    })

    it('should return null for non-x402 transactions', async () => {
      const mockSignature = 'normalSig123'
      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockNormalTransaction(mockSignature))
      })

      const payment = await indexer.parseTransaction(mockSignature)

      expect(payment).toBeNull()
    })

    it('should extract payment amount from transfer', async () => {
      const expectedAmount = '1000000' // 1 USDC (6 decimals)
      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(
          createMockX402Transaction('amountSig', true, expectedAmount)
        )
      })

      const payment = await indexer.parseTransaction('amountSig')

      expect(payment?.amount).toBe(expectedAmount)
    })

    it('should handle transaction not found', async () => {
      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(null)
      })

      const payment = await indexer.parseTransaction('notFoundSig')

      expect(payment).toBeNull()
    })
  })

  describe('isX402Payment', () => {
    it('should identify SPL token transfer to facilitator', async () => {
      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction('testSig'))
      })

      const payment = await indexer.parseTransaction('testSig')

      expect(payment).toBeDefined()
      expect(payment?.merchant).toBe(mockFacilitatorAddress.toString())
    })

    it('should reject regular token transfers not to facilitator', async () => {
      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockNormalTransaction('normalSig'))
      })

      const payment = await indexer.parseTransaction('normalSig')

      expect(payment).toBeNull()
    })

    it('should handle Token-2022 transfers', async () => {
      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction('token2022Sig', true, '500000', true))
      })

      const payment = await indexer.parseTransaction('token2022Sig')

      expect(payment).toBeDefined()
      expect(payment?.amount).toBe('500000')
    })
  })

  describe('getSignatures', () => {
    it('should fetch signatures from RPC', async () => {
      const mockSignatures = [
        { signature: 'sig1', slot: 100n, blockTime: 1000n, err: null },
        { signature: 'sig2', slot: 101n, blockTime: 1001n, err: null },
      ]

      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockSignatures)
      })

      const signatures = await (indexer as any).getSignatures()

      expect(signatures).toHaveLength(2)
      expect(signatures[0].signature).toBe('sig1')
    })

    it('should pass correct pagination parameters', async () => {
      const lastSig = 'lastSig123'
      const limit = 50

      const mockSend = vi.fn().mockResolvedValue([])
      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: mockSend
      })

      await (indexer as any).getSignatures(lastSig, limit)

      expect(mockRpc.getSignaturesForAddress).toHaveBeenCalledWith(
        mockFacilitatorAddress,
        expect.objectContaining({
          before: lastSig,
          limit: limit,
        })
      )
    })
  })
})

// =====================================================
// MOCK TRANSACTION HELPERS
// =====================================================

// Use the same facilitator address as the test setup
const TEST_FACILITATOR = '11111111111111111111111111111112'
const TEST_PAYER = '11111111111111111111111111111114'

/**
 * Create a mock x402 payment transaction
 */
function createMockX402Transaction(
  signature: string,
  success: boolean = true,
  amount: string = '1000000',
  useToken2022: boolean = false
): any {
  const tokenProgramId = useToken2022
    ? 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' // Token-2022
    : 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' // SPL Token

  return {
    meta: {
      err: success ? null : { InstructionError: [0, 'Custom'] },
      fee: 5000,
      preBalances: [100000000n, 50000000n],
      postBalances: [99995000n, 50000000n],
      logMessages: ['Program log: Transfer successful'],
    },
    transaction: {
      message: {
        instructions: [
          {
            programId: tokenProgramId,
            parsed: {
              type: 'transfer',
              info: {
                source: TEST_PAYER,
                destination: TEST_FACILITATOR, // Transfer TO facilitator
                authority: TEST_PAYER,
                amount: amount,
              },
            },
          },
        ],
        accountKeys: [
          { pubkey: TEST_PAYER, signer: true, writable: true },
          { pubkey: TEST_FACILITATOR, signer: false, writable: true },
        ],
      },
      signatures: [signature],
    },
    blockTime: Math.floor(Date.now() / 1000),
    slot: 12345,
  }
}

/**
 * Create a mock normal (non-x402) transaction
 */
function createMockNormalTransaction(signature: string): any {
  const randomAddress = '11111111111111111111111111111115'

  return {
    meta: {
      err: null,
      fee: 5000,
      preBalances: [100000000n, 50000000n],
      postBalances: [99995000n, 50000000n],
      logMessages: ['Program log: Normal transfer'],
    },
    transaction: {
      message: {
        instructions: [
          {
            programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            parsed: {
              type: 'transfer',
              info: {
                source: randomAddress,
                destination: randomAddress, // NOT to facilitator
                authority: randomAddress,
                amount: '500000',
              },
            },
          },
        ],
        accountKeys: [
          { pubkey: randomAddress, signer: true, writable: true },
        ],
      },
      signatures: [signature],
    },
    blockTime: Math.floor(Date.now() / 1000),
    slot: 12345,
  }
}
