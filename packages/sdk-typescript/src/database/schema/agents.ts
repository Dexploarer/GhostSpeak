/**
 * Agent Registry Cache Schema
 * 
 * Drizzle ORM schema for caching agent data from Solana blockchain.
 * Maps to the Rust Agent struct from programs/src/state/agent.rs
 * 
 * @module database/schema/agents
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'

/**
 * Main agents table - caches on-chain agent data
 */
export const agents = sqliteTable('agents', {
    // Primary key - Solana address
    agentAddress: text('agent_address').primaryKey(),

    // Basic info
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),

    // Reputation & stats
    reputationScore: integer('reputation_score').notNull().default(0),
    totalJobsCompleted: integer('total_jobs_completed').notNull().default(0),
    totalEarnings: text('total_earnings').notNull().default('0'), // Stored as text for u64

    // Status
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    verificationTimestamp: integer('verification_timestamp').notNull().default(0),

    // Pricing
    originalPrice: text('original_price').notNull().default('0'),
    replicationFee: text('replication_fee').notNull().default('0'),

    // Configuration
    genomeHash: text('genome_hash').notNull().default(''),
    isReplicable: integer('is_replicable', { mode: 'boolean' }).notNull().default(false),
    serviceEndpoint: text('service_endpoint').notNull().default(''),
    metadataUri: text('metadata_uri').notNull().default(''),

    // Framework & lineage
    frameworkOrigin: text('framework_origin').notNull().default(''),
    cnftMint: text('cnft_mint'), // Nullable
    merkleTree: text('merkle_tree'), // Nullable
    supportsA2a: integer('supports_a2a', { mode: 'boolean' }).notNull().default(false),
    transferHook: text('transfer_hook'), // Nullable
    parentAgent: text('parent_agent'), // Nullable
    generation: integer('generation').notNull().default(0),

    // x402 Payment Protocol
    x402Enabled: integer('x402_enabled', { mode: 'boolean' }).notNull().default(false),
    x402PaymentAddress: text('x402_payment_address').notNull(),
    x402PricePerCall: text('x402_price_per_call').notNull().default('0'),
    x402ServiceEndpoint: text('x402_service_endpoint').notNull().default(''),
    x402TotalPayments: text('x402_total_payments').notNull().default('0'),
    x402TotalCalls: text('x402_total_calls').notNull().default('0'),
    lastPaymentTimestamp: integer('last_payment_timestamp').notNull().default(0),

    // API Schema
    apiSpecUri: text('api_spec_uri').notNull().default(''),
    apiVersion: text('api_version').notNull().default(''),

    // Timestamps
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    cachedAt: integer('cached_at').notNull(), // When cached from chain

    // Bump seed for PDA
    bump: integer('bump').notNull()
}, (table) => ({
    // Indexes for common queries
    ownerIdx: index('idx_agents_owner').on(table.owner),
    x402EnabledIdx: index('idx_agents_x402_enabled').on(table.x402Enabled),
    reputationIdx: index('idx_agents_reputation').on(table.reputationScore),
    frameworkIdx: index('idx_agents_framework').on(table.frameworkOrigin),
    verifiedIdx: index('idx_agents_verified').on(table.isVerified),
    cachedAtIdx: index('idx_agents_cached_at').on(table.cachedAt)
}))

/**
 * Agent capabilities - many-to-many relationship
 */
export const agentCapabilities = sqliteTable('agent_capabilities', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    agentAddress: text('agent_address').notNull().references(() => agents.agentAddress, { onDelete: 'cascade' }),
    capability: text('capability').notNull()
}, (table) => ({
    // Composite index for lookups
    agentCapabilityIdx: index('idx_agent_capability').on(table.agentAddress, table.capability)
}))

/**
 * Agent pricing per token - supports multiple tokens
 */
export const agentPricing = sqliteTable('agent_pricing', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    agentAddress: text('agent_address').notNull().references(() => agents.agentAddress, { onDelete: 'cascade' }),
    tokenAddress: text('token_address').notNull(), // SPL token mint address
    decimals: integer('decimals').notNull(),
    symbol: text('symbol').notNull()
}, (table) => ({
    // Index for token lookups
    agentTokenIdx: index('idx_agent_token').on(table.agentAddress, table.tokenAddress)
}))

// TypeScript types inferred from schema
export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert

export type AgentCapability = typeof agentCapabilities.$inferSelect
export type NewAgentCapability = typeof agentCapabilities.$inferInsert

export type AgentPricing = typeof agentPricing.$inferSelect
export type NewAgentPricing = typeof agentPricing.$inferInsert
