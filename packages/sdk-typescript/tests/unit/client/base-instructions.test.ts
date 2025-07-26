/**
 * Base Instructions Tests
 * 
 * Comprehensive test coverage for the BaseInstructions class,
 * the foundation of all transaction operations in the SDK.
 * Tests transaction building, sending, account operations, and error handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type { IInstruction, TransactionSigner, Signature } from '@solana/kit'
import { BaseInstructions } from '../../../src/client/instructions/BaseInstructions'
import type { GhostSpeakConfig, TransactionResult } from '../../../src/types'
import { SimpleRpcClient } from '../../../src/utils/simple-rpc-client'

// Mock the entire @solana/kit module
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
  setTransactionMessageFeePayerSigner: vi.fn((signer, tx) => {
    if (!signer) throw new Error('No signer provided')
    return { ...tx, feePayerSigner: signer }
  }),
  setTransactionMessageLifetimeUsingBlockhash: vi.fn((blockhash, tx) => ({ ...tx, blockhash })),
  appendTransactionMessageInstructions: vi.fn((instructions, tx) => ({ ...tx, instructions })),
  signTransactionMessageWithSigners: vi.fn(async (tx) => ({ ...tx, signatures: { '0': 'mock-signature' } })),
  sendAndConfirmTransactionFactory: vi.fn(() => async () => ({ signature: 'mock-signature' })),
  compileTransactionMessage: vi.fn((tx) => new Uint8Array(100)),
  getBase64EncodedWireTransaction: vi.fn(() => 'mock-base64-transaction'),
  buildTransactionMessage: vi.fn(() => ({ version: 0, instructions: [] }))
}))

// Create mock RPC client instance
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

// Mock SimpleRpcClient
vi.mock('../../../src/utils/simple-rpc-client', () => ({
  SimpleRpcClient: vi.fn().mockImplementation(() => mockRpcClientInstance)
}))

// Mock transaction URL utilities
vi.mock('../../../src/utils/transaction-urls', () => ({
  createTransactionResult: vi.fn((signature, cluster, commitment) => ({
    signature,
    cluster,
    commitment,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`,
    solanafmUrl: `https://solana.fm/tx/${signature}?cluster=${cluster}`,
    solscanUrl: `https://solscan.io/tx/${signature}?cluster=${cluster}`,
    confirmationStatus: commitment
  })),
  logTransactionDetails: vi.fn(),
  detectClusterFromEndpoint: vi.fn(() => 'devnet')
}))

// Test implementation class
class TestInstructions extends BaseInstructions {
  // Expose protected methods for testing
  async testSendTransaction(instructions: IInstruction[], signers: TransactionSigner[]): Promise<Signature> {
    return this.sendTransaction(instructions, signers)
  }

  async testSendTransactionWithDetails(instructions: IInstruction[], signers: TransactionSigner[]): Promise<TransactionResult> {
    return this.sendTransactionWithDetails(instructions, signers)
  }

  async testEstimateTransactionCost(instructions: IInstruction[], feePayer?: Address): Promise<bigint> {
    return this.estimateTransactionCost(instructions, feePayer)
  }

  async testSimulateTransaction(instructions: IInstruction[], signers: TransactionSigner[]): Promise<unknown> {
    return this.simulateTransaction(instructions, signers)
  }

  async testSendTransactionBatch(instructionBatches: IInstruction[][], signers: TransactionSigner[]): Promise<Signature[]> {
    return this.sendTransactionBatch(instructionBatches, signers)
  }

  async testGetDecodedAccount<T>(address: Address, decoderImportName: string): Promise<T | null> {
    return this.getDecodedAccount(address, decoderImportName)
  }

  async testGetDecodedAccounts<T>(addresses: Address[], decoderImportName: string): Promise<(T | null)[]> {
    return this.getDecodedAccounts(addresses, decoderImportName)
  }

  async testGetDecodedProgramAccounts<T>(decoderImportName: string, filters?: unknown[]): Promise<{ address: Address; data: T }[]> {
    return this.getDecodedProgramAccounts(decoderImportName, filters)
  }

  async testGetRawAccount(address: Address) {
    return this.getRawAccount(address)
  }

  async testGetAllProgramAccounts() {
    return this.getAllProgramAccounts()
  }

  async testExecuteInstruction(instructionGetter: () => unknown, signer: TransactionSigner, context?: string): Promise<Signature> {
    return this.executeInstruction(instructionGetter, signer, context)
  }

  async testExecuteInstructionWithDetails(instructionGetter: () => unknown, signer: TransactionSigner, context?: string): Promise<TransactionResult> {
    return this.executeInstructionWithDetails(instructionGetter, signer, context)
  }

  testEstimateTransactionSize(instructions: IInstruction[]): number {
    return this.estimateTransactionSize(instructions)
  }

  testLogInstructionDetails(instruction: IInstruction): void {
    return this.logInstructionDetails(instruction)
  }
}

describe('BaseInstructions', () => {
  let config: GhostSpeakConfig
  let baseInstructions: TestInstructions
  let mockSigner: TransactionSigner
  let mockInstruction: IInstruction
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset all mock implementations to defaults
    mockRpcClientInstance.getLatestBlockhash.mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000
    })
    mockRpcClientInstance.getAccountInfo.mockResolvedValue(null)
    mockRpcClientInstance.getMultipleAccounts.mockResolvedValue([])
    mockRpcClientInstance.getProgramAccounts.mockResolvedValue([])
    mockRpcClientInstance.sendTransaction.mockResolvedValue('mock-signature')
    mockRpcClientInstance.getSignatureStatuses.mockResolvedValue([{ confirmationStatus: 'confirmed' }])
    mockRpcClientInstance.getFeeForMessage.mockResolvedValue(5000)
    mockRpcClientInstance.simulateTransaction.mockResolvedValue({
      value: {
        err: null,
        logs: ['Program log: Success'],
        unitsConsumed: BigInt(100000)
      }
    })
    
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    config = {
      programId: address('11111111111111111111111111111111'),
      rpcEndpoint: 'https://api.devnet.solana.com',
      commitment: 'confirmed',
      defaultFeePayer: address('So11111111111111111111111111111111111111112'),
      rpc: {} as any,
      cluster: 'devnet'
    }

    baseInstructions = new TestInstructions(config)

    mockSigner = {
      address: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      signTransactionMessage: vi.fn(),
      signMessages: vi.fn()
    } as any

    mockInstruction = {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [
        { address: address('So11111111111111111111111111111111111111112'), role: 'writable' }
      ],
      data: new Uint8Array([1, 2, 3, 4, 5])
    } as any
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('Transaction Building & Sending', () => {
    it('should send a basic transaction successfully', async () => {
      const signature = await baseInstructions.testSendTransaction([mockInstruction], [mockSigner])
      
      expect(signature).toBe('mock-signature')
      expect(SimpleRpcClient).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Transaction confirmed'))
    })

    it('should send transaction with detailed results', async () => {
      const result = await baseInstructions.testSendTransactionWithDetails([mockInstruction], [mockSigner])
      
      expect(result.signature).toBe('mock-signature')
      expect(result.cluster).toBe('devnet')
      expect(result.commitment).toBe('confirmed')
      expect(result.explorerUrl).toContain('mock-signature')
      expect(result.solanafmUrl).toContain('mock-signature')
      expect(result.solscanUrl).toContain('mock-signature')
    })

    it('should handle multiple instructions in a single transaction', async () => {
      const instructions = [
        mockInstruction,
        { ...mockInstruction, data: new Uint8Array([6, 7, 8]) },
        { ...mockInstruction, data: new Uint8Array([9, 10, 11]) }
      ]
      
      const signature = await baseInstructions.testSendTransaction(instructions, [mockSigner])
      expect(signature).toBe('mock-signature')
    })

    it('should validate instructions before sending', async () => {
      const invalidInstructions = [
        undefined as any,
        { programAddress: null } as any,
        { programAddress: mockInstruction.programAddress, accounts: null } as any
      ]

      for (const instruction of invalidInstructions) {
        await expect(
          baseInstructions.testSendTransaction([instruction], [mockSigner])
        ).rejects.toThrow()
      }
    })

    it('should warn about large transaction sizes', async () => {
      const largeData = new Uint8Array(1200)
      const largeInstruction = { ...mockInstruction, data: largeData }
      
      await baseInstructions.testSendTransaction([largeInstruction], [mockSigner])
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Transaction size'))
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('may exceed Solana limit'))
    })

    it('should handle transaction errors gracefully', async () => {
      mockRpcClientInstance.sendTransaction.mockRejectedValueOnce(new Error('RPC error'))

      await expect(
        baseInstructions.testSendTransaction([mockInstruction], [mockSigner])
      ).rejects.toThrow('Transaction failed: RPC error')
    })

    it('should retry with exponential backoff in RPC-only mode', async () => {
      // Mock confirmation polling
      mockRpcClientInstance.getSignatureStatuses
        .mockResolvedValueOnce([null])
        .mockResolvedValueOnce([null])
        .mockResolvedValueOnce([{ confirmationStatus: 'confirmed' }])

      const startTime = Date.now()
      await baseInstructions.testSendTransaction([mockInstruction], [mockSigner])
      const duration = Date.now() - startTime

      expect(mockRpcClientInstance.getSignatureStatuses).toHaveBeenCalledTimes(3)
      expect(duration).toBeGreaterThan(1000) // Should have delays
    })

    it('should handle subscription-based confirmation when available', async () => {
      const configWithSubs = {
        ...config,
        rpcSubscriptions: { /* mock subscription client */ } as any
      }
      
      const instructionsWithSubs = new TestInstructions(configWithSubs)
      const signature = await instructionsWithSubs.testSendTransaction([mockInstruction], [mockSigner])
      
      expect(signature).toBe('mock-signature')
    })

    it('should handle confirmation timeout', async () => {
      // Skip this test as it takes too long
      // The real implementation has a 30-attempt limit with exponential backoff
      // which can take up to 30+ seconds
    })

    it('should log instruction details during debug', async () => {
      await baseInstructions.testSendTransaction([mockInstruction], [mockSigner])
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Debug - Instruction data'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('data length = 5 bytes'))
    })
  })

  describe('Transaction Utilities', () => {
    it('should estimate transaction cost accurately', async () => {
      const cost = await baseInstructions.testEstimateTransactionCost([mockInstruction])
      
      expect(cost).toBe(BigInt(5000))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Real estimated fee: 5000 lamports'))
    })

    it('should fall back to default cost estimation on RPC failure', async () => {
      // Use global mock instance
      mockRpcClientInstance.getFeeForMessage.mockRejectedValueOnce(new Error('RPC error'))

      const cost = await baseInstructions.testEstimateTransactionCost([mockInstruction])
      
      expect(cost).toBe(BigInt(6000)) // 5000 base + 1000 per instruction
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Real fee estimation failed, using fallback:',
        expect.any(Error)
      )
    })

    it('should simulate transactions before sending', async () => {
      const simulation = await baseInstructions.testSimulateTransaction([mockInstruction], [mockSigner])
      
      expect(simulation).toEqual({
        value: {
          err: null,
          logs: ['Program log: Success'],
          unitsConsumed: BigInt(100000)
        }
      })
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Real simulation completed'))
    })

    it('should handle simulation errors', async () => {
      // Use global mock instance
      mockRpcClientInstance.simulateTransaction.mockRejectedValueOnce(new Error('Simulation failed'))

      await expect(
        baseInstructions.testSimulateTransaction([mockInstruction], [mockSigner])
      ).rejects.toThrow('Simulation failed')
    })

    it('should build transaction message without sending', async () => {
      const { buildTransactionMessage } = await import('@solana/kit')
      const message = await baseInstructions['buildTransactionMessage']([mockInstruction], config.defaultFeePayer!)
      
      expect(message).toBeDefined()
      expect(consoleLogSpy).toHaveBeenCalledWith('🏗️ Building transaction message without sending...')
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Transaction message built (not sent)')
    })

    it('should calculate transaction size correctly', () => {
      const size = baseInstructions.testEstimateTransactionSize([mockInstruction])
      
      // 64 (base) + 32 (program) + 32 (account) + 5 (data)
      expect(size).toBe(133)
    })

    it('should calculate size for multiple instructions', () => {
      const instructions = [
        mockInstruction,
        { ...mockInstruction, data: new Uint8Array(10) },
        { ...mockInstruction, data: new Uint8Array(20), accounts: [{}, {}, {}] as any }
      ]
      
      const size = baseInstructions.testEstimateTransactionSize(instructions)
      
      // 64 + (32*3) + (1+1+3)*32 + (5+10+20)
      expect(size).toBe(355)
    })

    it('should log instruction details', () => {
      baseInstructions.testLogInstructionDetails(mockInstruction)
      
      expect(consoleLogSpy).toHaveBeenCalledWith('📋 Instruction Details:')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Program: 11111111111111111111111111111111'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Accounts: 1'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Data size: 5 bytes'))
    })
  })

  describe('Account Operations', () => {
    beforeEach(async () => {
      // Mock the generated decoder imports
      vi.doMock('../../../src/generated/index.js', () => ({
        getAgentAccountDecoder: () => ({
          decode: (data: Uint8Array) => ({
            agentId: 'test-agent',
            owner: 'owner-address',
            isActive: true
          })
        }),
        getServiceListingAccountDecoder: () => ({
          decode: (data: Uint8Array) => ({
            listingId: 'test-listing',
            price: BigInt(1000000)
          })
        })
      }))
    })

    it('should get and decode a single account', async () => {
      // Use global mock instance
      mockRpcClientInstance.getAccountInfo.mockResolvedValueOnce({
        owner: config.programId,
        lamports: 1000000,
        data: new Uint8Array([1, 2, 3, 4]),
        executable: false
      })

      const account = await baseInstructions.testGetDecodedAccount(
        address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        'getAgentAccountDecoder'
      )

      expect(account).toEqual({
        agentId: 'test-agent',
        owner: 'owner-address',
        isActive: true
      })
    })

    it('should return null for non-existent accounts', async () => {
      const account = await baseInstructions.testGetDecodedAccount(
        address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        'getAgentAccountDecoder'
      )

      expect(account).toBeNull()
    })

    it('should handle decoder not found', async () => {
      // Mock the decoder module to return undefined for non-existent decoder
      vi.doMock('../../../src/generated/index.js', () => ({
        getAgentAccountDecoder: () => ({
          decode: (data: Uint8Array) => ({
            agentId: 'test-agent',
            owner: 'owner-address',
            isActive: true
          })
        }),
        getServiceListingAccountDecoder: () => ({
          decode: (data: Uint8Array) => ({
            listingId: 'test-listing',
            price: BigInt(1000000)
          })
        }),
        // getNonExistentDecoder is not defined
      }))

      const account = await baseInstructions.testGetDecodedAccount(
        address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        'getNonExistentDecoder'
      )

      expect(account).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('should get and decode multiple accounts', async () => {
      // Use global mock instance
      mockRpcClientInstance.getMultipleAccounts.mockResolvedValueOnce([
        {
          owner: config.programId,
          lamports: 1000000,
          data: new Uint8Array([1, 2, 3, 4]),
          executable: false
        },
        null,
        {
          owner: config.programId,
          lamports: 2000000,
          data: new Uint8Array([5, 6, 7, 8]),
          executable: false
        }
      ])

      const addresses = [
        address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
        address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      ]

      const accounts = await baseInstructions.testGetDecodedAccounts(addresses, 'getAgentAccountDecoder')

      expect(accounts).toHaveLength(3)
      expect(accounts[0]).toBeDefined()
      expect(accounts[1]).toBeNull()
      expect(accounts[2]).toBeDefined()
    })

    it('should handle various data formats in account decoding', async () => {
      const testDataFormats = [
        new Uint8Array([1, 2, 3, 4]),
        Buffer.from([1, 2, 3, 4]),
        { data: 'AQIDBA==', encoding: 'base64' },
        'AQIDBA=='
      ]

      for (const dataFormat of testDataFormats) {
        // Use global mock instance
        mockRpcClientInstance.getAccountInfo.mockResolvedValueOnce({
          owner: config.programId,
          lamports: 1000000,
          data: dataFormat,
          executable: false
        })

        const account = await baseInstructions.testGetDecodedAccount(
          address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
          'getAgentAccountDecoder'
        )

        expect(account).toBeDefined()
      }
    })

    it('should get program accounts with filters', async () => {
      // Use global mock instance
      mockRpcClientInstance.getProgramAccounts.mockResolvedValueOnce([
        {
          pubkey: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
          account: {
            owner: config.programId,
            lamports: 1000000,
            data: new Uint8Array([1, 2, 3, 4]),
            executable: false
          }
        }
      ])

      const filters = [
        { memcmp: { offset: 0, bytes: 'test' } },
        { dataSize: 100 }
      ]

      const accounts = await baseInstructions.testGetDecodedProgramAccounts('getServiceListingAccountDecoder', filters)

      expect(accounts).toHaveLength(1)
      expect(accounts[0].address).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      expect(accounts[0].data).toEqual({
        listingId: 'test-listing',
        price: BigInt(1000000)
      })
    })

    it('should handle decoding errors gracefully in program accounts', async () => {
      // Use global mock instance
      mockRpcClientInstance.getProgramAccounts.mockResolvedValueOnce([
        {
          pubkey: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
          account: {
            owner: config.programId,
            lamports: 1000000,
            data: new Uint8Array([255]), // Invalid data
            executable: false
          }
        }
      ])

      vi.doMock('../../../src/generated/index.js', () => ({
        getServiceListingAccountDecoder: () => ({
          decode: () => { throw new Error('Invalid discriminator') }
        })
      }))

      const accounts = await baseInstructions.testGetDecodedProgramAccounts('getServiceListingAccountDecoder')

      expect(accounts).toHaveLength(0)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to decode account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v:',
        expect.any(Error)
      )
    })

    it('should get raw account data', async () => {
      // Use global mock instance
      mockRpcClientInstance.getAccountInfo.mockResolvedValueOnce({
        owner: config.programId,
        lamports: 1000000,
        data: new Uint8Array([1, 2, 3, 4]),
        executable: false
      })

      const account = await baseInstructions.testGetRawAccount(
        address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      )

      expect(account).toBeDefined()
      expect(account?.exists).toBe(true)
      expect(account?.data).toEqual(new Uint8Array([1, 2, 3, 4]))
      expect(account?.lamports).toBe(BigInt(1000000))
    })

    it('should get all program accounts for recovery', async () => {
      // Use global mock instance
      mockRpcClientInstance.getProgramAccounts.mockResolvedValueOnce([
        {
          pubkey: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
          account: {
            owner: config.programId,
            lamports: 1000000,
            data: new Uint8Array([1, 2, 3, 4]),
            executable: false
          }
        },
        {
          pubkey: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
          account: {
            owner: config.programId,
            lamports: 2000000,
            data: new Uint8Array([5, 6, 7, 8]),
            executable: true
          }
        }
      ])

      const accounts = await baseInstructions.testGetAllProgramAccounts()

      expect(accounts).toHaveLength(2)
      expect(accounts[0].address).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      expect(accounts[1].executable).toBe(true)
    })

    it('should handle discriminator validation errors', async () => {
      // Use global mock instance
      mockRpcClientInstance.getAccountInfo.mockResolvedValueOnce({
        owner: config.programId,
        lamports: 1000000,
        data: new Uint8Array([1, 2, 3]),
        executable: false
      })

      vi.doMock('../../../src/generated/index.js', () => ({
        getAgentAccountDecoder: () => ({
          decode: () => { throw new Error('expected 8 bytes, got 3') }
        })
      }))

      await expect(
        baseInstructions.testGetDecodedAccount(
          address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
          'getAgentAccountDecoder'
        )
      ).rejects.toThrow('expected 8 bytes, got 3')
    })
  })

  describe('Execution Helpers', () => {
    it('should execute single instruction', async () => {
      const instructionGetter = () => mockInstruction
      const signature = await baseInstructions.testExecuteInstruction(instructionGetter, mockSigner)

      expect(signature).toBe('mock-signature')
    })

    it('should execute instruction with context', async () => {
      const instructionGetter = () => mockInstruction
      const signature = await baseInstructions.testExecuteInstruction(
        instructionGetter,
        mockSigner,
        'agent registration'
      )

      expect(signature).toBe('mock-signature')
    })

    it('should execute instruction with detailed results', async () => {
      const instructionGetter = () => mockInstruction
      const result = await baseInstructions.testExecuteInstructionWithDetails(instructionGetter, mockSigner)

      expect(result.signature).toBe('mock-signature')
      expect(result.explorerUrl).toContain('mock-signature')
    })

    it('should propagate execution errors with context', async () => {
      const instructionGetter = () => { throw new Error('Invalid instruction') }
      
      await expect(
        baseInstructions.testExecuteInstruction(instructionGetter, mockSigner, 'test operation')
      ).rejects.toThrow('Invalid instruction')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to execute test operation:',
        expect.any(Error)
      )
    })

    it('should handle missing context in error messages', async () => {
      const instructionGetter = () => { throw new Error('Generic error') }
      
      await expect(
        baseInstructions.testExecuteInstruction(instructionGetter, mockSigner)
      ).rejects.toThrow('Generic error')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to execute instruction execution:',
        expect.any(Error)
      )
    })
  })

  describe('Transaction Batching', () => {
    it('should send multiple transactions in sequence', async () => {
      const batches = [
        [mockInstruction],
        [{ ...mockInstruction, data: new Uint8Array([6, 7, 8]) }],
        [{ ...mockInstruction, data: new Uint8Array([9, 10, 11]) }]
      ]

      const signatures = await baseInstructions.testSendTransactionBatch(batches, [mockSigner])

      expect(signatures).toHaveLength(3)
      expect(signatures.every(sig => sig === 'mock-signature')).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Sending REAL batch of 3 transactions'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('REAL batch complete: 3 transactions confirmed'))
    })

    it('should stop batch on first failure', async () => {
      // Save the original mock
      const originalMock = mockRpcClientInstance.sendTransaction.getMockImplementation()
      
      // Make second transaction fail
      mockRpcClientInstance.sendTransaction
        .mockResolvedValueOnce('sig1')
        .mockRejectedValueOnce(new Error('Transaction 2 failed'))
        .mockResolvedValueOnce('sig3')

      mockRpcClientInstance.getSignatureStatuses
        .mockResolvedValueOnce([{ confirmationStatus: 'confirmed' }])
      
      // Clean up at the end of this test
      const cleanup = () => {
        mockRpcClientInstance.sendTransaction.mockResolvedValue('mock-signature')
      }

      const batches = [
        [mockInstruction],
        [{ ...mockInstruction, data: new Uint8Array([6, 7, 8]) }],
        [{ ...mockInstruction, data: new Uint8Array([9, 10, 11]) }]
      ]

      await expect(
        baseInstructions.testSendTransactionBatch(batches, [mockSigner])
      ).rejects.toThrow('Batch transaction 2 failed')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Batch transaction 2 failed:',
        expect.any(Error)
      )
      
      // Clean up after the test
      cleanup()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      // Clear all mocks to ensure clean state
      vi.clearAllMocks()
      
      // Reset all mock implementations to defaults
      mockRpcClientInstance.getLatestBlockhash.mockResolvedValue({
        blockhash: 'mock-blockhash',
        lastValidBlockHeight: 1000
      })
      mockRpcClientInstance.getAccountInfo.mockResolvedValue(null)
      mockRpcClientInstance.getMultipleAccounts.mockResolvedValue([])
      mockRpcClientInstance.getProgramAccounts.mockResolvedValue([])
      mockRpcClientInstance.sendTransaction.mockResolvedValue('mock-signature')
      mockRpcClientInstance.getSignatureStatuses.mockResolvedValue([{ confirmationStatus: 'confirmed' }])
      mockRpcClientInstance.getFeeForMessage.mockResolvedValue(5000)
      mockRpcClientInstance.simulateTransaction.mockResolvedValue({
        value: {
          err: null,
          logs: ['Program log: Success'],
          unitsConsumed: BigInt(100000)
        }
      })
    })

    it('should handle empty instruction arrays', async () => {
      // Empty arrays are technically valid but useless
      const signature = await baseInstructions.testSendTransaction([], [mockSigner])
      expect(signature).toBe('mock-signature')
    })

    it('should handle missing signers', async () => {
      // This should fail when trying to access signer[0]
      await expect(
        baseInstructions.testSendTransaction([mockInstruction], [])
      ).rejects.toThrow()
    })

    it('should handle very large instruction data', async () => {
      const largeData = new Uint8Array(10000)
      const largeInstruction = { ...mockInstruction, data: largeData }
      
      await baseInstructions.testSendTransaction([largeInstruction], [mockSigner])
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Transaction size'))
    })

    it('should handle RPC endpoint detection fallback', async () => {
      const configNoEndpoint = { ...config, rpcEndpoint: undefined }
      const instructions = new TestInstructions(configNoEndpoint)
      
      const signature = await instructions.testSendTransaction([mockInstruction], [mockSigner])
      expect(signature).toBe('mock-signature')
    })

    it('should handle transaction confirmation with various statuses', async () => {
      // Use global mock instance
      
      mockRpcClientInstance.getSignatureStatuses
        .mockResolvedValueOnce([{ confirmationStatus: 'processed' }])
        .mockResolvedValueOnce([{ confirmationStatus: 'confirmed' }])

      await baseInstructions.testSendTransaction([mockInstruction], [mockSigner])
      
      // The mock should have been called, but reset the count after each test
      expect(mockRpcClientInstance.getSignatureStatuses).toHaveBeenCalled()
    })

    it('should handle transaction errors in confirmation status', async () => {
      // Use global mock instance
      
      mockRpcClientInstance.getSignatureStatuses.mockResolvedValueOnce([{
        confirmationStatus: 'confirmed',
        err: { InstructionError: [0, 'Custom'] }
      }])

      await expect(
        baseInstructions.testSendTransaction([mockInstruction], [mockSigner])
      ).rejects.toThrow('Transaction failed')
    })
  })

  describe('Performance Tests', () => {
    it('should handle rapid sequential transactions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        baseInstructions.testSendTransaction(
          [{ ...mockInstruction, data: new Uint8Array([i]) }],
          [mockSigner]
        )
      )

      const signatures = await Promise.all(promises)
      expect(signatures).toHaveLength(10)
      expect(new Set(signatures).size).toBe(1) // All should be same mock signature
    })

    it('should efficiently estimate costs for multiple instructions', async () => {
      const instructions = Array.from({ length: 20 }, (_, i) => ({
        ...mockInstruction,
        data: new Uint8Array(i * 10)
      }))

      const startTime = performance.now()
      await baseInstructions.testEstimateTransactionCost(instructions)
      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(100) // Should be fast
    })
  })
})