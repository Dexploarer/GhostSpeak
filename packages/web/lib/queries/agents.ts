import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import type { Address } from '@solana/addresses'

// Helper function to calculate comprehensive reputation
async function calculateAgentReputation(agentAddress: string, agentAccount: any) {
  // Calculate basic reputation metrics from blockchain data
  const totalJobs = agentAccount.totalJobsCompleted || 0
  const reputationScore = agentAccount.reputationScore || 0
  
  // Convert reputation score from basis points to 0-100 scale
  const score = Math.round(reputationScore / 100)
  
  // Calculate success rate based on score and job count
  const successRate = totalJobs > 0 
    ? Math.min(100, Math.round((reputationScore / totalJobs) / 100))
    : 0
  
  return {
    score,
    totalJobs,
    successRate,
  }
}

interface MockSigner {
  address: Address
  signTransaction: (transaction: unknown) => Promise<unknown>
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
      const agentModule = client.agent()

      // Get the agent account data using the module
      const agentAccount = await agentModule['module']['getAgentAccount'](agentAddress as Address)
      if (!agentAccount) {
        throw new Error('Agent not found')
      }

      // Transform the SDK data to match our Agent interface
      return {
        address: agentAddress,
        name: agentAccount.name || 'Unknown Agent',
        metadata: {
          description: agentAccount.description || undefined,
          avatar: agentAccount.metadataUri ? `https://arweave.net/${agentAccount.metadataUri}` : undefined,
          category: agentAccount.frameworkOrigin || 'General',
        },
        owner: agentAccount.owner.toString(),
        reputation: await calculateAgentReputation(agentAddress, agentAccount),
        pricing: agentAccount.originalPrice || BigInt(0),
        capabilities: agentAccount.capabilities || [],
        isActive: agentAccount.isActive || false,
        createdAt: new Date(Number(agentAccount.createdAt) * 1000), // Convert from Unix timestamp
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
      const agentModule = client.agent()

      // Try to use server-side filtering if SDK supports it, otherwise fallback to client-side
      let agentAccounts: { address: Address; data: any }[]
      
      try {
        // Check if SDK has filtering capabilities
        if (agentModule['module']['getFilteredAgents']) {
          // Use server-side filtering for better performance
          agentAccounts = await agentModule['module']['getFilteredAgents']({
            search: filters?.search,
            category: filters?.category,
            isActive: filters?.isActive,
            minReputation: filters?.minReputation,
            // Add pagination for large datasets
            limit: 50, // Reasonable limit to prevent overwhelming the client
            offset: 0
          })
        } else {
          // Fallback to getting all agents (current implementation)
          agentAccounts = await agentModule['module']['getAllAgents']()
        }
      } catch (error) {
        console.warn('Server-side filtering not available, using client-side filtering:', error)
        agentAccounts = await agentModule['module']['getAllAgents']()
      }

      // Transform SDK data to match our Agent interface
      let agents = await Promise.all(agentAccounts.map(async (account: { address: Address; data: any }) => {
        const agentData = account.data
        return {
          address: account.address.toString(),
          name: agentData.name || 'Unknown Agent',
          metadata: {
            description: agentData.description || undefined,
            avatar: agentData.metadataUri ? `https://arweave.net/${agentData.metadataUri}` : undefined,
            category: agentData.frameworkOrigin || 'General',
          },
          owner: agentData.owner.toString(),
          reputation: await calculateAgentReputation(account.address.toString(), agentData),
          pricing: agentData.originalPrice || BigInt(0),
          capabilities: agentData.capabilities || [],
          isActive: agentData.isActive || false,
          createdAt: new Date(Number(agentData.createdAt) * 1000), // Convert from Unix timestamp
        }
      }))

      // Apply client-side filtering only if server-side filtering wasn't available
      if (filters && !agentModule['module']['getFilteredAgents']) {
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
      const agentBuilder = client.agent()

      // Parse metadata JSON
      const metadata = JSON.parse(params.metadata)

      // Create agent data combining name and capabilities
      const agentData = {
        name: params.name,
        ...metadata,
        capabilities: params.capabilities,
        pricing: params.pricing.toString(),
      }

      // Use the fluent API to create the agent
      const builder = agentBuilder.create({
        name: params.name,
        capabilities: params.capabilities,
      })

      if (params.compressed) {
        builder.compressed()
      }

      // Note: The actual execution would require proper signer integration
      // For now, we'll use a placeholder that matches the expected interface
      const mockSigner = { address: publicKey.toBase58(), signTransaction }
      const result = await builder['module']['register'](mockSigner as MockSigner, {
        agentType: 0,
        metadataUri: JSON.stringify(agentData),
        agentId: params.name.toLowerCase().replace(/\s+/g, '-'),
      })

      return {
        signature: result,
        agentAddress: `agent_${params.name.toLowerCase().replace(/\s+/g, '-')}`,
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
      const agentBuilder = client.agent()

      // Combine update data
      const updateData = {
        name: params.name,
        metadata: params.metadata ? JSON.parse(params.metadata) : undefined,
        capabilities: params.capabilities,
        pricing: params.pricing?.toString(),
      }

      // Use the SDK to update agent
      const mockSigner = { address: publicKey.toBase58(), signTransaction }
      const result = await agentBuilder['module']['update'](mockSigner as MockSigner, {
        agentAddress: params.agentAddress as Address,
        metadataUri: JSON.stringify(updateData),
        agentType: 0,
        agentId: params.name?.toLowerCase().replace(/\s+/g, '-') || 'updated-agent',
      })

      return { signature: result }
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
      const agentBuilder = client.agent()

      // Use deactivate since there's no delete in the SDK
      const mockSigner = { address: publicKey.toBase58(), signTransaction }
      const result = await agentBuilder['module']['deactivate'](mockSigner as MockSigner, {
        agentAddress: agentAddress as Address,
        agentId: 'deactivated-agent', // Would need actual agent ID from state
      })

      return { signature: result }
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
      const agentBuilder = client.agent()

      const mockSigner = { address: publicKey.toBase58(), signTransaction }
      const result = await agentBuilder['module']['activate'](mockSigner as MockSigner, {
        agentAddress: agentAddress as Address,
        agentId: 'activated-agent', // Would need actual agent ID from state
      })

      return { signature: result }
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
