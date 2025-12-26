'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import { useTransactionFeedback } from '@/lib/transaction-feedback'
import { getErrorInfo } from '@/lib/errors/error-messages'
import type { Address } from '@solana/addresses'

// Import Agent type from SDK
import type { Agent as SDKAgent } from '@ghostspeak/sdk/browser'

// Helper function to calculate comprehensive reputation
function calculateAgentReputation(agentData: SDKAgent | null) {
  if (!agentData) {
    return { score: 0, totalJobs: 0, successRate: 0 }
  }

  // Calculate basic reputation metrics from blockchain data
  const totalJobs = agentData.totalJobsCompleted ?? 0
  const reputationScore = agentData.reputationScore ?? 0

  // Convert reputation score from basis points to 0-100 scale
  const score = Math.round(reputationScore / 100)

  // Calculate success rate based on score and job count
  const successRate =
    totalJobs > 0 ? Math.min(100, Math.round(reputationScore / totalJobs / 100)) : 0

  return {
    score,
    totalJobs,
    successRate,
  }
}

// Types for agent data (UI representation)
/**
 * UI representation of a GhostSpeak Agent.
 * Normalized from SDK data.
 */
interface Agent {
  address: string
  name: string
  metadata: {
    description?: string
    avatar?: string
    category?: string
  }
  owner: string
  reputation: {
    score: number
    totalJobs: number
    successRate: number
  }
  pricing: bigint
  capabilities: string[]
  isActive: boolean
  createdAt: Date
  // x402 Payment Protocol fields
  x402?: {
    enabled: boolean
    paymentAddress: string
    acceptedTokens: string[]
    pricePerCall: bigint
    serviceEndpoint: string
    totalPayments: bigint
    totalCalls: bigint
    apiSpecUri?: string
  }
}

// Query keys
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: string) => [...agentKeys.lists(), { filters }] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
}

/**
 * Filter criteria for the agent directory.
 */
interface AgentFilters {
  category?: string
  minReputation?: number
  maxPricing?: bigint
  isActive?: boolean
  capabilities?: string[]
  search?: string
}

// Helper to transform SDK agent to UI agent
function transformSDKAgent(address: string, data: SDKAgent): Agent {
  // Extract x402 data if available
  const x402Data = data.x402Enabled
    ? {
        enabled: data.x402Enabled ?? false,
        paymentAddress: data.x402PaymentAddress?.toString() ?? '',
        acceptedTokens: (data.x402AcceptedTokens ?? []).map((t) => t.toString()),
        pricePerCall: data.x402PricePerCall ?? BigInt(0),
        serviceEndpoint: data.x402ServiceEndpoint ?? '',
        totalPayments: data.x402TotalPayments ?? BigInt(0),
        totalCalls: data.x402TotalCalls ?? BigInt(0),
        apiSpecUri: data.apiSpecUri ?? undefined,
      }
    : undefined

  return {
    address,
    name: data.name ?? 'Unknown Agent',
    metadata: {
      description: data.description ?? undefined,
      avatar: data.metadataUri ? `https://arweave.net/${data.metadataUri}` : undefined,
      category: data.frameworkOrigin ?? 'General',
    },
    owner: data.owner?.toString() ?? '',
    reputation: calculateAgentReputation(data),
    pricing: data.originalPrice ?? BigInt(0),
    capabilities: data.capabilities ?? [],
    isActive: data.isActive ?? false,
    createdAt: new Date(Number(data.createdAt ?? 0) * 1000),
    x402: x402Data,
  }
}

/**
 * Hook to retrieve details for a single agent by address.
 *
 * @param agentAddress - Public key of the agent
 * @returns React Query result containing @see Agent
 */
export function useAgent(agentAddress: string | undefined) {
  return useQuery({
    queryKey: agentKeys.detail(agentAddress ?? ''),
    queryFn: async () => {
      if (!agentAddress) throw new Error('Agent address required')

      const client = getGhostSpeakClient()

      // Get the agent account data using the correct SDK method
      const agentData = await client.agents.getAgentAccount(agentAddress as Address)
      if (!agentData) {
        throw new Error('Agent not found')
      }

      return transformSDKAgent(agentAddress, agentData)
    },
    enabled: !!agentAddress,
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes when focused
    refetchIntervalInBackground: false, // Don't refetch when tab is hidden
  })
}

/**
 * Hook to list agents with optional filtering.
 *
 * Retrieves all agents from the program and applies filtering client-side
 * (until indexer support is available).
 *
 * @param filters - Optional criteria to filter the agent list
 * @returns React Query result containing an array of @see Agent objects
 */
