/**
 * React Query Hooks for x402 Payment Protocol
 *
 * Uses Crossmint wallet for wallet integration.
 * Connects to real SDK modules for on-chain operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@crossmint/client-sdk-react-ui'
import { address } from '@solana/addresses'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import { getSDKManager } from '../ghostspeak'
import { getGhostSpeakClient } from '../ghostspeak/client'
import type {
  X402PaymentRequest,
  AgentSearchParams,
  PaymentHistoryItem,
  PaymentStream,
} from '../ghostspeak'

// =====================================================
// X402 PAYMENT HOOKS
// =====================================================

export function useCreateX402Payment() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address: walletAddress } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: {
      recipient: string
      amount: bigint
      token: string
      description: string
      metadata?: Record<string, string>
    }) => {
      if (!isConnected || !walletAddress) throw new Error('Wallet not connected')

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const sdk = getSDKManager()
      const request: X402PaymentRequest = {
        recipient: address(params.recipient),
        amount: params.amount,
        token: address(params.token),
        description: params.description,
        metadata: params.metadata,
        requiresReceipt: true,
      }

      const receipt = await sdk.x402.pay(request, signer)
      return receipt
    },
    onSuccess: () => {
      // Invalidate payment history
      queryClient.invalidateQueries({ queryKey: ['x402-payments'] })
      queryClient.invalidateQueries({ queryKey: ['x402-analytics'] })
    },
  })
}

export function useVerifyX402Payment() {
  return useMutation({
    mutationFn: async (signature: string) => {
      const sdk = getSDKManager()
      return sdk.x402.verifyPayment(signature)
    },
  })
}

/**
 * Hook for creating escrow-based payments for long-running tasks
 * Use this for tasks with milestones that need buyer protection
 */
export function useCreateEscrowPayment() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address: walletAddress } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: {
      recipient: string
      amount: bigint
      token: string
      description: string
      milestones?: Array<{ amount: bigint; description: string }>
      metadata?: Record<string, string>
    }) => {
      if (!isConnected || !walletAddress) throw new Error('Wallet not connected')

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const sdk = getSDKManager()
      const request = {
        recipient: address(params.recipient),
        amount: params.amount,
        token: address(params.token),
        description: params.description,
        metadata: params.metadata,
        requiresReceipt: true,
      }

      const receipt = await sdk.x402.payWithEscrow(request, signer, params.milestones)
      return receipt
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['x402-payments'] })
      queryClient.invalidateQueries({ queryKey: ['escrow'] })
    },
  })
}

export interface PaymentItem {
  signature: string
  recipient: string
  amount: bigint
  token: string
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
  description?: string
}

export function useX402PaymentHistory() {
  const { wallet } = useWallet()
  const walletAddress = wallet?.address ?? null

  return useQuery<PaymentItem[]>({
    queryKey: ['x402-payments', walletAddress],
    queryFn: async (): Promise<PaymentItem[]> => {
      if (!walletAddress) return []

      const sdk = getSDKManager()
      const history = await sdk.x402.getPaymentHistory(walletAddress)

      return history.map((item: PaymentHistoryItem) => ({
        signature: item.signature,
        recipient: item.recipient,
        amount: item.amount,
        token: item.token,
        timestamp: item.timestamp,
        status: item.status || 'confirmed',
        description: item.description,
      }))
    },
    enabled: !!walletAddress,
    refetchInterval: 10000, // Refresh every 10 seconds
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
    staleTime: 20000, // Consider data stale after 20 seconds
  })
}

export function useX402Agent(agentAddress?: string) {
  return useQuery({
    queryKey: ['x402-agent', agentAddress],
    queryFn: async () => {
      if (!agentAddress) throw new Error('Agent address required')

      const sdk = getSDKManager()
      return sdk.discovery.getAgent(agentAddress)
    },
    enabled: !!agentAddress,
    staleTime: 60000, // Cache for 1 minute
  })
}

