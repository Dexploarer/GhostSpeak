/**
 * Credential Queries
 *
 * Queries for managing verifiable credentials and cross-chain sync.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAgents } from '@/lib/hooks/useGhostSpeak'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { toast } from 'sonner'

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

// Query Keys
export const credentialKeys = {
  all: ['credentials'] as const,
  list: (owner?: string) => [...credentialKeys.all, 'list', owner] as const,
  detail: (id: string) => [...credentialKeys.all, 'detail', id] as const,
}

/**
 * Hook to fetch all credentials for the connected wallet
 */
export function useCredentials() {
  const { getUserAgents } = useAgents()
  const wallet = useWalletAddress()
  const walletAddress = wallet.address

  return useQuery({
    queryKey: credentialKeys.list(walletAddress ?? undefined),
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
              crossmintSync: {
                status: 'pending' as const,
                chain: 'base-sepolia',
              },
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
 *
 * Note: Full implementation requires wallet signing and Crossmint API integration.
 * This is a simplified version that demonstrates the flow.
 */
export function useSyncCredential() {
  const queryClient = useQueryClient()
  const wallet = useWalletAddress()

  return useMutation({
    mutationFn: async (params: SyncCredentialParams) => {
      // TODO: Integrate with actual Crossmint SDK when wallet signing is available
      // For now, this returns a mock success to demonstrate the UI flow

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // In production, this would:
      // 1. Get the wallet signer
      // 2. Sign the credential subject data
      // 3. Call the SDK's credential service with the signature
      // const result = await client.credentials().issueAgentIdentityCredential({...})

      return {
        solanaCredential: {
          id: `agentidentity-${params.agentAddress.slice(0, 8)}`,
          type: params.credentialType,
        },
        crossmintSync: {
          status: 'synced' as const,
          chain: 'base-sepolia',
          credentialId: `cred_${Date.now()}`,
        },
      }
    },
    onSuccess: (result) => {
      if (result.crossmintSync?.status === 'synced') {
        toast.success('Credential synced to EVM successfully!')
      } else {
        toast.success('Credential created on Solana')
      }
      queryClient.invalidateQueries({ queryKey: credentialKeys.list(wallet.address ?? undefined) })
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync credential: ${error.message}`)
    },
  })
}

/**
 * Hook to get supported token metadata for escrow display
 */
export function useTokenMetadata() {
  return useQuery({
    queryKey: ['tokenMetadata'],
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

/**
 * Helper to format token amount with proper decimals
 */
export function formatTokenAmount(
  amount: number | bigint | string,
  decimals: number = 6,
  symbol?: string
): string {
  const value = typeof amount === 'bigint' ? Number(amount) : Number(amount)
  const formatted = (value / Math.pow(10, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals > 2 ? 4 : 2,
  })
  return symbol ? `${formatted} ${symbol}` : formatted
}
