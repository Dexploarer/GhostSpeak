/**
 * Resource Metrics Schema
 *
 * Drizzle ORM schema for storing time-windowed x402 resource metrics.
 * Tracks 72 metrics across 8 time windows for comprehensive analytics.
 *
 * @module database/schema/resourceMetrics
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { resources } from './resources.js'
import { resourceOrigins } from './resources.js'

// =====================================================
// TIME WINDOWS
// =====================================================

/**
 * Available time windows for metrics aggregation
 */
export const TIME_WINDOWS = ['1h', '6h', '24h', '3d', '7d', '15d', '30d', 'all'] as const
export type TimeWindow = (typeof TIME_WINDOWS)[number]

// =====================================================
// RESOURCE METRICS TABLE
// =====================================================

/**
 * Resource metrics table - stores per-resource time-windowed metrics
 *
 * Each row represents metrics for a single resource at a point in time.
 * Metrics are aggregated across 8 time windows for each measurement.
 */
export const resourceMetrics = sqliteTable(
  'resource_metrics',
  {
    // Primary key
    id: text('id').primaryKey(),

    // Foreign key to resource
    resourceId: text('resource_id')
      .notNull()
      .references(() => resources.id),

    // Snapshot timestamp
    createdAt: integer('created_at').notNull(),

    // =========================================================
    // REQUEST COUNTS (8 time windows each)
    // =========================================================

    // Total requests
    totalRequests1h: integer('total_requests_1h').notNull().default(0),
    totalRequests6h: integer('total_requests_6h').notNull().default(0),
    totalRequests24h: integer('total_requests_24h').notNull().default(0),
    totalRequests3d: integer('total_requests_3d').notNull().default(0),
    totalRequests7d: integer('total_requests_7d').notNull().default(0),
    totalRequests15d: integer('total_requests_15d').notNull().default(0),
    totalRequests30d: integer('total_requests_30d').notNull().default(0),
    totalRequestsAll: integer('total_requests_all').notNull().default(0),

    // Successful requests (2xx)
    successCount1h: integer('success_count_1h').notNull().default(0),
    successCount6h: integer('success_count_6h').notNull().default(0),
    successCount24h: integer('success_count_24h').notNull().default(0),
    successCount3d: integer('success_count_3d').notNull().default(0),
    successCount7d: integer('success_count_7d').notNull().default(0),
    successCount15d: integer('success_count_15d').notNull().default(0),
    successCount30d: integer('success_count_30d').notNull().default(0),
    successCountAll: integer('success_count_all').notNull().default(0),

    // Failed requests (4xx, 5xx)
    failureCount1h: integer('failure_count_1h').notNull().default(0),
    failureCount6h: integer('failure_count_6h').notNull().default(0),
    failureCount24h: integer('failure_count_24h').notNull().default(0),
    failureCount3d: integer('failure_count_3d').notNull().default(0),
    failureCount7d: integer('failure_count_7d').notNull().default(0),
    failureCount15d: integer('failure_count_15d').notNull().default(0),
    failureCount30d: integer('failure_count_30d').notNull().default(0),
    failureCountAll: integer('failure_count_all').notNull().default(0),

    // =========================================================
    // LATENCY PERCENTILES (p50, p90, p99 for each window)
    // =========================================================

    // P50 (median) latency in ms
    latencyP50_1h: real('latency_p50_1h'),
    latencyP50_6h: real('latency_p50_6h'),
    latencyP50_24h: real('latency_p50_24h'),
    latencyP50_3d: real('latency_p50_3d'),
    latencyP50_7d: real('latency_p50_7d'),
    latencyP50_15d: real('latency_p50_15d'),
    latencyP50_30d: real('latency_p50_30d'),
    latencyP50All: real('latency_p50_all'),

    // P90 latency in ms
    latencyP90_1h: real('latency_p90_1h'),
    latencyP90_6h: real('latency_p90_6h'),
    latencyP90_24h: real('latency_p90_24h'),
    latencyP90_3d: real('latency_p90_3d'),
    latencyP90_7d: real('latency_p90_7d'),
    latencyP90_15d: real('latency_p90_15d'),
    latencyP90_30d: real('latency_p90_30d'),
    latencyP90All: real('latency_p90_all'),

    // P99 latency in ms
    latencyP99_1h: real('latency_p99_1h'),
    latencyP99_6h: real('latency_p99_6h'),
    latencyP99_24h: real('latency_p99_24h'),
    latencyP99_3d: real('latency_p99_3d'),
    latencyP99_7d: real('latency_p99_7d'),
    latencyP99_15d: real('latency_p99_15d'),
    latencyP99_30d: real('latency_p99_30d'),
    latencyP99All: real('latency_p99_all'),

    // =========================================================
    // STATUS CODE DISTRIBUTION
    // =========================================================

    // 2xx responses
    status2xx1h: integer('status_2xx_1h').notNull().default(0),
    status2xx24h: integer('status_2xx_24h').notNull().default(0),
    status2xx7d: integer('status_2xx_7d').notNull().default(0),
    status2xxAll: integer('status_2xx_all').notNull().default(0),

    // 3xx responses
    status3xx1h: integer('status_3xx_1h').notNull().default(0),
    status3xx24h: integer('status_3xx_24h').notNull().default(0),
    status3xx7d: integer('status_3xx_7d').notNull().default(0),
    status3xxAll: integer('status_3xx_all').notNull().default(0),

    // 4xx responses
    status4xx1h: integer('status_4xx_1h').notNull().default(0),
    status4xx24h: integer('status_4xx_24h').notNull().default(0),
    status4xx7d: integer('status_4xx_7d').notNull().default(0),
    status4xxAll: integer('status_4xx_all').notNull().default(0),

    // 5xx responses
    status5xx1h: integer('status_5xx_1h').notNull().default(0),
    status5xx24h: integer('status_5xx_24h').notNull().default(0),
    status5xx7d: integer('status_5xx_7d').notNull().default(0),
    status5xxAll: integer('status_5xx_all').notNull().default(0),

    // =========================================================
    // UPTIME & AVAILABILITY
    // =========================================================

    // Uptime percentage (0-100)
    uptimePercent1h: real('uptime_percent_1h'),
    uptimePercent24h: real('uptime_percent_24h'),
    uptimePercent7d: real('uptime_percent_7d'),
    uptimePercent30d: real('uptime_percent_30d'),
    uptimePercentAll: real('uptime_percent_all'),

    // Number of outages
    outageCount1h: integer('outage_count_1h').notNull().default(0),
    outageCount24h: integer('outage_count_24h').notNull().default(0),
    outageCount7d: integer('outage_count_7d').notNull().default(0),
    outageCount30d: integer('outage_count_30d').notNull().default(0),

    // =========================================================
    // PAYMENT METRICS
    // =========================================================

    // Total payment volume (stored as text for bigint)
    paymentVolume1h: text('payment_volume_1h').notNull().default('0'),
    paymentVolume24h: text('payment_volume_24h').notNull().default('0'),
    paymentVolume7d: text('payment_volume_7d').notNull().default('0'),
    paymentVolume30d: text('payment_volume_30d').notNull().default('0'),
    paymentVolumeAll: text('payment_volume_all').notNull().default('0'),

    // Number of payments
    paymentCount1h: integer('payment_count_1h').notNull().default(0),
    paymentCount24h: integer('payment_count_24h').notNull().default(0),
    paymentCount7d: integer('payment_count_7d').notNull().default(0),
    paymentCount30d: integer('payment_count_30d').notNull().default(0),
    paymentCountAll: integer('payment_count_all').notNull().default(0),

    // Average payment amount
    avgPayment1h: text('avg_payment_1h'),
    avgPayment24h: text('avg_payment_24h'),
    avgPayment7d: text('avg_payment_7d'),
    avgPaymentAll: text('avg_payment_all'),

    // Unique payers
    uniquePayers1h: integer('unique_payers_1h').notNull().default(0),
    uniquePayers24h: integer('unique_payers_24h').notNull().default(0),
    uniquePayers7d: integer('unique_payers_7d').notNull().default(0),
    uniquePayersAll: integer('unique_payers_all').notNull().default(0)
  },
  table => ({
    resourceIdx: index('resource_metrics_resource_idx').on(table.resourceId),
    createdAtIdx: index('resource_metrics_created_at_idx').on(table.createdAt),
    resourceCreatedIdx: index('resource_metrics_resource_created_idx').on(
      table.resourceId,
      table.createdAt
    )
  })
)

