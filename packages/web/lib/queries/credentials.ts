/**
 * Credential Queries
 *
 * Queries for managing verifiable credentials and cross-chain sync.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAgents } from '@/lib/hooks/useGhostSpeak'
import { useWalletAddress } from '@/lib/hooks/useAuth'
import { toast } from 'sonner'
import { createMutationErrorHandler } from '@/lib/errors/error-coordinator'
import { queryKeys } from '@/lib/queries/query-keys'

// Types
export interface Credential {
  id: string
  type: 'AgentIdentity' | 'Reputation' | 'JobCompletion'
  subject: string
  issuer: string
  issuedAt: number
  expiresAt?: number
  status: 'active' | 'revoked' | 'expired'
  subjectData: Record<string, unknown>
  crossmintSync?: {
    status: 'pending' | 'synced' | 'failed'
    chain?: string
    credentialId?: string
    error?: string
  }
}

export interface SyncCredentialParams {
  credentialType: 'AgentIdentity' | 'Reputation' | 'JobCompletion'
  agentAddress: string
  recipientEmail: string
}

// Re-export credential keys from centralized query keys for backwards compatibility
export const credentialKeys = queryKeys.credentials

/**
 * Hook to fetch all credentials for the connected wallet
 */
export function useCredentials() {
  const { getUserAgents } = useAgents()
  const wallet = useWalletAddress()
  const walletAddress = wallet.address

  return useQuery({
    queryKey: credentialKeys.list(walletAddress || ''),
    queryFn: async (): Promise<Credential[]> => {
      if (!walletAddress) return []

      try {
        const agents = await getUserAgents()

        if (!agents || agents.length === 0) return []

        // Each registered agent has an AgentIdentity credential
        // Use type assertion to handle SDK type variations
        const credentials: Credential[] = agents.map(
          (agent: { address: unknown; data?: Record<string, unknown> }) => {
            const address = String(agent.address ?? '')
            const data = agent.data ?? {}

            return {
              id: `agentidentity-${address.slice(0, 8)}`,
              type: 'AgentIdentity' as const,
              subject: address,
              issuer: 'ghostspeak-protocol',
              issuedAt:
                typeof data.registeredAt === 'number' ? data.registeredAt : Date.now() / 1000,
              status: 'active' as const,
              subjectData: {
                agentId: address,
                owner: String(data.owner ?? ''),
                name: String(data.name ?? 'Unknown Agent'),
                capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
              },
              crossmintSync: undefined,
            }
          }
        )

        return credentials
      } catch (error) {
        console.error('Failed to fetch credentials:', error)
        return []
      }
    },
    enabled: !!walletAddress,
    staleTime: 30_000,
  })
}

/**
 * Hook to sync a credential to EVM via Crossmint
 */
export function useSyncCredential() {
  const queryClient = useQueryClient()
  const wallet = useWalletAddress()

  return useMutation({
    mutationFn: async (params: SyncCredentialParams) => {
      const typeMap = {
        AgentIdentity: 'agent',
        Reputation: 'reputation',
        JobCompletion: 'job',
      }

      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: typeMap[params.credentialType],
          recipientEmail: params.recipientEmail,
          subject: {
            id: params.agentAddress,
            // In a real app we'd pass more subject data here
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync credential')
      }

      const data = await response.json()

      return {
        solanaCredential: {
          id: `agentidentity-${params.agentAddress.slice(0, 8)}`,
          type: params.credentialType,
        },
        crossmintSync: {
          status: 'synced' as const,
          chain: 'base-sepolia',
          credentialId: data.credential?.id || `cred_${Date.now()}`,
        },
      }
    },
    onSuccess: (result, variables) => {
      toast.success('Credential synced to EVM successfully!')

      // Manually update the cache to reflect the new sync status immediately
      // This persists the status until the next full page refresh/query invalidation
      queryClient.setQueryData(
        credentialKeys.list(wallet.address || ''),
        (old: Credential[] | undefined) => {
          if (!old) return []
          return old.map((c) => {
            if (c.subject === variables.agentAddress && c.type === variables.credentialType) {
              return {
                ...c,
                crossmintSync: result.crossmintSync,
              }
            }
            return c
          })
        }
      )
    },
    onError: createMutationErrorHandler('credential sync'),
  })
}

/**
 * Hook to get supported token metadata for escrow display
 */
export function useTokenMetadata() {
  return useQuery({
    queryKey: queryKeys.tokens.supportedMetadata(),
    queryFn: async () => {
      return {
        USDC: {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          icon: '/assets/tokens/usdc.png',
        },
        USDT: {
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          icon: '/assets/tokens/usdt.png',
        },
        SOL: {
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          mint: 'So11111111111111111111111111111111111111112',
          icon: '/assets/tokens/sol.png',
        },
        GHOST: {
          symbol: 'GHOST',
          name: 'GhostSpeak Token',
          decimals: 9,
          mint: 'GHoSTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          icon: '/assets/tokens/ghost.png',
        },
      }
    },
    staleTime: Infinity,
  })
}

// Re-export formatTokenAmount from utils for backwards compatibility
export { formatTokenAmount } from '@/lib/utils'
