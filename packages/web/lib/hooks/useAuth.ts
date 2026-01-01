/**
 * Unified Auth Hook
 *
 * Single hook that components use to access all auth/wallet/user state.
 * Replaces: useWalletAddress, useConvexUser, useAuthQuerySync
 *
 * Usage:
 * ```ts
 * const { address, user, isAuthenticated, isLoading } = useAuth()
 * ```
 */

'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/lib/stores/auth.store'

/**
 * Main useAuth hook
 *
 * Returns all auth-related state in a single object
 */
export function useAuth() {
  // Subscribe to entire store (Zustand optimizes re-renders automatically)
  const state = useAuthStore()

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      // Wallet
      address: state.address,
      shortAddress: state.shortAddress,
      chainType: state.chainType,

      // User
      user: state.user,
      userId: state.userId,

      // Status
      status: state.status,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,

      // Connected (alias for isAuthenticated for backward compat)
      isConnected: state.isAuthenticated,

      // Error
      error: state.error,

      // JWT (rarely needed by components, mainly for internal use)
      jwt: state.jwt,
      jwtExpiry: state.jwtExpiry,

      // Internal state (for debugging)
      _isUserSyncing: state._isUserSyncing,
      _crossmintAuthStatus: state.crossmintAuthStatus,
      _crossmintWalletStatus: state.crossmintWalletStatus,
    }),
    [
      state.address,
      state.shortAddress,
      state.chainType,
      state.user,
      state.userId,
      state.status,
      state.isAuthenticated,
      state.isLoading,
      state.error,
      state.jwt,
      state.jwtExpiry,
      state._isUserSyncing,
      state.crossmintAuthStatus,
      state.crossmintWalletStatus,
    ]
  )
}

/**
 * Lightweight hooks for specific use cases
 * Use these when you only need one piece of data
 */

export function useWalletAddress() {
  const address = useAuthStore((state) => state.address)
  const shortAddress = useAuthStore((state) => state.shortAddress)
  const isConnected = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)

  return useMemo(
    () => ({
      address,
      shortAddress,
      isConnected,
      isAuthenticated: isConnected,
      isLoading,
    }),
    [address, shortAddress, isConnected, isLoading]
  )
}

export function useCurrentUser() {
  const user = useAuthStore((state) => state.user)
  const userId = useAuthStore((state) => state.userId)
  const isLoading = useAuthStore((state) => state.isLoading)

  return useMemo(
    () => ({
      user,
      userId,
      isLoading,
      isAuthenticated: !!user,
    }),
    [user, userId, isLoading]
  )
}

export function useAuthStatus() {
  const status = useAuthStore((state) => state.status)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)

  return useMemo(
    () => ({
      status,
      isAuthenticated,
      isLoading,
      error,
    }),
    [status, isAuthenticated, isLoading, error]
  )
}
