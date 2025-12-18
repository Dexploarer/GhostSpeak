/**
 * Facilitator Registry Schema
 *
 * Drizzle ORM schema for storing x402 facilitator configurations.
 * Facilitators are payment processors that handle x402 transactions.
 *
 * @module database/schema/facilitators
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'

/**
 * Facilitators table - stores x402 payment facilitator configurations
 */
export const facilitators = sqliteTable(
  'facilitators',
  {
    // Primary key - unique facilitator ID
    id: text('id').primaryKey(),

    // Basic info
    name: text('name').notNull(),
    description: text('description'),
    logo: text('logo'),
    website: text('website'),

    // Network configuration (JSON serialized)
    networks: text('networks').notNull(), // JSON array of Network enum values

    // Address configuration (JSON serialized)
    addresses: text('addresses').notNull(), // JSON Record<Network, FacilitatorAddress[]>

    // Endpoints
    discoveryUrl: text('discovery_url'),
    settleUrl: text('settle_url').notNull(),
    verifyUrl: text('verify_url').notNull(),

    // API configuration
    requiresApiKey: integer('requires_api_key', { mode: 'boolean' }).notNull().default(false),
    apiKeyHeader: text('api_key_header'),

    // Status
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),

    // Health metrics
    lastHealthCheck: integer('last_health_check'), // Unix timestamp
    healthStatus: text('health_status').default('unknown'), // healthy, degraded, unhealthy, unknown
    latencyMs: real('latency_ms'),
    uptimePercent: real('uptime_percent'),
    totalRequests: integer('total_requests').notNull().default(0),
    successfulRequests: integer('successful_requests').notNull().default(0),
    failedRequests: integer('failed_requests').notNull().default(0),

    // Timestamps
    createdAt: integer('created_at').notNull().default(0),
    updatedAt: integer('updated_at').notNull().default(0)
  },
  table => ({
    enabledIdx: index('facilitators_enabled_idx').on(table.enabled),
    healthStatusIdx: index('facilitators_health_status_idx').on(table.healthStatus)
  })
)

/**
 * Facilitator API keys table - stores user API keys for facilitators
 */
export const facilitatorApiKeys = sqliteTable(
  'facilitator_api_keys',
  {
    // Composite key
    id: text('id').primaryKey(), // UUID or generated

    // Foreign keys
    facilitatorId: text('facilitator_id')
      .notNull()
      .references(() => facilitators.id),
    userId: text('user_id').notNull(), // User or wallet address

    // Key storage (encrypted)
    encryptedApiKey: text('encrypted_api_key').notNull(),
    keyLabel: text('key_label'), // User-friendly label

    // Metadata
    lastUsed: integer('last_used'), // Unix timestamp
    usageCount: integer('usage_count').notNull().default(0),

    // Timestamps
    createdAt: integer('created_at').notNull().default(0),
    updatedAt: integer('updated_at').notNull().default(0)
  },
  table => ({
    facilitatorUserIdx: index('api_keys_facilitator_user_idx').on(
      table.facilitatorId,
      table.userId
    )
  })
)

/**
 * Facilitator health history table - stores health check results
 */
export const facilitatorHealthHistory = sqliteTable(
  'facilitator_health_history',
  {
    // Primary key
    id: text('id').primaryKey(), // UUID

    // Foreign key
    facilitatorId: text('facilitator_id')
      .notNull()
      .references(() => facilitators.id),

    // Health check result
    status: text('status').notNull(), // healthy, degraded, unhealthy
    latencyMs: real('latency_ms').notNull(),
    errorMessage: text('error_message'),

    // Network-specific results (JSON serialized)
    networkResults: text('network_results'), // JSON array of network health

    // Timestamp
    checkedAt: integer('checked_at').notNull()
  },
  table => ({
    facilitatorTimeIdx: index('health_history_facilitator_time_idx').on(
      table.facilitatorId,
      table.checkedAt
    )
  })
)

// =====================================================
// TYPE HELPERS
// =====================================================

/**
 * Type for inserting a new facilitator
 */
export type InsertFacilitator = typeof facilitators.$inferInsert

/**
 * Type for selecting a facilitator
 */
export type SelectFacilitator = typeof facilitators.$inferSelect

/**
 * Type for inserting a new API key
 */
export type InsertFacilitatorApiKey = typeof facilitatorApiKeys.$inferInsert

/**
 * Type for selecting an API key
 */
export type SelectFacilitatorApiKey = typeof facilitatorApiKeys.$inferSelect

/**
 * Type for inserting health history
 */
export type InsertFacilitatorHealthHistory = typeof facilitatorHealthHistory.$inferInsert

/**
 * Type for selecting health history
 */
export type SelectFacilitatorHealthHistory = typeof facilitatorHealthHistory.$inferSelect