export function useX402AgentsByCapability(capability: string) {
  return useQuery({
    queryKey: ['x402-agents-capability', capability],
    queryFn: async () => {
      const sdk = getSDKManager()
      return sdk.discovery.searchAgents({
        capability,
        sort_by: 'price',
        sort_order: 'asc',
      })
    },
    enabled: !!capability,
    staleTime: 30000,
  })
}

export function useX402AgentPriceComparison(capability: string) {
  return useQuery({
    queryKey: ['x402-price-comparison', capability],
    queryFn: async () => {
      const sdk = getSDKManager()
      const response = await sdk.discovery.searchAgents({
        capability,
        sort_by: 'price',
        sort_order: 'asc',
      })

      // Calculate price statistics
      const prices = response.agents
        .map((agent) => Number(agent.pricing?.pricePerCall ?? 0))
        .filter((price) => price > 0)

      const average = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0

      const min = prices.length > 0 ? Math.min(...prices) : 0
      const max = prices.length > 0 ? Math.max(...prices) : 0

      return {
        agents: response.agents,
        stats: {
          min: BigInt(Math.floor(min)),
          max: BigInt(Math.floor(max)),
          average: BigInt(Math.floor(average)),
          count: response.total,
        },
      }
    },
    enabled: !!capability,
    staleTime: 30000,
  })
}

// =====================================================
// ANALYTICS HOOKS
// =====================================================

export interface UserAnalytics {
  totalSpent: bigint
  totalEarned: bigint
  totalPaymentsSent: number
  totalPaymentsReceived: number
  successRate: number
  successfulPayments: number
}

export function useX402Analytics() {
  const { wallet } = useWallet()
  const walletAddress = wallet?.address ?? null

  return useQuery<UserAnalytics | null>({
    queryKey: ['x402-analytics', walletAddress],
    queryFn: async (): Promise<UserAnalytics | null> => {
      if (!walletAddress) return null

      const sdk = getSDKManager()
      const metrics = await sdk.analytics.getUserMetrics(walletAddress)

      return {
        totalSpent: metrics.totalVolume,
        totalEarned: BigInt(0), // Would need seller escrows
        totalPaymentsSent: metrics.transactionCount,
        totalPaymentsReceived: 0,
        successRate: metrics.successRate,
        successfulPayments: metrics.transactionCount,
      }
    },
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000,
  })
}

export function useX402AgentEarnings(agentAddress?: string) {
  return useQuery({
    queryKey: ['x402-agent-earnings', agentAddress],
    queryFn: async () => {
      if (!agentAddress) throw new Error('Agent address required')

      const sdk = getSDKManager()
      const earnings = await sdk.analytics.getAgentEarnings(agentAddress)

      return {
        totalVolume: earnings.totalEarnings,
        transactionCount: earnings.totalCalls,
        averageAmount: earnings.averagePerCall,
      }
    },
    enabled: !!agentAddress,
    refetchInterval: 20000,
  })
}

