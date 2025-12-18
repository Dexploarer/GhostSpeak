/**
 * Database Schema Index
 * 
 * Exports all database schemas.
 * 
 * @module database/schema
 */

// Import all schemas
import * as agents from './agents.js'
import * as transactions from './transactions.js'
import * as analytics from './analytics.js'
import * as facilitators from './facilitators.js'
import * as resources from './resources.js'
import * as resourceMetrics from './resourceMetrics.js'

/**
 * Combined schema object for Drizzle
 */
export const schema = {
    ...agents,
    ...transactions,
    ...analytics,
    ...facilitators,
    ...resources,
    ...resourceMetrics
}

// Re-export all table definitions
export * from './agents.js'
export * from './transactions.js'
export * from './analytics.js'
export * from './facilitators.js'
export * from './resources.js'
export * from './resourceMetrics.js'
