/**
 * Authentication Type Definitions
 *
 * Centralized types for the entire auth system
 */

import type { Id } from '@/convex/_generated/dataModel'

/**
 * Convex User Data
 */
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

/**
 * Authentication Status
 */
export type AuthStatus =
  | 'initializing' // App is loading, checking for existing session
  | 'unauthenticated' // No active session
  | 'authenticating' // User is logging in
  | 'authenticated' // User is logged in with valid session
  | 'error' // Authentication error occurred

/**
 * Authentication Error Types
 */
export interface AuthError {
  code: string
  message: string
  details?: unknown
}

/**
 * Crossmint Wallet Status
 */
export type CrossmintWalletStatus = 'not-loaded' | 'in-progress' | 'loaded' | 'error'

/**
 * Crossmint Auth Status
 */
export type CrossmintAuthStatus = 'initializing' | 'logged-out' | 'logged-in'

/**
 * JWT Token Data
 */
export interface JWTToken {
  token: string
  expiry: number // Unix timestamp
}

/**
 * Main Auth State Interface
 */
export interface AuthState {
  // Wallet State
  address: string | null
  shortAddress: string | null
  chainType: 'solana'

  // User State (from Convex)
  user: ConvexUser | null
  userId: Id<'users'> | null

  // Auth Status
  status: AuthStatus
  isAuthenticated: boolean
  isLoading: boolean

  // JWT Token (for Convex)
  jwt: string | null
  jwtExpiry: number | null

  // Crossmint Status
  crossmintAuthStatus: CrossmintAuthStatus | null
  crossmintWalletStatus: CrossmintWalletStatus | null

  // Error Handling
  error: AuthError | null

  // Internal sync flags
  _isUserSyncing: boolean
  _lastSyncTimestamp: number | null
}

/**
 * Auth Store Actions
 */
export interface AuthActions {
  // Sync from Crossmint SDK
  syncFromCrossmint: (params: {
    jwt: string | null
    authStatus: CrossmintAuthStatus
    walletStatus: CrossmintWalletStatus
    walletAddress: string | null
  }) => void

  // Sync user from Convex
  syncUserFromConvex: (user: ConvexUser | null) => void

  // Set user syncing state
  setUserSyncing: (syncing: boolean) => void

  // Clear authentication
  clearAuth: () => void

  // Set error
  setError: (error: AuthError | null) => void

  // Reset store to initial state
  reset: () => void
}

/**
 * Complete Auth Store Type
 */
export type AuthStore = AuthState & AuthActions
