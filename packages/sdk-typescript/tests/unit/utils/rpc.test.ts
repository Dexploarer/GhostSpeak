import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  createGhostSpeakRpc,
  getAccountData,
  sendAndConfirmTransaction,
  getMultipleAccountsData,
  simulateTransactionWithRetry,
  waitForTransactionConfirmation
} from '../../helpers/rpc-test-helpers'
import { 
  address,
  generateKeyPairSigner,
  lamports,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  pipe
} from '@solana/kit'
import type { Address, TransactionSigner, Rpc, CompilableTransactionMessage } from '@solana/kit'

describe('RPC Utilities', () => {
  let mockRpc: any
  let payer: TransactionSigner
  let testAddress: Address

  beforeEach(async () => {
    payer = await generateKeyPairSigner()
    testAddress = address('11111111111111111111111111111111') // System program

    // Create comprehensive mock RPC
    mockRpc = {
      // Account methods
      getAccountInfo: vi.fn().mockResolvedValue({
        value: {
          data: Buffer.from('test data'),
          executable: false,
          lamports: lamports(1000000n),
          owner: address('11111111111111111111111111111111'),
          rentEpoch: 300n
        }
      }),
      getMultipleAccounts: vi.fn().mockResolvedValue({
        value: [
          {
            data: Buffer.from('account1'),
            executable: false,
            lamports: lamports(1000000n),
            owner: address('11111111111111111111111111111111'),
            rentEpoch: 300n
          },
          null, // Account doesn't exist
          {
            data: Buffer.from('account3'),
            executable: false,
            lamports: lamports(2000000n),
            owner: address('11111111111111111111111111111111'),
            rentEpoch: 300n
          }
        ]
      }),
      
      // Transaction methods
      sendTransaction: vi.fn().mockResolvedValue('mockTransactionSignature123'),
      simulateTransaction: vi.fn().mockResolvedValue({
        value: {
          err: null,
          logs: [
            'Program log: Instruction: TestInstruction',
            'Program log: Success'
          ],
          unitsConsumed: 5000n,
          returnData: null
        }
      }),
      getLatestBlockhash: vi.fn().mockResolvedValue({
        value: {
          blockhash: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          lastValidBlockHeight: 150000000n
        }
      }),
      getSignatureStatuses: vi.fn().mockResolvedValue({
        value: [
          {
            slot: 150000000n,
            confirmations: 10,
            err: null,
            confirmationStatus: 'confirmed'
          }
        ]
      }),
      
      // Balance methods
      getBalance: vi.fn().mockResolvedValue({
        value: lamports(1000000000n)
      }),
      
      // Slot methods
      getSlot: vi.fn().mockResolvedValue(150000000n),
      
      // Health check
      getHealth: vi.fn().mockResolvedValue('ok')
    }
  })

  describe('createGhostSpeakRpc', () => {
    it('should create RPC client with default endpoint', () => {
      const rpc = createGhostSpeakRpc()
      expect(rpc).toBeDefined()
      // Note: Can't easily test the endpoint without making actual requests
    })

    it('should create RPC client with custom endpoint', () => {
      const customEndpoint = 'https://custom.rpc.endpoint'
      const rpc = createGhostSpeakRpc(customEndpoint)
      expect(rpc).toBeDefined()
    })

    it('should create RPC client for different networks', () => {
      const devnetRpc = createGhostSpeakRpc('https://api.devnet.solana.com')
      const mainnetRpc = createGhostSpeakRpc('https://api.mainnet-beta.solana.com')
      
      expect(devnetRpc).toBeDefined()
      expect(mainnetRpc).toBeDefined()
    })
  })

  describe('getAccountData', () => {
    it('should fetch account data successfully', async () => {
      const data = await getAccountData(mockRpc, testAddress)
      
      expect(data).toBeDefined()
      expect(data?.data).toEqual(Buffer.from('test data'))
      expect(data?.lamports).toBe(lamports(1000000n))
      expect(mockRpc.getAccountInfo).toHaveBeenCalledWith(testAddress, {
        encoding: 'base64'
      })
    })

    it('should return null for non-existent account', async () => {
      mockRpc.getAccountInfo.mockResolvedValueOnce({ value: null })
      
      const data = await getAccountData(mockRpc, testAddress)
      
      expect(data).toBeNull()
    })

    it('should handle RPC errors', async () => {
      mockRpc.getAccountInfo.mockRejectedValueOnce(new Error('RPC Error'))
      
      await expect(getAccountData(mockRpc, testAddress)).rejects.toThrow('RPC Error')
    })

    it('should use custom commitment level', async () => {
      await getAccountData(mockRpc, testAddress, 'finalized')
      
      expect(mockRpc.getAccountInfo).toHaveBeenCalledWith(testAddress, {
        encoding: 'base64',
        commitment: 'finalized'
      })
    })
  })

  describe('getMultipleAccountsData', () => {
    it('should fetch multiple accounts successfully', async () => {
      const addresses = [
        address('11111111111111111111111111111111'), // System program
        address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // Token program
        address('So11111111111111111111111111111111111111112') // Wrapped SOL
      ]
      
      const results = await getMultipleAccountsData(mockRpc, addresses)
      
      expect(results).toHaveLength(3)
      expect(results[0]?.data).toEqual(Buffer.from('account1'))
      expect(results[1]).toBeNull() // Non-existent account
      expect(results[2]?.data).toEqual(Buffer.from('account3'))
    })

    it('should handle empty address array', async () => {
      const results = await getMultipleAccountsData(mockRpc, [])
      
      expect(results).toEqual([])
      expect(mockRpc.getMultipleAccounts).not.toHaveBeenCalled()
    })

    it('should batch large address arrays', async () => {
      // Create 150 addresses (should be split into 2 batches of 100 and 50)
      const addresses = Array(150).fill(null).map((_, i) => 
        address('11111111111111111111111111111111') // Use system program for all test addresses
      )
      
      // Mock response for multiple batches
      mockRpc.getMultipleAccounts
        .mockResolvedValueOnce({
          // First batch of 100
          value: Array(100).fill({
            data: Buffer.from('batch data'),
            executable: false,
            lamports: lamports(1000000n),
            owner: address('11111111111111111111111111111111'),
            rentEpoch: 300n
          })
        })
        .mockResolvedValueOnce({
          // Second batch of 50
          value: Array(50).fill({
            data: Buffer.from('batch data'),
            executable: false,
            lamports: lamports(1000000n),
            owner: address('11111111111111111111111111111111'),
            rentEpoch: 300n
          })
        })
      
      const results = await getMultipleAccountsData(mockRpc, addresses)
      
      expect(results).toHaveLength(150)
      expect(mockRpc.getMultipleAccounts).toHaveBeenCalledTimes(2)
    })
  })

  describe('sendAndConfirmTransaction', () => {
    it('should send and confirm transaction successfully', async () => {
      // Create a mock transaction
      const message = createTransactionMessage({ version: 0 })
      const signedTx = {
        message,
        signatures: []
      }
      
      const signature = await sendAndConfirmTransaction(mockRpc, signedTx as any, {
        skipPreflight: false,
        commitment: 'confirmed'
      })
      
      expect(signature).toBe('mockTransactionSignature123')
      expect(mockRpc.sendTransaction).toHaveBeenCalled()
    })

    it('should handle transaction errors', async () => {
      mockRpc.sendTransaction.mockRejectedValueOnce(new Error('Transaction failed'))
      
      const message = createTransactionMessage({ version: 0 })
      const signedTx = {
        message,
        signatures: []
      }
      
      await expect(
        sendAndConfirmTransaction(mockRpc, signedTx as any)
      ).rejects.toThrow('Transaction failed')
    })

    it('should use custom send options', async () => {
      const message = createTransactionMessage({ version: 0 })
      const signedTx = {
        message,
        signatures: []
      }
      
      await sendAndConfirmTransaction(mockRpc, signedTx as any, {
        skipPreflight: true,
        preflightCommitment: 'processed',
        maxRetries: 5
      })
      
      expect(mockRpc.sendTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          skipPreflight: true,
          preflightCommitment: 'processed',
          maxRetries: 5
        })
      )
    })
  })

  describe('simulateTransactionWithRetry', () => {
    it('should simulate transaction successfully', async () => {
      const message = createTransactionMessage({ version: 0 })
      
      const result = await simulateTransactionWithRetry(mockRpc, message as any)
      
      expect(result.err).toBeNull()
      expect(result.logs).toContain('Program log: Success')
      expect(result.unitsConsumed).toBe(5000n)
    })

    it('should retry on failure', async () => {
      // First call fails, second succeeds
      mockRpc.simulateTransaction
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          value: {
            err: null,
            logs: ['Success after retry'],
            unitsConsumed: 6000n
          }
        })
      
      const message = createTransactionMessage({ version: 0 })
      const result = await simulateTransactionWithRetry(mockRpc, message as any, 3)
      
      expect(result.logs).toContain('Success after retry')
      expect(mockRpc.simulateTransaction).toHaveBeenCalledTimes(2)
    })

    it('should fail after max retries', async () => {
      mockRpc.simulateTransaction.mockRejectedValue(new Error('Persistent failure'))
      
      const message = createTransactionMessage({ version: 0 })
      
      await expect(
        simulateTransactionWithRetry(mockRpc, message as any, 3)
      ).rejects.toThrow('Persistent failure')
      
      expect(mockRpc.simulateTransaction).toHaveBeenCalledTimes(3)
    })

    it('should handle simulation errors in response', async () => {
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { InstructionError: [0, { Custom: 1 }] },
          logs: ['Program log: Error occurred'],
          unitsConsumed: 3000n
        }
      })
      
      const message = createTransactionMessage({ version: 0 })
      const result = await simulateTransactionWithRetry(mockRpc, message as any)
      
      expect(result.err).toBeDefined()
      expect(result.logs).toContain('Program log: Error occurred')
    })
  })

  describe('waitForTransactionConfirmation', () => {
    it('should wait for transaction confirmation', async () => {
      const status = await waitForTransactionConfirmation(
        mockRpc,
        'mockTransactionSignature123',
        'confirmed'
      )
      
      expect(status).toBeDefined()
      expect(status?.confirmationStatus).toBe('confirmed')
      expect(status?.err).toBeNull()
    })

    it('should timeout if transaction not confirmed', async () => {
      // Mock pending status
      mockRpc.getSignatureStatuses.mockResolvedValue({
        value: [null] // Transaction not found
      })
      
      await expect(
        waitForTransactionConfirmation(
          mockRpc,
          'pendingTx123',
          'confirmed',
          1000 // 1 second timeout
        )
      ).rejects.toThrow()
    })

    it('should handle transaction errors', async () => {
      mockRpc.getSignatureStatuses.mockResolvedValueOnce({
        value: [
          {
            slot: 150000000n,
            confirmations: 0,
            err: { InstructionError: [0, { Custom: 1 }] },
            confirmationStatus: 'processed'
          }
        ]
      })
      
      await expect(
        waitForTransactionConfirmation(mockRpc, 'errorTx123')
      ).rejects.toThrow()
    })

    it('should wait for finalized confirmation', async () => {
      // First return confirmed, then finalized
      mockRpc.getSignatureStatuses
        .mockResolvedValueOnce({
          value: [{
            slot: 150000000n,
            confirmations: 10,
            err: null,
            confirmationStatus: 'confirmed'
          }]
        })
        .mockResolvedValueOnce({
          value: [{
            slot: 150000000n,
            confirmations: 32,
            err: null,
            confirmationStatus: 'finalized'
          }]
        })
      
      const status = await waitForTransactionConfirmation(
        mockRpc,
        'tx123',
        'finalized'
      )
      
      expect(status?.confirmationStatus).toBe('finalized')
      expect(mockRpc.getSignatureStatuses).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout')
      timeoutError.name = 'TimeoutError'
      mockRpc.getAccountInfo.mockRejectedValueOnce(timeoutError)
      
      await expect(getAccountData(mockRpc, testAddress)).rejects.toThrow('Network timeout')
    })

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'RateLimitError'
      mockRpc.sendTransaction.mockRejectedValueOnce(rateLimitError)
      
      const message = createTransactionMessage({ version: 0 })
      const signedTx = { message, signatures: [] }
      
      await expect(
        sendAndConfirmTransaction(mockRpc, signedTx as any)
      ).rejects.toThrow('Rate limit exceeded')
    })

    it('should handle malformed responses', async () => {
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          // Missing required fields
          data: null,
          lamports: null
        }
      })
      
      const data = await getAccountData(mockRpc, testAddress)
      // Should handle gracefully or throw appropriate error
      expect(data).toBeDefined()
    })
  })

  describe('Integration patterns', () => {
    it('should work with transaction builder pattern', async () => {
      const blockhash = await mockRpc.getLatestBlockhash()
      
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(payer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(blockhash.value, tx)
      )
      
      // Simulate the transaction
      const simulation = await simulateTransactionWithRetry(mockRpc, message as any)
      
      expect(simulation.err).toBeNull()
    })

    it('should handle batch operations efficiently', async () => {
      // Generate valid test addresses using different system program addresses
      const addresses = Array(50).fill(null).map((_, i) => 
        address('11111111111111111111111111111111') // Use system program for all test addresses
      )
      
      // Mock response for getMultipleAccounts (will be called once with 50 addresses)
      mockRpc.getMultipleAccounts.mockResolvedValueOnce({
        value: Array(50).fill({
          data: Buffer.from('account data'),
          executable: false,
          lamports: lamports(1000000n),
          owner: address('11111111111111111111111111111111'),
          rentEpoch: 300n
        })
      })
      
      // Fetch all accounts in parallel
      const [accounts, balances] = await Promise.all([
        getMultipleAccountsData(mockRpc, addresses),
        Promise.all(addresses.map(addr => mockRpc.getBalance(addr)))
      ])
      
      expect(accounts).toHaveLength(50)
      expect(balances).toHaveLength(50)
    })
  })
})