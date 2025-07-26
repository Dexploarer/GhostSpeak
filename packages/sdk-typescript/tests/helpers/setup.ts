/**
 * Test Setup and Configuration
 * 
 * Common setup for all test suites including mocks, fixtures, and utilities
 */

import { vi } from 'vitest'
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'

// Mock console methods to reduce test output noise
export function setupTestEnvironment() {
  // Only show errors in test output
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  
  // Keep error output for debugging
  // vi.spyOn(console, 'error').mockImplementation(() => {})
  
  // Setup browser globals if needed
  setupBrowserGlobals()
}

// Setup browser-specific globals for tests
export function setupBrowserGlobals() {
  // Mock crypto API
  if (typeof globalThis.crypto === 'undefined') {
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: (array: Uint8Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256)
          }
          return array
        },
        subtle: {
          digest: vi.fn(),
          encrypt: vi.fn(),
          decrypt: vi.fn(),
          sign: vi.fn(),
          verify: vi.fn()
        }
      }
    })
  }
  
  // Mock performance API
  if (typeof globalThis.performance === 'undefined') {
    Object.defineProperty(globalThis, 'performance', {
      value: {
        now: () => Date.now(),
        mark: vi.fn(),
        measure: vi.fn(),
        clearMarks: vi.fn(),
        clearMeasures: vi.fn()
      }
    })
  }
  
  // Mock navigator API
  if (typeof globalThis.navigator === 'undefined') {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'node.js',
        language: 'en-US',
        languages: ['en-US', 'en'],
        onLine: true,
        hardwareConcurrency: 4,
        platform: 'nodejs'
      }
    })
  }
  
  // Mock window object for browser compatibility tests
  if (typeof globalThis.window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      value: globalThis
    })
  }
  
  // Mock TextEncoder/TextDecoder if not available
  if (typeof globalThis.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util')
    Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder })
    Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder })
  }
}

// Common test addresses
export const TEST_ADDRESSES = {
  authority: address('2xYwqQsxZSTVgJ7FH8eL6QnFVdpNBRTPVJ2Ua7Lja8B1'),
  agent: address('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gKpf7'),
  user: address('6FPt6J5hV9hW6mQenJdX5LDGqPLUhuFTMWqfmzJvJYi9'),
  mint: address('8FqhMXMJehTPRWcgMpZRJjM2UYcQJ6vBSMH7GQbPKJyJ'),
  token: address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
  systemProgram: address('11111111111111111111111111111111'),
  tokenProgram: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  token2022Program: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
  zkProofProgram: address('ZkE1GAMA1PqNJF9tEfiDv2e3J3Gg8Q9DJvEXRDKSXaP')
} as const

// Test keypair generator
export function generateTestKeypair() {
  const secretKey = new Uint8Array(32)
  const publicKey = new Uint8Array(32)
  
  // Fill with deterministic test data
  for (let i = 0; i < 32; i++) {
    secretKey[i] = i
    publicKey[i] = 255 - i
  }
  
  return { publicKey, secretKey }
}

// Random bytes generator for tests
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

// Performance timer for benchmarks
export class PerformanceTimer {
  private startTime: number = 0
  private measurements: Map<string, number[]> = new Map()
  
  start() {
    this.startTime = performance.now()
  }
  
  measure(label: string): number {
    const elapsed = performance.now() - this.startTime
    
    if (!this.measurements.has(label)) {
      this.measurements.set(label, [])
    }
    this.measurements.get(label)!.push(elapsed)
    
    return elapsed
  }
  
  getStats(label: string) {
    const times = this.measurements.get(label) || []
    if (times.length === 0) return null
    
    const sum = times.reduce((a, b) => a + b, 0)
    const avg = sum / times.length
    const min = Math.min(...times)
    const max = Math.max(...times)
    
    return { avg, min, max, count: times.length }
  }
  
  reset() {
    this.measurements.clear()
  }
}

// Mock RPC client
export function createMockRpcClient() {
  return {
    getAccountInfo: vi.fn().mockResolvedValue(null),
    getBalance: vi.fn().mockResolvedValue(1000000000),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'test-blockhash',
      lastValidBlockHeight: 1000
    }),
    sendTransaction: vi.fn().mockResolvedValue('test-signature'),
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    simulateTransaction: vi.fn().mockResolvedValue({ 
      value: { err: null, logs: [] } 
    })
  }
}

// Test timeout helper
export const TEST_TIMEOUT = {
  unit: 5000,      // 5 seconds for unit tests
  integration: 30000, // 30 seconds for integration tests
  benchmark: 60000    // 60 seconds for benchmarks
}

// Environment checker
export function isCI(): boolean {
  return process.env.CI === 'true'
}

export function skipIfCI(reason = 'Skipped in CI environment') {
  if (isCI()) {
    return { skip: true, reason }
  }
  return { skip: false }
}