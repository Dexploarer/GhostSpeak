/**
 * Auth Sync Engine
 *
 * Coordinates synchronization between:
 * 1. Crossmint SDK → Zustand Store
 * 2. Zustand Store → Convex User Creation
 * 3. Auth Changes → TanStack Query Invalidation
 *
 * This component should be placed high in the component tree,
 * after CrossmintProvider but before the main app.
 */

'use client'

import React, { useEffect, useRef } from 'react'
import { useAuth as useCrossmintAuth, useWallet as useCrossmintWallet } from '@crossmint/client-sdk-react-ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth.store'
import { api } from '@/convex/_generated/api'
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from 'convex/react'

/**
 * Auth Sync Engine Component
 */
export function AuthSyncEngine({ children }: { children: React.ReactNode }) {
  // Crossmint SDK state
  const { status: authStatus, jwt: crossmintJWT } = useCrossmintAuth()
  const { wallet, status: walletStatus } = useCrossmintWallet()

  // Zustand store
  const {
    syncFromCrossmint,
    syncUserFromConvex,
    setUserSyncing,
    isAuthenticated,
    address,
    user,
    _isUserSyncing,
  } = useAuthStore()

  // TanStack Query client
  const queryClient = useQueryClient()

  // Convex mutations
  const upsertUser = useConvexMutation(api.users.upsert)
  const recordActivity = useConvexMutation(api.users.recordActivity)

  // Track previous values to detect changes
  const prevAuthStatus = useRef(authStatus)
  const prevWalletAddress = useRef(wallet?.address)
  const prevIsAuthenticated = useRef(isAuthenticated)

  /**
   * Sync 1: Crossmint SDK → Zustand Store
   */
  useEffect(() => {
    // Map Crossmint auth status to our type system
    const mappedAuthStatus: 'logged-in' | 'logged-out' | 'initializing' =
      authStatus === 'in-progress'
        ? 'initializing'
        : authStatus === 'logged-in'
          ? 'logged-in'
          : 'logged-out'

    syncFromCrossmint({
      jwt: crossmintJWT ?? null,
      authStatus: mappedAuthStatus,
      walletStatus,
      walletAddress: wallet?.address ?? null,
    })
  }, [crossmintJWT, authStatus, walletStatus, wallet?.address, syncFromCrossmint])

  /**
   * Sync 2: Zustand Store → Convex User Creation
   *
   * When user becomes authenticated, fetch/create their Convex user record
   */
  const convexUser = useConvexQuery(
    api.users.getByWallet,
    isAuthenticated && address ? { walletAddress: address } : 'skip'
  )

  useEffect(() => {
    // User just authenticated and we have an address
    if (isAuthenticated && address && !_isUserSyncing) {
      // If Convex query returned null, user doesn't exist - create them
      if (convexUser === null) {
        console.log('[Auth Sync] Creating new Convex user:', address)
        setUserSyncing(true)
        upsertUser({ walletAddress: address })
          .then((userId) => {
            if (userId) {
              // upsert returns just the ID, so we sync with minimal data
              syncUserFromConvex({
                _id: userId,
                walletAddress: address,
                createdAt: Date.now(),
                lastActiveAt: Date.now(),
              })
            }
          })
          .catch((error) => {
            console.error('[Auth Sync] Failed to create Convex user:', error)
            setUserSyncing(false)
          })
      }
      // If user exists, sync to store
      else if (convexUser) {
        syncUserFromConvex(convexUser)
      }
    }
  }, [isAuthenticated, address, convexUser, _isUserSyncing, upsertUser, syncUserFromConvex, setUserSyncing])

  /**
   * Sync 3: Record user activity periodically
   */
  useEffect(() => {
    if (user?._id) {
      // Record activity every 5 minutes
      const interval = setInterval(
        () => {
          recordActivity({ userId: user._id }).catch(console.error)
        },
        5 * 60 * 1000
      )

      return () => clearInterval(interval)
    }
  }, [user?._id, recordActivity])

  /**
   * Sync 4: TanStack Query Invalidation on Auth Changes
   */
  useEffect(() => {
    const authStatusChanged = prevAuthStatus.current !== authStatus
    const walletAddressChanged = prevWalletAddress.current !== wallet?.address
    const authenticationChanged = prevIsAuthenticated.current !== isAuthenticated

    // Handle logout - clear all user-related queries
    if (authStatus === 'logged-out' && authStatusChanged) {
      console.log('[Auth Sync] User logged out - clearing TanStack queries')
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string
          // Remove user-specific queries
          return ['credentials', 'agents', 'reputation', 'governance', 'staking'].includes(key)
        },
      })
      queryClient.clear()
    }

    // Handle login completion - invalidate all queries for fresh data
    if (isAuthenticated && authenticationChanged) {
      console.log('[Auth Sync] User authenticated - invalidating queries for fresh data')
      queryClient.invalidateQueries()
    }

    // Handle wallet address change (e.g., account switch)
    if (walletAddressChanged && wallet?.address) {
      console.log('[Auth Sync] Wallet address changed - refetching user data')
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string
          return ['credentials', 'agents', 'reputation', 'user'].includes(key)
        },
      })
    }

    // Update refs for next comparison
    prevAuthStatus.current = authStatus
    prevWalletAddress.current = wallet?.address
    prevIsAuthenticated.current = isAuthenticated
  }, [authStatus, wallet?.address, isAuthenticated, queryClient])

  /**
   * Dev logging
   */
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth Sync] State:', {
        crossmintAuth: authStatus,
        crossmintWallet: walletStatus,
        zustandAuth: isAuthenticated,
        address,
        hasUser: !!user,
        userId: user?._id,
        isUserSyncing: _isUserSyncing,
      })
    }
  }, [authStatus, walletStatus, isAuthenticated, address, user, _isUserSyncing])

  // Render children without adding extra DOM nodes
  return <>{children}</>
}
