/**
 * X402TransactionIndexer Unit Tests
 *
 * Tests on-chain polling and transaction parsing for x402 payments
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { X402TransactionIndexer } from '../../../src/modules/indexer/X402TransactionIndexer.js'
import { address } from '@solana/addresses'
import type { Rpc, TransactionWithMeta } from '@solana/rpc'

describe('X402TransactionIndexer', () => {
  let indexer: X402TransactionIndexer
  let mockRpc: Rpc<any>
  // Use valid Solana addresses (base58, 32 bytes)
  const mockFacilitatorAddress = address('11111111111111111111111111111112')
  const mockMerchantAddress = address('11111111111111111111111111111113')
  const mockPayerAddress = address('11111111111111111111111111111114')

  beforeEach(() => {
    // Create mock RPC client
    mockRpc = {
      getSignaturesForAddress: vi.fn(),
      getTransaction: vi.fn(),
    } as unknown as Rpc<any>

    // Create indexer instance
    indexer = new X402TransactionIndexer({
      rpc: mockRpc,
      facilitatorAddress: mockFacilitatorAddress,
    })
  })

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(indexer).toBeDefined()
    })

    it('should accept default batch size', () => {
      const customIndexer = new X402TransactionIndexer({
        rpc: mockRpc,
        facilitatorAddress: mockFacilitatorAddress,
        defaultBatchSize: 50,
      })
      expect(customIndexer).toBeDefined()
    })
  })

  describe('pollTransactions', () => {
    it('should poll for new transactions without lastSignature', async () => {
      // Mock RPC response for getSignaturesForAddress
      const mockSignatures = [
        {
          signature: 'sig123',
          slot: 12345,
          blockTime: 1234567890,
          err: null,
        },
        {
          signature: 'sig456',
          slot: 12346,
          blockTime: 1234567891,
          err: null,
        },
      ]

      mockRpc.getSignaturesForAddress = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockSignatures),
      })

      // Mock transaction parsing to return valid x402 payments
      mockRpc.getTransaction = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction('sig')),
      })

      const payments = await indexer.pollTransactions()

      expect(payments).toHaveLength(2)
      expect(payments[0].signature).toBe('sig123')
      expect(payments[1].signature).toBe('sig456')
      expect(mockRpc.getSignaturesForAddress).toHaveBeenCalledWith(
        mockFacilitatorAddress,
        expect.objectContaining({
          limit: 100, // default batch size
        })
      )
    })

    it('should poll from specific signature', async () => {
      const lastSignature = 'lastSig789'
      const mockSignatures = [
        {
          signature: 'newSig001',
          slot: 12347,
          blockTime: 1234567892,
          err: null,
        },
      ]

      mockRpc.getSignaturesForAddress = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(mockSignatures),
      })

      mockRpc.getTransaction = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction('newSig001')),
      })

      const payments = await indexer.pollTransactions(lastSignature)

      expect(payments).toHaveLength(1)
      expect(mockRpc.getSignaturesForAddress).toHaveBeenCalledWith(
        mockFacilitatorAddress,
        expect.objectContaining({
          until: lastSignature,
        })
      )
    })

    it('should respect custom batch size', async () => {
      const customBatchSize = 25
      const mockSignatures = Array.from({ length: customBatchSize }, (_, i) => ({
        signature: `sig${i}`,
        slot: 12300 + i,
        blockTime: 1234567800 + i,
        err: null,
      }))

      mockRpc.getSignaturesForAddress = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(mockSignatures),
      })

      mockRpc.getTransaction = vi.fn().mockImplementation((sig) => ({
        send: vi.fn().mockResolvedValue(createMockX402Transaction(sig)),
      }))

      const payments = await indexer.pollTransactions(undefined, customBatchSize)

      expect(payments).toHaveLength(customBatchSize)
      expect(mockRpc.getSignaturesForAddress).toHaveBeenCalledWith(
        mockFacilitatorAddress,
        expect.objectContaining({
          limit: customBatchSize,
        })
      )
    })

    it('should filter out non-x402 transactions', async () => {
      const mockSignatures = [
        { signature: 'x402Sig', slot: 12345, blockTime: 1234567890, err: null },
        { signature: 'normalSig', slot: 12346, blockTime: 1234567891, err: null },
      ]

      mockRpc.getSignaturesForAddress = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(mockSignatures),
      })

      // First is x402, second is normal transfer
      mockRpc.getTransaction = vi.fn().mockImplementation((sig) => ({
        send: vi.fn().mockResolvedValue(
          sig === 'x402Sig'
            ? createMockX402Transaction(sig)
            : createMockNormalTransaction(sig)
        ),
      }))

      const payments = await indexer.pollTransactions()

      // Should only return x402 payment
      expect(payments).toHaveLength(1)
      expect(payments[0].signature).toBe('x402Sig')
    })

    it('should handle failed transactions', async () => {
      const mockSignatures = [
        { signature: 'failedSig', slot: 12345, blockTime: 1234567890, err: { err: 'Error' } },
      ]

      mockRpc.getSignaturesForAddress = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(mockSignatures),
      })

      mockRpc.getTransaction = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction('failedSig', false)),
      })

      const payments = await indexer.pollTransactions()

      expect(payments).toHaveLength(1)
      expect(payments[0].success).toBe(false)
    })

    it('should return empty array when no new transactions', async () => {
      mockRpc.getSignaturesForAddress = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue([]),
      })

      const payments = await indexer.pollTransactions()

      expect(payments).toEqual([])
    })

    it('should handle RPC errors gracefully', async () => {
      mockRpc.getSignaturesForAddress = vi.fn().mockRejectedValue(new Error('RPC timeout'))

      await expect(indexer.pollTransactions()).rejects.toThrow('RPC timeout')
    })
  })

  describe('parseTransaction', () => {
    it('should parse x402 SPL token transfer', async () => {
      const mockSignature = 'parseSig123'
      mockRpc.getTransaction = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(createMockX402Transaction(mockSignature)),
      })

      const payment = await indexer.parseTransaction(mockSignature)

      expect(payment).toBeDefined()
      expect(payment?.signature).toBe(mockSignature)
      expect(payment?.facilitatorAddress).toBe(mockFacilitatorAddress.toString())
      expect(payment?.success).toBe(true)
    })

    it('should return null for non-x402 transactions', async () => {
      const mockSignature = 'normalSig123'
      mockRpc.getTransaction = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(createMockNormalTransaction(mockSignature)),
      })

      const payment = await indexer.parseTransaction(mockSignature)

      expect(payment).toBeNull()
    })

    it('should extract payment amount from transfer', async () => {
      const expectedAmount = '1000000' // 1 USDC (6 decimals)
      mockRpc.getTransaction = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(
          createMockX402Transaction('amountSig', true, expectedAmount)
        ),
      })

      const payment = await indexer.parseTransaction('amountSig')

      expect(payment?.amount).toBe(expectedAmount)
    })

    it('should handle transaction not found', async () => {
      mockRpc.getTransaction = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(null),
      })

      const payment = await indexer.parseTransaction('notFoundSig')

      expect(payment).toBeNull()
    })
  })

  describe('isX402Payment', () => {
    it('should identify SPL token transfer to facilitator', async () => {
      const mockTx = createMockX402Transaction('testSig')
      mockRpc.getTransaction = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(mockTx),
      })

      const payment = await indexer.parseTransaction('testSig')

      expect(payment).toBeDefined()
      expect(payment?.facilitatorAddress).toBe(mockFacilitatorAddress.toString())
    })

    it('should reject regular token transfers not to facilitator', async () => {
      const mockTx = createMockNormalTransaction('normalSig')
      mockRpc.getTransaction = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(mockTx),
      })

      const payment = await indexer.parseTransaction('normalSig')

      expect(payment).toBeNull()
    })

    it('should handle Token-2022 transfers', async () => {
      // x402 can use Token-2022 program
      const mockTx = createMockX402Transaction('token2022Sig', true, '500000', true)
      mockRpc.getTransaction = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(mockTx),
      })

      const payment = await indexer.parseTransaction('token2022Sig')

      expect(payment).toBeDefined()
      expect(payment?.amount).toBe('500000')
    })
  })

  describe('getSignatures', () => {
    it('should fetch signatures from RPC', async () => {
      const mockSignatures = [
        { signature: 'sig1', slot: 100, blockTime: 1000, err: null },
        { signature: 'sig2', slot: 101, blockTime: 1001, err: null },
      ]

      mockRpc.getSignaturesForAddress = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue(mockSignatures),
      })

      const signatures = await (indexer as any).getSignatures()

      expect(signatures).toHaveLength(2)
      expect(signatures[0].signature).toBe('sig1')
      expect(mockRpc.getSignaturesForAddress).toHaveBeenCalledWith(
        mockFacilitatorAddress,
        expect.any(Object)
      )
    })

    it('should pass correct pagination parameters', async () => {
      const lastSig = 'lastSig123'
      const limit = 50

      mockRpc.getSignaturesForAddress = vi.fn().mockResolvedValue({
        send: vi.fn().mockResolvedValue([]),
      })

      await (indexer as any).getSignatures(lastSig, limit)

      expect(mockRpc.getSignaturesForAddress).toHaveBeenCalledWith(
        mockFacilitatorAddress,
        expect.objectContaining({
          until: lastSig,
          limit: limit,
        })
      )
    })
  })
})

// =====================================================
// MOCK TRANSACTION HELPERS
// =====================================================

/**
 * Create a mock x402 payment transaction
 */
