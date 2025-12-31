'use client'

import { useWallet, useAuth } from '@crossmint/client-sdk-react-ui'

/**
 * Hook to get the current wallet address from Crossmint
 * Provides a consistent interface across all dashboard pages
 *
 * - isConnected: true if wallet is loaded AND has address
 * - isAuthenticated: true if user is logged in (may not have wallet yet)
 * - isLoading: true if SDK or wallet is still initializing
 * - isWalletLoading: true if wallet is loading after auth
 */
export function useWalletAddress() {
  const { wallet, status: walletStatus } = useWallet()
  const { status: authStatus } = useAuth()

  const hasWallet = Boolean(wallet?.address)
  const isAuthenticated = authStatus === 'logged-in'
  const isAuthLoading = authStatus === 'initializing'
  const isWalletLoaded = walletStatus === 'loaded'
  const isWalletLoading = walletStatus === 'in-progress'

  // Consider connected only when wallet is fully loaded and has an address
  const isConnected = isWalletLoaded && hasWallet

  // Overall loading state - either auth or wallet is still loading
  const isLoading = isAuthLoading || isWalletLoading

  return {
    address: wallet?.address ?? null,
    shortAddress: wallet?.address
      ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
      : null,
    isConnected,
    isAuthenticated,
    isLoading,
    isWalletLoading,
    walletStatus,
  }
}
