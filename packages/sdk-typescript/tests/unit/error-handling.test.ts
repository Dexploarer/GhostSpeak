import { describe, it, expect, beforeEach } from 'vitest'
import { GhostSpeakClient } from '../../src/client/GhostSpeakClient'
import { 
  GhostSpeakError,
  InsufficientFundsError,
  InvalidInstructionError,
  AccountNotFoundError,
  UnauthorizedError,
  NetworkError,
  TransactionError,
  ValidationError
} from '../../src/errors'
import {
  createMockRpc,
  createTestAccounts,
  testConstants,
  errorMatchers
} from '../test-helpers'
import { address, lamports } from '@solana/kit'
import type { Address } from '@solana/kit'

describe('Error Handling', () => {
  let client: GhostSpeakClient
  let mockRpc: any
  let accounts: any
  let programId: Address

  beforeEach(async () => {
    mockRpc = createMockRpc()
    accounts = await createTestAccounts()
    programId = address(testConstants.PROGRAM_ID)
    client = new GhostSpeakClient(mockRpc, programId)
  })

  describe('Network Errors', () => {
    it('should handle connection refused errors', async () => {
      mockRpc.sendTransaction.mockRejectedValueOnce(
        new Error('fetch failed: Connection refused')
      )

      const instruction = await client.agent.registerAgent({
        signer: accounts.agent,
        payer: accounts.payer,
        name: 'Test Agent',
        description: 'Test',
        avatar: 'https://example.com/avatar.png',
        category: 'Test',
        capabilities: ['test'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })

      await expect(
        client.sendTransaction([instruction], [accounts.payer, accounts.agent])
      ).rejects.toThrow(errorMatchers.networkError)
    })

    it('should handle timeout errors', async () => {
      mockRpc.sendTransaction.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const instruction = await client.marketplace.createServiceListing({
        signer: accounts.agent,
        payer: accounts.payer,
        title: 'Test Service',
        description: 'Test',
        category: 'Test',
        price: lamports(1000000n),
        currency: 'SOL',
        deliveryTime: 3600
      })

      await expect(
        client.sendTransaction([instruction], [accounts.payer, accounts.agent])
      ).rejects.toThrow(/timeout/i)
    })

    it('should handle rate limiting errors', async () => {
      mockRpc.sendTransaction.mockRejectedValueOnce(
        new Error('429 Too Many Requests')
      )

      const instruction = await client.agent.activateAgent({
        signer: accounts.agent,
        payer: accounts.payer
      })

      await expect(
        client.sendTransaction([instruction], [accounts.payer, accounts.agent])
      ).rejects.toThrow(/429|too many requests/i)
    })
  })

  describe('On-Chain Errors', () => {
    it('should handle insufficient funds error', async () => {
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { 
            InstructionError: [
              0, 
              { Custom: 1 } // Custom error code for insufficient funds
            ]
          },
          logs: [
            'Program log: Instruction: RegisterAgent',
            'Program log: Error: Insufficient funds for transaction'
          ],
          unitsConsumed: 3000n
        }
      })

      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })

      const instruction = await client.agent.registerAgent({
        signer: accounts.agent,
        payer: accounts.agent, // Using agent as payer (might have insufficient funds)
        name: 'Poor Agent',
        description: 'No funds',
        avatar: 'https://example.com/avatar.png',
        category: 'Test',
        capabilities: ['test'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })

      await expect(
        client.sendTransaction([instruction], [accounts.agent])
      ).rejects.toThrow()
    })

    it('should handle invalid instruction data error', async () => {
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { 
            InstructionError: [
              0, 
              { Custom: 2001 } // Invalid instruction data
            ]
          },
          logs: [
            'Program log: Instruction: CreateServiceListing',
            'Program log: Error: Invalid instruction data: title cannot be empty'
          ],
          unitsConsumed: 2000n
        }
      })

      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })

      const instruction = await client.marketplace.createServiceListing({
        signer: accounts.agent,
        payer: accounts.payer,
        title: '', // Invalid empty title
        description: 'Test',
        category: 'Test',
        price: lamports(1000000n),
        currency: 'SOL',
        deliveryTime: 3600
      })

      await expect(
        client.sendTransaction([instruction], [accounts.payer, accounts.agent])
      ).rejects.toThrow()
    })

    it('should handle account not found error', async () => {
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { 
            InstructionError: [
              0, 
              'AccountNotFound'
            ]
          },
          logs: [
            'Program log: Instruction: UpdateAgent',
            'Program log: Error: Agent account not found'
          ],
          unitsConsumed: 1500n
        }
      })

      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })

      const instruction = await client.agent.updateAgent({
        signer: accounts.agent,
        name: 'Updated Name'
      })

      await expect(
        client.sendTransaction([instruction], [accounts.agent])
      ).rejects.toThrow()
    })

    it('should handle unauthorized error', async () => {
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { 
            InstructionError: [
              0, 
              { Custom: 3001 } // Unauthorized
            ]
          },
          logs: [
            'Program log: Instruction: VerifyAgent',
            'Program log: Error: Unauthorized: Only authority can verify agents'
          ],
          unitsConsumed: 1000n
        }
      })

      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })

      const instruction = await client.agent.verifyAgent({
        signer: accounts.buyer, // Wrong signer
        agent: accounts.agent.address,
        verificationLevel: 'basic',
        metadata: {
          verifiedAt: Date.now(),
          verifierName: 'Unauthorized Verifier'
        }
      })

      await expect(
        client.sendTransaction([instruction], [accounts.buyer])
      ).rejects.toThrow()
    })
  })

  describe('Validation Errors', () => {
    it('should handle enum validation errors', async () => {
      mockRpc.sendTransaction.mockRejectedValueOnce(
        new Error('Invalid enum variant. Expected one of [VolumeDiscount,BundleOffer,GroupPurchase,Wholesale]')
      )

      const instruction = await client.bulkDeals.createBulkDeal({
        signer: accounts.buyer,
        payer: accounts.payer,
        dealType: 'invalid_type' as any, // Invalid enum
        title: 'Test Deal',
        description: 'Test',
        services: [],
        discount: 10,
        validUntil: Date.now() + 86400000
      })

      await expect(
        client.sendTransaction([instruction], [accounts.payer, accounts.buyer])
      ).rejects.toThrow(errorMatchers.invalidEnum)
    })

    it('should handle serialization errors', async () => {
      mockRpc.sendTransaction.mockRejectedValueOnce(
        new Error('Failed to serialize instruction data')
      )

      // Create instruction with invalid data that might fail serialization
      const instruction = await client.marketplace.createServiceListing({
        signer: accounts.agent,
        payer: accounts.payer,
        title: 'A'.repeat(1000), // Very long title
        description: 'B'.repeat(10000), // Very long description
        category: 'Test',
        price: lamports(1000000n),
        currency: 'SOL',
        deliveryTime: 3600,
        requirements: Array(100).fill('requirement'), // Too many requirements
        tags: Array(100).fill('tag') // Too many tags
      })

      await expect(
        client.sendTransaction([instruction], [accounts.payer, accounts.agent])
      ).rejects.toThrow(/serialize/i)
    })
  })

  describe('Transaction Errors', () => {
    it('should handle transaction too large error', async () => {
      mockRpc.sendTransaction.mockRejectedValueOnce(
        new Error('Transaction too large: 1240 > 1232')
      )

      // Create multiple instructions to make transaction large
      const instructions = await Promise.all(
        Array(10).fill(null).map((_, i) => 
          client.agent.updateAgentReputation({
            signer: accounts.buyer,
            agent: accounts.agent.address,
            taskCompleted: true,
            rating: 5,
            review: `Review ${i}: `.padEnd(200, 'x') // Long review
          })
        )
      )

      await expect(
        client.sendTransaction(instructions, [accounts.buyer])
      ).rejects.toThrow(/too large/i)
    })

    it('should handle blockhash not found error', async () => {
      mockRpc.getLatestBlockhash.mockRejectedValueOnce(
        new Error('Blockhash not found')
      )

      const instruction = await client.agent.registerAgent({
        signer: accounts.agent,
        payer: accounts.payer,
        name: 'Test',
        description: 'Test',
        avatar: 'https://example.com/avatar.png',
        category: 'Test',
        capabilities: ['test'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })

      await expect(
        client.sendTransaction([instruction], [accounts.payer, accounts.agent])
      ).rejects.toThrow(/blockhash/i)
    })

    it('should handle signature verification error', async () => {
      mockRpc.sendTransaction.mockRejectedValueOnce(
        new Error('Signature verification failed')
      )

      const instruction = await client.escrow.createPayment({
        signer: accounts.buyer,
        payer: accounts.buyer,
        recipient: accounts.seller.address,
        amount: lamports(10000000n),
        workOrder: address('workOrder123'),
        useEscrow: true
      })

      await expect(
        client.sendTransaction([instruction], [accounts.buyer])
      ).rejects.toThrow(/signature/i)
    })
  })

  describe('Complex Error Scenarios', () => {
    it('should handle partial transaction failure in batch', async () => {
      // First transaction succeeds, second fails
      mockRpc.sendTransaction
        .mockResolvedValueOnce('success_tx_1')
        .mockRejectedValueOnce(new Error('Second transaction failed'))

      const instruction1 = await client.agent.registerAgent({
        signer: accounts.agent,
        payer: accounts.payer,
        name: 'Agent 1',
        description: 'First agent',
        avatar: 'https://example.com/avatar1.png',
        category: 'Test',
        capabilities: ['test'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })

      const tx1 = await client.sendTransaction([instruction1], [accounts.payer, accounts.agent])
      expect(tx1).toBe('success_tx_1')

      const instruction2 = await client.agent.activateAgent({
        signer: accounts.agent,
        payer: accounts.payer
      })

      await expect(
        client.sendTransaction([instruction2], [accounts.payer, accounts.agent])
      ).rejects.toThrow('Second transaction failed')
    })

    it('should handle cascading errors in workflow', async () => {
      // Mock agent not registered
      mockRpc.getAccountInfo.mockResolvedValue({ value: null })

      // Try to create service listing for non-existent agent
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { 
            InstructionError: [
              0, 
              { Custom: 4001 } // Agent not found
            ]
          },
          logs: [
            'Program log: Error: Agent must be registered before creating listings'
          ],
          unitsConsumed: 1000n
        }
      })

      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })

      const instruction = await client.marketplace.createServiceListing({
        signer: accounts.agent,
        payer: accounts.payer,
        title: 'Service',
        description: 'Test',
        category: 'Test',
        price: lamports(1000000n),
        currency: 'SOL',
        deliveryTime: 3600
      })

      await expect(
        client.sendTransaction([instruction], [accounts.payer, accounts.agent])
      ).rejects.toThrow()
    })

    it('should handle race condition errors', async () => {
      // Simulate account state changed between read and write
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { 
            InstructionError: [
              0, 
              { Custom: 5001 } // State changed
            ]
          },
          logs: [
            'Program log: Error: Account state has changed, please retry'
          ],
          unitsConsumed: 2000n
        }
      })

      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })

      const instruction = await client.escrow.processPayment({
        signer: accounts.buyer,
        payment: address('payment123'),
        action: 'release',
        reason: 'Work completed'
      })

      await expect(
        client.sendTransaction([instruction], [accounts.buyer])
      ).rejects.toThrow(/state.*changed/i)
    })
  })

  describe('Error Recovery', () => {
    it('should provide meaningful error messages', async () => {
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { 
            InstructionError: [
              0, 
              { Custom: 6001 }
            ]
          },
          logs: [
            'Program 5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK invoke [1]',
            'Program log: Instruction: CreateWorkOrder',
            'Program log: Error: Deadline must be in the future',
            'Program 5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK consumed 2500 units',
            'Program 5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK failed: custom program error: 0x1771'
          ],
          unitsConsumed: 2500n
        }
      })

      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })

      const instruction = await client.escrow.createWorkOrder({
        signer: accounts.buyer,
        payer: accounts.buyer,
        seller: accounts.seller.address,
        title: 'Test Order',
        description: 'Test',
        requirements: ['Test'],
        deliverables: ['Test'],
        price: lamports(10000000n),
        deadline: Date.now() - 86400000, // Past deadline
        useEscrow: true
      })

      try {
        await client.sendTransaction([instruction], [accounts.buyer])
      } catch (error: any) {
        expect(error.message).toMatch(/deadline.*future/i)
        expect(error.logs).toBeDefined()
        expect(error.logs).toContain('Program log: Error: Deadline must be in the future')
      }
    })

    it('should extract error codes from logs', async () => {
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { 
            InstructionError: [
              0, 
              { Custom: 7001 }
            ]
          },
          logs: [
            'Program log: AnchorError occurred. Error Code: InvalidInput. Error Number: 7001. Error Message: Invalid input parameters.'
          ],
          unitsConsumed: 1500n
        }
      })

      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })

      const instruction = await client.governance.createProposal({
        signer: accounts.agent,
        payer: accounts.payer,
        title: '', // Invalid empty title
        description: 'Test',
        proposalType: 'parameter_change',
        votingPeriod: 259200,
        options: ['Yes', 'No']
      })

      try {
        await client.sendTransaction([instruction], [accounts.payer, accounts.agent])
      } catch (error: any) {
        expect(error.code).toBe(7001)
        expect(error.message).toMatch(/invalid input/i)
      }
    })
  })
})