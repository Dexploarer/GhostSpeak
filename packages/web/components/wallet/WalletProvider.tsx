'use client'

import React, { FC, ReactNode } from 'react'
import {
  CrossmintProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider,
} from '@crossmint/client-sdk-react-ui'

interface WalletContextProviderProps {
  children: ReactNode
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  const crossmintApiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY

  if (!crossmintApiKey) {
    // Show helpful error in development
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
          <div className="max-w-md p-6 bg-card border border-destructive/50 rounded-lg text-center">
            <h2 className="text-xl font-bold text-destructive mb-2">
              Missing Environment Variable
            </h2>
            <p className="text-muted-foreground mb-4">
              <code className="bg-muted px-2 py-1 rounded">NEXT_PUBLIC_CROSSMINT_API_KEY</code> is
              required.
            </p>
            <ol className="text-left text-sm text-muted-foreground space-y-2">
              <li>
                1. Go to{' '}
                <a
                  href="https://www.crossmint.com/console"
                  className="text-primary underline"
                  target="_blank"
                >
                  crossmint.com/console
                </a>
              </li>
              <li>2. Create a project and get your API key</li>
              <li>
                3. Add to <code className="bg-muted px-1 rounded">.env.local</code>
              </li>
            </ol>
          </div>
        </div>
      )
    }
    return <>{children}</>
  }

  return (
    <CrossmintProvider apiKey={crossmintApiKey}>
      <CrossmintAuthProvider
        loginMethods={['web3:solana-only']} // Non-custodial wallets only (Phantom, Solflare, etc.)
        // Secure cookie configuration with custom auth routes
        refreshRoute="/api/auth/refresh"
        logoutRoute="/api/auth/logout"
        appearance={{
          spacingUnit: '8px',
          borderRadius: '12px',
          colors: {
            background: '#09090b', // zinc-950
            inputBackground: '#18181b', // zinc-900
            buttonBackground: '#ccff00', // GhostSpeak primary lime
            border: '#27272a', // zinc-800
            textPrimary: '#fafafa', // zinc-50
            textSecondary: '#a1a1aa', // zinc-400
            textLink: '#ccff00', // Primary lime
            danger: '#ef4444', // red-500
            accent: '#ccff00', // Primary lime
          },
        }}
        authModalTitle="Connect Your Solana Wallet"
      >
        {/* CrossmintWalletProvider provides useWallet() hook for accessing wallet address
            NOTE: We do NOT set createOnLogin - this ensures non-custodial wallets only
            The wallet address comes from the user's connected wallet (Phantom, Solflare, etc.) */}
        <CrossmintWalletProvider>
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  )
}
