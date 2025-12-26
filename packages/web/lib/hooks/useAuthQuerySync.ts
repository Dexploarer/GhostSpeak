'use client'

import React, { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui'

/**
 * Hook that invalidates all TanStack queries when auth state changes.
 * 
 * This ensures that:
 * - When user logs in, fresh data is fetched
 * - When user logs out, all cached user data is cleared
 * - When wallet changes, queries are refetched with new wallet address
 */
export function useAuthQuerySync() {
  const queryClient = useQueryClient()
  const { status: authStatus } = useAuth()
  const { wallet, status: walletStatus } = useWallet()
  
  // Track previous values to detect changes
  const prevAuthStatus = useRef(authStatus)
  const prevWalletAddress = useRef(wallet?.address)
  const prevWalletStatus = useRef(walletStatus)
  
  useEffect(() => {
    const authChanged = prevAuthStatus.current !== authStatus
    const walletChanged = prevWalletAddress.current !== wallet?.address
    const walletStatusChanged = prevWalletStatus.current !== walletStatus
    
    // Handle logout - clear all user-related queries
    if (authStatus === 'logged-out' && authChanged) {
      console.log('[Auth Sync] User logged out - clearing queries')
      queryClient.removeQueries({ 
        predicate: (query) => {
          // Remove queries that depend on user/wallet
          const key = query.queryKey[0] as string
          return ['credentials', 'escrows', 'work-orders', 'staking', 'governance'].includes(key)
        }
      })
      queryClient.clear()
    }
    
    // Handle login completion - wallet is now loaded
    if (walletStatus === 'loaded' && walletStatusChanged && wallet?.address) {
      console.log('[Auth Sync] Wallet loaded - invalidating queries for fresh data')
      queryClient.invalidateQueries()
    }
    
    // Handle wallet address change (e.g., account switch)
    if (walletChanged && wallet?.address) {
      console.log('[Auth Sync] Wallet address changed - refetching user data')
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string
          return ['credentials', 'escrows', 'work-orders', 'staking'].includes(key)
        }
      })
    }
    
    // Update refs for next comparison
    prevAuthStatus.current = authStatus
    prevWalletAddress.current = wallet?.address
    prevWalletStatus.current = walletStatus
  }, [authStatus, walletStatus, wallet?.address, queryClient])
}

/**
 * Provider component to wrap around app to enable auth-query sync
 */
export function AuthQuerySyncProvider({ children }: { children: React.ReactNode }) {
  useAuthQuerySync()
  return React.createElement(React.Fragment, null, children)
}