export function useAgents(filters?: AgentFilters) {
  return useQuery({
    queryKey: agentKeys.list(JSON.stringify(filters ?? {})),
    queryFn: async () => {
      const client = getGhostSpeakClient()

      // Get all agents using the correct SDK method
      let agentAccounts: { address: Address; data: SDKAgent }[]

      try {
        agentAccounts = await client.agents.getAllAgents()
      } catch (error) {
        console.warn('Error fetching agents:', error)
        agentAccounts = []
      }

      // Transform SDK data to match our Agent interface
      let agents = agentAccounts.map((account) =>
        transformSDKAgent(account.address.toString(), account.data)
      )

      // Apply client-side filtering
      if (filters) {
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          agents = agents.filter(
            (agent) =>
              agent.name.toLowerCase().includes(searchLower) ||
              agent.metadata.description?.toLowerCase().includes(searchLower)
          )
        }

        if (filters.category) {
          agents = agents.filter((agent) => agent.metadata.category === filters.category)
        }

        if (filters.minReputation !== undefined) {
          agents = agents.filter((agent) => agent.reputation.score >= filters.minReputation!)
        }

        if (filters.maxPricing !== undefined) {
          agents = agents.filter((agent) => agent.pricing <= filters.maxPricing!)
        }

        if (filters.isActive !== undefined) {
          agents = agents.filter((agent) => agent.isActive === filters.isActive)
        }

        if (filters.capabilities && filters.capabilities.length > 0) {
          agents = agents.filter((agent) =>
            filters.capabilities!.some((cap) => agent.capabilities.includes(cap))
          )
        }
      }

      return agents
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every 60s when window focused
    refetchIntervalInBackground: false, // Don't refetch when tab is hidden
  })
}

/**
 * Hook to register a new agent on the blockchain.
 * Uses Crossmint wallet for signing.
 */
export function useRegisterAgent() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()
  const feedback = useTransactionFeedback()

  return useMutation({
    mutationFn: async (params: {
      name: string
      metadataUri: string
      capabilities: string[]
      agentType?: number
      agentId: string
      compressed?: boolean
    }) => {
      const txId = `agent-register-${Date.now()}`

      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) {
        throw new Error('Could not create signer')
      }

      // Start feedback
      feedback.startTransaction(txId, {
        type: 'agent',
        description: `Registering agent: ${params.name}`,
      })

      try {
        const client = getGhostSpeakClient()

        // Use the correct SDK method: register()
        const signature = await client.agents.register(signer, {
          agentType: params.agentType ?? 0,
          name: params.name,
          description: '', // Description stored in metadata URI
          metadataUri: params.metadataUri,
          agentId: params.agentId,
        })

        // Update feedback with signature
        feedback.updateWithSignature(txId, signature)
        feedback.confirmTransaction(txId)

        return {
          signature,
          agentAddress: '', // Would need to derive PDA to get address
        }
      } catch (error) {
        const errorInfo = getErrorInfo(error)
        feedback.failTransaction(txId, errorInfo.description)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all })
    },
    onError: (error) => {
      console.error('Failed to register agent:', error)
    },
  })
}

/**
 * Hook to update an existing agent's metadata or configuration.
 * Uses Crossmint wallet for signing.
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: {
      agentAddress: string
      metadataUri?: string
      agentType?: number
      agentId: string
    }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) {
        throw new Error('Could not create signer')
      }

      const client = getGhostSpeakClient()

      // Use the correct SDK method: update()
      const signature = await client.agents.update(signer, {
        agentAddress: params.agentAddress as Address,
        metadataUri: params.metadataUri ?? '',
        agentType: params.agentType ?? 0,
        agentId: params.agentId,
      })

      return { signature }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(variables.agentAddress) })
      queryClient.invalidateQueries({ queryKey: agentKeys.all })
      toast.success('Agent updated successfully!')
    },
    onError: (error) => {
      console.error('Failed to update agent:', error)
      toast.error('Failed to update agent')
    },
  })
}

/**
 * Hook to deactivate an agent (soft delete).
 * Deactivated agents cannot accept new jobs.
 * Uses Crossmint wallet for signing.
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: { agentAddress: string; agentId: string }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) {
        throw new Error('Could not create signer')
      }

      const client = getGhostSpeakClient()

      // Use the correct SDK method: deactivate()
      const signature = await client.agents.deactivate(signer, {
        agentAddress: params.agentAddress as Address,
        agentId: params.agentId,
      })

      return { signature }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all })
      toast.success('Agent deactivated successfully!')
    },
    onError: (error) => {
      console.error('Failed to deactivate agent:', error)
      toast.error('Failed to deactivate agent')
    },
  })
}

/**
 * Hook to reactivate a previously deactivated agent.
 * Uses Crossmint wallet for signing.
 */
export function useActivateAgent() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: { agentAddress: string; agentId: string }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) {
        throw new Error('Could not create signer')
      }

      const client = getGhostSpeakClient()

      // Use the correct SDK method: activate()
      const signature = await client.agents.activate(signer, {
        agentAddress: params.agentAddress as Address,
        agentId: params.agentId,
      })

      return { signature }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all })
      toast.success('Agent activated successfully!')
    },
    onError: (error) => {
      console.error('Failed to activate agent:', error)
      toast.error('Failed to activate agent')
    },
  })
}

// Export types and interfaces for use in components
export type { Agent, AgentFilters }
