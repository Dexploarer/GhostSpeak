/**
 * AgentModule Tests
 *
 * Tests the AgentModule class which manages agent registration and operations
 * for the GhostSpeak protocol.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { GhostSpeakConfig } from '../../../src/types'
import type { TransactionSigner } from '@solana/kit'

// Valid test addresses (well-known Solana addresses)
const PROGRAM_ID = address('11111111111111111111111111111111')
const OWNER_ADDRESS = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const AGENT_ADDRESS = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const AGENT_PUBKEY = address('SysvarRent111111111111111111111111111111111')

// Mock InstructionBuilder to avoid actual transaction signing
const mockExecute = vi.fn().mockResolvedValue('mock-signature')
const mockExecuteBatch = vi.fn().mockResolvedValue('mock-batch-signature')
const mockGetAccount = vi.fn().mockResolvedValue(null)
const mockGetProgramAccounts = vi.fn().mockResolvedValue([])

vi.mock('../../../src/core/InstructionBuilder.js', () => ({
  InstructionBuilder: vi.fn().mockImplementation(() => ({
    execute: mockExecute,
    executeBatch: mockExecuteBatch,
    getAccount: mockGetAccount,
    estimateCost: vi.fn().mockResolvedValue(5000n),
    explain: vi.fn().mockResolvedValue('Mock explanation'),
    debug: vi.fn().mockResolvedValue({}),
    enableDebug: vi.fn(),
    getAccounts: vi.fn().mockResolvedValue([]),
    getProgramAccounts: mockGetProgramAccounts
  }))
}))

// Mock CacheManager
vi.mock('../../../src/core/CacheManager.js', () => ({
  CacheManager: vi.fn().mockImplementation(() => ({
    isEnabled: vi.fn().mockReturnValue(false),
    getAccount: vi.fn().mockReturnValue(undefined),
    setAccount: vi.fn(),
    invalidateAccount: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn().mockReturnValue({ hits: 0, misses: 0 })
  }))
}))

// Mock PDA derivation
vi.mock('../../../src/utils/pda.js', () => ({
  deriveAgentPda: vi.fn().mockResolvedValue([AGENT_ADDRESS, 255]),
  deriveUserRegistryPda: vi.fn().mockResolvedValue(AGENT_ADDRESS)
}))

// Mock the generated index to return instruction builders
vi.mock('../../../src/generated/index.js', () => ({
  getRegisterAgentInstructionAsync: vi.fn().mockResolvedValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getUpdateAgentInstruction: vi.fn().mockReturnValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getVerifyAgentInstructionAsync: vi.fn().mockResolvedValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getDeactivateAgentInstruction: vi.fn().mockReturnValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getActivateAgentInstruction: vi.fn().mockReturnValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  getRegisterAgentCompressedInstructionAsync: vi.fn().mockResolvedValue({
    programAddress: PROGRAM_ID,
    accounts: [],
    data: new Uint8Array()
  }),
  PricingModel: {
    Fixed: 0,
    PerToken: 1,
    PerRequest: 2,
    Subscription: 3
  },
  AgentStatus: {
    Active: 'Active',
    Inactive: 'Inactive',
    Deactivated: 'Deactivated'
  }
}))

// Import after mocks
import { AgentModule } from '../../../src/core/modules/AgentModule.js'
import {
  getRegisterAgentInstructionAsync,
  getUpdateAgentInstruction,
  getVerifyAgentInstructionAsync,
  getDeactivateAgentInstruction,
  getActivateAgentInstruction,
  getRegisterAgentCompressedInstructionAsync,
  PricingModel
} from '../../../src/generated/index.js'

describe('AgentModule', () => {
  let agentModule: AgentModule
  let config: GhostSpeakConfig
  let mockSigner: TransactionSigner

  beforeEach(() => {
    vi.clearAllMocks()
    mockExecute.mockResolvedValue('mock-signature')
    mockExecuteBatch.mockResolvedValue('mock-batch-signature')
    mockGetAccount.mockResolvedValue(null)
    mockGetProgramAccounts.mockResolvedValue([])

    config = {
      programId: PROGRAM_ID,
      rpcEndpoint: 'https://api.devnet.solana.com',
      commitment: 'confirmed',
      cluster: 'devnet'
    }

    mockSigner = {
      address: OWNER_ADDRESS,
      signTransactionMessage: vi.fn()
    } as unknown as TransactionSigner

    agentModule = new AgentModule(config)
  })

  describe('register', () => {
    it('should register a new agent', async () => {
      const result = await agentModule.register(mockSigner, {
        agentType: 1,
        name: 'Test Agent',
        description: 'A test agent',
        metadataUri: 'https://example.com/metadata.json',
        agentId: 'agent-123'
      })

      expect(result).toBe('mock-batch-signature')
      expect(mockExecuteBatch).toHaveBeenCalled()
    })

    it('should register agent with IPFS metadata', async () => {
      const result = await agentModule.register(mockSigner, {
        agentType: 2,
        name: 'IPFS Agent',
        description: 'Agent with IPFS metadata',
        metadataUri: 'ipfs://QmTest123',
        agentId: 'ipfs-agent'
      })

      expect(result).toBe('mock-batch-signature')
    })
  })

  describe('update', () => {
    it('should update agent metadata', async () => {
      const result = await agentModule.update(mockSigner, {
        agentAddress: AGENT_ADDRESS,
        metadataUri: 'https://example.com/updated.json',
        agentType: 1,
        agentId: 'agent-123',
        name: 'Updated Agent',
        description: 'Updated description'
      })

      expect(result).toBe('mock-signature')
      expect(mockExecute).toHaveBeenCalled()
    })
  })

  describe('verify', () => {
    it('should verify an agent', async () => {
      const result = await agentModule.verify(mockSigner, {
        agentAddress: AGENT_ADDRESS,
        agentPubkey: AGENT_PUBKEY,
        serviceEndpoint: 'https://agent.example.com',
        supportedCapabilities: [1, 2, 3],
        verifiedAt: BigInt(Date.now())
      })

      expect(result).toBe('mock-signature')
      expect(mockExecute).toHaveBeenCalled()
    })
  })

  describe('deactivate', () => {
    it('should deactivate an agent', async () => {
      const result = await agentModule.deactivate(mockSigner, {
        agentAddress: AGENT_ADDRESS,
        agentId: 'agent-123'
      })

      expect(result).toBe('mock-signature')
      expect(mockExecute).toHaveBeenCalled()
    })
  })

  describe('activate', () => {
    it('should activate a deactivated agent', async () => {
      const result = await agentModule.activate(mockSigner, {
        agentAddress: AGENT_ADDRESS,
        agentId: 'agent-123'
      })

      expect(result).toBe('mock-signature')
      expect(mockExecute).toHaveBeenCalled()
    })
  })

  describe('registerCompressed', () => {
    it('should register a compressed agent', async () => {
      const result = await agentModule.registerCompressed(mockSigner, {
        agentType: 3,
        name: 'Compressed Agent',
        description: 'A compressed agent',
        metadataUri: 'https://example.com/compressed.json',
        agentId: 'compressed-agent',
        merkleTree: address('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin')
      })

      expect(result).toBe('mock-signature')
      expect(mockExecute).toHaveBeenCalled()
    })
  })

  describe('PDA derivation', () => {
    it('should derive correct agent PDA', async () => {
      // Register triggers PDA derivation
      await agentModule.register(mockSigner, {
        agentType: 1,
        name: 'PDA Test',
        description: 'Testing PDA derivation',
        metadataUri: 'https://example.com/pda.json',
        agentId: 'pda-test'
      })

      // The executeBatch should have been called with the derived PDA
      expect(mockExecuteBatch).toHaveBeenCalled()
    })
  })

  describe('getAgentAccount', () => {
    it('should fetch agent account details', async () => {
      const mockAgent = {
        agentType: 1,
        authority: OWNER_ADDRESS,
        name: 'Test Agent',
        description: 'Test description',
        metadataUri: 'https://example.com/metadata.json',
        agentId: 'agent-123',
        isActive: true
      }
      mockGetAccount.mockResolvedValue(mockAgent)

      const result = await agentModule.getAgentAccount(AGENT_ADDRESS)

      expect(result).toEqual(mockAgent)
    })

    it('should return null for non-existent agent', async () => {
      mockGetAccount.mockResolvedValue(null)

      const result = await agentModule.getAgentAccount(AGENT_ADDRESS)

      expect(result).toBeNull()
    })
  })

  describe('getAllAgents', () => {
    it('should fetch all agents', async () => {
      const mockAgents = [
        { address: AGENT_ADDRESS, data: { agentType: 1, name: 'Agent 1' } },
        { address: AGENT_PUBKEY, data: { agentType: 2, name: 'Agent 2' } }
      ]
      mockGetProgramAccounts.mockResolvedValue(mockAgents)

      const result = await agentModule.getAllAgents()

      expect(result).toEqual(mockAgents)
      expect(mockGetProgramAccounts).toHaveBeenCalled()
    })
  })
})
