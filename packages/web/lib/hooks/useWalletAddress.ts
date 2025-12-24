'use client'

import { useWallet } from '@crossmint/client-sdk-react-ui'

/**
 * Hook to get the current wallet address from Crossmint
 * Provides a consistent interface across all dashboard pages
 */
export function useWalletAddress() {
  const { wallet } = useWallet()

  return {
    address: wallet?.address ?? null,
    shortAddress: wallet?.address
      ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
      : null,
    isConnected: Boolean(wallet?.address),
  }
}
