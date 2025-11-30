/**
 * Analytics Schema
 * 
 * Drizzle ORM schema for analytics aggregation.
 * Stores pre-computed metrics for fast dashboard queries.
 * 
 * @module database/schema/analytics
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'

/**
 * Agent-level analytics - aggregated metrics per agent
 */
export const agentAnalytics = sqliteTable('agent_analytics', {
    // Primary key - agent address
    agentAddress: text('agent_address').primaryKey(),

    // Revenue metrics
    totalRevenue: text('total_revenue').notNull().default('0'), // Stored as text for bigint

    // Transaction metrics
    totalTransactions: integer('total_transactions').notNull().default(0),
    successfulTransactions: integer('successful_transactions').notNull().default(0),
    successRate: real('success_rate').notNull().default(0), // Percentage 0-100

    // Quality metrics
    averageRating: real('average_rating').notNull().default(0),
    averageResponseTimeMs: integer('average_response_time_ms').notNull().default(0),

    // Activity
    lastTransactionAt: integer('last_transaction_at'), // Unix timestamp (nullable)

    // Timestamp
    updatedAt: integer('updated_at').notNull()
}, (table) => ({
    updatedAtIdx: index('idx_agent_analytics_updated').on(table.updatedAt)
}))

/**
 * Market-level analytics - aggregated metrics for entire marketplace
 */
export const marketAnalytics = sqliteTable('market_analytics', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Date for this snapshot
    metricDate: text('metric_date').notNull().unique(), // ISO date string (YYYY-MM-DD)

    // Volume metrics
    totalVolume: text('total_volume').notNull().default('0'), // Stored as text for bigint
    totalTransactions: integer('total_transactions').notNull().default(0),

    // Agent metrics
    activeAgentsCount: integer('active_agents_count').notNull().default(0),

    // Price metrics
    averagePrice: text('average_price').notNull().default('0'), // Average transaction amount

    // User metrics
    uniquePayers: integer('unique_payers').notNull().default(0),

    // Timestamp
    updatedAt: integer('updated_at').notNull()
}, (table) => ({
    dateIdx: index('idx_market_analytics_date').on(table.metricDate)
}))

/**
 * Daily metrics - time-series data for trends
 */
export const dailyMetrics = sqliteTable('daily_metrics', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Date and metric type
    metricDate: text('metric_date').notNull(), // ISO date (YYYY-MM-DD)
    metricType: text('metric_type').notNull(), // 'agent_revenue', 'market_volume', etc.

    // Optional agent address (null for market-wide metrics)
    agentAddress: text('agent_address'), // Nullable

    // Metric value and metadata
    value: text('value').notNull(), // Metric value as text (supports bigint)
    metadata: text('metadata'), // JSON string for additional data (nullable)

    // Timestamp
    createdAt: integer('created_at').notNull()
}, (table) => ({
    // Composite index for date + type queries
    dateTypeIdx: index('idx_daily_metrics_date_type').on(table.metricDate, table.metricType),
    // Index for agent-specific queries
    agentIdx: index('idx_daily_metrics_agent').on(table.agentAddress),
    // Index for time-series queries
    dateIdx: index('idx_daily_metrics_date').on(table.metricDate)
}))

// TypeScript types inferred from schema
export type AgentAnalytics = typeof agentAnalytics.$inferSelect
export type NewAgentAnalytics = typeof agentAnalytics.$inferInsert

export type MarketAnalytics = typeof marketAnalytics.$inferSelect
export type NewMarketAnalytics = typeof marketAnalytics.$inferInsert

export type DailyMetric = typeof dailyMetrics.$inferSelect
export type NewDailyMetric = typeof dailyMetrics.$inferInsert
