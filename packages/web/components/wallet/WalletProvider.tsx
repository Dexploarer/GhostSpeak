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
      <CrossmintAuthProvider>
        <CrossmintWalletProvider
          createOnLogin={{
            chain: 'solana',
            signer: { type: 'email' },
          }}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  )
}
