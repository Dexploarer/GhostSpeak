/**
 * Comprehensive tests for AgentService
 * Testing all agent management operations and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AgentService } from '../../src/services/AgentService'
import {
  ValidationError,
  NotFoundError,
  NetworkError,
  UnauthorizedError,
  type AgentServiceDependencies,
  type RegisterAgentParams,
  type Agent
} from '../../src/types/services'

// Mock crypto.randomUUID
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-1234-5678-9abc-def012345678')
}))

// Mock client utilities
const mockWallet = {
  address: 'mock-wallet-address-123456789',
  toString: () => 'mock-wallet-address-123456789'
}

vi.mock('../../src/utils/client.js', () => ({
  getWallet: vi.fn(() => Promise.resolve(mockWallet)),
  toSDKSigner: vi.fn(() => mockWallet)
}))

describe('AgentService', () => {
  let agentService: AgentService
  let mockDeps: AgentServiceDependencies
  let mockBlockchainService: any
  let mockClient: any
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Mock blockchain client
    mockClient = {
      agent: {
        registerAgent: vi.fn(),
        listAgents: vi.fn(),
        getAgent: vi.fn(),
        updateAgent: vi.fn()
      }
    }

    // Mock blockchain service
    mockBlockchainService = {
      getClient: vi.fn(() => Promise.resolve(mockClient))
    }

    // Mock dependencies
    mockDeps = {
      blockchainService: mockBlockchainService
    }

    agentService = new AgentService(mockDeps)
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('register', () => {
    const validRegisterParams: RegisterAgentParams = {
      name: 'Test Agent',
      description: 'A test AI agent',
      capabilities: ['text-generation', 'analysis'],
      category: 'general',
      pricing: { type: 'fixed', amount: 1000000000n },
      metadata: { version: '1.0.0' }
    }

    it('should register agent successfully', async () => {
      const mockResult = { signature: 'mock-signature-123' }
      mockClient.agent.registerAgent.mockResolvedValue(mockResult)

      const result = await agentService.register(validRegisterParams)

      expect(result).toMatchObject({
        id: expect.stringMatching(/^[a-f0-9]+$/), // UUID without dashes
        name: 'Test Agent',
        description: 'A test AI agent',
        capabilities: ['text-generation', 'analysis'],
        owner: mockWallet.address,
        isActive: true,
        reputationScore: 0
      })

      expect(mockClient.agent.registerAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: expect.any(String),
          metadataUri: expect.stringContaining('data:application/json;base64,')
        }),
        mockWallet
      )
    })

    it('should validate required parameters', async () => {
      const invalidParams = {
        ...validRegisterParams,
        name: '' // Empty name
      }

      await expect(agentService.register(invalidParams)).rejects.toThrow(ValidationError)
    })

    it('should validate name length', async () => {
      const invalidParams = {
        ...validRegisterParams,
        name: 'a'.repeat(101) // Too long
      }

      await expect(agentService.register(invalidParams)).rejects.toThrow(ValidationError)
    })

    it('should validate capabilities array', async () => {
      const invalidParams = {
        ...validRegisterParams,
        capabilities: [] // Empty capabilities
      }

      await expect(agentService.register(invalidParams)).rejects.toThrow(ValidationError)
    })

    it('should handle blockchain registration errors', async () => {
      mockClient.agent.registerAgent.mockRejectedValue(new Error('Blockchain error'))

      await expect(agentService.register(validRegisterParams)).rejects.toThrow('Blockchain error')
    })

    it('should handle network errors', async () => {
      mockBlockchainService.getClient.mockRejectedValue(new Error('Network unreachable'))

      await expect(agentService.register(validRegisterParams)).rejects.toThrow('Network unreachable')
    })

    it('should create proper metadata URI', async () => {
      mockClient.agent.registerAgent.mockResolvedValue({ signature: 'test' })

      await agentService.register(validRegisterParams)

      const registerCall = mockClient.agent.registerAgent.mock.calls[0]
      const metadataUri = registerCall[0].metadataUri

      expect(metadataUri).toMatch(/^data:application\/json;base64,/)

      // Decode and verify metadata
      const base64Data = metadataUri.split(',')[1]
      const decodedData = JSON.parse(Buffer.from(base64Data, 'base64').toString())

      expect(decodedData).toMatchObject({
        name: 'Test Agent',
        description: 'A test AI agent',
        capabilities: ['text-generation', 'analysis'],
        category: 'general',
        attributes: expect.arrayContaining([
          { trait_type: 'Agent Type', value: 'AI Agent' },
          { trait_type: 'Category', value: 'general' },
          { trait_type: 'Capabilities', value: 'text-generation, analysis' }
        ])
      })
    })

    it('should generate UUID without dashes', async () => {
      mockClient.agent.registerAgent.mockResolvedValue({ signature: 'test' })

      const result = await agentService.register(validRegisterParams)

      expect(result.id).not.toContain('-')
      expect(result.id).toHaveLength(32) // UUID without dashes
    })
  })

  describe('list', () => {
    const mockAgents: Agent[] = [
      {
        id: 'agent1',
        address: 'address1' as any,
        name: 'Agent 1',
        description: 'First agent',
        capabilities: ['text'],
        owner: 'owner1' as any,
        isActive: true,
        reputationScore: 100,
        createdAt: 1000n,
        updatedAt: 1000n,
        metadata: {}
      },
      {
        id: 'agent2',
        address: 'address2' as any,
        name: 'Agent 2',
        description: 'Second agent',
        capabilities: ['analysis'],
        owner: 'owner2' as any,
        isActive: false,
        reputationScore: 50,
        createdAt: 2000n,
        updatedAt: 2000n,
        metadata: {}
      }
    ]

    it('should list agents successfully', async () => {
      mockClient.agent.listAgents.mockResolvedValue(mockAgents)

      const result = await agentService.list({})

      expect(result).toEqual(mockAgents)
      expect(mockClient.agent.listAgents).toHaveBeenCalledWith({})
    })

    it('should handle list parameters', async () => {
      const listParams = {
        limit: 10,
        offset: 20,
        category: 'general',
        isActive: true
      }

      mockClient.agent.listAgents.mockResolvedValue(mockAgents)

      await agentService.list(listParams)

      expect(mockClient.agent.listAgents).toHaveBeenCalledWith(listParams)
    })

    it('should cache list results', async () => {
      mockClient.agent.listAgents.mockResolvedValue(mockAgents)

      // First call
      const result1 = await agentService.list({})
      // Second call immediately
      const result2 = await agentService.list({})

      expect(result1).toEqual(result2)
      expect(mockClient.agent.listAgents).toHaveBeenCalledTimes(1)
    })

    it('should handle empty list', async () => {
      mockClient.agent.listAgents.mockResolvedValue([])

      const result = await agentService.list({})

      expect(result).toEqual([])
    })

    it('should handle network errors', async () => {
      mockClient.agent.listAgents.mockRejectedValue(new Error('Network error'))

      await expect(agentService.list({})).rejects.toThrow('Network error')
    })
  })

  describe('getById', () => {
    const mockAgent: Agent = {
      id: 'test-agent-id',
      address: 'test-address' as any,
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['test'],
      owner: 'test-owner' as any,
      isActive: true,
      reputationScore: 75,
      createdAt: 1000n,
      updatedAt: 1000n,
      metadata: {}
    }

    it('should get agent by ID successfully', async () => {
      mockClient.agent.getAgent.mockResolvedValue(mockAgent)

      const result = await agentService.getById('test-agent-id')

      expect(result).toEqual(mockAgent)
      expect(mockClient.agent.getAgent).toHaveBeenCalledWith('test-agent-id')
    })

    it('should cache individual agent results', async () => {
      mockClient.agent.getAgent.mockResolvedValue(mockAgent)

      // First call
      const result1 = await agentService.getById('test-agent-id')
      // Second call immediately
      const result2 = await agentService.getById('test-agent-id')

      expect(result1).toEqual(result2)
      expect(mockClient.agent.getAgent).toHaveBeenCalledTimes(1)
    })

    it('should handle agent not found', async () => {
      mockClient.agent.getAgent.mockRejectedValue(new Error('Agent not found'))

      await expect(agentService.getById('nonexistent')).rejects.toThrow('Agent not found')
    })

    it('should validate agent ID parameter', async () => {
      await expect(agentService.getById('')).rejects.toThrow(ValidationError)
      await expect(agentService.getById('   ')).rejects.toThrow(ValidationError)
    })
  })

  describe('update', () => {
    const updateParams = {
      id: 'test-agent-id',
      name: 'Updated Agent',
      description: 'Updated description',
      capabilities: ['updated-capability']
    }

    it('should update agent successfully', async () => {
      const updatedAgent = {
        ...updateParams,
        address: 'test-address' as any,
        owner: mockWallet.address as any,
        isActive: true,
        reputationScore: 75,
        createdAt: 1000n,
        updatedAt: 2000n,
        metadata: {}
      }

      mockClient.agent.updateAgent.mockResolvedValue(updatedAgent)

      const result = await agentService.update(updateParams)

      expect(result).toEqual(updatedAgent)
      expect(mockClient.agent.updateAgent).toHaveBeenCalledWith(
        updateParams,
        mockWallet
      )
    })

    it('should validate update parameters', async () => {
      const invalidParams = {
        ...updateParams,
        id: '' // Empty ID
      }

      await expect(agentService.update(invalidParams)).rejects.toThrow(ValidationError)
    })

    it('should handle update errors', async () => {
      mockClient.agent.updateAgent.mockRejectedValue(new Error('Update failed'))

      await expect(agentService.update(updateParams)).rejects.toThrow('Update failed')
    })
  })

  describe('getAnalytics', () => {
    const mockAnalytics = {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      averageResponseTime: 250,
      reputation: 85,
      earnings: 5000000000n,
      lastActivity: 1640995200n
    }

    it('should get agent analytics successfully', async () => {
      // Mock the analytics method if it exists
      if (mockClient.agent.getAnalytics) {
        mockClient.agent.getAnalytics.mockResolvedValue(mockAnalytics)
      } else {
        mockClient.agent.getAnalytics = vi.fn().mockResolvedValue(mockAnalytics)
      }

      const result = await agentService.getAnalytics('test-agent-id')

      expect(result).toEqual(mockAnalytics)
    })

    it('should handle analytics errors', async () => {
      if (mockClient.agent.getAnalytics) {
        mockClient.agent.getAnalytics.mockRejectedValue(new Error('Analytics error'))
      } else {
        mockClient.agent.getAnalytics = vi.fn().mockRejectedValue(new Error('Analytics error'))
      }

      await expect(agentService.getAnalytics('test-agent-id')).rejects.toThrow('Analytics error')
    })
  })

  describe('cache management', () => {
    it('should expire cached data after TTL', async () => {
      const mockAgent = {
        id: 'test-agent',
        name: 'Test Agent'
      } as Agent

      mockClient.agent.getAgent.mockResolvedValue(mockAgent)

      // First call
      await agentService.getById('test-agent')

      // Mock time passing beyond TTL
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 31000) // 31 seconds

      // Second call should fetch fresh data
      await agentService.getById('test-agent')

      expect(mockClient.agent.getAgent).toHaveBeenCalledTimes(2)
    })

    it('should handle concurrent requests efficiently', async () => {
      const mockAgent = {
        id: 'test-agent',
        name: 'Test Agent'
      } as Agent

      mockClient.agent.getAgent.mockResolvedValue(mockAgent)

      // Make concurrent requests
      const promises = Array.from({ length: 5 }, () => 
        agentService.getById('test-agent')
      )

      const results = await Promise.all(promises)

      // All should return the same result
      results.forEach(result => {
        expect(result).toEqual(mockAgent)
      })

      // But only one network call should be made due to caching
      expect(mockClient.agent.getAgent).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling scenarios', () => {
    it('should handle wallet resolution errors', async () => {
      const { getWallet } = await import('../../src/utils/client.js')
      vi.mocked(getWallet).mockRejectedValue(new Error('Wallet not found'))

      await expect(agentService.register({
        name: 'Test',
        description: 'Test',
        capabilities: ['test'],
        pricing: { type: 'fixed', amount: 1000n }
      })).rejects.toThrow('Wallet not found')
    })

    it('should handle client initialization errors', async () => {
      mockBlockchainService.getClient.mockRejectedValue(new Error('Client init failed'))

      await expect(agentService.list({})).rejects.toThrow('Client init failed')
    })
  })
})