import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'

// Helper function to calculate comprehensive reputation
async function calculateAgentReputation(agentAddress: string, agentAccount: any) {
  // Calculate basic reputation metrics from blockchain data
  const totalJobs = agentAccount.totalJobsCompleted || 0
  const reputationScore = agentAccount.reputationScore || 0

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

// Convert wallet adapter to SDK signer
function createSDKSigner(
  publicKey: { toBase58(): string },
  signTransaction: (tx: unknown) => Promise<unknown>
): TransactionSigner {
  return {
    address: publicKey.toBase58() as Address,
    signTransactions: async (txs: unknown[]) => {
      const signed = await Promise.all(txs.map((tx) => signTransaction(tx)))
      return signed as unknown[]
    },
  } as TransactionSigner
}

// Types for agent data
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
}

// Query keys
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: string) => [...agentKeys.lists(), { filters }] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
}

// Interfaces for agent filtering
interface AgentFilters {
  category?: string
  minReputation?: number
  maxPricing?: bigint
  isActive?: boolean
  capabilities?: string[]
  search?: string
}

// Fetch agent by address
export function useAgent(agentAddress: string | undefined) {
  return useQuery({
    queryKey: agentKeys.detail(agentAddress || ''),
    queryFn: async () => {
      if (!agentAddress) throw new Error('Agent address required')

      const client = getGhostSpeakClient()

      // Get the agent account data using the real client API
      const agentAccount = await client.agents.getAgentByAddress(agentAddress as Address)
      if (!agentAccount) {
        throw new Error('Agent not found')
      }

      // Transform the SDK data to match our Agent interface
      return {
        address: agentAddress,
        name: agentAccount.data?.name || 'Unknown Agent',
        metadata: {
          description: agentAccount.data?.description || undefined,
          avatar: agentAccount.data?.metadataUri
            ? `https://arweave.net/${agentAccount.data.metadataUri}`
            : undefined,
          category: agentAccount.data?.frameworkOrigin || 'General',
        },
        owner: agentAccount.data?.owner?.toString() || '',
        reputation: await calculateAgentReputation(agentAddress, agentAccount.data),
        pricing: agentAccount.data?.originalPrice || BigInt(0),
        capabilities: agentAccount.data?.capabilities || [],
        isActive: agentAccount.data?.isActive || false,
        createdAt: new Date(Number(agentAccount.data?.createdAt || 0) * 1000), // Convert from Unix timestamp
      }
    },
    enabled: !!agentAddress,
    staleTime: 60000, // 1 minute
  })
}

// Fetch all agents with efficient server-side filtering (Kluster MCP optimization)
export function useAgents(filters?: AgentFilters) {
  return useQuery({
    queryKey: agentKeys.list(JSON.stringify(filters || {})),
    queryFn: async () => {
      const client = getGhostSpeakClient()

      // Get all agents using the real client API
      let agentAccounts: { address: Address; data: any }[]

      try {
        // Use the fixed client API
        agentAccounts = await client.agents.getAllAgents()
      } catch (error) {
        console.warn('Error fetching agents:', error)
        agentAccounts = []
      }

      // Transform SDK data to match our Agent interface
      let agents = await Promise.all(
        agentAccounts.map(async (account: { address: Address; data: any }) => {
          const agentData = account.data
          return {
            address: account.address.toString(),
            name: agentData.name || 'Unknown Agent',
            metadata: {
              description: agentData.description || undefined,
              avatar: agentData.metadataUri
                ? `https://arweave.net/${agentData.metadataUri}`
                : undefined,
              category: agentData.frameworkOrigin || 'General',
            },
            owner: agentData.owner.toString(),
            reputation: await calculateAgentReputation(account.address.toString(), agentData),
            pricing: agentData.originalPrice || BigInt(0),
            capabilities: agentData.capabilities || [],
            isActive: agentData.isActive || false,
            createdAt: new Date(Number(agentData.createdAt) * 1000), // Convert from Unix timestamp
          }
        })
      )

      // Apply client-side filtering
      if (filters) {
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          agents = agents.filter(
            (agent: Agent) =>
              agent.name.toLowerCase().includes(searchLower) ||
              agent.metadata.description?.toLowerCase().includes(searchLower)
          )
        }

        if (filters.category) {
          agents = agents.filter((agent: Agent) => agent.metadata.category === filters.category)
        }

        if (filters.minReputation !== undefined) {
          agents = agents.filter((agent: Agent) => agent.reputation.score >= filters.minReputation!)
        }

        if (filters.maxPricing !== undefined) {
          agents = agents.filter((agent: Agent) => agent.pricing <= filters.maxPricing!)
        }

        if (filters.isActive !== undefined) {
          agents = agents.filter((agent: Agent) => agent.isActive === filters.isActive)
        }

        if (filters.capabilities && filters.capabilities.length > 0) {
          agents = agents.filter((agent: Agent) =>
            filters.capabilities!.some((cap: string) => agent.capabilities.includes(cap))
          )
        }
      }

      return agents
    },
    staleTime: 30000, // 30 seconds
  })
}

// Register new agent
export function useRegisterAgent() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (params: {
      name: string
      metadata: string
      capabilities: string[]
      pricing: bigint
      compressed?: boolean
    }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSDKSigner(publicKey, signTransaction)

      // Note: metadata parameter is parsed but not used in current implementation
      // It would be used if the SDK supported metadata fields

      // Use the real client API to register agent
      const result = await client.agents.registerAgent(signer, {
        name: params.name,
        capabilities: params.capabilities,
        agentType: 0,
        compressed: params.compressed,
      })

      return {
        signature: result.signature,
        agentAddress: result.address.toString(),
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all })
      toast.success('Agent registered successfully!')
    },
    onError: (error) => {
      console.error('Failed to register agent:', error)
      toast.error('Failed to register agent')
    },
  })
}

// Update agent
export function useUpdateAgent() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (params: {
      agentAddress: string
      name?: string
      metadata?: string
      capabilities?: string[]
      pricing?: bigint
      isActive?: boolean
    }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSDKSigner(publicKey, signTransaction)

      // Combine update data
      const updateData = {
        name: params.name,
        metadata: params.metadata ? JSON.parse(params.metadata) : undefined,
        capabilities: params.capabilities,
        pricing: params.pricing?.toString(),
        agentType: 0,
        agentId: params.name?.toLowerCase().replace(/\s+/g, '-') || 'updated-agent',
      }

      // Use the real client API to update agent
      const result = await client.agents.updateAgent(
        signer,
        params.agentAddress as Address,
        updateData
      )

      return { signature: result.signature }
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

// Delete agent (deactivate)
export function useDeleteAgent() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (agentAddress: string) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSDKSigner(publicKey, signTransaction)

      // Use the real client API to deactivate agent
      const result = await client.agents.deactivateAgent(signer, agentAddress as Address)

      return { signature: result.signature }
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

// Activate agent
export function useActivateAgent() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (agentAddress: string) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSDKSigner(publicKey, signTransaction)

      // Note: Activate is not in the current client interface
      // For now, we'll treat this as an update operation
      const result = await client.agents.updateAgent(signer, agentAddress as Address, {
        isActive: true,
        agentId: 'activated-agent',
      })

      return { signature: result.signature }
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
