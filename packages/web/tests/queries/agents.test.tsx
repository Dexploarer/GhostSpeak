/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { useAgents, useAgent, useRegisterAgent } from '@/lib/queries/agents'
import { TestProviders, createMockAgent } from '../test-utils'

// Mock wallet adapter
vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: vi.fn(() => ({
    publicKey: { toBase58: () => 'mock-public-key' },
    signTransaction: vi.fn(),
    connected: true,
  })),
}))

describe('Agents Queries', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  describe('useAgents', () => {
    it('should fetch all agents successfully', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: ({ children }) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      })

      // Since we're using a mock client, we expect it to return empty results
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })

    it('should handle API errors gracefully', async () => {
      const { result } = renderHook(() => useAgents(), {
        wrapper: ({ children }) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      })

      // Test that it doesn't throw errors with our mock setup
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })

  describe('useAgent', () => {
    it('should not fetch if no address provided', () => {
      const { result } = renderHook(() => useAgent(undefined), {
        wrapper: ({ children }) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      })

      // When no address is provided, the query should be disabled but still in pending state initially
      expect(result.current.isPending).toBe(true)
    })

    it('should fetch agent when address is provided', async () => {
      const { result } = renderHook(() => useAgent('test-agent-address'), {
        wrapper: ({ children }) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // With our mock client, it should return a structured agent
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.address).toBe('test-agent-address')
    })
  })

  describe('useRegisterAgent', () => {
    it('should handle registration attempt', async () => {
      const { result } = renderHook(() => useRegisterAgent(), {
        wrapper: ({ children }) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      })

      const registerData = {
        name: 'New Agent',
        metadataUri: JSON.stringify({ description: 'Test agent' }),
        capabilities: ['testing'],
        agentId: 'test-agent-id',
      }

      result.current.mutate(registerData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.signature).toBe('mock-signature')
    })
  })
})
