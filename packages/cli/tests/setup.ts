/**
 * Test Setup Configuration
 * Global setup for all test files
 */

import { vi } from 'vitest'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

// Mock console methods to reduce noise during testing
const originalConsole = { ...console }

// Set up global mocks
vi.mock('../src/utils/client', () => ({
  getClient: vi.fn()
}))

// Mock Solana addresses
vi.mock('@solana/addresses', () => ({
  address: (str: string) => str as any,
  getAddressFromPublicKey: (key: any) => key.toString(),
  isAddress: (addr: string) => addr.length >= 32
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.GHOSTSPEAK_CONFIG_DIR = '/tmp/ghostspeak-test'
process.env.GHOSTSPEAK_PROGRAM_ID_DEVNET = 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9'

// Global test utilities
global.mockConsole = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  restore: () => {
    Object.assign(console, originalConsole)
  }
}

// Note: afterEach and afterAll are automatically available when globals: true is set in vitest config
// The cleanup will be handled by vitest's global setup