function createMockX402Transaction(
  signature: string,
  success: boolean = true,
  amount: string = '1000000',
  useToken2022: boolean = false
): TransactionWithMeta {
  const facilitatorAddress = address('11111111111111111111111111111112')
  const merchantAddress = address('11111111111111111111111111111113')
  const payerAddress = address('11111111111111111111111111111114')

  const tokenProgramId = useToken2022
    ? address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') // Token-2022
    : address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') // SPL Token

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
                source: payerAddress.toString(),
                destination: facilitatorAddress.toString(),
                authority: payerAddress.toString(),
                amount: amount,
              },
            },
          },
        ],
        accountKeys: [
          { pubkey: payerAddress, signer: true, writable: true },
          { pubkey: merchantAddress, signer: false, writable: true },
          { pubkey: facilitatorAddress, signer: false, writable: true },
        ],
      },
      signatures: [signature],
    },
    blockTime: Math.floor(Date.now() / 1000),
    slot: 12345,
  } as unknown as TransactionWithMeta
}

/**
 * Create a mock normal (non-x402) transaction
 */
function createMockNormalTransaction(signature: string): TransactionWithMeta {
  const randomAddress = address('11111111111111111111111111111115')

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
            programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            parsed: {
              type: 'transfer',
              info: {
                source: randomAddress.toString(),
                destination: randomAddress.toString(), // Not to facilitator
                authority: randomAddress.toString(),
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
  } as unknown as TransactionWithMeta
}
