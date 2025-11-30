/**
 * Database Module Index
 * 
 * Exports all database utilities for Turso integration.
 * 
 * @module database
 */

// Configuration
export {
    getTursoConfig,
    validateConfig,
    getConfigSummary,
    type TursoConfig
} from './config.js'

// Connection management
export {
    getConnection,
    ping,
    disconnect,
    getConnectionState,
    isAvailable,
    resetConnectionState
} from './connection.js'

// Database instance
export { getDb, type Database } from './db.js'

// Services
export * from './services/index.js'

// Schemas (for advanced usage)
export * from './schema/index.js'