// =====================================================
// ORIGIN METRICS TABLE
// =====================================================

/**
 * Resource origin metrics table - aggregated metrics per origin
 */
export const resourceOriginMetrics = sqliteTable(
  'resource_origin_metrics',
  {
    // Primary key
    id: text('id').primaryKey(),

    // Foreign key to origin
    originId: text('origin_id')
      .notNull()
      .references(() => resourceOrigins.id),

    // Snapshot timestamp
    createdAt: integer('created_at').notNull(),

    // Resource count
    resourceCount: integer('resource_count').notNull().default(0),
    activeResourceCount: integer('active_resource_count').notNull().default(0),

    // Aggregated request counts
    totalRequests1h: integer('total_requests_1h').notNull().default(0),
    totalRequests24h: integer('total_requests_24h').notNull().default(0),
    totalRequests7d: integer('total_requests_7d').notNull().default(0),
    totalRequestsAll: integer('total_requests_all').notNull().default(0),

    // Aggregated success counts
    successCount1h: integer('success_count_1h').notNull().default(0),
    successCount24h: integer('success_count_24h').notNull().default(0),
    successCount7d: integer('success_count_7d').notNull().default(0),
    successCountAll: integer('success_count_all').notNull().default(0),

    // Aggregated failure counts
    failureCount1h: integer('failure_count_1h').notNull().default(0),
    failureCount24h: integer('failure_count_24h').notNull().default(0),
    failureCount7d: integer('failure_count_7d').notNull().default(0),
    failureCountAll: integer('failure_count_all').notNull().default(0),

    // Average latency across resources
    avgLatencyP50_1h: real('avg_latency_p50_1h'),
    avgLatencyP50_24h: real('avg_latency_p50_24h'),
    avgLatencyP50_7d: real('avg_latency_p50_7d'),
    avgLatencyP50All: real('avg_latency_p50_all'),

    avgLatencyP90_1h: real('avg_latency_p90_1h'),
    avgLatencyP90_24h: real('avg_latency_p90_24h'),
    avgLatencyP90_7d: real('avg_latency_p90_7d'),
    avgLatencyP90All: real('avg_latency_p90_all'),

    // Aggregated uptime
    avgUptimePercent1h: real('avg_uptime_percent_1h'),
    avgUptimePercent24h: real('avg_uptime_percent_24h'),
    avgUptimePercent7d: real('avg_uptime_percent_7d'),
    avgUptimePercentAll: real('avg_uptime_percent_all'),

    // Aggregated payment metrics
    paymentVolume1h: text('payment_volume_1h').notNull().default('0'),
    paymentVolume24h: text('payment_volume_24h').notNull().default('0'),
    paymentVolume7d: text('payment_volume_7d').notNull().default('0'),
    paymentVolumeAll: text('payment_volume_all').notNull().default('0'),

    paymentCount1h: integer('payment_count_1h').notNull().default(0),
    paymentCount24h: integer('payment_count_24h').notNull().default(0),
    paymentCount7d: integer('payment_count_7d').notNull().default(0),
    paymentCountAll: integer('payment_count_all').notNull().default(0)
  },
  table => ({
    originIdx: index('origin_metrics_origin_idx').on(table.originId),
    createdAtIdx: index('origin_metrics_created_at_idx').on(table.createdAt)
  })
)

