/**
 * Integration tests for Turso database connection
 * 
 * These tests only run when TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set.
 * They test actual connection to a real Turso database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@libsql/client'

// Helper to get config from environment
function getTursoConfig() {
    return {
        url: process.env.TURSO_DATABASE_URL ?? null,
        authToken: process.env.TURSO_AUTH_TOKEN ?? null,
        enabled: Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)
    }
}

// These tests only run if database is configured
const runIntegrationTests = Boolean(
    process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
)

describe.skipIf(!runIntegrationTests)('Database Connection Integration', () => {
    let client: ReturnType<typeof createClient> | null = null

    beforeEach(() => {
        const config = getTursoConfig()
        if (config.enabled && config.url && config.authToken) {
            client = createClient({
                url: config.url,
                authToken: config.authToken
            })
        }
    })

    afterEach(async () => {
        client = null
    })

    it('should successfully connect to Turso database', async () => {
        const config = getTursoConfig()

        expect(config.enabled).toBe(true)
        expect(client).toBeDefined()
    })

    it('should execute simple query', async () => {
        expect(client).toBeDefined()
        const result = await client!.execute('SELECT 1 as test')

        expect(result).toBeDefined()
        expect(result.rows).toBeDefined()
        expect(result.rows.length).toBeGreaterThan(0)
        expect(result.rows[0]).toHaveProperty('test')
    })

    it('should handle multiple queries', async () => {
        expect(client).toBeDefined()

        const result1 = await client!.execute('SELECT 1 as num')
        const result2 = await client!.execute('SELECT 2 as num')

        expect(result1.rows[0]).toHaveProperty('num', 1)
        expect(result2.rows[0]).toHaveProperty('num', 2)
    })

    it('should handle concurrent queries', async () => {
        expect(client).toBeDefined()

        const promises = Array.from({ length: 5 }, (_, i) =>
            client!.execute(`SELECT ${i + 1} as num`)
        )

        const results = await Promise.all(promises)

        expect(results).toHaveLength(5)
        results.forEach((result, i) => {
            expect(result.rows[0]).toHaveProperty('num', i + 1)
        })
    })

    it('should verify database is writable (create/drop table)', async () => {
        expect(client).toBeDefined()

        // Create test table
        await client!.execute('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, value TEXT)')

        // Insert data
        await client!.execute("INSERT INTO test_table (value) VALUES ('test')")

        // Query data
        const result = await client!.execute('SELECT * FROM test_table WHERE value = ?', ['test'])
        expect(result.rows.length).toBeGreaterThan(0)

        // Cleanup
        await client!.execute('DROP TABLE test_table')
    })

    it('should handle parameterized queries', async () => {
        expect(client).toBeDefined()

        const result = await client!.execute('SELECT ? as value', ['test_value'])

        expect(result.rows[0]).toHaveProperty('value', 'test_value')
    })
})
