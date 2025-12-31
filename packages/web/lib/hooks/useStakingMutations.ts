'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useStaking } from './useGhostSpeak'
import { useCrossmintSigner } from './useCrossmintSigner'
import { useToast } from '@/components/ui/use-toast'
import type { Address } from '@solana/addresses'

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
  const signer = useCrossmintSigner()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: StakeMutationParams) => {
      if (!client) throw new Error('Staking client not initialized')
      if (!signer) throw new Error('Wallet not connected')

      // Convert GHOST to lamports (assuming 9 decimals)
      const amountLamports = BigInt(Math.floor(params.amount * 1_000_000_000))

      // Convert days to seconds
      const lockDurationSeconds = BigInt(params.lockDurationDays * 24 * 60 * 60)

      const signature = await client.stake({
        agent: params.agentAddress as Address,
        agentTokenAccount: params.agentTokenAccount as Address,
        stakingVault: params.stakingVault as Address,
        stakingConfig: params.stakingConfig as Address,
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
      queryClient.invalidateQueries({ queryKey: ['staking', variables.agentAddress] })
      queryClient.invalidateQueries({ queryKey: ['agent', variables.agentAddress] })
    },
    onError: (error: Error) => {
      console.error('Staking error:', error)
      toast({
        title: 'Staking Failed',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook for unstaking GHOST tokens
 */
export function useUnstakeMutation() {
  const { client } = useStaking()
  const signer = useCrossmintSigner()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UnstakeMutationParams) => {
      if (!client) throw new Error('Staking client not initialized')
      if (!signer) throw new Error('Wallet not connected')

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
      queryClient.invalidateQueries({ queryKey: ['staking', variables.agentAddress] })
      queryClient.invalidateQueries({ queryKey: ['agent', variables.agentAddress] })
    },
    onError: (error: Error) => {
      console.error('Unstaking error:', error)
      toast({
        title: 'Unstaking Failed',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      })
    },
  })
}
