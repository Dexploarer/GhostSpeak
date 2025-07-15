/**
 * Test Setup for GhostSpeak SDK E2E Tests
 * 
 * Provides comprehensive test utilities for blockchain testing with Web3.js v2
 */

import { beforeAll, beforeEach, afterAll, vi } from 'vitest'

// Mock console methods for cleaner test output
beforeAll(() => {
  // Suppress console.log during tests unless needed
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

beforeEach(() => {
  // Reset all mocks between tests
  vi.clearAllMocks()
})

afterAll(() => {
  // Restore original console methods
  vi.restoreAllMocks()
})

// Global test utilities
declare global {
  var testUtils: {
    enableLogging: () => void
    disableLogging: () => void
    sleep: (ms: number) => Promise<void>
  }
}

globalThis.testUtils = {
  enableLogging: () => {
    vi.restoreAllMocks()
  },
  disableLogging: () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  },
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
}

export {}