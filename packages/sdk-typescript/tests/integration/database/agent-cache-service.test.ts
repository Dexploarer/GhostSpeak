/**
 * Integration tests for AgentCacheService with real Turso database
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { AgentCacheService } from '../../../src/database/services/AgentCacheService.js'
import { cleanupTestData, createTestId, isDatabaseConfigured } from '../../helpers/database-helpers.js'
import { getDb } from '../../../src/database/db.js'

describe('AgentCacheService Integration Tests', () => {
    let service: AgentCacheService

    beforeAll(async () => {
        if (!isDatabaseConfigured()) {
            console.log('⚠️  Skipping database tests - Turso not configured')
            return
        }

        service = AgentCacheService.getInstance()

        // Verify cache is available
        const isAvailable = await service.isCacheAvailable()
        if (!isAvailable) {
            console.log('⚠️  Database cache not available, tests will be skipped')
        }
    })

    afterEach(async () => {
        if (isDatabaseConfigured()) {
            const db = getDb()
            await cleanupTestData(db, ['agents', 'agent_capabilities', 'agent_pricing'])
        }
    })

    afterAll(async () => {
        if (isDatabaseConfigured()) {
            await service.clearCache()
        }
    })

    describe('cacheAgent', () => {
        it('should cache agent successfully', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')
            const agent = {
                name: 'test_agent_name',
                agentAddress,
                owner: 'test_owner_123',
                description: 'Test agent description',
                x402PaymentAddress: 'payment_addr_123',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                cachedAt: Date.now(),
                bump: 255,
                reputationScore: 9000,
                totalJobsCompleted: 10,
                totalEarnings: '1000000',
                isActive: true,
                isVerified: true
            }

            const capabilities = ['task1', 'task2']
            const pricing = [
                { tokenAddress: 'SOL', decimals: 9, symbol: 'SOL' }
            ]

            await service.cacheAgent(agent, capabilities, pricing)

            // Verify agent was cached
            const cached = await service.getAgent(agentAddress)
            expect(cached).toBeDefined()
            expect(cached?.name).toBe(agent.name)
            expect(cached?.owner).toBe(agent.owner)
        })

        it('should update existing agent on duplicate cache', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')
            const agent = {
                name: 'original_name',
                agentAddress,
                owner: 'test_owner',
                description: 'Original',
                x402PaymentAddress: 'payment_addr',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                cachedAt: Date.now(),
                bump: 255,
                reputationScore: 5000,
                totalJobsCompleted: 5,
                totalEarnings: '500000',
                isActive: true,
                isVerified: false
            }

            // Cache first time
            await service.cacheAgent(agent, ['task1'], [])

            // Update and cache again
            agent.name = 'updated_name'
            agent.reputationScore = 8000
            await service.cacheAgent(agent, ['task1'], [])

            // Verify update
            const cached = await service.getAgent(agentAddress)
            expect(cached?.name).toBe('updated_name')
            expect(cached?.reputationScore).toBe(8000)
        })
    })

    describe('getAgent', () => {
        it('should retrieve cached agent', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')
            const agent = {
                name: 'test_agent',
                agentAddress,
                owner: 'test_owner',
                description: 'Test description',
                x402PaymentAddress: 'payment_addr',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                cachedAt: Date.now(),
                bump: 255,
                reputationScore: 7500,
                totalJobsCompleted: 15,
                totalEarnings: '1500000',
                isActive: true,
                isVerified: true
            }

            await service.cacheAgent(agent, ['task1'], [])
            const retrieved = await service.getAgent(agentAddress)

            expect(retrieved).toBeDefined()
            expect(retrieved?.agentAddress).toBe(agentAddress)
            expect(retrieved?.name).toBe('test_agent')
            expect(retrieved?.reputationScore).toBe(7500)
        })

        it('should return null for non-existent agent', async () => {
            if (!isDatabaseConfigured()) return

            const nonExistent = await service.getAgent('nonexistent_agent_address_xyz')
            expect(nonExistent).toBeNull()
        })

        it('should respect cache options', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')
            const agent = {
                name: 'test_cache_options',
                agentAddress,
                owner: 'test_owner',
                description: 'Test',
                x402PaymentAddress: 'payment_addr',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                cachedAt: Date.now() - 10000, // 10 seconds old
                bump: 255,
                reputationScore: 5000,
                totalJobsCompleted: 0,
                totalEarnings: '0',
                isActive: true,
                isVerified: false
            }

            await service.cacheAgent(agent, [], [])

            // Should return cached version by default
            const cached1 = await service.getAgent(agentAddress)
            expect(cached1).toBeDefined()

            // Force refresh should still work
            const cached2 = await service.getAgent(agentAddress, { forceRefresh: true })
            expect(cached2).toBeDefined()
        })
    })

    describe('listAgents', () => {
        it('should list agents with filters', async () => {
            if (!isDatabaseConfigured()) return

            // Cache multiple test agents
            const agents = [
                {
                    name: 'test_list_agent_1',
                    agentAddress: createTestId('agent'),
                    owner: 'test_owner_1',
                    description: 'High reputation',
                    x402PaymentAddress: 'payment_1',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    cachedAt: Date.now(),
                    bump: 255,
                    reputationScore: 9500,
                    totalJobsCompleted: 50,
                    totalEarnings: '5000000',
                    isActive: true,
                    isVerified: true,
                    x402Enabled: true
                },
                {
                    name: 'test_list_agent_2',
                    agentAddress: createTestId('agent'),
                    owner: 'test_owner_2',
                    description: 'Low reputation',
                    x402PaymentAddress: 'payment_2',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    cachedAt: Date.now(),
                    bump: 255,
                    reputationScore: 3000,
                    totalJobsCompleted: 5,
                    totalEarnings: '100000',
                    isActive: true,
                    isVerified: false,
                    x402Enabled: false
                }
            ]

            for (const agent of agents) {
                await service.cacheAgent(agent, [], [])
            }

            // Search for high reputation agents
            const results = await service.listAgents({
                minReputation: 9000,
                isVerified: true
            })

            expect(results.length).toBeGreaterThanOrEqual(1)
            const found = results.some(r => r.reputationScore >= 9000)
            expect(found).toBe(true)
        })

        it('should support pagination', async () => {
            if (!isDatabaseConfigured()) return

            // Cache multiple agents
            for (let i = 0; i < 5; i++) {
                await service.cacheAgent({
                    name: `test_pagination_agent_${i}`,
                    agentAddress: createTestId('agent'),
                    owner: `test_owner_${i}`,
                    description: 'Test',
                    x402PaymentAddress: `payment_${i}`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    cachedAt: Date.now(),
                    bump: 255,
                    reputationScore: 5000,
                    totalJobsCompleted: i,
                    totalEarnings: `${i * 100000}`,
                    isActive: true,
                    isVerified: false
                }, [], [])
            }

            // Test pagination
            const page1 = await service.listAgents({ limit: 2, offset: 0 })
            const page2 = await service.listAgents({ limit: 2, offset: 2 })

            expect(page1.length).toBeLessThanOrEqual(2)
            expect(page2.length).toBeLessThanOrEqual(2)

            if (page1.length > 0 && page2.length > 0) {
                expect(page1[0].agentAddress).not.toBe(page2[0].agentAddress)
            }
        })
    })

    describe('invalidateAgent', () => {
        it('should invalidate agent cache', async () => {
            if (!isDatabaseConfigured()) return

            const agentAddress = createTestId('agent')

            // Cache agent
            await service.cacheAgent({
                name: 'test_invalidate_agent',
                agentAddress,
                owner: 'test_owner',
                description: 'Test',
                x402PaymentAddress: 'payment_addr',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                cachedAt: Date.now(),
                bump: 255,
                reputationScore: 5000,
                totalJobsCompleted: 0,
                totalEarnings: '0',
                isActive: true,
                isVerified: false
            }, [], [])

            // Verify it's cached
            let cached = await service.getAgent(agentAddress)
            expect(cached).toBeDefined()

            // Invalidate
            await service.invalidateAgent(agentAddress)

            // Verify it's removed
            cached = await service.getAgent(agentAddress)
            expect(cached).toBeNull()
        })
    })

    describe('getCacheStats', () => {
        it('should return cache statistics', async () => {
            if (!isDatabaseConfigured()) return

            // Cache a few agents
            for (let i = 0; i < 3; i++) {
                await service.cacheAgent({
                    name: `test_stats_agent_${i}`,
                    agentAddress: createTestId('agent'),
                    owner: `owner_${i}`,
                    description: 'Test',
                    x402PaymentAddress: `payment_${i}`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    cachedAt: Date.now(),
                    bump: 255,
                    reputationScore: 5000,
                    totalJobsCompleted: 0,
                    totalEarnings: '0',
                    isActive: true,
                    isVerified: false
                }, [], [])
            }

            const stats = await service.getCacheStats()

            expect(stats).toBeDefined()
            if (stats) {
                expect(stats.totalAgents).toBeGreaterThanOrEqual(3)
                expect(stats.averageAge).toBeGreaterThanOrEqual(0)
                expect(stats.oldestCache).toBeGreaterThanOrEqual(0)
            }
        })
    })
})
