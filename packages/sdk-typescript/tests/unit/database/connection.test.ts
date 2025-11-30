/**
 * Unit tests for Turso database connection manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    getConnection,
    ping,
    disconnect,
    getConnectionState,
    isAvailable,
    resetConnectionState
} from '../../../src/database/connection.js'

describe('Database Connection', () => {
    const originalEnv = process.env

    beforeEach(() => {
        // Reset environment and connection state before each test
        process.env = { ...originalEnv }
        delete process.env.TURSO_DATABASE_URL
        delete process.env.TURSO_AUTH_TOKEN
        resetConnectionState()
    })

    afterEach(async () => {
        // Clean up connections and restore environment
        await disconnect()
        process.env = originalEnv
        resetConnectionState()
    })

    describe('getConnection', () => {
        it('should throw error when database not configured', async () => {
            await expect(getConnection()).rejects.toThrow('not configured')
        })

        it('should throw error when only URL is set', async () => {
            process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io'

            await expect(getConnection()).rejects.toThrow()
        })

        it('should throw error when only token is set', async () => {
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            await expect(getConnection()).rejects.toThrow()
        })

        it('should throw error with invalid URL format', async () => {
            process.env.TURSO_DATABASE_URL = 'invalid://test.turso.io'
            process.env.TURSO_AUTH_TOKEN = 'test-token'

            await expect(getConnection()).rejects.toThrow()
        })
    })

    describe('isAvailable', () => {
        it('should return false when database not configured', async () => {
            const available = await isAvailable()

            expect(available).toBe(false)
        })

        it('should return false when connection fails', async () => {
            process.env.TURSO_DATABASE_URL = 'libsql://nonexistent.turso.io'
            process.env.TURSO_AUTH_TOKEN = 'invalid-token'

            const available = await isAvailable()

            expect(available).toBe(false)
        })
    })

    describe('ping', () => {
        it('should return false when database not configured', async () => {
            const healthy = await ping()

            expect(healthy).toBe(false)
        })

        it('should return false when connection fails', async () => {
            process.env.TURSO_DATABASE_URL = 'libsql://nonexistent.turso.io'
            process.env.TURSO_AUTH_TOKEN = 'invalid-token'

            const healthy = await ping()

            expect(healthy).toBe(false)
        })
    })

    describe('disconnect', () => {
        it('should safely disconnect when not connected', async () => {
            await expect(disconnect()).resolves.toBeUndefined()
        })

        it('should be safe to call multiple times', async () => {
            await disconnect()
            await disconnect()
            await expect(disconnect()).resolves.toBeUndefined()
        })
    })

    describe('getConnectionState', () => {
        it('should return initial state', () => {
            const state = getConnectionState()

            expect(state).toBeDefined()
            expect(state.initialized).toBe(false)
            expect(state.healthy).toBe(false)
            expect(state.lastError).toBeNull()
            expect(state.retryCount).toBe(0)
        })

        it('should not expose client instance', () => {
            const state = getConnectionState() as any

            expect(state.client).toBeUndefined()
        })
    })

    describe('resetConnectionState', () => {
        it('should reset connection state', () => {
            resetConnectionState()

            const state = getConnectionState()

            expect(state.initialized).toBe(false)
            expect(state.healthy).toBe(false)
            expect(state.lastError).toBeNull()
            expect(state.retryCount).toBe(0)
            expect(state.lastConnectAttempt).toBe(0)
        })
    })
})
