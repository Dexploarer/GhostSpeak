/**
 * Database Test Helpers
 * 
 * Utilities for setting up real Turso database connections in tests
 */

import { getTursoConfig, validateConfig } from '../../src/database/config.js'
import { getConnection } from '../../src/database/connection.js'
import type { Client } from '@libsql/client'

/**
 * Check if database is configured for testing
 */
export function isDatabaseConfigured(): boolean {
    const config = getTursoConfig()
    return validateConfig(config)
}

/**
 * Get database client for testing
 * Throws if database is not configured
 */
export async function getTestDatabaseClient(): Promise<Client> {
    if (!isDatabaseConfigured()) {
        throw new Error(
            'Database not configured for testing. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.'
        )
    }

    return await getConnection()
}

/**
 * Clean up test data from database
 * Call this in afterEach to prevent test pollution
 */
export async function cleanupTestData(client: Client, tables: string[]): Promise<void> {
    for (const table of tables) {
        try {
            await client.execute(`DELETE FROM ${table} WHERE name LIKE 'test_%' OR name LIKE 'TEST_%'`)
        } catch (error) {
            // Table might not exist yet, ignore
            console.warn(`Could not clean table ${table}:`, error)
        }
    }
}

/**
 * Skip test if database is not configured
 */
export function skipIfNoDatabaseAccess(testFn: () => void | Promise<void>) {
    return isDatabaseConfigured() ? testFn : () => {
        console.log('Skipping test - database not configured')
    }
}

/**
 * Create a unique test identifier for test isolation
 */
export function createTestId(prefix: string = 'test'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`
}
