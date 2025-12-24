'use client'

/**
 * Staking Queries
 *
 * React Query hooks for staking operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '../ghostspeak/client'
import type { Address } from '@solana/addresses'
import { useCrossmintSigner } from '../hooks/useCrossmintSigner'

// Query key factory
export const stakingKeys = {
  all: ['staking'] as const,
  config: () => [...stakingKeys.all, 'config'] as const,
  account: (owner: string) => [...stakingKeys.all, 'account', owner] as const,
  allAccounts: () => [...stakingKeys.all, 'accounts'] as const,
}

/**
 * Hook to get staking configuration
 */
export function useStakingConfig() {
  const client = getGhostSpeakClient()

  return useQuery({
    queryKey: stakingKeys.config(),
    queryFn: async () => {
      return client.staking.getStakingConfig()
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to get staking account for a user
 */
export function useStakingAccount(owner?: string) {
  const client = getGhostSpeakClient()

  return useQuery({
    queryKey: stakingKeys.account(owner ?? ''),
    queryFn: async () => {
      if (!owner) return null
      return client.staking.getStakingAccount(owner as Address)
    },
    enabled: !!owner,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to get all staking accounts
 */
export function useAllStakingAccounts() {
  const client = getGhostSpeakClient()

  return useQuery({
    queryKey: stakingKeys.allAccounts(),
    queryFn: async () => {
      return client.staking.getAllStakingAccounts()
    },
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to create a staking account
 */
export function useCreateStakingAccount() {
  const queryClient = useQueryClient()
  const client = getGhostSpeakClient()
  const { createSigner, isConnected } = useCrossmintSigner()

  return useMutation({
    mutationFn: async () => {
      const signer = createSigner()
      if (!signer || !isConnected) throw new Error('Wallet not connected')
      return client.staking.createStakingAccount({ signer })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stakingKeys.all })
    },
  })
}

/**
 * Hook to claim staking rewards
 */
export function useClaimStakingRewards() {
  const queryClient = useQueryClient()
  const client = getGhostSpeakClient()
  const { createSigner, isConnected } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (params: {
      ghostMint: Address
      userTokenAccount: Address
      rewardsTreasury: Address
    }) => {
      const signer = createSigner()
      if (!signer || !isConnected) throw new Error('Wallet not connected')
      return client.staking.claimRewards({
        signer,
        ...params,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stakingKeys.all })
    },
  })
}

/**
 * Hook to calculate pending rewards
 */
export function usePendingRewards(owner?: string) {
  const { data: stakingAccount } = useStakingAccount(owner)
  const { data: config } = useStakingConfig()
  const client = getGhostSpeakClient()

  if (!stakingAccount || !config) {
    return { pendingRewards: BigInt(0), isLoading: true }
  }

  const pendingRewards = client.staking.calculatePendingRewards(stakingAccount, config)
  return { pendingRewards, isLoading: false }
}

/**
 * Hook to check if staking account is locked
 */
export function useStakingLockStatus(owner?: string) {
  const { data: stakingAccount } = useStakingAccount(owner)
  const client = getGhostSpeakClient()

  if (!stakingAccount) {
    return { isLocked: false, timeRemaining: 0, isLoading: true }
  }

  return {
    isLocked: client.staking.isLocked(stakingAccount),
    timeRemaining: client.staking.getLockupTimeRemaining(stakingAccount),
    isLoading: false,
  }
}

/**
 * Hook to get staking stats
 */
export function useStakingStats() {
  const { data: config } = useStakingConfig()
  const { data: allAccounts } = useAllStakingAccounts()

  if (!config || !allAccounts) {
    return {
      totalStaked: BigInt(0),
      totalStakers: 0,
      avgStake: BigInt(0),
      isLoading: true,
    }
  }

  const totalStaked = config.totalStaked
  const totalStakers = allAccounts.length
  const avgStake = totalStakers > 0 ? totalStaked / BigInt(totalStakers) : BigInt(0)

  return {
    totalStaked,
    totalStakers,
    avgStake,
    baseApy: config.baseApy,
    isLoading: false,
  }
}
