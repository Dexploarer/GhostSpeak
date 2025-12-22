/**
 * Tests for AgentService
 * Testing validation and basic structure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AgentService } from '../../src/services/AgentService'
import {
  ValidationError,
  UnauthorizedError,
  type AgentServiceDependencies,
  type RegisterAgentParams
} from '../../src/types/services'

// Mock console to prevent test output noise
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('AgentService', () => {
  let agentService: AgentService
  let mockDeps: AgentServiceDependencies

  const createMockDeps = (): AgentServiceDependencies => {
    return {
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        handleError: vi.fn()
      },
      walletService: {
        getActiveSigner: vi.fn().mockResolvedValue(null),
        getWallet: vi.fn().mockResolvedValue(null),
        getBalance: vi.fn().mockResolvedValue(1000000000n)
      },
      blockchainService: {
        getClient: vi.fn().mockResolvedValue({})
      },
      storageService: {
        uploadMetadata: vi.fn().mockResolvedValue('ipfs://mock-cid'),
        getMetadata: vi.fn()
      }
    } as unknown as AgentServiceDependencies
  }

  beforeEach(() => {
    mockDeps = createMockDeps()
    agentService = new AgentService(mockDeps)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create an instance with dependencies', () => {
      expect(agentService).toBeInstanceOf(AgentService)
    })
  })

  describe('register', () => {
    const validParams: RegisterAgentParams = {
      name: 'Test Agent',
      description: 'A test AI agent for testing purposes',
      capabilities: ['text-generation', 'analysis'],
      category: 'general',
      pricing: { type: 'fixed', amount: 1000000000n },
      metadata: { version: '1.0.0' }
    }

    describe('validation', () => {
      it('should reject empty name', async () => {
        const invalidParams = { ...validParams, name: '' }
        await expect(agentService.register(invalidParams)).rejects.toThrow(ValidationError)
      })

      it('should reject short name', async () => {
        const invalidParams = { ...validParams, name: 'ab' }
        await expect(agentService.register(invalidParams)).rejects.toThrow(ValidationError)
      })

      it('should reject empty description', async () => {
        const invalidParams = { ...validParams, description: '' }
        await expect(agentService.register(invalidParams)).rejects.toThrow(ValidationError)
      })

      it('should reject short description', async () => {
        const invalidParams = { ...validParams, description: 'short' }
        await expect(agentService.register(invalidParams)).rejects.toThrow(ValidationError)
      })

      it('should reject empty capabilities', async () => {
        const invalidParams = { ...validParams, capabilities: [] }
        await expect(agentService.register(invalidParams)).rejects.toThrow(ValidationError)
      })
    })

    describe('wallet requirement', () => {
      it('should require active wallet', async () => {
        // Wallet returns null, so registration should fail
        await expect(agentService.register(validParams)).rejects.toThrow(UnauthorizedError)
      })

      it('should log wallet requirement error', async () => {
        try {
          await agentService.register(validParams)
        } catch {
          // Expected to fail
        }
        expect(mockDeps.logger.error).toHaveBeenCalled()
      })
    })

    describe('logging', () => {
      it('should log registration start', async () => {
        try {
          await agentService.register(validParams)
        } catch {
          // Expected to fail without wallet
        }
        expect(mockDeps.logger.info).toHaveBeenCalledWith(
          'AgentService.register called',
          expect.any(Object)
        )
      })
    })
  })

  describe('list', () => {
    it('should return an array', async () => {
      const result = await agentService.list()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should accept filter parameters', async () => {
      const result = await agentService.list({
        limit: 10,
        offset: 0
      })
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getById', () => {
    it('should return null for non-existent agent', async () => {
      const result = await agentService.getById('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should require agent to exist', async () => {
      await expect(
        agentService.update('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow()
    })
  })

  describe('getAnalytics', () => {
    it('should require agent to exist for analytics', async () => {
      await expect(
        agentService.getAnalytics('non-existent-id')
      ).rejects.toThrow()
    })
  })
})