export function useX402PlatformStats() {
  return useQuery({
    queryKey: ['x402-platform-stats'],
    queryFn: async () => {
      // Get aggregated platform stats from all escrows
      const client = getGhostSpeakClient()
      const allEscrows = await client.escrow.getAllEscrows()

      const totalVolume = allEscrows.reduce((sum, e) => sum + e.data.amount, BigInt(0))

      return {
        totalVolume,
        totalPayments: allEscrows.length,
        averagePayment: allEscrows.length > 0 ? totalVolume / BigInt(allEscrows.length) : BigInt(0),
        successRate: 1.0, // Would calculate from statuses
        activeAgents: 0, // Would count active agents
        topAgents: [],
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

// =====================================================
// PAYMENT STREAMING HOOKS
// =====================================================

export interface CreatePaymentStreamParams {
  recipient: string
  totalAmount: bigint
  token: string
  milestones: Array<{
    description: string
    amount: bigint
    deadline?: number
  }>
  description: string
}

export function useCreatePaymentStream() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: CreatePaymentStreamParams): Promise<string> => {
      if (!isConnected) throw new Error('Wallet not connected')

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Payment streaming creates an escrow with milestones
      const client = getGhostSpeakClient()
      const milestones = params.milestones.map((m) => ({
        amount: m.amount,
        description: m.description,
      }))

      const signature = await client.escrow.create({
        signer,
        amount: params.totalAmount,
        buyer: signer.address,
        seller: address(params.recipient),
        description: params.description,
        milestones,
      })

      return signature
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-streams'] })
    },
  })
}

export function usePaymentStreams() {
  const { wallet } = useWallet()
  const walletAddress = wallet?.address ?? null

  return useQuery({
    queryKey: ['payment-streams', walletAddress],
    queryFn: async (): Promise<PaymentStream[]> => {
      if (!walletAddress) return []

      // Payment streams are escrows with milestones
      const client = getGhostSpeakClient()
      const escrows = await client.escrow.getEscrowsByBuyer(address(walletAddress))

      return escrows.map((e) => ({
        id: e.address.toString(),
        recipient: e.data.agent.toString(),
        amount: e.data.amount,
        token: 'So11111111111111111111111111111111111111112' as const,
        intervalMs: 0,
        totalPayments: 1,
        completedPayments: 0,
        status: 'active' as const,
        totalAmount: e.data.amount,
        releasedAmount: BigInt(0),
        description: e.data.taskId,
        milestones: [],
      }))
    },
    enabled: !!walletAddress,
    refetchInterval: 10000,
  })
}

export function usePaymentStream(streamId?: string) {
  return useQuery({
    queryKey: ['payment-stream', streamId],
    queryFn: async (): Promise<PaymentStream | null> => {
      if (!streamId) throw new Error('Stream ID required')

      const client = getGhostSpeakClient()
      const escrow = await client.escrow.getEscrowAccount(address(streamId))

      if (!escrow) return null

      return {
        id: streamId,
        recipient: escrow.agent.toString(),
        amount: escrow.amount,
        token: 'So11111111111111111111111111111111111111112' as const,
        intervalMs: 0,
        totalPayments: 1,
        completedPayments: 0,
        status: 'active' as const,
        totalAmount: escrow.amount,
        releasedAmount: BigInt(0),
        description: escrow.taskId,
        milestones: [],
      }
    },
    enabled: !!streamId,
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  })
}

export function useReleaseMilestone() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: { streamId: string; milestoneIndex: number }) => {
      if (!isConnected) throw new Error('Wallet not connected')

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Get the escrow and complete it
      const client = getGhostSpeakClient()
      const escrow = await client.escrow.getEscrowAccount(address(params.streamId))

      if (!escrow) throw new Error('Stream not found')

      // For now, complete the entire escrow as GhostSpeak doesn't have partial milestone release
      const signature = await client.escrow.complete(signer, escrow.taskId)

      return signature
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-stream', variables.streamId] })
      queryClient.invalidateQueries({ queryKey: ['payment-streams'] })
    },
  })
}

// =====================================================
// TOKEN BALANCE HOOKS
// =====================================================

export function useTokenBalance(tokenAddress?: string) {
  const { wallet } = useWallet()
  const walletAddress = wallet?.address ?? null

  return useQuery({
    queryKey: ['token-balance', walletAddress, tokenAddress],
    queryFn: async (): Promise<bigint> => {
      if (!walletAddress || !tokenAddress) return BigInt(0)

      const sdk = getSDKManager()
      return sdk.tokens.getTokenBalance(walletAddress, tokenAddress)
    },
    enabled: !!walletAddress && !!tokenAddress,
    refetchInterval: 10000,
  })
}

export function useTokenBalances() {
  const { wallet } = useWallet()
  const walletAddress = wallet?.address ?? null

  return useQuery({
    queryKey: ['token-balances', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return []

      const sdk = getSDKManager()
      return sdk.tokens.getAllTokenBalances(walletAddress)
    },
    enabled: !!walletAddress,
    refetchInterval: 15000,
  })
}
