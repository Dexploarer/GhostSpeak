/**
 * Unit tests for Turso database configuration module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getTursoConfig, validateConfig, getConfigSummary } from '../../../src/database/config.js'

describe('Database Configuration', () => {
    const originalEnv = process.env

    beforeEach(() => {
        // Reset environment before each test
        process.env = { ...originalEnv }
        delete process.env.TURSO_DATABASE_URL
        delete process.env.TURSO_AUTH_TOKEN
    })

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv
    })

    describe('getTursoConfig', () => {
        it('should return disabled config when no environment variables set', () => {
            const config = getTursoConfig()

            expect(config.enabled).toBe(false)
            expect(config.url).toBeNull()
            expect(config.authToken).toBeNull()
            expect(config.mode).toBeDefined()
            expect(config.pool).toBeDefined()
        })

        it('should return enabled config when both URL and token are set', () => {
            process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            const config = getTursoConfig()

            expect(config.enabled).toBe(true)
            expect(config.url).toBe('libsql://test.turso.io')
            expect(config.authToken).toBe('test-token')
        })

        it('should return disabled config when only URL is set', () => {
            process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'

            const config = getTursoConfig()

            expect(config.enabled).toBe(false)
            expect(config.url).toBe('libsql://test.turso.io')
            expect(config.authToken).toBeNull()
        })

        it('should return disabled config when only token is set', () => {
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            const config = getTursoConfig()

            expect(config.enabled).toBe(false)
            expect(config.url).toBeNull()
            expect(config.authToken).toBe('test-token')
        })

        it('should detect production mode from NODE_ENV', () => {
            const originalNodeEnv = process.env.NODE_ENV
            process.env.NODE_ENV = 'production'

            const config = getTursoConfig()

            expect(config.mode).toBe('production')

            // Restore original NODE_ENV
            if (originalNodeEnv !== undefined) {
                process.env.NODE_ENV = originalNodeEnv
            } else {
                delete process.env.NODE_ENV
            }
        })

        it('should default to development mode', () => {
            delete process.env.NODE_ENV

            const config = getTursoConfig()

            expect(config.mode).toBe('development')
        })

        it('should include default pool configuration', () => {
            const config = getTursoConfig()

            expect(config.pool).toBeDefined()
            expect(config.pool.max).toBeGreaterThan(0)
            expect(config.pool.min).toBeGreaterThanOrEqual(0)
            expect(config.pool.connectionTimeoutMs).toBeGreaterThan(0)
            expect(config.pool.idleTimeoutMs).toBeGreaterThan(0)
        })
    })

    describe('validateConfig', () => {
        it('should return false for disabled config', () => {
            const config = getTursoConfig()

            expect(validateConfig(config)).toBe(false)
        })

        it('should return true for valid config with libsql:// protocol', () => {
            process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            const config = getTursoConfig()

            expect(validateConfig(config)).toBe(true)
        })

        it('should return true for valid config with http:// protocol', () => {
            process.env.TURSO_DATABASE_URL = 'http://localhost:8080'
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            const config = getTursoConfig()

            expect(validateConfig(config)).toBe(true)
        })

        it('should return true for valid config with https:// protocol', () => {
            process.env.TURSO_DATABASE_URL = 'https://test.turso.io'
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            const config = getTursoConfig()

            expect(validateConfig(config)).toBe(true)
        })

        it('should return false for invalid URL protocol', () => {
            process.env.TURSO_DATABASE_URL = 'invalid://test.turso.io'
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            const config = getTursoConfig()

            expect(validateConfig(config)).toBe(false)
        })

        it('should return false when URL is missing', () => {
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            const config = getTursoConfig()

            expect(validateConfig(config)).toBe(false)
        })

        it('should return false when token is missing', () => {
            process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'

            const config = getTursoConfig()

            expect(validateConfig(config)).toBe(false)
        })
    })

    describe('getConfigSummary', () => {
        it('should mask sensitive data in summary', () => {
            process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            const config = getTursoConfig()
            const summary = getConfigSummary(config)

            expect(summary.url).toBe('***')
            expect(summary.authToken).toBe('***')
        })

        it('should show null for missing credentials', () => {
            const config = getTursoConfig()
            const summary = getConfigSummary(config)

            expect(summary.url).toBeNull()
            expect(summary.authToken).toBeNull()
        })

        it('should include enabled status', () => {
            const config = getTursoConfig()
            const summary = getConfigSummary(config)

            expect(summary.enabled).toBeDefined()
            expect(typeof summary.enabled).toBe('boolean')
        })

        it('should include mode and pool config', () => {
            const config = getTursoConfig()
            const summary = getConfigSummary(config)

            expect(summary.mode).toBeDefined()
            expect(summary.pool).toBeDefined()
        })
    })
})
