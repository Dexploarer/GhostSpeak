'use client'

import React from 'react'
import { WalletStandardProvider } from '@/lib/wallet/WalletStandardProvider'

interface WalletAuthProviderProps {
  children: React.ReactNode
}

/**
 * Modern Wallet Auth Provider using Wallet Standard
 *
 * Features:
 * - Auto-detects all Wallet Standard compatible wallets (Phantom, Solflare, Backpack, etc.)
 * - Pure Solana v5 API - no legacy dependencies
 * - Auto-reconnect to last connected wallet
 * - Full TypeScript support
 *
 * Usage:
 * ```tsx
 * import { useWallet } from '@/lib/wallet/WalletStandardProvider'
 *
 * const { publicKey, connected, connect, disconnect } = useWallet()
 * ```
 */
export function WalletAuthProvider({ children }: WalletAuthProviderProps) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

  return (
    <WalletStandardProvider endpoint={endpoint} autoConnect={true}>
      {children}
    </WalletStandardProvider>
  )
}
