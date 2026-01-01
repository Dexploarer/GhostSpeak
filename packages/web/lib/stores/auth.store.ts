/**
 * Zustand Auth Store
 *
 * Single source of truth for all authentication and wallet state.
 * Syncs between Crossmint SDK → Zustand → Convex → TanStack Query
 *
 * Features:
 * - Persistent storage (localStorage)
 * - Auto JWT refresh
 * - Redux DevTools integration
 * - Optimized selectors
 */

'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import type {
  AuthStore,
  AuthStatus,
  CrossmintAuthStatus,
  CrossmintWalletStatus,
  ConvexUser,
  AuthError,
} from '@/lib/auth/types'

/**
 * Initial state
 */
const initialState = {
  // Wallet
  address: null,
  shortAddress: null,
  chainType: 'solana' as const,

  // User
  user: null,
  userId: null,

  // Status
  status: 'initializing' as AuthStatus,
  isAuthenticated: false,
  isLoading: true,

  // JWT
  jwt: null,
  jwtExpiry: null,

  // Crossmint
  crossmintAuthStatus: null,
  crossmintWalletStatus: null,

  // Error
  error: null,

  // Internal
  _isUserSyncing: false,
  _lastSyncTimestamp: null,
}

/**
 * Helper: Format short address
 */
function formatShortAddress(address: string | null): string | null {
  if (!address) return null
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Helper: Check if JWT is expired
 */
function isJWTExpired(expiry: number | null): boolean {
  if (!expiry) return true
  // Consider expired if less than 5 minutes remaining
  return Date.now() > expiry - 5 * 60 * 1000
}

/**
 * Helper: Derive auth status from state
 */
function deriveAuthStatus(
  crossmintAuthStatus: CrossmintAuthStatus | null,
  crossmintWalletStatus: CrossmintWalletStatus | null,
  jwt: string | null,
  jwtExpiry: number | null
): AuthStatus {
  // Initializing state
  if (crossmintAuthStatus === 'initializing') {
    return 'initializing'
  }

  // Not logged in
  if (crossmintAuthStatus === 'logged-out') {
    return 'unauthenticated'
  }

  // Logged in but wallet not ready
  if (crossmintAuthStatus === 'logged-in' && crossmintWalletStatus === 'in-progress') {
    return 'authenticating'
  }

  // Fully authenticated: logged in, wallet loaded, valid JWT
  if (
    crossmintAuthStatus === 'logged-in' &&
    crossmintWalletStatus === 'loaded' &&
    jwt &&
    !isJWTExpired(jwtExpiry)
  ) {
    return 'authenticated'
  }

  // Error state
  if (crossmintWalletStatus === 'error') {
    return 'error'
  }

  // Default: authenticating
  return 'authenticating'
}

/**
 * Create Zustand Store
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        /**
         * Sync from Crossmint SDK
         *
         * Called by AuthSyncEngine when Crossmint state changes
         */
        syncFromCrossmint: ({ jwt, authStatus, walletStatus, walletAddress }) => {
          const currentState = get()

          // Detect logout
          if (authStatus === 'logged-out' && currentState.isAuthenticated) {
            console.log('[Auth Store] User logged out - clearing state')
            set({
              ...initialState,
              status: 'unauthenticated',
              isLoading: false,
              crossmintAuthStatus: 'logged-out',
            })
            return
          }

          // Derive new status
          const newStatus = deriveAuthStatus(authStatus, walletStatus, jwt, currentState.jwtExpiry)

          // Build update
          const update: Partial<AuthStore> = {
            crossmintAuthStatus: authStatus,
            crossmintWalletStatus: walletStatus,
            status: newStatus,
            isLoading: newStatus === 'initializing' || newStatus === 'authenticating',
            isAuthenticated: newStatus === 'authenticated',
          }

          // Update JWT if present
          if (jwt && jwt !== currentState.jwt) {
            update.jwt = jwt
            // Decode JWT to get expiry (simple approach - decode payload)
            try {
              const payload = JSON.parse(atob(jwt.split('.')[1]))
              update.jwtExpiry = payload.exp ? payload.exp * 1000 : null
            } catch (e) {
              console.error('[Auth Store] Failed to decode JWT:', e)
              update.jwtExpiry = null
            }
          }

          // Update wallet address
          if (walletAddress && walletAddress !== currentState.address) {
            update.address = walletAddress
            update.shortAddress = formatShortAddress(walletAddress)
          } else if (!walletAddress && currentState.address) {
            update.address = null
            update.shortAddress = null
          }

          // Clear error on successful auth
          if (newStatus === 'authenticated' && currentState.error) {
            update.error = null
          }

          set(update)

          // Log state change in dev
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth Store] Synced from Crossmint:', {
              status: newStatus,
              authStatus,
              walletStatus,
              hasJWT: !!jwt,
              hasAddress: !!walletAddress,
            })
          }
        },

        /**
         * Sync user from Convex
         */
        syncUserFromConvex: (user) => {
          const currentState = get()

          if (user && user._id !== currentState.userId) {
            console.log('[Auth Store] User synced from Convex:', user._id)
            set({
              user,
              userId: user._id,
              _isUserSyncing: false,
              _lastSyncTimestamp: Date.now(),
            })
          } else if (!user && currentState.user) {
            // User was deleted or doesn't exist
            set({
              user: null,
              userId: null,
              _isUserSyncing: false,
            })
          } else {
            // No change, just mark sync complete
            set({ _isUserSyncing: false })
          }
        },

        /**
         * Set user syncing state
         */
        setUserSyncing: (syncing) => {
          set({ _isUserSyncing: syncing })
        },

        /**
         * Clear authentication (logout)
         */
        clearAuth: () => {
          console.log('[Auth Store] Clearing auth state')
          set({
            ...initialState,
            status: 'unauthenticated',
            isLoading: false,
            crossmintAuthStatus: 'logged-out',
          })
        },

        /**
         * Set error
         */
        setError: (error) => {
          set({
            error,
            status: error ? 'error' : get().status,
          })
        },

        /**
         * Reset store to initial state
         */
        reset: () => {
          console.log('[Auth Store] Resetting to initial state')
          set(initialState)
        },
      }),
      {
        name: 'ghostspeak-auth', // localStorage key
        storage: createJSONStorage(() => localStorage),
        // Only persist essential fields
        partialize: (state) => ({
          address: state.address,
          shortAddress: state.shortAddress,
          user: state.user,
          userId: state.userId,
          jwt: state.jwt,
          jwtExpiry: state.jwtExpiry,
        }),
        // Version for migrations
        version: 1,
      }
    ),
    {
      name: 'GhostSpeak Auth',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

/**
 * Optimized selectors to prevent unnecessary re-renders
 */

// Wallet selectors
export const useAddress = () => useAuthStore((state) => state.address)
export const useShortAddress = () => useAuthStore((state) => state.shortAddress)

// User selectors
export const useConvexUser = () => useAuthStore((state) => state.user)
export const useUserId = () => useAuthStore((state) => state.userId)

// Status selectors
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useIsLoading = () => useAuthStore((state) => state.isLoading)
export const useAuthStatus = () => useAuthStore((state) => state.status)

// Error selector
export const useAuthError = () => useAuthStore((state) => state.error)

// JWT selector (for Convex provider)
export const useJWT = () => useAuthStore((state) => state.jwt)
export const useJWTExpiry = () => useAuthStore((state) => state.jwtExpiry)