// =====================================================
// GLOBAL METRICS TABLE
// =====================================================

/**
 * Global x402 ecosystem metrics
 */
export const globalMetrics = sqliteTable('global_metrics', {
  // Primary key (single row, use 'global')
  id: text('id').primaryKey(),

  // Snapshot timestamp
  createdAt: integer('created_at').notNull(),

  // Resource counts
  totalResources: integer('total_resources').notNull().default(0),
  activeResources: integer('active_resources').notNull().default(0),
  totalOrigins: integer('total_origins').notNull().default(0),
  totalFacilitators: integer('total_facilitators').notNull().default(0),

  // Request aggregates
  totalRequests1h: integer('total_requests_1h').notNull().default(0),
  totalRequests24h: integer('total_requests_24h').notNull().default(0),
  totalRequests7d: integer('total_requests_7d').notNull().default(0),
  totalRequestsAll: integer('total_requests_all').notNull().default(0),

  // Payment aggregates
  paymentVolume1h: text('payment_volume_1h').notNull().default('0'),
  paymentVolume24h: text('payment_volume_24h').notNull().default('0'),
  paymentVolume7d: text('payment_volume_7d').notNull().default('0'),
  paymentVolumeAll: text('payment_volume_all').notNull().default('0'),

  paymentCount1h: integer('payment_count_1h').notNull().default(0),
  paymentCount24h: integer('payment_count_24h').notNull().default(0),
  paymentCount7d: integer('payment_count_7d').notNull().default(0),
  paymentCountAll: integer('payment_count_all').notNull().default(0),

  // Unique users
  uniquePayers1h: integer('unique_payers_1h').notNull().default(0),
  uniquePayers24h: integer('unique_payers_24h').notNull().default(0),
  uniquePayers7d: integer('unique_payers_7d').notNull().default(0),
  uniquePayersAll: integer('unique_payers_all').notNull().default(0),

  // Network breakdown (JSON)
  networkBreakdown: text('network_breakdown'), // JSON object

  // Top performers (JSON arrays)
  topResourcesByVolume: text('top_resources_by_volume'), // JSON array
  topResourcesByRequests: text('top_resources_by_requests'), // JSON array
  topOriginsByVolume: text('top_origins_by_volume') // JSON array
})

// =====================================================
// TYPE HELPERS
// =====================================================

export type InsertResourceMetrics = typeof resourceMetrics.$inferInsert
export type SelectResourceMetrics = typeof resourceMetrics.$inferSelect

export type InsertResourceOriginMetrics = typeof resourceOriginMetrics.$inferInsert
export type SelectResourceOriginMetrics = typeof resourceOriginMetrics.$inferSelect

export type InsertGlobalMetrics = typeof globalMetrics.$inferInsert
export type SelectGlobalMetrics = typeof globalMetrics.$inferSelect

// =====================================================
// METRICS INTERFACE
// =====================================================

/**
 * Time-windowed metrics for a resource
 */
export interface TimeWindowedResourceMetrics {
  resourceId: string
  window: TimeWindow
  requests: {
    total: number
    success: number
    failure: number
    successRate: number
  }
  latency: {
    p50: number | null
    p90: number | null
    p99: number | null
  }
  statusCodes: {
    '2xx': number
    '3xx': number
    '4xx': number
    '5xx': number
  }
  uptime: {
    percent: number | null
    outages: number
  }
  payments: {
    volume: bigint
    count: number
    average: bigint | null
    uniquePayers: number
  }
}
