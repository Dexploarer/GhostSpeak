/**
 * Resource Registry Schema
 *
 * Drizzle ORM schema for storing x402 resource registry.
 * Resources are HTTP endpoints that implement the x402 payment protocol.
 *
 * @module database/schema/resources
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { facilitators } from './facilitators.js'

/**
 * Resource origins table - stores information about resource domains
 */
export const resourceOrigins = sqliteTable(
  'resource_origins',
  {
    // Primary key - UUID
    id: text('id').primaryKey(),

    // Origin URL (e.g., https://api.example.com)
    origin: text('origin').notNull().unique(),

    // Metadata from scraping
    name: text('name'),
    description: text('description'),
    faviconUrl: text('favicon_url'),
    ogImageUrl: text('og_image_url'),
    ogTitle: text('og_title'),
    ogDescription: text('og_description'),

    // Contact/attribution
    contactEmail: text('contact_email'),
    twitterHandle: text('twitter_handle'),
    githubRepo: text('github_repo'),

    // Verification
    isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    verifiedAt: integer('verified_at'),
    verifiedBy: text('verified_by'),

    // Timestamps
    createdAt: integer('created_at').notNull().default(0),
    updatedAt: integer('updated_at').notNull().default(0),
    lastScrapedAt: integer('last_scraped_at')
  },
  table => ({
    originIdx: index('resource_origins_origin_idx').on(table.origin)
  })
)

/**
 * Resources table - stores x402 resource endpoints
 */
export const resources = sqliteTable(
  'resources',
  {
    // Primary key - UUID
    id: text('id').primaryKey(),

    // Resource URL (full endpoint URL)
    url: text('url').notNull().unique(),

    // Type of resource
    type: text('type').notNull().default('http'), // http, websocket, grpc

    // x402 protocol version
    x402Version: text('x402_version'),

    // Foreign keys
    originId: text('origin_id').references(() => resourceOrigins.id),
    facilitatorId: text('facilitator_id').references(() => facilitators.id),

    // Payment requirements (JSON serialized PaymentRequirement[])
    accepts: text('accepts').notNull(), // JSON array

    // Pricing
    maxAmount: text('max_amount'), // bigint as string
    minAmount: text('min_amount'), // bigint as string
    currency: text('currency').default('USDC'),

    // Enhanced schema for AI integration (JSON Schema)
    inputSchema: text('input_schema'), // JSON Schema for input
    outputSchema: text('output_schema'), // JSON Schema for output
    examplesJson: text('examples_json'), // JSON array of { input, output }

    // Metadata
    name: text('name'),
    description: text('description'),
    tags: text('tags'), // JSON array of strings
    capabilities: text('capabilities'), // JSON array of capabilities
    category: text('category'), // AI category

    // HTTP metadata
    httpMethod: text('http_method').default('POST'),
    contentType: text('content_type').default('application/json'),
    authType: text('auth_type'), // none, bearer, api_key, x402

    // Status
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    lastPingAt: integer('last_ping_at'),
    lastPingStatus: integer('last_ping_status'), // HTTP status code
    lastPingLatencyMs: real('last_ping_latency_ms'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),

    // Discovery source
    discoveredFrom: text('discovered_from'), // facilitator_id or 'manual'
    discoveredAt: integer('discovered_at'),

    // AI labeling
    aiGeneratedTags: text('ai_generated_tags'), // JSON array
    aiLabeledAt: integer('ai_labeled_at'),

    // Timestamps
    createdAt: integer('created_at').notNull().default(0),
    updatedAt: integer('updated_at').notNull().default(0)
  },
  table => ({
    originIdx: index('resources_origin_idx').on(table.originId),
    facilitatorIdx: index('resources_facilitator_idx').on(table.facilitatorId),
    activeIdx: index('resources_active_idx').on(table.isActive),
    categoryIdx: index('resources_category_idx').on(table.category)
  })
)

/**
 * Resource tags table - normalized tags for efficient querying
 */
