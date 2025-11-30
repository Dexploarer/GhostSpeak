/**
 * Agent Cache Service
 * 
 * Manages caching of agent data from Solana blockchain to Turso database.
 * Provides cache-first queries with RPC fallback for resilience.
 * 
 * @module database/services/AgentCacheService
 */

import { eq, and, desc, sql } from 'drizzle-orm'
import { getDb } from '../db.js'
import { agents, agentCapabilities, agentPricing, type Agent, type NewAgent } from '../schema/index.js'
import { isAvailable } from '../connection.js'

/**
 * Cache configuration options
 */
export interface CacheOptions {
    /** Maximum age of cached data in milliseconds (default: 5 minutes) */
    maxAge?: number
    /** Whether to force refresh from chain (default: false) */
    forceRefresh?: boolean
}

/**
 * Agent Cache Service
 * 
 * Provides high-performance caching layer for agent data.
 */
export class AgentCacheService {
    private static instance: AgentCacheService | null = null
    private readonly defaultMaxAge = 5 * 60 * 1000 // 5 minutes

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): AgentCacheService {
        if (!AgentCacheService.instance) {
            AgentCacheService.instance = new AgentCacheService()
        }
        return AgentCacheService.instance
    }

    /**
     * Check if cache is available
     */
    async isCacheAvailable(): Promise<boolean> {
        return await isAvailable()
    }

    /**
     * Get agent from cache
     * 
     * @param agentAddress - Agent's Solana address
     * @param options - Cache options
     * @returns Agent data or null if not found/expired
     */
    async getAgent(
        agentAddress: string,
        options: CacheOptions = {}
    ): Promise<Agent | null> {
        if (!await this.isCacheAvailable()) {
            return null
        }

        const { maxAge = this.defaultMaxAge, forceRefresh = false } = options

        if (forceRefresh) {
            return null // Force RPC fetch
        }

        try {
            const db = await getDb()
            const results = await db
                .select()
                .from(agents)
                .where(eq(agents.agentAddress, agentAddress))
                .limit(1)

            if (results.length === 0) {
                return null
            }

            const agent = results[0]
            const age = Date.now() - agent.cachedAt

            // Return null if cache is stale
            if (age > maxAge) {
                return null
            }

            return agent
        } catch (error) {
            console.warn('[AgentCacheService] Failed to get agent from cache:', error)
            return null
        }
    }

    /**
     * Get multiple agents from cache
     * 
     * @param agentAddresses - Array of agent addresses
     * @param options - Cache options
     * @returns Map of address to agent data
     */
    async getAgents(
        agentAddresses: string[],
        options: CacheOptions = {}
    ): Promise<Map<string, Agent>> {
        if (!await this.isCacheAvailable() || agentAddresses.length === 0) {
            return new Map()
        }

        const { maxAge = this.defaultMaxAge } = options

        try {
            const db = await getDb()
            const results = await db
                .select()
                .from(agents)
                .where(sql`${agents.agentAddress} IN ${agentAddresses}`)

            const now = Date.now()
            const agentMap = new Map<string, Agent>()

            for (const agent of results) {
                const age = now - agent.cachedAt
                if (age <= maxAge) {
                    agentMap.set(agent.agentAddress, agent)
                }
            }

            return agentMap
        } catch (error) {
            console.warn('[AgentCacheService] Failed to get agents from cache:', error)
            return new Map()
        }
    }

    /**
     * Cache agent data
     * 
     * @param agent - Agent data to cache
     * @param capabilities - Agent capabilities
     * @param pricing - Agent pricing info
     */
    async cacheAgent(
        agent: NewAgent,
        capabilities: string[] = [],
        pricing: Array<{ tokenAddress: string; decimals: number; symbol: string }> = []
    ): Promise<void> {
        if (!await this.isCacheAvailable()) {
            return
        }

        try {
            const db = await getDb()

            // Insert or replace agent
            await db
                .insert(agents)
                .values({
                    ...agent,
                    cachedAt: Date.now()
                })
                .onConflictDoUpdate({
                    target: agents.agentAddress,
                    set: {
                        ...agent,
                        cachedAt: Date.now(),
                        updatedAt: Date.now()
                    }
                })

            // Delete old capabilities and insert new ones
            await db
                .delete(agentCapabilities)
                .where(eq(agentCapabilities.agentAddress, agent.agentAddress))

            if (capabilities.length > 0) {
                await db.insert(agentCapabilities).values(
                    capabilities.map(cap => ({
                        agentAddress: agent.agentAddress,
                        capability: cap
                    }))
                )
            }

            // Delete old pricing and insert new ones
            await db
                .delete(agentPricing)
                .where(eq(agentPricing.agentAddress, agent.agentAddress))

            if (pricing.length > 0) {
                await db.insert(agentPricing).values(
                    pricing.map(p => ({
                        agentAddress: agent.agentAddress,
                        ...p
                    }))
                )
            }
        } catch (error) {
            console.error('[AgentCacheService] Failed to cache agent:', error)
            // Don't throw - caching failures should not break the app
        }
    }

    /**
     * List agents with filters
     * 
     * @param filters - Query filters
     * @returns Array of agents
     */
    async listAgents(filters: {
        x402Enabled?: boolean
        framework?: string
        isVerified?: boolean
        minReputation?: number
        limit?: number
        offset?: number
    } = {}): Promise<Agent[]> {
        if (!await this.isCacheAvailable()) {
            return []
        }

        try {
            const db = await getDb()
            const {
                x402Enabled,
                framework,
                isVerified,
                minReputation,
                limit = 50,
                offset = 0
            } = filters

            // Build WHERE conditions
            const conditions = []
            if (x402Enabled !== undefined) {
                conditions.push(eq(agents.x402Enabled, x402Enabled))
            }
            if (framework) {
                conditions.push(eq(agents.frameworkOrigin, framework))
            }
            if (isVerified !== undefined) {
                conditions.push(eq(agents.isVerified, isVerified))
            }
            if (minReputation !== undefined) {
                conditions.push(sql`${agents.reputationScore} >= ${minReputation}`)
            }

            // Build and execute query
            if (conditions.length > 0) {
                const results = await db
                    .select()
                    .from(agents)
                    .where(and(...conditions))
                    .orderBy(desc(agents.reputationScore))
                    .limit(limit)
                    .offset(offset)
                return results
            } else {
                const results = await db
                    .select()
                    .from(agents)
                    .orderBy(desc(agents.reputationScore))
                    .limit(limit)
                    .offset(offset)
                return results
            }
        } catch (error) {
            console.warn('[AgentCacheService] Failed to list agents:', error)
            return []
        }
    }

    /**
     * Invalidate cached agent
     * 
     * @param agentAddress - Agent address to invalidate
     */
    async invalidateAgent(agentAddress: string): Promise<void> {
        if (!await this.isCacheAvailable()) {
            return
        }

        try {
            const db = await getDb()
            await db.delete(agents).where(eq(agents.agentAddress, agentAddress))
        } catch (error) {
            console.warn('[AgentCacheService] Failed to invalidate agent:', error)
        }
    }

    /**
     * Clear all cached agents
     */
    async clearCache(): Promise<void> {
        if (!await this.isCacheAvailable()) {
            return
        }

        try {
            const db = await getDb()
            await db.delete(agents)
        } catch (error) {
            console.error('[AgentCacheService] Failed to clear cache:', error)
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(): Promise<{
        totalAgents: number
        averageAge: number
        oldestCache: number
    } | null> {
        if (!await this.isCacheAvailable()) {
            return null
        }

        try {
            const db = await getDb()
            const result = await db
                .select({
                    count: sql<number>`count(*)`,
                    avgAge: sql<number>`avg(${Date.now()} - ${agents.cachedAt})`,
                    oldestCache: sql<number>`min(${agents.cachedAt})`
                })
                .from(agents)

            return {
                totalAgents: result[0].count,
                averageAge: result[0].avgAge,
                oldestCache: result[0].oldestCache
            }
        } catch (error) {
            console.warn('[AgentCacheService] Failed to get cache stats:', error)
            return null
        }
    }
}

// Export singleton instance
export const agentCache = AgentCacheService.getInstance()
