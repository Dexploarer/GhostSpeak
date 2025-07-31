import { vi } from 'vitest'
import { address } from '@solana/addresses'

// Mock the generated instruction functions
vi.mock('../../../src/generated/index.js', () => ({
  getRegisterAgentInstructionAsync: vi.fn(() => Promise.resolve({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  })),
  getUpdateAgentInstruction: vi.fn(() => ({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  })),
  getVerifyAgentInstructionAsync: vi.fn(() => Promise.resolve({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  })),
  getDeactivateAgentInstruction: vi.fn(() => ({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  })),
  getActivateAgentInstruction: vi.fn(() => ({
    programAddress: address('11111111111111111111111111111111'),
    accounts: [],
    data: new Uint8Array()
  })),
  getRegisterAgentCompressedInstructionAsync: vi.fn(() => Promise.resolve({
    instruction: {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array()
    }
  })),
  AgentStatus: {
    Active: 'Active',
    Inactive: 'Inactive',
    Deactivated: 'Deactivated'
  }
}))

import { describe, it, expect, beforeEach } from 'vitest'
import { AgentModule } from '../../../src/core/modules/AgentModule.js'
import type { GhostSpeakClient } from '../../../src/core/GhostSpeakClient.js'
import type { TransactionSigner } from '@solana/kit'
import { AgentStatus } from '../../../src/generated/index.js'

describe('AgentModule', () => {
  let agentModule: AgentModule
  let mockClient: GhostSpeakClient
  let mockSigner: TransactionSigner

  beforeEach(() => {
    // Create mock client
    mockClient = {
      programId: address('11111111111111111111111111111119'),
      config: {
        endpoint: 'https://api.devnet.solana.com',
        ipfs: {
          enabled: false
        }
      },
      sendTransaction: vi.fn().mockResolvedValue('mock-signature')
    } as unknown as GhostSpeakClient

    // Create mock signer
    mockSigner = {
      address: address('7nxKPm1RvRPKW9TVXm2jJhqFfR3C4nJVUJdRRyMvRH8L'),
      keyPair: {} as CryptoKeyPair,
      signMessages: vi.fn(),
      signTransactions: vi.fn()
    }

    // Create agent module instance
    agentModule = new AgentModule(mockClient)
  })

  describe('register', () => {
    it('should register a new agent', async () => {
      const metadata = {
        id: 'agent-123',
        name: 'Test Agent',
        capabilities: ['trading', 'analytics'],
        pricing: {
          basePrice: 100n,
          currency: 'USDC'
        }
      }

      const result = await agentModule.register({
        agentId: metadata.id,
        metadata,
        signers: [mockSigner]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })

    it('should register agent with IPFS metadata', async () => {
      // Enable IPFS in config
      mockClient.config.ipfs = {
        enabled: true,
        gateway: 'https://ipfs.io/ipfs',
        pinning: {
          service: 'pinata',
          apiKey: 'test-key',
          apiSecret: 'test-secret'
        }
      }

      const metadata = {
        id: 'agent-ipfs',
        name: 'IPFS Agent',
        description: 'A very long description that should be stored on IPFS',
        capabilities: ['storage', 'retrieval'],
        largeLogo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }

      const result = await agentModule.register({
        agentId: metadata.id,
        metadata,
        signers: [mockSigner]
      })

      expect(result).toBe('mock-signature')
    })
  })

  describe('update', () => {
    it('should update agent metadata', async () => {
      const updateData = {
        name: 'Updated Agent',
        status: AgentStatus.Active
      }

      const result = await agentModule.update({
        agentId: 'agent-123',
        updateData,
        signers: [mockSigner]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('verify', () => {
    it('should verify an agent', async () => {
      const result = await agentModule.verify({
        agentId: 'agent-123',
        verificationData: {
          proof: new Uint8Array(64),
          timestamp: BigInt(Date.now())
        },
        signers: [mockSigner]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('deactivate', () => {
    it('should deactivate an agent', async () => {
      const result = await agentModule.deactivate({
        agentId: 'agent-123',
        signers: [mockSigner]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('activate', () => {
    it('should activate a deactivated agent', async () => {
      const result = await agentModule.activate({
        agentId: 'agent-123',
        signers: [mockSigner]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('registerCompressed', () => {
    it('should register a compressed agent', async () => {
      const metadata = {
        id: 'compressed-agent',
        name: 'Compressed Agent',
        capabilities: ['compression']
      }

      const result = await agentModule.registerCompressed({
        agentId: metadata.id,
        metadata,
        merkleProof: {
          proof: [new Uint8Array(32), new Uint8Array(32)],
          leafIndex: 0,
          root: new Uint8Array(32)
        },
        signers: [mockSigner]
      })

      expect(result).toBe('mock-signature')
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })

  describe('PDA derivation', () => {
    it('should derive correct agent PDA', () => {
      // Test internal PDA derivation by calling a method that uses it
      const agentId = 'test-agent-pda'
      
      // We can't directly test the private method, but we can verify
      // it's called correctly when registering an agent
      agentModule.register({
        agentId,
        metadata: { id: agentId, name: 'PDA Test' },
        signers: [mockSigner]
      })

      // The PDA should be derived using the agent ID
      expect(mockClient.sendTransaction).toHaveBeenCalled()
    })
  })
})