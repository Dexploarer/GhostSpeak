'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useStaking } from './useGhostSpeak'
import { useCrossmintSigner } from './useCrossmintSigner'
import { useToast } from '@/components/ui/use-toast'
import { address, type Address } from '@solana/addresses'
import { createMutationErrorHandler } from '@/lib/errors/error-coordinator'
import { queryKeys } from '@/lib/queries/query-keys'

// GHOST token mint addresses
const GHOST_MINT_DEVNET = 'BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh'
const GHOST_MINT_MAINNET = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'

export interface StakeMutationParams {
  /** Agent address to stake for */
  agentAddress: string
  /** Amount in GHOST tokens (not lamports) */
  amount: number
  /** Lock duration in days */
  lockDurationDays: number
  /** Agent's token account */
  agentTokenAccount: string
  /** Staking vault address */
  stakingVault: string
  /** Staking config address */
  stakingConfig: string
}

export interface UnstakeMutationParams {
  /** Agent address */
  agentAddress: string
  /** Staking account address */
  stakingAccount: string
  /** Agent's token account */
  agentTokenAccount: string
  /** Staking vault address */
  stakingVault: string
}

/**
 * Hook for staking GHOST tokens
 */
export function useStakeMutation() {
  const { client } = useStaking()
  const signerHook = useCrossmintSigner()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: StakeMutationParams) => {
      if (!client) throw new Error('Staking client not initialized')
      if (!signerHook.isConnected) throw new Error('Wallet not connected')

      const signer = signerHook.createSigner()
      if (!signer) throw new Error('Failed to create signer')

      // Convert GHOST to lamports (assuming 9 decimals)
      const amountLamports = BigInt(Math.floor(params.amount * 1_000_000_000))

      // Convert days to seconds
      const lockDurationSeconds = BigInt(params.lockDurationDays * 24 * 60 * 60)

      // Get GHOST mint address from environment or default to mainnet
      const ghostMintAddress = process.env.NEXT_PUBLIC_GHOST_TOKEN_MINT || GHOST_MINT_MAINNET

      const signature = await client.stake({
        agent: params.agentAddress as Address,
        agentTokenAccount: params.agentTokenAccount as Address,
        stakingVault: params.stakingVault as Address,
        stakingConfig: params.stakingConfig as Address,
        ghostMint: address(ghostMintAddress),
        amount: amountLamports,
        lockDuration: lockDurationSeconds,
        agentOwner: signer,
      })

      return { signature }
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Staking Successful!',
        description: `Successfully staked ${variables.amount.toLocaleString()} GHOST tokens`,
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.staking.account(variables.agentAddress) })
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(variables.agentAddress) })
      queryClient.invalidateQueries({ queryKey: queryKeys.staking.stats() })
    },
    onError: createMutationErrorHandler('token staking'),
  })
}

/**
 * Hook for unstaking GHOST tokens
 */
export function useUnstakeMutation() {
  const { client } = useStaking()
  const signerHook = useCrossmintSigner()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UnstakeMutationParams) => {
      if (!client) throw new Error('Staking client not initialized')
      if (!signerHook.isConnected) throw new Error('Wallet not connected')

      const signer = signerHook.createSigner()
      if (!signer) throw new Error('Failed to create signer')

      const signature = await client.unstake({
        stakingAccount: params.stakingAccount as Address,
        agent: params.agentAddress as Address,
        stakingVault: params.stakingVault as Address,
        agentTokenAccount: params.agentTokenAccount as Address,
        agentOwner: signer,
      })

      return { signature }
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Unstaking Successful!',
        description: 'Successfully unstaked your GHOST tokens',
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.staking.account(variables.agentAddress) })
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(variables.agentAddress) })
      queryClient.invalidateQueries({ queryKey: queryKeys.staking.stats() })
    },
    onError: createMutationErrorHandler('token unstaking'),
  })
}
