/**
 * Unit tests for AgentCacheService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AgentCacheService } from '../../../src/database/services/AgentCacheService.js'

// Mock the database connection
vi.mock('../../../src/database/connection.js', () => ({
    isAvailable: vi.fn(() => Promise.resolve(false))
}))

describe('AgentCacheService', () => {
    let cacheService: AgentCacheService

    beforeEach(() => {
        cacheService = AgentCacheService.getInstance()
    })

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = AgentCacheService.getInstance()
            const instance2 = AgentCacheService.getInstance()

            expect(instance1).toBe(instance2)
        })
    })

    describe('isCacheAvailable', () => {
        it('should return false when database not available', async () => {
            const available = await cacheService.isCacheAvailable()

            expect(available).toBe(false)
        })
    })

    describe('getAgent (without database)', () => {
        it('should return null when database not available', async () => {
            const agent = await cacheService.getAgent('test_address')

            expect(agent).toBeNull()
        })

        it('should respect forceRefresh option', async () => {
            const agent = await cacheService.getAgent('test_address', { forceRefresh: true })

            expect(agent).toBeNull()
        })
    })

    describe('getAgents (without database)', () => {
        it('should return empty map when database not available', async () => {
            const agents = await cacheService.getAgents(['addr1', 'addr2'])

            expect(agents.size).toBe(0)
        })

        it('should return empty map for empty input', async () => {
            const agents = await cacheService.getAgents([])

            expect(agents.size).toBe(0)
        })
    })

    describe('cacheAgent (without database)', () => {
        it('should not throw when database not available', async () => {
            await expect(
                cacheService.cacheAgent({
                    agentAddress: 'test',
                    owner: 'owner',
                    name: 'Test Agent',
                    description: 'Test',
                    x402PaymentAddress: 'payment',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    cachedAt: Date.now(),
                    bump: 0
                })
            ).resolves.toBeUndefined()
        })
    })

    describe('listAgents (without database)', () => {
        it('should return empty array when database not available', async () => {
            const agents = await cacheService.listAgents()

            expect(agents).toEqual([])
        })

        it('should handle filters gracefully', async () => {
            const agents = await cacheService.listAgents({
                x402Enabled: true,
                framework: 'eliza',
                minReputation: 5000,
                limit: 10
            })

            expect(agents).toEqual([])
        })
    })

    describe('invalidateAgent (without database)', () => {
        it('should not throw when database not available', async () => {
            await expect(
                cacheService.invalidateAgent('test_address')
            ).resolves.toBeUndefined()
        })
    })

    describe('clearCache (without database)', () => {
        it('should not throw when database not available', async () => {
            await expect(
                cacheService.clearCache()
            ).resolves.toBeUndefined()
        })
    })

    describe('getCacheStats (without database)', () => {
        it('should return null when database not available', async () => {
            const stats = await cacheService.getCacheStats()

            expect(stats).toBeNull()
        })
    })
})
