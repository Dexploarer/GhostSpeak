import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentInstructions } from '../../../src/client/instructions/AgentInstructions'
import { 
  address,
  generateKeyPairSigner,
  lamports,
  createKeyPairSignerFromPrivateKeyBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions
} from '@solana/kit'
import type { TransactionSigner, Address } from '@solana/kit'

describe('AgentInstructions', () => {
  let agentInstructions: AgentInstructions
  let mockRpc: any
  let payer: TransactionSigner
  let agent: TransactionSigner
  let programId: Address

  beforeEach(async () => {
    // Create mock RPC
    mockRpc = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        value: {
          blockhash: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          lastValidBlockHeight: 100n
        }
      }),
      getAccountInfo: vi.fn().mockResolvedValue({
        value: null
      }),
      simulateTransaction: vi.fn().mockResolvedValue({
        value: {
          err: null,
          logs: []
        }
      }),
      sendTransaction: vi.fn().mockResolvedValue('mockTxSignature')
    }

    // Create test signers
    payer = await generateKeyPairSigner()
    agent = await generateKeyPairSigner()
    programId = address('5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK')

    agentInstructions = new AgentInstructions(mockRpc, programId)
  })

  describe('registerAgent', () => {
    it('should create register agent instruction with valid parameters', async () => {
      const params = {
        signer: agent,
        payer,
        name: 'Test Agent',
        description: 'A test AI agent for unit testing',
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities: ['code-review', 'testing', 'documentation'],
        pricing: {
          basePrice: lamports(1000000n), // 0.001 SOL
          currency: 'SOL'
        }
      }

      const instruction = await agentInstructions.registerAgent(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
      
      // Verify accounts are set correctly
      const accounts = instruction.accounts
      expect(accounts).toHaveLength(4) // agent, owner, agentRegistry, systemProgram
      expect(accounts[1].address).toBe(agent.address) // owner account
    })

    it('should handle long names and descriptions', async () => {
      const longName = 'A'.repeat(50)
      const longDescription = 'B'.repeat(500)
      
      const params = {
        signer: agent,
        payer,
        name: longName,
        description: longDescription,
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities: ['testing'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      }

      const instruction = await agentInstructions.registerAgent(params)
      
      expect(instruction).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should handle multiple capabilities', async () => {
      const capabilities = [
        'code-review',
        'testing',
        'documentation',
        'debugging',
        'optimization',
        'security-audit'
      ]
      
      const params = {
        signer: agent,
        payer,
        name: 'Multi-Capability Agent',
        description: 'Agent with many capabilities',
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities,
        pricing: {
          basePrice: lamports(2000000n),
          currency: 'SOL'
        }
      }

      const instruction = await agentInstructions.registerAgent(params)
      
      expect(instruction).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should validate pricing parameters', async () => {
      const params = {
        signer: agent,
        payer,
        name: 'Test Agent',
        description: 'Test description',
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities: ['testing'],
        pricing: {
          basePrice: lamports(0n), // Free service
          currency: 'SOL'
        }
      }

      const instruction = await agentInstructions.registerAgent(params)
      
      expect(instruction).toBeDefined()
    })
  })

  describe('updateAgent', () => {
    it('should create update agent instruction', async () => {
      const params = {
        signer: agent,
        name: 'Updated Agent Name',
        description: 'Updated description',
        avatar: 'https://example.com/new-avatar.png',
        pricing: {
          basePrice: lamports(2000000n),
          currency: 'SOL'
        }
      }

      const instruction = await agentInstructions.updateAgent(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
      expect(instruction.data).toBeDefined()
    })

    it('should handle partial updates', async () => {
      const params = {
        signer: agent,
        name: 'Only Name Updated'
        // Other fields remain unchanged
      }

      const instruction = await agentInstructions.updateAgent(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('activateAgent', () => {
    it('should create activate agent instruction', async () => {
      const params = {
        signer: agent,
        payer
      }

      const instruction = await agentInstructions.activateAgent(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
    })
  })

  describe('deactivateAgent', () => {
    it('should create deactivate agent instruction', async () => {
      const params = {
        signer: agent
      }

      const instruction = await agentInstructions.deactivateAgent(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
      expect(instruction.accounts).toBeDefined()
    })
  })

  describe('verifyAgent', () => {
    it('should create verify agent instruction for authority', async () => {
      const authority = await generateKeyPairSigner()
      const params = {
        signer: authority,
        agent: agent.address,
        verificationLevel: 'basic' as const,
        metadata: {
          verifiedAt: Date.now(),
          verifierName: 'GhostSpeak Protocol'
        }
      }

      const instruction = await agentInstructions.verifyAgent(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })
  })

  describe('updateAgentReputation', () => {
    it('should create update reputation instruction', async () => {
      const params = {
        signer: payer,
        agent: agent.address,
        taskCompleted: true,
        rating: 5,
        review: 'Excellent service!'
      }

      const instruction = await agentInstructions.updateAgentReputation(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })

    it('should validate rating bounds', async () => {
      const params = {
        signer: payer,
        agent: agent.address,
        taskCompleted: true,
        rating: 5, // Max rating
        review: 'Perfect!'
      }

      const instruction = await agentInstructions.updateAgentReputation(params)

      expect(instruction).toBeDefined()
    })
  })

  describe('listAgentForResale', () => {
    it('should create resale listing instruction', async () => {
      const params = {
        signer: agent,
        price: lamports(50000000n), // 0.05 SOL
        description: 'Selling my successful AI agent'
      }

      const instruction = await agentInstructions.listAgentForResale(params)

      expect(instruction).toBeDefined()
      expect(instruction.programAddress).toBe(programId)
    })
  })

  describe('Error handling', () => {
    it('should handle RPC errors gracefully', async () => {
      mockRpc.getAccountInfo.mockRejectedValueOnce(new Error('RPC Error'))

      const params = {
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
      }

      // Should not throw, but handle error internally
      const instruction = await agentInstructions.registerAgent(params)
      expect(instruction).toBeDefined()
    })
  })

  describe('Integration with transaction building', () => {
    it('should work with transaction message builder', async () => {
      const params = {
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
      }

      const instruction = await agentInstructions.registerAgent(params)
      
      // Build transaction message
      const blockhash = await mockRpc.getLatestBlockhash()
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(payer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(blockhash.value, tx),
        tx => appendTransactionMessageInstructions([instruction], tx)
      )

      expect(message).toBeDefined()
      expect(message.instructions).toHaveLength(1)
      expect(message.feePayer).toBe(payer.address)
    })
  })
})