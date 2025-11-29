/**
 * React Query Hooks for x402 Payment Protocol
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import { getSDKManager } from '../ghostspeak'
import type {
  X402PaymentRequest,
  X402PaymentReceipt,
  AgentSearchParams,
  Agent,
  X402TransactionMetrics,
  PaymentStream
} from '../ghostspeak'

// =====================================================
// X402 PAYMENT HOOKS
// =====================================================

export function useCreateX402Payment() {
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      recipient: string
      amount: bigint
      token: string
      description: string
      metadata?: Record<string, string>
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const sdk = getSDKManager()
      const request: X402PaymentRequest = {
        recipient: address(params.recipient),
        amount: params.amount,
        token: address(params.token),
        description: params.description,
        metadata: params.metadata,
        requiresReceipt: true
      }

      const signature = await sdk.x402.sendPayment(request)

      // Wait for confirmation
      const receipt = await sdk.x402.waitForConfirmation(signature, {
        maxRetries: 30,
        retryInterval: 1000
      })

      return receipt
    },
    onSuccess: () => {
      // Invalidate payment history
      queryClient.invalidateQueries({ queryKey: ['x402-payments'] })
      queryClient.invalidateQueries({ queryKey: ['x402-analytics'] })
    }
  })
}

export function useVerifyX402Payment() {
  return useMutation({
    mutationFn: async (signature: string) => {
      const sdk = getSDKManager()
      return sdk.x402.verifyPayment(signature)
    }
  })
}

export function useX402PaymentHistory() {
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['x402-payments', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return []

      const sdk = getSDKManager()
      const payments = await sdk.x402.getPaymentHistory(publicKey)
      return payments
    },
    enabled: !!publicKey,
    refetchInterval: 10000 // Refresh every 10 seconds
  })
}

// =====================================================
// AGENT DISCOVERY HOOKS
// =====================================================

export function useX402AgentDiscovery(params?: AgentSearchParams) {
  return useQuery({
    queryKey: ['x402-agents', params],
    queryFn: async () => {
      const sdk = getSDKManager()
      return sdk.discovery.searchAgents(params ?? {})
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000 // Consider data stale after 20 seconds
  })
}

export function useX402Agent(agentAddress?: string) {
  return useQuery({
    queryKey: ['x402-agent', agentAddress],
    queryFn: async () => {
      if (!agentAddress) throw new Error('Agent address required')

      const sdk = getSDKManager()
      return sdk.discovery.getAgent(address(agentAddress))
    },
    enabled: !!agentAddress,
    staleTime: 60000 // Cache for 1 minute
  })
}

export function useX402AgentsByCapability(capability: string) {
  return useQuery({
    queryKey: ['x402-agents-capability', capability],
    queryFn: async () => {
      const sdk = getSDKManager()
      return sdk.discovery.searchAgents({
        capability,
        sortBy: 'price_asc'
      })
    },
    enabled: !!capability,
    staleTime: 30000
  })
}

export function useX402AgentPriceComparison(capability: string) {
  return useQuery({
    queryKey: ['x402-price-comparison', capability],
    queryFn: async () => {
      const sdk = getSDKManager()
      const response = await sdk.discovery.searchAgents({
        capability,
        sortBy: 'price_asc',
        limit: 20
      })

      // Calculate price statistics
      const prices = response.agents
        .map((agent) => Number(agent.pricing?.pricePerCall ?? 0))
        .filter((price) => price > 0)

      const average = prices.length > 0
        ? prices.reduce((sum, p) => sum + p, 0) / prices.length
        : 0

      const min = prices.length > 0 ? Math.min(...prices) : 0
      const max = prices.length > 0 ? Math.max(...prices) : 0

      return {
        agents: response.agents,
        statistics: {
          average,
          min,
          max,
          count: prices.length
        }
      }
    },
    enabled: !!capability,
    staleTime: 60000
  })
}

// =====================================================
// ANALYTICS HOOKS
// =====================================================

export function useX402Analytics() {
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['x402-analytics', publicKey?.toBase58()],
    queryFn: async () => {
      const sdk = getSDKManager()

      if (publicKey) {
        return sdk.analytics.getUserMetrics(publicKey)
      }

      // Return platform-wide metrics if no wallet connected
      return sdk.analytics.getPlatformMetrics()
    },
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000
  })
}

export function useX402AgentEarnings(agentAddress?: string) {
  return useQuery({
    queryKey: ['x402-agent-earnings', agentAddress],
    queryFn: async () => {
      if (!agentAddress) throw new Error('Agent address required')

      const sdk = getSDKManager()
      return sdk.analytics.getAgentEarnings(address(agentAddress))
    },
    enabled: !!agentAddress,
    refetchInterval: 20000
  })
}

export function useX402PlatformStats() {
  return useQuery({
    queryKey: ['x402-platform-stats'],
    queryFn: async () => {
      const sdk = getSDKManager()
      const metrics = await sdk.analytics.getPlatformMetrics()

      return {
        totalVolume: metrics.totalVolume ?? BigInt(0),
        totalPayments: metrics.totalPayments ?? 0,
        averagePayment: typeof metrics.averageAmount === 'bigint' ? metrics.averageAmount : BigInt(metrics.averageAmount ?? 0),
        successRate: metrics.successRate ?? 0,
        activeAgents: metrics.activeAgents ?? 0,
        topAgents: metrics.topAgents ?? []
      }
    },
    refetchInterval: 30000,
    staleTime: 20000
  })
}

// =====================================================
// PAYMENT STREAMING HOOKS
// =====================================================

export function useCreatePaymentStream() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      recipient: string
      totalAmount: bigint
      token: string
      milestones: Array<{
        description: string
        amount: bigint
        deadline?: number
      }>
      description: string
    }) => {
      const sdk = getSDKManager()

      const stream = await sdk.streaming.createStream({
        recipient: address(params.recipient),
        totalAmount: params.totalAmount,
        token: address(params.token),
        milestones: params.milestones,
        description: params.description
      })

      return stream
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-streams'] })
    }
  })
}

export function usePaymentStreams() {
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['payment-streams', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return []

      const sdk = getSDKManager()
      return sdk.streaming.getUserStreams(publicKey)
    },
    enabled: !!publicKey,
    refetchInterval: 10000
  })
}

export function usePaymentStream(streamId?: string) {
  return useQuery({
    queryKey: ['payment-stream', streamId],
    queryFn: async () => {
      if (!streamId) throw new Error('Stream ID required')

      const sdk = getSDKManager()
      return sdk.streaming.getStream(streamId)
    },
    enabled: !!streamId,
    refetchInterval: 5000 // Refresh every 5 seconds for live updates
  })
}

export function useReleaseMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      streamId: string
      milestoneIndex: number
    }) => {
      const sdk = getSDKManager()
      return sdk.streaming.releaseMilestone(
        params.streamId,
        params.milestoneIndex
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['payment-stream', variables.streamId]
      })
      queryClient.invalidateQueries({ queryKey: ['payment-streams'] })
    }
  })
}

// =====================================================
// TOKEN BALANCE HOOKS
// =====================================================

export function useTokenBalance(tokenAddress?: string) {
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['token-balance', publicKey?.toBase58(), tokenAddress],
    queryFn: async () => {
      if (!publicKey || !tokenAddress) return BigInt(0)

      const sdk = getSDKManager()
      const balance = await sdk.ghostspeak.tokens.getBalance(
        publicKey,
        address(tokenAddress)
      )
      return balance
    },
    enabled: !!publicKey && !!tokenAddress,
    refetchInterval: 10000
  })
}

export function useTokenBalances() {
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['token-balances', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return []

      const sdk = getSDKManager()
      return sdk.ghostspeak.tokens.getAllBalances(publicKey)
    },
    enabled: !!publicKey,
    refetchInterval: 15000
  })
}
