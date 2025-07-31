'use client'

import React, { FC, ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'

// Note: Wallet adapter styles should be imported in the global CSS or layout
// This avoids TypeScript module resolution issues

interface WalletContextProviderProps {
  children: ReactNode
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  // Use environment variable for RPC endpoint
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
    []
  )

  // Since all wallets support Wallet Standard, we no longer need any custom wallet adapter
  // The wallet adapter will automatically discover all installed wallets
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        onError={(error) => {
          console.error('Wallet error:', error)
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
