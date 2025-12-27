/**
 * Convex User Hook
 *
 * Auto-creates/syncs user when wallet connects
 * Provides current user data from Convex
 */

'use client'

import { useQuery, useMutation } from 'convex/react'
import { useEffect, useMemo } from 'react'
import { api } from '@/convex/_generated/api'
import { useWalletAddress } from './useWalletAddress'
import type { Id } from '@/convex/_generated/dataModel'

export interface ConvexUser {
  _id: Id<'users'>
  walletAddress: string
  email?: string
  name?: string
  avatarUrl?: string
  preferences?: {
    theme?: string
    notifications?: boolean
    favoriteCategories?: string[]
  }
  totalSpent?: number
  totalTransactions?: number
  createdAt: number
  lastActiveAt: number
}

export function useConvexUser() {
  const { address, isConnected } = useWalletAddress()

  // Query user by wallet address
  const user = useQuery(
    api.users.getByWallet,
    address ? { walletAddress: address } : 'skip'
  ) as ConvexUser | null | undefined

  // Mutation to create/update user
  const upsertUser = useMutation(api.users.upsert)
  const recordActivity = useMutation(api.users.recordActivity)

  // Auto-create user when wallet connects
  useEffect(() => {
    if (isConnected && address && user === null) {
      // User doesn't exist, create them
      upsertUser({ walletAddress: address }).catch(console.error)
    }
  }, [isConnected, address, user, upsertUser])

  // Record activity periodically (every 5 minutes)
  useEffect(() => {
    if (user?._id) {
      const interval = setInterval(() => {
        recordActivity({ userId: user._id }).catch(console.error)
      }, 5 * 60 * 1000)

      return () => clearInterval(interval)
    }
  }, [user?._id, recordActivity])

  // Computed values
  const isLoading = user === undefined && isConnected && address
  const userId = user?._id ?? null

  return useMemo(
    () => ({
      user,
      userId,
      isLoading,
      isAuthenticated: isConnected && user !== null,
      upsertUser,
    }),
    [user, userId, isLoading, isConnected, upsertUser]
  )
}

/**
 * Hook to sync Convex user with wallet connection
 * Use this in a top-level component to enable auto-sync
 */
export function useConvexUserSync() {
  const { user, isLoading } = useConvexUser()
  return { user, isLoading }
}
