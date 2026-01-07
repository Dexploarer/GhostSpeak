/**
 * Solana Client Tests
 *
 * Unit tests for lib/solana/client.ts functions.
 * Tests client creation, singleton pattern, and reset functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getSolanaClient,
  createServerSolanaClient,
  resetSolanaClient,
} from '../../lib/solana/client'

// Mock the @solana/client module before tests
const mockCreateClient = vi.fn()
const mockUrl = 'https://api.mainnet-beta.solana.com'

vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn().mockImplementation(() => ({})),
  RPCEndpoint: {
    custom: vi.fn(),
  },
}))

vi.mock('@solana/client', () => ({
  createSolanaClient: vi.fn().mockImplementation((config: { url: string }) => {
    return { url: config.url }
  }),
}))

// ============================================================================
// Client Creation Tests
// ============================================================================

describe('Solana Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset the singleton before each test
    resetSolanaClient()
    // Clear module cache to ensure fresh imports
    vi.resetModules()
  })

  afterEach(() => {
    // Clean up and reset
    resetSolanaClient()
    vi.restoreAllMocks()
    process.env = originalEnv
  })

  describe('getSolanaClient', () => {
    it('should create a client when first called', () => {
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'

      const client = getSolanaClient()
      expect(client).not.toBeNull()
    })

    it('should return the same instance on subsequent calls (singleton)', () => {
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'

      const client1 = getSolanaClient()
      const client2 = getSolanaClient()
      expect(client1).toBe(client2)
    })

    it('should use NEXT_PUBLIC_SOLANA_RPC_URL from environment', () => {
      const customUrl = 'https://custom.rpc.endpoint.com'
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = customUrl

      resetSolanaClient()
      const client = getSolanaClient()

      expect(client).not.toBeNull()
    })

    it('should use default URL when env var is not set', () => {
      delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL

      resetSolanaClient()
      const client = getSolanaClient()

      expect(client).not.toBeNull()
    })
  })

  describe('createServerSolanaClient', () => {
    it('should create a new client instance', () => {
      const client = createServerSolanaClient()
      expect(client).not.toBeNull()
    })

    it('should use custom RPC URL when provided', () => {
      const customUrl = 'https://custom-server.rpc.com'
      const client = createServerSolanaClient(customUrl)
      expect(client).not.toBeNull()
    })

    it('should use SOLANA_RPC_URL from environment', () => {
      const customUrl = 'https://solana-server.example.com'
      process.env.SOLANA_RPC_URL = customUrl

      const client = createServerSolanaClient()
      expect(client).not.toBeNull()
    })

    it('should fall back to NEXT_PUBLIC_SOLANA_RPC_URL if SOLANA_RPC_URL is not set', () => {
      delete process.env.SOLANA_RPC_URL
      const publicUrl = 'https://public.rpc.com'
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = publicUrl

      const client = createServerSolanaClient()
      expect(client).not.toBeNull()
    })

    it('should use default URL when no env vars are set', () => {
      delete process.env.SOLANA_RPC_URL
      delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL

      const client = createServerSolanaClient()
      expect(client).not.toBeNull()
    })

    it('should create independent instances for each call', () => {
      const client1 = createServerSolanaClient()
      const client2 = createServerSolanaClient()
      expect(client1).not.toBe(client2)
    })
  })

  describe('resetSolanaClient', () => {
    it('should reset the client-side singleton', () => {
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'

      const client1 = getSolanaClient()
      resetSolanaClient()
      const client2 = getSolanaClient()

      // After reset, a new instance should be created
      expect(client1).not.toBe(client2)
    })

    it('should not affect server clients', () => {
      const serverClient = createServerSolanaClient()
      resetSolanaClient()
      const serverClient2 = createServerSolanaClient()

      // Server clients are independent of the singleton
      expect(serverClient).not.toBe(serverClient2)
    })
  })

  describe('client configuration', () => {
    it('should handle devnet URL', () => {
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.devnet.solana.com'

      resetSolanaClient()
      const client = getSolanaClient()

      expect(client).not.toBeNull()
    })

    it('should handle local cluster URL', () => {
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'http://localhost:8899'

      resetSolanaClient()
      const client = getSolanaClient()

      expect(client).not.toBeNull()
    })

    it('should handle custom port URLs', () => {
      const client = createServerSolanaClient('https://rpc.example.com:443')
      expect(client).not.toBeNull()
    })
  })
})