export const resourceTags = sqliteTable(
  'resource_tags',
  {
    // Composite key
    id: text('id').primaryKey(), // UUID

    // Foreign key
    resourceId: text('resource_id')
      .notNull()
      .references(() => resources.id),

    // Tag
    tag: text('tag').notNull(),
    isAiGenerated: integer('is_ai_generated', { mode: 'boolean' }).notNull().default(false),

    // Timestamps
    createdAt: integer('created_at').notNull().default(0)
  },
  table => ({
    resourceIdx: index('resource_tags_resource_idx').on(table.resourceId),
    tagIdx: index('resource_tags_tag_idx').on(table.tag)
  })
)

/**
 * Resource ping history - stores health check results
 */
export const resourcePingHistory = sqliteTable(
  'resource_ping_history',
  {
    // Primary key - UUID
    id: text('id').primaryKey(),

    // Foreign key
    resourceId: text('resource_id')
      .notNull()
      .references(() => resources.id),

    // Ping result
    statusCode: integer('status_code'),
    latencyMs: real('latency_ms'),
    success: integer('success', { mode: 'boolean' }).notNull(),
    errorMessage: text('error_message'),

    // x402 response validation
    hasValidX402: integer('has_valid_x402', { mode: 'boolean' }),
    x402ParseError: text('x402_parse_error'),

    // Response details
    responseBodySize: integer('response_body_size'),
    contentType: text('content_type'),

    // Timestamp
    pingedAt: integer('pinged_at').notNull()
  },
  table => ({
    resourceTimeIdx: index('ping_history_resource_time_idx').on(
      table.resourceId,
      table.pingedAt
    )
  })
)

/**
 * Resource accepts table - normalized payment requirements
 */
export const resourceAccepts = sqliteTable(
  'resource_accepts',
  {
    // Primary key - UUID
    id: text('id').primaryKey(),

    // Foreign key
    resourceId: text('resource_id')
      .notNull()
      .references(() => resources.id),

    // Payment requirement fields
    scheme: text('scheme').notNull(), // exact, upto, base, tiered
    network: text('network').notNull(), // solana, base, polygon
    maxAmountRequired: text('max_amount_required').notNull(), // bigint as string
    payTo: text('pay_to').notNull(), // facilitator address
    asset: text('asset').notNull(), // token address
    maxTimeoutSeconds: integer('max_timeout_seconds'),
    description: text('description'),
    mimeType: text('mime_type'),

    // Extra fields (JSON)
    extra: text('extra'),

    // Timestamps
    createdAt: integer('created_at').notNull().default(0),
    updatedAt: integer('updated_at').notNull().default(0)
  },
  table => ({
    resourceIdx: index('resource_accepts_resource_idx').on(table.resourceId),
    networkIdx: index('resource_accepts_network_idx').on(table.network),
    assetIdx: index('resource_accepts_asset_idx').on(table.asset)
  })
)

// =====================================================
// TYPE HELPERS
// =====================================================

/**
 * Type for inserting a new resource origin
 */
export type InsertResourceOrigin = typeof resourceOrigins.$inferInsert

/**
 * Type for selecting a resource origin
 */
export type SelectResourceOrigin = typeof resourceOrigins.$inferSelect

/**
 * Type for inserting a new resource
 */
export type InsertResource = typeof resources.$inferInsert

/**
 * Type for selecting a resource
 */
export type SelectResource = typeof resources.$inferSelect

/**
 * Type for inserting a resource tag
 */
export type InsertResourceTag = typeof resourceTags.$inferInsert

/**
 * Type for selecting a resource tag
 */
export type SelectResourceTag = typeof resourceTags.$inferSelect

/**
 * Type for inserting ping history
 */
export type InsertResourcePingHistory = typeof resourcePingHistory.$inferInsert

/**
 * Type for selecting ping history
 */
export type SelectResourcePingHistory = typeof resourcePingHistory.$inferSelect

/**
 * Type for inserting resource accepts
 */
export type InsertResourceAccepts = typeof resourceAccepts.$inferInsert

/**
 * Type for selecting resource accepts
 */
export type SelectResourceAccepts = typeof resourceAccepts.$inferSelect
