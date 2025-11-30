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
