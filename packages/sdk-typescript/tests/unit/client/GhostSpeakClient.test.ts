import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GhostSpeakClient } from '../../../src/client/GhostSpeakClient'
import { 
  address,
  generateKeyPairSigner,
  lamports,
  createSolanaRpc
} from '@solana/kit'
import type { TransactionSigner, Address, Rpc } from '@solana/kit'

describe('GhostSpeakClient', () => {
  let client: GhostSpeakClient
  let mockRpc: any
  let payer: TransactionSigner
  let programId: Address

  beforeEach(async () => {
    programId = address('AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR')
    payer = await generateKeyPairSigner()

    // Create comprehensive mock RPC
    mockRpc = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        value: {
          blockhash: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          lastValidBlockHeight: 150000000n
        }
      }),
      getAccountInfo: vi.fn().mockResolvedValue({
        value: null
      }),
      sendTransaction: vi.fn().mockResolvedValue('mockTransactionSignature'),
      simulateTransaction: vi.fn().mockResolvedValue({
        value: {
          err: null,
          logs: [],
          unitsConsumed: 5000n
        }
      }),
      getSignatureStatuses: vi.fn().mockResolvedValue({
        value: [{
          slot: 150000000n,
          confirmations: 10,
          err: null,
          confirmationStatus: 'confirmed'
        }]
      }),
      getBalance: vi.fn().mockResolvedValue({
        value: lamports(1000000000n)
      })
    }

    client = new GhostSpeakClient(mockRpc, programId)
  })

  describe('Client Creation', () => {
    it('should create client with factory method', () => {
      const newClient = GhostSpeakClient.create(mockRpc, programId)
      
      expect(newClient).toBeInstanceOf(GhostSpeakClient)
      expect(newClient.config.rpc).toBe(mockRpc)
      expect(newClient.config.programId).toBe(programId)
    })

    it('should create client with default program ID', () => {
      const newClient = GhostSpeakClient.create(mockRpc)
      
      expect(newClient).toBeInstanceOf(GhostSpeakClient)
      expect(newClient.config.programId).toBeDefined()
    })

    it('should create client with custom endpoint', () => {
      const endpoint = 'https://api.devnet.solana.com'
      const newClient = GhostSpeakClient.fromEndpoint(endpoint, programId)
      
      expect(newClient).toBeInstanceOf(GhostSpeakClient)
      expect(newClient.config.programId).toBe(programId)
    })
  })

  describe('Instruction Modules', () => {
    it('should have all instruction modules initialized', () => {
      expect(client.agent).toBeDefined()
      expect(client.marketplace).toBeDefined()
      expect(client.escrow).toBeDefined()
      expect(client.a2a).toBeDefined()
      expect(client.analytics).toBeDefined()
      expect(client.auction).toBeDefined()
      expect(client.bulkDeals).toBeDefined()
      expect(client.compliance).toBeDefined()
      expect(client.dispute).toBeDefined()
      expect(client.governance).toBeDefined()
    })

    it('should share RPC instance across modules', () => {
      // All modules should use the same RPC instance
      expect(client.agent['rpc']).toBe(mockRpc)
      expect(client.marketplace['rpc']).toBe(mockRpc)
      expect(client.escrow['rpc']).toBe(mockRpc)
    })

    it('should share program ID across modules', () => {
      expect(client.agent['programId']).toBe(programId)
      expect(client.marketplace['programId']).toBe(programId)
      expect(client.escrow['programId']).toBe(programId)
    })
  })

  describe('Configuration', () => {
    it('should expose configuration', () => {
      expect(client.config).toBeDefined()
      expect(client.config.rpc).toBe(mockRpc)
      expect(client.config.programId).toBe(programId)
    })

    it('should allow configuration updates', () => {
      const newRpc = { ...mockRpc }
      const newProgramId = address('NewProgramId1111111111111111111111111111111')
      
      // Create new client with different config
      const newClient = new GhostSpeakClient(newRpc, newProgramId)
      
      expect(newClient.config.rpc).toBe(newRpc)
      expect(newClient.config.programId).toBe(newProgramId)
    })
  })

  describe('Helper Methods', () => {
    it('should get latest blockhash', async () => {
      const blockhash = await client.getLatestBlockhash()
      
      expect(blockhash).toBeDefined()
      expect(blockhash.blockhash).toBe('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')
      expect(blockhash.lastValidBlockHeight).toBe(150000000n)
      expect(mockRpc.getLatestBlockhash).toHaveBeenCalled()
    })

    it('should get account balance', async () => {
      const testAddress = address('TestAddress11111111111111111111111111111111')
      const balance = await client.getBalance(testAddress)
      
      expect(balance).toBe(lamports(1000000000n))
      expect(mockRpc.getBalance).toHaveBeenCalledWith(testAddress)
    })

    it('should check if account exists', async () => {
      const existingAddress = address('ExistingAddress111111111111111111111111111111')
      const nonExistentAddress = address('NonExistent111111111111111111111111111111111')
      
      // Mock existing account
      mockRpc.getAccountInfo.mockResolvedValueOnce({
        value: {
          data: Buffer.from('data'),
          lamports: lamports(1000000n),
          owner: programId
        }
      })
      
      const exists = await client.accountExists(existingAddress)
      expect(exists).toBe(true)
      
      // Mock non-existent account
      mockRpc.getAccountInfo.mockResolvedValueOnce({ value: null })
      
      const notExists = await client.accountExists(nonExistentAddress)
      expect(notExists).toBe(false)
    })
  })

  describe('Transaction Building', () => {
    it('should build and send transaction', async () => {
      const agent = await generateKeyPairSigner()
      
      // Create instruction using agent module
      const instruction = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'Test Agent',
        description: 'Test Description',
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities: ['testing'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })
      
      // Build and send transaction
      const signature = await client.sendTransaction([instruction], [payer, agent])
      
      expect(signature).toBe('mockTransactionSignature')
      expect(mockRpc.sendTransaction).toHaveBeenCalled()
    })

    it('should simulate transaction before sending', async () => {
      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })
      
      const agent = await generateKeyPairSigner()
      const instruction = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'Test Agent',
        description: 'Test',
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities: ['testing'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })
      
      await client.sendTransaction([instruction], [payer, agent])
      
      expect(mockRpc.simulateTransaction).toHaveBeenCalled()
      expect(mockRpc.sendTransaction).toHaveBeenCalled()
    })

    it('should handle transaction errors', async () => {
      mockRpc.sendTransaction.mockRejectedValueOnce(new Error('Transaction failed'))
      
      const agent = await generateKeyPairSigner()
      const instruction = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'Test Agent',
        description: 'Test',
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities: ['testing'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })
      
      await expect(
        client.sendTransaction([instruction], [payer, agent])
      ).rejects.toThrow('Transaction failed')
    })
  })

  describe('Batch Operations', () => {
    it('should handle multiple instructions in one transaction', async () => {
      const agent = await generateKeyPairSigner()
      const buyer = await generateKeyPairSigner()
      
      // Create multiple instructions
      const registerIx = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'Batch Test Agent',
        description: 'Testing batch operations',
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities: ['batch-testing'],
        pricing: {
          basePrice: lamports(2000000n),
          currency: 'SOL'
        }
      })
      
      const activateIx = await client.agent.activateAgent({
        signer: agent,
        payer
      })
      
      // Send both in one transaction
      const signature = await client.sendTransaction(
        [registerIx, activateIx],
        [payer, agent]
      )
      
      expect(signature).toBe('mockTransactionSignature')
      expect(mockRpc.sendTransaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle RPC connection errors', async () => {
      mockRpc.getLatestBlockhash.mockRejectedValueOnce(new Error('Connection refused'))
      
      await expect(client.getLatestBlockhash()).rejects.toThrow('Connection refused')
    })

    it('should handle invalid program ID', () => {
      expect(() => {
        new GhostSpeakClient(mockRpc, 'invalid-address' as Address)
      }).toThrow()
    })

    it('should handle simulation errors gracefully', async () => {
      mockRpc.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { InstructionError: [0, { Custom: 1001 }] },
          logs: ['Program log: Error: Invalid instruction'],
          unitsConsumed: 3000n
        }
      })
      
      client = new GhostSpeakClient(mockRpc, programId, { simulateBeforeSend: true })
      
      const agent = await generateKeyPairSigner()
      const instruction = await client.agent.registerAgent({
        signer: agent,
        payer,
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
        client.sendTransaction([instruction], [payer, agent])
      ).rejects.toThrow()
    })
  })

  describe('Advanced Features', () => {
    it('should support custom transaction options', async () => {
      const agent = await generateKeyPairSigner()
      const instruction = await client.agent.registerAgent({
        signer: agent,
        payer,
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
      
      await client.sendTransaction([instruction], [payer, agent], {
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

    it('should support commitment levels', async () => {
      const testAddress = address('TestAddress11111111111111111111111111111111')
      
      // Create client with custom commitment
      const committedClient = new GhostSpeakClient(mockRpc, programId, {
        commitment: 'finalized'
      })
      
      await committedClient.accountExists(testAddress)
      
      expect(mockRpc.getAccountInfo).toHaveBeenCalledWith(
        testAddress,
        expect.objectContaining({ commitment: 'finalized' })
      )
    })
  })

  describe('Integration Patterns', () => {
    it('should work with async/await patterns', async () => {
      const agent = await generateKeyPairSigner()
      
      // Register agent
      const registerIx = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'Async Agent',
        description: 'Testing async patterns',
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities: ['async'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })
      
      // Send transaction
      const signature = await client.sendTransaction([registerIx], [payer, agent])
      
      // Wait for confirmation
      const status = await client.confirmTransaction(signature)
      
      expect(status.confirmationStatus).toBe('confirmed')
    })

    it('should support promise chaining', () => {
      const agent = generateKeyPairSigner()
      
      return agent.then(agentSigner => {
        return client.agent.registerAgent({
          signer: agentSigner,
          payer,
          name: 'Promise Agent',
          description: 'Testing promises',
          avatar: 'https://example.com/avatar.png',
          category: 'Development',
          capabilities: ['promises'],
          pricing: {
            basePrice: lamports(1000000n),
            currency: 'SOL'
          }
        })
      }).then(instruction => {
        return agent.then(agentSigner => 
          client.sendTransaction([instruction], [payer, agentSigner])
        )
      }).then(signature => {
        expect(signature).toBe('mockTransactionSignature')
      })
    })
  })
})